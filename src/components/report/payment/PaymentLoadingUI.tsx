"use client";

import React from "react";

interface PaymentLoadingUIProps {
  title?: string;
  subtitle?: string;
  stage?: "redirecting" | "verifying" | "preparing";
  fullScreen?: boolean;
}

export default function PaymentLoadingUI({
  title = "Verifying your payment…",
  subtitle = "Securely confirming your transaction with Stripe…",
  stage = "verifying",
  fullScreen = false,
}: PaymentLoadingUIProps) {
  const content = (
    <div className="relative w-full max-w-[440px] bg-white rounded-[20px] p-7 sm:p-9 border border-[#E7E4DD] shadow-[0px_24px_60px_-15px_rgba(6,44,85,0.18)] text-center animate-fadein">
      {/* FairExit Payment-Only Animated Dual Ring & Security Shield */}
      <div className="relative w-[72px] h-[72px] mx-auto mb-6 flex items-center justify-center">
        {/* Soft cream/navy outer track */}
        <div className="absolute inset-0 rounded-full border-[3px] border-[#E8ECEF]" />
        {/* Spinning green active indicator */}
        <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-[#12C79A] border-r-[#0EB28D] animate-spin" />
        {/* Center lock/shield icon */}
        <div className="w-[38px] h-[38px] rounded-full bg-[#FAF8F5] border border-[#E7E4DD] flex items-center justify-center text-[#062C55] shadow-xs">
          <svg className="w-5 h-5 text-[#062C55]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
      </div>

      {/* Main Title */}
      <h3 className="font-serif font-[700] text-[21px] sm:text-[23px] leading-[29px] text-[#062C55] mb-2">
        {title}
      </h3>

      {/* Subtitle */}
      <p className="font-sans text-[13.5px] leading-[20px] text-[#5A6B78] mb-6">
        {subtitle}
      </p>

      {/* FairExit Security Reassurance Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F6F4EF] border border-[#E7E4DD] text-[11.5px] font-sans font-semibold text-[#5A6B78]">
        <svg className="w-3.5 h-3.5 text-[#0EB28D]" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        <span>256-bit encrypted · SSL certified · Stripe Payments</span>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-[#F6F4EF] flex items-center justify-center p-4">
        {content}
      </div>
    );
  }

  return content;
}
