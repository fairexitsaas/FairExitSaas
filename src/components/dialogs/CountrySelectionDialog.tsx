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
  // Start with neither picked per requirement (both buttons start plain)
  const [selected, setSelected] = useState<CountryCode | null>(null);
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
    } else if (e.key === "Enter" && selected) {
      handleSelect(selected);
    } else if (e.key === "Escape") {
      handleDecideLater();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-5"
      role="presentation"
      onKeyDown={handleKeyDown}
    >
      {/* Light navy backdrop tint (no heavy blur) so page stays readable behind the pop-up */}
      <div
        className="fixed inset-0 bg-[#062c55]/55 animate-scrimin cursor-pointer"
        aria-hidden="true"
        onClick={handleDecideLater}
      />

      {/* Modal box (440px max width matching prototype so heading fits on one line) */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="country-dialog-heading"
        tabIndex={-1}
        className="relative w-full max-w-[440px] rounded-[18px] shadow-[0_40px_90px_-30px_rgba(6,44,85,0.6)] p-5 sm:p-[30px_28px_24px] z-10 focus:outline-none text-center bg-white dark:bg-[#0e2238] text-[#17242f] dark:text-white border border-[#e7e4dd] dark:border-[#1a385c] animate-dlgup"
      >
        {/* Eyebrow */}
        <p className="text-[11px] font-extrabold tracking-[0.6px] uppercase mb-1.5 text-[#0c8f72]">
          Welcome to FairExit
        </p>

        {/* Heading — fits on one line in 440px box */}
        <h2
          id="country-dialog-heading"
          className="font-serif text-[24px] font-semibold text-[#062c55] dark:text-white my-1.5 leading-[1.2] tracking-[-0.3px]"
        >
          Where were you laid off?
        </h2>

        {/* Sub-copy */}
        <p className="text-[14px] text-[#5a6b78] dark:text-[#9ab1c6] leading-relaxed mb-[18px] max-w-[390px] mx-auto">
          The laws are different in each country, so we run two separate services.
          Pick yours and we&apos;ll take you to the right one.
        </p>

        {/* Side-by-side country buttons — flag on left, name on right in one row */}
        <div
          className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3 mb-4"
          role="radiogroup"
          aria-label="Select your country"
        >
          {/* Canada */}
          <button
            type="button"
            role="radio"
            aria-checked={selected === "CA"}
            onClick={() => handleSelect("CA")}
            className={`flex items-center justify-center gap-[9px] py-4 px-3 border-[1.5px] rounded-[13px] font-bold text-[15px] transition-all cursor-pointer active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#0eb28d] ${
              selected === "CA"
                ? "border-[#0eb28d] bg-[#f3faf6] dark:bg-[#0c243b] text-[#062c55] dark:text-white shadow-[0_0_0_1px_#0eb28d]"
                : "border-[#d8d3c8] dark:border-[#1e3b5c] bg-white dark:bg-[#091b2c] text-[#062c55] dark:text-[#f0f6fc] hover:border-[#0eb28d] hover:bg-[#f3faf6] dark:hover:bg-[#0c243b]"
            }`}
          >
            <CanadaFlagIcon className="w-[26px] h-[18px] rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.06)] shrink-0" />
            <span>Canada</span>
          </button>

          {/* United States */}
          <button
            type="button"
            role="radio"
            aria-checked={selected === "US"}
            onClick={() => handleSelect("US")}
            className={`flex items-center justify-center gap-[9px] py-4 px-3 border-[1.5px] rounded-[13px] font-bold text-[15px] transition-all cursor-pointer active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#0eb28d] ${
              selected === "US"
                ? "border-[#0eb28d] bg-[#f3faf6] dark:bg-[#0c243b] text-[#062c55] dark:text-white shadow-[0_0_0_1px_#0eb28d]"
                : "border-[#d8d3c8] dark:border-[#1e3b5c] bg-white dark:bg-[#091b2c] text-[#062c55] dark:text-[#f0f6fc] hover:border-[#0eb28d] hover:bg-[#f3faf6] dark:hover:bg-[#0c243b]"
            }`}
          >
            <USFlagIcon className="w-[26px] h-[18px] rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.06)] shrink-0" />
            <span>United States</span>
          </button>
        </div>

        {/* "I'll decide later" button */}
        <button
          type="button"
          onClick={handleDecideLater}
          className="text-[13px] font-semibold text-[#5a6b78] dark:text-[#9ab1c6] hover:text-[#062c55] dark:hover:text-white transition-colors cursor-pointer bg-transparent border-none mt-1 hover:underline focus:outline-none"
        >
          I&apos;ll decide later
        </button>
      </div>
    </div>
  );
}
