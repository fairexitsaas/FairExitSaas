import { Suspense } from "react";
import ReportFlow from "./ReportFlow";

export const metadata = {
  title: "Your Severance Report · FairExit",
  robots: { index: false, follow: false },
};

/**
 * Paid flow after the free check: pay -> upload -> reading -> check -> building -> ready.
 * URL: /report?case=<caseId>  (email links add &t=<caseToken>; Stripe adds &session_id=...)
 */
export default function ReportPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f6f4ef]" />}>
      <ReportFlow />
    </Suspense>
  );
}
