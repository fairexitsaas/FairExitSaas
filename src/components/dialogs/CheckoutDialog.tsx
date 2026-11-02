"use client";

import React, { useState, useEffect, useRef } from "react";

export interface CheckoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  amount?: string;
  onPay: (paymentMethod: "apple_pay" | "card", cardDetails?: { number: string; exp: string; cvc: string }) => Promise<void>;
  isProcessing?: boolean;
  errorMessage?: string;
}

export default function CheckoutDialog({
  isOpen,
  onClose,
  email,
  amount = "$59.00",
  onPay,
  isProcessing = false,
  errorMessage = "",
}: CheckoutDialogProps) {
  const [cardValue, setCardValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isProcessing) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isProcessing]);

  if (!isOpen) return null;

  const handleCardPay = (e: React.FormEvent) => {
    e.preventDefault();
    onPay("card", { number: cardValue, exp: "12/28", cvc: "123" });
  };

  const handleApplePay = () => {
    onPay("apple_pay");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Secure checkout"
    >
      {/* Backdrop scrim */}
      <div
        className="fixed inset-0 bg-[#062C55]/60 backdrop-blur-xs transition-opacity"
        onClick={() => {
          if (!isProcessing) onClose();
        }}
      />

      {/* Checkout Box (max-w-[400px]) */}
      <div className="relative w-full max-w-[400px] bg-white rounded-[16px] p-6 shadow-[0_40px_90px_-30px_rgba(6,44,85,0.6)] border border-[#E7E4DD] z-10 animate-dlgup">
        {/* Header row */}
        <div className="flex items-center justify-between text-[12px] font-sans font-[700] text-[#5A6B78] mb-1">
          <span>Secure checkout</span>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="w-[32px] h-[32px] rounded-full border border-[#E7E4DD] bg-white hover:bg-[#F6F4EF] text-[#5A6B78] flex items-center justify-center text-[14px] font-bold transition disabled:opacity-50"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Amount */}
        <div className="font-serif font-[600] text-[32px] sm:text-[34px] leading-tight text-[#062C55] my-1">
          {amount}
        </div>

        {/* Subtitle */}
        <div className="font-sans text-[13px] leading-[18px] text-[#5A6B78] mb-4">
          FairExit Severance Report · one-time · receipt to{" "}
          <b className="text-[#062C55] break-all">{email || "you@example.com"}</b>
        </div>

        {/* Apple Pay Button */}
        <button
          type="button"
          disabled={isProcessing}
          onClick={handleApplePay}
          className="w-full h-[48px] bg-black hover:bg-neutral-900 text-white rounded-[9px] font-sans font-[700] text-[15px] flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-xs"
        >
          <svg className="h-[17px] w-auto fill-current" viewBox="0 0 50 21">
            <path d="M9.16 8.52c-.67.82-1.74 1.37-2.67 1.31-.13-.93.3-1.95.89-2.61.64-.75 1.77-1.3 2.62-1.34.11.97-.24 1.94-.84 2.64zm.84 1.34c-1.47-.09-2.73.86-3.44.86-.71 0-1.76-.8-2.92-.78-1.51.02-2.9 .89-3.68 2.27-1.57 2.76-.41 6.83 1.13 9.04.75 1.09 1.64 2.3 2.82 2.26 1.14-.05 1.58-.74 2.96-.74 1.37 0 1.77.74 2.96.71 1.22-.02 1.99-1.1 2.74-2.19.86-1.27 1.22-2.5 1.24-2.56-.03-.01-2.4-.93-2.43-3.66-.02-2.29 1.84-3.39 1.93-3.45-1.06-1.57-2.7-1.75-3.31-1.76z" />
            <path d="M21.24 4.5h3.69c2.61 0 4.19 1.55 4.19 3.89 0 2.37-1.61 3.91-4.24 3.91h-1.89v5.2H21.24V4.5zm3.56 6.07c1.55 0 2.45-.88 2.45-2.18s-.9-2.16-2.45-2.16h-1.81v4.34h1.81zm9.84 7.06c-1.87 0-3.32-1.18-3.4-2.75h1.75c.14.82.88 1.34 1.73 1.34 1.01 0 1.63-.52 1.63-1.27 0-.74-.52-1.12-1.69-1.43l-1.07-.29c-1.81-.48-2.61-1.39-2.61-2.75 0-1.83 1.53-3.08 3.55-3.08 1.91 0 3.26 1.18 3.32 2.66h-1.75c-.1-.73-.78-1.22-1.63-1.22-.97 0-1.55.51-1.55 1.2 0 .67.54 1.05 1.61 1.34l.95.26c1.97.52 2.82 1.38 2.82 2.85 0 1.84-1.48 3.14-3.71 3.14zm10.74-.13v-1.42c-.63.99-1.69 1.55-2.98 1.55-2.2 0-3.62-1.61-3.62-3.86 0-2.29 1.45-3.87 3.62-3.87 1.25 0 2.29.53 2.92 1.5v-1.39h1.75v7.49h-1.69zm-2.88-1.42c1.39 0 2.36-1.07 2.36-2.44 0-1.39-.97-2.44-2.36-2.44-1.36 0-2.33 1.05-2.33 2.44 0 1.37.97 2.44 2.33 2.44z" />
          </svg>
        </button>

        {/* Divider */}
        <div className="text-center font-sans text-[12px] text-[#5A6B78] my-3">
          or pay with card
        </div>

        {/* Card Form */}
        <form onSubmit={handleCardPay}>
          <div className="relative mb-3">
            <input
              ref={inputRef}
              type="text"
              value={cardValue}
              onChange={(e) => setCardValue(e.target.value)}
              placeholder="Card number · MM / YY · CVC"
              className="w-full h-[46px] px-3.5 rounded-[10px] border-[1.5px] border-[#CFD8DF] focus:border-[#0EB28D] font-sans text-[14px] text-[#062C55] placeholder-[#9AA6B1] outline-none transition-colors"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[#9AA6B1]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="2" y="5" width="20" height="14" rx="2" strokeWidth="1.5" />
                <line x1="2" y1="10" x2="22" y2="10" strokeWidth="1.5" />
              </svg>
            </div>
          </div>

          {errorMessage && (
            <div className="p-2.5 mb-3 bg-[#FBECEB] text-[#A3231F] text-[12.5px] rounded-lg">
              {errorMessage}
            </div>
          )}

          {/* Pay Button */}
          <button
            type="submit"
            disabled={isProcessing}
            className="w-full h-[50px] rounded-[11px] bg-[#12C79A] hover:bg-[#0EB28D] text-white font-sans font-[800] text-[15px] sm:text-[16px] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 shadow-xs"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing…
              </span>
            ) : (
              `Pay ${amount} + applicable tax →`
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="font-sans text-[11.5px] text-[#5A6B78] text-center mt-3 leading-normal">
          Payments are handled by Stripe: Apple Pay, Google Pay or card. We never see or store your card number.
        </div>
      </div>
    </div>
  );
}

