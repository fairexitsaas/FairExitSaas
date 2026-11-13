"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";

export interface CheckoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  email?: string;
  amount?: string;
  onPay: (paymentMethod: "apple_pay" | "card", cardDetails?: { number: string; exp: string; cvc: string }) => Promise<void>;
  isProcessing?: boolean;
  errorMessage?: string;
}

export default function CheckoutDialog({
  isOpen,
  onClose,
  email = "",
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
          FairExit Severance Report · one-time · encrypted &amp; secure
        </div>

        {/* Apple Pay Button */}
        <button
          type="button"
          disabled={isProcessing}
          onClick={handleApplePay}
          className="w-full h-[48px] bg-black hover:bg-neutral-900 text-white rounded-[9px] font-sans font-[700] text-[15px] flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-xs"
        >
          <Image
            src="/apple-pay.svg"
            alt="Apple Pay"
            width={41}
            height={26}
            className="h-[26px] w-auto rounded-[6px]"
          />
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

