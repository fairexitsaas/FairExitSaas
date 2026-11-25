"use client";

import React from "react";

interface ConfirmationCardModalProps {
  ariaLabel: string;
  kicker?: string;
  children: React.ReactNode;
}

/**
 * Centered dialog card wrapper used for confirmation steps so the underlying
 * FairExit page and cream background remain visible around the card.
 */
export function ConfirmationCardModal({
  ariaLabel,
  kicker = "CHECK THIS FIRST",
  children,
}: ConfirmationCardModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#062C55]/25 backdrop-blur-[2px] overflow-y-auto"
    >
      <div className="relative w-full max-w-[540px] my-auto bg-white border border-[#E7E4DD] border-l-4 border-l-[#B07A00] rounded-[16px] shadow-[0_24px_60px_-15px_rgba(6,44,85,0.25)] p-5 sm:p-7 max-h-[90vh] overflow-y-auto">
        {kicker ? (
          <span className="font-sans font-[800] text-[11.5px] tracking-[1px] text-[#B07A00] uppercase block mb-1.5">
            {kicker}
          </span>
        ) : null}
        {children}
      </div>
    </div>
  );
}

export interface OfferAmountConfirmationCardProps {
  docLabel: string;
  conflictLead: string;
  docDisplay: string;
  docQuote?: string;
  docWhere?: string;
  intakeDisplay: string;
  selectedChoice: "document" | "answers" | "custom" | null;
  showCustom: boolean;
  onShowCustom: (show: boolean) => void;
  customVal: string;
  onCustomValChange: (val: string) => void;
  onChoose: (choice: "document" | "answers" | "custom", customVal?: string) => void;
}

/**
 * Centered confirmation card presented when the severance amount in the
 * uploaded document differs from the amount entered during intake.
 */
export function OfferAmountConfirmationCard({
  docLabel,
  conflictLead,
  docDisplay,
  docQuote,
  docWhere,
  intakeDisplay,
  selectedChoice,
  showCustom,
  onShowCustom,
  customVal,
  onCustomValChange,
  onChoose,
}: OfferAmountConfirmationCardProps) {
  return (
    <ConfirmationCardModal ariaLabel="Confirm money offered" kicker="CHECK THIS">
      <h3 className="font-serif font-[600] text-[22px] sm:text-[24px] leading-[1.2] text-[#062C55] mb-1.5">
        Money offered
      </h3>
      <p className="font-sans text-[14.5px] text-[#5A6B78] leading-[21px] mb-4">
        {conflictLead}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div
          className={`rounded-[12px] p-4 flex flex-col justify-between transition border ${
            selectedChoice === "document"
              ? "bg-[#EEF8F3] border-[#0C8F72] ring-1 ring-[#0C8F72]"
              : "bg-[#FAF9F5] border-[#E7E4DD]"
          }`}
        >
          <div>
            <span className="font-sans text-[12.5px] font-[600] text-[#5A6B78] block">
              {docLabel}
            </span>
            <span className="font-sans font-bold text-[19px] text-[#062C55] block mt-0.5">
              {docDisplay || "—"}
            </span>
            {docQuote && (
              <p className="font-serif italic text-[13px] text-[#5A6B78] mt-2 mb-3 leading-[18px]">
                &ldquo;{docQuote}&rdquo;{docWhere ? ` · ${docWhere}` : ""}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onChoose("document")}
            className={`w-full h-[40px] mt-3 rounded-[8px] font-sans font-[700] text-[13.5px] transition cursor-pointer flex items-center justify-center gap-1.5 ${
              selectedChoice === "document"
                ? "bg-[#0C8F72] text-white"
                : "border border-[#0C8F72] text-[#0C8F72] bg-white hover:bg-[#0C8F72]/5"
            }`}
          >
            {selectedChoice === "document" ? "✓ Selected" : "Use this"}
          </button>
        </div>

        <div
          className={`rounded-[12px] p-4 flex flex-col justify-between transition border ${
            selectedChoice === "answers"
              ? "bg-[#EEF8F3] border-[#0C8F72] ring-1 ring-[#0C8F72]"
              : "bg-[#FAF9F5] border-[#E7E4DD]"
          }`}
        >
          <div>
            <span className="font-sans text-[12.5px] font-[600] text-[#5A6B78] block">
              You told us
            </span>
            <span className="font-sans font-bold text-[19px] text-[#062C55] block mt-0.5">
              {intakeDisplay || "—"}
            </span>
            <p className="font-sans text-[12.5px] text-[#5A6B78] mt-2 mb-3 leading-[17px]">
              Based on your initial intake answers.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChoose("answers")}
            className={`w-full h-[40px] mt-3 rounded-[8px] font-sans font-[700] text-[13.5px] transition cursor-pointer flex items-center justify-center gap-1.5 ${
              selectedChoice === "answers"
                ? "bg-[#0C8F72] text-white"
                : "border border-[#0C8F72] text-[#0C8F72] bg-white hover:bg-[#0C8F72]/5"
            }`}
          >
            {selectedChoice === "answers" ? "✓ Selected" : "Use this"}
          </button>
        </div>
      </div>

      <div className="mt-4">
        {!showCustom ? (
          <button
            type="button"
            onClick={() => onShowCustom(true)}
            className="font-sans text-[13.5px] font-[700] text-[#0C8F72] underline hover:opacity-80 cursor-pointer"
          >
            Something else
          </button>
        ) : (
          <div className="p-3.5 bg-[#FAF9F5] border border-[#E7E4DD] rounded-[10px] mt-2 space-y-3">
            <label className="block text-[13px] font-[700] text-[#062C55]">
              Enter correct offer amount in dollars:
            </label>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="e.g. 25000"
                value={customVal}
                onChange={(e) => onCustomValChange(e.target.value)}
                className="h-[38px] px-3 rounded-[8px] border border-[#D8D3C8] bg-white text-[14px] text-[#062C55] w-full sm:w-[180px]"
              />
              <button
                type="button"
                onClick={() => {
                  if (customVal) {
                    onChoose("custom", customVal);
                  }
                }}
                className="h-[38px] px-4 rounded-[8px] bg-[#062C55] text-white text-[13px] font-bold cursor-pointer"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => onShowCustom(false)}
                className="h-[38px] px-3 rounded-[8px] border border-[#D8D3C8] text-[#5A6B78] text-[13px] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </ConfirmationCardModal>
  );
}
