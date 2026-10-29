"use client";

import React, { useState } from "react";
import Link from "next/link";
import FloatingActions from "@/components/landing/FloatingActions";

interface FaqItem {
  q: string;
  a: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    q: "Does California require severance pay?",
    a: "No. Nothing in California law sets a severance amount. What it does require is final pay, including vacation, on your last day, and 60 days' notice for layoffs covered by Cal-WARN.",
  },
  {
    q: "Is my non-compete enforceable in California?",
    a: "Almost never. Section 16600 voids most non-competes no matter where they were signed, and employers had to notify workers that old ones are unenforceable.",
  },
  {
    q: "How much notice does Cal-WARN require?",
    a: "60 days' written notice when a covered employer (75 or more employees) lays off 50 or more people at one site within 30 days, closes a site, or moves it 100 miles or more.",
  },
];

export default function CaliforniaStatePage() {
  const [openFaq, setOpenFaq] = useState<Record<number, boolean>>({});

  const toggleFaq = (index: number) => {
    setOpenFaq((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  return (
    <div className="min-h-screen bg-[#F6F4EF] dark:bg-[#062C55] text-[#12202E] dark:text-[#EAF2F8] font-sans antialiased transition-colors">
      <main className="max-w-[820px] mx-auto px-4 sm:px-6 pt-7 pb-16">
        {/* Top Header / Breadcrumb */}
        <div className="flex items-center justify-between text-[13px] mb-7">
          <Link
            href="/"
            className="font-bold text-[#0C8F72] dark:text-[#0EB28D] hover:underline transition-colors"
          >
            ← FairExit US
          </Link>
          <span className="text-[#5A6B7D] dark:text-[#8EA5B8]">Reviewed September 2026</span>
        </div>

        {/* Title Area */}
        <div className="mb-6">
          <span className="block text-[11px] font-extrabold uppercase tracking-[0.5px] text-[#0C8F72] dark:text-[#0EB28D] mb-1.5 leading-[18px]">
            CALIFORNIA · CAL-WARN (LABOR CODE §1400–1408) AND BUSINESS &amp; PROFESSIONS CODE §16600
          </span>
          <h1 className="font-serif text-[32px] sm:text-[38px] font-semibold text-[#062C55] dark:text-white leading-[1.12] tracking-[-0.5px]">
            Severance and layoff rules in California: what the law requires
          </h1>
        </div>

        {/* Short Answer Card */}
        <div className="bg-white dark:bg-[#0D2238] rounded-[12px] border border-[#DFE3E8] dark:border-[#1E3B5C] border-l-[4px] border-l-[#0EB28D] p-5 sm:p-[18px_22px] shadow-xs">
          <p className="text-[15px] sm:text-[15.5px] leading-[1.62] text-[#12202E] dark:text-[#D3E2EF]">
            <strong className="font-bold text-[#062C55] dark:text-white mr-1.5">Short answer.</strong>
            California has no minimum severance, but its own layoff-notice law (Cal-WARN) covers
            employers with 75 or more employees and requires 60 days&apos; notice for layoffs of 50 or
            more at one site. California also voids most non-competes, so a non-compete in your
            agreement usually can&apos;t stop you working. Federal age-40+ release rules still apply.
          </p>
        </div>

        <p className="text-[12px] text-[#5A6B7D] dark:text-[#8EA5B8] mt-2.5 mb-8 leading-[1.58]">
          Information to help you get oriented, not legal advice. Federal rules apply everywhere;
          this page covers what California adds. Official source at the bottom.
        </p>

        {/* California at a glance Table */}
        <section className="mb-9">
          <h2 className="font-serif text-[24px] font-semibold text-[#062C55] dark:text-white leading-[38px] mb-3">
            California at a glance
          </h2>

          <div className="overflow-hidden border border-[#DFE3E8] dark:border-[#1E3B5C] rounded-[12px] bg-white dark:bg-[#0D2238] shadow-xs">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-[#EEF2F6] dark:bg-[#132C49] border-b border-[#DFE3E8] dark:border-[#1E3B5C]">
                  <th className="px-4 sm:px-5 py-3 text-[12px] font-bold text-[#062C55] dark:text-white uppercase tracking-[0.5px] w-1/3">
                    QUESTION
                  </th>
                  <th className="px-4 sm:px-5 py-3 text-[12px] font-bold text-[#062C55] dark:text-white uppercase tracking-[0.5px] w-2/3">
                    CALIFORNIA
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DFE3E8] dark:divide-[#1E3B5C] text-[14.5px] text-[#12202E] dark:text-[#D3E2EF] leading-[23px]">
                <tr>
                  <td className="px-4 sm:px-5 py-3.5 font-bold text-[#062C55] dark:text-white align-top">
                    Notice law
                  </td>
                  <td className="px-4 sm:px-5 py-3.5 align-top">
                    Cal-WARN: 75+ employees (including part-time), 60 days&apos; written notice for 50+
                    layoffs at one site, a closing, or a 100-mile relocation
                  </td>
                </tr>
                <tr>
                  <td className="px-4 sm:px-5 py-3.5 font-bold text-[#062C55] dark:text-white align-top">
                    Severance minimum
                  </td>
                  <td className="px-4 sm:px-5 py-3.5 align-top">
                    None. Only a written promise (policy, offer letter, handbook) creates one
                  </td>
                </tr>
                <tr>
                  <td className="px-4 sm:px-5 py-3.5 font-bold text-[#062C55] dark:text-white align-top">
                    Non-competes
                  </td>
                  <td className="px-4 sm:px-5 py-3.5 align-top">
                    Generally void under §16600, and since 2024 employers must notify workers that old
                    ones are unenforceable
                  </td>
                </tr>
                <tr>
                  <td className="px-4 sm:px-5 py-3.5 font-bold text-[#062C55] dark:text-white align-top">
                    Age-40+ release
                  </td>
                  <td className="px-4 sm:px-5 py-3.5 align-top">
                    Federal OWBPA: 21 days to consider (45 in a group), 7 days to revoke, written
                    advice to see an attorney
                  </td>
                </tr>
                <tr>
                  <td className="px-4 sm:px-5 py-3.5 font-bold text-[#062C55] dark:text-white align-top">
                    Final pay
                  </td>
                  <td className="px-4 sm:px-5 py-3.5 align-top">
                    Due immediately on termination, including unused vacation; waiting-time
                    penalties can apply
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* What's different about California */}
        <section className="mb-9">
          <h2 className="font-serif text-[24px] font-semibold text-[#062C55] dark:text-white leading-[38px] mb-3">
            What&apos;s different about California
          </h2>

          <div className="space-y-3">
            <div className="bg-white dark:bg-[#0D2238] border border-[#DFE3E8] dark:border-[#1E3B5C] rounded-[12px] p-4 sm:p-5 shadow-xs">
              <h3 className="font-bold text-[16px] text-[#062C55] dark:text-white leading-[26px] mb-1">
                Lower trigger than federal
              </h3>
              <p className="text-[14px] text-[#12202E] dark:text-[#D3E2EF] leading-[22px]">
                Federal WARN needs 100+ employees. Cal-WARN starts at 75, and it counts part-time
                staff, so far more California layoffs are covered.
              </p>
            </div>

            <div className="bg-white dark:bg-[#0D2238] border border-[#DFE3E8] dark:border-[#1E3B5C] rounded-[12px] p-4 sm:p-5 shadow-xs">
              <h3 className="font-bold text-[16px] text-[#062C55] dark:text-white leading-[26px] mb-1">
                Non-competes are void
              </h3>
              <p className="text-[14px] text-[#12202E] dark:text-[#D3E2EF] leading-[22px]">
                Whatever your agreement says, a California non-compete generally can&apos;t be enforced.
                That changes what you&apos;re really giving up in a release.
              </p>
            </div>

            <div className="bg-white dark:bg-[#0D2238] border border-[#DFE3E8] dark:border-[#1E3B5C] rounded-[12px] p-4 sm:p-5 shadow-xs">
              <h3 className="font-bold text-[16px] text-[#062C55] dark:text-white leading-[26px] mb-1">
                Final pay is immediate
              </h3>
              <p className="text-[14px] text-[#12202E] dark:text-[#D3E2EF] leading-[22px]">
                California requires all earned wages, including unused vacation, on your last day
                when you&apos;re let go. A severance offer can&apos;t be used to delay that.
              </p>
            </div>

            <div className="bg-white dark:bg-[#0D2238] border border-[#DFE3E8] dark:border-[#1E3B5C] rounded-[12px] p-4 sm:p-5 shadow-xs">
              <h3 className="font-bold text-[16px] text-[#062C55] dark:text-white leading-[26px] mb-1">
                No pay-in-lieu escape
              </h3>
              <p className="text-[14px] text-[#12202E] dark:text-[#D3E2EF] leading-[22px]">
                Under Cal-WARN, paying you instead of giving notice doesn&apos;t cure a missing notice
                the way it sometimes can federally.
              </p>
            </div>
          </div>
        </section>

        {/* The federal rules that apply everywhere */}
        <section className="mb-9">
          <h2 className="font-serif text-[24px] font-semibold text-[#062C55] dark:text-white leading-[38px] mb-2.5">
            The federal rules that apply everywhere
          </h2>
          <p className="text-[15px] text-[#12202E] dark:text-[#D3E2EF] leading-[24px]">
            If you&apos;re 40 or older and asked to give up age-discrimination claims, federal law
            (the OWBPA) says the release must give you at least 21 days to consider it (45 in a group
            program), 7 days after signing to take it back, and written advice to consult an attorney.
            In a group program you must also get a list of the ages and job titles of who was let go
            and who was kept. Separately, the federal WARN Act requires 60 days&apos; notice from
            employers with 100 or more employees for a covered mass layoff or closing.
            California&apos;s rules sit on top of these.
          </p>
        </section>

        {/* CTA Card */}
        <div className="bg-[#062C55] dark:bg-[#071D34] text-white rounded-[14px] p-6 sm:p-7 mb-10 flex flex-col sm:flex-row gap-4 sm:items-center justify-between border border-[#1A3B5C] shadow-sm">
          <div>
            <h3 className="font-serif font-semibold text-[22px] leading-[35px] text-white mb-0.5">
              Check your own agreement
            </h3>
            <p className="text-[14px] leading-[22px] text-[#C9D6E5]">
              Free, about 3 minutes. State is already set to California. No account, no sales call.
            </p>
          </div>
          <Link
            href="/questions?state=California"
            className="w-full sm:w-auto text-center font-extrabold text-[16px] leading-[26px] px-6 py-3 rounded-[9px] bg-[#0EB28D] hover:bg-[#0C8F72] text-white shadow-sm hover:brightness-105 active:scale-95 transition-all whitespace-nowrap"
          >
            Check my layoff →
          </Link>
        </div>

        {/* Common questions */}
        <section className="mb-10">
          <h2 className="font-serif text-[24px] font-semibold text-[#062C55] dark:text-white leading-[38px] mb-3">
            Common questions
          </h2>

          <div className="space-y-2.5">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = !!openFaq[idx];
              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-[#0D2238] border border-[#DFE3E8] dark:border-[#1E3B5C] rounded-[10px] overflow-hidden transition-all shadow-xs"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="w-full text-left p-3.5 sm:p-4 flex items-center justify-between gap-3 text-[#062C55] dark:text-white font-bold text-[16px] leading-[26px] cursor-pointer hover:bg-[#F9F8F6] dark:hover:bg-[#132C49] transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-[#062C55] dark:text-white text-[14px]">
                        {isOpen ? "▾" : "▸"}
                      </span>
                      <span>{item.q}</span>
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-4 pt-1 text-[14.5px] leading-[23px] text-[#12202E] dark:text-[#D3E2EF] border-t border-[#DFE3E8]/60 dark:border-[#1E3B5C]">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Other states with their own rules */}
        <section className="mb-10">
          <h2 className="font-serif text-[24px] font-semibold text-[#062C55] dark:text-white leading-[38px] mb-3">
            Other states with their own rules
          </h2>

          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/us/new-york"
              className="bg-white dark:bg-[#0D2238] border border-[#DFE3E8] dark:border-[#1E3B5C] rounded-[8px] px-3.5 py-1.5 text-[13px] font-bold text-[#062C55] dark:text-white hover:border-[#0C8F72] transition-colors"
            >
              New York
            </Link>
            <Link
              href="/us/new-jersey"
              className="bg-white dark:bg-[#0D2238] border border-[#DFE3E8] dark:border-[#1E3B5C] rounded-[8px] px-3.5 py-1.5 text-[13px] font-bold text-[#062C55] dark:text-white hover:border-[#0C8F72] transition-colors"
            >
              New Jersey
            </Link>
            <Link
              href="/us/illinois"
              className="bg-white dark:bg-[#0D2238] border border-[#DFE3E8] dark:border-[#1E3B5C] rounded-[8px] px-3.5 py-1.5 text-[13px] font-bold text-[#062C55] dark:text-white hover:border-[#0C8F72] transition-colors"
            >
              Illinois
            </Link>
            <Link
              href="/questions"
              className="bg-white dark:bg-[#0D2238] border border-[#DFE3E8] dark:border-[#1E3B5C] rounded-[8px] px-3.5 py-1.5 text-[13px] font-bold text-[#062C55] dark:text-white hover:border-[#0C8F72] transition-colors"
            >
              All states
            </Link>
          </div>
        </section>

        {/* Source Footer */}
        <footer className="border-t border-[#DFE3E8] dark:border-[#1E3B5C] pt-4 mt-8 pb-10 text-[12px] text-[#5A6B7D] dark:text-[#8EA5B8] leading-[1.6]">
          <p>
            Source:{" "}
            <a
              href="https://www.dir.ca.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0C8F72] dark:text-[#0EB28D] underline hover:opacity-80"
            >
              California Department of Industrial Relations
            </a>
            , plus the EEOC (OWBPA) and U.S. Department of Labor (WARN). Reviewed September 2026.
            FairExit is an educational and organizational tool, not a law firm, and nothing here is
            legal advice. See our{" "}
            <Link href="/legal" className="text-[#0C8F72] dark:text-[#0EB28D] underline hover:opacity-80">
              Terms &amp; Disclaimer
            </Link>
            .
          </p>
        </footer>
      </main>

      <FloatingActions />
    </div>
  );
}

