"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import FloatingActions from "@/components/landing/FloatingActions";

export default function BlogPostIsMySeveranceFair() {
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
            Is my severance offer fair? How to tell in 5 minutes.
          </h1>

          {/* Meta Info */}
          <div className="text-[13.5px] leading-[23px] text-[#5A6B78] dark:text-[#8EA5B8] mb-6">
            6 min read · Ontario &amp; Canada · Updated 2026
          </div>

          {/* Divider */}
          <div className="w-full h-[1px] bg-[#E7E4DD] dark:bg-[#1E3B5C] mb-7" />

          {/* Body Content */}
          <div className="space-y-5 text-[17px] leading-[29px] text-[#17242F] dark:text-[#D3E2EF]">
            <p>
              You just got laid off. Someone slid a severance offer across the table and said,
              &ldquo;this is standard.&rdquo; Maybe it is. But here&apos;s the thing most people never
              find out:{" "}
              <b className="font-bold text-[#062C55] dark:text-white">
                in Canada, your employer&apos;s first offer is usually the legal minimum — not the most you
                might be owed.
              </b>
            </p>

            <p>
              That gap can be large. And once you sign, it&apos;s usually gone for good. So before you sign
              anything, it&apos;s worth five minutes to understand what you&apos;re looking at.
            </p>

            <h2 className="font-serif font-semibold text-[26px] leading-[44px] text-[#062C55] dark:text-white mt-9 mb-1">
              There are two different &ldquo;minimums&rdquo; in play
            </h2>

            <p>
              When someone is let go without cause in most of Canada, two separate things can apply — and
              people confuse them all the time.
            </p>

            <div>
              <h3 className="font-sans font-extrabold text-[15px] leading-[26px] text-[#062C55] dark:text-white mt-5 mb-1">
                1. The employment-standards minimum (the floor)
              </h3>
              <p>
                Every province has an employment-standards law (in Ontario, the{" "}
                <b className="font-bold text-[#062C55] dark:text-white">ESA</b>) that sets a bare
                minimum notice or pay based mostly on how long you worked there — often{" "}
                <b className="font-bold text-[#062C55] dark:text-white">about one week per year</b>, up to
                a cap. This is the number most first offers are built on.
              </p>
            </div>

            <div>
              <h3 className="font-sans font-extrabold text-[15px] leading-[26px] text-[#062C55] dark:text-white mt-6 mb-1">
                2. &ldquo;Common law&rdquo; reasonable notice (often much more)
              </h3>
              <p>
                Separately, unless you signed a valid contract that limits it, courts in Canada can award{" "}
                <b className="font-bold text-[#062C55] dark:text-white">&ldquo;reasonable notice&rdquo;</b>{" "}
                that is often <b className="font-bold text-[#062C55] dark:text-white">far higher</b> than the
                standards minimum — sometimes several months, occasionally up to around{" "}
                <b className="font-bold text-[#062C55] dark:text-white">24 months</b> of pay. It depends on
                your age, your role, how long you were there, and how hard it&apos;ll be to find similar work.
              </p>
            </div>

            {/* Green Callout Blockquote */}
            <div className="bg-[#EEF8F3] dark:bg-[#072520] border-l-4 border-[#0EB28D] rounded-r-lg p-4 sm:p-5 my-7 text-[17px] leading-[29px] text-[#062C55] dark:text-[#A3E8D2]">
              The short version: the number on your offer is frequently the{" "}
              <b className="font-bold text-[#062C55] dark:text-white">floor</b>, not the ceiling.
            </div>

            <h2 className="font-serif font-semibold text-[26px] leading-[44px] text-[#062C55] dark:text-white mt-9 mb-2">
              Five quick things to check
            </h2>

            <div className="space-y-3.5 my-3">
              <div className="flex items-start gap-2.5">
                <span className="text-[#17242F] dark:text-[#D3E2EF] text-[17px] leading-[29px] select-none">•</span>
                <p className="flex-1">
                  <b className="font-bold text-[#062C55] dark:text-white">How long were you there?</b>{" "}
                  Longer tenure usually means more notice is reasonable.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="text-[#17242F] dark:text-[#D3E2EF] text-[17px] leading-[29px] select-none">•</span>
                <p className="flex-1">
                  <b className="font-bold text-[#062C55] dark:text-white">What&apos;s your age and role?</b>{" "}
                  Older, senior, or specialized workers often warrant longer notice.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="text-[#17242F] dark:text-[#D3E2EF] text-[17px] leading-[29px] select-none">•</span>
                <p className="flex-1">
                  <b className="font-bold text-[#062C55] dark:text-white">
                    Did you sign a contract with a &ldquo;termination clause&rdquo;?
                  </b>{" "}
                  If yes, it <i className="italic">may</i> limit you to the minimum — but many of these
                  clauses are unenforceable, which can re-open the door to common law.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="text-[#17242F] dark:text-[#D3E2EF] text-[17px] leading-[29px] select-none">•</span>
                <p className="flex-1">
                  <b className="font-bold text-[#062C55] dark:text-white">What&apos;s the deadline they gave you?</b>{" "}
                  It&apos;s often softer than it sounds. You&apos;re usually allowed to ask for time to review it.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="text-[#17242F] dark:text-[#D3E2EF] text-[17px] leading-[29px] select-none">•</span>
                <p className="flex-1">
                  <b className="font-bold text-[#062C55] dark:text-white">
                    Does the offer only mention &ldquo;ESA&rdquo; or &ldquo;the Act&rdquo;?
                  </b>{" "}
                  That&apos;s a sign it&apos;s built on the floor, not reasonable notice.
                </p>
              </div>
            </div>

            <h2 className="font-serif font-semibold text-[26px] leading-[44px] text-[#062C55] dark:text-white mt-9 mb-1">
              What to do next
            </h2>

            <p>
              You don&apos;t have to become an expert, and you don&apos;t have to start a fight. You just need to
              know roughly where your offer sits before you decide. If it looks like it&apos;s only the minimum,
              that&apos;s usually a sign it&apos;s worth a closer look — and often worth a conversation with an
              employment lawyer, which is frequently free for a first call.
            </p>

            {/* CTA Box */}
            <div className="bg-[#062C55] dark:bg-[#071D34] text-white rounded-[14px] p-5 sm:p-6 my-8 flex flex-col sm:flex-row gap-4 sm:items-center justify-between border border-[#1A3B5C] shadow-sm">
              <div>
                <h3 className="font-serif font-semibold text-[22px] leading-[28px] text-white mb-1">
                  See where your own offer sits
                </h3>
                <p className="text-[14px] leading-[24px] text-[#C9D6E5]">
                  Free, about 3 minutes. No account, no sales call.
                </p>
              </div>
              <Link
                href="/questions"
                className="w-full sm:w-auto text-center font-extrabold text-[15px] leading-[26px] px-6 py-3 rounded-[9px] bg-[#0EB28D] hover:bg-[#0C8F72] text-white shadow-sm hover:brightness-105 active:scale-95 transition-all whitespace-nowrap"
              >
                Check my offer →
              </Link>
            </div>

            {/* Disclaimer Box */}
            <div className="bg-white dark:bg-[#0D2238] border border-[#E7E4DD] dark:border-[#1E3B5C] rounded-[12px] p-4 sm:p-5 my-6 text-[13px] leading-[22px]">
              <b className="font-bold text-[#062C55] dark:text-white">
                This is general information, not legal advice.
              </b>{" "}
              <span className="text-[#5A6B78] dark:text-[#8EA5B8]">
                Rules differ by province and by your specific situation, and only a licensed lawyer can tell
                you where you actually stand. FairExit helps you understand your options and can connect you to
                an employment lawyer if you want.
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
