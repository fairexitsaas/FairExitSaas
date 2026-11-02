"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getReportInputs, ReportInputs } from "@/lib/report-storage";
import AskLawyerModal from "@/components/dialogs/AskLawyerModal";
import { fairexit, caseStore } from "@/lib/api/fairexit";

interface PaidReportReadyPageProps {
  caseId?: string | null;
  cs?: {
    id?: string;
    email?: string;
    country?: string;
    jurisdiction?: { name?: string };
    [key: string]: unknown;
  } | null;
  onLawyer?: () => void;
  onDownload?: () => void;
}

export default function PaidReportReadyPage({
  caseId,
  cs,
  onLawyer,
  onDownload,
}: PaidReportReadyPageProps) {
  const [data] = useState<ReportInputs>(() => getReportInputs());
  const [explainQuestions, setExplainQuestions] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lawyerModalOpen, setLawyerModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const isCanada = cs?.country ? cs.country === "CA" : data.country !== "US";
  const userEmail = cs?.email || data.email || "alex@example.com";
  const priceCurrency = isCanada ? "$59 CAD" : "$59 USD";

  // Sidebar detail values (combining props and stored inputs with Figma defaults)
  const provinceOrState =
    (isCanada ? data.provinceName || "Ontario" : data.state || "California");
  const ageVal = String(data.age || 52);
  const yearsVal = `${data.years || 14} yrs`;
  const salaryVal = `$${Number(data.salary || 110000) >= 1000 ? `${Math.round(Number(data.salary || 110000) / 1000)}k` : data.salary}/yr`;
  const roleVal = data.role || "Middle management / Senior / Director";
  const offerVal = `$${Number(data.offer || 24000) >= 1000 ? `${Math.round(Number(data.offer || 24000) / 1000)}k` : data.offer}`;

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
      return;
    }
    setIsDownloading(true);
    try {
      const activeId = caseId || cs?.id;
      if (activeId) {
        const token = caseStore.get(activeId) || "";
        const url = fairexit.reportPdfUrl(activeId, token);
        window.open(url, "_blank");
      } else {
        // Fallback for mock preview
        window.print();
      }
    } catch (e) {
      console.error("PDF download failed", e);
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
              Your Severance Report
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
              LEFT CARD: Your Severance Report is ready (714px)
             ══════════════════════════════════════════════════ */}
          <div className="w-full lg:w-[714px] bg-white border border-[#E7E4DD] rounded-[12px] shadow-[0px_18px_40px_-18px_rgba(5,43,84,0.12)] p-6 sm:p-10 flex flex-col items-center justify-center text-center min-h-[308px] sm:min-h-[340px]">
            {/* Pill: Paid · $59 CAD · receipt emailed */}
            <div className="inline-flex items-center justify-center px-4 py-1 bg-white border border-[#E7E4DD] rounded-[6px] text-[12px] font-sans font-[700] text-[#062C55] mb-5 sm:mb-6">
              Paid · {priceCurrency} · receipt emailed
            </div>

            {/* Title */}
            <h1 className="font-serif font-[500] text-[22px] sm:text-[24px] leading-[27px] tracking-[-0.5px] text-[#062C55] mb-6 sm:mb-7">
              Your Severance Report is ready.
            </h1>

            {/* Primary Action: Download my report (PDF) */}
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full sm:w-[380px] h-[54px] rounded-[12px] bg-[#0EB28D] hover:bg-[#0C8F72] text-white font-sans font-[700] text-[17px] leading-[24px] shadow-[0px_18px_40px_-18px_rgba(5,43,84,0.12)] transition flex items-center justify-center cursor-pointer mb-3"
            >
              {isDownloading ? "Downloading…" : "Download my report (PDF)"}
            </button>

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
                    {row.value}
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
        regionName={provinceOrState}
        caseId={caseId || cs?.id}
      />
    </div>
  );
}
