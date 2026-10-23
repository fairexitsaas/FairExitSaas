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
      <section className="py-16 pt-0 mx-auto mt-3">
        <div className="wrap max-w-[1040px] mx-auto px-6 w-full box-border">
          <div className="bg-brand-navy rounded-3xl p-8 sm:p-12 text-white text-center w-full mx-auto shadow-[0_20px_50px_rgba(6,44,85,0.25)] box-border">
            <span className="inline-flex items-center text-xs font-extrabold uppercase tracking-[1.4px] text-[#7ff0cf]">
              The output
            </span>
            <h2 className="font-serif text-[28px] text-white font-semibold my-2.5 mb-3.5 leading-[1.1] tracking-[-0.5px]">
              We don&apos;t guess your number. We help you make sense of the offer.
            </h2>
            <p className="text-[15.5px] text-[#cfe0f0] leading-[1.6] max-w-[740px] mx-auto mb-5">
              The law changes and every situation turns on the details — so instead of a false-precision dollar figure, you get a clear, plain-language read and a real lawyer who can give you the actual answer.
            </p>
            <div className="inline-flex flex-wrap items-center justify-center gap-2 bg-white/10 border border-white/20 rounded-full py-2 px-[22px] text-[13.5px] font-semibold text-[#7ff0cf]">
              ✓ You keep a plain-English summary &nbsp;·&nbsp; ✓ Your lawyer gets the facts they need
            </div>
            <div className="mt-3.5 text-[13px] text-[#9fc0da]">
              📚 Information pulled from{" "}
              <b className="text-[#7ff0cf] font-bold">official federal &amp; provincial sources</b> and organized with affiliated legal professionals.
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 mx-auto">
      <div className="wrap max-w-[1040px] mx-auto px-6 w-full box-border">
        <div className="bg-brand-navy rounded-3xl p-8 sm:p-12 text-white text-center w-full mx-auto shadow-[0_20px_50px_rgba(6,44,85,0.25)] box-border">
          <span className="inline-flex items-center text-xs font-extrabold uppercase tracking-[1.4px] text-[#7ff0cf]">
            The output
          </span>
          <h2 className="font-serif text-[28px] text-white font-semibold my-2.5 mb-3.5 leading-[1.1] tracking-[-0.5px]">
            A plain-English read — not a score, not a dollar figure.
          </h2>
          <p className="text-[15.5px] text-[#cfe0f0] leading-[1.6] max-w-[740px] mx-auto mb-5">
            US severance isn&apos;t set by law, so we don&apos;t guess a number — and we don&apos;t grade your employer. Instead you get a plain read of the federal rules that may apply, the specific things worth double-checking, and how to confirm each one with an attorney.
          </p>
          <div className="inline-flex flex-wrap items-center justify-center gap-2 bg-white/10 border border-white/20 rounded-full py-2 px-[22px] text-[13.5px] font-semibold text-[#7ff0cf]">
            ✓ Plain-English notes &nbsp;·&nbsp; ✓ Questions to prepare &nbsp;·&nbsp; ✓ When an attorney is worth it
          </div>
        </div>
      </div>
    </section>
  );
}
