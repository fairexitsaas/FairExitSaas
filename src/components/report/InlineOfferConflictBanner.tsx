"use client";

import React from "react";

export interface InlineOfferConflictBannerProps {
  docSourceText: string;
  docDisplay: string;
  docQuote?: string;
  keepDisplay: string;
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
  onUseDocument,
  onKeepCurrent,
  onAddClearerCopy,
}: InlineOfferConflictBannerProps) {
  return (
    <div
      data-testid="offer-inline-confirmation"
      className="bg-[#FAF9F5] border border-[#E7E4DD] border-l-4 border-l-[#B07A00] rounded-[8px] p-3.5 sm:p-4 mt-3.5 animate-in fade-in duration-200"
    >
      <p className="font-sans text-[13.5px] text-[#062C55] mb-3 break-words">
        We looked again. {docSourceText}{" "}
        <span className="font-semibold">{docDisplay || "—"}</span>
        {docQuote ? (
          <span className="block font-serif italic font-medium mt-1 text-[#17242F]">
            &ldquo;{docQuote.replace(/^"|"$/g, "")}&rdquo;
          </span>
        ) : null}
      </p>
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={onUseDocument}
          className="h-[36px] px-4 rounded-[7px] bg-[#062C55] hover:bg-[#041D38] text-white font-[700] text-[13px] transition cursor-pointer"
        >
          Use {docDisplay || "document value"}
        </button>
        <button
          type="button"
          onClick={onKeepCurrent}
          className="h-[36px] px-4 rounded-[7px] bg-white border border-[#D8D3C8] text-[#062C55] font-[700] text-[13px] hover:bg-[#F6F4EF] transition cursor-pointer"
        >
          Keep {keepDisplay || "my value"}
        </button>
        <button
          type="button"
          onClick={onAddClearerCopy}
          className="text-[12.5px] font-[600] text-[#0C8F72] hover:underline cursor-pointer sm:ml-1"
        >
          Add a clearer copy
        </button>
      </div>
    </div>
  );
}
