# Prompt to give an AI coding assistant (web, iOS or Android)

Copy everything below the line into your AI tool, together with `backend/docs/API.md` and
(for the web) `backend/docs/client/fairexitApi.ts`.

---

You are wiring an existing, finished FairExit frontend to its backend API. Do not redesign screens
and do not change any copy; only replace the simulated data and local logic with API calls.

**Read first:** `API.md` (the full contract). Base URL comes from config
(web: `NEXT_PUBLIC_API_URL`, default `http://localhost:8000/api/v1`).

**Rules**
1. No account is needed. After the free check, call `POST /cases` once and store `caseId` + `caseToken`
   securely (web: localStorage keyed by caseId; iOS: Keychain; Android: EncryptedSharedPreferences).
   Send `X-Case-Token` on every `/cases/:caseId/...` request and `X-Platform: web|ios|android`.
2. Keep the free-check answer field names exactly as the flow state already has them (`province`,
   `federal`, `age`, `years`, `salary`, `roleFactor`, `pay`, `offer`, `clause`, `contract`, `reason`,
   `market`, `redflag`, … ; US: `usState`, `comp`, `ended`, `empsize`, `others`, `notice`, `release`,
   `deadline`, `advise`, `list`, `revoke`, `nc`, …).
3. Use `GET /jurisdictions` for the province/state dropdowns and `jurisdiction.words` for
   lawyer/attorney and province/state wording. `regime: "us_federal_only"` shows the federal-only note;
   `covered: false` shows the "not covered" stop screen.
4. Always route with `case.nextStep` from `GET /cases/:caseId` (`pay`, `upload`, `reading`, `check`,
   `building`, `ready`, `not_covered`). On app launch / deep link, resume there.
5. Payment: web = Stripe Checkout (`/checkout/prepare` then `/checkout/stripe`, redirect, then
   `/checkout/stripe/confirm` on the success page). iOS = StoreKit 2 product `fairexit.severance_report`,
   then `/checkout/apple` with the transactionId; finish the transaction only after 200. Android = Play
   Billing, then `/checkout/google` with the purchaseToken; consume after 200. In development use
   `/checkout/mock`.
6. Upload: only two documents, `letter` and `contract` (several pages allowed). Use
   `/documents/upload-url` → PUT bytes → `/documents/:docId/complete`. Convert HEIC to JPEG first.
   The "No employment contract?" modal calls `PUT /contract-status` with `never` or `missing`.
   Enable Continue when `documents.canRead` is true, then `POST /read` and poll every 3 s.
7. The check page is fully server-driven: render `GET /check` (conflicts → missing → groups → final
   agreement → build button). Every button calls `POST /check/rows/:key` or
   `POST /check/conflicts/:key` and re-renders from the returned `page`. Use the row's `display`,
   `sourceLine`, `quote`, `tag`, `changeLine`, `needsChangeAck`/`changeAckText` and `pendingSecondLook`
   fields; never compute these locally. Show "Looking again at your document…" while a `change`
   request is in flight. The build button uses `build.label` and `build.enabled`.
8. Build: `POST /report`, poll `GET /report/status`, then show `GET /report` (native screens) and
   offer the PDF via `GET /report/pdf` (link with `?t=<caseToken>`). Hide any report section that is
   missing or empty; never show page numbers in native screens.
9. "Ask a lawyer/attorney to contact me": `POST /leads` (name, email, 10-digit phone, consent: true,
   bestTime optional, caseId when there is one). Documents are never sent.
10. Errors: show `message` from the error body. 402 = go to pay. 409 = wrong step (refetch the case).
    429 with `errors[0].code = "daily_limit"` = "Too many scans today" screen.
11. Deadlines screen: `GET /deadlines`; reminder toggle: `PUT /reminders`; push token: `POST /devices`.
12. "Bring your report in": `POST /recover/start` then `POST /recover/verify` returns case tokens.
    Web: the email link `/report?case=<caseId>&t=<token>` must save `t` as the case token.

Deliver: an API client module, the calls wired into the existing screens, loading/error states, and
no other UI changes.
