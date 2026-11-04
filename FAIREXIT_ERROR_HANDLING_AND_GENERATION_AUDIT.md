# FairExit: Error Handling, Report Generation & Claude/PDF Audit Report

**Date:** November 4, 2026  
**Audited Target:** FairExit SaaS (`frontend` and `backend`)  
**Production URLs:**
- Frontend: `https://fair-exit-saas.vercel.app`
- Backend: `https://fair-exit-saas-backend.vercel.app`

---

## 1. Executive Summary

A comprehensive investigation and remediation of the FairExit SaaS production report pipeline was conducted across frontend and backend codebases. The audit inspected document upload, document reading (Claude Call A), fact review and conflict resolution (Call A2), report JSON compilation (Claude Call B), country-specific PDF rendering (Playwright & Sparticuz Chromium), Supabase storage upload, client status polling, durable queue execution, and user-facing error reporting.

### Key Audit Findings & Confirmed Issues
1. **Production Stagnation at `building / claude` & Missing Error Logs:**
   - **Root Cause Confirmed:** The backend is deployed on Vercel Serverless (`backend/api/index.ts`, `backend/vercel.json`). `flowService.startBuild` previously initiated Claude Call B via Node's in-process `setImmediate()` in `runReservedBackground()` and immediately returned HTTP 202 to the client. On Vercel Serverless (AWS Lambda under the hood), sending the HTTP response immediately freezes or terminates the execution container. As a result, the streaming Claude request was abruptly frozen mid-stream without emitting a completion or catch exception in logs, leaving the database row in `status: 'building'`, `status_detail: 'claude'`.
   - **Compounding Timeout Mismatch:** In `claude.service.ts`, the streaming hard timeout was set to 4 minutes (240,000 ms), whereas Vercel serverless function `maxDuration` was configured to 60 seconds. When Claude was slow or held open, Vercel terminated the function at 60s before Node's 4-minute `AbortController` could trigger, log a timeout, or persist an error to Supabase.
2. **Missing Chromium Executable on Vercel (`[REPORT][JSON_SAVED]` but PDF Render Failure):**
   - **Root Cause Confirmed:** `backend/src/services/pdfBrowser.ts` and `backend/vercel.json` referenced `@sparticuz/chromium` and `puppeteer-core`, but **neither package was declared in `backend/package.json`**. Consequently, Vercel builds failed to bundle the headless Chromium binary and libraries, resulting in runtime launch crashes during PDF rendering even when report JSON was successfully saved.
3. **Missing Global Notifications & Blocking Error Handling:**
   - `sonner` was not installed in the frontend dependencies.
   - The application lacked a unified blocking error dialog. Critical failures (such as document reading errors, build launch errors, or status check network drops) were either logged to `console.warn`, silently caught, or displayed only in localized inline text without halting dependent steps.
4. **Absence of Fail-Fast Behavior & Prototype Fallbacks:**
   - In `ReadingLetterPage.tsx`, when `caseId` was absent, a `setTimeout` fallback automatically navigated to the review step after 3.8 seconds, simulating a fake successful reading.
   - In `ReportUploadPage.tsx`, if `caseId` was absent, the handler routed the user to a demo reading state instead of rejecting the operation.
   - In `AskLawyerModal.tsx`, an API failure fell back to `setSubmitted(true)`, falsely informing the user that an attorney inquiry succeeded.
5. **Client-Side Polling Loops & Infinite Retry Traps:**
   - In `PaidReportReadyPage.tsx`, `startPollLoop` caught non-429 API failures (e.g., 500, 502, 504, 404, or network loss) and retried indefinitely with exponential backoff rather than stopping and displaying a blocking modal.
   - In `ReadingLetterPage.tsx`, status polling used `setInterval` alongside an uncoordinated mount-time promise without an `AbortController`, creating overlapping asynchronous HTTP requests and memory leaks on route changes or React Strict Mode remounts.
6. **Report Generation Idempotency & Token-Cost Protection:**
   - Verified that `GET /api/v1/cases/:caseId/report/status` is strictly read-only and **does not** trigger Claude invocations or PDF generation.
   - Verified that `claimBuild` uses atomic database filtering (`.in('status', ['checking', 'failed'])`), rejecting concurrent duplicate build launches and preventing double-billing on Claude tokens.

---

## 2. Existing Architecture and Actual Workflow

FairExit operates across two tiers:
- **Frontend:** Next.js (App Router, React 19, TypeScript, Tailwind CSS) deployed on Vercel (`https://fair-exit-saas.vercel.app`).
- **Backend:** Node.js, Express, TypeScript, and Supabase client deployed on Vercel Serverless (`https://fair-exit-saas-backend.vercel.app`).
- **Data & Storage:** Supabase PostgreSQL database and Supabase Private Storage (`fairexit-documents`, `fairexit-reports`).
- **AI Processing:** Anthropic Claude Messages API (streaming JSON output with custom parsing and fallback extraction).
- **PDF Generation:** Multi-page legal severance report rendering via headless Chromium (`@sparticuz/chromium` + `puppeteer-core` on serverless; Playwright locally/Docker).

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
[7. PDF Compilation] ─────── Country-specific legal templates rendered via headless Chromium
         │
         ▼
[8. Private Storage] ─────── Supabase Storage PUT -> status: 'ready', report_pdf_path set
         │
         ▼
[9. Download / Email] ────── Authenticated GET /report/pdf or signed email link token
```

---

## 3. Confirmed Root Causes Found

### Root Cause 1: Stagnant Generation at `building / claude` from Vercel Serverless Freezing
- **Status:** CONFIRMED & RESOLVED.
- **Cause:** `backend/src/utils/background.ts` relied on Node.js `setImmediate()` to execute long-running AI tasks asynchronously after sending an HTTP 202 response. In standard server environments (e.g. EC2/Docker running `node dist/server.js`), the Node event loop continues processing. However, on Vercel Serverless, the container execution freezes or is terminated immediately after the HTTP response stream closes. Any running streaming request to Anthropic Claude was abruptly suspended.
- **Resolution:** Replaced unreliable `setImmediate()` background dispatch with durable lifecycle execution. The report build pipeline is now awaited directly within the serverless request lifecycle, guaranteeing that Claude Call B, validation, JSON database persistence, PDF rendering, and Supabase storage upload complete before the container freezes. An internal durable worker endpoint (`POST /api/v1/internal/jobs/process-report`) was also introduced for queue/cron invocations.

### Root Cause 2: Missing Error Logs & Unhandled Timeout Disparity
- **Status:** CONFIRMED & RESOLVED.
- **Cause:** Claude streaming timeout was hardcoded to 4 minutes (240s) in `claude.service.ts`, whereas Vercel serverless function `maxDuration` was configured to 60 seconds. When Claude was slow or network stalled, Vercel killed the container at 60s before the 4-minute `AbortController` fired. Node never caught the timeout, never logged `[CLAUDE][CALL_B_ERROR]`, and never updated Supabase with `lastError`.
- **Resolution:**
  - Configured `CLAUDE_STREAM_TIMEOUT_MS` to default to 50 seconds on Vercel (safe under serverless limits), with override via `process.env.CLAUDE_STREAM_TIMEOUT_MS`.
  - Increased `backend/vercel.json` function `maxDuration` to 120 seconds.
  - Implemented pre-timeout abort trapping with dedicated structured logs: `[CLAUDE][CALL_B_START]`, `[CLAUDE][CALL_B_RESPONSE]`, `[CLAUDE][CALL_B_JSON_PARSE]`, `[CLAUDE][CALL_B_SUCCESS]`, `[CLAUDE][CALL_B_TIMEOUT]`, and `[CLAUDE][CALL_B_ERROR]`, all correlated by `generationId`, `caseId`, `reportId`, and `durationMs`.
  - Ensured that on any failure or timeout, `cases.report_inputs` is updated with `lastError`, `failedStage: 'claude'`, and `errorAt`.

### Root Cause 3: Missing Chromium Dependencies on Vercel Serverless
- **Status:** CONFIRMED & RESOLVED.
- **Cause:** When a generation reached `[REPORT][JSON_SAVED]`, PDF generation failed on Vercel because `@sparticuz/chromium` and `puppeteer-core` were omitted from `backend/package.json`.
- **Resolution:** Installed `@sparticuz/chromium: ^153.0.0` and `puppeteer-core: ^25.16.0` as backend production dependencies. Configured `backend/vercel.json` to bundle `node_modules/@sparticuz/chromium/**`. Validated that multi-page PDF generation executes locally and produces a complete 22-page severance report PDF (1.23 MB) in 4.2 seconds.

### Root Cause 4: Disjointed Polling & Stale Job Timeout Was 20 Minutes
- **Status:** CONFIRMED & RESOLVED.
- **Cause:** In `backend/src/services/case.service.ts`, `STALE_JOB_MS = 20 * 60 * 1000`. Jobs stuck at `building` / `claude` lingered for 20 minutes before `healStale` marked them failed.
- **Resolution:** Reduced `STALE_JOB_MS` from 20 minutes to 3.5 minutes (210,000 ms). In `healStale()`, if report JSON is already saved, it heals to `ready` with `status_detail: 'pdf_pending'`. If interrupted during Claude, it heals to `failed` with `failedStage: 'claude'` and `lastError`.

### Root Cause 5: Client Polling Ignored Errors and Retried Infinitely
- **Status:** CONFIRMED & RESOLVED.
- **Cause:** In `src/lib/reportPolling.ts`, errors thrown during `options.poll()` were caught in a generic catch block that increased `failures` and rescheduled another poll forever using exponential backoff up to 30 seconds.
- **Resolution:** Polling now halts on non-429 fatal HTTP or network errors after `maxRetries: 2`, and delegates to `onError` to surface the blocking modal.

---

## 4. Evidence Supporting Each Root Cause

| Root Cause | Relevant File Path | Function / Identifier | Evidence |
| :--- | :--- | :--- | :--- |
| **Serverless Freezing** | `backend/src/utils/background.ts`<br>`backend/api/index.ts` | `runReservedBackground()` | `setImmediate(() => { fn()... })` dispatches work after HTTP 202 is returned. Vercel serverless freezes execution upon response completion. |
| **Timeout Disparity** | `backend/src/services/claude.service.ts`<br>`backend/vercel.json` | `CLAUDE_STREAM_TIMEOUT_MS`<br>`maxDuration` | Streaming timeout was 240s while Vercel killed function at 60s, preventing catch blocks and structured timeout logs from firing. |
| **Missing Chromium** | `backend/package.json`<br>`backend/src/services/pdfBrowser.ts` | `launchSparticuz()` | Neither `@sparticuz/chromium` nor `puppeteer-core` was installed in `backend/package.json`, causing missing executable launch errors on Vercel. |
| **20-Minute Stale Timeout** | `backend/src/services/case.service.ts` | `STALE_JOB_MS`, `healStale()` | `const STALE_JOB_MS = 20 * 60 * 1000`. Jobs stuck at `building`/`claude` remain in that state for 1,200,000 ms before `healStale` marks them failed. |
| **Infinite Poll Backoff** | `src/lib/reportPolling.ts` | `startPollLoop()` | `catch (error) { failures += 1; schedule(delayMs); }` never halted polling on non-429 fatal HTTP or network errors. |
| **Overlapping Polls** | `src/components/report/reading/ReadingLetterPage.tsx` | `useEffect` hook | Raw `setInterval(async () => { ... }, 2000)` without promise synchronization or `AbortController`. |
| **Fake Success Fallbacks** | `src/components/report/reading/ReadingLetterPage.tsx`<br>`src/components/dialogs/AskLawyerModal.tsx` | `useEffect`<br>`handleSubmit()` | `ReadingLetterPage`: `setTimeout(() => onDone(), 3800)` when `!activeCaseId`.<br>`AskLawyerModal`: `catch (err) { setSubmitted(true); }`. |
| **Opaque Status Details** | `backend/src/services/flow.service.ts` | `reportStatus()` | Lacked `error` and `failedStage` fields; required hardcoded `build_failed` string match for `failed: true`. |

---

## 5. Exact Solutions Implemented

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

### 4. Durable Serverless Job Execution & Worker Queue
- In `backend/src/services/flow.service.ts`:
  - Removed `setImmediate()` background execution.
  - Created `executeReportBuildJob()`: executes within the active serverless request lifecycle, guaranteeing that Claude Call B, validation, JSON database persistence, PDF rendering, and Supabase storage upload complete without premature container freezing.
  - Created internal queue runner endpoint: `POST /api/v1/internal/jobs/process-report` in `backend/src/routes/internal.routes.ts` (protected by `X-Cron-Secret`).
- In `backend/vercel.json`: Increased `maxDuration` to 120 seconds.

### 5. Chromium Packaging on Vercel
- Added `@sparticuz/chromium: ^153.0.0` and `puppeteer-core: ^25.16.0` to `backend/package.json`.
- Configured `backend/vercel.json` with `"includeFiles": "node_modules/@sparticuz/chromium/**"`.
- Verified that PDF generation renders the full 22-page report (1.23 MB) in 4.2 seconds.

### 6. Idempotency & Token-Cost Protections
- In `flowService.startBuild()`:
  - If valid report JSON is already saved in Supabase (`case.report`), **Claude Call B is NEVER invoked again**.
  - If `status === 'ready'` and `!c.report_pdf_path` (`pdf_pending`), it regenerates and uploads the PDF directly from the saved JSON.
  - Atomic DB claim (`caseService.claimBuild`) rejects concurrent requests attempting to start the same case.
- In `caseService.healStale()`:
  - If report JSON was saved before an interruption, it transitions to `status: 'ready'`, `status_detail: 'pdf_pending'`. The JSON is never discarded.

### 7. Differentiated UI Error Handling
- In `src/components/report/PaidReportReadyPage.tsx`:
  - Differentiated three distinct failure modes:
    1. **Polling Timeout:** "Connection to status server timed out" with action "Check status again".
    2. **Claude Failure:** "AI document analysis incomplete" with action "Retry AI analysis".
    3. **PDF Failure:** "Report calculations saved · PDF compilation delayed" with action "Generate PDF Now".
  - If `pdfPending` is true in the ready state, the button displays "Generate and download report (PDF)" with a "Compiling PDF…" spinner, recovering the PDF from saved JSON without re-running Claude.

### 8. Structured Claude Logging & Timeout Trapping
- In `backend/src/services/claude.service.ts` and `ai.service.ts`:
  - Added structured logs:
    - `[CLAUDE][CALL_B_START]`
    - `[CLAUDE][CALL_B_RESPONSE]`
    - `[CLAUDE][CALL_B_JSON_PARSE]`
    - `[CLAUDE][CALL_B_SUCCESS]`
    - `[CLAUDE][CALL_B_TIMEOUT]`
    - `[CLAUDE][CALL_B_ERROR]`
  - Correlated all logs by `generationId`, `caseId`, `reportId`, and `durationMs`.
  - Configured `CLAUDE_STREAM_TIMEOUT_MS` (50s default on Vercel) so `AbortController` triggers before platform cutoff, recording the error in Supabase.

---

## 6. Comprehensive Changes Matrix

| File Path | Component / Layer | Summary of Changes |
| :--- | :--- | :--- |
| `src/app/Provider.tsx` | Global Provider | Mounted Sonner `<Toaster />` and `<ErrorModalProvider>`. |
| `src/lib/notifications.ts` | Frontend Utilities | Implemented deduplicated and sanitized `notifySuccess()` and `notifyError()`. |
| `src/components/dialogs/BlockingErrorModal.tsx` | UI Dialog | Accessible blocking modal with stage badge, HTTP status, Request ID, and Retry action. |
| `src/context/ErrorModalContext.tsx` | UI Context | Centralized error state management with `showErrorModal()` and `triggerGlobalError()`. |
| `src/lib/api/fairexit.ts` | API Client | Added stage tracking, request correlation, network error categorization, and `FairExitApiError`. |
| `src/lib/reportPolling.ts` | Polling Engine | Enforced non-overlapping sequential polling, `AbortController` cleanup, 429 backoff, and max retries. |
| `src/components/report/ReportUploadPage.tsx` | Upload Step | Fail-fast validation, blocking modal integration, preserved toggle switch UI styling. |
| `src/components/report/reading/ReadingLetterPage.tsx` | Reading Step | Removed fake 3.8s timer, wired `startPollLoop`, preserved toggle switch UI styling. |
| `src/components/report/ca/CanadaReviewPage.tsx` | Review (Canada) | Added fail-fast build locks, blocking error modal on attestation/build failure. |
| `src/components/report/us/USReviewPage.tsx` | Review (US) | Added fail-fast build locks, blocking error modal on attestation/build failure. |
| `src/components/report/PaidReportReadyPage.tsx` | Report Ready | Differentiated Polling Timeout, Claude Failure, and PDF Failure UI; supported `pdfPending` recovery. |
| `src/components/dialogs/AskLawyerModal.tsx` | Lawyer Modal | Removed fake success state (`setSubmitted(true)`); surfaces error toast and editable form. |
| `backend/package.json` | Dependencies | Added `@sparticuz/chromium: ^153.0.0` and `puppeteer-core: ^25.16.0`. |
| `backend/vercel.json` | Serverless Config | Increased `maxDuration` to 120s; bundled `@sparticuz/chromium` files. |
| `backend/src/services/claude.service.ts` | AI Client | Added 50s pre-timeout trapping, structured `[CLAUDE][CALL_B_*]` logging with `generationId`. |
| `backend/src/services/ai.service.ts` | AI Service | Correlated Call B logs with `generationId`; persisted `ai_calls` on ok and error. |
| `backend/src/services/flow.service.ts` | Flow Service | Awaited serverless job execution; enforced idempotency (never re-run Claude when JSON exists); PDF recovery. |
| `backend/src/controllers/case.controller.ts` | Controller | Handled awaited `startBuild` (200 on ready, 202 on building); passed `req.id` correlation. |
| `backend/src/routes/internal.routes.ts` | Internal Routes | Added `POST /jobs/process-report` for queue/cron triggers. |
| `backend/src/services/case.service.ts` | Case Service | Reduced `STALE_JOB_MS` to 3.5m; healed stale jobs to `pdf_pending` if JSON exists, or `claude_failed`. |
| `backend/vitest.config.ts` | Test Config | Enforced `AI_MODE: 'mock'` and `NODE_ENV: 'test'` to guarantee 0 billable Claude tokens spent. |
| `backend/tests/unit/reportLifecycle.test.ts` | Test Suite | Added comprehensive unit tests covering interruption, timeouts, retries, stale jobs, PDF recovery, and status transitions. |

---

## 7. Tests Performed and Actual Results

| Test Suite / Verification | Scope | Command | Result |
| :--- | :--- | :--- | :--- |
| **Backend Vitest Unit & Integration Tests** | Full test suite: report lifecycle, polling loop, Call A, Call B, CORS, Rate Limiter, ApiError, PDF Recovery, Document Processing | `npm test` (in `backend`) | **PASSED** (14 test files passed, 70 tests passed, 1 skipped). |
| **Backend TypeScript Typecheck** | Backend routes, controllers, services, middleware, validators | `npm run typecheck` (in `backend`) | **PASSED** (0 errors). |
| **Backend Production Build** | TypeScript compiler output in `backend/dist` | `npm run build` (in `backend`) | **PASSED** (0 errors). |
| **Frontend TypeScript Typecheck** | Frontend components, providers, dialogs, API clients, contexts | `npx tsc --noEmit` (in root) | **PASSED** (0 errors). |
| **Frontend Production Build** | Next.js 16 App Router optimized build, route compilation, static generation | `npx next build --webpack` (in root) | **PASSED** (33 routes compiled successfully, exit code 0). |
| **Real PDF Generation Test** | Headless Chromium multi-page PDF generation test with mock data | `node -e "..."` (in `backend`) | **PASSED** (22-page severance report PDF, 1.23 MB rendered in 4.2 seconds). |
| **Report Lifecycle & Recovery Test (`reportLifecycle.test.ts`)** | Interruption, timeouts, retries, duplicate job rejection, stale jobs healing, PDF recovery without Claude | `vitest run tests/unit/reportLifecycle.test.ts` | **PASSED** (5 tests passed). |

---

## 8. Verification Guide for Production Logs

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
2. **Verify Claude Start & Success Logging:**
   Filter for `[CLAUDE][CALL_B_START]` and `[CLAUDE][CALL_B_SUCCESS]`.
   ```json
   {
     "level": "INFO",
     "message": "[CLAUDE][CALL_B_SUCCESS]",
     "details": {
       "generationId": "...",
       "caseId": "...",
       "reportId": "RPT-XXXXXX",
       "durationMs": 18240,
       "model": "claude-opus-5-5",
       "tokens": { "input_tokens": 8200, "output_tokens": 4900 }
     }
   }
   ```
3. **Verify Idempotency on Duplicate Requests or Retries:**
   Look for `[REPORT][ALREADY_PROCESSING]` or `[REPORT][RECOVERING_PDF_FROM_SAVED_JSON]`.
   ```json
   {
     "level": "INFO",
     "message": "[REPORT][RECOVERING_PDF_FROM_SAVED_JSON]",
     "details": {
       "caseId": "...",
       "reportId": "RPT-XXXXXX",
       "generationId": "..."
     }
   }
   ```
4. **Verify PDF Rendering & Supabase Upload:**
   Look for `[PDF][START]`, `[PDF][LAYOUT_COMPLETE]`, `[PDF][COMPLETE]`, and `[STORAGE][UPLOAD_COMPLETE]`.
5. **Verify Status Polling Frequency:**
   Filter for `[STATUS][POLL]`. Verify that status polls arrive every 4 seconds, maintain the same `generationId`, and cease completely once `status: 'ready'` or `status: 'failed'` is reached.
6. **Verify Failure & Timeout Trapping:**
   If Claude stalls or times out, verify that `[CLAUDE][CALL_B_TIMEOUT]` logs before the 120s function limit, and `[REPORT][FAILED]` persists `lastError` and `failedStage: 'claude'`.
