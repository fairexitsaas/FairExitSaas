"use client";

import React from "react";
import Link from "next/link";
import { CountryCode } from "@/context/CountryContext";

interface JurisdictionRulesProps {
  country: CountryCode;
}

const CANADA_PROVINCES = [
  {
    name: "Ontario",
    desc: "Termination pay + severance pay · $2.5M payroll test · mass termination",
    href: "/canada/ontario",
    action: "Read the rules →",
  },
  {
    name: "British Columbia",
    desc: "8-week cap · 13-week temporary layoff · group notice",
    href: "/canada/british-columbia",
    action: "Read the rules →",
  },
  {
    name: "Alberta",
    desc: "Steps at 2/4/6/8/10 yrs · 90-day temporary layoff",
    href: "/canada/alberta",
    action: "Read the rules →",
  },
  {
    name: "Federally regulated",
    desc: "Banks, telecom, air, rail · notice + severance · unjust dismissal",
    href: "/canada/federal",
    action: "Read the rules →",
  },
  {
    name: "Saskatchewan",
    desc: "Notice after 13 weeks · 8-week cap · group rule starts at 25",
    href: "/canada/severance-pay-saskatchewan",
    action: "Read the rules →",
  },
  {
    name: "Manitoba",
    desc: "Notice from 30 days · 8-week cap · group notice up to 18 weeks",
    href: "/canada/severance-pay-manitoba",
    action: "Read the rules →",
  },
  {
    name: "Nova Scotia",
    desc: "8-week cap · just cause needed after 10 years",
    href: "/canada/severance-pay-nova-scotia",
    action: "Read the rules →",
  },
  {
    name: "New Brunswick",
    desc: "Two steps: 2 or 4 weeks · reasons in writing",
    href: "/canada/severance-pay-new-brunswick",
    action: "Read the rules →",
  },
  {
    name: "Prince Edward Island",
    desc: "New Act since June 30, 2026 · notice from 90 days",
    href: "/canada/severance-pay-prince-edward-island",
    action: "Read the rules →",
  },
  {
    name: "Newfoundland & Labrador",
    desc: "6-week cap, the lowest in Canada",
    href: "/canada/severance-pay-newfoundland-and-labrador",
    action: "Read the rules →",
  },
];

const US_STATES = [
  {
    name: "California",
    desc: "Cal-WARN at 75+ employees · non-competes void · final pay on your last day",
    href: "/us/california",
    action: "Read the rules →",
  },
  {
    name: "New York",
    desc: "90 days' notice · 50+ employees · 25 laid off triggers it",
    href: "/us/new-york",
    action: "Read the rules →",
  },
  {
    name: "New Jersey",
    desc: "Mandatory severance: a week per year · 90 days' notice",
    href: "/us/new-jersey",
    action: "Read the rules →",
  },
  {
    name: "Illinois",
    desc: "Illinois WARN at 75+ · non-competes void under $75k ",
    href: "/us/illinois",
    action: "Read the rules →",
  },
  {
    name: "Every state",
    desc: "Final pay, unused vacation, unemployment and layoff-notice rules, one row per state",
    href: "/questions",
    action: "See all 50 →",
  },
];

export default function JurisdictionRules({ country }: JurisdictionRulesProps) {
  const isCanada = country === "CA";

  return (
    <section className="py-20 bg-[#F6F4EF] dark:bg-[#062C55] transition-colors" id="states">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-6 sm:mb-8 text-left max-w-3xl">
          <span className="inline-flex items-center text-xs font-extrabold uppercase tracking-[1.4px] text-greend dark:text-[#0EB28D]">
            {isCanada ? "SEVERANCE RULES BY PROVINCE" : "LAYOFF RULES BY STATE"}
          </span>
          <h2 className="font-serif text-[26px] sm:text-[32px] text-navy dark:text-white font-semibold leading-[1.15] tracking-[-0.5px] mt-2 mb-2">
            {isCanada
              ? "The law is provincial. So is our read."
              : "Federal law is the floor. Some states add more."}
          </h2>
          <p className="text-[15px] sm:text-base leading-[1.6] text-slate dark:text-[#9AB1C6]">
            {isCanada
              ? "Each page shows the legal minimum table, the one thing that province does differently, and three worked examples, all generated from the same rules engine as the free check."
              : "Most states rely on the federal rules alone. These four add their own notice, severance or non-compete rules, so each gets its own page: what the state requires, what's different, and the questions people ask."}
          </p>
        </div>

        {/* Cards Grid */}
        {isCanada ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {CANADA_PROVINCES.map((p, idx) => (
                <Link
                  key={idx}
                  href={p.href}
                  className="group bg-white dark:bg-[#0D2238] rounded-xl p-5 border border-[#DFE3E8] dark:border-[#1E3B5C] hover:border-[#0EB28D] transition-all flex flex-col justify-between shadow-2xs hover:shadow-sm"
                >
                  <div>
                    <h3 className="font-bold text-[16px] text-[#062C55] dark:text-white group-hover:text-[#0EB28D] transition-colors mb-2">
                      {p.name}
                    </h3>
                    <p className="text-[13px] text-[#5A6B7D] dark:text-[#9AB1C6] leading-relaxed mb-6">
                      {p.desc}
                    </p>
                  </div>

                  <div className="flex items-center text-[13px] font-bold text-[#0C8F72] dark:text-[#0EB28D] group-hover:text-[#0a755d] transition-colors pt-2">
                    <span>{p.action}</span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Footnote for Canada */}
            <p className="text-[12px] text-[#5A6B7D] dark:text-[#8EA5B8] leading-relaxed">
              Every province page is checked against the official source. FairExit does not cover Quebec or the territories.
            </p>
          </>
        ) : (
          /* US Grid: 3 columns matching Figma */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {US_STATES.map((s, idx) => (
              <Link
                key={idx}
                href={s.href}
                className="group bg-white dark:bg-[#0D2238] rounded-xl p-6 border border-[#DFE3E8] dark:border-[#1E3B5C] hover:border-[#0EB28D] transition-all flex flex-col justify-between shadow-2xs hover:shadow-sm"
              >
                <div>
                  <h3 className="font-bold text-[17px] text-[#062C55] dark:text-white group-hover:text-[#0EB28D] transition-colors mb-2">
                    {s.name}
                  </h3>
                  <p className="text-[13.5px] text-[#5A6B7D] dark:text-[#9AB1C6] leading-relaxed mb-6">
                    {s.desc}
                  </p>
                </div>

                <div className="flex items-center text-[13px] font-bold text-[#0C8F72] dark:text-[#0EB28D] group-hover:text-[#0a755d] transition-colors pt-2">
                  <span>{s.action}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
