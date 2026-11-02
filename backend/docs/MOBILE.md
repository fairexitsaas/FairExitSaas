# iOS and Android: how to use the same API

The web app (`src/app/report/ReportFlow.tsx`) is the working reference: every screen there calls the
same endpoints the apps call. Build the apps as the same state machine.

## 1. One rule drives every screen

```
GET /cases/:id  ->  nextStep
  "pay"       -> Unlock · purchase (screen 17)
  "upload"    -> Add your letter / Scan your letter (19, 20, NC no-contract modal)
  "reading"   -> Reading… (21)            poll every 3 s
  "check"     -> Check everything (22) + Second look (22s)
  "building"  -> building spinner          poll every 3 s
  "ready"     -> Report §0-§9 (23-32), Contents (33), Deadlines (34)
  "not_covered" -> Not a fit yet (11)
```
On launch, deep link or push tap: load the case, go to `nextStep`. Never keep your own copy of the flow state.

## 2. Storage

| | iOS | Android |
|---|---|---|
| caseId + caseToken | Keychain (`kSecClassGenericPassword`, service `fairexit.case`) | EncryptedSharedPreferences |
| Headers on every call | `X-Case-Token`, `X-Platform: ios` | `X-Case-Token`, `X-Platform: android` |
| Signed in (optional) | Sign in with Apple → `POST /auth/oauth/apple/native` → then `POST /cases/:id/claim` | Google → `POST /auth/oauth/google/native` → claim |

## 3. Payment (in-app purchase)

Product ID from `GET /config` → `payments.appleProductId` / `googleProductId` (default
`fairexit.severance_report`, a **consumable**, price tier $59 CAD / $59 USD).

1. `POST /cases/:id/checkout/prepare` `{ email, remind, termsAccepted: true }`
2. iOS StoreKit 2:
   ```swift
   let result = try await product.purchase(options: [.appAccountToken(UUID(uuidString: caseId)!)])
   if case .success(let v) = result, case .verified(let tx) = v {
       try await api.post("/cases/\(caseId)/checkout/apple", ["transactionId": String(tx.id)])
       await tx.finish()            // only after the API said 200
   }
   ```
   Android Play Billing:
   ```kotlin
   // in onPurchasesUpdated, purchase.purchaseState == PURCHASED
   api.post("/cases/$caseId/checkout/google", mapOf("purchaseToken" to purchase.purchaseToken, "productId" to productId))
   billingClient.consumeAsync(ConsumeParams.newBuilder().setPurchaseToken(purchase.purchaseToken).build()) { _, _ -> }
   ```
3. If the call fails, do not finish/consume; retry on next launch (unfinished transactions come back).
   Show screen 54 "Purchase didn't complete".
4. Development: `PAYMENTS_MODE=mock` → `POST /cases/:id/checkout/mock`.

## 4. Upload / scan

- Scan with VisionKit (`VNDocumentCameraViewController`) / ML Kit Document Scanner. Send **one JPEG per
  page** (convert HEIC to JPEG, ~2000 px long edge, quality 0.8) or one PDF.
- For each file: `POST /documents/upload-url` → `PUT` bytes to `upload.url` with `Content-Type` →
  `POST /documents/:docId/complete`.
- No contract: `PUT /contract-status { "status": "never" | "missing" }` (screens NC, NC2).
- Continue when `documents.canRead` → `POST /read` → poll.
- 429 with `errors[0].code == "daily_limit"` → screen 56 "Too many scans today".
- `status == "failed"` and `statusDetail == "read_failed"` → screen 55 "Scanner couldn't read".

## 5. Check page

Render `GET /check` exactly as returned (see API.md section 8). Every tap is one call and the response
contains the whole new `page`, so the screen is just `page = response.page`.
While a `change` request on a document row is running, show "Looking again at your document…".

## 6. Report screens

`GET /report` gives `report` (the AI text) and `numbers` (the graphs). Map:
| App screen | Data |
|---|---|
| §0 The important stuff | `report.glance`, `report.contract_note`, cover lines |
| §1 Your offer | `report.checks` |
| §2 Range (CA) / release check (US) | `numbers.gauge` + `numbers.range` (draw the same semicircle: red/amber/green thirds, needle at `gauge.position`) / `report.release_check` |
| §3 What lifts it / no legal floor | `report.factors` + `numbers.factorValues` (CA) / `numbers.minimum.none` (US) |
| §5 Terms to understand | `report.clauses` |
| §6 Questions to ask | `report.questions` |
| §7 Take your time / §9 | `report.next_steps`, `GET /deadlines` |
| Save PDF / Share | download `GET /report/pdf` with the case token, then the share sheet |
Hide a section whose data is missing or empty.

## 7. Deadlines and push

`GET /deadlines` for screen 34. After the notification permission (35), `POST /cases/:id/devices`
`{ platform, pushToken }`. Schedule the "Decide by" reminder locally from `items[].date` (works offline);
server email reminders follow `PUT /reminders { email: true }`.

## 8. Lawyer tab

`POST /leads` with `caseId` (screens LF, LF2). Show `requestId` and "usually within 2 business days".
`GET /cases/:id` → `lawyerRequest` tells the tab whether a request is already open.

## 9. Bring your report in (W0-W12)

`POST /recover/start { email, orderNumber? }` → user types the 6-digit code →
`POST /recover/verify` → save every returned `caseId` + `caseToken`.

## 10. Delete (52, 53)

Delete my data: `DELETE /cases/:id`. Delete account: `DELETE /user/account` (Bearer).
