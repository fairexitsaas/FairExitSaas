"use client";

import React, { useState, useEffect } from "react";
import { CountryCode } from "@/context/CountryContext";

interface FirstGetFreeCheckProps {
  country: CountryCode;
}

export default function FirstGetFreeCheck({ country }: FirstGetFreeCheckProps) {
  const isCanada = country === "CA";
  const [activePath, setActivePath] = useState<"report" | "lawyer" | null>(null);

  const handleStartRead = (e: React.MouseEvent) => {
    e.preventDefault();
    const el =
      document.getElementById("qsProvince") ||
      document.getElementById("state") ||
      document.getElementById("hero");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus();
    }
    setActivePath(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActivePath(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const pathData = {
    report: {
      k: "After your 60-second read · $59, one-time · no subscription",
      h: "Get your Severance Report",
      vid: "What's in your report",
      items: isCanada
        ? [
            "A clear summary of your offer",
            "Your key terms, explained in plain language",
            "Your dates & deadlines in one timeline",
            "Questions to prepare — for HR or a lawyer",
            "A pre-sign checklist to think through",
            "Links to official public resources",
            "A downloadable PDF to keep",
          ]
        : [
            "A clear summary of your offer",
            "Your key terms, explained in plain language",
            "Your dates & deadlines in one timeline",
            "The federal rules that may apply, in plain English",
            "Questions to prepare — for HR or an attorney",
            "A downloadable PDF to keep",
          ],
      note: "You'll be offered this right after your 60-second read — only if you want it.",
    },
    lawyer: {
      k: "After your 60-second read · free to connect",
      h: isCanada ? "Hand it to a lawyer" : "Hand it to an attorney",
      vid: isCanada ? "How the lawyer step works" : "How the attorney step works",
      items: isCanada
        ? [
            "We pass your organized summary to an employment lawyer in your province",
            "They decide whether to offer a consultation",
            "You choose whether to go further",
            "Free for you — lawyers pay us, never a cut of your outcome",
          ]
        : [
            "We pass your organized summary to an employment attorney in your state",
            "They decide whether to offer a consultation",
            "You choose whether to go further",
            "Free for you — lawyers pay us, never a cut of your outcome",
          ],
      note: isCanada
        ? "We offer to connect you right after your 60-second read — free, and only if you want."
        : "We offer to connect you right after your 60-second read — free, and only if you want.",
    },
  };

  const modalContent = activePath ? pathData[activePath] : null;

  return (
    <>
      <section className={`py-16 ${isCanada ? "" : "bg-card dark:bg-[#071524] border-t border-b border-line"} transition-colors`} id="paths">
        <div className="max-w-[1200px] mx-auto px-6 w-full box-border">
          <div className="text-center">
            <span className="inline-flex items-center text-xs font-extrabold uppercase tracking-[1.5px] text-greend">
              Step 1 — start here
            </span>
            <h2 className="font-serif text-[26px] sm:text-[clamp(24px,3vw,28px)] text-navy dark:text-white font-bold leading-[1.15] mt-1.5">
              First, get your free check.
            </h2>
          </div>

          {/* STEP 1: the free check, front and centre */}
          <div className="bg-[#062C55] rounded-[20px] p-[28px_22px] sm:p-9 lg:p-[36px_44px] text-white flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-10 mt-8 shadow-[0_16px_48px_rgba(6,44,85,0.22)] max-w-[1000px] mx-auto text-center lg:text-left">
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-[1.2px] text-[#7ff0cf] mb-2.5">
                Free · <b className="text-[#12d29e]">60 seconds</b> · no obligation
              </div>
              <h3 className="font-serif text-2xl sm:text-[26px] text-white m-0 mb-2.5 font-bold leading-[1.25] max-w-[520px]">
                {isCanada
                  ? "See what kind of offer you got — free, in 60 seconds."
                  : "See which rules may apply — free, in 60 seconds."}
              </h3>
              <p className="text-[14.5px] text-[#b8d4e8] leading-[1.58] m-0 max-w-[520px]">
                {isCanada
                  ? "Answer a few quick questions and get a plain-English read on your severance. No credit card, no signup, nothing to lose."
                  : "Answer a few quick questions and get a plain-English read on the federal rules that may apply to your layoff. No credit card, no signup, nothing to lose."}
              </p>
            </div>
            <div className="text-center shrink-0">
              <a
                className="inline-flex items-center justify-center bg-green hover:bg-greend text-white py-3.5 px-[26px] rounded-xl font-bold text-[15px] no-underline whitespace-nowrap shadow-[0_4px_16px_rgba(14,178,141,0.4)] hover:shadow-[0_6px_20px_rgba(12,143,114,0.45)] hover:-translate-y-px active:scale-[0.98] transition-all"
                href="#hero"
                onClick={handleStartRead}
              >
                Start my 60-second read →
              </a>
              <div className="mt-2.5 text-[11.5px] text-[#7fafc8] font-medium text-center">
                🔒 60 seconds · no card · no signup
              </div>
            </div>
          </div>

          {/* flow arrow: read -> decide */}
          <div className="flex justify-center my-9 mb-8" aria-hidden="true">
            <svg
              width="52"
              height="46"
              viewBox="0 0 52 46"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M18 0 h16 v18 h11 L26 44 L7 18 h11 Z" fill="var(--green)"></path>
            </svg>
          </div>

          {/* STEP 2: after the read, the decision */}
          <div className="text-center max-w-[600px] mx-auto mb-8">
            <div className="font-serif text-2xl sm:text-[28px] text-navy dark:text-white font-bold mb-2.5 leading-[1.2]">
              You got your 60-second read. Now it&apos;s your call.
            </div>
            <div className="text-[14.5px] text-slate leading-[1.6]">
              Two ways to go from here — both optional. One&apos;s a $59 Severance Report; the other connects you to an employment{" "}
              {isCanada ? "lawyer" : "attorney"} where we&apos;re live — free (they pay us a flat advertising fee, not you).
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div
              className="bg-card border-[1.5px] border-line rounded-2xl p-7 pb-6 cursor-pointer hover:-translate-y-0.5 hover:border-navy dark:hover:border-white/40 hover:shadow-[0_10px_28px_rgba(6,44,85,0.09)] transition-all flex flex-col text-left group"
              role="button"
              tabIndex={0}
              onClick={() => setActivePath("report")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActivePath("report");
                }
              }}
            >
              <div className="text-[32px] font-extrabold text-navy dark:text-white mb-1 flex items-baseline gap-1.5 font-serif">
                $59<span className="text-[13px] font-semibold normal-case text-slate tracking-normal font-sans">one-time</span>
              </div>
              <h4 className="font-serif text-xl text-navy dark:text-white m-0 mb-3 font-bold">
                Get your Severance Report
              </h4>
              <div className="text-sm text-slate leading-[1.6] flex-1 mb-5">
                {isCanada
                  ? "Your offer organized into a 13-page report — key terms, dates, questions to prepare — so you can push back on your own, or walk into a free lawyer call already prepared."
                  : "Add your paperwork and get it organized into a clear summary — key terms, dates, and the federal rules that may apply."}
              </div>
              <div className="text-[13px] font-bold text-greend inline-flex items-center gap-1.5 border-t border-line pt-3.5 w-full">
                <span className="w-[18px] h-[18px] rounded-full bg-navy text-white text-[8px] inline-flex items-center justify-center shrink-0">▶</span> See what&apos;s inside
              </div>
            </div>

            <div
              className="bg-[#f0fdf8] dark:bg-[#071d2b] border-[1.5px] border-green rounded-2xl p-7 pb-6 cursor-pointer hover:-translate-y-0.5 hover:border-greend hover:shadow-[0_10px_28px_rgba(14,178,141,0.12)] transition-all flex flex-col text-left group"
              role="button"
              tabIndex={0}
              onClick={() => setActivePath("lawyer")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActivePath("lawyer");
                }
              }}
            >
              <div className="text-[32px] font-extrabold text-greend mb-1 flex items-baseline gap-1.5 font-serif">
                Free<span className="text-[13px] font-semibold normal-case text-slate tracking-normal font-sans">to connect</span>
              </div>
              <h4 className="font-serif text-xl text-navy dark:text-white m-0 mb-3 font-bold">
                Hand it to {isCanada ? "a lawyer" : "an attorney"}
              </h4>
              <div className="text-sm text-slate leading-[1.6] flex-1 mb-5">
                Where we&apos;re live, an employment {isCanada ? "lawyer" : "attorney"} takes it from here — free to connect.{" "}
                {isCanada ? "Lawyers" : "Attorneys"} pay us a flat advertising fee, never a cut of your outcome.
              </div>
              <div className="text-[13px] font-bold text-greend inline-flex items-center gap-1.5 border-t border-line pt-3.5 w-full">
                <span className="w-[18px] h-[18px] rounded-full bg-greend text-white text-[8px] inline-flex items-center justify-center shrink-0">▶</span> See how it works
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Path Info Popup Modal */}
      {activePath && (
        <div
          className="fixed inset-0 bg-[#062C55]/55 z-[300] backdrop-blur-xs flex items-center justify-center p-5"
          id="pmscrim"
          onClick={() => setActivePath(null)}
        >
          <div
            className="bg-card rounded-[20px] p-8 pb-[26px] max-w-[500px] w-full z-[310] shadow-[0_40px_90px_-30px_rgba(6,44,85,0.6)] border border-line box-border"
            id="pmodal"
            role="dialog"
            aria-modal="true"
            aria-label={modalContent?.h || "Path details"}
            onClick={(e) => e.stopPropagation()}
          >
            {modalContent && (
              <>
                <div className="text-[11px] font-extrabold tracking-[0.6px] uppercase text-greend mb-1.5">
                  {modalContent.k}
                </div>
                <h3 className="font-serif text-2xl text-navy dark:text-white my-1.5 mb-3.5 font-bold">
                  {modalContent.h}
                </h3>
                <div className="bg-navy rounded-xl p-6 text-center text-white mb-4 flex flex-col items-center gap-2">
                  <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center text-lg">
                    ▶
                  </div>
                  <small className="text-xs text-white/80">{modalContent.vid} — video coming soon</small>
                </div>
                <ul className="m-0 mb-4 pl-5 text-[13.5px] text-ink dark:text-white leading-[1.6] list-disc space-y-1">
                  {modalContent.items.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
                <p className="text-[13px] text-slate leading-[1.5] m-0 mb-3.5">
                  {modalContent.note}
                </p>
                <a
                  className="inline-flex items-center justify-center gap-1.5 bg-green hover:bg-greend text-white px-5 py-[9px] rounded-xl font-bold text-sm no-underline border-none cursor-pointer shadow-button hover:shadow-button-hover active:scale-[0.98] transition-all whitespace-nowrap w-full h-11"
                  href="#hero"
                  onClick={handleStartRead}
                >
                  Start my 60-second read →
                </a>
                <button
                  type="button"
                  className="block w-full mt-2.5 bg-transparent border-none text-slate text-[13px] font-semibold cursor-pointer p-1.5 hover:text-navy dark:hover:text-white transition-colors"
                  onClick={() => setActivePath(null)}
                >
                  Maybe later
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
