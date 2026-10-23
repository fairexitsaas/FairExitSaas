"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { CountryCode } from "@/context/CountryContext";

interface BottomCtaProps {
  country: CountryCode;
}

export default function BottomCta({ country }: BottomCtaProps) {
  const router = useRouter();
  const isCanada = country === "CA";

  const handleStartRead = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isCanada) {
      router.push("/questions");
      return;
    }
    const el =
      document.getElementById("state") ||
      document.getElementById("hero");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus();
    }
  };

  if (isCanada) {
    return (
      <section className="py-[68px] pb-[60px] mx-auto">
        <div className="wrap max-w-[1040px] mx-auto px-6 w-full box-border text-center">
          <span className="inline-flex items-center text-xs font-extrabold uppercase tracking-[1.4px] text-greend">
            You don&apos;t have to sign today
          </span>
          <h2 className="font-serif text-2xl sm:text-[32px] text-navy dark:text-white font-semibold leading-[1.1] tracking-[-0.5px] mt-2">
            Make sense of your offer — free, in 60 seconds.
          </h2>
          <div className="mt-6">
            <a
              className="inline-flex items-center justify-center gap-1.5 bg-green hover:bg-greend text-white px-7 py-3.5 rounded-[14px] font-bold text-base no-underline border-none cursor-pointer shadow-button hover:shadow-button-hover active:scale-[0.98] transition-all whitespace-nowrap"
              href={isCanada ? "/questions" : "#hero"}
              onClick={handleStartRead}
            >
              Start my 60-second read →
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="wrap max-w-[1040px] mx-auto px-6 w-full box-border">
      <div className="bg-brand-navy rounded-3xl p-8 sm:p-[50px_32px] text-center text-white my-10 mx-auto shadow-[0_16px_40px_rgba(6,44,85,0.2)]">
        <span className="inline-flex items-center text-xs font-extrabold uppercase tracking-[1.4px] text-[#7ff0cf]">
          You don&apos;t have to sign today
        </span>
        <h2 className="font-serif text-2xl sm:text-[32px] text-white font-semibold leading-[1.1] tracking-[-0.5px] mt-2">
          Make sense of your separation offer — free, in 60 seconds.
        </h2>
        <div className="mt-5">
          <a
            className="inline-flex items-center justify-center gap-1.5 bg-green hover:bg-greend text-white px-7 py-3.5 rounded-[14px] font-bold text-base no-underline border-none cursor-pointer shadow-button hover:shadow-button-hover active:scale-[0.98] transition-all whitespace-nowrap"
            href="#hero"
            onClick={handleStartRead}
          >
            Start my 60-second read →
          </a>
        </div>
      </div>
    </section>
  );
}
