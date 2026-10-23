"use client";

import React from "react";
import { CountryCode } from "@/context/CountryContext";

interface JurisdictionRulesProps {
  country: CountryCode;
}

export default function JurisdictionRules({ country }: JurisdictionRulesProps) {
  const isCanada = country === "CA";

  if (isCanada) {
    return (
      <section className="py-16 mx-auto" id="provinces">
        <div className="wrap max-w-[1040px] mx-auto px-4 sm:px-6 w-full box-border">
          <span className="inline-flex items-center text-xs font-extrabold uppercase tracking-[1.4px] text-greend">
            Severance rules by province
          </span>
          <h2 className="font-serif text-[24px] text-navy dark:text-white font-semibold leading-[1.1] tracking-[-0.5px] my-1.5 mb-2.5">
            The law is provincial. So is our read.
          </h2>
          <p className="max-w-[640px] text-sm sm:text-[15px] text-slate leading-[1.55]">
            Each page shows the legal minimum table, the one thing that province does differently, and three worked examples, all generated from the same rules engine as the free check.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <a className="flex flex-col gap-1.5 bg-card border border-line rounded-[14px] p-5 py-[18px] no-underline text-ink dark:text-white hover:border-green hover:-translate-y-0.5 transition-all shadow-xs group" href="#hero">
              <b className="text-navy dark:text-white text-[15.5px] font-bold">Ontario</b>
              <span className="text-[12.5px] text-slate flex-1 leading-[1.45]">Termination pay + severance pay · $2.5M payroll test · mass termination</span>
              <i className="not-italic text-[12.5px] font-bold text-greend mt-2.5">Read the rules →</i>
            </a>
            <a className="flex flex-col gap-1.5 bg-card border border-line rounded-[14px] p-5 py-[18px] no-underline text-ink dark:text-white hover:border-green hover:-translate-y-0.5 transition-all shadow-xs group" href="#hero">
              <b className="text-navy dark:text-white text-[15.5px] font-bold">British Columbia</b>
              <span className="text-[12.5px] text-slate flex-1 leading-[1.45]">8-week cap · 13-week temporary layoff · group notice</span>
              <i className="not-italic text-[12.5px] font-bold text-greend mt-2.5">Read the rules →</i>
            </a>
            <a className="flex flex-col gap-1.5 bg-card border border-line rounded-[14px] p-5 py-[18px] no-underline text-ink dark:text-white hover:border-green hover:-translate-y-0.5 transition-all shadow-xs group" href="#hero">
              <b className="text-navy dark:text-white text-[15.5px] font-bold">Alberta</b>
              <span className="text-[12.5px] text-slate flex-1 leading-[1.45]">Steps at 2/4/6/8/10 yrs · 90-day temporary layoff</span>
              <i className="not-italic text-[12.5px] font-bold text-greend mt-2.5">Read the rules →</i>
            </a>
            <a className="flex flex-col gap-1.5 bg-card border border-line rounded-[14px] p-5 py-[18px] no-underline text-ink dark:text-white hover:border-green hover:-translate-y-0.5 transition-all shadow-xs group" href="#hero">
              <b className="text-navy dark:text-white text-[15.5px] font-bold">Federally regulated</b>
              <span className="text-[12.5px] text-slate flex-1 leading-[1.45]">Banks, telecom, air, rail · notice + severance · unjust dismissal</span>
              <i className="not-italic text-[12.5px] font-bold text-greend mt-2.5">Read the rules →</i>
            </a>
            <div className="flex flex-col gap-1.5 bg-transparent border border-dashed border-[#CBD5E1] dark:border-slate-700 rounded-[14px] p-5 py-[18px] text-ink dark:text-white shadow-xs">
              <b className="text-navy dark:text-white text-[15.5px] font-bold">Quebec</b>
              <span className="text-[12.5px] text-slate flex-1 leading-[1.45]">Civil-law regime · separate build</span>
              <i className="not-italic text-[12.5px] font-semibold text-slate mt-2.5">In review</i>
            </div>
            <div className="flex flex-col gap-1.5 bg-transparent border border-dashed border-[#CBD5E1] dark:border-slate-700 rounded-[14px] p-5 py-[18px] text-ink dark:text-white shadow-xs">
              <b className="text-navy dark:text-white text-[15.5px] font-bold">Manitoba · Saskatchewan</b>
              <span className="text-[12.5px] text-slate flex-1 leading-[1.45]">Legal minimum tables being verified</span>
              <i className="not-italic text-[12.5px] font-semibold text-slate mt-2.5">In review</i>
            </div>
            <div className="flex flex-col gap-1.5 bg-transparent border border-dashed border-[#CBD5E1] dark:border-slate-700 rounded-[14px] p-5 py-[18px] text-ink dark:text-white shadow-xs">
              <b className="text-navy dark:text-white text-[15.5px] font-bold">Nova Scotia · New Brunswick</b>
              <span className="text-[12.5px] text-slate flex-1 leading-[1.45]">Legal minimum tables being verified</span>
              <i className="not-italic text-[12.5px] font-semibold text-slate mt-2.5">In review</i>
            </div>
            <div className="flex flex-col gap-1.5 bg-transparent border border-dashed border-[#CBD5E1] dark:border-slate-700 rounded-[14px] p-5 py-[18px] text-ink dark:text-white shadow-xs">
              <b className="text-navy dark:text-white text-[15.5px] font-bold">PEI · Newfoundland &amp; Labrador</b>
              <span className="text-[12.5px] text-slate flex-1 leading-[1.45]">Legal minimum tables being verified</span>
              <i className="not-italic text-[12.5px] font-semibold text-slate mt-2.5">In review</i>
            </div>
          </div>
          <p className="text-[13px] text-slate mt-3.5 leading-[1.5]">
            We only publish a province once its table is verified against the official source. &quot;In review&quot; provinces can still use the free check; the read leans on court-awarded factors until the table is live.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 mx-auto" id="states">
      <div className="wrap max-w-[1040px] mx-auto px-4 sm:px-6 w-full box-border">
        <span className="inline-flex items-center text-xs font-extrabold uppercase tracking-[1.4px] text-greend">
          Layoff rules by state
        </span>
        <h2 className="font-serif text-[24px] text-navy dark:text-white font-semibold leading-[1.1] tracking-[-0.5px] my-1.5 mb-2.5">
          Federal law is the floor. Some states add more.
        </h2>
        <p className="max-w-[640px] text-sm sm:text-[15px] text-slate leading-[1.55]">
          Most states rely on the federal rules alone. These four add their own notice, severance or non-compete rules, so each gets its own page: what the state requires, what&apos;s different, and the questions people ask.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          <a className="flex flex-col gap-1.5 bg-card border border-line rounded-[14px] p-5 py-[18px] no-underline text-ink dark:text-white hover:border-green hover:-translate-y-0.5 transition-all shadow-xs group" href="#hero">
            <b className="text-navy dark:text-white text-[15.5px] font-bold">California</b>
            <span className="text-[12.5px] text-slate flex-1 leading-[1.45]">Cal-WARN at 75+ employees · non-competes void · final pay on your last day</span>
            <i className="not-italic text-[12.5px] font-bold text-greend mt-2.5">Read the rules →</i>
          </a>
          <a className="flex flex-col gap-1.5 bg-card border border-line rounded-[14px] p-5 py-[18px] no-underline text-ink dark:text-white hover:border-green hover:-translate-y-0.5 transition-all shadow-xs group" href="#hero">
            <b className="text-navy dark:text-white text-[15.5px] font-bold">New York</b>
            <span className="text-[12.5px] text-slate flex-1 leading-[1.45]">90 days&apos; notice · 50+ employees · 25 laid off triggers it</span>
            <i className="not-italic text-[12.5px] font-bold text-greend mt-2.5">Read the rules →</i>
          </a>
          <a className="flex flex-col gap-1.5 bg-card border border-line rounded-[14px] p-5 py-[18px] no-underline text-ink dark:text-white hover:border-green hover:-translate-y-0.5 transition-all shadow-xs group" href="#hero">
            <b className="text-navy dark:text-white text-[15.5px] font-bold">New Jersey</b>
            <span className="text-[12.5px] text-slate flex-1 leading-[1.45]">Mandatory severance: a week per year · 90 days&apos; notice</span>
            <i className="not-italic text-[12.5px] font-bold text-greend mt-2.5">Read the rules →</i>
          </a>
          <a className="flex flex-col gap-1.5 bg-card border border-line rounded-[14px] p-5 py-[18px] no-underline text-ink dark:text-white hover:border-green hover:-translate-y-0.5 transition-all shadow-xs group" href="#hero">
            <b className="text-navy dark:text-white text-[15.5px] font-bold">Illinois</b>
            <span className="text-[12.5px] text-slate flex-1 leading-[1.45]">Illinois WARN at 75+ · non-competes void under $75k</span>
            <i className="not-italic text-[12.5px] font-bold text-greend mt-2.5">Read the rules →</i>
          </a>
          <a className="flex flex-col gap-1.5 bg-card border border-line rounded-[14px] p-5 py-[18px] no-underline text-ink dark:text-white hover:border-green hover:-translate-y-0.5 transition-all shadow-xs group" href="#hero">
            <b className="text-navy dark:text-white text-[15.5px] font-bold">Every state</b>
            <span className="text-[12.5px] text-slate flex-1 leading-[1.45]">Final pay, unused vacation, unemployment and layoff-notice rules, one row per state</span>
            <i className="not-italic text-[12.5px] font-bold text-greend mt-2.5">See all 50 →</i>
          </a>
        </div>
      </div>
    </section>
  );
}
