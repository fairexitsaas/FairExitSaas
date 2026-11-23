"use client";

import React, { useContext, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import FloatingActions from "@/components/landing/FloatingActions";
import { CountryContext, CountryCode } from "@/context/CountryContext";

function AboutContent() {
  const context = useContext(CountryContext);
  const searchParams = useSearchParams();
  const urlCountry = searchParams?.get("country")?.toUpperCase();

  const currentCountry: CountryCode =
    urlCountry === "US" || urlCountry === "CA"
      ? (urlCountry as CountryCode)
      : context?.Country || "CA";

  const isCanada = currentCountry === "CA";

  const handleCountrySwitch = (nextCountry: CountryCode) => {
    if (context) context.setCountry(nextCountry);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f4ef] dark:bg-[#062c55] text-[#17242f] dark:text-[#eaf2f8] transition-colors">
      <Navbar country={currentCountry} onCountrySwitch={handleCountrySwitch} />

      <main className="flex-1 w-full">
        {/* 1. HEADLINE */}
        <section className="pt-12 sm:pt-16 pb-8 text-center px-4 sm:px-6 max-w-[1040px] mx-auto">
          <span className="text-xs font-extrabold tracking-[1.4px] uppercase text-[#0c8f72] dark:text-[#0eb28d] block mb-2">
            OUR STORY
          </span>
          <h1 className="font-serif font-semibold text-3xl sm:text-5xl text-[#062c55] dark:text-white leading-[1.12] tracking-[-0.5px] max-w-[760px] mx-auto mb-4">
            We built this because we&apos;ve{" "}
            <em className="italic text-[#0c8f72] dark:text-[#0eb28d]">been there.</em>
          </h1>
          <p className="text-base sm:text-lg text-[#5a6b78] dark:text-[#9ab1c6] max-w-[640px] mx-auto leading-relaxed">
            Two people who&apos;ve sat on the other side of that table, building the tool we wish we&apos;d had.
          </p>
        </section>

        {/* 2. FOUNDERS (Prominently at the top, right under the headline) */}
        <section className="pb-12 sm:pb-16 px-4 sm:px-6 max-w-[880px] mx-auto w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-7">
            {/* Founder 1: Sundeep Parmar */}
            <div className="bg-white dark:bg-[#0d2238] border border-[#e7e4dd] dark:border-[#1e3b5c] rounded-2xl p-6 sm:p-7 text-center shadow-xs flex flex-col items-center">
              <div className="relative w-[140px] h-[140px] sm:w-[150px] sm:h-[150px] rounded-full overflow-hidden mb-4 border-2 border-[#e7e4dd] dark:border-[#1e3b5c] shadow-sm shrink-0">
                <Image
                  src="/founder-sundeep.jpg"
                  alt="Sundeep Parmar"
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 640px) 140px, 150px"
                  priority
                />
              </div>
              <h2 className="font-serif font-semibold text-xl sm:text-[22px] text-[#062c55] dark:text-white mb-0.5">
                Sundeep Parmar
              </h2>
              <div className="text-xs font-extrabold tracking-[0.6px] uppercase text-[#0c8f72] dark:text-[#0eb28d] mb-3">
                Co-founder
              </div>
              <p className="text-sm sm:text-[14.5px] text-[#5a6b78] dark:text-[#9ab1c6] leading-relaxed">
                Laid off more than once, and handed the papers every time. He signed every one without knowing what he could ask for. Sundeep built FairExit so the next person walks in knowing their options, not just where to sign.
              </p>
            </div>

            {/* Founder 2: Riaz Ladha */}
            <div className="bg-white dark:bg-[#0d2238] border border-[#e7e4dd] dark:border-[#1e3b5c] rounded-2xl p-6 sm:p-7 text-center shadow-xs flex flex-col items-center">
              <div className="relative w-[140px] h-[140px] sm:w-[150px] sm:h-[150px] rounded-full overflow-hidden mb-4 border-2 border-[#e7e4dd] dark:border-[#1e3b5c] shadow-sm shrink-0">
                <Image
                  src="/founder-riaz.jpg"
                  alt="Riaz Ladha"
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 640px) 140px, 150px"
                  priority
                />
              </div>
              <h2 className="font-serif font-semibold text-xl sm:text-[22px] text-[#062c55] dark:text-white mb-0.5">
                Riaz Ladha
              </h2>
              <div className="text-xs font-extrabold tracking-[0.6px] uppercase text-[#0c8f72] dark:text-[#0eb28d] mb-3">
                Co-founder
              </div>
              <p className="text-sm sm:text-[14.5px] text-[#5a6b78] dark:text-[#9ab1c6] leading-relaxed">
                Riaz has led teams and sat on the employer side of the table. He&apos;s had to let people go, and he&apos;s seen how quickly most people sign. He co-founded FairExit so the person getting let go has someone in their corner too.
              </p>
            </div>
          </div>
        </section>

        {/* 3. THE SHORT STORY (Cut from 6 paragraphs to 3) */}
        <section className="py-12 sm:py-16 bg-white dark:bg-[#09223d] border-y border-[#e7e4dd] dark:border-[#1e3b5c] px-4 sm:px-6">
          <div className="max-w-[720px] mx-auto text-left">
            <p className="font-serif text-xl sm:text-[24px] text-[#062c55] dark:text-white leading-[1.35] mb-5">
              A short meeting. A folder of papers. A pen. <strong className="font-bold">Sign here.</strong>
            </p>
            <p className="text-base sm:text-[17px] text-[#17242f] dark:text-[#d3e2ef] leading-[1.75] mb-5">
              In that moment you&apos;re angry, scared and in a hurry, and the paper looks final. It usually isn&apos;t the whole story, and you have more time and more options than it feels like.
            </p>
            <p className="text-base sm:text-[17px] text-[#17242f] dark:text-[#d3e2ef] leading-[1.75]">
              {isCanada
                ? "FairExit helps you make sense of the offer in plain English, so you can decide calmly. It's information, not legal advice."
                : "FairExit helps you make sense of the offer in plain English, so you can decide calmly. Software reads your documents; it doesn't decide your case. It's information, not legal advice."}
            </p>
          </div>
        </section>

        {/* 4. WHAT YOU CAN DO FROM HERE (3 small cards, no prices, no promises) */}
        <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-[920px] mx-auto">
          <div className="text-center mb-8">
            <span className="text-xs font-extrabold tracking-[1.4px] uppercase text-[#0c8f72] dark:text-[#0eb28d] block mb-2">
              OPTIONS
            </span>
            <h2 className="font-serif font-semibold text-2xl sm:text-[32px] text-[#062c55] dark:text-white leading-tight">
              What you can do from here
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            {/* Option 1 */}
            <div className="bg-white dark:bg-[#0d2238] border border-[#e7e4dd] dark:border-[#1e3b5c] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-extrabold tracking-[0.6px] uppercase text-[#0c8f72] dark:text-[#0eb28d] mb-1.5">
                  Option 1
                </div>
                <h3 className="font-serif font-semibold text-lg sm:text-[19px] text-[#062c55] dark:text-white mb-2">
                  Sign it
                </h3>
                <p className="text-sm text-[#5a6b78] dark:text-[#9ab1c6] leading-relaxed">
                  Knowing what&apos;s in it.
                </p>
              </div>
            </div>

            {/* Option 2 */}
            <div className="bg-white dark:bg-[#0d2238] border border-[#e7e4dd] dark:border-[#1e3b5c] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-extrabold tracking-[0.6px] uppercase text-[#0c8f72] dark:text-[#0eb28d] mb-1.5">
                  Option 2
                </div>
                <h3 className="font-serif font-semibold text-lg sm:text-[19px] text-[#062c55] dark:text-white mb-2">
                  Raise it yourself
                </h3>
                <p className="text-sm text-[#5a6b78] dark:text-[#9ab1c6] leading-relaxed">
                  With your questions organized.
                </p>
              </div>
            </div>

            {/* Option 3 */}
            <div className="bg-white dark:bg-[#0d2238] border border-[#e7e4dd] dark:border-[#1e3b5c] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-extrabold tracking-[0.6px] uppercase text-[#0c8f72] dark:text-[#0eb28d] mb-1.5">
                  Option 3
                </div>
                <h3 className="font-serif font-semibold text-lg sm:text-[19px] text-[#062c55] dark:text-white mb-2">
                  {isCanada ? "Talk to a lawyer" : "Talk to an attorney"}
                </h3>
                <p className="text-sm text-[#5a6b78] dark:text-[#9ab1c6] leading-relaxed">
                  Leave your details and we pass them on. Free, no obligation.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. ONE CTA BOX */}
        <section className="max-w-[860px] mx-auto px-4 sm:px-6 my-10">
          <div className="bg-[#062c55] dark:bg-[#071d34] text-white rounded-2xl p-6 sm:p-7 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border border-[#1a3b5c] shadow-md">
            <div>
              <h3 className="font-serif font-semibold text-xl sm:text-[22px] leading-tight mb-1">
                {isCanada ? "See where your own offer sits" : "Check your own agreement"}
              </h3>
              <p className="text-sm text-[#c9d6e5]">
                Free, about 3 minutes. No account, no sales call.
              </p>
            </div>
            <Link
              href={isCanada ? "/questions?country=CA" : "/questions?country=US"}
              className="w-full sm:w-auto text-center font-extrabold text-[15px] px-6 py-3 rounded-lg bg-gradient-to-b from-[#0eb28d] to-[#0c8f72] text-white shadow-md hover:brightness-105 active:scale-95 transition-all whitespace-nowrap"
            >
              {isCanada ? "Check my offer →" : "Check my layoff →"}
            </Link>
          </div>
        </section>
      </main>

      {/* 6. FOOTER: Standard home page footer without old "verdict / exact number" */}
      <Footer country={currentCountry} onCountrySwitch={handleCountrySwitch} />
      <FloatingActions />
    </div>
  );
}

export default function AboutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f6f4ef] dark:bg-[#062c55]" />}>
      <AboutContent />
    </Suspense>
  );
}
