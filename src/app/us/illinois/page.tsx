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
    q: "Does Illinois require severance?",
    a: "No. Illinois law does not require severance pay unless promised in an employment contract, agreement, or written employer policy. What it does require is 60 days' notice for covered layoffs under the Illinois WARN Act.",
  },
  {
    q: "Is my non-compete enforceable in Illinois?",
    a: "Under the Illinois Freedom to Work Act, non-compete agreements are void and illegal if you earn under $75,000 per year (increasing to $80,000 in 2027). Even if you earn above that threshold, employers must give you at least 14 days to review the covenant and advise you in writing to consult an attorney.",
  },
  {
    q: "How much notice does Illinois WARN require?",
    a: "60 calendar days of advance written notice to affected workers, union representatives, the Illinois Department of Commerce and Economic Opportunity, and local officials.",
  },
];

export default function IllinoisStatePage() {
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
            ILLINOIS · ILLINOIS WARN ACT (820 ILCS 65) AND ILLINOIS FREEDOM TO WORK ACT
          </span>
          <h1 className="font-serif text-[32px] sm:text-[38px] font-semibold text-[#062C55] dark:text-white leading-[1.12] tracking-[-0.5px]">
            Severance and layoff rules in Illinois: what the law requires
          </h1>
        </div>

        {/* Short Answer Card */}
        <div className="bg-white dark:bg-[#0D2238] rounded-[12px] border border-[#DFE3E8] dark:border-[#1E3B5C] border-l-[4px] border-l-[#0EB28D] p-5 sm:p-[18px_22px] shadow-xs">
          <p className="text-[15px] sm:text-[15.5px] leading-[1.62] text-[#12202E] dark:text-[#D3E2EF]">
            <strong className="font-bold text-[#062C55] dark:text-white mr-1.5">Short answer.</strong>
            Illinois has no minimum severance, but its own WARN law covers employers with 75 or more employees and requires 60 days&apos; notice for layoffs of 25 or more at one site. Illinois also bans non-competes for workers earning under $75,000 and requires 14 days to review one. Federal age-40+ release rules still apply.
          </p>
        </div>

        <p className="text-[12px] text-[#5A6B7D] dark:text-[#8EA5B8] mt-2.5 mb-8 leading-[1.58]">
          Information to help you get oriented, not legal advice. Federal rules apply everywhere; this page covers what Illinois adds. Official source at the bottom.
        </p>

        {/* Illinois at a glance Table */}
        <section className="mb-9">
          <h2 className="font-serif text-[24px] font-semibold text-[#062C55] dark:text-white leading-[38px] mb-3">
            Illinois at a glance
          </h2>

          <div className="overflow-hidden border border-[#DFE3E8] dark:border-[#1E3B5C] rounded-[12px] bg-white dark:bg-[#0D2238] shadow-xs">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-[#EEF2F6] dark:bg-[#132C49] border-b border-[#DFE3E8] dark:border-[#1E3B5C]">
                  <th className="px-4 sm:px-5 py-3 text-[12px] font-bold text-[#062C55] dark:text-white uppercase tracking-[0.5px] w-1/3">
                    QUESTION
                  </th>
                  <th className="px-4 sm:px-5 py-3 text-[12px] font-bold text-[#062C55] dark:text-white uppercase tracking-[0.5px] w-2/3">
                    ILLINOIS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DFE3E8] dark:divide-[#1E3B5C] text-[14.5px] text-[#12202E] dark:text-[#D3E2EF] leading-[23px]">
                <tr>
                  <td className="px-4 sm:px-5 py-3.5 font-bold text-[#062C55] dark:text-white align-top">
                    Notice law
                  </td>
                  <td className="px-4 sm:px-5 py-3.5 align-top">
                    Illinois WARN: 75+ employees, 60 days&apos; written notice for 25+ layoffs at one site (if 33% of staff) or 250+, or a closing
                  </td>
                </tr>
                <tr>
                  <td className="px-4 sm:px-5 py-3.5 font-bold text-[#062C55] dark:text-white align-top">
                    Severance minimum
                  </td>
                  <td className="px-4 sm:px-5 py-3.5 align-top">
                    None. Only a written promise creates one
                  </td>
                </tr>
                <tr>
                  <td className="px-4 sm:px-5 py-3.5 font-bold text-[#062C55] dark:text-white align-top">
                    Non-competes
                  </td>
                  <td className="px-4 sm:px-5 py-3.5 align-top">
                    Void for workers earning under $75,000 (rising over time); 14 days to review and advice to consult an attorney required
                  </td>
                </tr>
                <tr>
                  <td className="px-4 sm:px-5 py-3.5 font-bold text-[#062C55] dark:text-white align-top">
                    Age-40+ release
                  </td>
                  <td className="px-4 sm:px-5 py-3.5 align-top">
                    Federal OWBPA: 21 days to consider (45 in a group), 7 days to revoke, written advice to see an attorney
                  </td>
                </tr>
                <tr>
                  <td className="px-4 sm:px-5 py-3.5 font-bold text-[#062C55] dark:text-white align-top">
                    Final pay
                  </td>
                  <td className="px-4 sm:px-5 py-3.5 align-top">
                    Due by the next payday, including earned vacation
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* What's different about Illinois */}
        <section className="mb-9">
          <h2 className="font-serif text-[24px] font-semibold text-[#062C55] dark:text-white leading-[38px] mb-3">
            What&apos;s different about Illinois
          </h2>

          <div className="space-y-3">
            <div className="bg-white dark:bg-[#0D2238] border border-[#DFE3E8] dark:border-[#1E3B5C] rounded-[12px] p-4 sm:p-5 shadow-xs">
              <h3 className="font-bold text-[16px] text-[#062C55] dark:text-white leading-[26px] mb-1">
                Lower trigger than federal
              </h3>
              <p className="text-[14px] text-[#12202E] dark:text-[#D3E2EF] leading-[22px]">
                Illinois WARN starts at 75 employees and 25 laid-off workers at one site, versus 100 and 50 federally.
              </p>
            </div>

            <div className="bg-white dark:bg-[#0D2238] border border-[#DFE3E8] dark:border-[#1E3B5C] rounded-[12px] p-4 sm:p-5 shadow-xs">
              <h3 className="font-bold text-[16px] text-[#062C55] dark:text-white leading-[26px] mb-1">
                Non-compete pay floor
              </h3>
              <p className="text-[14px] text-[#12202E] dark:text-[#D3E2EF] leading-[22px]">
                If you earned under $75,000, a non-compete is void in Illinois. Above that, it still needs 14 days&apos; review and attorney advice to be enforceable.
              </p>
            </div>

            <div className="bg-white dark:bg-[#0D2238] border border-[#DFE3E8] dark:border-[#1E3B5C] rounded-[12px] p-4 sm:p-5 shadow-xs">
              <h3 className="font-bold text-[16px] text-[#062C55] dark:text-white leading-[26px] mb-1">
                Earned vacation is owed
              </h3>
              <p className="text-[14px] text-[#12202E] dark:text-[#D3E2EF] leading-[22px]">
                Illinois treats earned vacation as wages. It must be paid out on termination regardless of policy.
              </p>
            </div>

            <div className="bg-white dark:bg-[#0D2238] border border-[#DFE3E8] dark:border-[#1E3B5C] rounded-[12px] p-4 sm:p-5 shadow-xs">
              <h3 className="font-bold text-[16px] text-[#062C55] dark:text-white leading-[26px] mb-1">
                Attorney-fee rule
              </h3>
              <p className="text-[14px] text-[#12202E] dark:text-[#D3E2EF] leading-[22px]">
                An employer that loses a non-compete case in Illinois can owe your attorney fees, which changes the leverage.
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
            If you&apos;re 40 or older and asked to give up age-discrimination claims, federal law (the OWBPA) says the release must give you at least 21 days to consider it (45 in a group program), 7 days after signing to take it back, and written advice to consult an attorney. In a group program you must also get a list of the ages and job titles of who was let go and who was kept. Separately, the federal WARN Act requires 60 days&apos; notice from employers with 100 or more employees for a covered mass layoff or closing. Illinois&apos;s rules sit on top of these.
          </p>
        </section>

        {/* CTA Card */}
        <div className="bg-[#062C55] dark:bg-[#071D34] text-white rounded-[14px] p-6 sm:p-7 mb-10 flex flex-col sm:flex-row gap-4 sm:items-center justify-between border border-[#1A3B5C] shadow-sm">
          <div>
            <h3 className="font-serif font-semibold text-[22px] leading-[35px] text-white mb-0.5">
              Check your own agreement
            </h3>
            <p className="text-[14px] leading-[22px] text-[#C9D6E5]">
              Free, about 3 minutes. State is already set to Illinois. No account, no sales call.
            </p>
          </div>
          <Link
            href="/questions?state=Illinois"
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
              href="/us/new-jersey"
              className="bg-white dark:bg-[#0D2238] border border-[#DFE3E8] dark:border-[#1E3B5C] rounded-[8px] px-3.5 py-1.5 text-[13px] font-bold text-[#062C55] dark:text-white hover:border-[#0C8F72] transition-colors"
            >
              New Jersey
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
              href="https://labor.illinois.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0C8F72] dark:text-[#0EB28D] underline hover:opacity-80"
            >
              Illinois Department of Labor
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

