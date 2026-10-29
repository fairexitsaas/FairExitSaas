"use client";

import React, { useContext } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import FloatingActions from "@/components/landing/FloatingActions";
import { CountryContext, CountryCode } from "@/context/CountryContext";

export default function AboutPage() {
  const context = useContext(CountryContext);
  const currentCountry: CountryCode = context?.Country || "CA";
  const isCanada = currentCountry === "CA";

  const handleCountrySwitch = (nextCountry: CountryCode) => {
    if (context) context.setCountry(nextCountry);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f4ef] dark:bg-[#062c55] text-[#17242f] dark:text-[#eaf2f8] transition-colors">
      <Navbar country={currentCountry} onCountrySwitch={handleCountrySwitch} />

      <main className="flex-1 w-full">
        {/* HERO */}
        <section className="pt-12 sm:pt-16 pb-8 text-center px-4 sm:px-6 max-w-[1040px] mx-auto">
          <span className="text-xs font-extrabold tracking-[1.4px] uppercase text-[#0c8f72] dark:text-[#0eb28d] block mb-2">
            Our story
          </span>
          <h1 className="font-serif font-semibold text-3xl sm:text-5xl text-[#062c55] dark:text-white leading-[1.12] tracking-[-0.5px] max-w-[720px] mx-auto mb-4">
            We built this because we&apos;ve{" "}
            <em className="italic text-[#0c8f72] dark:text-[#0eb28d]">been there.</em>
          </h1>
          <p className="text-base sm:text-lg text-[#5a6b78] dark:text-[#9ab1c6] max-w-[600px] mx-auto leading-relaxed">
            FairExit didn&apos;t start as a business idea. It started with a folder of
            papers slid across a table, and a pen.
          </p>
        </section>

        {/* THE STORY */}
        <section className="py-12 sm:py-16 bg-white dark:bg-[#09223d] border-y border-[#e7e4dd] dark:border-[#1e3b5c] px-4 sm:px-6">
          <div className="max-w-[720px] mx-auto">
            <p className="font-serif italic text-2xl sm:text-[26px] text-[#062c55] dark:text-white leading-[1.3] mb-6">
              I&apos;ve been laid off more than once. Every time, it went the same way.
            </p>
            <p className="text-base sm:text-[17px] text-[#17242f] dark:text-[#d3e2ef] leading-[1.75] mb-5">
              A short meeting. A folder of papers slid across the table. A pen.{" "}
              <b className="font-bold text-[#062c55] dark:text-white">Sign here.</b>{" "}
              Then: pack up your things and go.
            </p>
            <p className="text-base sm:text-[17px] text-[#17242f] dark:text-[#d3e2ef] leading-[1.75] mb-5">
              What nobody prepares you for is everything that hits at once — the anger, the
              guilt, the fear, the sadness, all in the same breath, and usually all at
              the same time. The relationships you spent years building turn awkward
              overnight. People you used to talk to every day don&apos;t know what to say,
              so they say nothing. You feel isolated in a way that&apos;s hard to put into
              words, and it doesn&apos;t leave when you clear your desk. It lingers. For a
              long time. It becomes a quiet kind of trauma you don&apos;t know how to talk
              about, so you don&apos;t.
            </p>

            {/* Pull Quote */}
            <div className="border-l-4 border-[#0eb28d] pl-5 sm:pl-6 py-2 my-8 font-serif text-xl sm:text-2xl text-[#062c55] dark:text-[#7ff0cf] leading-[1.35]">
              And in the middle of all of that, you&apos;re handed the papers and told to
              sign — quickly.
            </div>

            <p className="text-base sm:text-[17px] text-[#17242f] dark:text-[#d3e2ef] leading-[1.75] mb-5">
              What no one tells you is that the number on that page is rarely the whole
              story — and that you have{" "}
              <em className="text-[#0c8f72] dark:text-[#0eb28d] italic font-semibold">
                options
              </em>
              . I didn&apos;t know that. Most people don&apos;t. You just assume the paper
              in front of you is the deal, and the only choice is where to sign.
            </p>
            <p className="font-serif text-xl sm:text-[22px] text-[#062c55] dark:text-white leading-[1.4] mb-5">
              That&apos;s the moment FairExit is built for.
            </p>
            <p className="text-base sm:text-[17px] text-[#17242f] dark:text-[#d3e2ef] leading-[1.75]">
              Not to hold your hand, and not to give you legal advice — I&apos;m not a
              lawyer, and this isn&apos;t legal advice. But to help you understand, in
              plain English, what your severance might really be worth and what your choices
              actually are. So the next person who gets handed that folder walks in
              knowing they have room to think.
            </p>
          </div>
        </section>

        {/* WHAT WE BUILT */}
        <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-[920px] mx-auto">
          <span className="text-xs font-extrabold tracking-[1.4px] uppercase text-[#0c8f72] dark:text-[#0eb28d] block mb-2">
            What we built
          </span>
          <h2 className="font-serif font-semibold text-2xl sm:text-[32px] text-[#062c55] dark:text-white leading-tight mb-3">
            Three honest options — and the clarity to choose.
          </h2>
          <p className="text-base sm:text-[17px] text-[#5a6b78] dark:text-[#9ab1c6] max-w-[660px] leading-relaxed mb-8">
            We built an intelligence system around the right questions and the real factors
            that decide these cases, so you can see what challenging your severance could
            look like down each path.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 mb-8">
            {/* Route 1 */}
            <div className="bg-white dark:bg-[#0d2238] border border-[#e7e4dd] dark:border-[#1e3b5c] rounded-2xl p-5 sm:p-6 shadow-xs">
              <div className="text-[11px] font-extrabold tracking-[0.6px] uppercase text-[#0c8f72] dark:text-[#0eb28d] mb-1.5">
                Option 1
              </div>
              <h3 className="font-serif font-semibold text-lg sm:text-[19px] text-[#062c55] dark:text-white mb-2">
                Sign it
              </h3>
              <p className="text-sm text-[#5a6b78] dark:text-[#9ab1c6] leading-relaxed">
                Sometimes the offer really is fair. We&apos;ll help you see if that&apos;s
                you — so you sign with confidence, not pressure.
              </p>
            </div>

            {/* Route 2 */}
            <div className="bg-white dark:bg-[#0d2238] border border-[#e7e4dd] dark:border-[#1e3b5c] rounded-2xl p-5 sm:p-6 shadow-xs">
              <div className="text-[11px] font-extrabold tracking-[0.6px] uppercase text-[#0c8f72] dark:text-[#0eb28d] mb-1.5">
                Option 2
              </div>
              <h3 className="font-serif font-semibold text-lg sm:text-[19px] text-[#062c55] dark:text-white mb-2">
                Negotiate it yourself
              </h3>
              <p className="text-sm text-[#5a6b78] dark:text-[#9ab1c6] leading-relaxed">
                With a little help — the weak spots, a script, your likely number —
                plenty of people ask for more on their own.
              </p>
            </div>

            {/* Route 3 */}
            <div className="bg-white dark:bg-[#0d2238] border border-[#e7e4dd] dark:border-[#1e3b5c] rounded-2xl p-5 sm:p-6 shadow-xs">
              <div className="text-[11px] font-extrabold tracking-[0.6px] uppercase text-[#0c8f72] dark:text-[#0eb28d] mb-1.5">
                Option 3
              </div>
              <h3 className="font-serif font-semibold text-lg sm:text-[19px] text-[#062c55] dark:text-white mb-2">
                Hand it to a {isCanada ? "lawyer" : "attorney"}
              </h3>
              <p className="text-sm text-[#5a6b78] dark:text-[#9ab1c6] leading-relaxed">
                Often the biggest return. We connect you to the right employment{" "}
                {isCanada ? "lawyer" : "attorney"}, and the first call is free.
              </p>
            </div>
          </div>

          {/* Note Banner */}
          <div className="bg-[#eef8f3] dark:bg-[#0b2b2b] border border-[#c7e6d6] dark:border-[#144f47] rounded-xl p-5 sm:p-6 text-sm sm:text-[15px] text-[#17242f] dark:text-[#c7e6d6] leading-relaxed">
            <b className="font-bold text-[#0c8f72] dark:text-[#0eb28d]">
              You&apos;re not alone in this — and the decision stays yours.
            </b>{" "}
            We sit beside you with the resources to understand your options and what each
            could mean, in plain English, so you can choose calmly and with confidence
            instead of under pressure. That&apos;s the whole point.
          </div>
        </section>

        {/* FOUNDERS */}
        <section className="py-12 sm:py-16 bg-white dark:bg-[#09223d] border-t border-[#e7e4dd] dark:border-[#1e3b5c] px-4 sm:px-6">
          <div className="max-w-[900px] mx-auto text-center">
            <span className="text-xs font-extrabold tracking-[1.4px] uppercase text-[#0c8f72] dark:text-[#0eb28d] block mb-2">
              Who&apos;s behind it
            </span>
            <h2 className="font-serif font-semibold text-2xl sm:text-[32px] text-[#062c55] dark:text-white leading-tight mb-8">
              Built by two people who think this should be fairer.
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 text-left">
              {/* Founder 1 */}
              <div className="bg-[#fbfaf8] dark:bg-[#0d2238] border border-[#e7e4dd] dark:border-[#1e3b5c] rounded-2xl p-6 sm:p-7 text-center">
                <div className="w-24 h-24 rounded-full mx-auto mb-3.5 flex items-center justify-center font-serif text-4xl font-semibold text-white bg-gradient-to-br from-[#0e3560] to-[#0a2542] shadow-md">
                  S
                </div>
                <h3 className="font-serif font-semibold text-xl text-[#062c55] dark:text-white mb-0.5">
                  Sundeep
                </h3>
                <div className="text-xs font-extrabold tracking-[0.6px] uppercase text-[#0c8f72] dark:text-[#0eb28d] mb-3">
                  Co-founder
                </div>
                <p className="text-sm text-[#5a6b78] dark:text-[#9ab1c6] leading-relaxed">
                  Been laid off more than once, and handed the papers every time. Built
                  FairExit so the next person walks in knowing their options — not just
                  where to sign.
                </p>
                <div className="text-[11px] text-[#a09a8e] dark:text-[#6a7e90] mt-3">
                  Photo coming soon
                </div>
              </div>

              {/* Founder 2 */}
              <div className="bg-[#fbfaf8] dark:bg-[#0d2238] border border-[#e7e4dd] dark:border-[#1e3b5c] rounded-2xl p-6 sm:p-7 text-center">
                <div className="w-24 h-24 rounded-full mx-auto mb-3.5 flex items-center justify-center font-serif text-4xl font-semibold text-white bg-gradient-to-br from-[#0e3560] to-[#0a2542] shadow-md">
                  R
                </div>
                <h3 className="font-serif font-semibold text-xl text-[#062c55] dark:text-white mb-0.5">
                  Riaz
                </h3>
                <div className="text-xs font-extrabold tracking-[0.6px] uppercase text-[#0c8f72] dark:text-[#0eb28d] mb-3">
                  Co-founder
                </div>
                <p className="text-sm text-[#5a6b78] dark:text-[#9ab1c6] leading-relaxed">
                  Bio coming soon.
                </p>
                <div className="text-[11px] text-[#a09a8e] dark:text-[#6a7e90] mt-3">
                  Photo coming soon
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
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
              href="/questions"
              className="w-full sm:w-auto text-center font-extrabold text-[15px] px-6 py-3 rounded-lg bg-gradient-to-b from-[#0eb28d] to-[#0c8f72] text-white shadow-md hover:brightness-105 active:scale-95 transition-all whitespace-nowrap"
            >
              {isCanada ? "Check my offer →" : "Check my layoff →"}
            </Link>
          </div>
        </section>
      </main>

      <Footer country={currentCountry} onCountrySwitch={handleCountrySwitch} variant="about" />
      <FloatingActions />
    </div>
  );
}

