# FairExit Phase 1 API (web, iOS, Android)

Base URL: `https://<your-api>/api/v1` (local: `http://localhost:8000/api/v1`)

This document is written so a developer **or an AI coding assistant** can wire the existing web
frontend (Next.js), the iOS app and the Android app to the backend without reading the backend code.
It follows the client's code pack `FairExit-Phase1-Code-2026-10-25`, the spec
`specs/check-page-spec-v2.md`, the explainer video "FairExit copy and facts update" (Oct 2026) and the
report prompt `report-prompt-v0.6.txt` (used **unchanged**, see section 12).

---

## 0. The flow in one picture

```
 Free check (steps 0-4, no AI)            POST /cases                     -> caseId + caseToken
   └─ free result + 3 paths               (freeResult in the response; or POST /rules/estimate)
 "Ask a lawyer to contact me" (free)      POST /leads
 Pay $59 (CAD in Canada / USD in US)      web: POST /cases/:id/checkout/stripe
                                          iOS: POST /cases/:id/checkout/apple   Android: .../google
 Upload: severance letter + contract      POST /cases/:id/documents/upload-url  -> PUT file -> .../complete
   (or "I never signed one" / "can't add it")  PUT /cases/:id/contract-status
 AI reads the documents (Call A)          POST /cases/:id/read   (202)  -> poll GET /cases/:id/read
 Step 8 "Check everything your report will use"
                                          GET  /cases/:id/check
                                          POST /cases/:id/check/rows/:key        (Yes / Change / Not sure ...)
                                            └─ Change on a document row = "second look" (Call A2)
                                          POST /cases/:id/check/conflicts/:key   ("These don't match")
                                          POST /cases/:id/check/attest           (final agreement box)
 Build my report (Call B)                 POST /cases/:id/report (202) -> poll GET /cases/:id/report/status
 Ready                                    GET  /cases/:id/report      (JSON, for native screens)
                                          GET  /cases/:id/report/pdf  (the PDF)
```

`GET /cases/:id` always returns `nextStep` (`pay`, `upload`, `reading`, `check`, `building`, `ready`,
`not_covered`) so every client can resume on the right screen.

---

## 1. Conventions

**Response envelope** (all JSON endpoints):
```json
{ "success": true, "statusCode": 200, "message": "Success", "data": { } }
```
Errors:
```json
{ "success": false, "statusCode": 422, "message": "Validation failed",
  "errors": [{ "field": "email", "message": "Invalid email" }],
  "requestId": "…", "timestamp": "…" }
```

**Headers**

| Header | When | Notes |
|---|---|---|
| `Content-Type: application/json` | all POST/PUT/PATCH | |
| `X-Case-Token: fxc_…` | every `/cases/:caseId/...` call | Returned once by `POST /cases`. Store it: Keychain (iOS), EncryptedSharedPreferences (Android), localStorage/cookie (web). |
| `Authorization: Bearer <supabase access token>` | optional | Signed-in users can use their own cases without the case token after `POST /cases/:id/claim`. Required for `/user/*` and `/admin/*`. |
| `X-Platform: web \| ios \| android` | recommended | Stored on the case for the ops dashboard. |

No account is needed for the whole flow ("No account needed" in the app). A case is reached by its
**case token**. A missing/wrong token returns **404** (never 403), so case IDs cannot be probed.

**Status codes used:** 200, 201, 202 (job started), 400, 401, 402 (payment needed), 404, 409 (wrong
state, e.g. still reading), 422 (validation), 429 (rate limit / "Too many scans today"), 501 (PDF
renderer not installed), 502 (Stripe/Apple/Google upstream error).

**Polling:** poll every 3-5 seconds while `status` is `reading` or `building` (Call A takes ~20-90 s,
Call B ~1-4 min). Read/poll requests use `READ_RATE_LIMIT_MAX` (default 600 per 15 min), separately
from `WRITE_RATE_LIMIT_MAX` (default 100 per 15 min), so normal polling cannot consume the write budget.

---

## 2. Reference data (no auth)

### GET /config
Price, payment mode, IAP product IDs, prompt/rules versions, retention, upload limits.
```json
{ "price": { "amountCents": 5900, "currencies": { "CA": "CAD", "US": "USD" }, "taxNote": "plus applicable tax" },
  "payments": { "mode": "mock", "appleProductId": "fairexit.severance_report", "googleProductId": "fairexit.severance_report" },
  "ai": { "mode": "mock", "promptVersion": "v0.6" },
  "rules": { "version": "0.2.0", "lastUpdated": "2026-10-23", "regionData": { "pack": "FairExit-Phase1-Code-2026-10-25", "rules_checked": "2026-10-25" } },
  "retention": { "documentsDays": 30, "reportMonths": 12 },
  "uploads": { "maxMb": 15, "types": ["application/pdf","image/jpeg","image/png","image/webp","text/plain"], "kinds": ["letter","contract"] },
  "notCovered": { "CA": { "QC": "Quebec", "YT": "Yukon", "NT": "Northwest Territories", "NU": "Nunavut" } } }
```

### GET /jurisdictions?country=CA|US
Dropdown data. Canada: 9 provinces + `CA-FED`. US: all 50 states. Each item:
```json
{ "country": "US", "code": "US-GA", "name": "Georgia", "regime": "us_federal_only",
  "statute_short": "", "has_statutory_severance": false,
  "words": { "lawyer": "attorney", "region": "state", "letter": "separation agreement", "contract": "offer letter or employment contract" },
  "has_region_page": false, "region_slug": null, "covered": true }
```
`regime`: `ca_province`, `ca_federal`, `us_state_page` (22 states with a FairExit page), `us_federal_only`
(the other 28: show the "federal-only note", video step 2). Use `words` for every "lawyer/attorney",
"province/state" label.

### GET /jurisdictions/:code
`code` = `CA-ON`, `ON`, `US-OH`, `Ohio`… Returns the jurisdiction, the engine table, and the region
page facts (`region_rules`, `sources`, incl. "What we couldn't confirm yet" rows with
`status: "unconfirmed"`, `reason`, `how_to_check`).

### POST /rules/estimate
Stateless free-check numbers (same engine as `severance-rules.js` v0.2.0). Use it for live previews; the
saved version comes back from `POST /cases`.
```json
// request
{ "country": "CA", "answers": { "province": "NB", "federal": "no", "age": 50, "years": 12, "salary": 78000,
  "roleFactor": 1.15, "payroll": "unsure", "offer": 0, "clause": "unsure", "contract": "unsure", "market": "mid" } }
// response.data
{ "covered": true, "jurisdiction": { … }, "rules_version": "0.2.0", "weekly": 1500, "monthly": 6500,
  "minimum": { "weeks": 4, "terminationWeeks": 4, "severanceWeeks": 0, "amount": 6000, "exact": true, "none": false, "statute_short": "Employment Standards Act" },
  "common_law": { "lowMonths": 13, "highMonths": 19, "lowAmount": 84500, "highAmount": 123500 },
  "range": { "low": 6000, "high": 123500, "clause_caps_range": false },
  "offer": null, "offer_vs_minimum": null, "note": "ESA s.30: …" }
```
US response: `minimum: { "none": true }` (New Jersey returns weeks/amount), `offer.weeks` = the
document's own math, `federal_only: true|false`. Not covered (Quebec, territories): `{ "covered": false, "reason": "jurisdiction_not_covered", "name": "Quebec" }` → show the stop screen.

The verdict wording ("Often worth a closer look"…) stays in the clients, as in the prototype.

---

## 3. Free check → case

### POST /cases
Call when the person finishes step 4 ("Your results"). Answers use the **same field names as the web
flow state** (`CanadaFlow.tsx`, `USFlow.tsx`). Unknown extra fields are kept.

```json
{ "country": "CA", "platform": "ios", "industry": "Logistics",
  "answers": {
    "union": "no", "emptype": "regular", "signed": "no", "federal": "no", "agreed": true,
    "province": "ON", "age": 50, "years": 12, "salary": 78000, "payroll": "yes",
    "roleFactor": 1.15, "roleLabel": "Middle management / Senior / Director",
    "pay": { "bonus": true, "stock": false, "benefits": true, "commission": false, "pto": false },
    "offer": 24000, "reemployed": "no", "clause": "unsure", "contract": "current",
    "reason": "layoff", "market": "mid", "redflag": "none" } }
```
US answers: `usState` (full name, e.g. "Georgia"), `age`, `years`, `salary`, `comp{bonus,equity,pto,benefits}`,
`signed`, `union`, `ended`, `empsize`, `others`, `notice`, `release`, `promise`, `groupLayoff`,
`offer`, `deadline`, `advise`, `list`, `revoke`, `nc`, `market`, `redflag`.

Response `201`:
```json
{ "caseId": "7b8c…", "caseToken": "fxc_…", "case": { /* case view, see below */ } }
```

### GET /cases/:caseId — the case view
```json
{ "id": "7b8c…", "publicId": "FX-0420", "platform": "ios", "country": "CA",
  "jurisdiction": { … }, "covered": true,
  "status": "checking", "statusDetail": null, "nextStep": "check",
  "answers": { … }, "freeResult": { … },
  "paid": true, "paidAt": "…", "payment": { "provider": "apple", "amountCents": 5900, "currency": "CAD" },
  "email": "m@example.com", "remind": true, "contractStatus": "added",
  "documents": { "letterPages": 2, "contractPages": 3, "canRead": true, "deletedAt": null, "deleteAfter": "…" },
  "report": { "reportId": "RPT-7Q4K2M", "readyAt": "…", "deleteAfter": "…", "available": true },
  "lawyerRequest": { "requestId": "REQ-0029", "status": "new", "region": "Ontario", "createdAt": "…" },
  "attestedAt": "…", "createdAt": "…", "updatedAt": "…" }
```
`status`: `free_check` → `pending_payment` → `paid` → `reading` → `checking` → `building` → `ready`,
or `failed` with `statusDetail` = `read_failed` | `build_failed` | `jurisdiction_not_covered`.

### PATCH /cases/:caseId/answers
`{ "answers": { "years": 13 } }` (merged). Allowed until the documents are read; after that, change
answers on the check page.

### POST /cases/:caseId/claim  *(Bearer + X-Case-Token)*
"Save to your account (optional)". Links the case to the signed-in user. `GET /user/cases` then lists it.

### DELETE /cases/:caseId
"Delete my data": documents, report, lawyer request and the case.

---

## 4. Ask a lawyer / attorney to contact me (free)

### POST /leads
```json
{ "caseId": "7b8c…", "name": "Marcus Bell", "email": "marcus@example.com", "phone": "(416) 555-0148",
  "bestTime": "Weekday mornings", "consent": true, "platform": "ios" }
```
Send `X-Case-Token` with `caseId`. Without a case (e.g. from a region page) send
`"country": "CA", "jurisdictionCode": "CA-ON"` instead of `caseId`.
Validation as in the prototype: name, valid email, phone with ≥ 10 digits, `consent: true`.
The consent text stored is exactly: *"Share my name, email, phone and summary with one lawyer in
Ontario, who may contact me. Lawyers pay FairExit a flat advertising fee, never a share of your case.
This is not legal advice."* (attorney/Attorneys in the US).

Response `201`: `{ "requestId": "REQ-0029", "status": "new", "region": "Ontario", "duplicate": false, "contactWithinBusinessDays": 2, "lawyerWord": "lawyer" }`

Only name, email, phone, region and a short summary (role level, years, age range, how it ended,
amount offered, deadline, flags) are shared. **Documents and the report are never shared.**

---

## 5. Pay $59

### GET /cases/:caseId/price
`{ "amountCents": 5900, "currency": "CAD", "label": "$59 CAD", "taxNote": "plus applicable tax", "mode": "live", "iap": { … } }`

### POST /cases/:caseId/checkout/prepare
The checkout form (email + terms + "remind me"). Required before Stripe; recommended before IAP so the
"Sent to your email" receipt and private link work.
```json
{ "email": "m@example.com", "remind": true, "termsAccepted": true }
```

### Web: POST /cases/:caseId/checkout/stripe
```json
{ "mode": "checkout", "successUrl": "https://fairexit.io/report/<caseId>/paid", "cancelUrl": "https://fairexit.io/report/<caseId>/checkout" }
```
→ `{ "provider": "stripe", "sessionId": "cs_…", "url": "https://checkout.stripe.com/…" }` — redirect to `url`
(Apple Pay, Google Pay or card; Stripe Tax adds tax). `session_id` is appended to `successUrl`.
On the success page call:

### POST /cases/:caseId/checkout/stripe/confirm
`{ "sessionId": "cs_…" }` → `{ "paid": true, "case": { … } }`. (The webhook also marks it paid.)

`"mode": "payment_intent"` instead returns `{ clientSecret }` for an embedded Payment Element.

### iOS: POST /cases/:caseId/checkout/apple
After StoreKit 2 purchase of `fairexit.severance_report` (consumable):
`{ "transactionId": "2000000123456789" }` → `{ "paid": true, "finishTransaction": true, "case": { … } }`.
Call `transaction.finish()` only after this returns 200. The same transaction can unlock only one case.

### Android: POST /cases/:caseId/checkout/google
`{ "purchaseToken": "…", "productId": "fairexit.severance_report" }` → `{ "paid": true, "consumePurchase": true, … }`.
The server verifies and acknowledges; the app then consumes the purchase.

### Dev only: POST /cases/:caseId/checkout/mock
When `PAYMENTS_MODE=mock` (never in production): marks the case paid.

Errors: `"Purchase didn't complete"` screen = any 4xx/5xx here; keep the purchase un-finished and let the person retry.

---

## 6. Upload (only two documents)

Kinds: `letter` (CA "severance letter", US "separation agreement") and `contract`
(CA "employment contract", US "offer letter or employment contract"). A scan can have several pages
(one file per page, max 20 per document). Types: PDF, JPEG, PNG, WEBP, plain text. **iPhone HEIC must
be converted to JPEG before upload.** Max 15 MB per file.

### Recommended: direct upload (large files, mobile)
1. `POST /cases/:caseId/documents/upload-url`
   ```json
   { "kind": "letter", "fileName": "letter-p1.jpg", "mimeType": "image/jpeg", "sizeBytes": 734002 }
   ```
   → `201`
   ```json
   { "document": { "id": "d1…", "kind": "letter", "page": 1, "status": "pending", … },
     "upload": { "method": "PUT", "url": "https://<project>.supabase.co/storage/v1/object/upload/sign/…", "token": "…",
                 "headers": { "Content-Type": "image/jpeg" }, "expiresInSeconds": 7200 } }
   ```
2. `PUT` the raw bytes to `upload.url` with the `Content-Type` header (no auth header needed).
   (supabase-js clients can instead call `storage.from(bucket).uploadToSignedUrl(path, token, file)`.)
3. `POST /cases/:caseId/documents/:docId/complete` → document `status: "uploaded"` + the list.

### Simple: base64 in JSON (small files)
`POST /cases/:caseId/documents` `{ "kind": "contract", "fileName": "c.pdf", "mimeType": "application/pdf", "dataBase64": "JVBERi0…" }`

### GET /cases/:caseId/documents
```json
{ "documents": [ … ], "letterPages": 2, "contractPages": 0, "contractOk": false, "canRead": false, "contractStatus": null }
```
### DELETE /cases/:caseId/documents/:docId

### PUT /cases/:caseId/contract-status — "No employment contract?" modal
`{ "status": "never" }` (I never signed one) or `{ "status": "missing" }` (I signed one but can't add it / not sure).
Uploading a contract sets `contractStatus: "added"` automatically.

The "Continue" button is enabled when `canRead` is true (letter added AND contract added or a no-contract answer).

---

## 7. AI reads the documents (Call A)

### POST /cases/:caseId/read → 202
`{ "started": true, "status": "reading" }`. Show "Reading…". Also used for "Add a clearer copy":
upload again and call `/read` (answers you confirmed are kept; document rows are re-read).

### GET /cases/:caseId/read
```json
{ "status": "checking", "done": true, "failed": false, "readAt": "…",
  "missing": ["working_notice_weeks"], "lowConfidenceKeys": [] }
```
`failed: true` → show "Scanner couldn't read" and offer re-upload. 429 → "Too many scans today"
(default 5 reads per case per day).

---

## 8. Step 8 — "Check everything your report will use"

### GET /cases/:caseId/check — the whole page model
The server builds the page for all three clients. Render it in this order: conflicts → missing →
groups → final agreement → build button.

```json
{
  "title": "Check everything your report will use",
  "subtitle": "Your report is built only on what you confirm here. Tap Yes if it's right, or Change it.",
  "country": "CA", "contractStatus": "added", "noContractNote": null,
  "counter": { "confirmed": 3, "total": 17, "label": "3 of 17 confirmed", "allSet": false },
  "conflicts": [
    { "key": "offer_amount", "title": "Money offered", "lead": "Your letter and your answers give different amounts.",
      "document": { "value": 24000, "display": "$24,000", "quote": "a lump sum of $24,000, less required deductions",
                    "where": "Your letter, page 1, paragraph 2", "label": "Your letter says" },
      "answers": { "value": 30000, "display": "$30,000", "label": "You told us" } } ],
  "missing": [
    { "key": "working_notice_weeks", "label": "Notice you already worked",
      "question": "Did you keep working after they told you? How many weeks?", "type": "weeks",
      "options": null, "extraChoices": [["0", "No"]] } ],
  "groups": [
    { "id": "you", "title": "About you", "subtitle": "you told us", "rows": [ /* rows */ ] },
    { "id": "offer", "title": "Your offer", "subtitle": "from your letter", "rows": [ … ] },
    { "id": "contract", "title": "Your contract", "subtitle": "from your contract", "rows": [ … ] } ],
  "changes": 1,
  "finalAgreement": { "text": "I've checked each item against my documents and confirmed it's correct to the best of my knowledge. I understand my report is built on what I confirmed here. This includes 1 change you made to what your documents say.",
                      "attested": false, "attestedAt": null },
  "build": { "enabled": false, "allRequiredConfirmed": false, "label": "Confirm 14 more to build your report", "firstUnconfirmedKey": "age" }
}
```
US groups: `you` "About you", `agr` "Your agreement", `lay` "The layoff".

**Row object**
```json
{ "key": "sign_by", "group": "offer", "label": "Decide by", "type": "date", "options": null,
  "source": "letter", "sourceLine": "Your letter, page 2, last paragraph", "isDocumentRow": true,
  "value": "2026-11-14", "display": "Nov 14, 2026", "docValue": "2026-11-14", "docDisplay": "Nov 14, 2026",
  "userValue": null, "quote": "this offer remains open for 14 days from your last day", "where": "…",
  "confidence": "high", "required": true, "notAdded": false,
  "status": null, "counted": false, "tag": null, "ask": null,
  "needsChangeAck": false, "changeAckText": null, "changeLine": null, "pendingSecondLook": null }
```
* `type`: `money` | `date` (ISO `YYYY-MM-DD`) | `weeks` | `days` | `number` | `choice` (use `options`: `[value, label]`) | `text`.
* "See the words" link = `quote`. Source line = `sourceLine`.
* `status`: `null` | `confirmed` | `corrected` | `not_in_docs` | `not_sure`; `tag` gives the chip text
  ("You changed this", "Not in documents", "Not confirmed"). Corrected rows: violet style + `changeLine`
  ("Your letter: $24,000 → Your value: $30,000").
* `needsChangeAck: true` → show the required checkbox with `changeAckText`; the row counts only after `ack_change`.
* `notAdded: true` → contract rows when no contract was added: show "Not added" (info, not required) and `noContractNote`.

**Canada rows:** province, age, years, pay, role, ended · offer_amount, notice_weeks, vacation_on_notice,
last_day, working_notice_weeks, sign_by, release_required, benefits_end · min_only_clause,
contract_start, job_title_contract (not required), bonus_amount (only if Bonus was ticked).
**US rows:** state, age, years, pay · offer_amount, release_required, days_to_decide, take_back,
attorney_line, age_list (only for group layoffs), non_compete, last_day, final_pay_date* and
unused_vacation_payout* (*only when the documents state them; not required) · advance_notice.

### POST /cases/:caseId/check/rows/:key — row buttons
Body `{ "action": "...", "value": ..., "agreed": true }`. Response: `{ "row": "key", "secondLook": {…}|null, "page": <full page model> }`
(re-render from `page`).

| UI | action | body |
|---|---|---|
| **Yes** | `confirm` | — |
| Missing card **Save** | `answer` | `value` (e.g. `2`, `0` for "No", `12000`) |
| **Change → Save** | `change` | `value` |
| **Not in my documents** | `not_in_docs` | — |
| **Not sure** | `not_sure` | — |
| Second-look card **Use [document value]** | `use_document` | — |
| Second-look card **Keep [their value]** | `keep_mine` | — |
| Change acknowledgement checkbox | `ack_change` | `agreed: true` |
| Undo | `reset` | — |

**Second look (Call A2):** `change` on a document row with a different value than the document runs
Call A2 (show "Looking again at your document…", typically 5-20 s). Then:
* `secondLook.matches_person: true` → the document does say their value; the row is confirmed. Done.
* otherwise `page` has the row with `pendingSecondLook`:
  ```json
  { "yourValue": 30000, "yourDisplay": "$30,000", "found_value": "$24,000", "documentDisplay": "$24,000",
    "quote": "a lump sum of $24,000", "where": "page 1, paragraph 2", "matches_person": false, "confidence": "high" }
  ```
  Card: "We looked again. Your letter, [where], says: '[quote]'." Buttons **Use $24,000**
  (`use_document`) · **Keep $30,000** (`keep_mine` → status `corrected`, then `ack_change`) ·
  **Add a clearer copy** (go back to upload, then `POST /read`).
* Answer rows (`About you`) never run a second look; `change` also updates the free-check answers.

### POST /cases/:caseId/check/conflicts/:key — "These don't match" cards
`{ "choice": "document" }` (B, from your letter) · `{ "choice": "answers" }` (A, what you told us →
row becomes `corrected`, needs `ack_change`) · `{ "choice": "other", "value": 27000 }` (Something else,
inline editor) · `{ "choice": "not_sure" }`. Returns the page model. Key `years` is the CA contract
start-date vs years-on-the-job card.

### POST /cases/:caseId/check/attest — final agreement checkbox
`{ "agreed": true }`. Fails with 422 and `errors[0].field = firstUnconfirmedKey` while rows are
unconfirmed ("Confirm N more to build your report"). Any later row change clears the agreement.

---

## 9. Build and read the report (Call B)

### POST /cases/:caseId/report → 202
Needs `build.enabled` (all required rows + attested). `{ "started": true, "status": "building", "reportId": "RPT-7Q4K2M" }`.

### GET /cases/:caseId/report/status
`{ "status": "ready", "stage": "ready", "ready": true, "pdfReady": true, "failed": false, "reportId": "RPT-7Q4K2M", "generationId": "…", "readyAt": "…", "deleteAfter": "…" }`

While building, `stage` reports `preparing`, `claude`, or `pdf`. A saved report whose PDF needs
recovery is terminal `ready` with `pdfReady: false`; `GET /report/pdf` retries from the saved JSON
and never calls Claude.

### GET /cases/:caseId/report — JSON for native report screens (app §0-§9 tabs)
```json
{ "reportId": "RPT-7Q4K2M", "readyAt": "…", "deleteAfter": "…", "jurisdiction": { … }, "rulesAsOf": "2026-10-25",
  "report": {
    "cover": { "role_line": "Senior Analyst · 13 years of service", "place_line": "Ontario" },
    "glance": "…", "contract_note": "…", "confirmed_line": "Built on the details you confirmed on October 31, 2026.",
    "checks": [ { "topic": "Money offered", "letter_says": "…", "contract_says": "…", "rule_says": "…",
                  "status": "ok|bad|ask|info", "why": "…", "source_id": "CA-ON-S1", "from_answers": false } ],
    "factors": { "service": 0.7, "age": 0.6, "job_level": 0.6, "similar_jobs": 0.5, "reasons": { … } },
    "release_check": [ ],
    "myths": [ { "myth": "…", "fact": "…", "source_id": "…" } ],
    "clauses": [ { "title": "…", "status": "…", "what_it_says": "…", "what_it_means": "…", "question_to_ask": "…", "source_id": "…" } ],
    "questions": [ "…" ], "next_steps": [ "…" ], "citations_used": [ "CA-ON-S1" ] },
  "numbers": {
    "country": "CA",
    "minimum": { "amount": 40615, "weeks": 22, "none": false, "statute_short": "Employment Standards Act", "arithmetic": null },
    "range": { "low": 120000, "high": 168000, "lowMonths": 15, "highMonths": 21, "basis": "base pay" },
    "offer": 24000,
    "gauge": { "low": 40615, "high": 168000, "offer": 24000, "position": 0, "label": "Your offer — below the legal minimum" },
    "factorValues": { "service": "14 years", "age": "52", "job_level": "Middle management / Senior / Director", "similar_jobs": "some" } },
  "sources": [ { "id": "CA-ON-S1", "rule": "Ontario Ministry of Labour", "section": "…", "url": "https://…", "status": "verified", "checked": "2026-10-25" } ] }
```

**Graphs (`numbers`)** come from the rules engine and the confirmed facts, never from the AI:
* Canada "Estimated severance range" card (app screen §2): title `$minimum.amount – $range.high`, then the
  same semicircle gauge as the prototype (`gauge()` in app-proto/app.js: red / amber / green thirds, labels
  "Floor" and "Common-law"); the needle is at `gauge.position` (0 = legal minimum, 1 = top of the court
  range) and the caption is `gauge.label`. `gauge` is null when there is no confirmed offer.
* "What moves the range" bars (§3): bar width = `report.factors.<key>` (0-1), value text =
  `numbers.factorValues.<key>`, reason = `report.factors.reasons.<key>`.
* US "Is there a legal minimum?" card: `minimum.none = true` → "No." (New Jersey returns an amount).
The PDF draws all three the same way.
This is exactly the prompt v0.6 OUTPUT. `factors` is Canada only, `release_check` US only; any section
may be missing or empty (every report is unique) — hide empty sections and never print page numbers
in native screens.

### GET /cases/:caseId/report/pdf
The PDF (`?download=0` to show inline). Each section starts on a new page, items never split, contents
page has real page numbers, report ID on the last page. Works as a link too: `…/report/pdf?t=<caseToken>`.
Needs Playwright on the server (`npm i playwright && npx playwright install chromium`), else 501.

### GET /cases/:caseId/report/html
Print-ready HTML of the same report (WebView / iframe / browser print).

---

## 10. Deadlines, reminders, push

* `GET /cases/:caseId/deadlines` → `{ "remind": true, "items": [ { "key": "sign_by", "label": "Decide by", "date": "2026-11-14" } ], "regional": [ { "id": "CA-ON-L1", "text": "2 years to file a claim…", "sourceId": "CA-ON-S4" } ] }`
  (only dates the person confirmed). US items use `days` (days to decide, 7-day take-back).
* `PUT /cases/:caseId/reminders` `{ "email": true }` → reminder emails 3 days and 1 day before "Decide by".
* `POST /cases/:caseId/devices` `{ "platform": "ios", "pushToken": "…" }` stores APNs/FCM tokens for deadline push.

---

## 11. Bring your report in (new device / reinstall) and accounts

* `POST /recover/start` `{ "email": "m@example.com", "orderNumber": "RPT-7Q4K2M" }` (order number optional) → always 200; sends a 6-digit code if a paid report exists.
* `POST /recover/verify` `{ "email": "…", "code": "123456" }` → `{ "cases": [ { "caseId", "caseToken", "publicId", "reportId", "status", "country", "region", "createdAt" } ] }`
* Emails contain a private link `APP_WEB_URL/report?case=<caseId>&t=<caseToken>`: the web app should read
  `t` and use it as `X-Case-Token`.
* `GET /user/cases` (Bearer) — saved reports. `DELETE /user/account` (Bearer) — delete account and all data.
* Existing auth endpoints (`/auth/*`, Apple/Google native sign-in) are unchanged (see README).

---

## 12. What the backend does with the prompt (for reviewers)

* `prompts/report-prompt-v0.6.txt` is the client's file, byte-for-byte (SHA-256 `e914ac58…7724`,
  unit-tested). It is split on its `=== … ===` headings: Call A gets SHARED INPUT + CALL A
  (the two `{jurisdiction.words.*}` placeholders are filled in), Call A2 gets CALL A2, Call B gets
  SHARED INPUT + CALL B. NOTES and CHANGES are not sent to the model.
* Model `claude-opus-5-5`, JSON only, `max_tokens` 24,000 (A) / 32,000 (B), streamed, retried on 429/5xx.
* Call B input = `jurisdiction, answers, contract, call_a (unedited), confirmed_facts, minimum, range, region_rules, sources`:
  - `minimum`/`range` come from the rules engine (port of `severance-rules.js` v0.2.0, tested equal on 5,928 cases).
    Rule 15 (notice already worked) and rule 16 (regular bonus counts for the range only) are applied
    before the call, and the arithmetic line is included.
  - `region_rules` and `sources` come from the region pages (`src/data/regions.json`, built by
    `npm run regions:build` from the code pack). `us_federal_only` gets no region rules; US reports
    always get the federal sources (DOL WARN, EEOC OWBPA Q&A, 29 U.S.C. § 626(f)). Only `verified` sources are sent.
* After Call B the server checks the shape and logs rule warnings (unknown source IDs, dollar amounts
  not in confirmed facts/minimum/range, page references, "you should") with the report, for Sundeep's
  test runs (note 7). Admins can read the exact input at `GET /cases/:id/report/inputs`.
* `AI_MODE=mock` returns sample JSON (Ontario/California samples) so the apps can be built without a key.

---

## 13. Ops dashboard (admin, Bearer of a `profiles.role = 'ADMIN'` user)

| Method | Path | Dashboard view |
|---|---|---|
| GET | `/admin/overview?country=CA\|US\|all&month=2026-10` | Overview KPIs, report status, "Needs attention" |
| GET | `/admin/users?country=&format=csv` | Users (ID, region, industry, free check, report, lawyer request, date) |
| GET | `/admin/leads?status=new&format=csv` | Lawyer requests |
| PATCH | `/admin/leads/:id` `{ status, lawyerId, sentHow, sentBy, notes }` | status: `new`, `sent`, `call_happened`, `retained`, `closed_no_response` |
| GET | `/admin/reports?format=csv` | Reports (ID, user, region, status, paid via, amount, date) |
| GET/POST/PATCH/DELETE | `/admin/lawyers[/:id]` | Lawyers list (name, firm, address, jurisdiction_code, country, email, phone, status, agreement_signed_on, monthly_max, notes) |
| GET | `/admin/cases/:id` | One case: AI calls, payments, lead summary (no tokens) |
| POST | `/admin/cases/:id/retry` | Retry a failed read/build |
| GET | `/admin/prompt` | Live prompt version + SHA-256 |
| POST | `/admin/jobs/run` | Run retention + reminders now |

---

## 14. Retention and jobs

Documents are deleted 30 days after the report is ready (or 30 days after upload if no report is
built); reports 12 months after they are ready; lawyer-request contact details 12 months after the
request closes. Jobs run in-process every 6 hours (`RUN_JOBS_IN_PROCESS=true`) and/or via
`POST /internal/jobs/run` with header `X-Cron-Secret: $CRON_SECRET`.

---

## 15. Setup checklist

1. `cd backend && npm install` (add `npm i playwright && npx playwright install chromium` for PDFs).
2. Copy `.env.example` to `.env`; set Supabase URL + anon + **service-role** key. Start with
   `AI_MODE=mock` and `PAYMENTS_MODE=mock`.
3. `npm run db:push` (runs `sql/001…` and `sql/002_fairexit_core.sql`; creates tables + private buckets).
4. `npm run dev`, then try the flow with the curl script in section 16.
5. Live: set `ANTHROPIC_API_KEY`, `AI_MODE=live`; Stripe keys + webhook
   (`/api/v1/webhooks/stripe`, events `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `payment_intent.succeeded`, `charge.refunded`); Apple/Google IAP keys; `RESEND_API_KEY`; `CRON_SECRET`;
   `PAYMENTS_MODE=live`; configure `READ_RATE_LIMIT_MAX` and `WRITE_RATE_LIMIT_MAX` for expected traffic.
6. New code pack from the client: copy `severance-rules.js` changes into `src/fairexit/severanceRules.ts`,
   run `npm run regions:build`, and replace `prompts/` if the prompt version changes.

## 16. End-to-end smoke test (mock mode)

```bash
API=http://localhost:8000/api/v1
R=$(curl -s -X POST $API/cases -H 'Content-Type: application/json' -d '{"country":"CA","platform":"web","answers":{"province":"ON","age":50,"years":12,"salary":78000,"roleFactor":1.15,"payroll":"yes","offer":24000,"clause":"yes","reason":"layoff","market":"mid","pay":{}}}')
ID=$(echo $R | jq -r .data.caseId); T=$(echo $R | jq -r .data.caseToken); H="X-Case-Token: $T"
curl -s -X POST $API/cases/$ID/checkout/prepare -H "$H" -H 'Content-Type: application/json' -d '{"email":"test@example.com","termsAccepted":true}' >/dev/null
curl -s -X POST $API/cases/$ID/checkout/mock -H "$H" | jq .data.paid
curl -s -X POST $API/cases/$ID/documents -H "$H" -H 'Content-Type: application/json' -d "{\"kind\":\"letter\",\"mimeType\":\"text/plain\",\"dataBase64\":\"$(echo 'sample letter' | base64)\"}" >/dev/null
curl -s -X PUT $API/cases/$ID/contract-status -H "$H" -H 'Content-Type: application/json' -d '{"status":"never"}' >/dev/null
curl -s -X POST $API/cases/$ID/read -H "$H" | jq .data; sleep 2
curl -s $API/cases/$ID/check -H "$H" | jq '.data.counter, .data.conflicts, .data.missing'
```

---

## 17. Roles (USER / ADMIN) for the admin dashboard

* Table `public.profiles` (sql/001) has `role` = `'USER'` (default for every sign-up) or `'ADMIN'`.
  A profile row is created automatically when someone signs up (email, Google or Apple).
* Nobody can make themselves admin: the role is never read from sign-up data, and the database
  rejects a user changing their own role. Tested: a sign-up sending `role: "ADMIN"` becomes `USER`;
  a user updating their own role is refused; a user sees only their own profile; an admin sees all.
* Make someone an admin (they must have signed up first), either:
  - `npm run set-role -- someone@example.com ADMIN` (needs `DATABASE_URL` in backend/.env), or
  - Supabase SQL editor: `select public.set_user_role('someone@example.com', 'ADMIN');`
  - back to normal: same with `USER`.
* The role is copied into the login token (`user.app_metadata.role`), so the web/app can show or hide
  the admin dashboard; the person must sign in again (or refresh the session) after a change.
* Backend: every `/api/v1/admin/*` route checks `profiles.role = 'ADMIN'` on the server.
  `GET /api/v1/user/profile` returns the profile including `role`.

## 18. Stripe setup (web payments)

1. Stripe Dashboard → Developers → API keys: put the secret key in `STRIPE_SECRET_KEY`; set `PAYMENTS_MODE=live`.
2. Webhook: Developers → Webhooks → add endpoint `https://<api>/api/v1/webhooks/stripe` with events
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `payment_intent.succeeded`,
   `charge.refunded`; copy the signing secret to `STRIPE_WEBHOOK_SECRET`.
   Local testing: `stripe listen --forward-to localhost:8000/api/v1/webhooks/stripe` (it prints the `whsec_…`).
3. Tax: "$59 plus applicable tax" needs Stripe Tax (Dashboard → Tax, add your origin address). Then set
   `STRIPE_AUTOMATIC_TAX=true`. Leave it `false` until Stripe Tax is on, or Checkout fails.
4. Apple Pay / Google Pay appear automatically in Checkout (enable them in Settings → Payment methods;
   Apple Pay needs your domain verified there).
5. Test card `4242 4242 4242 4242`, any future date, any CVC. The report page confirms the payment on
   return (`/checkout/stripe/confirm`) even if the webhook is slow, and the webhook covers closed tabs.
