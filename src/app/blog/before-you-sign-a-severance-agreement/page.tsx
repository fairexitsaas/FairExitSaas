"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import FloatingActions from "@/components/landing/FloatingActions";

export default function BlogPostBeforeYouSign() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F6F4EF] dark:bg-[#062C55] text-[#17242F] dark:text-[#EAF2F8] transition-colors font-sans antialiased">
      {/* HEADER */}
      <header className="border-b border-[#E7E4DD] dark:border-[#1E3B5C] bg-[#F6F4EF] dark:bg-[#062C55] transition-colors">
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
            href="/blog"
            className="text-[14px] leading-[24px] font-bold text-[#0C8F72] dark:text-[#0EB28D] hover:underline transition-all"
          >
            ← All articles
          </Link>
        </div>
      </header>

      {/* ARTICLE CONTENT */}
      <main className="flex-1 w-full max-w-[672px] mx-auto px-4 sm:px-0 py-10 sm:py-12">
        <article>
          {/* Eyebrow */}
          <div className="text-[12px] font-extrabold leading-[20px] tracking-[1px] uppercase text-[#0C8F72] dark:text-[#0EB28D] mb-2">
            SEVERANCE BASICS
          </div>

          {/* Title */}
          <h1 className="font-serif font-semibold text-[32px] sm:text-[40px] leading-[1.08] tracking-[-0.5px] text-[#062C55] dark:text-white mb-3">
            Before you sign a severance agreement: 5 things to check.
          </h1>

          {/* Meta Info */}
          <div className="text-[13.5px] leading-[23px] text-[#5A6B78] dark:text-[#8EA5B8] mb-6">
            6 min read · United States · Updated 2026
          </div>

          {/* Divider */}
          <div className="w-full h-[1px] bg-[#E7E4DD] dark:bg-[#1E3B5C] mb-7" />

          {/* Body Content */}
          <div className="space-y-5 text-[17px] leading-[29px] text-[#17242F] dark:text-[#D3E2EF]">
            <p>
              You just got laid off, and HR handed you a &ldquo;separation agreement and general
              release.&rdquo; In most of the US there&apos;s{" "}
              <b className="font-bold text-[#062C55] dark:text-white">
                no law that says your employer has to pay severance at all
              </b>
              . Most jobs are &ldquo;at-will.&rdquo; So when they offer money, they&apos;re usually asking
              for something in return: your signature on a release.
            </p>

            <p>
              That makes the agreement itself the thing to read carefully. Here&apos;s what to look for
              before you sign.
            </p>

            <h2 className="font-serif font-semibold text-[26px] leading-[44px] text-[#062C55] dark:text-white mt-9 mb-1">
              Why US severance works differently
            </h2>

            <p>
              Unlike Canada, there&apos;s no general &lsquo;reasonable notice&rsquo; or legal minimum
              payout in the US. Severance usually comes from one of three places:
            </p>

            <div className="space-y-2.5 my-3">
              <div className="flex items-start gap-2.5">
                <span className="text-[#17242F] dark:text-[#D3E2EF] text-[17px] leading-[29px] select-none">•</span>
                <p className="flex-1">
                  <b className="font-bold text-[#062C55] dark:text-white">A written promise</b> in your offer
                  letter, employment contract or a company severance plan. If one exists, it can be
                  enforceable.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="text-[#17242F] dark:text-[#D3E2EF] text-[17px] leading-[29px] select-none">•</span>
                <p className="flex-1">
                  <b className="font-bold text-[#062C55] dark:text-white">A specific law</b> for some
                  situations, like large layoffs (see WARN below) or a few state rules for mass layoffs.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="text-[#17242F] dark:text-[#D3E2EF] text-[17px] leading-[29px] select-none">•</span>
                <p className="flex-1">
                  <b className="font-bold text-[#062C55] dark:text-white">A voluntary offer</b> in exchange for
                  a release. This is the most common, and it&apos;s often negotiable.
                </p>
              </div>
            </div>

            {/* Green Callout Blockquote */}
            <div className="bg-[#EEF8F3] dark:bg-[#072520] border-l-4 border-[#0EB28D] rounded-r-lg p-4 sm:p-5 my-7 text-[17px] leading-[29px] text-[#062C55] dark:text-[#A3E8D2]">
              The short version: severance in the US is usually a trade. You get money; they get your
              promise not to sue.
            </div>

            <h2 className="font-serif font-semibold text-[26px] leading-[44px] text-[#062C55] dark:text-white mt-9 mb-2">
              Five things to check before you sign
            </h2>

            <div className="space-y-3.5 my-3">
              <div className="flex items-start gap-2.5">
                <span className="text-[#17242F] dark:text-[#D3E2EF] text-[17px] leading-[29px] select-none">•</span>
                <p className="flex-1">
                  <b className="font-bold text-[#062C55] dark:text-white">
                    Did anything in writing promise you severance?
                  </b>{" "}
                  Check your offer letter, contract, handbook or any severance plan. A written promise can
                  be worth more than the offer in front of you.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="text-[#17242F] dark:text-[#D3E2EF] text-[17px] leading-[29px] select-none">•</span>
                <p className="flex-1">
                  <b className="font-bold text-[#062C55] dark:text-white">Are you 40 or older?</b> Federal
                  law protects your right to understand an age-discrimination release. You must get at
                  least <b className="font-bold text-[#062C55] dark:text-white">21 days</b> to consider it (
                  <b className="font-bold text-[#062C55] dark:text-white">45 days</b> if it&apos;s part of
                  a group layoff), <b className="font-bold text-[#062C55] dark:text-white">7 days</b> to
                  change your mind after signing, and written advice to talk to an attorney. In a group
                  layoff, you&apos;re also entitled to a list of the job titles and ages of people chosen
                  and not chosen.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="text-[#17242F] dark:text-[#D3E2EF] text-[17px] leading-[29px] select-none">•</span>
                <p className="flex-1">
                  <b className="font-bold text-[#062C55] dark:text-white">Was this a large layoff?</b> Under
                  the federal WARN Act, employers with 100 or more employees generally must give{" "}
                  <b className="font-bold text-[#062C55] dark:text-white">60 days&apos; notice</b> before a
                  plant closing or mass layoff, or pay instead. Some states, like New York, require more.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="text-[#17242F] dark:text-[#D3E2EF] text-[17px] leading-[29px] select-none">•</span>
                <p className="flex-1">
                  <b className="font-bold text-[#062C55] dark:text-white">What are you giving up?</b> Read the
                  release paragraph twice. Look for confidentiality, non-disparagement and non-compete
                  terms, and whether earned bonuses or unused PTO are being taken away.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="text-[#17242F] dark:text-[#D3E2EF] text-[17px] leading-[29px] select-none">•</span>
                <p className="flex-1">
                  <b className="font-bold text-[#062C55] dark:text-white">When is your final paycheck due?</b>{" "}
                  State law sets the timing, and it can&apos;t be held back until you sign.
                </p>
              </div>
            </div>

            <h2 className="font-serif font-semibold text-[26px] leading-[44px] text-[#062C55] dark:text-white mt-9 mb-1">
              What to do next
            </h2>

            <p>
              You don&apos;t have to sign on the spot, and asking for the full time the law gives you is
              normal. If the deadline looks short, a written promise was ignored, or the release asks you
              to give up something you earned, that&apos;s worth a closer look, and often worth a
              conversation with an employment attorney. Many offer a free first call.
            </p>

            {/* CTA Box */}
            <div className="bg-[#062C55] dark:bg-[#071D34] text-white rounded-[14px] p-5 sm:p-6 my-8 flex flex-col sm:flex-row gap-4 sm:items-center justify-between border border-[#1A3B5C] shadow-sm">
              <div>
                <h3 className="font-serif font-semibold text-[22px] leading-[28px] text-white mb-1">
                  Check your own agreement
                </h3>
                <p className="text-[14px] leading-[24px] text-[#C9D6E5]">
                  Free, about 3 minutes. No account, no sales call.
                </p>
              </div>
              <Link
                href="/questions"
                className="w-full sm:w-auto text-center font-extrabold text-[15px] leading-[26px] px-6 py-3 rounded-[9px] bg-[#0EB28D] hover:bg-[#0C8F72] text-white shadow-sm hover:brightness-105 active:scale-95 transition-all whitespace-nowrap"
              >
                Check my layoff →
              </Link>
            </div>

            {/* US Disclaimer Box */}
            <div className="bg-white dark:bg-[#0D2238] border border-[#E7E4DD] dark:border-[#1E3B5C] rounded-[12px] p-4 sm:p-5 my-6 text-[13px] leading-[22px]">
              <b className="font-bold text-[#062C55] dark:text-white">
                This is general information, not legal advice.
              </b>{" "}
              <span className="text-[#5A6B78] dark:text-[#8EA5B8]">
                Rules differ by state and by your situation, and only a licensed attorney can tell you where
                you stand. Sources: U.S. Department of Labor (WARN Act; Age Discrimination in Employment Act as
                amended by the Older Workers Benefit Protection Act, 29 U.S.C. § 626(f)). FairExit can connect
                you to an employment attorney if you want.
              </span>
            </div>
          </div>
        </article>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#E7E4DD] dark:border-[#1E3B5C] bg-[#F6F4EF] dark:bg-[#062C55] transition-colors py-6">
        <div className="max-w-[1000px] mx-auto px-4 sm:px-6 text-[13px] leading-[22px] text-[#5A6B78] dark:text-[#8EA5B8]">
          General information — not legal advice. © FairExit 2026
        </div>
      </footer>

      <FloatingActions />
    </div>
  );
}

