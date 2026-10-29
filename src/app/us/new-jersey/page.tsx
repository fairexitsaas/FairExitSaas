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
    q: "Does New Jersey require severance pay?",
    a: "Only in a covered mass layoff, closing or transfer under NJ WARN: 1 week of pay per full year of service from an employer with 100 or more employees, plus 4 extra weeks if less than 90 days' notice was given. Outside that event there is no minimum.",
  },
  {
    q: "Does my severance offer count against the New Jersey minimum?",
    a: "Only if it is at least as much as the statutory amount, and it cannot be made conditional on signing a release. A waiver of the statutory severance needs state or court approval.",
  },
  {
    q: "How much notice does New Jersey WARN require?",
    a: "90 days' written notice when a covered employer ends 50 or more jobs in New Jersey within 30 days, closes an establishment, or transfers operations.",
  },
];

export default function NewJerseyStatePage() {
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
            NEW JERSEY · NEW JERSEY WARN (MILLVILLE DALLAS AIRMOTIVE PLANT JOB LOSS NOTIFICATION ACT)
          </span>
          <h1 className="font-serif text-[32px] sm:text-[38px] font-semibold text-[#062C55] dark:text-white leading-[1.12] tracking-[-0.5px]">
            Severance and layoff rules in New Jersey: what the law requires
          </h1>
        </div>

        {/* Short Answer Card */}
        <div className="bg-white dark:bg-[#0D2238] rounded-[12px] border border-[#DFE3E8] dark:border-[#1E3B5C] border-l-[4px] border-l-[#0EB28D] p-5 sm:p-[18px_22px] shadow-xs">
          <p className="text-[15px] sm:text-[15.5px] leading-[1.62] text-[#12202E] dark:text-[#D3E2EF]">
            <strong className="font-bold text-[#062C55] dark:text-white mr-1.5">Short answer.</strong>
            New Jersey is the one state with mandatory severance: for a covered mass layoff, employers with
            100 or more employees owe 90 days&apos; notice plus one week of severance pay for each full year
            of service. Federal age-40+ release rules still apply, and any release can&apos;t waive that
            statutory severance.
          </p>
        </div>

        <p className="text-[12px] text-[#5A6B7D] dark:text-[#8EA5B8] mt-2.5 mb-8 leading-[1.58]">
          Information to help you get oriented, not legal advice. Federal rules apply everywhere; this page
          covers what New Jersey adds. Official source at the bottom.
        </p>

        {/* New Jersey at a glance Table */}
        <section className="mb-9">
          <h2 className="font-serif text-[24px] font-semibold text-[#062C55] dark:text-white leading-[38px] mb-3">
            New Jersey at a glance
          </h2>

          <div className="overflow-hidden border border-[#DFE3E8] dark:border-[#1E3B5C] rounded-[12px] bg-white dark:bg-[#0D2238] shadow-xs">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-[#EEF2F6] dark:bg-[#132C49] border-b border-[#DFE3E8] dark:border-[#1E3B5C]">
                  <th className="px-4 sm:px-5 py-3 text-[12px] font-bold text-[#062C55] dark:text-white uppercase tracking-[0.5px] w-1/3">
                    QUESTION
                  </th>
                  <th className="px-4 sm:px-5 py-3 text-[12px] font-bold text-[#062C55] dark:text-white uppercase tracking-[0.5px] w-2/3">
                    NEW JERSEY
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DFE3E8] dark:divide-[#1E3B5C] text-[14.5px] text-[#12202E] dark:text-[#D3E2EF] leading-[23px]">
                <tr>
                  <td className="px-4 sm:px-5 py-3.5 font-bold text-[#062C55] dark:text-white align-top">
                    Notice law
                  </td>
                  <td className="px-4 sm:px-5 py-3.5 align-top">
                    NJ WARN: 100+ employees, 90 days&apos; written notice for 50+ layoffs (statewide, not per
                    site), a closing, or a transfer
                  </td>
                </tr>
                <tr>
                  <td className="px-4 sm:px-5 py-3.5 font-bold text-[#062C55] dark:text-white align-top">
                    Severance minimum
                  </td>
                  <td className="px-4 sm:px-5 py-3.5 align-top">
                    One week&apos;s pay per full year of service for covered mass layoffs, plus 4 extra weeks if
                    notice was short
                  </td>
                </tr>
                <tr>
                  <td className="px-4 sm:px-5 py-3.5 font-bold text-[#062C55] dark:text-white align-top">
                    Non-competes
                  </td>
                  <td className="px-4 sm:px-5 py-3.5 align-top">
                    Enforceable if reasonable; limits have been proposed
                  </td>
                </tr>
                <tr>
                  <td className="px-4 sm:px-5 py-3.5 font-bold text-[#062C55] dark:text-white align-top">
                    Age-40+ release
                  </td>
                  <td className="px-4 sm:px-5 py-3.5 align-top">
                    Federal OWBPA: 21 days to consider (45 in a group), 7 days to revoke, written advice to see
                    an attorney
                  </td>
                </tr>
                <tr>
                  <td className="px-4 sm:px-5 py-3.5 font-bold text-[#062C55] dark:text-white align-top">
                    Waivers
                  </td>
                  <td className="px-4 sm:px-5 py-3.5 align-top">
                    A release can&apos;t waive the statutory severance without state approval
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* What's different about New Jersey */}
        <section className="mb-9">
          <h2 className="font-serif text-[24px] font-semibold text-[#062C55] dark:text-white leading-[38px] mb-3">
            What&apos;s different about New Jersey
          </h2>

          <div className="space-y-3">
            <div className="bg-white dark:bg-[#0D2238] border border-[#DFE3E8] dark:border-[#1E3B5C] rounded-[12px] p-4 sm:p-5 shadow-xs">
              <h3 className="font-bold text-[16px] text-[#062C55] dark:text-white leading-[26px] mb-1">
                The only mandatory severance in the US
              </h3>
              <p className="text-[14px] text-[#12202E] dark:text-[#D3E2EF] leading-[22px]">
                One week per year of service, on top of any notice, for a covered layoff. If your offer is
                less, the shortfall is the law&apos;s, not a negotiation.
              </p>
            </div>

            <div className="bg-white dark:bg-[#0D2238] border border-[#DFE3E8] dark:border-[#1E3B5C] rounded-[12px] p-4 sm:p-5 shadow-xs">
              <h3 className="font-bold text-[16px] text-[#062C55] dark:text-white leading-[26px] mb-1">
                Fifty statewide, not per site
              </h3>
              <p className="text-[14px] text-[#12202E] dark:text-[#D3E2EF] leading-[22px]">
                New Jersey counts layoffs across the state, so a spread-out cut can still be covered.
              </p>
            </div>

            <div className="bg-white dark:bg-[#0D2238] border border-[#DFE3E8] dark:border-[#1E3B5C] rounded-[12px] p-4 sm:p-5 shadow-xs">
              <h3 className="font-bold text-[16px] text-[#062C55] dark:text-white leading-[26px] mb-1">
                Short notice adds four weeks
              </h3>
              <p className="text-[14px] text-[#12202E] dark:text-[#D3E2EF] leading-[22px]">
                If the employer gives less than 90 days, an extra four weeks of severance is owed.
              </p>
            </div>

            <div className="bg-white dark:bg-[#0D2238] border border-[#DFE3E8] dark:border-[#1E3B5C] rounded-[12px] p-4 sm:p-5 shadow-xs">
              <h3 className="font-bold text-[16px] text-[#062C55] dark:text-white leading-[26px] mb-1">
                Your release can&apos;t take it away
              </h3>
              <p className="text-[14px] text-[#12202E] dark:text-[#D3E2EF] leading-[22px]">
                Statutory severance can&apos;t be waived by a release unless the state approves the waiver.
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
            New Jersey&apos;s rules sit on top of these.
          </p>
        </section>

        {/* CTA Card */}
        <div className="bg-[#062C55] dark:bg-[#071D34] text-white rounded-[14px] p-6 sm:p-7 mb-10 flex flex-col sm:flex-row gap-4 sm:items-center justify-between border border-[#1A3B5C] shadow-sm">
          <div>
            <h3 className="font-serif font-semibold text-[22px] leading-[35px] text-white mb-0.5">
              Check your own agreement
            </h3>
            <p className="text-[14px] leading-[22px] text-[#C9D6E5]">
              Free, about 3 minutes. State is already set to New Jersey. No account, no sales call.
            </p>
          </div>
          <Link
            href="/questions?state=New%20Jersey"
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
              href="/us/california"
              className="bg-white dark:bg-[#0D2238] border border-[#DFE3E8] dark:border-[#1E3B5C] rounded-[8px] px-3.5 py-1.5 text-[13px] font-bold text-[#062C55] dark:text-white hover:border-[#0C8F72] transition-colors"
            >
              California
            </Link>
            <Link
              href="/us/new-york"
              className="bg-white dark:bg-[#0D2238] border border-[#DFE3E8] dark:border-[#1E3B5C] rounded-[8px] px-3.5 py-1.5 text-[13px] font-bold text-[#062C55] dark:text-white hover:border-[#0C8F72] transition-colors"
            >
              New York
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
              href="https://www.nj.gov/labor/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0C8F72] dark:text-[#0EB28D] underline hover:opacity-80"
            >
              New Jersey Department of Labor
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

