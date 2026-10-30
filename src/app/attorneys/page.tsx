"use client";

import React, { useState, useContext } from "react";
import Link from "next/link";
import Image from "next/image";
import FloatingActions from "@/components/landing/FloatingActions";
import { CountryContext, CountryCode } from "@/context/CountryContext";

interface FaqItem {
  q: string;
  a: React.ReactNode;
}

const ATTORNEY_FAQS: FaqItem[] = [
  {
    q: "Is this a referral fee?",
    a: (
      <span>
        It&apos;s a{" "}
        <strong className="font-bold text-[#062c55] dark:text-white">
          flat advertising / lead-generation fee
        </strong>{" "}
        — a fixed amount per in-scope lead we send, agreed up front. It is never a share of your fee or the recovery, and it&apos;s not fee-splitting with a nonlawyer (ABA Model Rule 5.4). We&apos;re not lawyers and don&apos;t give you a compliance opinion — state rules differ from the Model Rules, so you follow your state bar&apos;s advertising rules, and we&apos;ll hand you our template agreement to review first.
      </span>
    ),
  },
  {
    q: "What exactly do I receive?",
    a: (
      <span>
        A structured intake — the client&apos;s key facts, the OWBPA/WARN compliance flags noted for your review, their consent to be contacted, and any documents the client chooses to share.{" "}
        <strong className="font-bold text-[#062c55] dark:text-white">
          No AI report and no dollar figure
        </strong>{" "}
        — the legal judgment is entirely yours.
      </span>
    ),
  },
  {
    q: "How are the intakes organized?",
    a: (
      <span>
        Every client answers a short intake and can upload their agreement. We check it&apos;s complete and in-scope — state, employer size, notice, tenure, no duplicate — and organize the facts around federal and state layoff rules. We don&apos;t assess the legal merits; that call is entirely yours.
      </span>
    ),
  },
  {
    q: "What does it cost, and when do I pay?",
    a: (
      <span>
        A flat advertising / lead-generation fee, agreed with you up front. We&apos;ll talk through the exact number when we onboard you. It&apos;s never a percentage and never tied to any outcome.
      </span>
    ),
  },
  {
    q: "Do I have to take every lead?",
    a: (
      <span>
        No. You review each intake and decide. You&apos;re never obligated to take a matter, and you can set your monthly capacity so you&apos;re only sent what you can handle.
      </span>
    ),
  },
  {
    q: "How do you handle client data and privacy?",
    a: (
      <span>
        Minimal collection, explicit consent to be contacted, and documents shared only with the worker&apos;s consent rather than raw email attachments. Retention and handling terms are set out in the services agreement.
      </span>
    ),
  },
];

export default function AttorneysPage() {
  const context = useContext(CountryContext);
  const currentCountry: CountryCode = context?.Country || "US";

  // FAQ Accordion State (first item open by default)
  const [openFaqs, setOpenFaqs] = useState<{ [index: number]: boolean }>({
    0: true,
  });

  const toggleFaq = (idx: number) => {
    setOpenFaqs((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  // Early access form state
  const [formData, setFormData] = useState({
    name: "",
    firm: "",
    state: "",
    email: "",
  });
  const [toastMsg, setToastMsg] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setToastMsg(
      "Thanks — your early access request has been received. Our team will follow up shortly."
    );
    setFormData({ name: "", firm: "", state: "", email: "" });
    setTimeout(() => {
      setToastMsg("");
    }, 5000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f4ef] dark:bg-[#062c55] text-[#17242f] dark:text-[#eaf2f8] transition-colors">
      {/* HEADER / NAVBAR FOR ATTORNEYS */}
      <header className="sticky top-0 z-40 bg-[#f6f4ef]/90 dark:bg-[#062c55]/90 backdrop-blur-md border-b border-[#e7e4dd] dark:border-[#1e3b5c]">
        <div className="max-w-[1040px] mx-auto px-4 sm:px-6 h-[76px] sm:h-[80.5px] flex items-center justify-between">
          <div className="flex flex-col">
            <Link href="/" aria-label="FairExit home">
              <Image
                className="h-7 w-auto object-contain dark:hidden"
                src="/fairexitlogo.png"
                alt="FairExit"
                width={119}
                height={30}
                priority
              />
              <Image
                className="h-7 w-auto object-contain hidden dark:block"
                src="/fairexitlogo-dark.png"
                alt="FairExit"
                width={119}
                height={30}
                priority
              />
            </Link>
            <span className="text-[11.5px] font-bold text-[#0c8f72] dark:text-[#0eb28d] mt-0.5">
              For employment attorneys
            </span>
          </div>

          <div className="flex items-center gap-4 sm:gap-5">
            <Link
              href="/"
              className="hidden sm:inline-block font-semibold text-sm text-[#5a6b78] dark:text-[#9ab1c6] hover:text-[#062c55] dark:hover:text-white transition-colors"
            >
              ← For individuals
            </Link>
            <a
              href="#access"
              className="bg-[#0eb28d] hover:bg-[#0c8f72] text-white font-bold text-[13.5px] sm:text-[15px] px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl shadow-[0_18px_40px_-18px_rgba(5,43,84,0.12)] active:scale-95 transition-all text-center whitespace-nowrap"
            >
              Request early access
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full">
        {/* HERO */}
        <section className="pt-10 sm:pt-14 pb-8 px-4 sm:px-6 max-w-[1040px] mx-auto">
          <span className="text-xs font-extrabold tracking-[1.5px] uppercase text-[#0c8f72] dark:text-[#0eb28d] block mb-3">
            FAIREXIT FOR ATTORNEYS
          </span>
          <h1 className="font-serif font-semibold text-3xl sm:text-[46px] text-[#062c55] dark:text-white leading-[1.1] tracking-[-0.5px] max-w-[840px] mb-4">
            Layoff client intakes,{" "}
            <em className="italic text-[#0c8f72] dark:text-[#0eb28d]">organized</em>{" "}
            around the federal rules.
          </h1>
          <p className="text-base sm:text-[18px] text-[#5a6b78] dark:text-[#9ab1c6] max-w-[640px] leading-relaxed mb-6">
            In the US the questions usually aren&apos;t about a severance minimum — they&apos;re about the ADEA waiver and WARN notice. We organize a worker&apos;s intake around those rules, hand you a clean summary, and you pay a flat advertising / lead-gen fee —{" "}
            <strong className="font-bold text-[#17242f] dark:text-white">never</strong> a cut of the matter. We don&apos;t assess legal merit — that call is yours.
          </p>

          <div className="flex flex-wrap gap-3 mb-4">
            <a
              href="#access"
              className="w-full sm:w-auto font-bold text-[15.5px] sm:text-[16.5px] px-7 py-3.5 rounded-[14px] bg-[#0eb28d] hover:bg-[#0c8f72] text-white shadow-[0_18px_40px_-18px_rgba(5,43,84,0.12)] active:scale-95 transition-all text-center"
            >
              Request early access →
            </a>
            <a
              href="#how"
              className="w-full sm:w-auto font-bold text-[15.5px] sm:text-[16.5px] px-7 py-3.5 rounded-[14px] bg-white dark:bg-[#0d2238] border border-[#d3cec3] dark:border-[#1e3b5c] text-[#062c55] dark:text-white hover:border-[#0eb28d] active:scale-95 transition-all text-center"
            >
              How it works
            </a>
          </div>

          <div className="text-xs sm:text-[13px] text-[#5a6b78] dark:text-[#8ea5b8] mb-10 leading-relaxed">
            🔒 You choose which leads to take · a flat advertising / lead-gen fee · you follow your state bar&apos;s advertising rules
          </div>

          {/* STATS BAR */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-[#0d2238] border border-[#e7e4dd] dark:border-[#1e3b5c] rounded-[14px] p-5 sm:p-6 shadow-xs">
              <div className="font-serif text-[34px] font-semibold text-[#0c8f72] dark:text-[#0eb28d] leading-none mb-2">
                1.8M / mo
              </div>
              <div className="text-[13.5px] text-[#5a6b78] dark:text-[#9ab1c6] leading-snug">
                US workers laid off or discharged every month — your future clients, arriving in volume.
              </div>
              <div className="text-[10.5px] text-[#9a9384] dark:text-[#728393] mt-2.5">
                BLS JOLTS, Dec 2024 (1.8M layoffs &amp; discharges)
              </div>
            </div>

            <div className="bg-white dark:bg-[#0d2238] border border-[#e7e4dd] dark:border-[#1e3b5c] rounded-[14px] p-5 sm:p-6 shadow-xs">
              <div className="font-serif text-[34px] font-semibold text-[#0c8f72] dark:text-[#0eb28d] leading-none mb-2">
                60 days
              </div>
              <div className="text-[13.5px] text-[#5a6b78] dark:text-[#9ab1c6] leading-snug">
                The written notice federal WARN can require of a 100+-employee employer on a covered mass layoff or closing. Where notice was short, the amount and any claim are an attorney&apos;s call — the kind of situation worth your review.
              </div>
              <div className="text-[10.5px] text-[#9a9384] dark:text-[#728393] mt-2.5">
                Federal WARN Act, 29 U.S.C. §2102
              </div>
            </div>

            <div className="bg-white dark:bg-[#0d2238] border border-[#e7e4dd] dark:border-[#1e3b5c] rounded-[14px] p-5 sm:p-6 shadow-xs">
              <div className="font-serif text-[34px] font-semibold text-[#0c8f72] dark:text-[#0eb28d] leading-none mb-2">
                $0
              </div>
              <div className="text-[13.5px] text-[#5a6b78] dark:text-[#9ab1c6] leading-snug">
                Cut of the matter you ever pay. A flat advertising / lead-gen fee — never a percentage, never contingent.
              </div>
              <div className="text-[10.5px] text-[#9a9384] dark:text-[#728393] mt-2.5">
                Flat advertising / lead-generation fee
              </div>
            </div>
          </div>
        </section>

        {/* 2-MINUTE OVERVIEW / EXPLAINER VIDEO */}
        <section id="how" className="py-12 sm:py-16 px-4 sm:px-6 max-w-[1040px] mx-auto text-center scroll-mt-20">
          <span className="text-xs font-extrabold tracking-[1.5px] uppercase text-[#0c8f72] dark:text-[#0eb28d] block mb-1.5">
            2-MINUTE OVERVIEW
          </span>
          <h2 className="font-serif font-semibold text-2xl sm:text-[32px] text-[#062c55] dark:text-white tracking-[-0.5px] mb-6">
            How the partnership works.
          </h2>

          <div className="relative max-w-[760px] mx-auto h-[220px] sm:h-[427px] rounded-[18px] bg-gradient-to-br from-[#0e3560] to-[#06264a] shadow-[0_18px_40px_-18px_rgba(5,43,84,0.12)] flex items-center justify-center overflow-hidden">
            <span className="absolute top-4 right-4 bg-white/15 text-[#cfe0f0] text-[11px] font-extrabold tracking-[0.5px] uppercase px-3 py-1 rounded-full">
              COMING SOON
            </span>

            <div className="w-[76px] h-[76px] rounded-full bg-white/15 border-2 border-white/55 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform">
              <span className="text-white text-[26px] ml-1">▶</span>
            </div>
          </div>

          <p className="mt-5 text-[14px] text-[#5a6b78] dark:text-[#9ab1c6] max-w-[620px] mx-auto leading-relaxed">
            <strong className="font-bold text-[#062c55] dark:text-white mr-1">
              Explainer video coming soon.
            </strong>
            How the intake is organized, what a clean summary looks like, and how the flat advertising fee works.
          </p>
        </section>

        {/* THE PROBLEM WITH EMPLOYMENT LEADS */}
        <section className="py-12 sm:py-16 bg-white dark:bg-[#09223d] border-y border-[#e7e4dd] dark:border-[#1e3b5c] px-4 sm:px-6">
          <div className="max-w-[1040px] mx-auto">
            <span className="text-xs font-extrabold tracking-[1.5px] uppercase text-[#0c8f72] dark:text-[#0eb28d] block mb-2">
              THE PROBLEM WITH EMPLOYMENT LEADS
            </span>
            <h2 className="font-serif font-semibold text-2xl sm:text-[32px] text-[#062c55] dark:text-white tracking-[-0.5px] mb-3">
              Most leads waste the hour you spend qualifying them.
            </h2>
            <p className="text-[15px] sm:text-[17px] text-[#5a6b78] dark:text-[#9ab1c6] leading-relaxed mb-8">
              Age cases alone:{" "}
              <strong className="font-bold text-[#17242f] dark:text-white">12,965</strong> ADEA charges were filed with the EEOC in FY2023 — and those are only the workers who already pushed back.{" "}
              <span className="text-[12px] text-[#9a9384] dark:text-[#728393]">
                EEOC enforcement data, FY2023
              </span>
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Old Leads */}
              <div className="bg-[#faf9f6] dark:bg-[#0d2238] border border-[#e7e4dd] dark:border-[#1e3b5c] rounded-2xl p-6 sm:p-7">
                <h3 className="font-serif font-semibold text-[19px] text-[#062c55] dark:text-white mb-5 tracking-[-0.5px]">
                  Leads you get today
                </h3>
                <ul className="space-y-4 text-[14.5px] text-[#17242f] dark:text-[#d3e2ef]">
                  <li className="flex items-start gap-3">
                    <span className="text-[#b9805f] font-extrabold shrink-0 mt-0.5">✕</span>
                    <span>Cold names with no context — you do all the qualifying</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#b9805f] font-extrabold shrink-0 mt-0.5">✕</span>
                    <span>&ldquo;At-will, no case&rdquo; people mixed in with real ones</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#b9805f] font-extrabold shrink-0 mt-0.5">✕</span>
                    <span>Clients who read a blog and arrive with wrong expectations</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#b9805f] font-extrabold shrink-0 mt-0.5">✕</span>
                    <span>Generic lead-gen that sells the same name to five firms</span>
                  </li>
                </ul>
              </div>

              {/* FairExit Leads */}
              <div className="bg-[#fbfdfc] dark:bg-[#082236] border border-[#c7e6d6] dark:border-[#144f47] rounded-2xl p-6 sm:p-7 shadow-xs">
                <h3 className="font-serif font-semibold text-[19px] text-[#062c55] dark:text-white mb-5 tracking-[-0.5px]">
                  Leads from FairExit
                </h3>
                <ul className="space-y-4 text-[14.5px] text-[#17242f] dark:text-[#d3e2ef]">
                  <li className="flex items-start gap-3">
                    <span className="text-[#0c8f72] font-extrabold shrink-0 mt-0.5">✓</span>
                    <span>A structured intake — the facts you&apos;d ask for anyway</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#0c8f72] font-extrabold shrink-0 mt-0.5">✓</span>
                    <span>Organized around the federal rules that often matter (OWBPA, WARN, notes) — no merit call by us</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#0c8f72] font-extrabold shrink-0 mt-0.5">✓</span>
                    <span>No opinion attached — you make the legal call, clean</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#0c8f72] font-extrabold shrink-0 mt-0.5">✓</span>
                    <span>Matched to your state, with consent to be contacted on file</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS FOR YOU */}
        <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-[1040px] mx-auto">
          <span className="text-xs font-extrabold tracking-[1.5px] uppercase text-[#0c8f72] dark:text-[#0eb28d] block mb-2">
            HOW IT WORKS FOR YOU
          </span>
          <h2 className="font-serif font-semibold text-2xl sm:text-[32px] text-[#062c55] dark:text-white tracking-[-0.5px] mb-8">
            We do the organizing. You do the law.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white dark:bg-[#0d2238] border border-[#e7e4dd] dark:border-[#1e3b5c] rounded-2xl p-6 shadow-xs flex flex-col">
              <div className="w-[34px] h-[34px] rounded-full bg-[#062c55] dark:bg-[#0eb28d] text-white dark:text-[#04291f] font-bold text-base flex items-center justify-center mb-4">
                1
              </div>
              <h3 className="font-serif font-semibold text-[18px] text-[#062c55] dark:text-white mb-2 tracking-[-0.5px]">
                We organize the intake
              </h3>
              <p className="text-[14px] text-[#5a6b78] dark:text-[#9ab1c6] leading-[1.6]">
                The worker answers a short intake and (optionally) uploads their separation agreement. We organize the facts around the federal rules that often matter — OWBPA&apos;s conditions and the WARN Act. We don&apos;t decide whether any was violated; that call is yours.
              </p>
            </div>

            <div className="bg-white dark:bg-[#0d2238] border border-[#e7e4dd] dark:border-[#1e3b5c] rounded-2xl p-6 shadow-xs flex flex-col">
              <div className="w-[34px] h-[34px] rounded-full bg-[#062c55] dark:bg-[#0eb28d] text-white dark:text-[#04291f] font-bold text-base flex items-center justify-center mb-4">
                2
              </div>
              <h3 className="font-serif font-semibold text-[18px] text-[#062c55] dark:text-white mb-2 tracking-[-0.5px]">
                You get a clean intake
              </h3>
              <p className="text-[14px] text-[#5a6b78] dark:text-[#9ab1c6] leading-[1.6]">
                Only for workers in your state whose intake is complete and in-scope. Structured facts, the worker&apos;s consent to be contacted, and documents shared only with their consent — no data to chase.
              </p>
            </div>

            <div className="bg-white dark:bg-[#0d2238] border border-[#e7e4dd] dark:border-[#1e3b5c] rounded-2xl p-6 shadow-xs flex flex-col">
              <div className="w-[34px] h-[34px] rounded-full bg-[#062c55] dark:bg-[#0eb28d] text-white dark:text-[#04291f] font-bold text-base flex items-center justify-center mb-4">
                3
              </div>
              <h3 className="font-serif font-semibold text-[18px] text-[#062c55] dark:text-white mb-2 tracking-[-0.5px]">
                You take the ones you want
              </h3>
              <p className="text-[14px] text-[#5a6b78] dark:text-[#9ab1c6] leading-[1.6]">
                Review the intake, take the ones you want. You pay a flat advertising / lead-gen fee — nothing for the ones you pass on beyond what&apos;s agreed.
              </p>
            </div>
          </div>
        </section>

        {/* WHAT LANDS IN YOUR INBOX */}
        <section className="py-12 sm:py-16 bg-white dark:bg-[#09223d] border-y border-[#e7e4dd] dark:border-[#1e3b5c] px-4 sm:px-6">
          <div className="max-w-[1040px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column */}
            <div className="lg:col-span-6">
              <span className="text-xs font-extrabold tracking-[1.5px] uppercase text-[#0c8f72] dark:text-[#0eb28d] block mb-2">
                WHAT LANDS IN YOUR INBOX
              </span>
              <h2 className="font-serif font-semibold text-2xl sm:text-[28px] text-[#062c55] dark:text-white tracking-[-0.5px] mb-3">
                A clean intake — not an AI report.
              </h2>
              <p className="text-[15.5px] text-[#5a6b78] dark:text-[#9ab1c6] leading-[1.6] mb-6">
                We deliberately don&apos;t send you our analysis or a made-up number. You get the structured facts and where the compliance check failed — the legal judgment is yours. Here&apos;s the shape of it.
              </p>

              <ul className="space-y-3.5 text-[14.5px] text-[#17242f] dark:text-[#d3e2ef]">
                <li className="flex items-start gap-3">
                  <span className="text-[#0c8f72] font-extrabold shrink-0 mt-0.5">✓</span>
                  <span>The layoff facts, plus which OWBPA/WARN rules were missed</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#0c8f72] font-extrabold shrink-0 mt-0.5">✓</span>
                  <span>The client&apos;s consent to be contacted, on file</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#0c8f72] font-extrabold shrink-0 mt-0.5">✓</span>
                  <span>The client&apos;s contact details, matched to your state</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#0c8f72] font-extrabold shrink-0 mt-0.5">✓</span>
                  <span>Only the documents the worker chooses to share</span>
                </li>
              </ul>
            </div>

            {/* Right Column: Lead Intake Card */}
            <div className="lg:col-span-6">
              <div className="bg-white dark:bg-[#0d2238] border border-[#c7e6d6] dark:border-[#144f47] rounded-[18px] overflow-hidden shadow-[0_18px_40px_-18px_rgba(5,43,84,0.12)]">
                {/* Card Header */}
                <div className="bg-[#0e3560] px-5 py-3.5 flex items-center justify-between text-xs font-extrabold tracking-[0.5px] text-white">
                  <span>
                    LEAD INTAKE · <span className="text-[#7fe6c4]">TEXAS</span> · CONSENT TO CONTACT
                  </span>
                </div>

                {/* Card Table Rows */}
                <div className="divide-y divide-[#c7e6d6]/60 dark:divide-[#144f47] px-5 py-2 text-[13.5px]">
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-[#5a6b78] dark:text-[#9ab1c6]">Age 40 or older?</span>
                    <span className="font-bold text-[#062c55] dark:text-white">Yes</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-[#5a6b78] dark:text-[#9ab1c6]">How it ended</span>
                    <span className="font-bold text-[#062c55] dark:text-white">Mass layoff</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-[#5a6b78] dark:text-[#9ab1c6]">Group layoff?</span>
                    <span className="font-bold text-[#062c55] dark:text-white">Yes</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-[#5a6b78] dark:text-[#9ab1c6]">Employer size</span>
                    <span className="font-bold text-[#062c55] dark:text-white">100+</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-[#5a6b78] dark:text-[#9ab1c6]">Advance notice</span>
                    <span className="font-bold text-[#062c55] dark:text-white">12 days — flag (WARN 60)</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-[#5a6b78] dark:text-[#9ab1c6]">Release requested?</span>
                    <span className="font-bold text-[#062c55] dark:text-white">Yes</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-[#5a6b78] dark:text-[#9ab1c6]">Review period</span>
                    <span className="font-bold text-[#062c55] dark:text-white">14 days — flag (needs 45)</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-[#5a6b78] dark:text-[#9ab1c6]">7-day revocation</span>
                    <span className="font-bold text-[#062c55] dark:text-white">Not mentioned — flag</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-[#5a6b78] dark:text-[#9ab1c6]">Already signed?</span>
                    <span className="font-bold text-[#062c55] dark:text-white">Not yet</span>
                  </div>
                </div>

                <div className="px-5 py-3 bg-[#faf9f6] dark:bg-[#071d34] border-t border-[#f0ede6] dark:border-[#1a3b5c] text-[11.5px] text-[#5a6b78] dark:text-[#8ea5b8] leading-tight">
                  Structured intake — not legal advice or a legal opinion. Documents shared only with the worker&apos;s consent.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* THE COMMERCIALS */}
        <section id="fee" className="py-12 sm:py-16 px-4 sm:px-6 max-w-[1040px] mx-auto scroll-mt-20">
          <div className="bg-[#062c55] dark:bg-[#071d34] text-white rounded-[22px] p-6 sm:p-10">
            <span className="text-xs font-extrabold tracking-[1.5px] uppercase text-[#7fe6c4] block mb-2">
              THE COMMERCIALS
            </span>
            <h2 className="font-serif font-semibold text-2xl sm:text-[28px] text-white tracking-[-0.5px] mb-3">
              A flat advertising / lead-gen fee — nothing contingent.
            </h2>
            <p className="text-[16px] text-[#c7ddee] leading-[1.6] max-w-[650px] mb-8">
              You&apos;re paying for the marketing that brings you a client, not for the matter. It&apos;s a flat advertising / lead-generation fee, agreed up front — advertising, not a cut of your fee.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/5 border border-white/15 rounded-xl p-5">
                <div className="font-serif text-[19px] text-[#7fe6c4] mb-2">
                  Flat, per lead
                </div>
                <p className="text-[13px] text-[#bcd3e8] leading-[1.55]">
                  A flat advertising fee for each in-scope lead we send — never a percentage of the matter and never tied to the outcome.
                </p>
              </div>

              <div className="bg-white/5 border border-white/15 rounded-xl p-5">
                <div className="font-serif text-[19px] text-[#7fe6c4] mb-2">
                  No win, still no cut
                </div>
                <p className="text-[13px] text-[#bcd3e8] leading-[1.55]">
                  Our fee never changes with the result. A contingency split with a nonlawyer isn&apos;t allowed — we don&apos;t touch it.
                </p>
              </div>

              <div className="bg-white/5 border border-white/15 rounded-xl p-5">
                <div className="font-serif text-[19px] text-[#7fe6c4] mb-2">
                  Credits for misfits
                </div>
                <p className="text-[13px] text-[#bcd3e8] leading-[1.55]">
                  Wrong state, a duplicate, or a bad-fit lead is credited, not billed. You pay for real, in-scope leads.
                </p>
              </div>
            </div>
          </div>

          {/* Legal Compliance Box */}
          <div className="mt-6 bg-[#fbf3df] dark:bg-[#2a2312] border border-[#f0dca8] dark:border-[#52441e] rounded-2xl p-5 sm:p-6 text-[#17242f] dark:text-[#f0ede6]">
            <div className="font-serif font-semibold text-[16px] text-[#b07a00] dark:text-[#e0a838] mb-2">
              ⚖ Designed as attorney advertising
            </div>
            <p className="text-[13.5px] leading-[1.6]">
              We designed FairExit as attorney advertising and lead generation — a flat fee, not a share of your fee (so not fee-splitting under ABA Model Rule 5.4), and permitted where it&apos;s advertising rather than a recommendation. We&apos;re not lawyers and don&apos;t give you a compliance opinion: state bar rules differ from the ABA Model Rules, so you remain responsible for your state&apos;s advertising rules (see Model Rule 7.2 and your state&apos;s analog) and should confirm this fits with your own counsel. We&apos;ll share our template services agreement for your review before you sign anything.
            </p>
          </div>
        </section>

        {/* ATTORNEY QUESTIONS */}
        <section className="py-12 sm:py-16 bg-white dark:bg-[#09223d] border-y border-[#e7e4dd] dark:border-[#1e3b5c] px-4 sm:px-6">
          <div className="max-w-[1040px] mx-auto">
            <span className="text-xs font-extrabold tracking-[1.5px] uppercase text-[#0c8f72] dark:text-[#0eb28d] block mb-2">
              ATTORNEY QUESTIONS
            </span>
            <h2 className="font-serif font-semibold text-2xl sm:text-[32px] text-[#062c55] dark:text-white tracking-[-0.5px] mb-8">
              What attorneys ask us first.
            </h2>

            <div className="border-t border-[#e7e4dd] dark:border-[#1e3b5c]">
              {ATTORNEY_FAQS.map((faq, idx) => {
                const isOpen = !!openFaqs[idx];
                return (
                  <div
                    key={idx}
                    className="border-b border-[#e7e4dd] dark:border-[#1e3b5c] py-4 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(idx)}
                      className="w-full text-left flex items-center justify-between gap-4 font-serif font-semibold text-lg text-[#062c55] dark:text-white cursor-pointer hover:text-[#0c8f72] transition-colors"
                    >
                      <span>{faq.q}</span>
                      <span className="text-2xl font-serif text-[#0c8f72] dark:text-[#0eb28d] shrink-0">
                        {isOpen ? "–" : "+"}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="mt-3 text-[14.5px] text-[#17242f] dark:text-[#d3e2ef] leading-[1.65]">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* EARLY ACCESS FORM */}
        <section id="access" className="py-12 sm:py-16 px-4 sm:px-6 max-w-[1040px] mx-auto scroll-mt-20">
          <div className="bg-[#fbfdfc] dark:bg-[#082236] border border-[#c7e6d6] dark:border-[#144f47] rounded-[22px] p-6 sm:p-10 shadow-xs">
            <span className="text-xs font-extrabold tracking-[1.5px] uppercase text-[#0c8f72] dark:text-[#0eb28d] block mb-2">
              EARLY ACCESS
            </span>
            <h2 className="font-serif font-semibold text-2xl sm:text-[28px] text-[#062c55] dark:text-white tracking-[-0.5px] mb-3">
              Join the first cohort of US employment attorneys.
            </h2>
            <p className="text-[15.5px] text-[#5a6b78] dark:text-[#9ab1c6] leading-[1.6] max-w-[620px] mb-8">
              We&apos;re onboarding a small group of employment attorneys now, state by state. Tell us where you practice and we&apos;ll be in touch with the details and the agreement.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 max-w-[640px]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  required
                  placeholder="Your name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white dark:bg-[#0d2238] border border-[#cdd3d8] dark:border-[#1e3b5c] rounded-xl px-4 py-3 text-[15px] text-[#17242f] dark:text-white placeholder-[#757575] focus:outline-none focus:ring-2 focus:ring-[#0eb28d]"
                />
                <input
                  type="text"
                  required
                  placeholder="Firm"
                  value={formData.firm}
                  onChange={(e) => setFormData({ ...formData, firm: e.target.value })}
                  className="w-full bg-white dark:bg-[#0d2238] border border-[#cdd3d8] dark:border-[#1e3b5c] rounded-xl px-4 py-3 text-[15px] text-[#17242f] dark:text-white placeholder-[#757575] focus:outline-none focus:ring-2 focus:ring-[#0eb28d]"
                />
                <input
                  type="text"
                  required
                  placeholder="State"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full bg-white dark:bg-[#0d2238] border border-[#cdd3d8] dark:border-[#1e3b5c] rounded-xl px-4 py-3 text-[15px] text-[#17242f] dark:text-white placeholder-[#757575] focus:outline-none focus:ring-2 focus:ring-[#0eb28d]"
                />
                <input
                  type="email"
                  required
                  placeholder="Work email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-white dark:bg-[#0d2238] border border-[#cdd3d8] dark:border-[#1e3b5c] rounded-xl px-4 py-3 text-[15px] text-[#17242f] dark:text-white placeholder-[#757575] focus:outline-none focus:ring-2 focus:ring-[#0eb28d]"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#0eb28d] hover:bg-[#0c8f72] text-white font-bold text-[16px] py-3.5 rounded-[14px] shadow-[0_18px_40px_-18px_rgba(5,43,84,0.12)] active:scale-95 transition-all cursor-pointer text-center"
              >
                Request early access →
              </button>

              <div className="text-[12px] text-[#5a6b78] dark:text-[#8ea5b8] pt-1">
                No obligation. We&apos;ll send the services agreement for your review before anything is signed.
              </div>

              {toastMsg && (
                <div className="p-3 bg-[#eef8f3] dark:bg-[#0b2b2b] text-[#0c8f72] dark:text-[#0eb28d] rounded-lg text-sm font-semibold border border-[#c7e6d6]">
                  {toastMsg}
                </div>
              )}
            </form>
          </div>
        </section>
      </main>

      {/* FOOTER FOR ATTORNEYS */}
      <footer className="border-t border-[#dfe3e8] dark:border-[#1e3b5c] py-8 sm:py-9 transition-colors bg-[#f6f4ef] dark:bg-[#062c55]">
        <div className="max-w-[1040px] mx-auto px-4 sm:px-6 w-full flex flex-col sm:flex-row justify-between gap-8 sm:gap-10 items-start">
          {/* Left Column */}
          <div className="max-w-[620px]">
            <Image
              className="h-7 w-auto object-contain dark:hidden"
              src="/fairexitlogo.png"
              alt="FairExit"
              width={119}
              height={30}
            />
            <Image
              className="h-7 w-auto object-contain hidden dark:block"
              src="/fairexitlogo-dark.png"
              alt="FairExit"
              width={119}
              height={30}
            />
            <div className="text-sm font-bold text-[#0eb28d] my-2">
              Challenge your severance offer.
            </div>
            <p className="text-[11.5px] text-[#5a6b78] dark:text-[#9ab1c6] leading-[1.58]">
              <strong className="font-bold text-[#17242f] dark:text-white">
                For attorneys — informational.
              </strong>{" "}
              FairExit is an attorney-advertising and lead-generation service, not a law firm and not your agent. We provide structured intake information, not legal advice. Fees are flat and never contingent on outcome; you remain responsible for compliance with your state bar&apos;s rules, including advertising and any required disclosures.{" "}
              <Link href="/" className="text-[#0c8f72] dark:text-[#0eb28d] hover:underline font-semibold">
                See the client experience →
              </Link>
            </p>
          </div>

          {/* Right Column */}
          <div className="text-[13.5px] text-[#5a6b78] dark:text-[#9ab1c6] shrink-0">
            <div className="font-bold text-[#062c55] dark:text-white mb-2">FairExit</div>
            <div className="flex flex-col gap-2">
              <a href="#how" className="hover:text-[#062c55] dark:hover:text-white transition-colors">
                How it works
              </a>
              <a href="#fee" className="hover:text-[#062c55] dark:hover:text-white transition-colors">
                The fee
              </a>
              <a href="#access" className="hover:text-[#062c55] dark:hover:text-white transition-colors">
                Request access
              </a>
              <Link href="/" className="hover:text-[#062c55] dark:hover:text-white transition-colors">
                For individuals →
              </Link>
              <Link href="/lawyers" className="hover:text-[#062c55] dark:hover:text-white transition-colors">
                🇨🇦 Canadian lawyer page →
              </Link>
            </div>
          </div>
        </div>
      </footer>

      <FloatingActions />
    </div>
  );
}

