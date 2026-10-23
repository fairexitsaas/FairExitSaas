"use client";

import React from "react";
import { CountryCode } from "@/context/CountryContext";

interface TheOutputProps {
  country: CountryCode;
}

export default function TheOutput({ country }: TheOutputProps) {
  const isCanada = country === "CA";

  if (isCanada) {
    return (
      <section className="py-12 sm:pb-16 pt-0 mx-auto mt-2 sm:mt-3">
        <div className="wrap max-w-[1040px] mx-auto px-4 sm:px-6 w-full box-border">
          <div className="bg-brand-navy rounded-3xl p-5 sm:p-8 md:p-12 text-white text-center w-full mx-auto shadow-[0_20px_50px_rgba(6,44,85,0.25)] box-border">
            <span className="inline-flex items-center text-xs font-extrabold uppercase tracking-[1.4px] text-[#7ff0cf]">
              The output
            </span>
            <h2 className="font-serif text-[24px] sm:text-[28px] text-white font-semibold my-2 sm:my-2.5 mb-3 sm:mb-3.5 leading-[1.15] tracking-[-0.5px]">
              We don&apos;t guess your number. We help you make sense of the offer.
            </h2>
            <p className="text-[14.5px] sm:text-[15.5px] text-[#cfe0f0] leading-[1.6] max-w-[740px] mx-auto mb-5">
              The law changes and every situation turns on the details — so instead of a false-precision dollar figure, you get a clear, plain-language read and a real lawyer who can give you the actual answer.
            </p>
            <div className="inline-flex flex-wrap items-center justify-center gap-2 bg-white/10 border border-white/20 rounded-lg py-2 px-3.5 sm:px-[22px] text-xs sm:text-[13.5px] font-semibold text-[#7ff0cf]">
              <span>✓ You keep a plain-English summary</span>
              <span className="hidden sm:inline">&nbsp;·&nbsp;</span>
              <span>✓ Your lawyer gets the facts they need</span>
            </div>
            <div className="mt-3.5 text-xs sm:text-[13px] text-[#9fc0da] leading-relaxed">
              📚 Information pulled from{" "}
              <b className="text-[#7ff0cf] font-bold">official federal &amp; provincial sources</b> and organized with affiliated legal professionals.
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 sm:py-16 mx-auto">
      <div className="wrap max-w-[1040px] mx-auto px-4 sm:px-6 w-full box-border">
        <div className="bg-brand-navy rounded-3xl p-5 sm:p-8 md:p-12 text-white text-center w-full mx-auto shadow-[0_20px_50px_rgba(6,44,85,0.25)] box-border">
          <span className="inline-flex items-center text-xs font-extrabold uppercase tracking-[1.4px] text-[#7ff0cf]">
            The output
          </span>
          <h2 className="font-serif text-[24px] sm:text-[28px] text-white font-semibold my-2 sm:my-2.5 mb-3 sm:mb-3.5 leading-[1.15] tracking-[-0.5px]">
            A plain-English read — not a score, not a dollar figure.
          </h2>
          <p className="text-[14.5px] sm:text-[15.5px] text-[#cfe0f0] leading-[1.6] max-w-[740px] mx-auto mb-5">
            US severance isn&apos;t set by law, so we don&apos;t guess a number — and we don&apos;t grade your employer. Instead you get a plain read of the federal rules that may apply, the specific things worth double-checking, and how to confirm each one with an attorney.
          </p>
          <div className="inline-flex flex-wrap items-center justify-center gap-2 bg-white/10 border border-white/20 rounded-2xl sm:rounded-full py-2 px-3.5 sm:px-[22px] text-xs sm:text-[13.5px] font-semibold text-[#7ff0cf]">
            <span>✓ Plain-English notes</span>
            <span className="hidden sm:inline">&nbsp;·&nbsp;</span>
            <span>✓ Questions to prepare</span>
            <span className="hidden sm:inline">&nbsp;·&nbsp;</span>
            <span>✓ When an attorney is worth it</span>
          </div>
        </div>
      </div>
    </section>
  );
}
