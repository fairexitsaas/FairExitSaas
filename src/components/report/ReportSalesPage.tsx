"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReportInputs, getReportInputs, saveReportInputs, defaultMockReportInputs } from "@/lib/report-storage";
import {
  ApplePayBadge,
  GooglePayBadge,
  VisaBadge,
  MastercardBadge,
  AmexBadge,
  InteracBadge,
} from "./PaymentBadges";
import ReportVideoModal from "./ReportVideoModal";
import ReportVideoPlayer from "./ReportVideoPlayer";
import AskLawyerModal from "@/components/dialogs/AskLawyerModal";
import TermsConditionsModal from "@/components/dialogs/TermsConditionsModal";
import CheckoutDialog from "@/components/dialogs/CheckoutDialog";
import { triggerGetApp } from "@/context/GetAppContext";

interface ReportSalesPageProps {
  caseId?: string | null;
  cs?: any;
  cfg?: any;
  onPaySuccess?: (newCaseId?: string) => void;
}

export default function ReportSalesPage({
  caseId,
  cs,
  cfg,
  onPaySuccess,
}: ReportSalesPageProps) {
  const router = useRouter();
  const [data, setData] = useState<ReportInputs>(defaultMockReportInputs);
  const [explainEach, setExplainEach] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [lawyerModalOpen, setLawyerModalOpen] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);

  // Checkout form state
  const [email, setEmail] = useState(() => data.email || cs?.email || "");
  const [subscribeNews, setSubscribeNews] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [payError, setPayError] = useState("");

  // FAQ Accordion states
  const [openFaq, setOpenFaq] = useState<Record<number, boolean>>({});

  const emailInputRef = useRef<HTMLInputElement>(null);
  const checkoutRef = useRef<HTMLDivElement>(null);

  // Sync inputs from cs or storage
  useEffect(() => {
    const stored = getReportInputs();
    if (cs) {
      const freeRes = cs.freeResult || {};
      const jurisdiction = cs.jurisdiction || {};
      const updated: ReportInputs = {
        ...stored,
        email: cs.email || stored.email || "",
        province: cs.region || stored.province,
        provinceName: jurisdiction.name || stored.provinceName,
        offer: cs.offerAmount || stored.offer,
        salary: cs.annualSalary || stored.salary,
        years: cs.tenureYears || stored.years,
        age: cs.age || stored.age,
        statutoryMin: freeRes.statutoryMin || stored.statutoryMin,
        courtAwardLow: freeRes.courtLow || stored.courtAwardLow,
        courtAwardHigh: freeRes.courtHigh || stored.courtAwardHigh,
      };
      setData(updated);
      if (cs.email && !email) setEmail(cs.email);
    } else {
      setData(stored);
      if (stored.email && !email) setEmail(stored.email);
    }
  }, [cs]);

  const toggleFaq = (idx: number) => {
    setOpenFaq((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const scrollToCheckout = () => {
    if (checkoutRef.current) {
      checkoutRef.current.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => {
        emailInputRef.current?.focus();
      }, 500);
    }
  };

  const formatK = (val: number | string | undefined, defaultVal = 0) => {
    const num = Number(val) || defaultVal;
    if (num >= 1000) {
      const k = Math.round(num / 1000);
      return `$${k}k`;
    }
    return `$${num.toLocaleString()}`;
  };

  const offerFormatted = formatK(data.offer, 24000);
  const minFormatted = formatK(data.statutoryMin, 17000);
  const courtLowFormatted = formatK(data.courtAwardLow, 138000);
  const courtHighFormatted = formatK(data.courtAwardHigh, 193000);
  const courtRangeFormatted = `${courtLowFormatted}–${courtHighFormatted}`;
  const payFormatted = data.salary ? `$${Math.round(Number(data.salary) / 1000)}k/yr` : "$110k/yr";

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/.+@.+\..+/.test(email)) {
      setPayError("Please enter a valid email address so we can send your report.");
      emailInputRef.current?.focus();
      return;
    }

    setPayError("");
    saveReportInputs({ email, remindMe: subscribeNews });

    proceedToPayment();
  };

  const proceedToPayment = async () => {
    setIsPaying(true);
    setPayError("");
    setTermsAccepted(true);
    saveReportInputs({ email, termsAccepted: true, remindMe: subscribeNews });

    const activeCaseId = caseId || cs?.id;

    setIsPaying(false);
    setCheckoutDialogOpen(false);
    setTermsModalOpen(false);

    // Directly navigate to the upload step without checking payments or details
    if (onPaySuccess) {
      onPaySuccess(activeCaseId || undefined);
    }
    router.push(`/report?step=upload${activeCaseId ? `&case=${activeCaseId}` : ""}`);
  };

  return (
    <div className="min-h-screen bg-[#F6F4EF] text-[#17242F] font-sans antialiased selection:bg-[#0EB28D]/20">
      {/* ── TOP NAV BAR ── */}
      <nav className="sticky top-0 z-40 w-full h-[51px] bg-[#F6F4EF]/92 backdrop-blur-[12px] border-b border-[#E7E4DD]">
        <div className="max-w-[1200px] h-full mx-auto px-4 sm:px-8 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/fairexitlogo.png"
              alt="FairExit Logo"
              width={103}
              height={26}
              className="h-[25px] w-auto object-contain"
              priority
            />
          </Link>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex items-center space-x-6 text-[13.5px] font-[600] text-[#5A6B78]">
            <Link href="/#how" className="hover:text-[#062C55] transition-colors">
              How it works
            </Link>
            <Link href="/#paths" className="hover:text-[#062C55] transition-colors">
              Pricing
            </Link>
            <Link href="/faq" className="hover:text-[#062C55] transition-colors">
              FAQ
            </Link>
            <Link href="/blog" className="hover:text-[#062C55] transition-colors">
              Blog
            </Link>
            <Link href="/about" className="hover:text-[#062C55] transition-colors">
              About
            </Link>
            <button
              type="button"
              onClick={() => triggerGetApp()}
              className="text-[#0C8F72] font-[700] hover:text-[#096B55] transition-colors"
            >
              Get the app
            </button>
            <Link
              href="/"
              className="underline text-[#5A6B78] hover:text-[#062C55] transition-colors"
            >
              Exit ✕
            </Link>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-9 h-9 rounded-[10px] bg-white border border-[#E7E4DD] flex items-center justify-center text-[#062C55]"
            aria-label="Toggle menu"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#F6F4EF] border-b border-[#E7E4DD] px-6 py-4 space-y-3 font-sans text-sm font-semibold text-[#5A6B78] shadow-lg animate-fade">
            <Link href="/#how" className="block hover:text-[#062C55]" onClick={() => setMobileMenuOpen(false)}>
              How it works
            </Link>
            <Link href="/#paths" className="block hover:text-[#062C55]" onClick={() => setMobileMenuOpen(false)}>
              Pricing
            </Link>
            <Link href="/faq" className="block hover:text-[#062C55]" onClick={() => setMobileMenuOpen(false)}>
              FAQ
            </Link>
            <Link href="/blog" className="block hover:text-[#062C55]" onClick={() => setMobileMenuOpen(false)}>
              Blog
            </Link>
            <Link href="/about" className="block hover:text-[#062C55]" onClick={() => setMobileMenuOpen(false)}>
              About
            </Link>
            <button
              type="button"
              onClick={() => { setMobileMenuOpen(false); triggerGetApp(); }}
              className="block text-left text-[#0C8F72] font-bold"
            >
              Get the app
            </button>
            <Link href="/" className="block underline text-[#5A6B78]" onClick={() => setMobileMenuOpen(false)}>
              Exit ✕
            </Link>
          </div>
        )}
      </nav>

      {/* ── STEPPER HEADER ── */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-4 sm:pt-6">
        {/* Desktop Stepper */}
        <div className="hidden sm:block max-w-[760px] relative pb-2">
          {/* Stepper circles */}
          <div className="flex items-center justify-between relative z-10 px-4">
            {/* Step 1: Eligible */}
            <div className="flex flex-col items-center">
              <div className="w-[18px] h-[18px] rounded-full bg-[#0EB28D] border border-[#0EB28D] flex items-center justify-center text-white text-[10px] font-extrabold leading-none">
                ✓
              </div>
              <span className="font-sans font-[600] text-[11px] text-[#0C8F72] mt-1.5">
                Eligible
              </span>
            </div>

            {/* Step 2: Basics */}
            <div className="flex flex-col items-center">
              <div className="w-[18px] h-[18px] rounded-full bg-[#0EB28D] border border-[#0EB28D] flex items-center justify-center text-white text-[10px] font-extrabold leading-none">
                ✓
              </div>
              <span className="font-sans font-[600] text-[11px] text-[#0C8F72] mt-1.5">
                Basics
              </span>
            </div>

            {/* Step 3: Money */}
            <div className="flex flex-col items-center">
              <div className="w-[18px] h-[18px] rounded-full bg-[#0EB28D] border border-[#0EB28D] flex items-center justify-center text-white text-[10px] font-extrabold leading-none">
                ✓
              </div>
              <span className="font-sans font-[600] text-[11px] text-[#0C8F72] mt-1.5">
                Money
              </span>
            </div>

            {/* Step 4: Key questions */}
            <div className="flex flex-col items-center">
              <div className="w-[18px] h-[18px] rounded-full bg-[#0EB28D] border border-[#0EB28D] flex items-center justify-center text-white text-[10px] font-extrabold leading-none">
                ✓
              </div>
              <span className="font-sans font-[600] text-[11px] text-[#0C8F72] mt-1.5">
                Key questions
              </span>
            </div>

            {/* Step 5: Details */}
            <div className="flex flex-col items-center">
              <div className="w-[18px] h-[18px] rounded-full bg-[#0EB28D] border border-[#0EB28D] flex items-center justify-center text-white text-[10px] font-extrabold leading-none">
                ✓
              </div>
              <span className="font-sans font-[600] text-[11px] text-[#0C8F72] mt-1.5">
                Details
              </span>
            </div>

            {/* Step 6: Your results (Active) */}
            <div className="flex flex-col items-center">
              <div className="relative flex items-center justify-center">
                {/* Outer halo */}
                <div className="absolute w-[29.5px] h-[29.5px] rounded-full border-[4px] border-[#062C55]/10" />
                <div className="w-[21.5px] h-[21.5px] rounded-full bg-[#062C55] border border-[#062C55] flex items-center justify-center text-white text-[10px] font-extrabold z-10 leading-none">
                  ★
                </div>
              </div>
              <span className="font-sans font-[800] text-[11px] text-[#062C55] mt-1.5">
                Your results
              </span>
            </div>
          </div>

          {/* Stepper Progress Line */}
          <div className="relative mt-2 px-4">
            <div className="w-full h-[6px] rounded-[3px] bg-[#E9E5DC] relative overflow-visible">
              <div className="h-full rounded-[3px] bg-gradient-to-r from-[#0C8F72] to-[#0EB28D] w-full" />
              {/* Endpoint with pulsing ring */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center">
                <div className="absolute w-[30px] h-[30px] rounded-full border-[8px] border-[#0EB28D]/[0.08]" />
                <div className="absolute w-[22px] h-[22px] rounded-full border-[4px] border-[#0EB28D]/[0.18]" />
                <div className="w-[14px] h-[14px] rounded-full bg-[#0EB28D] z-10" />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Stepper (under 640px) */}
        <div className="sm:hidden px-2 pb-2">
          <div className="flex items-center justify-between px-2 mb-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-full bg-[#0EB28D] border border-[#0EB28D] flex items-center justify-center text-white text-[9px] font-extrabold"
              >
                ✓
              </div>
            ))}
            {/* Step 6 Active */}
            <div className="relative flex items-center justify-center">
              <div className="absolute w-[27px] h-[27px] rounded-full border-[4px] border-[#062C55]/10" />
              <div className="w-[19px] h-[19px] rounded-full bg-[#062C55] border border-[#062C55] flex items-center justify-center text-white text-[9px] font-extrabold z-10">
                ★
              </div>
            </div>
          </div>
          <div className="w-full h-[6px] rounded-[3px] bg-gradient-to-r from-[#0C8F72] to-[#0EB28D] relative">
            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center">
              <div className="w-[14px] h-[14px] rounded-full bg-[#0EB28D]" />
            </div>
          </div>
          <div className="text-right mt-1 pr-1">
            <span className="font-sans font-[800] text-[10.5px] text-[#062C55]">
              Your results
            </span>
          </div>
        </div>

        {/* ── SUBHEADER (Report title & Explain toggle) ── */}
        <div className="flex items-center justify-between max-w-[760px] pt-3 pb-4">
          <span className="font-sans font-[700] text-[12px] text-[#5A6B78] uppercase tracking-wide">
            Your Severance Report
          </span>

          {/* Explain each question toggle */}
          <button
            type="button"
            onClick={() => setExplainEach(!explainEach)}
            className="flex items-center gap-2 cursor-pointer focus:outline-none"
            aria-pressed={explainEach}
          >
            <div
              className={`w-[36px] h-[20px] rounded-full transition-colors p-[2px] relative flex items-center ${
                explainEach ? "bg-[#0EB28D]" : "bg-[#CFD8DF]"
              }`}
            >
              <div
                className={`w-[16px] h-[16px] rounded-full bg-white transition-transform ${
                  explainEach ? "translate-x-[16px]" : "translate-x-0"
                }`}
              />
            </div>
            <span className="font-sans font-[700] text-[12px] text-[#0C8F72] select-none">
              Explain each question
            </span>
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT: TWO COLUMNS (Desktop) / STACKED (Mobile) ── */}
      <main className="max-w-[1200px] mx-auto px-4 sm:px-8 pb-20">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* ════════════════════════════════════════════════════════
              LEFT COLUMN: MAIN SALES REPORT CARD (714px in specs)
          ════════════════════════════════════════════════════════ */}
          <div className="w-full lg:max-w-[714px] bg-white border border-[#E7E4DD] rounded-[12px] p-5 sm:p-7 shadow-[0px_18px_40px_-18px_rgba(5,43,84,0.12)]">
            {/* Top pill badge */}
            <div className="inline-flex items-center px-3 py-1 bg-white border border-[#E7E4DD] rounded-[6px] mb-4">
              <span className="font-sans font-[700] text-[12px] text-[#062C55]">
                Your Severance Report
              </span>
            </div>

            {/* Headline */}
            <h1 suppressHydrationWarning className="font-serif font-[500] text-[22px] sm:text-[24px] leading-[27px] text-[#062C55] tracking-[-0.5px] mb-2.5">
              Your offer is {offerFormatted}. Courts often award people with a profile like yours {courtRangeFormatted}.
            </h1>

            {/* Subtitle */}
            <p className="font-sans font-normal text-[14.5px] sm:text-[15px] leading-[24px] text-[#5A6B78] mb-6">
              That gap is what your report helps you talk about: what&apos;s in your offer, what it leaves out, and exactly what to ask before you sign.
            </p>

            {/* ── VISUAL RANGE BAR CARD (656px x 122.5px) ── */}
            <div className="border border-[#E7E4DD] rounded-[14px] p-4 sm:p-5 mb-5 bg-white">
              {/* Range indicator track */}
              <div className="relative pt-6 pb-2">
                {/* Floating offer pin/badge */}
                <div
                  className="absolute top-0 transform -translate-x-1/2 flex flex-col items-center z-20 pointer-events-none"
                  style={{ left: "28%" }}
                >
                  <div className="px-2.5 py-0.5 bg-[#062C55] rounded-[6px] text-white font-sans font-[800] text-[11.5px] leading-[18px] whitespace-nowrap shadow-xs">
                    Your offer · <span suppressHydrationWarning>{offerFormatted}</span>
                  </div>
                  <div className="w-[3px] h-[14px] bg-[#062C55] rounded-[2px]" />
                </div>

                {/* Base Progress Bar */}
                <div className="w-full h-[12px] rounded-[6px] bg-[#EEF1F4] relative overflow-hidden flex items-center">
                  {/* Legal minimum segment */}
                  <div
                    className="h-full bg-[#B9C5CF] rounded-l-[6px]"
                    style={{ width: "16%" }}
                    title={`Legal minimum: ${minFormatted}`}
                  />
                  {/* Empty gap */}
                  <div className="h-full" style={{ width: "50%" }} />
                  {/* Court Awarded Range */}
                  <div
                    className="h-full bg-gradient-to-r from-[#B7E3D1] to-[#5FC9A6] rounded-[6px] border border-[#0EB28D]/20 shadow-xs"
                    style={{ width: "34%" }}
                    title={`What courts award: ${courtRangeFormatted}`}
                  />
                </div>
              </div>

              {/* Legend Row */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 pt-1 text-[12px] text-[#5A6B78]">
                <div className="flex items-center gap-2">
                  <span className="w-[10px] h-[10px] rounded-[3px] bg-[#B9C5CF] shrink-0" />
                  <span>Legal minimum · {minFormatted}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-[10px] h-[10px] rounded-[3px] bg-[#0EB28D] shrink-0" />
                  <span>What courts often award · {courtRangeFormatted}</span>
                </div>
              </div>

              {/* Disclaimer */}
              <p className="font-sans italic text-[11.5px] text-[#5A6B78] mt-2 leading-[18px]">
                An estimate from a general model, not what you&apos;re owed. Only a lawyer can tell you that.
              </p>
            </div>

            {/* ── TAGS ROW ── */}
            <div className="flex flex-wrap gap-2.5 mb-6">
              <div className="px-3.5 py-1.5 rounded-[8px] bg-[#FFF8E8] border border-[#ECDCA6] font-sans font-[700] text-[12.5px] text-[#6B4F00]">
                Sign-by: {data.signByDays || "14 days from your last day"}
              </div>
              <div className="px-3.5 py-1.5 rounded-[8px] bg-white border border-[#E7E4DD] font-sans font-[700] text-[12.5px] text-[#062C55]">
                Contract read with your letter
              </div>
            </div>

            {/* ── VIDEO / 45 SEC REPORT PREVIEW TEASER CARD ── */}
            <ReportVideoPlayer />

            {/* ── SECTION: YOUR OFFER, AT A GLANCE [FREE] ── */}
            <div className="border border-[#E7E4DD] rounded-[14px] p-4 sm:p-5 mb-6 bg-white">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-sans font-[800] text-[10.5px] uppercase tracking-[0.5px] text-[#0C8F72]">
                  YOUR OFFER, AT A GLANCE
                </span>
                <span className="px-2 py-0.5 rounded-[6px] bg-[#E6F8F1] border border-[#B9E6D4] font-sans font-[800] text-[10px] text-[#0C5C48]">
                  FREE
                </span>
              </div>

              {/* 3 cards: on phone stacked, on desktop 3 cols */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Col 1: Your offer */}
                <div className="p-3.5 rounded-[10px] bg-[#F6F8FA] border border-[#E3E8ED]">
                  <div className="font-sans font-normal text-[11px] text-[#5A6B78] uppercase tracking-[0.5px] mb-1">
                    YOUR OFFER
                  </div>
                  <div className="font-sans font-[700] text-[18px] leading-[28px] text-[#062C55]">
                    {offerFormatted}
                  </div>
                </div>

                {/* Col 2: Statutory Legal Min */}
                <div className="p-3.5 rounded-[10px] bg-[#F6F8FA] border border-[#E3E8ED]">
                  <div className="font-sans font-normal text-[11px] text-[#5A6B78] uppercase tracking-[0.5px] mb-1">
                    {data.provinceName?.toUpperCase() || "ONTARIO"} LEGAL MINIMUM
                  </div>
                  <div className="font-sans font-[700] text-[18px] leading-[28px] text-[#062C55]">
                    {minFormatted}
                  </div>
                </div>

                {/* Col 3: What Courts Award */}
                <div className="p-3.5 rounded-[10px] bg-[#FFF8E8] border border-[#ECDCA6]">
                  <div className="font-sans font-normal text-[11px] text-[#5A6B78] uppercase tracking-[0.5px] mb-1">
                    WHAT COURTS AWARD
                  </div>
                  <div className="font-sans font-[700] text-[18px] leading-[28px] text-[#7A5A00]">
                    {courtRangeFormatted}
                  </div>
                </div>
              </div>
            </div>

            {/* ── SECTION: WHAT'S IN YOUR SEVERANCE REPORT ── */}
            <div className="border border-[#E7E4DD] rounded-[14px] p-4 sm:p-5 mb-6 bg-white">
              <h2 className="font-serif font-[600] text-[18px] leading-[28px] text-[#062C55] mb-2">
                What&apos;s in your Severance Report
              </h2>

              {/* 4 Locked Rows */}
              <div className="divide-y divide-[#E7E4DD]">
                {/* Row 1 */}
                <div className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-sans font-[700] text-[14.5px] leading-[22px] text-[#062C55]">
                      What lifts your range
                    </h3>
                    <p className="font-sans font-normal text-[13.5px] leading-[21px] text-[#5A6B78]">
                      Your {data.years || 14} years, your age and your role are the three biggest drivers.
                    </p>
                    {explainEach && (
                      <p className="font-sans text-[12px] text-[#0C8F72] mt-1">
                        • Breaks down the Bardal factors applied by judges in {data.provinceName || "Ontario"}.
                      </p>
                    )}
                  </div>
                  <div className="w-[28px] h-[28px] rounded-full bg-[#F1F4F7] flex items-center justify-center shrink-0" title="Locked section">
                    <svg className="w-[13px] h-[13px] text-[#062C55]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                </div>

                {/* Row 2 */}
                <div className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-sans font-[700] text-[14.5px] leading-[22px] text-[#062C55]">
                      Your letter, in plain English
                    </h3>
                    <p className="font-sans font-normal text-[13.5px] leading-[21px] text-[#5A6B78]">
                      Release required: Yes — full release of claims.
                    </p>
                    {explainEach && (
                      <p className="font-sans text-[12px] text-[#0C8F72] mt-1">
                        • Translates release covenants, confidentiality restrictions, and clawback clauses.
                      </p>
                    )}
                  </div>
                  <div className="w-[28px] h-[28px] rounded-full bg-[#F1F4F7] flex items-center justify-center shrink-0" title="Locked section">
                    <svg className="w-[13px] h-[13px] text-[#062C55]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                </div>

                {/* Row 3 */}
                <div className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-sans font-[700] text-[14.5px] leading-[22px] text-[#062C55]">
                      For HR, or a lawyer
                    </h3>
                    <p className="font-sans font-normal text-[13.5px] leading-[21px] text-[#5A6B78]">
                      1. How did you calculate the offer, and which pay did you include?
                    </p>
                    {explainEach && (
                      <p className="font-sans text-[12px] text-[#0C8F72] mt-1">
                        • 5 ready-to-ask questions to ensure variable pay, bonuses, and benefits are accounted for.
                      </p>
                    )}
                  </div>
                  <div className="w-[28px] h-[28px] rounded-full bg-[#F1F4F7] flex items-center justify-center shrink-0" title="Locked section">
                    <svg className="w-[13px] h-[13px] text-[#062C55]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                </div>

                {/* Row 4 */}
                <div className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-sans font-[700] text-[14.5px] leading-[22px] text-[#062C55]">
                      What to do this week
                    </h3>
                    <p className="font-sans font-normal text-[13.5px] leading-[21px] text-[#5A6B78]">
                      You usually don&apos;t have to decide on the spot — your letter says {data.signByDays || "14 days from your last day"}.
                    </p>
                    {explainEach && (
                      <p className="font-sans text-[12px] text-[#0C8F72] mt-1">
                        • Clear timeline showing how to ask for an extension respectfully without jeopardizing the offer.
                      </p>
                    )}
                  </div>
                  <div className="w-[28px] h-[28px] rounded-full bg-[#F1F4F7] flex items-center justify-center shrink-0" title="Locked section">
                    <svg className="w-[13px] h-[13px] text-[#062C55]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Unlock All Four Button */}
              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={scrollToCheckout}
                  className="w-full py-3 px-4 rounded-[9px] bg-white border border-[#CFD8DF] hover:border-[#0EB28D] text-[#062C55] font-sans font-[700] text-[15px] leading-[21px] transition shadow-xs cursor-pointer flex items-center justify-center"
                >
                  Unlock all four ↓
                </button>
                <div className="font-sans font-normal text-[12.5px] leading-[20px] text-[#5A6B78] mt-2">
                  One-time $59 · no subscription
                </div>
              </div>
            </div>

            {/* ── GREEN CALLOUT: WORKS WITH A LAWYER ── */}
            <div className="w-full rounded-[8px] bg-[#F3FAF6] border-y border-r border-[#CFE8DD] border-l-[4px] border-l-[#0EB28D] p-4 mb-6">
              <h4 className="font-sans font-[700] text-[13.5px] leading-[20px] text-[#062C55] mb-1">
                Works with a lawyer, not instead of one.
              </h4>
              <p className="font-sans font-normal text-[13.5px] leading-[20px] text-[#1F3B32]">
                Take your report to a free first call and the lawyer starts from your facts, not from scratch. Connecting is free, and you choose if you go further.
              </p>
            </div>

            {/* ── FAQ ACCORDIONS ── */}
            <div className="space-y-2 mb-6">
              {/* FAQ 1 */}
              <div className="border border-[#E7E4DD] rounded-[10px] bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleFaq(1)}
                  className="w-full px-4 py-3 text-left flex items-center justify-between font-sans font-[700] text-[14px] leading-[22px] text-[#062C55]"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-[12px]">{openFaq[1] ? "▾" : "▸"}</span>
                    Is this legal advice?
                  </span>
                </button>
                {openFaq[1] && (
                  <div className="px-4 pb-3 pt-1 text-[13px] text-[#5A6B78] leading-relaxed border-t border-[#E7E4DD]/60">
                    No. FairExit provides legal information and mathematical analysis based on provincial employment standards and court precedent, not legal advice. Every employment situation has unique nuances, and only a qualified lawyer can give legal advice on your specific agreement.
                  </div>
                )}
              </div>

              {/* FAQ 2 */}
              <div className="border border-[#E7E4DD] rounded-[10px] bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleFaq(2)}
                  className="w-full px-4 py-3 text-left flex items-center justify-between font-sans font-[700] text-[14px] leading-[22px] text-[#062C55]"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-[12px]">{openFaq[2] ? "▾" : "▸"}</span>
                    What if the AI gets something wrong?
                  </span>
                </button>
                {openFaq[2] && (
                  <div className="px-4 pb-3 pt-1 text-[13px] text-[#5A6B78] leading-relaxed border-t border-[#E7E4DD]/60">
                    Before your final report is generated, you get to check and verify every single fact we extracted from your severance letter and employment contract. If anything is unclear, you can edit it or upload a clearer copy.
                  </div>
                )}
              </div>

              {/* FAQ 3 */}
              <div className="border border-[#E7E4DD] rounded-[10px] bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleFaq(3)}
                  className="w-full px-4 py-3 text-left flex items-center justify-between font-sans font-[700] text-[14px] leading-[22px] text-[#062C55]"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-[12px]">{openFaq[3] ? "▾" : "▸"}</span>
                    What do I get, and how?
                  </span>
                </button>
                {openFaq[3] && (
                  <div className="px-4 pb-3 pt-1 text-[13px] text-[#5A6B78] leading-relaxed border-t border-[#E7E4DD]/60">
                    You receive an immediate, downloadable 13+ page PDF severance report on screen and sent to your email. It includes full common law calculations, clause interpretations, tailored negotiation questions, and tactical next steps to keep or share with counsel.
                  </div>
                )}
              </div>
            </div>

            {/* ── CHECKOUT CARD: UNLOCK YOUR FULL SEVERANCE REPORT ── */}
            <div
              id="checkout-box"
              ref={checkoutRef}
              className="bg-[#FBFEFD] border border-[#0EB28D] rounded-[16px] p-5 sm:p-7 shadow-[0px_18px_40px_-18px_rgba(5,43,84,0.12)] scroll-mt-20"
            >
              {/* Header row with Title and Price */}
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="font-serif font-[700] text-[20px] leading-[31px] text-[#062C55]">
                  Unlock your full Severance Report
                </h3>
                <div className="text-right shrink-0">
                  <div className="font-serif font-normal text-[30px] leading-[30px] text-[#062C55]">
                    $59
                  </div>
                  <div className="font-serif font-normal text-[11px] leading-[11px] text-[#5A6B78] mt-1">
                    one-time
                  </div>
                </div>
              </div>

              <p className="font-sans font-normal text-[13px] leading-[20px] text-[#5A6B78] mb-5">
                The four locked sections above, built from your answers plus your letter and contract (you add them right after paying). Yours to keep, print or share with a lawyer.
              </p>

              {/* Checkout Form */}
              <form onSubmit={handleCheckoutSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="report-email-input"
                    className="block font-sans font-[800] text-[13.5px] leading-[21px] text-[#062C55] mb-2"
                  >
                    Where should we send your report?
                  </label>

                  {/* Input container with left amber/gold accent bar */}
                  <div className="relative flex items-center rounded-[10px] bg-[#FFFDF5] border border-[#CFD8DF] shadow-[0px_18px_40px_-18px_rgba(5,43,84,0.12)] overflow-hidden focus-within:border-[#0EB28D] transition-colors">
                    {/* Left yellow bar */}
                    <div className="w-[3px] self-stretch bg-[#E7B74D] shrink-0" />
                    <input
                      id="report-email-input"
                      ref={emailInputRef}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full px-3.5 py-3 bg-transparent font-sans text-[15px] text-[#062C55] placeholder-[#9AA3AB] outline-none"
                    />
                  </div>
                  <p className="font-sans font-normal text-[13px] leading-[19px] text-[#5A6B78] mt-2">
                    We&apos;ll email your report and receipt here.
                  </p>
                </div>

                <div className="w-full h-[1px] bg-[#DFECE6]" />

                {/* Newsletter & tips checkbox */}
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={subscribeNews}
                    onChange={(e) => setSubscribeNews(e.target.checked)}
                    className="w-4 h-4 rounded-[3px] border-[1.5px] border-[#8A96A0] text-[#0EB28D] focus:ring-[#0EB28D] mt-0.5"
                  />
                  <span className="font-sans font-normal text-[13.5px] leading-[20px] text-[#2B3A45]">
                    Also send me severance tips and FairExit news. Unsubscribe any time.
                  </span>
                </label>

                {payError && (
                  <div className="p-3 bg-[#FBECEB] text-[#A3231F] text-[13px] rounded-lg">
                    {payError}
                  </div>
                )}

                {/* Main Submit Button */}
                <button
                  type="submit"
                  disabled={isPaying}
                  className="w-full h-[55px] rounded-[12px] bg-[#12C79A] hover:bg-[#0EB28D] text-white font-sans font-[800] text-[17.5px] leading-[27px] transition-all shadow-[0px_18px_40px_-18px_rgba(5,43,84,0.12)] cursor-pointer flex items-center justify-center disabled:opacity-50"
                >
                  {isPaying ? "Preparing checkout…" : "Get my report · $59"}
                </button>

                {/* Subtitle / Guarantees */}
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center font-sans font-normal text-[12px] leading-[18px] text-[#5A6B78] pt-1">
                  <span>No account needed</span>
                  <span>·</span>
                  <span>$59 plus applicable tax</span>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => setTermsModalOpen(true)}
                    className="underline hover:text-[#062C55] cursor-pointer"
                  >
                    Privacy &amp; terms
                  </button>
                </div>

                {/* Payment method logos */}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <ApplePayBadge />
                  <GooglePayBadge />
                  <VisaBadge />
                  <MastercardBadge />
                  <AmexBadge />
                  <InteracBadge />
                </div>
              </form>
            </div>

            {/* Rather have a pro handle it? Link */}
            <div className="mt-5 text-center font-sans text-[13px] leading-[20px] text-[#5A6B78]">
              Rather have a pro handle it?{" "}
              <button
                type="button"
                onClick={() => setLawyerModalOpen(true)}
                className="font-[700] text-[#0C8F72] hover:underline cursor-pointer ml-1 inline-block"
              >
                Talking to a lawyer is still free →
              </button>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════
              RIGHT COLUMN: "YOUR DETAILS SO FAR" SIDEBAR (300px)
          ════════════════════════════════════════════════════════ */}
          <aside className="w-full lg:w-[300px] shrink-0 bg-[#EEF1F4] border border-[#DDE3E9] rounded-[12px] p-5">
            <div className="font-sans font-[800] text-[11px] leading-[17px] tracking-[0.5px] text-[#5A6B78] uppercase mb-1">
              YOUR DETAILS SO FAR
            </div>
            <h2 className="font-serif font-normal text-[16px] leading-[25px] text-[#062C55] mb-3">
              FairExit summary
            </h2>

            {/* Key-Value Summary List */}
            <div className="space-y-2 text-[13px] divide-y divide-[#D3DAE1]">
              <div className="flex items-center justify-between pt-2">
                <span className="text-[#5A6B78]">Union member</span>
                <span className="font-bold text-[#062C55]">{data.union || "No"}</span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[#5A6B78]">Employment</span>
                <span className="font-bold text-[#062C55]">{data.employment || "Regular employee"}</span>
              </div>

              {Boolean(data.signed) && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[#5A6B78]">Signed yet?</span>
                  <span className="font-bold text-[#062C55]">{data.signed}</span>
                </div>
              )}

              {Boolean(data.federal) && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[#5A6B78]">Federally regulated</span>
                  <span className="font-bold text-[#062C55]">{data.federal}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-[#5A6B78]">Province</span>
                <span className="font-bold text-[#062C55]">{data.provinceName || "Ontario"}</span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[#5A6B78]">Age</span>
                <span className="font-bold text-[#062C55]">{data.age || "52"}</span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[#5A6B78]">Years of service</span>
                <span className="font-bold text-[#062C55]">{data.years || 14} yrs</span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[#5A6B78]">Pay</span>
                <span className="font-bold text-[#062C55]">{payFormatted}</span>
              </div>

              <div className="flex items-start justify-between pt-2">
                <span className="text-[#5A6B78]">Occupation</span>
                <span className="font-bold text-[#062C55] text-right max-w-[150px]">
                  {data.role || "Middle management / Senior / Director"}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[#5A6B78]">Employer payroll ≥ $2.5M</span>
                <span className="font-bold text-[#062C55]">{data.payroll || "Not sure"}</span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[#5A6B78]">Other pay</span>
                <span className="font-bold text-[#062C55]">{data.otherPay || "None"}</span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[#5A6B78]">New job yet?</span>
                <span className="font-bold text-[#062C55]">{data.newJob || "Not yet"}</span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[#5A6B78]">Min-only clause</span>
                <span className="font-bold text-[#062C55]">{data.minClause || "No"}</span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[#5A6B78]">Contract</span>
                <span className="font-bold text-[#062C55]">{data.contract || "Signed · role changed"}</span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[#5A6B78]">How it ended</span>
                <span className="font-bold text-[#062C55]">{data.howEnded || "Laid off"}</span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[#5A6B78]">Similar jobs nearby</span>
                <span className="font-bold text-[#062C55]">{data.market || "Some"}</span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[#5A6B78]">Anything flagged</span>
                <span className="font-bold text-[#062C55]">{data.flagged || "Nothing unusual"}</span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[#5A6B78]">Offer</span>
                <span className="font-bold text-[#062C55]">{offerFormatted}</span>
              </div>
            </div>

            {/* Bottom LIVE ESTIMATE Box */}
            <div className="mt-5 pt-4 border-t border-[#D3DAE1]">
              <div className="font-sans font-[800] text-[10.5px] leading-[16px] tracking-[0.5px] text-[#5A6B78] uppercase mb-1">
                LIVE ESTIMATE · NOT WHAT YOU&apos;RE OWED
              </div>
              <div className="font-serif font-[600] text-[20px] leading-[23px] text-[#0C8F72] mb-1">
                {minFormatted} – {courtHighFormatted}
              </div>
              <div className="font-sans text-[11.5px] leading-[16px] text-[#5A6B78] mb-1">
                {data.noticeWeeks || 8} wks notice · court-awarded {data.courtMonths || "15–21 mo"}
              </div>
              <div className="font-sans text-[11.5px] leading-[16px] text-[#5A6B78] mb-3">
                <span className="font-bold">Your offer {offerFormatted}</span> — near the floor
              </div>

              {/* Status pill */}
              <div className="w-full py-2 px-3 rounded-[9px] bg-[#E5F5EE] border border-[#C7E6D6] flex items-center justify-center text-[#0C8F72] font-sans font-[700] text-[12px] leading-[18px]">
                ✓ Enough to show your results
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* ── MODALS ── */}
      <ReportVideoModal
        isOpen={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
        onUnlock={scrollToCheckout}
      />

      <TermsConditionsModal
        isOpen={termsModalOpen}
        onClose={() => setTermsModalOpen(false)}
        country={data.country === "US" ? "US" : "CA"}
        onAllAccepted={() => {
          setTermsAccepted(true);
          setTermsModalOpen(false);
          proceedToPayment();
        }}
      />

      {/* ── STEP 3: SECURE CHECKOUT DIALOG ── */}
      <CheckoutDialog
        isOpen={checkoutDialogOpen}
        onClose={() => setCheckoutDialogOpen(false)}
        email={email}
        amount="$59.00"
        isProcessing={isPaying}
        errorMessage={payError}
        onPay={async () => {
          await proceedToPayment();
        }}
      />

      {/* ── MOBILE STICKY BOTTOM BAR (as shown in phone screenshot) ── */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#062C55] text-white px-4 py-3 flex items-center justify-between shadow-2xl border-t border-white/10">
        <div>
          <div className="font-sans font-[700] text-[13px] text-white">Your full report</div>
          <div className="font-sans text-[11px] text-[#A2B4C5]">$59 one-time</div>
        </div>
        <button
          type="button"
          onClick={scrollToCheckout}
          className="px-4 py-2 rounded-[9px] bg-[#12C79A] hover:bg-[#0EB28D] text-white font-sans font-[800] text-[13.5px] transition flex items-center gap-1 shadow-sm"
        >
          Unlock →
        </button>
      </div>

      <AskLawyerModal
        isOpen={lawyerModalOpen}
        onClose={() => setLawyerModalOpen(false)}
        country={data.country === "US" ? "US" : "CA"}
        regionName={data.provinceName}
        caseId={caseId || undefined}
      />
    </div>
  );
}
