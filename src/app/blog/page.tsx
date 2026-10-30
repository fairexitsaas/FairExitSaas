"use client";

import React, { useContext, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import FloatingActions from "@/components/landing/FloatingActions";
import { CountryContext, CountryCode } from "@/context/CountryContext";

function BlogIndexContent() {
  const context = useContext(CountryContext);
  const searchParams = useSearchParams();
  const urlCountry = searchParams?.get("country")?.toUpperCase();

  const currentCountry: CountryCode =
    urlCountry === "US" || urlCountry === "CA"
      ? (urlCountry as CountryCode)
      : context?.Country || "CA";

  const isCanada = currentCountry === "CA";

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f4ef] dark:bg-[#062c55] text-[#17242f] dark:text-[#eaf2f8] transition-colors font-sans antialiased">
      {/* HEADER */}
      <header className="border-b border-[#e7e4dd] dark:border-[#1e3b5c] bg-[#f6f4ef] dark:bg-[#062c55] transition-colors">
        <div className="max-w-[1000px] mx-auto px-4 sm:px-6 h-[69px] flex items-center justify-between">
          <Link href="/" aria-label="FairExit home">
            <Image
              className="h-7 w-auto object-contain dark:hidden"
              src="/fairexitlogo.png"
              alt="FairExit"
              width={115}
              height={29}
              priority
            />
            <Image
              className="h-7 w-auto object-contain hidden dark:block"
              src="/fairexitlogo-dark.png"
              alt="FairExit"
              width={115}
              height={29}
              priority
            />
          </Link>
          <Link
            href="/"
            className="text-sm font-bold text-[#0c8f72] dark:text-[#0eb28d] hover:underline"
          >
            ← Back to FairExit
          </Link>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-[1000px] w-full mx-auto px-4 sm:px-6 py-10 sm:py-12">
        {/* HERO */}
        <section className="mb-9">
          <span className="text-xs font-extrabold tracking-[1.5px] uppercase text-[#0c8f72] dark:text-[#0eb28d] block mb-2">
            THE FAIREXIT BLOG
          </span>
          <h1 className="font-serif font-semibold text-3xl sm:text-[42px] text-[#062c55] dark:text-white leading-[1.06] tracking-[-0.5px] mb-3">
            Plain answers about layoffs &amp; severance.
          </h1>
          <p className="text-base sm:text-[18px] text-[#5a6b78] dark:text-[#9ab1c6] max-w-[693px] leading-relaxed">
            {isCanada ? (
              <>
                No legal jargon. Just clear, honest articles to help you understand your rights after a layoff in Canada — one new piece every week.
              </>
            ) : (
              <>
                No legal jargon. Just clear, honest articles to help you understand your rights after a layoff in the US — one new piece every week.
              </>
            )}
          </p>
        </section>

        {/* ARTICLES GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-14">
          {/* Article 1: Featured & Live */}
          <Link
            href={isCanada ? "/blog/is-my-severance-offer-fair" : "/blog/before-you-sign-a-severance-agreement"}
            className="group bg-white dark:bg-[#0d2238] border border-[#e7e4dd] dark:border-[#1e3b5c] rounded-2xl p-6 sm:p-7 flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_28px_50px_-30px_rgba(6,44,85,0.4)] hover:border-[#0eb28d] dark:hover:border-[#0eb28d]"
          >
            <span className="text-[11px] font-extrabold tracking-[0.5px] uppercase text-[#0c8f72] dark:text-[#0eb28d] mb-2 block">
              SEVERANCE BASICS
            </span>
            <h2 className="font-serif font-semibold text-xl sm:text-[23px] text-[#062c55] dark:text-white leading-[1.2] mb-2.5 group-hover:text-[#0c8f72] dark:group-hover:text-[#0eb28d] transition-colors">
              {isCanada
                ? "Is my severance offer fair? How to tell in 5 minutes."
                : "Before you sign a severance agreement: 5 things to check."}
            </h2>
            <p className="text-sm sm:text-[14.5px] text-[#5a6b78] dark:text-[#9ab1c6] leading-relaxed flex-1 mb-4">
              {isCanada
                ? "Your employer's first offer is usually the legal minimum — not what you might actually be owed. Here's how to spot the gap."
                : "US law rarely requires severance, so the agreement is what matters. Here's what to read before you sign."}
            </p>
            <div className="text-[12.5px] text-[#5a6b78] dark:text-[#8ea5b8] mt-auto">
              {isCanada ? "6 min read · Ontario & Canada" : "6 min read · United States"}
            </div>
          </Link>

          {/* Article 2: Coming this week */}
          <div className="bg-[#fbfaf8] dark:bg-[#091f33] border border-[#e7e4dd] dark:border-[#1e3b5c] rounded-2xl p-6 sm:p-7 flex flex-col opacity-[0.72]">
            <div className="mb-2.5">
              <span className="inline-block text-[11px] font-extrabold text-[#5a6b78] dark:text-[#9ab1c6] bg-[#f6f4ef] dark:bg-[#122b44] border border-[#e7e4dd] dark:border-[#1e3b5c] rounded-full px-3 py-0.5">
                Coming this week
              </span>
            </div>
            <h2 className="font-serif font-semibold text-xl sm:text-[23px] text-[#062c55] dark:text-white leading-[1.2] mb-2.5">
              {isCanada
                ? "ESA minimums vs. common law: the gap that costs people thousands."
                : "Over 40 and laid off? The 21-day and 45-day rules."}
            </h2>
            <p className="text-sm sm:text-[14.5px] text-[#5a6b78] dark:text-[#9ab1c6] leading-relaxed flex-1 mb-4">
              {isCanada
                ? "Why the number on the page is often the floor, not the ceiling."
                : "What the law says about how long you get to decide."}
            </p>
            <div className="text-[12.5px] text-[#5a6b78] dark:text-[#8ea5b8] mt-auto">
              Drafting
            </div>
          </div>

          {/* Article 3: Planned */}
          <div className="bg-[#fbfaf8] dark:bg-[#091f33] border border-[#e7e4dd] dark:border-[#1e3b5c] rounded-2xl p-6 sm:p-7 flex flex-col opacity-[0.72]">
            <div className="mb-2.5">
              <span className="inline-block text-[11px] font-extrabold text-[#5a6b78] dark:text-[#9ab1c6] bg-[#f6f4ef] dark:bg-[#122b44] border border-[#e7e4dd] dark:border-[#1e3b5c] rounded-full px-3 py-0.5">
                Coming soon
              </span>
            </div>
            <h2 className="font-serif font-semibold text-xl sm:text-[23px] text-[#062c55] dark:text-white leading-[1.2] mb-2.5">
              {isCanada
                ? "Should I sign the severance offer by the deadline they gave me?"
                : "WARN Act: when a layoff needs 60 days' notice."}
            </h2>
            <p className="text-sm sm:text-[14.5px] text-[#5a6b78] dark:text-[#9ab1c6] leading-relaxed flex-1 mb-4">
              {isCanada
                ? "Spoiler: that deadline is usually softer than it looks."
                : "Who it covers, and what happens when notice is skipped."}
            </p>
            <div className="text-[12.5px] text-[#5a6b78] dark:text-[#8ea5b8] mt-auto">
              Planned
            </div>
          </div>

          {/* Article 4: Planned */}
          <div className="bg-[#fbfaf8] dark:bg-[#091f33] border border-[#e7e4dd] dark:border-[#1e3b5c] rounded-2xl p-6 sm:p-7 flex flex-col opacity-[0.72]">
            <div className="mb-2.5">
              <span className="inline-block text-[11px] font-extrabold text-[#5a6b78] dark:text-[#9ab1c6] bg-[#f6f4ef] dark:bg-[#122b44] border border-[#e7e4dd] dark:border-[#1e3b5c] rounded-full px-3 py-0.5">
                Coming soon
              </span>
            </div>
            <h2 className="font-serif font-semibold text-xl sm:text-[23px] text-[#062c55] dark:text-white leading-[1.2] mb-2.5">
              {isCanada
                ? "Laid off in Canada? The first 5 things to do this week."
                : "Laid off in the US? The first 5 things to do this week."}
            </h2>
            <p className="text-sm sm:text-[14.5px] text-[#5a6b78] dark:text-[#9ab1c6] leading-relaxed flex-1 mb-4">
              A calm checklist for the week everything changed.
            </p>
            <div className="text-[12.5px] text-[#5a6b78] dark:text-[#8ea5b8] mt-auto">
              Planned
            </div>
          </div>
        </div>

        {/* CTA BAR */}
        <section className="mb-12">
          <div className="bg-[#062c55] text-white rounded-[14px] p-6 sm:p-7 max-w-[860px] mx-auto flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between shadow-md">
            <div>
              <h3 className="font-serif font-semibold text-xl sm:text-[22px] leading-tight mb-1 text-white">
                {isCanada ? "See where your own offer sits" : "Check your own agreement"}
              </h3>
              <p className="text-sm text-[#c9d6e5]">
                Free, about 3 minutes. No account, no sales call.
              </p>
            </div>
            <Link
              href="/questions"
              className="w-full sm:w-auto text-center font-extrabold text-[15px] px-5 py-3 rounded-[9px] bg-[#0eb28d] hover:bg-[#0c8f72] text-white shadow-md active:scale-95 transition-all whitespace-nowrap"
            >
              {isCanada ? "Check my offer →" : "Check my layoff →"}
            </Link>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#e7e4dd] dark:border-[#1e3b5c] py-6 sm:py-7 transition-colors">
        <div className="max-w-[1000px] mx-auto px-4 sm:px-6 text-[13px] text-[#5a6b78] dark:text-[#9ab1c6] leading-relaxed">
          General information —{" "}
          <strong className="font-bold text-[#5a6b78] dark:text-[#d3e2ef]">
            not legal advice
          </strong>
          . FairExit helps you understand your options and connects you to lawyers if you want. © FairExit 2026
        </div>
      </footer>

      <FloatingActions />
    </div>
  );
}

export default function BlogIndexPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F6F4EF] dark:bg-[#062C55] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#0C8F72] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <BlogIndexContent />
    </Suspense>
  );
}
