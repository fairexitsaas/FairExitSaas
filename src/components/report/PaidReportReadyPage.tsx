"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { getReportInputs, ReportInputs } from "@/lib/report-storage";
import AskLawyerModal from "@/components/dialogs/AskLawyerModal";
import { fairexit, caseStore, FairExitApiError } from "@/lib/api/fairexit";
import { startPollLoop } from "@/lib/reportPolling";

interface PaidReportReadyPageProps {
  caseId?: string | null;
  cs?: {
    id?: string;
    email?: string;
    country?: string;
    status?: string;
    report?: { reportId?: string } | null;
    jurisdiction?: { name?: string } | null;
    answers?: Record<string, unknown>;
    [key: string]: unknown;
  } | null;
  onLawyer?: () => void;
  onDownload?: () => void;
  onDone?: () => void;
}

export default function PaidReportReadyPage({
  caseId,
  cs,
  onLawyer,
  onDownload,
  onDone,
}: PaidReportReadyPageProps) {
  const [data] = useState<ReportInputs>(() => getReportInputs());
  const [explainQuestions, setExplainQuestions] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lawyerModalOpen, setLawyerModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  // Build state: 'building' | 'ready' | 'failed'
  const isInitiallyReady = cs?.status === "ready" && !!cs?.report;
  const [buildStatus, setBuildStatus] = useState<"building" | "ready" | "failed">(
    isInitiallyReady ? "ready" : "building"
  );
  const [buildError, setBuildError] = useState<string>("");
  const [buildProgressStep, setBuildProgressStep] = useState<number>(2);
  const [pollVersion, setPollVersion] = useState(0);
  const retryLock = useRef(false);

  const activeId = caseId || cs?.id;
  // Poll only the report status endpoint while a build is active.
  useEffect(() => {
    if (!activeId) return;

    const stopPolling = startPollLoop({
      poll: (signal) => fairexit.reportStatus(activeId, signal),
      intervalMs: 4000,
      maxBackoffMs: 30000,
      isTerminal: (res) => res.status !== "building",
      onValue: (res) => {
        if (res.ready) {
          setBuildStatus("ready");
          onDone?.();
        } else if (res.failed) {
          setBuildStatus("failed");
          setBuildError(res.statusDetail === "build_failed"
            ? "The AI analysis could not be completed for these documents. Please try again."
            : "Report generation failed.");
        } else if (res.status === "building") {
          setBuildStatus("building");
        } else {
          setBuildStatus("failed");
          setBuildError("The report build has not started. Return to the review step and select Build my report.");
        }
      },
      onError: (error, retryInMs) => {
        if (error instanceof FairExitApiError && error.status === 429) {
          console.warn(`Report status limited; retrying in ${retryInMs}ms`);
        } else {
          console.warn(`Report status check failed; retrying in ${retryInMs}ms`, error);
        }
      },
    });

    // Minor step progress animation for user feedback
    const stepTimer = setTimeout(() => {
      setBuildProgressStep(3);
    }, 4500);

    return () => {
      stopPolling();
      clearTimeout(stepTimer);
    };
  }, [activeId, onDone, pollVersion]);

  const handleRetryBuild = async () => {
    if (!activeId || retryLock.current) return;
    retryLock.current = true;
    setBuildStatus("building");
    setBuildError("");
    setBuildProgressStep(2);
    try {
      await fairexit.attest(activeId).catch(() => {});
      await fairexit.buildReport(activeId);
      setPollVersion((version) => version + 1);
    } catch (e) {
      console.error("Retry build error:", e);
      setBuildStatus("failed");
      setBuildError(e instanceof Error ? e.message : "Report generation could not be started.");
      retryLock.current = false;
    }
  };

  const isCanada = cs?.country ? cs.country === "CA" : data.country !== "US";
  const answers = (cs?.answers as Record<string, unknown>) || {};
  const userEmail = cs?.email || data.email || "alex@example.com";
  const priceCurrency = isCanada ? "$59 CAD" : "$59 USD";

  // Sidebar detail values (dynamically resolved from answers, props, then storage)
  const provinceOrState =
    answers.provinceName ||
    answers.province ||
    answers.state ||
    answers.stateName ||
    cs?.jurisdiction?.name ||
    (isCanada ? data.provinceName || "Ontario" : data.state || "California");

  const ageVal = String(answers.age !== undefined && answers.age !== null ? answers.age : (data.age || 52));
  const yearsVal = answers.years !== undefined && answers.years !== null
    ? `${answers.years} yrs`
    : `${data.years || 14} yrs`;

  const rawSalary = Number(answers.salary ?? answers.pay ?? data.salary ?? 110000);
  const salaryVal = `$${rawSalary >= 1000 ? `${Math.round(rawSalary / 1000)}k` : rawSalary}/yr`;

  const roleVal = answers.role || data.role || "Middle management / Senior / Director";

  const rawOffer = Number(answers.offer ?? data.offer ?? 24000);
  const offerVal = `$${rawOffer >= 1000 ? `${Math.round(rawOffer / 1000)}k` : rawOffer}`;

  const handleDownload = async () => {
    if (onDownload) {
      onDownload();
      return;
    }
    if (!activeId) {
      window.print();
      return;
    }
    setIsDownloading(true);
    setDownloadError("");
    try {
      const token = caseStore.get(activeId) || "";
      const response = await fetch(fairexit.reportPdfUrl(activeId, token), { cache: "no-store" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || `Could not download the PDF (${response.status}). Please try again.`);
      }
      const objectUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `FairExit-Severance-Report-${cs?.report?.reportId || "report"}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : "PDF generation failed. Your saved report is safe; please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleTalkToLawyer = () => {
    setLawyerModalOpen(true);
    if (onLawyer) {
      onLawyer();
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F4EF] text-[#17242F] font-sans antialiased selection:bg-[#0EB28D]/20 pb-20">
      {/* ── Top Header Navigation ── */}
      <header className="w-full bg-[#F6F4EF]/92 backdrop-blur-md border-b border-[#E7E4DD] px-4 lg:px-[40px] h-[51px] sm:h-[57px] flex items-center sticky top-0 z-40">
        <div className="w-full max-w-[1200px] mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center group">
            <Image
              src="/fairexitlogo.png"
              alt="FairExit"
              width={103}
              height={26}
              className="h-[25.97px] w-auto object-contain"
              priority
            />
          </Link>

          <nav className="hidden md:flex items-center gap-[22px] text-[13.5px] font-[600] text-[#5A6B78]">
            <Link href="/how-it-works" className="hover:text-[#062C55] transition">How it works</Link>
            <Link href="/pricing" className="hover:text-[#062C55] transition">Pricing</Link>
            <Link href="/faq" className="hover:text-[#062C55] transition">FAQ</Link>
            <Link href="/blog" className="hover:text-[#062C55] transition">Blog</Link>
            <Link href="/about" className="hover:text-[#062C55] transition">About</Link>
            <Link href="/app" className="text-[#0C8F72] font-[700] text-[12.5px] hover:underline">Get the app</Link>
            <Link href="/" className="text-[#5A6B78] hover:text-[#062C55] transition underline text-[13px] font-[600]">Exit ✕</Link>
          </nav>

          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-[36px] h-[36px] flex items-center justify-center rounded-[10px] border border-[#E7E4DD] bg-white text-[#062C55]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>
      </header>

      {/* ── Main Container (1200px) ── */}
      <div className="w-full max-w-[1200px] mx-auto px-4 lg:px-[40px] pt-6 sm:pt-8">
        {/* ── Stepper Navigation ── */}
        <div className="w-full max-w-[714px]">
          {/* Stepper circles */}
          <div className="relative flex items-center justify-between pb-3">
            {[
              { label: "Eligible", done: true },
              { label: "Basics", done: true },
              { label: "Money", done: true },
              { label: "Key questions", done: true },
              { label: "Details", done: true },
              { label: "Your results", active: true },
            ].map((st, i) => (
              <div key={i} className="relative z-10 flex flex-col items-center">
                {st.active ? (
                  <div className="w-[29.5px] h-[29.5px] rounded-full border-[4px] border-[#062C55]/10 flex items-center justify-center">
                    <div className="w-[21.5px] h-[21.5px] rounded-full bg-[#062C55] text-white flex items-center justify-center text-[10px] font-extrabold">
                      ★
                    </div>
                  </div>
                ) : (
                  <div className="w-[18px] h-[18px] rounded-full bg-[#0EB28D] text-white border border-[#0EB28D] flex items-center justify-center text-[10px] font-extrabold">
                    ✓
                  </div>
                )}
                {/* On mobile, "Your results" is stacked "Your" then "results" as in Figma */}
                <div className="mt-1.5 text-center">
                  {st.active ? (
                    <>
                      <span className="hidden sm:inline font-sans font-[800] text-[11px] leading-[17px] text-[#062C55]">
                        Your results
                      </span>
                      <span className="sm:hidden block font-sans font-[800] text-[10.5px] leading-[14px] text-[#062C55]">
                        Your<br />results
                      </span>
                    </>
                  ) : (
                    <span className="font-sans font-[600] text-[11px] leading-[17px] text-[#0C8F72]">
                      {st.label}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Stepper full gradient line with glowing green dot at end */}
          <div className="relative w-full h-[6px] bg-[#E9E5DC] rounded-[3px] mt-1 mb-3">
            <div className="h-full w-full bg-gradient-to-r from-[#0C8F72] to-[#0EB28D] rounded-[3px]" />

            {/* Glowing endpoint dot */}
            <div className="absolute right-[-1px] top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
              <div className="w-[30px] h-[30px] rounded-full border-[8px] border-[#0EB28D]/10 flex items-center justify-center">
                <div className="w-[22px] h-[22px] rounded-full border-[4px] border-[#0EB28D]/20 flex items-center justify-center">
                  <div className="w-[14px] h-[14px] rounded-full bg-[#0EB28D]" />
                </div>
              </div>
            </div>
          </div>

          {/* Stepper sub-bar: step indicator & toggle */}
          <div className="flex items-center justify-between text-[12px] pb-4">
            <span className="font-sans font-[700] text-[12px] leading-[18px] text-[#5A6B78]">
              {buildStatus === "ready" ? "Your Severance Report" : "Step 4 of 4 · Building your report"}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-sans font-[700] text-[12px] leading-[18px] text-[#0C8F72]">
                Explain each question
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={explainQuestions}
                onClick={() => setExplainQuestions(!explainQuestions)}
                className={`w-[36px] h-[20px] rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer ${
                  explainQuestions ? "bg-[#0EB28D]" : "bg-[#D8D3C8]"
                }`}
              >
                <div
                  className={`w-[16px] h-[16px] rounded-full bg-white shadow-xs transition-transform ${
                    explainQuestions ? "translate-x-[16px]" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* ── Two-Column Layout (Left Card 714px + Right Sidebar 300px) ── */}
        <div className="flex flex-col lg:flex-row items-start gap-6 lg:gap-[26px] mt-2">
          {/* ══════════════════════════════════════════════════
              LEFT CARD: Report Ready vs Building vs Failed
             ══════════════════════════════════════════════════ */}
          <div className="w-full lg:w-[714px] bg-white border border-[#E7E4DD] rounded-[12px] shadow-[0px_18px_40px_-18px_rgba(5,43,84,0.12)] p-6 sm:p-10 flex flex-col items-center justify-center text-center min-h-[340px]">
            {buildStatus === "ready" ? (
              <>
                {/* Pill: Paid · $59 CAD · receipt emailed */}
                <div className="inline-flex items-center justify-center px-4 py-1 bg-white border border-[#E7E4DD] rounded-[6px] text-[12px] font-sans font-[700] text-[#062C55] mb-5 sm:mb-6">
                  Paid · {priceCurrency} · receipt emailed
                </div>

                {/* Title */}
                <h1 className="font-serif font-[500] text-[22px] sm:text-[24px] leading-[27px] tracking-[-0.5px] text-[#062C55] mb-6 sm:mb-7">
                  Your Severance Report is ready.
                </h1>

                {/* Primary Action: Download my report (PDF) - ONLY shown when report is ready! */}
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="w-full sm:w-[380px] h-[54px] rounded-[12px] bg-[#0EB28D] hover:bg-[#0C8F72] text-white font-sans font-[700] text-[17px] leading-[24px] shadow-[0px_18px_40px_-18px_rgba(5,43,84,0.12)] transition flex items-center justify-center cursor-pointer mb-3"
                >
                  {isDownloading ? (
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Opening PDF…</span>
                    </div>
                  ) : (
                    "Download my report (PDF)"
                  )}
                </button>
                {downloadError && <p role="alert" className="w-full sm:w-[380px] mb-3 text-left text-[13px] text-[#A3231F]">{downloadError}</p>}

                {/* Secondary Action: Talk to a lawyer, free */}
                <button
                  type="button"
                  onClick={handleTalkToLawyer}
                  className="w-full sm:w-[380px] h-[53px] rounded-[12px] bg-white hover:bg-[#FAF9F5] border border-[#CFD8DF] text-[#062C55] font-sans font-[700] text-[16px] leading-[22px] transition flex items-center justify-center cursor-pointer mb-5 sm:mb-6"
                >
                  Talk to a lawyer, free
                </button>

                {/* Email note */}
                <p className="font-sans font-[400] text-[14px] leading-[22px] text-[#5A6B78]">
                  We also emailed it to{" "}
                  <strong className="font-[700] text-[#5A6B78]">{userEmail}</strong>.
                </p>
              </>
            ) : buildStatus === "building" ? (
              <div className="w-full max-w-[540px] flex flex-col items-center">
                {/* Step badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-[#EEF8F3] border border-[#C7E6D6] rounded-full text-[12px] font-sans font-[700] text-[#0C8F72] mb-4">
                  <span className="w-2 h-2 rounded-full bg-[#0EB28D] animate-ping" />
                  <span>STEP 4 OF 4 · BUILDING YOUR REPORT</span>
                </div>

                {/* Title */}
                <h2 className="font-serif font-[600] text-[23px] sm:text-[25px] leading-[32px] text-[#062C55] mb-2 text-center">
                  Compiling your personalized severance report…
                </h2>
                <p className="font-sans text-[13.5px] leading-[21px] text-[#5A6B78] mb-6 text-center">
                  Claude AI is evaluating your confirmed severance details against relevant employment standards, common law precedents, and benchmark ranges.
                </p>

                {/* Animated progress bar */}
                <div className="w-full h-[6px] bg-[#E7E4DD] rounded-full overflow-hidden mb-6 relative">
                  <div
                    className="h-full bg-gradient-to-r from-[#0C8F72] via-[#0EB28D] to-[#12C79A] rounded-full transition-all duration-700 animate-pulse"
                    style={{ width: buildProgressStep >= 3 ? "85%" : "45%" }}
                  />
                </div>

                {/* Build stage items */}
                <div className="w-full space-y-3 mb-6 text-left">
                  <div className="flex items-center gap-3 p-3 rounded-[10px] bg-[#FAF9F5] border border-[#E7E4DD]">
                    <span className="w-6 h-6 rounded-full bg-[#0EB28D] text-white flex items-center justify-center text-xs font-bold shrink-0">
                      ✓
                    </span>
                    <span className="font-sans text-[13.5px] font-[600] text-[#062C55]">
                      Confirmed facts and document clauses verified
                    </span>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-[10px] bg-[#FAF9F5] border border-[#E7E4DD]">
                    <span className="w-6 h-6 rounded-full border-2 border-[#0EB28D] border-t-transparent animate-spin shrink-0" />
                    <span className="font-sans text-[13.5px] font-[600] text-[#062C55]">
                      Claude AI legal entitlements &amp; range calculation
                    </span>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-[10px] bg-[#FAF9F5] border border-[#E7E4DD]">
                    <span className="w-6 h-6 rounded-full border-2 border-[#D8D3C8] flex items-center justify-center text-[10px] text-[#5A6B78] shrink-0">
                      3
                    </span>
                    <span className="font-sans text-[13.5px] font-[500] text-[#5A6B78]">
                      Playwright PDF compilation &amp; secure delivery
                    </span>
                  </div>
                </div>

                {/* Reassurance text */}
                <p className="font-sans text-[12.5px] text-[#5A6B78] text-center">
                  This takes about 15–30 seconds. Please do not refresh; your report and download button will appear here automatically.
                </p>
              </div>
            ) : (
              /* Failed State */
              <div className="w-full max-w-[480px] flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-[#FBECEB] border border-[#F5C2C0] flex items-center justify-center text-[#D42E2B] text-xl font-bold mb-3">
                  !
                </div>
                <h3 className="font-serif font-[600] text-[20px] text-[#062C55] mb-2">
                  We couldn&apos;t build your report
                </h3>
                <p className="font-sans text-[13.5px] text-[#5A6B78] leading-[21px] mb-5">
                  {buildError || "An error occurred while compiling your report. Your confirmed answers are safely saved."}
                </p>
                <button
                  type="button"
                  onClick={handleRetryBuild}
                  className="px-6 h-[44px] rounded-[10px] bg-[#0EB28D] hover:bg-[#0C8F72] text-white font-sans font-[700] text-[15px] transition cursor-pointer"
                >
                  Try again
                </button>
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════
              RIGHT SIDEBAR: FairExit summary (300px, desktop)
             ══════════════════════════════════════════════════ */}
          <aside className="hidden lg:block w-[300px] shrink-0 bg-[#EEF1F4] border border-[#DDE3E9] rounded-[12px] p-5 shadow-xs">
            {/* Header */}
            <span className="font-sans font-[800] text-[11px] leading-[17px] tracking-[0.5px] uppercase text-[#5A6B78] block">
              YOUR DETAILS SO FAR
            </span>
            <h2 className="font-serif font-[400] text-[16px] leading-[25px] text-[#062C55] mt-1 mb-3">
              FairExit summary
            </h2>

            {/* Detail Rows */}
            <div className="space-y-0 text-[13px] leading-[20px]">
              {[
                { label: "Union member", value: data.union || "No" },
                { label: "Employment", value: data.employment || "Regular employee" },
                { label: isCanada ? "Province" : "State", value: provinceOrState },
                { label: "Age", value: ageVal },
                { label: "Years of service", value: yearsVal },
                { label: "Pay", value: salaryVal },
                { label: "Occupation", value: roleVal },
                { label: "Employer payroll ≥ $2.5M", value: data.payroll || "Not sure" },
                { label: "Other pay", value: data.otherPay || "None" },
                { label: "New job yet?", value: data.newJob || "Not yet" },
                { label: "Min-only clause", value: data.minClause || "No" },
                { label: "Contract", value: data.contract || "Signed · role changed" },
                { label: "How it ended", value: data.howEnded || "Laid off" },
                { label: "Similar jobs nearby", value: data.market || "Some" },
                { label: "Anything flagged", value: data.flagged || "Nothing unusual" },
                { label: "Offer", value: offerVal },
              ].map((row, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-[7px] border-b border-[#D3DAE1]"
                >
                  <span className="font-sans font-[400] text-[#5A6B78] truncate pr-2">
                    {row.label}
                  </span>
                  <span className="font-sans font-[700] text-[#062C55] text-right truncate">
                    {String(row.value)}
                  </span>
                </div>
              ))}
            </div>

            {/* Live Estimate Card */}
            <div className="pt-3.5">
              <span className="font-sans font-[800] text-[10.5px] leading-[16px] tracking-[0.5px] uppercase text-[#5A6B78] block">
                LIVE ESTIMATE · NOT WHAT YOU&apos;RE OWED
              </span>
              <div className="font-serif font-[600] text-[20px] leading-[23px] text-[#0C8F72] mt-1 mb-1">
                ${Math.round(Number(data.statutoryMin || 17000) / 1000)}k – ${Math.round(Number(data.courtAwardHigh || 193000) / 1000)}k
              </div>
              <div className="font-sans font-[400] text-[11.5px] leading-[16px] text-[#5A6B78]">
                {data.noticeWeeks || 8} wks notice · court-awarded {data.courtMonths || "15–21 mo"}
              </div>
              <div className="font-sans text-[11.5px] leading-[16px] text-[#5A6B78] mt-0.5">
                <span className="font-[700]">Your offer {offerVal}</span>
                <span className="font-[400]"> — near the floor</span>
              </div>

              {/* Enough badge */}
              <div className="bg-[#E5F5EE] border border-[#C7E6D6] rounded-[9px] h-[36.5px] flex items-center px-3 gap-1.5 mt-3">
                <span className="font-sans font-[700] text-[12px] leading-[18px] text-[#0C8F72]">
                  ✓ Enough to show your results
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ── Ask Lawyer Modal ── */}
      <AskLawyerModal
        isOpen={lawyerModalOpen}
        onClose={() => setLawyerModalOpen(false)}
        country={isCanada ? "CA" : "US"}
        regionName={String(provinceOrState)}
        caseId={caseId || cs?.id}
      />
    </div>
  );
}
