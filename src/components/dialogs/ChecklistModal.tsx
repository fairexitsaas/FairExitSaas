"use client";

import React, { useState } from "react";

interface ChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLawyerModal: () => void;
  country?: "US" | "CA";
  contractType?: "signed" | "none";
}

export default function ChecklistModal({
  isOpen,
  onClose,
  onOpenLawyerModal,
  country = "US",
  contractType = "signed",
}: ChecklistModalProps) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  if (!isOpen) return null;

  const handleSend = () => {
    if (!email || email.includes("@")) {
      setSent(true);
      setTimeout(() => {
        // keep open with success state or auto close
      }, 1500);
    }
  };

  const isUS = country === "US";
  const professionalWord = isUS ? "an attorney" : "a lawyer";

  const clauseText =
    contractType === "none"
      ? "You told us there's no written contract — that usually means the minimum is not the ceiling. Worth one free call before you sign."
      : "A signed release is usually final. Read the release paragraph twice.";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#062c55]/45 backdrop-blur-[2px] animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-[16px] p-5 sm:p-6 max-w-[420px] w-full max-h-[92vh] overflow-y-auto shadow-[0_40px_80px_-30px_rgba(6,44,85,0.55)] border border-[#e7e4dd] text-left animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-sans font-[800] text-[11px] uppercase tracking-[0.6px] text-[#0c8f72] mb-1.5">
          Your free 3-point checklist
        </div>

        <h3 className="font-serif font-[600] text-[22px] sm:text-[24px] text-[#062c55] leading-tight mb-2">
          Taking the offer? 3 things to check first.
        </h3>

        <p className="font-sans font-normal text-[13px] leading-[19px] text-[#5a6b78] mb-4">
          Taking the offer as-is is a fine choice — plenty of people do. Just make
          sure of these. Information, not legal advice.
        </p>

        {/* 3 Checklist Items Box */}
        <div className="rounded-[12px] bg-[#f0f9f5] border border-[#c7e6d6] p-3.5 sm:p-4 space-y-3.5 mb-4">
          <div>
            <div className="font-sans font-[800] text-[11px] uppercase tracking-[0.6px] text-[#0c7a60] mb-0.5">
              1 · The deadline
            </div>
            <div className="font-sans font-normal text-[12.5px] leading-[18px] text-[#12523f]">
              It&apos;s theirs, not the law&apos;s. Asking for a few more days in
              writing is normal — and creates a record.
            </div>
          </div>

          <div>
            <div className="font-sans font-[800] text-[11px] uppercase tracking-[0.6px] text-[#0c7a60] mb-0.5">
              2 · What you give up
            </div>
            <div className="font-sans font-normal text-[12.5px] leading-[18px] text-[#12523f]">
              {clauseText}
            </div>
          </div>

          <div>
            <div className="font-sans font-[800] text-[11px] uppercase tracking-[0.6px] text-[#0c7a60] mb-0.5">
              3 · Floor vs. range
            </div>
            <div className="font-sans font-normal text-[12.5px] leading-[18px] text-[#12523f]">
              The legal minimum is a floor, not a ceiling. Your results above shows
              where your offer sits.
            </div>
          </div>
        </div>

        {sent ? (
          <div className="py-3 px-4 bg-[#e6f5ef] border border-[#b9e6d4] rounded-[10px] text-center font-sans font-[700] text-[13.5px] text-[#0c7a60] mb-3">
            ✓ Sent — checklist on its way to {email || "your email"}!
          </div>
        ) : (
          <div className="space-y-2.5 mb-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com (optional)"
              className="w-full border border-[#cdd3d8] rounded-[10px] px-3.5 py-2.5 text-[13.5px] text-[#17242f] placeholder-[#8a98a4] focus:outline-none focus:border-[#0c8f72]"
            />
            <button
              type="button"
              onClick={handleSend}
              className="w-full py-3 rounded-[9px] bg-[#0c8f72] hover:bg-[#0aa07e] text-white font-sans font-[700] text-[14px] leading-[20px] transition-colors cursor-pointer text-center shadow-xs"
            >
              Email me this checklist
            </button>
          </div>
        )}

        {/* Link from Photo 4 */}
        <div className="text-center mt-3 pt-1">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenLawyerModal();
            }}
            className="w-full text-center font-sans font-[600] text-[13px] leading-[18px] text-[#5a6b78] hover:text-[#062c55] hover:underline cursor-pointer"
          >
            Changed your mind? Talking to {professionalWord} is still free →
          </button>
        </div>

        <div className="text-center mt-2">
          <button
            type="button"
            onClick={onClose}
            className="font-sans font-normal text-[12.5px] text-[#8a98a4] hover:text-[#5a6b78] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
