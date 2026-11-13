"use client";

import React, { useEffect, useRef } from "react";
import ReportVideoPlayer from "./ReportVideoPlayer";

interface ReportVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlock: () => void;
  country?: string;
}

export default function ReportVideoModal({
  isOpen,
  onClose,
  onUnlock,
  country = "CA",
}: ReportVideoModalProps) {
  const isUS = country === "US";
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#062C55]/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal content */}
      <div
        ref={dialogRef}
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#E7E4DD] p-6 sm:p-8 z-10 overflow-hidden animate-dlgup"
      >
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#EEF1F4] text-[#062C55] hover:bg-[#DDE3E9] flex items-center justify-center font-bold text-sm transition"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="flex items-center gap-2 mb-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#0EB28D] animate-pulse" />
          <span className="font-sans font-[800] text-[11px] uppercase tracking-wider text-[#0C8F72]">
            What&apos;s in your Severance Report · Preview
          </span>
        </div>

        <h3 className="font-serif text-[24px] sm:text-[28px] font-semibold text-[#062C55] leading-tight mb-3">
          See exactly how your report works
        </h3>
        <div className="mb-5 rounded-[12px] overflow-hidden">
          <ReportVideoPlayer autoPlay={true} isModal={true} />
        </div>
        <p className="font-sans text-[14px] sm:text-[15px] text-[#5A6B78] leading-relaxed mb-6">
          {isUS
            ? "Every report is custom-compiled from your answers, separation agreement, and offer letter."
            : "Every report is custom-compiled from your answers, severance letter, and employment contract."}{" "}
          Here are the four high-leverage sections you unlock:
        </p>

        {/* 4 Feature Columns / Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <div className="p-3.5 rounded-xl bg-[#F6F8FA] border border-[#E3E8ED]">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-5 rounded-full bg-[#062C55] text-white flex items-center justify-center text-[10px] font-bold">1</span>
              <h4 className="font-sans font-[700] text-[13.5px] text-[#062C55]">
                {isUS ? "Key factors for your situation" : "What lifts your range"}
              </h4>
            </div>
            <p className="font-sans text-[12px] text-[#5A6B78] leading-normal">
              {isUS
                ? "Analysis of federal and state protection rules, consideration timelines, and key factors based on age, tenure, and role."
                : "Bardal court factors analysis calculating your notice period range based on age, tenure, and role."}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F6F8FA] border border-[#E3E8ED]">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-5 rounded-full bg-[#062C55] text-white flex items-center justify-center text-[10px] font-bold">2</span>
              <h4 className="font-sans font-[700] text-[13.5px] text-[#062C55]">Your letter, in plain English</h4>
            </div>
            <p className="font-sans text-[12px] text-[#5A6B78] leading-normal">
              Line-by-line review of release clauses, non-competes, bonus entitlements, and restrictive covenants.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F6F8FA] border border-[#E3E8ED]">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-5 rounded-full bg-[#062C55] text-white flex items-center justify-center text-[10px] font-bold">3</span>
              <h4 className="font-sans font-[700] text-[13.5px] text-[#062C55]">
                {isUS ? "For HR, or an attorney" : "For HR, or a lawyer"}
              </h4>
            </div>
            <p className="font-sans text-[12px] text-[#5A6B78] leading-normal">
              Precise, high-leverage questions and calculation inquiries prepared for your HR talk or initial consultation.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F6F8FA] border border-[#E3E8ED]">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-5 rounded-full bg-[#062C55] text-white flex items-center justify-center text-[10px] font-bold">4</span>
              <h4 className="font-sans font-[700] text-[13.5px] text-[#062C55]">What to do this week</h4>
            </div>
            <p className="font-sans text-[12px] text-[#5A6B78] leading-normal">
              Step-by-step decision timeline so you don&apos;t rush or forfeit claims before your signing deadline.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#E7E4DD]">
          <span className="font-sans text-[13px] text-[#5A6B78]">
            One-time $59 · No recurring fees · PDF to keep
          </span>
          <button
            type="button"
            onClick={() => {
              onClose();
              onUnlock();
            }}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#12C79A] hover:bg-[#0EB28D] text-white font-sans font-[800] text-[15px] shadow-md transition"
          >
            Unlock all four ↓
          </button>
        </div>
      </div>
    </div>
  );
}

