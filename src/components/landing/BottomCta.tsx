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

  return (
    <section className="pt-8 sm:pt-10 pb-12 sm:pb-14 mx-auto" id="bottom-cta">
      <div className="wrap max-w-[1040px] mx-auto px-4 sm:px-6 w-full box-border text-center">
        <span className="inline-flex items-center text-xs font-extrabold uppercase tracking-[1.4px] text-greend">
          You don&apos;t have to sign today
        </span>
        <h2 className="font-serif text-2xl sm:text-[32px] text-navy dark:text-white font-semibold leading-[1.1] tracking-[-0.5px] mt-2">
          {isCanada
            ? "Make sense of your offer — free, in 60 seconds."
            : "Make sense of your separation offer — free, in 60 seconds."}
        </h2>
        <div className="mt-6">
          <a
            className="inline-flex items-center justify-center gap-1.5 bg-green hover:bg-greend text-white w-full sm:w-auto py-3.5 sm:py-[18px] px-6 sm:px-[30px] rounded-[14px] font-extrabold text-[16px] sm:text-[18px] no-underline border-none cursor-pointer shadow-button hover:shadow-button-hover active:scale-[0.98] transition-all text-center whitespace-normal sm:whitespace-nowrap"
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
