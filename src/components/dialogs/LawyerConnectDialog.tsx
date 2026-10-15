"use client";

import React, { useEffect, useRef } from "react";
import { CountryCode } from "@/context/CountryContext";

interface LawyerConnectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  country: CountryCode;
}

export default function LawyerConnectDialog({
  isOpen,
  onClose,
  country,
}: LawyerConnectDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const isCanada = country === "CA";

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const points = [
    {
      step: "1",
      title: "Organized Case Brief",
      desc: isCanada
        ? "We summarize your tenure, age, position, compensation, and offer details into a clean brief for the lawyer."
        : "We summarize your role, layoff circumstances, and key severance terms into a structured brief for the attorney.",
    },
    {
      step: "2",
      title: isCanada ? "Independent Provincial Lawyer" : "Independent State Attorney",
      desc: isCanada
        ? "We connect you to a vetted employment lawyer licensed in your province who specializes in severance reviews."
        : "We connect you to a vetted employment attorney licensed in your state who specializes in separation agreements.",
    },
    {
      step: "3",
      title: "Zero Cut of Your Outcome",
      desc: "Attorneys pay FairExit a flat listing fee. We never take a percentage or contingency fee of your severance money.",
    },
    {
      step: "4",
      title: "You Are Always In Control",
      desc: "There is no obligation. You choose whether to proceed with an initial consultation and decide how to handle your offer.",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#062C55]/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lawyer-connect-title"
        tabIndex={-1}
        className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl p-6 sm:p-8 z-10 focus:outline-none bg-card border-card-border"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b mb-6 border-divider">
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase block text-brand-green-text">
              HOW CONNECTION WORKS
            </span>
            <h2
              id="lawyer-connect-title"
              className="font-serif text-2xl font-bold mt-1 text-primary"
            >
              {isCanada ? "Hand it to a lawyer" : "Hand it to an attorney"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-full border border-divider text-muted flex items-center justify-center transition-colors hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-green"
          >
            ✕
          </button>
        </div>

        {/* 4 points */}
        <div className="space-y-4 mb-6">
          {points.map((p) => (
            <div
              key={p.step}
              className="rounded-xl border border-divider bg-section-gray p-4 flex items-start gap-4 transition-colors"
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 mt-0.5 bg-brand-navy">
                {p.step}
              </div>
              <div>
                <h3 className="font-semibold text-sm sm:text-base mb-1 text-primary">
                  {p.title}
                </h3>
                <p className="text-xs sm:text-sm leading-relaxed text-secondary">
                  {p.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-divider">
          <div className="text-xs text-muted">
            Free connection · Flat fee model
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              const el = document.getElementById("ca-work-location") || document.getElementById("us-state");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-xl text-white font-semibold text-sm shadow-md transition-all active:scale-95 bg-brand-green hover:bg-brand-green-hover"
          >
            Start free check first →
          </button>
        </div>
      </div>
    </div>
  );
}
