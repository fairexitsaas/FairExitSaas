"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { triggerGetApp } from "@/context/GetAppContext";
import Image from "next/image";
import { getReportInputs, saveReportInputs, ReportInputs } from "@/lib/report-storage";
import { fairexit, FairExitApiError } from "@/lib/api/fairexit";
import { startPollLoop } from "@/lib/reportPolling";
import { useErrorModal } from "@/context/ErrorModalContext";
import { notifySuccess, notifyError } from "@/lib/notifications";

interface ReadingLetterPageProps {
  caseId?: string | null;
  cs?: { id?: string; country?: string; [key: string]: unknown } | null;
  onDone?: () => void;
}

function formatDollars(val: number | string | undefined, defaultVal = 0): string {
  const num = typeof val === "number" ? val : parseFloat(String(val || defaultVal).replace(/[^0-9.-]/g, "")) || defaultVal;
  if (num >= 1000) {
    const k = Math.round(num / 1000);
    return `$${k}k`;
  }
  return `$${num.toLocaleString()}`;
}

export default function ReadingLetterPage({
  caseId,
  cs,
  onDone,
}: ReadingLetterPageProps) {
  const { showErrorModal } = useErrorModal();
  const [data] = useState<ReportInputs>(() => getReportInputs());
  const [explainEach, setExplainEach] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isUS =
    data.country === "US" ||
    cs?.country === "US" ||
    (typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("country")?.toUpperCase() ===
        "US");
  const isCanada = !isUS;

  // Stepper labels based on country
  const stepLabels = isUS
    ? ["Situation", "The layoff", "The papers", "Key question", "Details"]
    : ["Eligible", "Basics", "Money", "Key questions", "Details"];

  // Formatted sidebar values
  const payFormatted = data.salary
    ? typeof data.salary === "number"
      ? `$${Math.round(data.salary / 1000)}k/yr`
      : String(data.salary)
    : "$110k/yr";

  const hasOffer = typeof data.offer === "number" ? data.offer > 0 : Boolean(data.offer && data.offer !== "—");
  const offerFormatted = hasOffer ? formatDollars(data.offer) : "From your documents";
  const minFormatted = formatDollars(data.statutoryMin, 17000);
  const courtHighFormatted = formatDollars(data.courtAwardHigh, 193000);

  const [readState, setReadState] = useState<{ done: boolean; failed: boolean; error?: string }>({ done: false, failed: false });
  const [retrying, setRetrying] = useState(false);
  const [pollVersion, setPollVersion] = useState(0);

  // Poll backend status using startPollLoop (single loop, non-overlapping, abortable)
  useEffect(() => {
    const activeCaseId = caseId || cs?.id;
    if (!activeCaseId) {
      showErrorModal({
        title: "Case Not Found",
        message: "No case identifier was found. Please return to the upload step and add your documents.",
        stage: "Document Reading",
      });
      setReadState({ done: false, failed: true, error: "Case identifier missing" });
      return;
    }

    const stopPolling = startPollLoop({
      poll: (signal) => fairexit.readStatus(activeCaseId, signal),
      intervalMs: 3000,
      maxRetries: 2,
      isTerminal: (res) => res.done || res.failed,
      onValue: (res) => {
        if (res.done) {
          setReadState({ done: true, failed: false });
          notifySuccess("Documents read and analyzed successfully!");

          // Change 23: Sync extracted facts to persistent storage
          fairexit
            .getExtractedFacts(activeCaseId)
            .then((factsRes) => {
              const facts = factsRes?.facts || [];
              const fOffer = facts.find((f: any) => f.key === "offer_amount");
              const fSignBy = facts.find((f: any) => f.key === "sign_by");
              const fDays = facts.find((f: any) => f.key === "days_to_decide");
              const fRelease = facts.find((f: any) => f.key === "release_required");
              const fName = facts.find((f: any) => f.key === "employee_name");
              const fEmployer = facts.find((f: any) => f.key === "employer_name");

              let extractedSignBy: string | undefined = undefined;
              if (fSignBy?.value) {
                extractedSignBy = String(fSignBy.value);
              } else if (fDays?.value) {
                extractedSignBy = `${fDays.value} days to decide`;
              }

              const updates: Partial<ReportInputs> = {
                documentsExtracted: true,
                extractionStatus: "success",
                documentOfferFound: Boolean(fOffer?.value),
                documentReleaseFound: Boolean(fRelease?.value),
                documentSignByFound: Boolean(extractedSignBy),
              };

              if (fOffer?.value) {
                const num =
                  typeof fOffer.value === "number"
                    ? fOffer.value
                    : parseFloat(String(fOffer.value).replace(/[^0-9.]/g, ""));
                if (num > 0) {
                  updates.offer = num;
                  updates.offerSource = "document";
                }
              }
              if (extractedSignBy) {
                updates.signByDays = extractedSignBy;
                updates.signBySource = "document";
              }
              if (fRelease?.value) {
                updates.releaseRequired = String(fRelease.value);
                updates.releaseRequiredSource = "document";
              }
              if (fDays?.value) {
                updates.daysToDecide = fDays.value as number | string;
              }
              if (fName?.value) updates.employee_name = String(fName.value);
              if (fEmployer?.value) updates.employer_name = String(fEmployer.value);

              saveReportInputs(updates);
            })
            .catch((err) => {
              console.warn("Could not sync extracted facts", err);
            })
            .finally(() => {
              if (onDone) onDone();
            });
        } else if (res.failed) {
          saveReportInputs({
            documentsExtracted: false,
            extractionStatus: "failed",
            documentOfferFound: false,
            documentReleaseFound: false,
            documentSignByFound: false,
            signByDays: undefined,
            releaseRequired: undefined,
            ...(data.offerSource === "document" ? { offer: undefined } : {}),
          });
          const msg = res.error || res.statusDetail || "Scanner could not read documents. Please ensure clear, readable pages.";
          setReadState({ done: false, failed: true, error: msg });
          showErrorModal({
            title: "Document Reading Failed",
            message: msg,
            stage: "Document Reading",
            onRetry: handleRetry,
            retryLabel: "Retry Reading",
          });
        }
      },
      onError: (error) => {
        const apiErr =
          error instanceof FairExitApiError
            ? error
            : new FairExitApiError(0, error instanceof Error ? error.message : "Document reading status check failed");
        setReadState({ done: false, failed: true, error: apiErr.message });
        showErrorModal({
          title: "Document Reading Check Failed",
          message: apiErr.message,
          stage: "Document Reading Status",
          statusCode: apiErr.status,
          requestId: apiErr.requestId,
          onRetry: handleRetry,
          retryLabel: "Retry Checking",
        });
      },
    });

    return () => {
      stopPolling();
    };
  }, [caseId, cs?.id, onDone, pollVersion, showErrorModal]);

  const handleRetry = async () => {
    const activeCaseId = caseId || cs?.id;
    if (!activeCaseId) return;
    setRetrying(true);
    setReadState({ done: false, failed: false });
    try {
      await fairexit.startRead(activeCaseId);
      setPollVersion((v) => v + 1);
    } catch (e: unknown) {
      const apiErr =
        e instanceof FairExitApiError
          ? e
          : new FairExitApiError(0, e instanceof Error ? e.message : "Retry failed");
      setReadState({ done: false, failed: true, error: apiErr.message });
      showErrorModal({
        title: "Could Not Restart Reading",
        message: apiErr.message,
        stage: "Document Reading",
        statusCode: apiErr.status,
        requestId: apiErr.requestId,
        onRetry: handleRetry,
        retryLabel: "Try Again",
      });
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F4EF] text-[#17242F] font-sans antialiased selection:bg-[#0EB28D]/20">
      {/* ── Top Header Navigation ── */}
      <header className="w-full bg-[#F6F4EF]/92 backdrop-blur-md border-b border-[#E7E4DD] px-4 lg:px-[40px] h-[51px] flex items-center">
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

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-[22px] text-[13.5px] font-[600] text-[#5A6B78]">
            <Link href="/#how" className="hover:text-[#062C55] transition">
              How it works
            </Link>
            <Link href="/#paths" className="hover:text-[#062C55] transition">
              Pricing
            </Link>
            <Link href="/faq" className="hover:text-[#062C55] transition">
              FAQ
            </Link>
            <Link href="/blog" className="hover:text-[#062C55] transition">
              Blog
            </Link>
            <Link href="/about" className="hover:text-[#062C55] transition">
              About
            </Link>
            <button
              type="button"
              onClick={() => triggerGetApp()}
              className="text-[#0C8F72] font-[700] text-[12.5px] hover:underline"
            >
              Get the app
            </button>
            <Link
              href="/"
              className="text-[#5A6B78] hover:text-[#062C55] transition underline text-[13px] font-[600]"
            >
              Exit ✕
            </Link>
          </nav>

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-[36px] h-[36px] flex items-center justify-center rounded-[10px] border border-[#E7E4DD] bg-white text-[#062C55]"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={
                  mobileMenuOpen
                    ? "M6 18L18 6M6 6l12 12"
                    : "M4 6h16M4 12h16M4 18h16"
                }
              />
            </svg>
          </button>
        </div>
      </header>

      {/* ── Stepper Header ── */}
      <section className="w-full max-w-[1200px] mx-auto px-4 lg:px-[80px] pt-[26px]">
        {/* Desktop Stepper */}
        <div className="hidden lg:block w-[714px]">
          {/* Stepper Steps (6 steps: 5 checks + 1 active) */}
          <div className="relative w-full max-w-[694px] mx-auto flex items-start justify-between px-2">
            {stepLabels.map((lbl) => (
              <div key={lbl} className="flex flex-col items-center">
                <div className="w-[18px] h-[18px] rounded-full bg-[#0EB28D] border border-[#0EB28D] flex items-center justify-center text-white text-[10px] font-[800]">
                  ✓
                </div>
                <span className="font-sans font-[600] text-[11px] leading-[17px] text-[#0C8F72] mt-[5.5px]">
                  {lbl}
                </span>
              </div>
            ))}

            {/* Step 6: Your results (Active) */}
            <div className="flex flex-col items-center relative -mt-[2px]">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-[29.5px] h-[29.5px] rounded-full border-[4px] border-[#062C55]/10" />
                <div className="w-[21.5px] h-[21.5px] rounded-full bg-[#062C55] border border-[#062C55] flex items-center justify-center text-white text-[10px] font-[800] z-10">
                  ★
                </div>
              </div>
              <span className="font-sans font-[800] text-[11px] leading-[17px] text-[#062C55] mt-[4px]">
                Your results
              </span>
            </div>
          </div>

          {/* Stepper Progress Line */}
          <div className="relative mt-[10px] w-full max-w-[694px] mx-auto">
            <div className="w-full h-[6px] rounded-[3px] bg-gradient-to-r from-[#0C8F72] to-[#0EB28D] relative overflow-visible">
              <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                <div className="w-[14px] h-[14px] rounded-full bg-[#0EB28D] shadow-[0_0_0_4px_rgba(14,178,141,0.18),0_0_0_8px_rgba(14,178,141,0.08)]" />
              </div>
            </div>
          </div>

          {/* Subheader info line: Reading your documents… */}
          <div className="w-full flex items-center justify-between pt-[15.5px] pb-[16px]">
            <span className="font-sans font-[700] text-[12px] leading-[18px] text-[#5A6B78]">
              Reading your documents…
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={explainEach}
              onClick={() => setExplainEach(!explainEach)}
              className="flex items-center gap-2 cursor-pointer focus:outline-none select-none"
            >
              <span
                className={`relative inline-block w-9 h-5 shrink-0 rounded-full transition-colors duration-200 ease-in-out ${
                  explainEach ? "bg-[#0EB28D]" : "bg-[#CFD8DF]"
                }`}
              >
                <span
                  className={`pointer-events-none absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-xs transition-transform duration-200 ease-in-out ${
                    explainEach ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </span>
              <span className="font-sans font-[700] text-[12px] leading-[18px] text-[#0C8F72]">
                Explain each question
              </span>
            </button>
          </div>
        </div>

        {/* Mobile / Tablet Stepper (under lg / 1024px) */}
        <div className="lg:hidden max-w-[500px] mx-auto px-2 pb-2">
          <div className="flex items-center justify-between px-2 mb-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-full bg-[#0EB28D] border border-[#0EB28D] flex items-center justify-center text-white text-[9px] font-extrabold"
              >
                ✓
              </div>
            ))}
            <div className="relative flex items-center justify-center">
              <div className="absolute w-[27px] h-[27px] rounded-full border-[4px] border-[#062C55]/10" />
              <div className="w-[19px] h-[19px] rounded-full bg-[#062C55] border border-[#062C55] flex items-center justify-center text-white text-[9px] font-extrabold z-10">
                ★
              </div>
            </div>
          </div>
          <div className="w-full h-[6px] rounded-[3px] bg-gradient-to-r from-[#0C8F72] to-[#0EB28D] relative">
            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
              <div className="w-[14px] h-[14px] rounded-full bg-[#0EB28D] shadow-[0_0_0_4px_rgba(14,178,141,0.18),0_0_0_8px_rgba(14,178,141,0.08)]" />
            </div>
          </div>
          <div className="text-right mt-1 pr-1">
            <span className="font-sans font-[800] text-[10.5px] text-[#062C55]">
              Your results
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 pb-2 text-[12px] text-[#5A6B78]">
            <span className="font-sans font-[700] text-[12px] leading-[18px] text-[#5A6B78]">
              Reading your documents…
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={explainEach}
              onClick={() => setExplainEach(!explainEach)}
              className="flex items-center gap-2 cursor-pointer focus:outline-none select-none"
            >
              <span
                className={`relative inline-block w-9 h-5 shrink-0 rounded-full transition-colors duration-200 ease-in-out ${
                  explainEach ? "bg-[#0EB28D]" : "bg-[#CFD8DF]"
                }`}
              >
                <span
                  className={`pointer-events-none absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-xs transition-transform duration-200 ease-in-out ${
                    explainEach ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </span>
              <span className="font-sans font-[700] text-[12px] leading-[18px] text-[#0C8F72]">
                Explain each question
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Main Layout: Left Column & Right Sidebar ── */}
      <main className="w-full max-w-[1200px] mx-auto px-4 lg:px-[80px] pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-[714px_300px] gap-[26px] items-start">
          {/* ════════ Left Column: Reading Card ════════ */}
          <div className="w-full lg:w-[714px] min-h-[259px] bg-white border border-[#E7E4DD] rounded-[12px] shadow-[0px_18px_40px_-18px_rgba(5,43,84,0.12)] p-6 sm:p-[28px] flex flex-col items-center justify-center text-center">
            {/* ── Document Inspection Animation / Illustration ── */}
            <div className="relative w-[128px] h-[128px] flex items-center justify-center mb-[14px]">
              <svg
                width="128"
                height="128"
                viewBox="0 0 128 128"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-[128px] h-[128px]"
              >
                {/* Document Body */}
                <path
                  d="M32 26C32 22.6863 34.6863 20 38 20H68L86 38V100C86 103.314 83.3137 106 80 106H38C34.6863 106 32 103.314 32 100V26Z"
                  fill="white"
                  stroke="#062C55"
                  strokeWidth="4.5"
                  strokeLinejoin="round"
                />
                {/* Folded Top-Right Corner */}
                <path
                  d="M68 20V38H86"
                  fill="#062C55"
                  stroke="#062C55"
                  strokeWidth="4.5"
                  strokeLinejoin="round"
                />

                {/* Document Text Lines */}
                <line
                  x1="44"
                  y1="46"
                  x2="60"
                  y2="46"
                  stroke="#CDD3D8"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                />
                <line
                  x1="44"
                  y1="56"
                  x2="74"
                  y2="56"
                  stroke="#0EB28D"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  className="animate-pulse"
                />
                <line
                  x1="44"
                  y1="66"
                  x2="74"
                  y2="66"
                  stroke="#0EB28D"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  className="animate-pulse"
                  style={{ animationDelay: "150ms" }}
                />
                <line
                  x1="44"
                  y1="76"
                  x2="74"
                  y2="76"
                  stroke="#0EB28D"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  className="animate-pulse"
                  style={{ animationDelay: "300ms" }}
                />
                <line
                  x1="44"
                  y1="86"
                  x2="64"
                  y2="86"
                  stroke="#0EB28D"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  className="animate-pulse"
                  style={{ animationDelay: "450ms" }}
                />

                {/* Magnifying Glass Over Document */}
                <g className="animate-[bounce_2.5s_ease-in-out_infinite]">
                  {/* Glass Circle */}
                  <circle
                    cx="80"
                    cy="52"
                    r="15"
                    fill="rgba(255, 255, 255, 0.7)"
                    stroke="#062C55"
                    strokeWidth="5"
                  />
                  {/* Lens Reflection Highlight */}
                  <path
                    d="M74 44C76 41 81 40 85 42"
                    stroke="#0EB28D"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  {/* Handle */}
                  <line
                    x1="91"
                    y1="63"
                    x2="103"
                    y2="75"
                    stroke="#062C55"
                    strokeWidth="5.5"
                    strokeLinecap="round"
                  />
                </g>
              </svg>
            </div>

            {/* Headline */}
            {readState.failed ? (
              <div className="mt-2 mb-4 p-4 rounded-xl bg-[#fbeceb] border border-[#f5c6cb] text-[#a3231f]">
                <div className="font-bold text-[16px] mb-1">We couldn&apos;t read your document</div>
                <p className="text-[14px] mb-3">{readState.error || 'Please make sure the text is clear and readable.'}</p>
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={retrying}
                  className="px-4 py-2 rounded-lg bg-[#0EB28D] text-white font-bold text-[13px] hover:bg-[#0C8F72] transition disabled:opacity-50 cursor-pointer"
                >
                  {retrying ? 'Retrying…' : 'Try reading again'}
                </button>
              </div>
            ) : null}
            <h1 className="font-serif font-[500] text-[22px] sm:text-[24px] leading-[27px] tracking-[-0.5px] text-[#062C55] mb-[8px]">
              {readState.failed ? 'Scanner paused' : 'Reading your letter…'}
            </h1>

            {/* Subtitle */}
            <p className="font-sans font-normal text-[15px] leading-[24px] text-[#5A6B78] max-w-[460px]">
              Checking the clause, your offer, and where you have room to push.
            </p>
          </div>

          {/* ════════ Right Column: Summary Sidebar ════════ */}
          <aside className="w-full lg:w-[300px] shrink-0 bg-[#EEF1F4] border border-[#DDE3E9] rounded-[12px] p-[19px]">
            <div className="font-sans font-[800] text-[11px] leading-[17px] tracking-[0.5px] text-[#5A6B78] uppercase mb-[4px]">
              YOUR DETAILS SO FAR
            </div>
            <h2 className="font-serif font-normal text-[16px] leading-[25px] text-[#062C55] mb-[12px]">
              FairExit summary
            </h2>

            {/* Key-Value Summary List */}
            <div className="text-[13px] divide-y divide-[#D3DAE1]">
              <div className="flex items-center justify-between py-[7px]">
                <span className="font-sans font-normal text-[13px] leading-[20px] text-[#5A6B78]">Union member</span>
                <span className="font-sans font-[700] text-[13px] leading-[20px] text-[#062C55]">{data.union || "No"}</span>
              </div>

              <div className="flex items-center justify-between py-[7px]">
                <span className="font-sans font-normal text-[13px] leading-[20px] text-[#5A6B78]">Employment</span>
                <span className="font-sans font-[700] text-[13px] leading-[20px] text-[#062C55]">{data.employment || "Regular employee"}</span>
              </div>

              {Boolean(data.signed) && (
                <div className="flex items-center justify-between py-[7px]">
                  <span className="font-sans font-normal text-[13px] leading-[20px] text-[#5A6B78]">Signed yet?</span>
                  <span className="font-sans font-[700] text-[13px] leading-[20px] text-[#062C55]">{data.signed}</span>
                </div>
              )}

              {Boolean(data.federal) && isCanada && (
                <div className="flex items-center justify-between py-[7px]">
                  <span className="font-sans font-normal text-[13px] leading-[20px] text-[#5A6B78]">Federally regulated</span>
                  <span className="font-sans font-[700] text-[13px] leading-[20px] text-[#062C55]">{data.federal}</span>
                </div>
              )}

              <div className="flex items-center justify-between py-[7px]">
                <span className="font-sans font-normal text-[13px] leading-[20px] text-[#5A6B78]">{isUS ? "State" : "Province"}</span>
                <span className="font-sans font-[700] text-[13px] leading-[20px] text-[#062C55]">
                  {isUS ? data.state || "California" : data.provinceName || "Ontario"}
                </span>
              </div>

              <div className="flex items-center justify-between py-[7px]">
                <span className="font-sans font-normal text-[13px] leading-[20px] text-[#5A6B78]">Age</span>
                <span className="font-sans font-[700] text-[13px] leading-[20px] text-[#062C55]">{data.age || "52"}</span>
              </div>

              <div className="flex items-center justify-between py-[7px]">
                <span className="font-sans font-normal text-[13px] leading-[20px] text-[#5A6B78]">Years of service</span>
                <span className="font-sans font-[700] text-[13px] leading-[20px] text-[#062C55]">{data.years || (isUS ? 9 : 14)} yrs</span>
              </div>

              <div className="flex items-center justify-between py-[7px]">
                <span className="font-sans font-normal text-[13px] leading-[20px] text-[#5A6B78]">Pay</span>
                <span className="font-sans font-[700] text-[13px] leading-[20px] text-[#062C55]">{payFormatted}</span>
              </div>

              <div className="flex items-start justify-between py-[7px]">
                <span className="font-sans font-normal text-[13px] leading-[20px] text-[#5A6B78]">Occupation</span>
                <span className="font-sans font-[700] text-[13px] leading-[20px] text-[#062C55] text-right max-w-[150px]">
                  {data.role || "Middle management / Senior / Director"}
                </span>
              </div>

              <div className="flex items-center justify-between py-[7px]">
                <span className="font-sans font-normal text-[13px] leading-[20px] text-[#5A6B78]">
                  {isUS ? "Employer size (100+ employees)" : "Employer payroll ≥ $2.5M"}
                </span>
                <span className="font-sans font-[700] text-[13px] leading-[20px] text-[#062C55]">
                  {data.payroll || (isUS ? "100+" : "Not sure")}
                </span>
              </div>

              <div className="flex items-center justify-between py-[7px]">
                <span className="font-sans font-normal text-[13px] leading-[20px] text-[#5A6B78]">Other pay</span>
                <span className="font-sans font-[700] text-[13px] leading-[20px] text-[#062C55]">{data.otherPay || "None"}</span>
              </div>

              <div className="flex items-center justify-between py-[7px]">
                <span className="font-sans font-normal text-[13px] leading-[20px] text-[#5A6B78]">New job yet?</span>
                <span className="font-sans font-[700] text-[13px] leading-[20px] text-[#062C55]">{data.newJob || "Not yet"}</span>
              </div>

              <div className="flex items-center justify-between py-[7px]">
                <span className="font-sans font-normal text-[13px] leading-[20px] text-[#5A6B78]">Min-only clause</span>
                <span className="font-sans font-[700] text-[13px] leading-[20px] text-[#062C55]">{data.minClause || "No"}</span>
              </div>

              <div className="flex items-center justify-between py-[7px]">
                <span className="font-sans font-normal text-[13px] leading-[20px] text-[#5A6B78]">Contract</span>
                <span className="font-sans font-[700] text-[13px] leading-[20px] text-[#062C55]">{data.contract || "Signed · role changed"}</span>
              </div>

              <div className="flex items-center justify-between py-[7px]">
                <span className="font-sans font-normal text-[13px] leading-[20px] text-[#5A6B78]">How it ended</span>
                <span className="font-sans font-[700] text-[13px] leading-[20px] text-[#062C55]">{data.howEnded || "Laid off"}</span>
              </div>

              <div className="flex items-center justify-between py-[7px]">
                <span className="font-sans font-normal text-[13px] leading-[20px] text-[#5A6B78]">Similar jobs nearby</span>
                <span className="font-sans font-[700] text-[13px] leading-[20px] text-[#062C55]">{data.market || "Some"}</span>
              </div>

              <div className="flex items-center justify-between py-[7px]">
                <span className="font-sans font-normal text-[13px] leading-[20px] text-[#5A6B78]">Anything flagged</span>
                <span className="font-sans font-[700] text-[13px] leading-[20px] text-[#062C55]">{data.flagged || "Nothing unusual"}</span>
              </div>

              <div className="flex items-center justify-between py-[7px]">
                <span className="font-sans font-normal text-[13px] leading-[20px] text-[#5A6B78]">Offer</span>
                <span className="font-sans font-[700] text-[13px] leading-[20px] text-[#062C55]">
                  {hasOffer ? offerFormatted : "Reading from documents"}
                </span>
              </div>
            </div>

            {/* Bottom LIVE ESTIMATE Box (Canada) or SEVERANCE REVIEW READY Box (US) */}
            {isCanada ? (
              <div className="mt-[16px] pt-[12px] border-t border-[#D3DAE1]">
                <div className="font-sans font-[800] text-[10.5px] leading-[16px] tracking-[0.5px] text-[#5A6B78] uppercase mb-[2px]">
                  LIVE ESTIMATE · NOT WHAT YOU&apos;RE OWED
                </div>
                <div className="font-serif font-[600] text-[20px] leading-[23px] text-[#0C8F72] mb-[3px]">
                  {minFormatted} – {courtHighFormatted}
                </div>
                <div className="font-sans font-normal text-[11.5px] leading-[16px] text-[#5A6B78] mb-[2px]">
                  {data.noticeWeeks || 8} wks notice · court-awarded {data.courtMonths || "15–21 mo"}
                </div>
                <div className="font-sans text-[11.5px] leading-[16px] text-[#5A6B78] mb-[12px]">
                  {hasOffer ? (
                    <>
                      <span className="font-[700]">Your offer {offerFormatted}</span> — near the floor
                    </>
                  ) : (
                    <>
                      <span className="font-[700]">Your offer</span> — reading from your documents
                    </>
                  )}
                </div>

                {/* Status pill */}
                <div className="w-full h-[36.5px] rounded-[9px] bg-[#E5F5EE] border border-[#C7E6D6] flex items-center justify-center text-[#0C8F72] font-sans font-[700] text-[12px] leading-[18px]">
                  ✓ Enough to show your results
                </div>
              </div>
            ) : (
              <div className="mt-[16px] pt-[12px] border-t border-[#D3DAE1]">
                <div className="font-sans font-[800] text-[10.5px] leading-[16px] tracking-[0.5px] text-[#5A6B78] uppercase mb-[2px]">
                  SEVERANCE REVIEW READY
                </div>
                <div className="font-serif font-[600] text-[20px] leading-[23px] text-[#0C8F72] mb-[3px]">
                  {hasOffer ? offerFormatted : "Reading from documents"}
                </div>
                <div className="font-sans text-[11.5px] leading-[16px] text-[#5A6B78] mb-[12px]">
                  Federal &amp; state rules · Release terms &amp; deadlines
                </div>

                {/* Status pill */}
                <div className="w-full h-[36.5px] rounded-[9px] bg-[#E5F5EE] border border-[#C7E6D6] flex items-center justify-center text-[#0C8F72] font-sans font-[700] text-[12px] leading-[18px]">
                  ✓ Enough to show your results
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
