"use client";

import React from "react";

export default function WhatWeCheck() {
  return (
    <section className="py-16 lg:py-20 bg-white dark:bg-[#071524] border-t border-b border-line transition-colors" id="check">
      <div className="max-w-[1200px] mx-auto px-6 w-full box-border">
        {/* Eyebrow */}
        <span className="inline-flex items-center text-xs font-extrabold uppercase tracking-[1.5px] text-greend">
          What we check
        </span>

        {/* Heading */}
        <h2 className="font-serif text-3xl sm:text-4xl lg:text-[40px] text-navy dark:text-white font-bold leading-tight mt-2 mb-3.5">
          The rules your employer had to follow.
        </h2>

        {/* Lede description */}
        <p className="text-[15.5px] sm:text-base leading-relaxed text-slate max-w-[720px] mb-9">
          There&apos;s no federal law forcing a severance <em className="italic">amount</em> in the US — so instead of a dollar figure, we help you understand the federal rules that <b className="font-bold text-navy dark:text-white">may</b> apply and organize your questions. Whether any of them apply to you is an attorney&apos;s call.
        </p>

        {/* 2-Column Cards Grid matching Image 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
          {/* Card 1: The review window */}
          <div className="bg-white dark:bg-card border border-line rounded-[18px] p-6 sm:p-7 flex flex-col gap-2 transition-colors shadow-xs">
            <div className="text-[26px] mb-1">📅</div>
            <h3 className="font-serif text-xl sm:text-[21px] text-navy dark:text-white font-bold m-0 leading-snug">
              The review window
            </h3>
            <p className="text-[13.5px] sm:text-sm text-slate leading-relaxed m-0 flex-1">
              If you&apos;re 40+ and asked to sign a release, the law sets a minimum time the employer must give you to consider it — 21 days for an individual, 45 for an age-40+ group program. You can still choose to sign earlier.
            </p>
            <div className="text-[11px] font-extrabold uppercase tracking-[0.8px] text-greend mt-3">
              ADEA / OWBPA
            </div>
          </div>

          {/* Card 2: The 7-day take-back */}
          <div className="bg-white dark:bg-card border border-line rounded-[18px] p-6 sm:p-7 flex flex-col gap-2 transition-colors shadow-xs">
            <div className="text-[26px] mb-1">↩️</div>
            <h3 className="font-serif text-xl sm:text-[21px] text-navy dark:text-white font-bold m-0 leading-snug">
              The 7-day take-back
            </h3>
            <p className="text-[13.5px] sm:text-sm text-slate leading-relaxed m-0 flex-1">
              After signing a release, workers 40+ get 7 days to change their mind and revoke it. A release that skips this may not hold.
            </p>
            <div className="text-[11px] font-extrabold uppercase tracking-[0.8px] text-greend mt-3">
              OWBPA
            </div>
          </div>

          {/* Card 3: Plain, clear language */}
          <div className="bg-white dark:bg-card border border-line rounded-[18px] p-6 sm:p-7 flex flex-col gap-2 transition-colors shadow-xs">
            <div className="text-[26px] mb-1">📝</div>
            <h3 className="font-serif text-xl sm:text-[21px] text-navy dark:text-white font-bold m-0 leading-snug">
              Plain, clear language
            </h3>
            <p className="text-[13.5px] sm:text-sm text-slate leading-relaxed m-0 flex-1">
              A release you&apos;re asked to sign has to be written so you can actually understand it — not buried in legalese.
            </p>
            <div className="text-[11px] font-extrabold uppercase tracking-[0.8px] text-greend mt-3">
              OWBPA
            </div>
          </div>

          {/* Card 4: Group-program disclosures */}
          <div className="bg-white dark:bg-card border border-line rounded-[18px] p-6 sm:p-7 flex flex-col gap-2 transition-colors shadow-xs">
            <div className="text-[26px] mb-1">👥</div>
            <h3 className="font-serif text-xl sm:text-[21px] text-navy dark:text-white font-bold m-0 leading-snug">
              Group-program disclosures
            </h3>
            <p className="text-[13.5px] sm:text-sm text-slate leading-relaxed m-0 flex-1">
              For an age-40+ group termination program, the law generally requires disclosing the job titles and ages of those selected — and the ages of those in the group who weren&apos;t.
            </p>
            <div className="text-[11px] font-extrabold uppercase tracking-[0.8px] text-greend mt-3">
              OWBPA
            </div>
          </div>

          {/* Card 5: Advance notice (WARN) */}
          <div className="bg-white dark:bg-card border border-line rounded-[18px] p-6 sm:p-7 flex flex-col gap-2 transition-colors shadow-xs">
            <div className="text-[26px] mb-1">⏰</div>
            <h3 className="font-serif text-xl sm:text-[21px] text-navy dark:text-white font-bold m-0 leading-snug">
              Advance notice (WARN)
            </h3>
            <p className="text-[13.5px] sm:text-sm text-slate leading-relaxed m-0 flex-1">
              A 100+-employee employer doing a covered mass layoff or closing at a single site generally must give 60 days&apos; written notice. (Paying instead of noticing can still be a WARN violation.) Some states add their own &quot;mini-WARN&quot; rules.
            </p>
            <div className="text-[11px] font-extrabold uppercase tracking-[0.8px] text-greend mt-3">
              Federal WARN Act
            </div>
          </div>

          {/* Card 6: Your contract & policy */}
          <div className="bg-white dark:bg-card border border-line rounded-[18px] p-6 sm:p-7 flex flex-col gap-2 transition-colors shadow-xs">
            <div className="text-[26px] mb-1">📄</div>
            <h3 className="font-serif text-xl sm:text-[21px] text-navy dark:text-white font-bold m-0 leading-snug">
              Your contract &amp; policy
            </h3>
            <p className="text-[13.5px] sm:text-sm text-slate leading-relaxed m-0 flex-1">
              No law requires severance — but your offer letter, handbook, or policy might. We check what you were actually promised.
            </p>
            <div className="text-[11px] font-extrabold uppercase tracking-[0.8px] text-greend mt-3">
              Contract / policy
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
