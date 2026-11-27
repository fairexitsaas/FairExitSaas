"use client";

import React from "react";

export interface InlineOfferConflictBannerProps {
  docSourceText: string;
  docDisplay: string;
  docQuote?: string;
  keepDisplay: string;
  busy?: boolean;
  error?: string | null;
  onUseDocument: () => void;
  onKeepCurrent: () => void;
  onAddClearerCopy: () => void;
}

/**
 * Inline offer amount conflict confirmation panel rendered inside the
 * "Money offered" checklist item directly beneath its Yes / Change controls.
 */
export function InlineOfferConflictBanner({
  docSourceText,
  docDisplay,
  docQuote,
  keepDisplay,
  busy = false,
  error,
  onUseDocument,
  onKeepCurrent,
  onAddClearerCopy,
}: InlineOfferConflictBannerProps) {
  return (
    <div
      data-testid="offer-inline-confirmation"
      className="needs-pick bg-[#FFF8F8] border-2 border-[#D42E2B] border-l-4 border-l-[#D42E2B] rounded-[8px] p-3.5 sm:p-4 mt-3.5 animate-in fade-in duration-200"
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#D42E2B] text-white text-[11px] font-[700] uppercase tracking-wider">
          Mismatch
        </span>
        <span className="text-[12.5px] font-[700] text-[#9E1F1D]">
          Please choose which value is correct.
        </span>
      </div>
      {error ? (
        <div
          role="alert"
          className="mb-3 rounded-[8px] bg-[#FBECEB] border border-[#F5C6C5] px-3 py-2 text-[13px] font-[600] text-[#A3231F]"
        >
          {error}
        </div>
      ) : null}
      <p className="font-sans text-[13.5px] text-[#062C55] mb-2 break-words">
        We looked again. {docSourceText}{" "}
        <span className="font-semibold">{docDisplay || "—"}</span>
        {docQuote ? (
          <span className="block font-serif italic font-medium mt-1 text-[#17242F]">
            &ldquo;{docQuote.replace(/^"|"$/g, "")}&rdquo;
          </span>
        ) : null}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 text-[12.5px]">
        <div className="rounded-[6px] bg-white border border-[#E7E4DD] px-2.5 py-1.5">
          <span className="text-[#5A6B78] block text-[11px] font-[600]">Your answer</span>
          <span className="font-[700] text-[#062C55]">{keepDisplay || "—"}</span>
        </div>
        <div className="rounded-[6px] bg-white border border-[#E7E4DD] px-2.5 py-1.5">
          <span className="text-[#5A6B78] block text-[11px] font-[600]">Document says</span>
          <span className="font-[700] text-[#062C55]">{docDisplay || "—"}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          disabled={busy}
          onClick={onUseDocument}
          className="h-[36px] px-4 rounded-[7px] bg-[#062C55] hover:bg-[#041D38] disabled:opacity-50 disabled:cursor-not-allowed text-white font-[700] text-[13px] transition cursor-pointer"
        >
          Use {docDisplay || "document value"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onKeepCurrent}
          className="h-[36px] px-4 rounded-[7px] bg-white border border-[#D8D3C8] text-[#062C55] font-[700] text-[13px] hover:bg-[#F6F4EF] disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
        >
          Keep {keepDisplay || "my value"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onAddClearerCopy}
          className="text-[12.5px] font-[600] text-[#0C8F72] hover:underline disabled:opacity-50 cursor-pointer sm:ml-1"
        >
          Add a clearer copy
        </button>
      </div>
    </div>
  );
}
