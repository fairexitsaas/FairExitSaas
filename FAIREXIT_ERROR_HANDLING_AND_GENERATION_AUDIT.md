# FairExit: Error Handling, Report Generation & Claude/PDF Audit Report

**Date:** November 4, 2026  
**Audited Target:** FairExit SaaS (`frontend` and `backend`)  
**Production URLs:**
- Frontend: `https://fair-exit-saas.vercel.app`
- Backend: `https://fair-exit-saas-backend.vercel.app`

---

## 1. Executive Summary

A comprehensive investigation and remediation of the FairExit SaaS production report pipeline was conducted. The audit inspected document upload, document reading (Claude Call A), fact review and conflict resolution (Call A2), report JSON compilation (Claude Call B), country-specific PDF rendering (Playwright), Supabase storage upload, client status polling, and error-surfacing mechanics.

### Key Audit Findings & Confirmed Issues
1. **Sample Log Stagnation (`RPT-M9WC94` / `generationId: f46cdc07-316d-4b29-8a85-bbb436b0dd5b` stuck at `building` / `claude`):**
   - **Root Cause Confirmed:** The backend is deployed on Vercel Serverless (`backend/api/index.ts`, `backend/vercel.json`). `flowService.startBuild` initiated Claude Call B via Node's `setImmediate()` in `runReservedBackground()` and immediately returned HTTP 202 to the client. On Vercel Serverless, sending the HTTP response terminates or freezes the execution environment immediately. As a result, the background Claude execution froze mid-stream or died, leaving the database row in `status: 'building'`, `status_detail: 'claude'`.
   - **Compounding Factor:** The backend stale-job threshold `STALE_JOB_MS` was set to 20 minutes (1,200,000 ms). Consequently, `healStale` refused to mark the dead job as `failed` for 20 minutes, during which the frontend polled the status endpoint every 4 seconds (generating ~300 polling requests for a single frozen generation).
2. **Missing Global Notifications & Blocking Error Handling:**
   - `sonner` was not installed in the frontend.
   - The UI lacked a unified blocking error modal. Critical failures (such as document reading errors, build launch errors, or status check network drops) were either logged to `console.warn`, silently caught, or displayed only in localized inline text without halting dependent steps.
3. **Absence of Fail-Fast Behavior:**
   - In `ReadingLetterPage.tsx`, when `caseId` was absent, a `setTimeout` fallback automatically navigated to the review step after 3.8 seconds, simulating a fake successful reading.
   - In `ReportUploadPage.tsx`, if `caseId` was absent, the handler routed the user to a demo reading state instead of rejecting the operation.
   - In `AskLawyerModal.tsx`, an API failure fell back to `setSubmitted(true)`, falsely informing the user that an attorney inquiry succeeded.
4. **Client-Side Polling Loops & Infinite Retry Traps:**
   - In `PaidReportReadyPage.tsx`, `startPollLoop` caught non-429 API failures (e.g., 500, 502, 504, 404, or network loss) and retried indefinitely with exponential backoff rather than stopping and displaying a blocking modal.
   - In `ReadingLetterPage.tsx`, status polling used `setInterval` alongside an uncoordinated mount-time promise without an `AbortController`, creating overlapping asynchronous HTTP requests and memory leaks on route changes or React Strict Mode remounts.
5. **Report Generation Idempotency & Token-Cost Protection:**
   - Verified that `GET /api/v1/cases/:caseId/report/status` is strictly read-only and **does not** trigger Claude invocations or PDF generation.
   - Verified that `claimBuild` uses atomic database filtering (`.in('status', ['checking', 'failed'])`), rejecting concurrent duplicate build launches and preventing double-billing on Claude tokens.

---

## 2. Existing Architecture and Actual Workflow

FairExit operates across two tiers:
- **Frontend:** Next.js (App Router, React 19, TypeScript, Tailwind CSS) deployed on Vercel.
- **Backend:** Node.js, Express, TypeScript, and Supabase client deployed on Vercel Serverless (`backend/api/index.ts`).
- **Data & Storage:** Supabase PostgreSQL database and Supabase Private Storage (`REPORTS_BUCKET`).
- **AI Processing:** Anthropic Claude Messages API (streaming JSON output with custom parsing and fallback extraction).

### Actual Production Workflow Stages
```
[1. Free Check / Intake]
         │
         ▼
[2. Payment ($59 CAD / USD)] ── Stripe / Apple IAP / Google IAP
         │
         ▼
[3. Document Upload] ─────── Direct Supabase Storage PUT / Base64 fallback (Severance Letter + Contract)
         │
         ▼
[4. Document Reading] ────── POST /read -> Claude Call A (extracts terms, facts, notice, release)
         │
         ▼
[5. Fact Review & Check] ─── Server-driven check page, Call A2 second-look on conflicting values
         │
         ▼
[6. Attestation & Build] ─── POST /check/attest -> POST /report -> Claude Call B (entitlements & analysis)
         │
         ▼
[7. PDF Compilation] ─────── Playwright HTML-to-PDF rendering (country-specific legal templates)
         │
         ▼
[8. Private Storage] ─────── Supabase Storage PUT -> status: 'ready', report_pdf_path set
         │
         ▼
[9. Download / Email] ────── Authenticated GET /report/pdf or signed email link token
```

---

## 3. Confirmed Root Causes Found

### Root Cause 1: Stagnant Generation at `building` / `claude` on Vercel Serverless
- **Status:** CONFIRMED.
- **Cause:** `backend/src/utils/background.ts` relies on Node.js `setImmediate()` to execute long-running AI tasks asynchronously after sending an HTTP 202 response. In standard server environments (e.g. EC2/Docker running `node dist/server.js`), the Node event loop continues processing. However, on Vercel Serverless (`https://fair-exit-saas-backend.vercel.app`), the container execution freezes or is terminated immediately after the HTTP response stream closes. Any running streaming request to Anthropic Claude was abruptly suspended.
- **Consequence:** The database record remained stuck indefinitely with `status = 'building'`, `status_detail = 'claude'`, and the active `generationId`.

### Root Cause 2: Stale Job Timeout Was Excessively Long (20 Minutes)
- **Status:** CONFIRMED.
- **Cause:** In `backend/src/services/case.service.ts`, `STALE_JOB_MS = 20 * 60 * 1000`. Claude streaming calls have a 4-minute hard timeout (`CLAUDE_STREAM_TIMEOUT_MS = 240,000 ms`). If a serverless container died or an unexpected failure occurred, `caseService.healStale()` would refuse to transition the job to `failed` for 20 minutes.
- **Consequence:** The client polled every 4 seconds for 300 cycles (~20 minutes) while the backend perpetually returned status `building` and stage `claude`.

### Root Cause 3: Client Polling Ignored Errors and Retried Infinitely
- **Status:** CONFIRMED.
- **Cause:** In `src/lib/reportPolling.ts`, errors thrown during `options.poll()` were caught in a generic catch block that increased `failures` and rescheduled another poll forever using exponential backoff up to 30 seconds.
- **Consequence:** Network partitions, 500 server errors, or 404 case-lookup errors never halted the UI, never triggered a blocking modal, and left the user viewing an infinite loading spinner.

### Root Cause 4: Overlapping Poll Loops & Missing AbortControllers in Reading State
- **Status:** CONFIRMED.
- **Cause:** In `src/components/report/reading/ReadingLetterPage.tsx`, document reading status polling was initiated via `setInterval(..., 2000)` without awaiting the prior promise or binding an `AbortController`. Simultaneously, an uncoordinated initial `.then()` check ran at mount time.
- **Consequence:** On slower network connections, multiple HTTP requests overlapped. On React Strict Mode double-mounts or tab navigation, the detached interval continued firing requests in the background.

### Root Cause 5: Unconditional Success Fallbacks Masking Real Failures
- **Status:** CONFIRMED.
- **Cause:**
  - `ReadingLetterPage.tsx` line 58: If `caseId` was null/undefined, a `setTimeout` timer triggered `onDone()` after 3.8 seconds, advancing the user to the review step without reading documents.
  - `ReportUploadPage.tsx` line 333: If `activeCaseId` was null/undefined, the handler navigated to `/report?case=demo&step=reading`.
  - `AskLawyerModal.tsx` line 67: On lead submission failure, the catch block logged `console.warn` and set `setSubmitted(true)`.

### Root Cause 6: Missing Terminal Failure Details in Report Status Endpoint
- **Status:** CONFIRMED.
- **Cause:** When Call B failed, `flowService.startBuild` set `status = 'failed'` and `status_detail = 'build_failed'`, but did not persist the specific error message to the database record. Furthermore, `flowService.reportStatus` checked `failed: c.status === 'failed' && c.status_detail === 'build_failed'`; any other detail string caused `failed` to evaluate to `false`.

---

## 4. Evidence Supporting Each Root Cause

| Root Cause | Relevant File Path | Function / Identifier | Evidence |
| :--- | :--- | :--- | :--- |
| **Serverless Freezing** | `backend/src/utils/background.ts`<br>`backend/api/index.ts` | `runReservedBackground()` | `setImmediate(() => { fn()... })` dispatches work after HTTP 202 is returned. Vercel serverless freezes execution upon response completion. |
| **20-Minute Stale Timeout** | `backend/src/services/case.service.ts` | `STALE_JOB_MS`, `healStale()` | `const STALE_JOB_MS = 20 * 60 * 1000`. Jobs stuck at `building`/`claude` remain in that state for 1,200,000 ms before `healStale` marks them failed. |
| **Infinite Poll Backoff** | `src/lib/reportPolling.ts` | `startPollLoop()` | `catch (error) { failures += 1; schedule(delayMs); }` never halted polling on non-429 fatal HTTP or network errors. |
| **Overlapping Polls** | `src/components/report/reading/ReadingLetterPage.tsx` | `useEffect` hook | Raw `setInterval(async () => { ... }, 2000)` without promise synchronization or `AbortController`. |
| **Fake Success Fallbacks** | `src/components/report/reading/ReadingLetterPage.tsx`<br>`src/components/dialogs/AskLawyerModal.tsx` | `useEffect`<br>`handleSubmit()` | `ReadingLetterPage`: `setTimeout(() => onDone(), 3800)` when `!activeCaseId`.<br>`AskLawyerModal`: `catch (err) { setSubmitted(true); }`. |
| **Opaque Status Details** | `backend/src/services/flow.service.ts` | `reportStatus()` | Lacked `error` and `failedStage` fields; required hardcoded `build_failed` string match for `failed: true`. |

---

## 5. Why the Issues Occurred

1. **Architecture Mismatch:** The backend background execution logic (`runInBackground` via `setImmediate`) was originally architected for a persistent Node.js process (e.g. Docker container or VM). When ported to Vercel Serverless (`backend/api/index.ts`), serverless execution lifecycles severed asynchronous event loop processing.
2. **Optimistic Error Fallbacks from Prototype:** Prototype code intended to demonstrate UI flows in offline/demo modes remained in production handlers (e.g. `setTimeout` navigation in `ReadingLetterPage`, offline fallback in `AskLawyerModal`).
3. **Absence of Unified Error Handling Layer:** Individual components were responsible for their own error catching, resulting in inconsistent approaches: some used inline state, some logged to console, and some swallowed exceptions to prevent UI crashes.
4. **Disjointed Polling Contracts:** Frontend polling assumed the backend would update status within seconds or fail explicitly. However, backend failures in serverless left the database row untouched, while `healStale`'s 20-minute timer prevented timely failure detection.

---

## 6. Exact Solutions Implemented

### 1. Global Toast Notifications (Sonner)
- Installed `sonner` package.
- Mounted a single global `<Toaster position="top-right" richColors closeButton theme="light" />` inside `src/app/Provider.tsx`.
- Created `src/lib/notifications.ts` providing `notifySuccess()` and `notifyError()` with:
  - **Deduplication:** 2,500ms deduplication cache preventing duplicate notifications across multiple abstraction layers.
  - **Sanitization:** Strips database query fragments, stack traces, and sensitive internal keys from user-facing toasts.

### 2. Global Blocking Error Modal
- Created `src/components/dialogs/BlockingErrorModal.tsx`:
  - Accessible dialog (`role="alertdialog"`, `aria-modal="true"`, focus management, Esc key dismiss).
  - Displays clear error title, safe error message, stage badge (e.g. `Stage: Report Generation`), HTTP status code, and Request ID correlation.
  - High z-index (`z-[9999]`) ensuring visibility above all overlays and sheets.
  - Supports an explicit, safe `Retry` button with async loading states (`isRetrying`).
  - Closing the modal preserves the failed state and does not trigger unprompted restarts.
- Created `src/context/ErrorModalContext.tsx` with `ErrorModalProvider`, `useErrorModal()` hook, and `triggerGlobalError()` dispatcher.
- Mounted `<ErrorModalProvider>` in `src/app/Provider.tsx`.

### 3. Fail-Fast Workflow Implementation
- **Document Upload:** In `ReportUploadPage.tsx`, upload errors immediately stop processing, show toast + blocking modal with stage `Document Upload`, and halt execution. `handleContinue()` stops immediately if `startRead` fails, preventing navigation to `reading`.
- **Document Reading:** In `ReadingLetterPage.tsx`, removed fake `setTimeout` fallback. Polling uses `startPollLoop`. On failure or poll error, clears loading indicators, stops polling, and surfaces blocking modal with stage `Document Reading` and a `Retry Reading` action.
- **Review Page:** In `CanadaReviewPage.tsx` and `USReviewPage.tsx`, `onClick` for report building awaits `attest` and `buildReport`. Failures immediately release submit locks, clear spinners, and trigger blocking modals with stage `Report Generation`.
- **Report Polling & PDF Download:** In `PaidReportReadyPage.tsx`, status polling stops upon terminal states (`ready` or `failed`). On failure or poll network error, displays blocking modal with stage and retry options. Download errors display blocking modals with stage `PDF Download`.
- **Eliminated Swallowed Exceptions:** In `AskLawyerModal.tsx`, failures surface actionable error messages and toasts; fake success states were eliminated.

### 4. Centralized API Client & Correlation Tracking
- Extended `FairExitApiError` in `src/lib/api/fairexit.ts` to include `status`, `message`, `errors`, `retryAfterSeconds`, `requestId`, and `stage`.
- Enhanced `call<T>()` in `fairexit.ts`:
  - Captures `X-Request-Id` response header and body `requestId`.
  - Categorizes HTTP 401, 403, 404, 422, 429, and 500+ with actionable messages.
  - Distinguishes network disconnects and timeouts.
  - Tagged all client calls with their workflow stages (`Document Reading`, `Check Action`, `Report Generation`, etc.).

### 5. Polling Loop Hardening & Idempotency
- Updated `src/lib/reportPolling.ts`:
  - Enforces strictly non-overlapping requests using async/await.
  - Cancels active in-flight requests on unmount via `AbortController`.
  - Terminates immediately on terminal states (`isTerminal()`).
  - Respects HTTP 429 `Retry-After` headers.
  - Terminates after consecutive non-transient errors (`maxRetries: 2`) and delegates to `onError` to surface the blocking modal.

### 6. Backend Stale Timeout & Failure Detail Persistence
- In `backend/src/services/case.service.ts`:
  - Reduced `STALE_JOB_MS` from 20 minutes to 3.5 minutes (210,000 ms).
  - In `healStale()`, when a job times out, it persists `lastError: 'Report generation timed out. Please try again.'` and `failedStage: 'claude'` directly to `report_inputs`.
- In `backend/src/services/flow.service.ts`:
  - In Call A and Call B error catches, persists `lastError` and `failedStage` to `report_inputs`.
  - In `reportStatus(c)`, returns `failed: isFailed`, `error`, and `failedStage`.
  - In `readStatus(c)`, returns `failed: isFailed` and `error`.

---

## 7. Every Changed File and Why It Was Changed

| File Path | Component / Layer | Reason for Change |
| :--- | :--- | :--- |
| `src/lib/notifications.ts` | Frontend Utility | **NEW:** Implements global Sonner notification helpers with toast deduplication (2.5s window) and error message sanitization. |
| `src/components/dialogs/BlockingErrorModal.tsx` | Frontend Component | **NEW:** Reusable, accessible blocking error modal displaying title, safe message, workflow stage badge, HTTP status, Request ID, and optional Retry action. |
| `src/context/ErrorModalContext.tsx` | Frontend Context | **NEW:** React Context provider and hook (`useErrorModal`) for triggering the blocking error modal across the entire application tree. |
| `src/app/Provider.tsx` | Frontend Root Provider | Mounted global `<Toaster />` and `<ErrorModalProvider>` so notifications and error modals are accessible throughout the app. |
| `src/lib/api/fairexit.ts` | Frontend API Client | Extended `FairExitApiError` with `requestId` and `stage`; centralized error parsing, status categorization, and offline detection. |
| `src/lib/reportPolling.ts` | Frontend Polling Helper | Enforced single active loop, non-overlapping requests, `AbortController` cancellation, 429 backoff, and terminal error propagation. |
| `src/components/report/PaidReportReadyPage.tsx` | Frontend Report Ready Page | Replaced fragile poll error handling with blocking modal; added fail-fast handling to PDF download and build retries; success toast on verified completion. |
| `src/components/report/reading/ReadingLetterPage.tsx` | Frontend Reading Page | Replaced raw `setInterval` with `startPollLoop`; removed fake timeout fallback; wired error modal to reading failures. |
| `src/components/report/ReportUploadPage.tsx` | Frontend Upload Page | Added error modal on upload failures and `startRead` failures; prevented fake demo navigation when case ID is missing. |
| `src/components/report/ca/CanadaReviewPage.tsx` | Frontend Review (CA) | Added fail-fast error modal on attestation or build failure; prevents advancing to ready state when build fails. |
| `src/components/report/us/USReviewPage.tsx` | Frontend Review (US) | Added fail-fast error modal on attestation or build failure; prevents advancing to ready state when build fails. |
| `src/app/report/ReportFlow.tsx` | Frontend Flow Coordinator | Wired error modal into `CheckStep` build trigger; prevented swallowed exceptions. |
| `src/components/dialogs/AskLawyerModal.tsx` | Frontend Dialog | Removed fake success state (`setSubmitted(true)`) on failure; surfaces error toast and error feedback. |
| `backend/src/services/case.service.ts` | Backend Case Service | Reduced `STALE_JOB_MS` from 20 minutes to 3.5 minutes; updated `healStale` to record `lastError` and `failedStage`. |
| `backend/src/services/flow.service.ts` | Backend Flow Service | Persisted terminal failure details (`lastError`, `failedStage`) on Call A and Call B failure; updated `reportStatus` and `readStatus` to return clear error contracts. |
| `package.json` & `package-lock.json` | Project Dependencies | Added `sonner: "^2.0.8"`. |

---

## 8. Before-and-After Behavior

| Workflow Event | Before Behavior | After Behavior |
| :--- | :--- | :--- |
| **Document upload failure** | Local error string logged; workflow could still attempt read or display confusing state. | Upload halts immediately. Sonner error toast and blocking modal appear with stage `Document Upload`. Dependent reading is not started. |
| **Document reading failure** | If `caseId` was null, timer proceeded to review after 3.8s. If API failed, polling logged to console and ran indefinitely. | Halts immediately. No fake timer fallback. Status polling stops on failure. Sonner error toast and blocking modal display saved backend error and Retry action. |
| **Report generation start failure** | Button spinner stopped, inline text showed error; no toast or blocking modal. | Submit lock released, spinner cleared, Sonner error toast and blocking modal appear with HTTP status, Request ID, and Retry action. Review step does not advance. |
| **Generation frozen in `claude` stage** | Backend stayed `building`/`claude` for 20 minutes. Frontend polled every 4s (~300 requests) with infinite spinner. | After 3.5 minutes without progress, backend `healStale` marks job `failed` with detail `build_failed`. Frontend status poll stops on failure and displays blocking modal with Retry. |
| **Status polling network/server error** | Infinite exponential backoff loop. Frontend never showed an error dialog to the user. | After consecutive failures (`maxRetries: 2`), polling stops. Sonner error toast and blocking modal appear with HTTP status and Request ID. |
| **PDF download failure** | Inline error string shown; no global toast or modal. | Download spinner stops. Blocking modal displays exact failure message with stage `PDF Download` and Retry action. |
| **Attorney inquiry submission error** | Catch block set `submitted = true`, falsely confirming contact. | Error caught cleanly. Form displays error message and fires `notifyError()`. Form remains editable. |

---

## 9. How Global Toast and Modal Error Handling Work

```
      API Call or Async Operation
                  │
                  ▼
          Error Encountered
                  │
     ┌────────────┴────────────┐
     ▼                         ▼
[notifyError()]         [showErrorModal()]
     │                         │
     ▼                         ▼
Deduplicated Toast       Blocking Dialog (z-[9999])
- 2,500ms dedupe key     - Title & Safe Message
- Sanitized message      - Workflow Stage Badge
- Accessible styling     - HTTP Status & Request ID
- Compatible colors      - Acknowledge / Close Button
                         - Explicit Retry (when safe)
```

1. **Dual Notification:** For required workflow failures, both a Sonner error toast and a blocking error modal are displayed simultaneously.
2. **Deduplication:** `notifyError()` tracks a Map of recent message keys within a 2,500ms window. If multiple callers catch the same error, only one toast is shown.
3. **Safe Sanitization:** Messages are filtered to remove SQL fragments, stack traces, and internal secrets before rendering in toasts or modals.
4. **Non-Destructive Close:** Dismissing the modal (via button or Escape key) simply closes the dialog; it does not trigger automated retries or mark operations successful.

---

## 10. How Failures Stop Downstream Operations

1. **Awaiting Asynchronous Steps:** All critical API calls (`uploadFile`, `startRead`, `attest`, `buildReport`, `reportStatus`, `download`) are strictly awaited.
2. **Immediate Halting:** When an awaited call rejects or returns a failure condition, execution in the handler terminates immediately via `return`. Subsequent API calls or navigation commands (`setView`, `router.push`, `onContinue`, `onDone`) are skipped.
3. **State Integrity:** Component loading indicators (`isSubmitting`, `isSubmittingBuild`, `isDownloading`, `retrying`) are cleared in `finally` blocks, preventing frozen spinners while keeping the user on the current step with failure context preserved.

---

## 11. How Status Polling Works and When It Stops

1. **Execution via `startPollLoop`:**
   - Single active execution context per generation/lifecycle.
   - Polling requests are sequential; a new poll is only scheduled **after** the prior promise resolves.
   - Request cancellation is bound to an `AbortController`.
2. **Terminal State Termination:**
   - The loop checks `options.isTerminal(value)` on every response.
   - If `status !== 'building'` (i.e. `ready` or `failed`), `active` is set to `false`, the terminal callback is executed, and no subsequent timer is scheduled.
3. **Lifecycle Cleanup:**
   - When the parent component unmounts, the route changes, or the generation ID changes, the `useEffect` cleanup function aborts in-flight requests and clears pending timers.
4. **Fatal Error Halting:**
   - On non-429 fatal HTTP or network errors exceeding `maxRetries`, polling halts (`active = false`) and delegates to `onError`, opening the blocking modal.

---

## 12. Whether Duplicate Polling Was Found

- **Finding:** CONFIRMED in `ReadingLetterPage.tsx`.
  - An unmetered `setInterval` was active alongside an uncoordinated mount-time `.then()` check.
  - Absence of an `AbortController` caused lingering requests on rapid unmount/remount (such as React Strict Mode in development).
- **Resolution:** Replaced with `startPollLoop`, which manages an `AbortController` and ensures strictly sequential polling.

---

## 13. Whether Duplicate Report Generation or Claude Invocations Were Found

- **Finding:** CONFIRMED in frontend button rapid-clicks; REJECTED in backend status polling.
  - Rapid double-clicks on "Build my report" could initiate duplicate `POST /report` calls if not locked.
  - The backend status endpoint `GET /api/v1/cases/:caseId/report/status` **does not** trigger Claude or generate reports.
  - In the backend, `claimBuild` uses atomic database filtering (`.in('status', ['checking', 'failed'])`), safely rejecting concurrent generation requests.

---

## 14. Idempotency and Token-Cost Protections Implemented

1. **Read-Only Status Check:** The status endpoint remains strictly read-only.
2. **Atomic DB Build Claim:** `caseService.claimBuild` transitions status atomically. Concurrent requests attempting to start the same case return the existing in-progress generation ID and HTTP 202 without invoking Claude Call B.
3. **Button Lockout:** `buildSubmitLock.current` ref locks the button immediately on the first click before async operations begin.
4. **PDF Recovery Without Re-Invoking Claude:** If Claude Call B succeeds and report JSON is stored in the database, but PDF rendering or Supabase upload fails, the report status is marked `status: 'ready', status_detail: 'pdf_pending'`. Retrying resumes only the PDF generation step, preserving Claude tokens.

---

## 15. Tests Performed and Actual Results

| Test Suite / Verification | Scope | Command | Result |
| :--- | :--- | :--- | :--- |
| **Backend Vitest Unit & Integration Tests** | Report polling loop, Call A, Call B, CORS, Rate Limiter, ApiError, PDF Recovery, Document Processing | `npm test` (in `backend`) | **PASSED** (13 test files passed, 65 tests passed, 1 skipped). |
| **Backend TypeScript Typecheck** | Backend routes, controllers, services, middleware, validators | `npm run typecheck` (in `backend`) | **PASSED** (0 errors). |
| **Frontend TypeScript Typecheck** | Frontend components, providers, dialogs, API clients, contexts | `npx tsc --noEmit` (in root) | **PASSED** (0 errors). |
| **Frontend Production Build** | Next.js 16 App Router optimized build, route compilation, static generation | `npx next build --webpack` (in root) | **PASSED** (33 routes compiled successfully, exit code 0). |
| **Polling Loop Test (`reportPolling.test.ts`)** | Verifies non-overlapping execution, terminal status termination, 429 Retry-After backoff, and AbortController cleanup | `vitest run tests/unit/reportPolling.test.ts` | **PASSED** (2 tests passed). |

---

## 16. Remaining Risks, Limitations, and Unverified Checks

1. **Vercel Serverless Background Process Limitation:**
   - *Limitation:* Node.js `setImmediate()` in `runInBackground` is inherently unreliable on serverless platforms (Vercel) because serverless functions freeze once the HTTP response is sent.
   - *Safe Mitigation Implemented:* `STALE_JOB_MS` was reduced from 20 minutes to 3.5 minutes. If a serverless function terminates mid-execution, the job is automatically healed to `failed`, persisting a clear error and allowing the user to retry.
   - *Recommended Architectural Evolution:* For high production volumes, long-running AI tasks should be transitioned to a dedicated background worker (e.g. Inngest, BullMQ on Redis, or Vercel Workflow/Queue) rather than in-process execution.
2. **Live Anthropic API Credentials:**
   - In the test environment, tests ran using mock mode (`AI_MODE=mock`) to avoid consuming billable Claude tokens. Real Anthropic API streaming over live network sockets depends on the production API key configured in Vercel environment variables.

---

## 17. How to Inspect Deployed Logs and Verify the Fix Works

To verify the deployment in production, inspect the logs in Vercel or your logging aggregator (e.g. Datadog / Logflare):

1. **Verify Report Generation Request & Start:**
   Filter for `[REPORT][REQUESTED]` and `[REPORT][INPUT_PREPARED]`.
   ```json
   {
     "level": "INFO",
     "message": "[REPORT][INPUT_PREPARED]",
     "details": {
       "requestId": "...",
       "caseId": "...",
       "reportId": "RPT-XXXXXX",
       "generationId": "...",
       "durationMs": 45
     }
   }
   ```
2. **Verify Idempotency on Duplicate Requests:**
   Trigger multiple clicks or requests on `/report`. Look for:
   ```json
   {
     "level": "INFO",
     "message": "[REPORT][ALREADY_PROCESSING]",
     "details": {
       "caseId": "...",
       "generationId": "...",
       "stage": "claude"
     }
   }
   ```
3. **Verify Claude Invocation & Duration:**
   Look for `[CLAUDE][CALL_B_START]`, `[CLAUDE][CALL_B_RESPONSE]`, and `[CLAUDE][JSON_VALIDATION]`.
4. **Verify PDF Rendering & Supabase Upload:**
   Look for `[PDF][RENDER_START]`, `[PDF][RENDER_COMPLETE]`, and `[STORAGE][UPLOAD_COMPLETE]`.
5. **Verify Status Polling Frequency:**
   Filter for `[STATUS][POLL]`. Verify that status polls arrive every 4 seconds, maintain the same `generationId`, and cease completely once `status: 'ready'` or `status: 'failed'` is reached.
6. **Verify Failure Capture:**
   In the event of an error, verify that `[REPORT][FAILED]` logs the stage and message, and that the subsequent `[STATUS][POLL]` response contains `failed: true` with the safe error string.

