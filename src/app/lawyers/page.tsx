"use client";

import React, { useState, useContext } from "react";
import Link from "next/link";
import Image from "next/image";
import Footer from "@/components/layout/Footer";
import FloatingActions from "@/components/landing/FloatingActions";
import { CountryContext, CountryCode } from "@/context/CountryContext";

interface FaqItem {
  q: string;
  a: React.ReactNode;
}

const LAWYER_FAQS: FaqItem[] = [
  {
    q: "Is this a referral fee?",
    a: (
      <span>
        It&apos;s a{" "}
        <strong className="font-bold text-[#062c55] dark:text-white">
          flat advertising / lead-generation fee
        </strong>{" "}
        — a fixed amount agreed up front, never a percentage of your fee or the settlement. We&apos;re not lawyers and don&apos;t give you a compliance opinion: you and your own counsel confirm it fits your rules, and we&apos;ll hand your counsel our template agreement to review first.
      </span>
    ),
  },
  {
    q: "What exactly do I receive?",
    a: (
      <span>
        A structured intake — the client&apos;s key facts, the clause noted for your review, their consent to be contacted, a booked consult, and any documents the client chooses to share.{" "}
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
        Every client answers a short intake and can upload their letter. We check it&apos;s complete and in-scope — province, tenure, income, no duplicate — and organize the facts. We don&apos;t assess the merits or attach an opinion or number; that call is entirely yours.
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
    q: "Do I have to take every client?",
    a: (
      <span>
        No. You review each intake and decide. You&apos;re never obligated to take a matter, and there&apos;s no exclusivity unless you want it. You can set your monthly capacity so you&apos;re only sent what you can handle.
      </span>
    ),
  },
  {
    q: "How do you handle client data and privacy?",
    a: (
      <span>
        Minimal collection, explicit consent, and documents shared only with the client&apos;s consent rather than raw email attachments. Retention and handling are set out in the services agreement.
      </span>
    ),
  },
];

export default function LawyersPage() {
  const context = useContext(CountryContext);
  const currentCountry: CountryCode = context?.Country || "CA";

  const handleCountrySwitch = (nextCountry: CountryCode) => {
    if (context) context.setCountry(nextCountry);
  };

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
    province: "",
    email: "",
  });
  const [toastMsg, setToastMsg] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setToastMsg(
      "Thanks — this is a concept page; in the live product this would reach our partnerships team."
    );
    setFormData({ name: "", firm: "", province: "", email: "" });
    setTimeout(() => {
      setToastMsg("");
    }, 4500);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f4ef] dark:bg-[#062c55] text-[#17242f] dark:text-[#eaf2f8] transition-colors">
      {/* HEADER / NAVBAR FOR LAWYERS */}
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
              For employment lawyers
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
            FAIREXIT FOR LAWYERS
          </span>
          <h1 className="font-serif font-semibold text-3xl sm:text-[46px] text-[#062c55] dark:text-white leading-[1.1] tracking-[-0.5px] max-w-[820px] mb-4">
            Severance clients,{" "}
            <em className="italic text-[#0c8f72] dark:text-[#0eb28d]">organized</em>{" "}
            — with the facts you&apos;d ask for anyway.
          </h1>
          <p className="text-base sm:text-[18px] text-[#5a6b78] dark:text-[#9ab1c6] max-w-[620px] leading-relaxed mb-6">
            We organize a laid-off worker&apos;s intake, hand you a clean summary and a booked
            consult, and you pay a flat advertising fee —{" "}
            <strong className="font-bold text-[#17242f] dark:text-white">never</strong> a cut of the
            file. No junk leads, no AI report to argue with, and no merit call from us —
            the legal judgment is yours.
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
            🔒 You choose which clients to take · a flat advertising / lead-gen fee, never a cut · you &amp; your counsel confirm it fits your rules
          </div>

          {/* STATS BAR */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-[#0d2238] border border-[#e7e4dd] dark:border-[#1e3b5c] rounded-[14px] p-5 sm:p-6 shadow-xs">
              <div className="font-serif text-[34px] font-semibold text-[#0c8f72] dark:text-[#0eb28d] leading-none mb-2">
                84.5%
              </div>
              <div className="text-[13.5px] text-[#5a6b78] dark:text-[#9ab1c6] leading-snug">
                Private-sector employees with no union to fight their exit — the market that has to face severance alone.
              </div>
              <div className="text-[10.5px] text-[#9a9384] dark:text-[#728393] mt-2.5">
                Statistics Canada, Quality of Employment 2023 (15.5% union-covered)
              </div>
            </div>

            <div className="bg-white dark:bg-[#0d2238] border border-[#e7e4dd] dark:border-[#1e3b5c] rounded-[14px] p-5 sm:p-6 shadow-xs">
              <div className="font-serif text-[34px] font-semibold text-[#0c8f72] dark:text-[#0eb28d] leading-none mb-2">
                Up to 24 mo.
              </div>
              <div className="text-[13.5px] text-[#5a6b78] dark:text-[#9ab1c6] leading-snug">
                The common-law reasonable-notice high end (absent exceptional circumstances) — vs the ESA&apos;s 8-week notice floor most offers anchor to. The gap is the opportunity.
              </div>
              <div className="text-[10.5px] text-[#9a9384] dark:text-[#728393] mt-2.5">
                Ontario ESA s. 57 &amp; ss. 64–65 · Lowndes v. Summit Ford Sales Ltd., 2006 CanLII 14 (ON CA)
              </div>
            </div>

            <div className="bg-white dark:bg-[#0d2238] border border-[#e7e4dd] dark:border-[#1e3b5c] rounded-[14px] p-5 sm:p-6 shadow-xs">
              <div className="font-serif text-[34px] font-semibold text-[#0c8f72] dark:text-[#0eb28d] leading-none mb-2">
                $0
              </div>
              <div className="text-[13.5px] text-[#5a6b78] dark:text-[#9ab1c6] leading-snug">
                Cut of the file you ever pay. A flat advertising / lead-gen fee — never a percentage, never contingent.
              </div>
              <div className="text-[10.5px] text-[#9a9384] dark:text-[#728393] mt-2.5">
                A flat advertising / lead-generation fee — you confirm it fits your law society&apos;s rules
              </div>
            </div>
          </div>
        </section>

        {/* 2-MINUTE OVERVIEW / EXPLAINER VIDEO */}
        <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-[1040px] mx-auto text-center">
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
            <div className="w-16 h-16 sm:w-[76px] sm:h-[76px] rounded-full bg-white/15 border-2 border-white/55 flex items-center justify-center text-white text-2xl sm:text-[26px] pl-1 cursor-default select-none shadow-lg">
              ▶
            </div>
          </div>

          <p className="text-xs sm:text-sm text-[#5a6b78] dark:text-[#9ab1c6] text-center mt-4 max-w-[620px] mx-auto leading-relaxed">
            <strong className="font-bold text-[#062c55] dark:text-white">
              Explainer video coming soon.
            </strong>{" "}
            How the intake is organized, what a clean summary looks like, and how the flat advertising fee works.
          </p>
        </section>

        {/* PROBLEM / SOLUTION COMPARE */}
        <section className="py-14 sm:py-16 bg-white dark:bg-[#071d34] border-y border-[#e7e4dd] dark:border-[#1e3b5c] px-4 sm:px-6">
          <div className="max-w-[1040px] mx-auto">
            <span className="text-xs font-extrabold tracking-[1.5px] uppercase text-[#0c8f72] dark:text-[#0eb28d] block mb-1.5">
              THE PROBLEM WITH SEVERANCE LEADS
            </span>
            <h2 className="font-serif font-semibold text-2xl sm:text-[32px] text-[#062c55] dark:text-white tracking-[-0.5px] mb-2">
              Most leads waste the hour you spend qualifying them.
            </h2>
            <p className="text-base sm:text-[17px] text-[#5a6b78] dark:text-[#9ab1c6] max-w-[680px] leading-relaxed mb-7">
              The demand is there — at the 2024 peak,{" "}
              <strong className="font-bold text-[#17242f] dark:text-white">~497,000</strong>{" "}
              Canadians were collecting regular EI at once.{" "}
              <span className="text-xs text-[#9a9384] dark:text-[#728393]">
                Statistics Canada, EI (Aug 2024)
              </span>{" "}
              The problem was never the volume; it&apos;s the qualifying.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Box 1: Old leads */}
              <div className="bg-[#faf9f6] dark:bg-[#0a223d] border border-[#e7e4dd] dark:border-[#1e3b5c] rounded-2xl p-6 shadow-xs">
                <h3 className="font-serif font-semibold text-[19px] text-[#062c55] dark:text-white mb-3">
                  Leads you get today
                </h3>
                <ul className="space-y-3 text-[14.5px] text-[#17242f] dark:text-[#d3e2ef]">
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#b9805f] font-extrabold text-[14.5px] shrink-0">
                      ✕
                    </span>
                    <span>Cold names with no context — you do all the qualifying</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#b9805f] font-extrabold text-[14.5px] shrink-0">
                      ✕
                    </span>
                    <span>Tiny cases and out-of-scope people mixed in with real ones</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#b9805f] font-extrabold text-[14.5px] shrink-0">
                      ✕
                    </span>
                    <span>Clients who &ldquo;did their own research&rdquo; and arrive with wrong expectations</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#b9805f] font-extrabold text-[14.5px] shrink-0">
                      ✕
                    </span>
                    <span>Generic lead-gen that sells the same name to five firms</span>
                  </li>
                </ul>
              </div>

              {/* Box 2: FairExit leads */}
              <div className="bg-[#fbfdfc] dark:bg-[#0b2a36] border border-[#c7e6d6] dark:border-[#144f47] rounded-2xl p-6 shadow-xs">
                <h3 className="font-serif font-semibold text-[19px] text-[#062c55] dark:text-white mb-3">
                  Leads from FairExit
                </h3>
                <ul className="space-y-3 text-[14.5px] text-[#17242f] dark:text-[#d3e2ef]">
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#0c8f72] dark:text-[#0eb28d] font-extrabold text-[14.5px] shrink-0">
                      ✓
                    </span>
                    <span>A structured intake — the six facts you&apos;d ask for anyway</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#0c8f72] dark:text-[#0eb28d] font-extrabold text-[14.5px] shrink-0">
                      ✓
                    </span>
                    <span>Organized into the facts a matter turns on (income, tenure, the clause, notes) — no merit call by us</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#0c8f72] dark:text-[#0eb28d] font-extrabold text-[14.5px] shrink-0">
                      ✓
                    </span>
                    <span>No opinion or number attached — you make the legal call, clean</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#0c8f72] dark:text-[#0eb28d] font-extrabold text-[14.5px] shrink-0">
                      ✓
                    </span>
                    <span>In your province, and a consult already on the calendar</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS FOR YOU */}
        <section id="how" className="py-14 sm:py-16 px-4 sm:px-6 max-w-[1040px] mx-auto">
          <span className="text-xs font-extrabold tracking-[1.5px] uppercase text-[#0c8f72] dark:text-[#0eb28d] block mb-1.5">
            HOW IT WORKS FOR YOU
          </span>
          <h2 className="font-serif font-semibold text-2xl sm:text-[32px] text-[#062c55] dark:text-white tracking-[-0.5px] mb-8">
            We do the organizing. You do the law.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Step 1 */}
            <div className="bg-white dark:bg-[#0d2238] border border-[#e7e4dd] dark:border-[#1e3b5c] rounded-2xl p-6 shadow-xs">
              <div className="w-[34px] h-[34px] rounded-full bg-[#062c55] text-white font-extrabold flex items-center justify-center text-base mb-3.5">
                1
              </div>
              <h3 className="font-serif font-semibold text-[18px] text-[#062c55] dark:text-white mb-1.5">
                We organize the client
              </h3>
              <p className="text-sm text-[#5a6b78] dark:text-[#9ab1c6] leading-relaxed">
                They answer a short intake and (optionally) upload their letter. We check it&apos;s complete and in-scope — province, tenure, income, no duplicate — and organize the facts. We don&apos;t assess the merits; that call is yours.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white dark:bg-[#0d2238] border border-[#e7e4dd] dark:border-[#1e3b5c] rounded-2xl p-6 shadow-xs">
              <div className="w-[34px] h-[34px] rounded-full bg-[#062c55] text-white font-extrabold flex items-center justify-center text-base mb-3.5">
                2
              </div>
              <h3 className="font-serif font-semibold text-[18px] text-[#062c55] dark:text-white mb-1.5">
                You get a clean intake + a booked call
              </h3>
              <p className="text-sm text-[#5a6b78] dark:text-[#9ab1c6] leading-relaxed">
                Only for clients in your province whose intake is complete. Structured facts, the client&apos;s consent to be contacted, and a consult scheduled — no data to chase.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white dark:bg-[#0d2238] border border-[#e7e4dd] dark:border-[#1e3b5c] rounded-2xl p-6 shadow-xs">
              <div className="w-[34px] h-[34px] rounded-full bg-[#062c55] text-white font-extrabold flex items-center justify-center text-base mb-3.5">
                3
              </div>
              <h3 className="font-serif font-semibold text-[18px] text-[#062c55] dark:text-white mb-1.5">
                You take the ones you want
              </h3>
              <p className="text-sm text-[#5a6b78] dark:text-[#9ab1c6] leading-relaxed">
                Review the intake, take the call, decide. You pay a flat advertising / lead-gen fee, agreed up front — never a percentage and never tied to the outcome.
              </p>
            </div>
          </div>
        </section>

        {/* WHAT LANDS IN YOUR INBOX */}
        <section className="py-14 sm:py-16 bg-white dark:bg-[#071d34] border-y border-[#e7e4dd] dark:border-[#1e3b5c] px-4 sm:px-6">
          <div className="max-w-[1040px] mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-12 items-center">
            {/* Left Description */}
            <div>
              <span className="text-xs font-extrabold tracking-[1.5px] uppercase text-[#0c8f72] dark:text-[#0eb28d] block mb-1.5">
                WHAT LANDS IN YOUR INBOX
              </span>
              <h2 className="font-serif font-semibold text-2xl sm:text-[28px] text-[#062c55] dark:text-white tracking-[-0.5px] mb-2.5">
                A clean intake — not an AI report.
              </h2>
              <p className="text-[15.5px] text-[#5a6b78] dark:text-[#9ab1c6] leading-relaxed mb-5">
                We deliberately don&apos;t send you our analysis or a made-up number. You get the structured facts and the client — the legal judgment is yours. Here&apos;s the shape of it.
              </p>
              <ul className="space-y-2.5 text-[14.5px] text-[#17242f] dark:text-[#d3e2ef]">
                <li className="flex items-center gap-2.5">
                  <span className="text-[#0c8f72] dark:text-[#0eb28d] font-extrabold text-[14.5px]">
                    ✓
                  </span>
                  <span>The six facts, plus the clause noted for your review</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-[#0c8f72] dark:text-[#0eb28d] font-extrabold text-[14.5px]">
                    ✓
                  </span>
                  <span>The client&apos;s consent to be contacted, captured in the flow</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-[#0c8f72] dark:text-[#0eb28d] font-extrabold text-[14.5px]">
                    ✓
                  </span>
                  <span>A booked consult and the client&apos;s contact details</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-[#0c8f72] dark:text-[#0eb28d] font-extrabold text-[14.5px]">
                    ✓
                  </span>
                  <span>Only the documents the client chooses to share</span>
                </li>
              </ul>
            </div>

            {/* Right: Mock Intake Card */}
            <div className="bg-white dark:bg-[#0d2238] border border-[#c7e6d6] dark:border-[#1e4d48] rounded-[18px] overflow-hidden shadow-[0_18px_40px_-18px_rgba(5,43,84,0.12)]">
              <div className="bg-[#0e3560] text-white px-5 py-3.5 text-xs font-extrabold tracking-[0.5px] uppercase">
                LEAD INTAKE · <span className="text-[#7fe6c4]">ONTARIO</span> · CONSENT TO CONTACT
              </div>
              <div className="p-5 space-y-0 text-[13.5px]">
                <div className="flex justify-between py-2 border-b border-dashed border-[#c7e6d6] dark:border-[#1e4d48]">
                  <span className="text-[#5a6b78] dark:text-[#9ab1c6]">Age</span>
                  <span className="font-bold text-[#062c55] dark:text-white">52</span>
                </div>
                <div className="flex justify-between py-2 border-b border-dashed border-[#c7e6d6] dark:border-[#1e4d48]">
                  <span className="text-[#5a6b78] dark:text-[#9ab1c6]">Length of service</span>
                  <span className="font-bold text-[#062c55] dark:text-white">14 yrs</span>
                </div>
                <div className="flex justify-between py-2 border-b border-dashed border-[#c7e6d6] dark:border-[#1e4d48]">
                  <span className="text-[#5a6b78] dark:text-[#9ab1c6]">Role / seniority</span>
                  <span className="font-bold text-[#062c55] dark:text-white">Senior / Director</span>
                </div>
                <div className="flex justify-between py-2 border-b border-dashed border-[#c7e6d6] dark:border-[#1e4d48]">
                  <span className="text-[#5a6b78] dark:text-[#9ab1c6]">Base salary</span>
                  <span className="font-bold text-[#062c55] dark:text-white">$110,000 / yr</span>
                </div>
                <div className="flex justify-between py-2 border-b border-dashed border-[#c7e6d6] dark:border-[#1e4d48]">
                  <span className="text-[#5a6b78] dark:text-[#9ab1c6]">Other pay</span>
                  <span className="font-bold text-[#062c55] dark:text-white">Bonus, Stock/RSUs</span>
                </div>
                <div className="flex justify-between py-2 border-b border-dashed border-[#c7e6d6] dark:border-[#1e4d48]">
                  <span className="text-[#5a6b78] dark:text-[#9ab1c6]">Termination clause</span>
                  <span className="font-bold text-[#062c55] dark:text-white text-right">Client notes a cap — for your review</span>
                </div>
                <div className="flex justify-between py-2 border-b border-dashed border-[#c7e6d6] dark:border-[#1e4d48]">
                  <span className="text-[#5a6b78] dark:text-[#9ab1c6]">How it ended</span>
                  <span className="font-bold text-[#062c55] dark:text-white">Laid off (no cause)</span>
                </div>
                <div className="flex justify-between py-2 border-b border-dashed border-[#c7e6d6] dark:border-[#1e4d48]">
                  <span className="text-[#5a6b78] dark:text-[#9ab1c6]">Flags</span>
                  <span className="font-bold text-[#062c55] dark:text-white">None noted</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-[#5a6b78] dark:text-[#9ab1c6]">Re-employed?</span>
                  <span className="font-bold text-[#062c55] dark:text-white">Not yet</span>
                </div>
              </div>
              <div className="bg-[#faf9f6] dark:bg-[#071d34] px-5 py-3 border-t border-[#f0ede6] dark:border-[#1e3b5c] text-[11.5px] text-[#5a6b78] dark:text-[#8ea5b8] leading-tight">
                Structured intake — not legal advice or a legal opinion. Documents shared only with the client&apos;s consent.
              </div>
            </div>
          </div>
        </section>

        {/* THE COMMERCIALS / FEE */}
        <section id="fee" className="py-12 sm:py-16 px-4 sm:px-6 max-w-[1040px] mx-auto">
          <div className="bg-[#062c55] text-[#eaf2f8] rounded-[22px] p-6 sm:p-10 shadow-lg">
            <span className="text-xs font-extrabold tracking-[1.5px] uppercase text-[#7fe6c4] block mb-1.5">
              THE COMMERCIALS
            </span>
            <h2 className="font-serif font-semibold text-2xl sm:text-[28px] text-white tracking-[-0.5px] mb-3">
              A flat advertising fee — never a percentage, nothing contingent.
            </h2>
            <p className="text-sm sm:text-[16px] text-[#c7ddee] max-w-[640px] leading-relaxed mb-6">
              You&apos;re paying for the marketing that brings you a client, not for the client&apos;s case. It&apos;s a flat advertising / lead-generation fee, agreed up front — never a percentage and never tied to any outcome. We designed it to sit on the advertising side of the rules; you and your own counsel confirm it fits.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div className="bg-white/5 border border-white/15 rounded-xl p-5">
                <div className="font-serif text-[19px] text-[#7fe6c4] mb-1.5">
                  Flat, not a percentage
                </div>
                <div className="text-[13px] text-[#bcd3e8] leading-relaxed">
                  A flat advertising fee agreed up front — never a percentage of the matter and never tied to the outcome.
                </div>
              </div>

              <div className="bg-white/5 border border-white/15 rounded-xl p-5">
                <div className="font-serif text-[19px] text-[#7fe6c4] mb-1.5">
                  Never a share of the file
                </div>
                <div className="text-[13px] text-[#bcd3e8] leading-relaxed">
                  The fee is never a percentage of the matter or the settlement — that would be an illegal contingency, and it&apos;s not what this is.
                </div>
              </div>

              <div className="bg-white/5 border border-white/15 rounded-xl p-5">
                <div className="font-serif text-[19px] text-[#7fe6c4] mb-1.5">
                  You stay in control
                </div>
                <div className="text-[13px] text-[#bcd3e8] leading-relaxed">
                  Set your monthly capacity and pause anytime. You choose which clients to take, and pass on the rest.
                </div>
              </div>
            </div>
          </div>

          {/* Yellow compliance note */}
          <div className="bg-[#fbf3df] dark:bg-[#252011] border border-[#f0dca8] dark:border-[#524419] rounded-2xl p-5 sm:p-6 mt-6">
            <h3 className="font-serif font-semibold text-base text-[#b07a00] dark:text-[#e8bd56] mb-1.5">
              ⚖ Designed to sit within advertising rules
            </h3>
            <p className="text-[13.5px] text-[#17242f] dark:text-[#d3e2ef] leading-relaxed">
              We designed FairExit as advertising and lead generation — a flat advertising / lead-generation fee, never a percentage and never a share of a file. We&apos;re two non-lawyers, so we don&apos;t give you a compliance opinion: you and your own counsel must satisfy yourselves it fits your law society&apos;s rules, including any disclosure to your client. We&apos;ll share our template services agreement for your counsel to review before you sign anything.
            </p>
          </div>
        </section>

        {/* LAWYER QUESTIONS / FAQ */}
        <section className="py-14 sm:py-16 bg-white dark:bg-[#071d34] border-y border-[#e7e4dd] dark:border-[#1e3b5c] px-4 sm:px-6">
          <div className="max-w-[1040px] mx-auto">
            <span className="text-xs font-extrabold tracking-[1.5px] uppercase text-[#0c8f72] dark:text-[#0eb28d] block mb-1.5">
              LAWYER QUESTIONS
            </span>
            <h2 className="font-serif font-semibold text-2xl sm:text-[32px] text-[#062c55] dark:text-white tracking-[-0.5px] mb-6">
              What lawyers ask us first.
            </h2>

            <div className="border-t border-[#e7e4dd] dark:border-[#1e3b5c]">
              {LAWYER_FAQS.map((faq, idx) => {
                const isOpen = !!openFaqs[idx];
                return (
                  <div
                    key={idx}
                    className="border-b border-[#e7e4dd] dark:border-[#1e3b5c] transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(idx)}
                      className="w-full text-left py-4 sm:py-5 flex items-center justify-between gap-4 font-serif text-[18px] sm:text-[19px] font-semibold text-[#062c55] dark:text-white cursor-pointer select-none hover:text-[#0c8f72] dark:hover:text-[#0eb28d] transition-colors"
                    >
                      <span>{faq.q}</span>
                      <span className="font-serif text-2xl text-[#0c8f72] dark:text-[#0eb28d] shrink-0 font-normal">
                        {isOpen ? "–" : "+"}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="pb-5 text-[14.5px] text-[#17242f] dark:text-[#d3e2ef] leading-relaxed max-w-[760px]">
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
        <section id="access" className="my-14 px-4 sm:px-6 max-w-[1040px] mx-auto">
          <div className="bg-[#fbfdfc] dark:bg-[#0b2538] border border-[#c7e6d6] dark:border-[#1e4d48] rounded-[22px] p-6 sm:p-10 shadow-xs">
            <span className="text-xs font-extrabold tracking-[1.5px] uppercase text-[#0c8f72] dark:text-[#0eb28d] block mb-1.5">
              EARLY ACCESS
            </span>
            <h2 className="font-serif font-semibold text-2xl sm:text-[28px] text-[#062c55] dark:text-white tracking-[-0.5px] mb-2">
              Join the first cohort of employment lawyers.
            </h2>
            <p className="text-[15.5px] text-[#5a6b78] dark:text-[#9ab1c6] max-w-[560px] leading-relaxed mb-6">
              We&apos;re onboarding a small group of employment lawyers now, province by province. Tell us where you practice and we&apos;ll be in touch with the details and the agreement.
            </p>

            <form onSubmit={handleSubmit} className="max-w-[640px]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <input
                  type="text"
                  required
                  placeholder="Your name"
                  aria-label="Your name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-[#cdd3d8] dark:border-[#1e3b5c] bg-white dark:bg-[#0d2238] rounded-xl px-3.5 py-3 text-[15px] text-[#17242f] dark:text-white placeholder-[#757575] dark:placeholder-[#64748b] focus:outline-none focus:border-[#0eb28d]"
                />
                <input
                  type="text"
                  required
                  placeholder="Firm"
                  aria-label="Firm"
                  value={formData.firm}
                  onChange={(e) => setFormData({ ...formData, firm: e.target.value })}
                  className="w-full border border-[#cdd3d8] dark:border-[#1e3b5c] bg-white dark:bg-[#0d2238] rounded-xl px-3.5 py-3 text-[15px] text-[#17242f] dark:text-white placeholder-[#757575] dark:placeholder-[#64748b] focus:outline-none focus:border-[#0eb28d]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3.5">
                <input
                  type="text"
                  required
                  placeholder="Province / state"
                  aria-label="Province / state"
                  value={formData.province}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  className="w-full border border-[#cdd3d8] dark:border-[#1e3b5c] bg-white dark:bg-[#0d2238] rounded-xl px-3.5 py-3 text-[15px] text-[#17242f] dark:text-white placeholder-[#757575] dark:placeholder-[#64748b] focus:outline-none focus:border-[#0eb28d]"
                />
                <input
                  type="email"
                  required
                  placeholder="Work email"
                  aria-label="Work email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border border-[#cdd3d8] dark:border-[#1e3b5c] bg-white dark:bg-[#0d2238] rounded-xl px-3.5 py-3 text-[15px] text-[#17242f] dark:text-white placeholder-[#757575] dark:placeholder-[#64748b] focus:outline-none focus:border-[#0eb28d]"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#0eb28d] hover:bg-[#0c8f72] text-white font-bold text-[16px] py-3.5 px-6 rounded-xl shadow-[0_18px_40px_-18px_rgba(5,43,84,0.12)] active:scale-95 transition-all text-center cursor-pointer"
              >
                Request early access →
              </button>

              <p className="text-xs text-[#5a6b78] dark:text-[#8ea5b8] mt-3 leading-relaxed">
                No obligation. We&apos;ll send the services agreement for your counsel to review before anything is signed.
              </p>
            </form>
          </div>
        </section>
      </main>

      {/* CUSTOM FOOTER FOR LAWYERS PAGE */}
      <Footer country={currentCountry} onCountrySwitch={handleCountrySwitch} variant="lawyers" />

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#062c55] text-white text-sm px-5 py-3 rounded-xl shadow-xl transition-all animate-bounce">
          {toastMsg}
        </div>
      )}

      <FloatingActions />
    </div>
  );
}
