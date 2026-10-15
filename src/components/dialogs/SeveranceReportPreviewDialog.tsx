"use client";

import React, { useEffect, useRef } from "react";
import { CountryCode } from "@/context/CountryContext";

interface SeveranceReportPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  country: CountryCode;
}

export default function SeveranceReportPreviewDialog({
  isOpen,
  onClose,
  country,
}: SeveranceReportPreviewDialogProps) {
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

  const sections = [
    {
      page: "Pages 1–2",
      title: "Executive Summary & Risk Assessment",
      desc: isCanada
        ? "Clear summary of your severance offer against provincial standards and initial common law risk points."
        : "Clear summary of your separation terms against federal ADEA/OWBPA guidelines and state benchmarks.",
    },
    {
      page: "Pages 3–4",
      title: isCanada ? "Statutory Minimums vs. Common Law" : "WARN & Older Worker Protections",
      desc: isCanada
        ? "Side-by-side comparison of ESA minimums versus Bardal factor ranges for tenure, age, and position."
        : "Detailed review of 21/45-day consideration windows, 7-day revocation clauses, and group layoff disclosures.",
    },
    {
      page: "Pages 5–6",
      title: "Clause-by-Clause Contract Breakdown",
      desc: "Plain-English explanation of non-competes, non-disparagement, release waivers, and benefit continuation terms.",
    },
    {
      page: "Pages 7–8",
      title: "Negotiation Playbook & Counter-Offer Guide",
      desc: "Customized negotiation points and email templates designed to push back professionally on key terms.",
    },
    {
      page: "Pages 9–10",
      title: isCanada ? "Questions for Your Employment Lawyer" : "Questions for Your Employment Attorney",
      desc: "Specific, high-leverage questions to bring to a consultation so you maximize every minute of advice.",
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
        aria-labelledby="report-preview-title"
        tabIndex={-1}
        className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl p-6 sm:p-8 z-10 focus:outline-none bg-card border-card-border"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b mb-6 border-divider">
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase block text-brand-green-text">
              WHAT&apos;S INSIDE
            </span>
            <h2
              id="report-preview-title"
              className="font-serif text-2xl font-bold mt-1 text-primary"
            >
              10-Page Severance Report
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

        {/* Contents breakdown */}
        <div className="space-y-4 mb-6">
          {sections.map((item, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-divider bg-section-gray p-4 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-sm sm:text-base text-primary">
                  {item.title}
                </h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-green/12 text-brand-green-text">
                  {item.page}
                </span>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed text-secondary">
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-divider">
          <div className="text-xs text-muted">
            One-time purchase · Instant PDF download
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
