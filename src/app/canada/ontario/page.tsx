"use client";

import React, { useState } from "react";
import Link from "next/link";

interface FaqItem {
  q: string;
  a: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    q: "Is severance pay mandatory in Ontario?",
    a: "Termination pay is mandatory after 3 months. Severance pay is a second, separate entitlement for people with 5 or more years at an employer with a payroll of $2.5 million or more. Both are floors; common-law notice is often higher.",
  },
  {
    q: "How much severance is 10 years in Ontario?",
    a: "The ESA floor is 8 weeks' termination pay, plus 10 weeks' severance pay if the payroll test is met, so 18 weeks. Courts often give a 10-year employee 8 to 12 months when no valid clause limits them.",
  },
  {
    q: "Can I be put on temporary layoff in Ontario?",
    a: "Only if your contract or past practice allows it. A layoff you never agreed to can be treated as a termination, and even an allowed one becomes a termination after 13 weeks in 20.",
  },
];

export default function OntarioProvincePage() {
  const [openFaq, setOpenFaq] = useState<Record<number, boolean>>({});

  const toggleFaq = (index: number) => {
    setOpenFaq((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  return (
    <div className="min-h-screen bg-[#F6F4EF] text-[#12202E] font-sans antialiased selection:bg-[#c7e6d6]">
      <main className="max-w-[820px] mx-auto px-5 sm:px-6 pt-7 pb-16">
        {/* Top Header / Breadcrumb */}
        <div className="flex items-center justify-between text-[13px] mb-7">
          <Link
            href="/"
            className="font-bold text-[#0C8F72] hover:text-[#0a755d] underline transition-colors"
          >
            ← FairExit Canada
          </Link>
          <span className="text-[#5A6B7D]">Rules v0.1.0 · reviewed 2026-08-11</span>
        </div>

        {/* Title Area */}
        <div className="mb-6">
          <span className="block text-[11px] font-extrabold uppercase tracking-[0.5px] text-[#0C8F72] mb-1.5">
            ONTARIO · EMPLOYMENT STANDARDS ACT, 2000 (ESA)
          </span>
          <h1 className="font-serif text-[32px] sm:text-[38px] font-semibold text-[#062C55] leading-[1.12] tracking-[-0.5px]">
            Severance pay in Ontario: the minimum, and what courts add
          </h1>
        </div>

        {/* Short Answer Card */}
        <div className="bg-white rounded-[12px] border border-[#DFE3E8] border-l-[4px] border-l-[#0EB28D] p-5 sm:p-[18px_22px] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-[15px] sm:text-[15.5px] leading-[1.62] text-[#12202E]">
            <strong className="font-bold text-[#062C55] mr-1.5">Short answer.</strong>
            In Ontario the legal minimum is termination pay of 1 to 8 weeks based on years of
            service, plus severance pay of up to 26 weeks if you have 5+ years and the employer&apos;s
            global payroll is $2.5M or more. Courts often award more under common law (typically 1
            to 24 months) unless a valid contract clause limits you to the minimum.
          </p>
        </div>

        <p className="text-[12px] text-[#5A6B7D] mt-2.5 mb-8 leading-[1.58]">
          Information to help you get oriented, not legal advice. Every number below is generated
          from the same rules engine that powers our free check, and cites the official source at the
          bottom.
        </p>

        {/* Layer 1 */}
        <section className="mb-9">
          <h2 className="font-serif text-[24px] font-semibold text-[#062C55] leading-[1.2] mb-2.5">
            Layer 1 · Statutory notice (the floor)
          </h2>
          <p className="text-[15px] text-[#12202E] leading-[1.6] mb-3.5">
            The Employment Standards Act, 2000 (ESA) sets a minimum number of weeks&apos; notice, or
            pay instead of notice, based only on how long you worked there. It ignores your age,
            your role and your job market. The cap is{" "}
            <strong className="font-bold text-[#12202E]">8 weeks</strong>.
          </p>

          {/* Table */}
          <div className="overflow-hidden border border-[#DFE3E8] rounded-[12px] bg-white shadow-xs">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-[#EEF2F6] border-b border-[#DFE3E8]">
                  <th className="px-4 sm:px-5 py-3 text-[12px] font-bold text-[#062C55] uppercase tracking-[0.5px] w-1/2">
                    LENGTH OF SERVICE
                  </th>
                  <th className="px-4 sm:px-5 py-3 text-[12px] font-bold text-[#062C55] uppercase tracking-[0.5px] w-1/2">
                    MINIMUM NOTICE OR PAY
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DFE3E8] text-[14.5px]">
                <tr>
                  <td className="px-4 sm:px-5 py-3 text-[#12202E]">3 months to under 1 yr</td>
                  <td className="px-4 sm:px-5 py-3 font-bold text-[#12202E]">1 week</td>
                </tr>
                <tr>
                  <td className="px-4 sm:px-5 py-3 text-[#12202E]">1 yr to under 3 yrs</td>
                  <td className="px-4 sm:px-5 py-3 font-bold text-[#12202E]">2 weeks</td>
                </tr>
                <tr>
                  <td className="px-4 sm:px-5 py-3 text-[#12202E]">3 yrs to under 4 yrs</td>
                  <td className="px-4 sm:px-5 py-3 font-bold text-[#12202E]">3 weeks</td>
                </tr>
                <tr>
                  <td className="px-4 sm:px-5 py-3 text-[#12202E]">4 yrs to under 5 yrs</td>
                  <td className="px-4 sm:px-5 py-3 font-bold text-[#12202E]">4 weeks</td>
                </tr>
                <tr>
                  <td className="px-4 sm:px-5 py-3 text-[#12202E]">5 yrs to under 6 yrs</td>
                  <td className="px-4 sm:px-5 py-3 font-bold text-[#12202E]">5 weeks</td>
                </tr>
                <tr>
                  <td className="px-4 sm:px-5 py-3 text-[#12202E]">6 yrs to under 7 yrs</td>
                  <td className="px-4 sm:px-5 py-3 font-bold text-[#12202E]">6 weeks</td>
                </tr>
                <tr>
                  <td className="px-4 sm:px-5 py-3 text-[#12202E]">7 yrs to under 8 yrs</td>
                  <td className="px-4 sm:px-5 py-3 font-bold text-[#12202E]">7 weeks</td>
                </tr>
                <tr>
                  <td className="px-4 sm:px-5 py-3 text-[#12202E]">8 yrs to and up</td>
                  <td className="px-4 sm:px-5 py-3 font-bold text-[#12202E]">8 weeks</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Layer 2 */}
        <section className="mb-9">
          <h2 className="font-serif text-[24px] font-semibold text-[#062C55] leading-[1.2] mb-2.5">
            Layer 2 · Severance pay (Ontario only)
          </h2>
          <p className="text-[15px] text-[#12202E] leading-[1.6]">
            One week&apos;s pay per year of service, prorated, to a maximum of{" "}
            <strong className="font-bold text-[#12202E]">26 weeks</strong>. It applies only if{" "}
            <strong className="font-bold text-[#12202E]">both</strong> are true: you have 5 or more
            years of service, and the employer&apos;s payroll is{" "}
            <strong className="font-bold text-[#12202E]">$2.5 million or more</strong>, counted
            across all locations and related companies. It is paid{" "}
            <em className="italic">on top of</em> termination pay.
          </p>
        </section>

        {/* Layer 3 */}
        <section className="mb-9">
          <h2 className="font-serif text-[24px] font-semibold text-[#062C55] leading-[1.2] mb-2.5">
            Layer 3 · Common-law reasonable notice (what courts add)
          </h2>
          <p className="text-[15px] text-[#12202E] leading-[1.6]">
            Unless you signed a contract with a{" "}
            <strong className="font-bold text-[#12202E]">valid</strong> clause limiting you to the
            statutory minimum, Ontario courts award &quot;reasonable notice&quot; using four factors
            from <em className="italic">Bardal v. Globe &amp; Mail</em>: your age, your length of
            service, the character of your role, and how hard it is to find similar work. Awards
            run from about a month to a practical ceiling of 24 months. Whether your clause is valid
            is the first thing an employment lawyer checks, and a large share of clauses fail.
          </p>
        </section>

        {/* What's different about Ontario */}
        <section className="mb-9">
          <h2 className="font-serif text-[24px] font-semibold text-[#062C55] leading-[1.2] mb-3.5">
            What&apos;s different about Ontario
          </h2>
          <div className="flex flex-col gap-3">
            <div className="bg-white border border-[#DFE3E8] rounded-[12px] p-4 sm:p-5 shadow-xs">
              <h3 className="font-bold text-[16px] text-[#062C55] mb-1">
                Two statutory layers, not one
              </h3>
              <p className="text-[14px] text-[#12202E] leading-[1.6]">
                Ontario is the only province with a separate{" "}
                <strong className="font-bold">severance pay</strong> on top of termination pay:
                one week per year (max 26) if you have 5+ years <em className="italic">and</em> the
                employer&apos;s payroll is $2.5 million or more.
              </p>
            </div>

            <div className="bg-white border border-[#DFE3E8] rounded-[12px] p-4 sm:p-5 shadow-xs">
              <h3 className="font-bold text-[16px] text-[#062C55] mb-1">
                The payroll test is global
              </h3>
              <p className="text-[14px] text-[#12202E] leading-[1.6]">
                Courts count payroll across every location and related companies (
                <em className="italic">Hawkes v. Max Aicher</em>, 2021). Most online calculators
                only count the Ontario site, which under-counts.
              </p>
            </div>

            <div className="bg-white border border-[#DFE3E8] rounded-[12px] p-4 sm:p-5 shadow-xs">
              <h3 className="font-bold text-[16px] text-[#062C55] mb-1">
                Mass termination changes the floor
              </h3>
              <p className="text-[14px] text-[#12202E] leading-[1.6]">
                If 50+ people at one establishment are let go within 4 weeks, minimum notice jumps
                to 8, 12 or 16 weeks regardless of tenure.
              </p>
            </div>

            <div className="bg-white border border-[#DFE3E8] rounded-[12px] p-4 sm:p-5 shadow-xs">
              <h3 className="font-bold text-[16px] text-[#062C55] mb-1">
                Termination clauses fail often
              </h3>
              <p className="text-[14px] text-[#12202E] leading-[1.6]">
                Since <em className="italic">Waksdale v. Swegon</em> (2020), a contract that limits
                you to the ESA minimum is void if any part of its termination language breaks the
                Act. That reopens the common-law range.
              </p>
            </div>
          </div>
        </section>

        {/* Three Worked Examples */}
        <section className="mb-9">
          <h2 className="font-serif text-[24px] font-semibold text-[#062C55] leading-[1.2] mb-1.5">
            Three worked examples
          </h2>
          <p className="text-[15px] text-[#12202E] leading-[1.6] mb-4">
            Same three people, Ontario rules. The floor is what you can verify yourself. The range
            is what courts have awarded people like this when no valid clause capped them. Most
            offers land somewhere between.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Example 1 */}
            <div className="bg-white border border-[#DFE3E8] rounded-[12px] p-4 sm:p-5 flex flex-col justify-between shadow-xs">
              <div>
                <b className="block text-[16px] font-extrabold text-[#062C55]">Early career</b>
                <span className="block text-[12.5px] text-[#5A6B7D] mt-0.5 leading-normal">
                  Age 34 · 4 yrs · $62,000/yr · coordinator
                </span>
                <div className="h-[1px] bg-[#DFE3E8] my-3.5" />
                <span className="block text-[11px] uppercase tracking-[0.5px] text-[#5A6B7D]">
                  STATUTORY FLOOR
                </span>
                <b className="block text-[17px] font-bold text-[#062C55] mt-0.5 leading-tight">
                  $4,769
                </b>
                <span className="block text-[12px] text-[#5A6B7D] mt-0.5">4 wks notice</span>
              </div>

              <div>
                <div className="h-[1px] bg-[#DFE3E8] my-3.5" />
                <span className="block text-[11px] uppercase tracking-[0.5px] text-[#5A6B7D]">
                  COMMON-LAW RANGE
                </span>
                <b className="block text-[17px] font-bold text-[#062C55] mt-0.5 leading-tight">
                  $15,500 – $25,833
                </b>
                <span className="block text-[12px] text-[#5A6B7D] mt-0.5 leading-snug">
                  3–5 months, if no valid clause caps you
                </span>
              </div>
            </div>

            {/* Example 2 */}
            <div className="bg-white border border-[#DFE3E8] rounded-[12px] p-4 sm:p-5 flex flex-col justify-between shadow-xs">
              <div>
                <b className="block text-[16px] font-extrabold text-[#062C55]">Mid career</b>
                <span className="block text-[12.5px] text-[#5A6B7D] mt-0.5 leading-normal">
                  Age 47 · 11 yrs · $98,000/yr · professional
                </span>
                <div className="h-[1px] bg-[#DFE3E8] my-3.5" />
                <span className="block text-[11px] uppercase tracking-[0.5px] text-[#5A6B7D]">
                  STATUTORY FLOOR
                </span>
                <b className="block text-[17px] font-bold text-[#062C55] mt-0.5 leading-tight">
                  $35,808
                </b>
                <span className="block text-[12px] text-[#5A6B7D] mt-0.5">
                  8 wks notice + 11 wks severance
                </span>
              </div>

              <div>
                <div className="h-[1px] bg-[#DFE3E8] my-3.5" />
                <span className="block text-[11px] uppercase tracking-[0.5px] text-[#5A6B7D]">
                  COMMON-LAW RANGE
                </span>
                <b className="block text-[17px] font-bold text-[#062C55] mt-0.5 leading-tight">
                  $89,833 – $122,500
                </b>
                <span className="block text-[12px] text-[#5A6B7D] mt-0.5 leading-snug">
                  11–15 months, if no valid clause caps you
                </span>
              </div>
            </div>

            {/* Example 3 */}
            <div className="bg-white border border-[#DFE3E8] rounded-[12px] p-4 sm:p-5 flex flex-col justify-between shadow-xs">
              <div>
                <b className="block text-[16px] font-extrabold text-[#062C55]">Senior, long tenure</b>
                <span className="block text-[12.5px] text-[#5A6B7D] mt-0.5 leading-normal">
                  Age 58 · 21 yrs · $145,000/yr · senior manager
                </span>
                <div className="h-[1px] bg-[#DFE3E8] my-3.5" />
                <span className="block text-[11px] uppercase tracking-[0.5px] text-[#5A6B7D]">
                  STATUTORY FLOOR
                </span>
                <b className="block text-[17px] font-bold text-[#062C55] mt-0.5 leading-tight">
                  $80,865
                </b>
                <span className="block text-[12px] text-[#5A6B7D] mt-0.5">
                  8 wks notice + 21 wks severance
                </span>
              </div>

              <div>
                <div className="h-[1px] bg-[#DFE3E8] my-3.5" />
                <span className="block text-[11px] uppercase tracking-[0.5px] text-[#5A6B7D]">
                  COMMON-LAW RANGE
                </span>
                <b className="block text-[17px] font-bold text-[#062C55] mt-0.5 leading-tight">
                  $229,583 – $290,000
                </b>
                <span className="block text-[12px] text-[#5A6B7D] mt-0.5 leading-snug">
                  19–24 months, if no valid clause caps you
                </span>
              </div>
            </div>
          </div>

          {/* Yellow Model Disclaimer */}
          <div className="bg-[#FFF8E8] border border-[#ECDCA6] border-l-[4px] border-l-[#C9A227] rounded-[10px] p-4 mt-4 text-[13px] text-[#6B5A1E] leading-[1.62]">
            These are illustrations from a general model, not an assessment of anyone&apos;s case.
            Common-law ranges are estimates pending employment-lawyer review. Only a lawyer licensed
            in Ontario can tell you what you are owed.
          </div>
        </section>

        {/* CTA Bar */}
        <section className="bg-[#062C55] rounded-[14px] p-6 sm:p-7 mb-9 flex flex-col sm:flex-row sm:items-center justify-between gap-5 text-white shadow-md">
          <div className="max-w-[500px]">
            <h3 className="font-serif text-[22px] font-semibold text-white leading-tight mb-1">
              See where your own offer sits
            </h3>
            <p className="text-[14px] text-[#C9D6E5] leading-[1.6]">
              Free, about 3 minutes. Province is already set to Ontario. No account, no sales call.
            </p>
          </div>
          <Link
            href="/questions?country=CA&p=ON"
            className="w-full sm:max-w-[177px]  inline-flex items-center justify-center bg-[#0EB28D] hover:bg-[#0c8f72] text-white font-extrabold text-[16px] px-6 py-3.5 rounded-[9px] no-underline whitespace-nowrap transition-colors shadow-sm self-start sm:self-auto"
          >
            Check my offer →
          </Link>
        </section>

        {/* Deadlines That Matter */}
        <section className="mb-9">
          <h2 className="font-serif text-[24px] font-semibold text-[#062C55] leading-[1.2] mb-2.5">
            Deadlines that matter
          </h2>
          <p className="text-[15px] text-[#12202E] leading-[1.6]">
            You have 2 years to file an ESA claim with the Ministry of Labour, and generally 2
            years to sue for common-law notice. A severance offer usually comes with its own shorter
            deadline to sign. Don&apos;t let that deadline pressure you: a lawyer&apos;s first call is
            usually free and takes a day to arrange, and a reasonable employer will extend.
          </p>
        </section>

        {/* Common Questions */}
        <section className="mb-9">
          <h2 className="font-serif text-[24px] font-semibold text-[#062C55] leading-[1.2] mb-3.5">
            Common questions
          </h2>
          <div className="flex flex-col gap-2">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = !!openFaq[idx];
              return (
                <div
                  key={idx}
                  className="bg-white border border-[#DFE3E8] rounded-[10px] overflow-hidden transition-all shadow-xs"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="w-full text-left px-5 py-3.5 flex items-center gap-2.5 cursor-pointer hover:bg-[#FAF9F5] transition-colors"
                  >
                    <span
                      className={`text-[#062C55] font-bold text-[14px] transition-transform duration-200 ${
                        isOpen ? "rotate-90" : ""
                      }`}
                    >
                      ▸
                    </span>
                    <span className="font-bold text-[16px] text-[#062C55] leading-snug">
                      {item.q}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 pt-1 text-[14.5px] text-[#12202E] leading-[1.6] border-t border-[#F0EFEB]">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Other Jurisdictions */}
        <section className="mb-8">
          <h2 className="font-serif text-[24px] font-semibold text-[#062C55] leading-[1.2] mb-3.5">
            Other jurisdictions
          </h2>
          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/canada/british-columbia"
              className="bg-white border border-[#DFE3E8] hover:border-[#0EB28D] rounded-[8px] px-3.5 py-2 text-[13px] font-bold text-[#062C55] transition-colors shadow-2xs"
            >
              British Columbia
            </Link>
            <Link
              href="/canada/alberta"
              className="bg-white border border-[#DFE3E8] hover:border-[#0EB28D] rounded-[8px] px-3.5 py-2 text-[13px] font-bold text-[#062C55] transition-colors shadow-2xs"
            >
              Alberta
            </Link>
            <Link
              href="/canada/federal"
              className="bg-white border border-[#DFE3E8] hover:border-[#0EB28D] rounded-[8px] px-3.5 py-2 text-[13px] font-bold text-[#062C55] transition-colors shadow-2xs"
            >
              Federally regulated workplaces
            </Link>
            <Link
              href="/#provinces"
              className="bg-white border border-[#DFE3E8] hover:border-[#0EB28D] rounded-[8px] px-3.5 py-2 text-[13px] font-bold text-[#062C55] transition-colors shadow-2xs"
            >
              All provinces
            </Link>
          </div>
        </section>

        {/* Footer / Source Reference */}
        <div className="pt-6 border-t border-[#DFE3E8] text-[12px] text-[#5A6B7D] leading-[1.6]">
          <span>Source: </span>
          <a
            href="https://www.ontario.ca/document/your-guide-employment-standards-act-0/termination-employment"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#0C8F72] hover:text-[#0a755d] underline font-medium"
          >
            Ontario Ministry of Labour, Employment Standards Act, 2000 (ESA)
          </a>
          <span>
            . Statutory table from the official source; common-law band is a general estimate pending
            employment-lawyer sign-off. FairExit is an educational and organizational tool, not a
            law firm, and nothing here is legal advice. See our{" "}
          </span>
          <Link
            href="/legal"
            className="text-[#0C8F72] hover:text-[#0a755d] underline font-medium"
          >
            Terms &amp; Disclaimer
          </Link>
          <span>.</span>
        </div>
      </main>
    </div>
  );
}
