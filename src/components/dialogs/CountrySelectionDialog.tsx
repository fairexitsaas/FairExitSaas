"use client";

import React, { useState, useEffect, useRef } from "react";
import { CountryCode } from "@/context/CountryContext";
import { CanadaFlagIcon, USFlagIcon } from "@/components/common/Icons";

interface CountrySelectionDialogProps {
  isOpen: boolean;
  onSelect: (country: CountryCode) => void;
}

export default function CountrySelectionDialog({
  isOpen,
  onSelect,
}: CountrySelectionDialogProps) {
  // Default to US per product requirement
  const [selected, setSelected] = useState<CountryCode>("US");
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = (country: CountryCode) => {
    setSelected(country);
    onSelect(country);
  };

  const handleDecideLater = () => {
    // Default to US when user skips
    onSelect("US");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      setSelected((prev) => (prev === "CA" ? "US" : "CA"));
    } else if (e.key === "Enter") {
      handleSelect(selected);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="presentation"
      onKeyDown={handleKeyDown}
    >
      {/* Frosted backdrop — lighter so the page content is still visible per screenshot */}
      <div
        className="fixed inset-0 backdrop-blur-[3px] bg-[#062C55]/45 transition-opacity"
        aria-hidden="true"
      />

      {/* Modal card — compact, white, max-w-sm to match screenshot */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="country-dialog-heading"
        tabIndex={-1}
        className="relative w-full max-w-sm rounded-3xl shadow-2xl p-8 z-10 focus:outline-none text-center bg-card text-primary border border-line"
      >
        {/* Eyebrow */}
        <p className="text-[11px] font-bold tracking-[1.5px] uppercase mb-3 text-brand-green-text">
          WELCOME TO FAIREXIT
        </p>

        {/* Heading */}
        <h2
          id="country-dialog-heading"
          className="font-serif text-2xl sm:text-3xl font-bold leading-tight mb-3 text-navy dark:text-white"
        >
          Where were you laid off?
        </h2>

        {/* Sub-copy */}
        <p className="text-sm leading-relaxed mb-7 max-w-[260px] mx-auto text-slate">
          The laws are different in each country, so we run two separate services.
          Pick yours and we&apos;ll take you to the right one.
        </p>

        {/* Side-by-side country buttons */}
        <div
          className="flex items-stretch gap-3 mb-5"
          role="radiogroup"
          aria-label="Select your country"
        >
          {/* Canada */}
          <button
            type="button"
            role="radio"
            aria-checked={selected === "CA"}
            onClick={() => handleSelect("CA")}
            className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-2xl border-2 font-semibold text-sm transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-green ${
              selected === "CA"
                ? "border-green bg-green/10 text-navy dark:text-white shadow-[0_0_0_1px_#0EB28D]"
                : "border-line bg-card text-navy dark:text-white"
            }`}
          >
            <CanadaFlagIcon className="w-8 h-5.5 rounded-xs shadow-xs" />
            <span>Canada</span>
          </button>

          {/* United States */}
          <button
            type="button"
            role="radio"
            aria-checked={selected === "US"}
            onClick={() => handleSelect("US")}
            className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-2xl border-2 font-semibold text-sm transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-green ${
              selected === "US"
                ? "border-green bg-green/10 text-navy dark:text-white shadow-[0_0_0_1px_#0EB28D]"
                : "border-line bg-card text-navy dark:text-white"
            }`}
          >
            <USFlagIcon className="w-8 h-5.5 rounded-xs shadow-xs" />
            <span>United States</span>
          </button>
        </div>

        {/* "I'll decide later" ghost link */}
        <button
          type="button"
          onClick={handleDecideLater}
          className="text-sm font-medium hover:underline focus:outline-none focus:underline transition-colors text-muted hover:text-slate"
        >
          I&apos;ll decide later
        </button>
      </div>
    </div>
  );
}
