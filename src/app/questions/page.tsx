"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import NextLink from "next/link";
import { useSearchParams } from "next/navigation";
import { estimate, EstimateResult } from "@/lib/severance-rules";

// Roles & occupation factors
const OCCUPATIONS = [
  { value: 1.25, label: "Upper management (VP, C-suite, executive)" },
  { value: 1.15, label: "Middle management / Senior / Director" },
  { value: 1.1, label: "Lower management / Supervisor" },
  { value: 1.12, label: "Professional (accountant, engineer, etc.)" },
  { value: 1.08, label: "Technical / skilled trade" },
  { value: 1.08, label: "Salesperson / Sales manager" },
  { value: 1.0, label: "Clerical / administrative" },
  { value: 1.0, label: "Labourer / general" },
];

const US_STATES = [
  "California",
  "New York",
  "Texas",
  "Florida",
  "Illinois",
  "New Jersey",
  "Washington",
  "Other state",
];

function kMoney(n: number): string {
  n = Math.round(n);
  if (n >= 1000000) {
    const m = n / 1000000;
    return "$" + (m >= 10 ? Math.round(m) : m.toFixed(1).replace(/\.0$/, "")) + "M";
  }
  if (n >= 1000) {
    return "$" + Math.round(n / 1000) + "k";
  }
  return "$" + n;
}

function money(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-CA");
}

function QuestionsContent() {
  const searchParams = useSearchParams();

  const countryParam = searchParams?.get("country")?.toUpperCase();
  const stParam = searchParams?.get("st");
  const isCanada = countryParam ? countryParam === "CA" : (stParam ? false : true);

  // Overall workflow step:
  // "q1", "q2", "q3", "q4" for the 4 sequential Canada eligibility questions
  // 1 = Basics, 2 = Money, 3 = Key questions, 4 = Details, 5 = Analyzing, 6 = Results
  // "union" = Union stop
  // For US: "us-situation", 1, 2, 3, 4, 5, 6
  const [currentStep, setCurrentStep] = useState<string>(isCanada ? "q1" : "us-situation");
  const [explainOn, setExplainOn] = useState<boolean>(true);
  const [mobileSummOpen, setMobileSummOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Form State
  const [state, setState] = useState({
    union: "no",
    emptype: "regular",
    signed: "no",
    federal: "no",
    agreed: false,
    province: "ON",
    usState: "California",
    age: "52",
    years: "14",
    salary: isCanada ? "110000" : "128000",
    payroll: "unsure",
    roleFactor: 1.15,
    pay: { bonus: false, stock: false, benefits: false, commission: false, pto: false } as Record<string, boolean>,
    offer: 24000,
    reemployed: "no",
    clause: "unsure",
    contract: "unsure",
    reason: "layoff",
    market: "mid",
    redflag: "none",
    groupLayoff: "yes",
  });

  // Prefill from URL query params
  useEffect(() => {
    if (!searchParams) return;
    const p = searchParams.get("p") || searchParams.get("province");
    const st = searchParams.get("st") || searchParams.get("state");
    const y = searchParams.get("y") || searchParams.get("years");
    const s = searchParams.get("s") || searchParams.get("salary");
    const a = searchParams.get("age");
    const age40 = searchParams.get("age40");
    const grp = searchParams.get("group");
    const r = searchParams.get("role");
    const off = searchParams.get("offer");

    setState((prev) => ({
      ...prev,
      province: p || prev.province,
      usState: st || prev.usState,
      years: y ? y.replace(/\D/g, "") : prev.years,
      salary: s ? s.replace(/\D/g, "") : prev.salary,
      age: a ? a.replace(/\D/g, "") : (age40 === "yes" ? "52" : prev.age),
      roleFactor: r ? parseFloat(r) : prev.roleFactor,
      offer: off ? parseInt(off.replace(/\D/g, ""), 10) : prev.offer,
      groupLayoff: grp || prev.groupLayoff,
    }));
  }, [searchParams]);

  // Compute live estimate
  const estResult: EstimateResult | null = useMemo(() => {
    const ageNum = parseInt(state.age, 10);
    const yrsNum = parseFloat(state.years);
    const salNum = parseFloat(state.salary);
    if (!ageNum || !yrsNum || !salNum) return null;

    try {
      const code = isCanada ? "CA-" + state.province : "US-FED";
      const e = estimate(code, {
        age: ageNum,
        years: yrsNum,
        salary: salNum,
        roleFactor: state.roleFactor,
        payrollGlobal: state.payroll === "yes" ? 3000000 : 0,
      });

      const mkFactor = state.market === "easy" ? 0.9 : state.market === "hard" ? 1.15 : 1;
      if (e.commonLaw) {
        e.commonLaw = {
          lowMonths: Math.round(e.commonLaw.lowMonths * mkFactor),
          highMonths: Math.round(e.commonLaw.highMonths * mkFactor),
          lowAmount: Math.round(e.commonLaw.lowAmount * mkFactor),
          highAmount: Math.round(e.commonLaw.highAmount * mkFactor),
        };
      }
      return e;
    } catch {
      return null;
    }
  }, [isCanada, state.age, state.years, state.salary, state.province, state.roleFactor, state.payroll, state.market]);

  // Context Why Card data matching active question
  const whyCopy = useMemo(() => {
    if (isCanada) {
      if (currentStep === "q1") {
        return {
          title: "UNION JOBS FOLLOW THEIR OWN RULES",
          text: "If you're in a union, your severance is set by your collective agreement and handled through your union — the rules below don't apply to you.",
        };
      } else if (currentStep === "q2") {
        return {
          title: "YOUR JOB TYPE CHANGES WHAT'S OWED",
          text: "A fixed-term contract can be owed the rest of the term; a commission or contractor role may not be an \"employee\" at all. Both change the answer.",
        };
      } else if (currentStep === "q3") {
        return {
          title: "A SIGNATURE CAN CLOSE SOME DOORS",
          text: "A signed release is usually final, but some rights survive it. Knowing this now means we don't show you options you no longer have.",
        };
      } else if (currentStep === "q4") {
        return {
          title: "FEDERAL JOBS HAVE THEIR OWN LAW",
          text: "Banks, airlines, telecom and rail follow federal rules (Canada Labour Code), not provincial ones — different minimums.",
        };
      } else if (currentStep === "step-basics") {
        return {
          title: "THE THREE NUMBERS BEHIND YOUR RANGE",
          text: "Severance is counted in weeks or months of your pay; courts give more of them to people who are older and were there longer, because a similar job takes longer to find.",
        };
      } else if (currentStep === "step-money") {
        return {
          title: "YOUR WHOLE PAY COUNTS",
          text: "Notice is usually measured in months of your total pay — bonus, commission and benefits count. Leaving them out makes the number too small.",
        };
      } else if (currentStep === "step-clause") {
        return {
          title: "THE SENTENCE THAT CAN CAP YOU",
          text: "This one sentence in a contract is what employers rely on to pay only the minimum. Courts often find these clauses don't hold up — and then the bigger what courts award applies.",
        };
      } else if (currentStep === "step-details") {
        return {
          title: "HOW IT ENDED CHANGES EVERYTHING",
          text: "\"for cause\" means the employer says you did something serious enough to owe you nothing — a bar they rarely clear. Forced out can count the same as being let go.",
        };
      }
    } else {
      if (currentStep === "us-situation") {
        return {
          title: "YOUR STATE CAN ADD RULES",
          text: "Federal law is the floor. Several states add their own layoff notice, severance or non-compete rules on top. Remote workers: your own state's rules usually apply, even if the agreement names another one.",
        };
      } else if (currentStep === "step-basics") {
        return {
          title: "UNION JOBS FOLLOW THEIR OWN RULES",
          text: "If you're under a collective agreement, severance and disputes usually go through your union rep, not a private agreement.",
        };
      }
    }
    return { title: "", text: "" };
  }, [isCanada, currentStep]);

  // Overall progress percentage for track
  const progressPercent = useMemo(() => {
    if (currentStep === "q1") return 6;
    if (currentStep === "q2") return 11;
    if (currentStep === "q3") return 16;
    if (currentStep === "q4") return 20;
    if (currentStep === "union") return 15;
    if (currentStep === "us-situation") return 20;
    if (currentStep === "step-basics") return 36;
    if (currentStep === "step-money") return 54;
    if (currentStep === "step-clause") return 72;
    if (currentStep === "step-details") return 88;
    if (currentStep === "step-analyzing" || currentStep === "step-results") return 100;
    return 10;
  }, [currentStep]);

  const activeRailIndex = useMemo(() => {
    if (["q1", "q2", "q3", "q4", "union", "us-situation"].includes(currentStep)) return 0;
    if (currentStep === "step-basics") return 1;
    if (currentStep === "step-money") return 2;
    if (currentStep === "step-clause") return 3;
    if (currentStep === "step-details") return 4;
    if (["step-analyzing", "step-results"].includes(currentStep)) return 5;
    return 0;
  }, [currentStep]);

  // Navigation handlers for the 4 Canada steps
  const goToQ1 = () => {
    setCurrentStep("q1");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goToQ2 = () => {
    setCurrentStep("q2");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goToQ3 = () => {
    setCurrentStep("q3");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goToQ4 = () => {
    setCurrentStep("q4");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleContinueFromQ4 = () => {
    if (!state.agreed) return;
    if (state.union === "yes") {
      setCurrentStep("union");
    } else {
      setCurrentStep("step-basics");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStartAnalyze = () => {
    setCurrentStep("step-analyzing");
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => {
      setCurrentStep("step-results");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 1600);
  };

  const caSteps = [
    { key: "q1", num: "1", label: "Eligible" },
    { key: "step-basics", num: "2", label: "Basics" },
    { key: "step-money", num: "3", label: "Money" },
    { key: "step-clause", num: "4", label: "Key questions" },
    { key: "step-details", num: "5", label: "Details" },
    { key: "step-results", num: "★", label: "Your results" },
  ];

  const usSteps = [
    { key: "us-situation", num: "1", label: "Situation" },
    { key: "step-basics", num: "2", label: "The layoff" },
    { key: "step-money", num: "3", label: "The papers" },
    { key: "step-clause", num: "4", label: "Key question" },
    { key: "step-details", num: "5", label: "Details" },
    { key: "step-results", num: "★", label: "Your results" },
  ];

  const stepsList = isCanada ? caSteps : usSteps;

  return (
    <div className="min-h-screen bg-[#f6f4ef] text-[#17242f] font-sans antialiased pb-24 md:pb-16">
      {/* ── TOP HEADER / NAV ── */}
      <header className="sticky top-0 z-30 bg-[#f6f4ef]/95 backdrop-blur-md border-b border-[#e7e4dd]">
        <div className="max-w-[1160px] mx-auto px-4 sm:px-5 py-3 flex items-center justify-between">
          <NextLink href="/" className="inline-flex items-center gap-2" aria-label="FairExit">
            <img src="/fairexit-wordmark.png" alt="FairExit" className="h-[26px] w-auto" />
          </NextLink>

          <nav className="hidden md:flex items-center gap-5 text-[13.5px] font-semibold text-[#5a6b78]" aria-label="Site">
            <NextLink href="/#how" className="hover:text-[#062c55] transition-colors">How it works</NextLink>
            <NextLink href="/#paths" className="hover:text-[#062c55] transition-colors">Pricing</NextLink>
            <NextLink href="/#faq" className="hover:text-[#062c55] transition-colors">FAQ</NextLink>
            <NextLink href="/#why" className="hover:text-[#062c55] transition-colors">Blog</NextLink>
            <NextLink href="/#about" className="hover:text-[#062c55] transition-colors">About</NextLink>
          </nav>

          <div className="flex items-center gap-3">
            <NextLink href="/#app" className="hidden md:inline-block text-[12.5px] font-bold text-[#0c8f72] hover:underline">
              Get the app
            </NextLink>
            <NextLink href="/" className="hidden md:inline-block text-[13px] font-semibold text-[#5a6b78] hover:text-[#062c55] transition-colors">
              Exit ✕
            </NextLink>
            <button
              type="button"
              className="md:hidden p-1.5 text-[#062c55]"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile menu"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Nav Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-[#e7e4dd] px-5 py-3 space-y-2 text-sm font-semibold text-[#5a6b78]">
            <NextLink href="/#how" className="block py-1 hover:text-[#062c55]" onClick={() => setMobileMenuOpen(false)}>How it works</NextLink>
            <NextLink href="/#paths" className="block py-1 hover:text-[#062c55]" onClick={() => setMobileMenuOpen(false)}>Pricing</NextLink>
            <NextLink href="/#faq" className="block py-1 hover:text-[#062c55]" onClick={() => setMobileMenuOpen(false)}>FAQ</NextLink>
            <NextLink href="/#why" className="block py-1 hover:text-[#062c55]" onClick={() => setMobileMenuOpen(false)}>Blog</NextLink>
            <NextLink href="/#about" className="block py-1 hover:text-[#062c55]" onClick={() => setMobileMenuOpen(false)}>About</NextLink>
          </div>
        )}
      </header>

      {/* ── MOBILE DETAILS TOGGLE (STICKY BOTTOM BAR) ── */}
      <button
        type="button"
        className="md:hidden fixed left-3.5 right-3.5 bottom-3.5 z-40 flex items-center justify-between bg-white border border-[#d5dde4] rounded-xl px-4 py-3 shadow-[0_10px_28px_-12px_rgba(6,44,85,0.35)] text-left cursor-pointer"
        onClick={() => setMobileSummOpen(!mobileSummOpen)}
        aria-expanded={mobileSummOpen}
      >
        <span className="text-sm font-bold text-[#062c55] truncate pr-2">
          Your details <span className="font-normal text-[#5a6b78] text-xs">— just getting started</span>
        </span>
        <span className="inline-flex items-center gap-1 bg-[#0eb28d] text-white text-xs font-extrabold px-2.5 py-1.5 rounded-lg shrink-0">
          <span>{mobileSummOpen ? "Hide" : "View"}</span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`w-3.5 h-3.5 transition-transform duration-200 ${mobileSummOpen ? "rotate-180" : ""}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>

      {/* ── MOBILE SUMMARY BOTTOM SHEET ── */}
      {mobileSummOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-[#062c55]/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileSummOpen(false)}
          />
          <div className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-white border-t border-[#e7e4dd] rounded-t-2xl p-5 pb-24 shadow-2xl max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between pb-3 border-b border-[#e7e4dd] mb-4">
              <div>
                <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#5a6b78]">Your details so far</span>
                <h3 className="font-serif text-lg font-bold text-[#062c55]">FairExit summary</h3>
              </div>
              <button
                type="button"
                onClick={() => setMobileSummOpen(false)}
                className="w-8 h-8 rounded-full bg-[#f4f6f8] text-[#5a6b78] flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>
            {/* Summary Details */}
            <div className="space-y-2 text-[13.5px]">
              <div className="flex justify-between py-1.5 border-b border-dashed border-[#e7e4dd]">
                <span className="text-[#5a6b78]">Age</span>
                <b className="text-[#062c55] font-semibold">{state.age || "—"}</b>
              </div>
              <div className="flex justify-between py-1.5 border-b border-dashed border-[#e7e4dd]">
                <span className="text-[#5a6b78]">Years of service</span>
                <b className="text-[#062c55] font-semibold">{state.years ? `${state.years} yrs` : "—"}</b>
              </div>
              <div className="flex justify-between py-1.5 border-b border-dashed border-[#e7e4dd]">
                <span className="text-[#5a6b78]">Pay</span>
                <b className="text-[#062c55] font-semibold">{state.salary ? `${kMoney(parseFloat(state.salary))}/yr` : "—"}</b>
              </div>
              {isCanada && (
                <div className="flex justify-between py-1.5 border-b border-dashed border-[#e7e4dd]">
                  <span className="text-[#5a6b78]">Offer</span>
                  <b className="text-[#062c55] font-semibold">{state.offer ? kMoney(state.offer) : "—"}</b>
                </div>
              )}
            </div>

            {/* Live Estimate Block */}
            {isCanada && estResult && estResult.statutory && (
              <div className="mt-4 pt-3 border-t border-[#d3dae1]">
                <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#5a6b78]">
                  Live estimate · not what you&apos;re owed
                </div>
                <div className="font-serif text-[22px] font-bold text-[#0c8f72] my-1">
                  {kMoney(estResult.statutory.amount)}
                  {estResult.commonLaw && estResult.commonLaw.highAmount > estResult.statutory.amount
                    ? ` – ${kMoney(estResult.commonLaw.highAmount)}`
                    : ""}
                </div>
                <div className="text-xs text-[#5a6b78] leading-tight mb-3">
                  {estResult.statutory.terminationWeeks} wks notice
                  {estResult.statutory.severanceWeeks ? ` + ${estResult.statutory.severanceWeeks} wks severance pay` : ""}
                  {estResult.commonLaw
                    ? ` · court-awarded ${estResult.commonLaw.lowMonths}–${estResult.commonLaw.highMonths} mo`
                    : ""}
                  <br />
                  <b>Your offer {kMoney(state.offer)}</b> — near the floor
                </div>
                <span className="inline-block text-[11px] font-bold text-[#0c7a60] bg-[#e6f5ef] border border-[#b9e6d4] px-2.5 py-1 rounded-md">
                  ✓ Enough to show your results
                </span>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── MAIN CONTENT CONTAINER ── */}
      <div className="max-w-[1160px] mx-auto px-4 sm:px-5 pt-4">
        {/* PROGRESS RAIL & TRACK */}
        <div className="max-w-[720px] mx-auto mb-6">
          <ol className="grid grid-cols-6 gap-1.5 list-none m-0 p-0 mb-2 text-center" id="stepsBar">
            {stepsList.map((s, idx) => {
              const isDone = activeRailIndex > idx;
              const isCur = activeRailIndex === idx;
              return (
                <li
                  key={s.label}
                  className={`relative pt-6 text-[11px] font-semibold transition-colors ${
                    isDone ? "text-[#0c8f72] cursor-pointer" : isCur ? "text-[#062c55] font-extrabold" : "text-[#a7b0b8]"
                  }`}
                  onClick={() => {
                    if (isDone) setCurrentStep(s.key);
                  }}
                >
                  <i
                    className={`absolute top-0 left-1/2 -translate-x-1/2 w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center not-italic text-[10px] font-extrabold transition-all duration-300 ${
                      isDone
                        ? "bg-[#0eb28d] border-[#0eb28d] text-white"
                        : isCur
                        ? "bg-[#062c55] border-[#062c55] text-white shadow-[0_0_0_4px_rgba(6,44,85,0.1)] scale-110"
                        : "bg-white border-[#d3cfc5] text-[#b7b1a6]"
                    }`}
                  >
                    {isDone ? "✓" : s.num}
                  </i>
                  <span className={`${isCur ? "inline" : "hidden md:inline"}`}>{s.label}</span>
                </li>
              );
            })}
          </ol>

          {/* Progress bar track */}
          <div className="h-1.5 bg-[#e9e5dc] rounded-full overflow-hidden relative mx-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#0c8f72] to-[#0eb28d] transition-all duration-500 relative"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Subheading row: Step label + Explain toggle */}
          <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
            <div className="text-xs font-bold text-[#5a6b78]">
              {["q1", "q2", "q3", "q4"].includes(currentStep) && "Step 1 of 5 · Are you eligible?"}
              {currentStep === "union" && "Union members"}
              {currentStep === "us-situation" && "Step 1 · Your situation"}
              {currentStep === "step-basics" && (isCanada ? "Step 2 of 5 · The basics" : "Step 2 · The layoff")}
              {currentStep === "step-money" && (isCanada ? "Step 3 of 5 · The money picture" : "Step 3 · The papers")}
              {currentStep === "step-clause" && (isCanada ? "Step 4 of 5 · Key questions" : "Step 4 · Key question")}
              {currentStep === "step-details" && (isCanada ? "Step 5 of 5 · Last details" : "Step 5 · Details")}
              {currentStep === "step-analyzing" && "Reading your situation…"}
              {currentStep === "step-results" && "Your results"}
              <span className="ml-2 font-medium italic text-[#5a6b78]">
                {["q1", "q2", "q3", "q4"].includes(currentStep) && "Ten seconds, promise."}
                {currentStep === "step-basics" && "The facts a lawyer would ask first."}
                {currentStep === "step-money" && "This is where the number gets real."}
                {currentStep === "step-clause" && "The one that matters most."}
                {currentStep === "step-details" && "Last one — then your read."}
                {currentStep === "step-results" && "Here's where you stand."}
              </span>
            </div>

            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-[#5a6b78] select-none">
              <input
                type="checkbox"
                className="sr-only"
                checked={explainOn}
                onChange={(e) => setExplainOn(e.target.checked)}
              />
              <span
                className={`w-9 h-5 rounded-full transition-colors relative ${
                  explainOn ? "bg-[#0eb28d]" : "bg-[#cdd3d8]"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                    explainOn ? "translate-x-4" : ""
                  }`}
                />
              </span>
              <span className={explainOn ? "text-[#0c8f72]" : ""}>Explain each question</span>
            </label>
          </div>
        </div>

        {/* ── TWO COLUMN SHELL: MAIN CARD + DESKTOP SIDEBAR ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,720px)_340px] gap-8 justify-center items-start">
          {/* LEFT: MAIN CARD WORKFLOW */}
          <div className="w-full">

            {/* ════════════════════════════════════════════════════════════════
                SCREEN 1 (QUESTION 1 OF 4): WERE YOU IN A UNION?
            ════════════════════════════════════════════════════════════════ */}
            {currentStep === "q1" && (
              <div className="relative bg-white border border-[#e7e4dd] rounded-[18px] p-6 sm:p-8 shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] animate-in fade-in duration-300">
                {/* Top Row: 100% Free Badge on left, 4 Dots on right */}
                <div className="flex items-center justify-between gap-3 mb-5">
                  <div className="flex items-center gap-2.5 p-2.5 px-3.5 rounded-xl bg-gradient-to-r from-[#e6f8f1] to-[#f3faf6] border border-[#b9e6d4] shadow-[0_4px_16px_-12px_rgba(14,178,141,0.5)]">
                    <span className="w-5 h-5 rounded-full bg-[#0eb28d] text-white font-extrabold flex items-center justify-center shrink-0 text-[11px]">
                      ✓
                    </span>
                    <span className="text-xs sm:text-[13px] text-[#1f3b32]">
                      <b className="font-bold text-[#062c55]">100% free to get your read.</b> No card. No signup. No sales call.
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" aria-label="Question 1 of 4">
                    <i className="inline-block w-2 h-2 rounded-full bg-[#0eb28d]" />
                    <i className="inline-block w-2 h-2 rounded-full bg-[#dcd8cf]" />
                    <i className="inline-block w-2 h-2 rounded-full bg-[#dcd8cf]" />
                    <i className="inline-block w-2 h-2 rounded-full bg-[#dcd8cf]" />
                  </div>
                </div>

                {/* Heading */}
                <h1 className="font-serif font-normal text-[23px] sm:text-[27px] text-[#062c55] leading-[1.2] tracking-tight">
                  First — a few things that decide how this works.
                </h1>

                {/* Mobile Ontario Explainer: ONLY when explainOn is true and md:hidden */}
                {explainOn && (
                  <div className="md:hidden my-3 p-3.5 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                    <b>How severance works in Ontario, in one breath:</b> there are three layers.{" "}
                    <b>1 · Notice pay</b> — about a week per year, max 8 weeks; everyone gets this.{" "}
                    <b>2 · Severance pay</b> — an extra week per year (max 26) only if you were there 5+ years and the employer&apos;s payroll is over $2.5M.{" "}
                    <b>3 · Common law</b> — what courts award when your contract doesn&apos;t validly cap you: months not weeks, up to about 24. Most people are only offered layer 1.{" "}
                    <a
                      href="https://www.ontario.ca/document/your-guide-employment-standards-act-0/termination-employment"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0c8f72] font-bold underline"
                    >
                      Official source →
                    </a>
                  </div>
                )}

                <p className="text-[13.5px] sm:text-sm text-[#5a6b78] mt-2 mb-5">
                  These change which rules apply to you. They take ten seconds and make everything after more accurate.
                </p>

                {/* Question title */}
                <div className="font-bold text-[15px] sm:text-[16px] text-[#062c55] mb-2.5">
                  Were you in a union?
                </div>

                {/* Mobile contextual explanation box */}
                {explainOn && (
                  <div className="md:hidden mb-3.5 p-3 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                    <b className="block text-[#0c8f72] font-bold uppercase text-[11px] mb-1">Union jobs follow their own rules</b>
                    If you&apos;re in a union, your severance is set by your collective agreement and handled through your union — the rules below don&apos;t apply to you.
                  </div>
                )}

                {/* Big Pills */}
                <div className="space-y-2.5">
                  <div
                    onClick={() => setState({ ...state, union: "no" })}
                    className={`flex items-center gap-3 p-3.5 px-4 rounded-[14px] border-[1.5px] cursor-pointer transition-all ${
                      state.union === "no"
                        ? "border-[#062c55] bg-white shadow-sm"
                        : "border-[#e0ddd4] bg-white hover:border-[#c3ccd3]"
                    }`}
                  >
                    <span
                      className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 ${
                        state.union === "no"
                          ? "border-[#0eb28d] bg-[#0eb28d] shadow-[inset_0_0_0_3px_#fff]"
                          : "border-[#c3ccd3] bg-white"
                      }`}
                    />
                    <span className="text-[14.5px] font-semibold text-[#17242f]">No — I was not in a union</span>
                  </div>

                  <div
                    onClick={() => setState({ ...state, union: "yes" })}
                    className={`flex items-start gap-3 p-3.5 px-4 rounded-[14px] border-[1.5px] cursor-pointer transition-all ${
                      state.union === "yes"
                        ? "border-[#062c55] bg-white shadow-sm"
                        : "border-[#e0ddd4] bg-white hover:border-[#c3ccd3]"
                    }`}
                  >
                    <span
                      className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        state.union === "yes"
                          ? "border-[#0eb28d] bg-[#0eb28d] shadow-[inset_0_0_0_3px_#fff]"
                          : "border-[#c3ccd3] bg-white"
                      }`}
                    />
                    <div>
                      <div className="text-[14.5px] font-semibold text-[#17242f]">Yes — I was a union member</div>
                      <div className="text-xs text-[#5a6b78] mt-0.5">
                        Your collective agreement governs your severance, not the usual rules.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Row: Only Next button */}
                <div className="mt-8 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={goToQ2}
                    className="inline-flex items-center gap-1.5 bg-[#0eb28d] hover:bg-[#0c8f72] text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-[0_4px_14px_rgba(14,178,141,0.35)] transition-all cursor-pointer"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                SCREEN 2 (QUESTION 2 OF 4): WHAT KIND OF ROLE WAS IT?
            ════════════════════════════════════════════════════════════════ */}
            {currentStep === "q2" && (
              <div className="relative bg-white border border-[#e7e4dd] rounded-[18px] p-6 sm:p-8 shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] animate-in fade-in duration-300">
                {/* Top Row: 100% Free Badge on left, 4 Dots on right */}
                <div className="flex items-center justify-between gap-3 mb-5">
                  <div className="flex items-center gap-2.5 p-2.5 px-3.5 rounded-xl bg-gradient-to-r from-[#e6f8f1] to-[#f3faf6] border border-[#b9e6d4] shadow-[0_4px_16px_-12px_rgba(14,178,141,0.5)]">
                    <span className="w-5 h-5 rounded-full bg-[#0eb28d] text-white font-extrabold flex items-center justify-center shrink-0 text-[11px]">
                      ✓
                    </span>
                    <span className="text-xs sm:text-[13px] text-[#1f3b32]">
                      <b className="font-bold text-[#062c55]">100% free to get your read.</b> No card. No signup. No sales call.
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" aria-label="Question 2 of 4">
                    <i className="inline-block w-2 h-2 rounded-full bg-[#0eb28d]" />
                    <i className="inline-block w-2 h-2 rounded-full bg-[#0eb28d]" />
                    <i className="inline-block w-2 h-2 rounded-full bg-[#dcd8cf]" />
                    <i className="inline-block w-2 h-2 rounded-full bg-[#dcd8cf]" />
                  </div>
                </div>

                {/* Heading */}
                <h1 className="font-serif font-normal text-[23px] sm:text-[27px] text-[#062c55] leading-[1.2] tracking-tight">
                  First — a few things that decide how this works.
                </h1>

                {explainOn && (
                  <div className="md:hidden my-3 p-3.5 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                    <b>How severance works in Ontario, in one breath:</b> there are three layers.{" "}
                    <b>1 · Notice pay</b> — about a week per year, max 8 weeks; everyone gets this.{" "}
                    <b>2 · Severance pay</b> — an extra week per year (max 26) only if you were there 5+ years and the employer&apos;s payroll is over $2.5M.{" "}
                    <b>3 · Common law</b> — what courts award when your contract doesn&apos;t validly cap you: months not weeks, up to about 24. Most people are only offered layer 1.{" "}
                    <a
                      href="https://www.ontario.ca/document/your-guide-employment-standards-act-0/termination-employment"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0c8f72] font-bold underline"
                    >
                      Official source →
                    </a>
                  </div>
                )}

                <p className="text-[13.5px] sm:text-sm text-[#5a6b78] mt-2 mb-5">
                  These change which rules apply to you. They take ten seconds and make everything after more accurate.
                </p>

                {/* Question title */}
                <div className="font-bold text-[15px] sm:text-[16px] text-[#062c55] mb-2.5">
                  What kind of role was it?
                </div>

                {/* Mobile contextual explanation box */}
                {explainOn && (
                  <div className="md:hidden mb-3.5 p-3 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                    <b className="block text-[#0c8f72] font-bold uppercase text-[11px] mb-1">Your job type changes what&apos;s owed</b>
                    A fixed-term contract can be owed the rest of the term; a commission or contractor role may not be an &quot;employee&quot; at all. Both change the answer.
                  </div>
                )}

                {/* Big Pills */}
                <div className="space-y-2.5">
                  {[
                    { key: "regular", title: "Regular employee", desc: "Salaried or hourly, ongoing." },
                    { key: "contract", title: "Fixed-term contract", desc: "A set end date or project term." },
                    { key: "commission", title: "Mostly commission / self-employed", desc: "Sales or contractor pay." },
                  ].map((item) => (
                    <div
                      key={item.key}
                      onClick={() => setState({ ...state, emptype: item.key })}
                      className={`flex items-start gap-3 p-3.5 px-4 rounded-[14px] border-[1.5px] cursor-pointer transition-all ${
                        state.emptype === item.key
                          ? "border-[#062c55] bg-white shadow-sm"
                          : "border-[#e0ddd4] bg-white hover:border-[#c3ccd3]"
                      }`}
                    >
                      <span
                        className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                          state.emptype === item.key
                            ? "border-[#0eb28d] bg-[#0eb28d] shadow-[inset_0_0_0_3px_#fff]"
                            : "border-[#c3ccd3] bg-white"
                        }`}
                      />
                      <div>
                        <div className="text-[14.5px] font-semibold text-[#17242f]">{item.title}</div>
                        <div className="text-xs text-[#5a6b78] mt-0.5">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom Action Row: Back and Next buttons */}
                <div className="mt-8 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={goToQ1}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-[#e7e4dd] bg-white text-xs font-bold text-[#5a6b78] hover:text-[#062c55] hover:border-[#c3ccd3] transition-colors cursor-pointer"
                  >
                    ‹ Back
                  </button>
                  <button
                    type="button"
                    onClick={goToQ3}
                    className="inline-flex items-center gap-1.5 bg-[#0eb28d] hover:bg-[#0c8f72] text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-[0_4px_14px_rgba(14,178,141,0.35)] transition-all cursor-pointer"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                SCREEN 3 (QUESTION 3 OF 4): HAVE YOU SIGNED ANYTHING YET?
            ════════════════════════════════════════════════════════════════ */}
            {currentStep === "q3" && (
              <div className="relative bg-white border border-[#e7e4dd] rounded-[18px] p-6 sm:p-8 shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] animate-in fade-in duration-300">
                {/* Top Row: 100% Free Badge on left, 4 Dots on right */}
                <div className="flex items-center justify-between gap-3 mb-5">
                  <div className="flex items-center gap-2.5 p-2.5 px-3.5 rounded-xl bg-gradient-to-r from-[#e6f8f1] to-[#f3faf6] border border-[#b9e6d4] shadow-[0_4px_16px_-12px_rgba(14,178,141,0.5)]">
                    <span className="w-5 h-5 rounded-full bg-[#0eb28d] text-white font-extrabold flex items-center justify-center shrink-0 text-[11px]">
                      ✓
                    </span>
                    <span className="text-xs sm:text-[13px] text-[#1f3b32]">
                      <b className="font-bold text-[#062c55]">100% free to get your read.</b> No card. No signup. No sales call.
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" aria-label="Question 3 of 4">
                    <i className="inline-block w-2 h-2 rounded-full bg-[#0eb28d]" />
                    <i className="inline-block w-2 h-2 rounded-full bg-[#0eb28d]" />
                    <i className="inline-block w-2 h-2 rounded-full bg-[#0eb28d]" />
                    <i className="inline-block w-2 h-2 rounded-full bg-[#dcd8cf]" />
                  </div>
                </div>

                {/* Heading */}
                <h1 className="font-serif font-normal text-[23px] sm:text-[27px] text-[#062c55] leading-[1.2] tracking-tight">
                  First — a few things that decide how this works.
                </h1>

                {explainOn && (
                  <div className="md:hidden my-3 p-3.5 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                    <b>How severance works in Ontario, in one breath:</b> there are three layers.{" "}
                    <b>1 · Notice pay</b> — about a week per year, max 8 weeks; everyone gets this.{" "}
                    <b>2 · Severance pay</b> — an extra week per year (max 26) only if you were there 5+ years and the employer&apos;s payroll is over $2.5M.{" "}
                    <b>3 · Common law</b> — what courts award when your contract doesn&apos;t validly cap you: months not weeks, up to about 24. Most people are only offered layer 1.{" "}
                    <a
                      href="https://www.ontario.ca/document/your-guide-employment-standards-act-0/termination-employment"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0c8f72] font-bold underline"
                    >
                      Official source →
                    </a>
                  </div>
                )}

                <p className="text-[13.5px] sm:text-sm text-[#5a6b78] mt-2 mb-5">
                  These change which rules apply to you. They take ten seconds and make everything after more accurate.
                </p>

                {/* Question title */}
                <div className="font-bold text-[15px] sm:text-[16px] text-[#062c55] mb-2.5">
                  Have you signed anything yet?
                </div>

                {/* Mobile contextual explanation box */}
                {explainOn && (
                  <div className="md:hidden mb-3.5 p-3 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                    <b className="block text-[#0c8f72] font-bold uppercase text-[11px] mb-1">A signature can close some doors</b>
                    A signed release is usually final, but some rights survive it. Knowing this now means we don&apos;t show you options you no longer have.
                  </div>
                )}

                {/* Big Pills */}
                <div className="space-y-2.5">
                  <div
                    onClick={() => setState({ ...state, signed: "no" })}
                    className={`flex items-center gap-3 p-3.5 px-4 rounded-[14px] border-[1.5px] cursor-pointer transition-all ${
                      state.signed === "no"
                        ? "border-[#062c55] bg-white shadow-sm"
                        : "border-[#e0ddd4] bg-white hover:border-[#c3ccd3]"
                    }`}
                  >
                    <span
                      className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 ${
                        state.signed === "no"
                          ? "border-[#0eb28d] bg-[#0eb28d] shadow-[inset_0_0_0_3px_#fff]"
                          : "border-[#c3ccd3] bg-white"
                      }`}
                    />
                    <span className="text-[14.5px] font-semibold text-[#17242f]">No, not yet</span>
                  </div>

                  <div
                    onClick={() => setState({ ...state, signed: "yes" })}
                    className={`flex items-start gap-3 p-3.5 px-4 rounded-[14px] border-[1.5px] cursor-pointer transition-all ${
                      state.signed === "yes"
                        ? "border-[#062c55] bg-white shadow-sm"
                        : "border-[#e0ddd4] bg-white hover:border-[#c3ccd3]"
                    }`}
                  >
                    <span
                      className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        state.signed === "yes"
                          ? "border-[#0eb28d] bg-[#0eb28d] shadow-[inset_0_0_0_3px_#fff]"
                          : "border-[#c3ccd3] bg-white"
                      }`}
                    />
                    <div>
                      <div className="text-[14.5px] font-semibold text-[#17242f]">Yes — I already signed</div>
                      <div className="text-xs text-[#5a6b78] mt-0.5">
                        Some rights survive a signature; a lawyer can tell you which.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Row: Back and Next buttons */}
                <div className="mt-8 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={goToQ2}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-[#e7e4dd] bg-white text-xs font-bold text-[#5a6b78] hover:text-[#062c55] hover:border-[#c3ccd3] transition-colors cursor-pointer"
                  >
                    ‹ Back
                  </button>
                  <button
                    type="button"
                    onClick={goToQ4}
                    className="inline-flex items-center gap-1.5 bg-[#0eb28d] hover:bg-[#0c8f72] text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-[0_4px_14px_rgba(14,178,141,0.35)] transition-all cursor-pointer"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                SCREEN 4 (QUESTION 4 OF 4): WAS EMPLOYER FEDERALLY REGULATED?
            ════════════════════════════════════════════════════════════════ */}
            {currentStep === "q4" && (
              <div className="relative bg-white border border-[#e7e4dd] rounded-[18px] p-6 sm:p-8 shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] animate-in fade-in duration-300">
                {/* Top Row: 100% Free Badge on left, 4 Dots on right */}
                <div className="flex items-center justify-between gap-3 mb-5">
                  <div className="flex items-center gap-2.5 p-2.5 px-3.5 rounded-xl bg-gradient-to-r from-[#e6f8f1] to-[#f3faf6] border border-[#b9e6d4] shadow-[0_4px_16px_-12px_rgba(14,178,141,0.5)]">
                    <span className="w-5 h-5 rounded-full bg-[#0eb28d] text-white font-extrabold flex items-center justify-center shrink-0 text-[11px]">
                      ✓
                    </span>
                    <span className="text-xs sm:text-[13px] text-[#1f3b32]">
                      <b className="font-bold text-[#062c55]">100% free to get your read.</b> No card. No signup. No sales call.
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" aria-label="Question 4 of 4">
                    <i className="inline-block w-2 h-2 rounded-full bg-[#0eb28d]" />
                    <i className="inline-block w-2 h-2 rounded-full bg-[#0eb28d]" />
                    <i className="inline-block w-2 h-2 rounded-full bg-[#0eb28d]" />
                    <i className="inline-block w-2 h-2 rounded-full bg-[#0eb28d]" />
                  </div>
                </div>

                {/* Heading */}
                <h1 className="font-serif font-normal text-[23px] sm:text-[27px] text-[#062c55] leading-[1.2] tracking-tight">
                  First — a few things that decide how this works.
                </h1>

                {explainOn && (
                  <div className="md:hidden my-3 p-3.5 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                    <b>How severance works in Ontario, in one breath:</b> there are three layers.{" "}
                    <b>1 · Notice pay</b> — about a week per year, max 8 weeks; everyone gets this.{" "}
                    <b>2 · Severance pay</b> — an extra week per year (max 26) only if you were there 5+ years and the employer&apos;s payroll is over $2.5M.{" "}
                    <b>3 · Common law</b> — what courts award when your contract doesn&apos;t validly cap you: months not weeks, up to about 24. Most people are only offered layer 1.{" "}
                    <a
                      href="https://www.ontario.ca/document/your-guide-employment-standards-act-0/termination-employment"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0c8f72] font-bold underline"
                    >
                      Official source →
                    </a>
                  </div>
                )}

                <p className="text-[13.5px] sm:text-sm text-[#5a6b78] mt-2 mb-5">
                  These change which rules apply to you. They take ten seconds and make everything after more accurate.
                </p>

                {/* Question title */}
                <div className="font-bold text-[15px] sm:text-[16px] text-[#062c55] mb-2.5">
                  Was your employer federally regulated?
                </div>

                {/* Mobile contextual explanation box */}
                {explainOn && (
                  <div className="md:hidden mb-3.5 p-3 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                    <b className="block text-[#0c8f72] font-bold uppercase text-[11px] mb-1">Federal jobs have their own law</b>
                    Banks, airlines, telecom and rail follow federal rules (Canada Labour Code), not provincial ones — different minimums.
                  </div>
                )}

                {/* Big Pills */}
                <div className="space-y-2.5">
                  <div
                    onClick={() => setState({ ...state, federal: "no" })}
                    className={`flex items-start gap-3 p-3.5 px-4 rounded-[14px] border-[1.5px] cursor-pointer transition-all ${
                      state.federal === "no"
                        ? "border-[#062c55] bg-white shadow-sm"
                        : "border-[#e0ddd4] bg-white hover:border-[#c3ccd3]"
                    }`}
                  >
                    <span
                      className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        state.federal === "no"
                          ? "border-[#0eb28d] bg-[#0eb28d] shadow-[inset_0_0_0_3px_#fff]"
                          : "border-[#c3ccd3] bg-white"
                      }`}
                    />
                    <div>
                      <div className="text-[14.5px] font-semibold text-[#17242f]">No / not sure</div>
                      <div className="text-xs text-[#5a6b78] mt-0.5">Most Ontario jobs are provincially regulated.</div>
                    </div>
                  </div>

                  <div
                    onClick={() => setState({ ...state, federal: "yes" })}
                    className={`flex items-start gap-3 p-3.5 px-4 rounded-[14px] border-[1.5px] cursor-pointer transition-all ${
                      state.federal === "yes"
                        ? "border-[#062c55] bg-white shadow-sm"
                        : "border-[#e0ddd4] bg-white hover:border-[#c3ccd3]"
                    }`}
                  >
                    <span
                      className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        state.federal === "yes"
                          ? "border-[#0eb28d] bg-[#0eb28d] shadow-[inset_0_0_0_3px_#fff]"
                          : "border-[#c3ccd3] bg-white"
                      }`}
                    />
                    <div>
                      <div className="text-[14.5px] font-semibold text-[#17242f]">Yes — a federally regulated employer</div>
                      <div className="text-xs text-[#5a6b78] mt-0.5">Different law applies (Canada Labour Code).</div>
                    </div>
                  </div>
                </div>

                {/* Disclaimer Checkbox Box */}
                <div
                  onClick={() => setState({ ...state, agreed: !state.agreed })}
                  className={`flex gap-3 items-start mt-5 p-3.5 px-4 rounded-[14px] border-[1.5px] cursor-pointer transition-all ${
                    state.agreed
                      ? "border-[#0eb28d] bg-[#f3faf6]"
                      : "border-[#cdd3d8] bg-[#fafcfb] hover:border-[#0eb28d]"
                  }`}
                >
                  <div
                    className={`w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 text-xs font-extrabold ${
                      state.agreed
                        ? "bg-[#0eb28d] border-[#0eb28d] text-white"
                        : "border-[#c3ccd3] text-transparent"
                    }`}
                  >
                    ✓
                  </div>
                  <div className="text-[12.5px] sm:text-[13px] text-[#17242f] leading-snug">
                    I understand this is <b>information to help me get oriented — not legal advice</b>. Any range shown is an estimate, not what I&apos;m owed. The full{" "}
                    <a
                      href="#legal"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[#0c8f72] font-bold underline"
                    >
                      Terms &amp; Disclaimer
                    </a>{" "}
                    apply if I buy a report or connect with a lawyer.
                  </div>
                </div>

                {/* Navigation and Confirmation Row */}
                <div className="mt-5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={goToQ3}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-[#e7e4dd] bg-white text-xs font-bold text-[#5a6b78] hover:text-[#062c55] hover:border-[#c3ccd3] transition-colors cursor-pointer"
                  >
                    ‹ Back
                  </button>
                  <span className="text-xs font-bold text-[#0c8f72]">
                    Ready — continue below ↓
                  </span>
                </div>

                {/* Full-Width Continue Button */}
                <button
                  type="button"
                  disabled={!state.agreed}
                  onClick={handleContinueFromQ4}
                  className={`w-full mt-3.5 py-3.5 px-6 rounded-xl font-bold text-sm sm:text-base transition-all ${
                    state.agreed
                      ? "bg-[#0eb28d] hover:bg-[#0c8f72] text-white shadow-[0_8px_20px_-8px_rgba(14,178,141,0.7)] cursor-pointer"
                      : "bg-[#dce3e0] text-[#8c9693] cursor-not-allowed shadow-none"
                  }`}
                >
                  Continue →
                </button>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                US SITUATION CARD (WHEN IN US MODE)
            ════════════════════════════════════════════════════════════════ */}
            {currentStep === "us-situation" && (
              <div className="bg-white border border-[#e7e4dd] rounded-[18px] p-6 sm:p-8 shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] animate-in fade-in duration-300">
                <div className="flex items-center gap-3 p-3 px-4 rounded-xl bg-gradient-to-r from-[#e6f8f1] to-[#f3faf6] border border-[#b9e6d4] shadow-[0_8px_24px_-16px_rgba(14,178,141,0.6)] mb-5">
                  <span className="w-7 h-7 rounded-full bg-[#0eb28d] text-white font-extrabold flex items-center justify-center shrink-0 shadow-[0_0_0_4px_rgba(14,178,141,0.18)] text-xs">
                    ✓
                  </span>
                  <span className="text-sm text-[#1f3b32]">
                    <b className="font-bold text-[#062c55]">100% free to get your results.</b> No card. No signup. No sales call.
                  </span>
                </div>

                <h1 className="font-serif font-medium text-[27px] sm:text-[29px] text-[#062c55] leading-[1.12] tracking-tight">
                  Make sense of your separation offer.
                </h1>
                <p className="text-sm sm:text-[15px] text-[#5a6b78] mt-2 mb-6">
                  US law doesn&apos;t set a severance amount — so there&apos;s no &quot;number you&apos;re owed&quot;. What the law <b>does</b> control is <b>how</b> they can ask you to sign: how long you get to think, whether you can take it back, and how much notice a big layoff needs.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#5a6b78] mb-1.5">
                      Which state did you physically work in?
                    </label>
                    <select
                      value={state.usState}
                      onChange={(e) => setState({ ...state, usState: e.target.value })}
                      className="w-full border border-[#cdd3d8] rounded-xl px-3.5 py-2.5 text-sm font-medium bg-white focus:outline-none focus:border-[#0eb28d]"
                    >
                      {US_STATES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#5a6b78] mb-1.5">Your age</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={state.age}
                        placeholder="52"
                        onChange={(e) => setState({ ...state, age: e.target.value })}
                        className="w-full border border-[#cdd3d8] rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:border-[#0eb28d]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#5a6b78] mb-1.5">Years on the job</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={state.years}
                        placeholder="9"
                        onChange={(e) => setState({ ...state, years: e.target.value })}
                        className="w-full border border-[#cdd3d8] rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:border-[#0eb28d]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5a6b78] mb-1.5">Pay per year ($, before tax)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={state.salary}
                      placeholder="128000"
                      onChange={(e) => setState({ ...state, salary: e.target.value })}
                      className="w-full border border-[#cdd3d8] rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:border-[#0eb28d]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5a6b78] mb-1.5">Anything on top of base pay?</label>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { k: "bonus", label: "Bonus / commission" },
                        { k: "stock", label: "Stock / RSUs / options" },
                        { k: "pto", label: "Unused PTO" },
                        { k: "benefits", label: "Health benefits" },
                      ].map((item) => (
                        <button
                          key={item.k}
                          type="button"
                          onClick={() =>
                            setState({
                              ...state,
                              pay: { ...state.pay, [item.k]: !state.pay[item.k] },
                            })
                          }
                          className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            state.pay[item.k]
                              ? "bg-[#062c55] text-white"
                              : "border border-[#e0ddd4] bg-white text-[#5a6b78] hover:border-[#c3ccd3]"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5a6b78] mb-1.5">Have you signed anything yet?</label>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { k: "no", label: "No, not yet" },
                        { k: "yes", label: "Yes, already signed" },
                      ].map((item) => (
                        <button
                          key={item.k}
                          type="button"
                          onClick={() => setState({ ...state, signed: item.k })}
                          className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            state.signed === item.k
                              ? "bg-[#062c55] text-white"
                              : "border border-[#e0ddd4] bg-white text-[#5a6b78] hover:border-[#c3ccd3]"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div
                    onClick={() => setState({ ...state, agreed: !state.agreed })}
                    className={`flex gap-3 items-start mt-5 p-3.5 px-4 rounded-[14px] border-[1.5px] cursor-pointer transition-all ${
                      state.agreed
                        ? "border-[#0eb28d] bg-[#f3faf6]"
                        : "border-[#cdd3d8] bg-[#fafcfb] hover:border-[#0eb28d]"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 text-xs font-extrabold ${
                        state.agreed
                          ? "bg-[#0eb28d] border-[#0eb28d] text-white"
                          : "border-[#c3ccd3] text-transparent"
                      }`}
                    >
                      ✓
                    </div>
                    <div className="text-[13px] text-[#17242f] leading-snug">
                      I understand this is <b>information to help me get oriented — not legal advice</b>, and not an assessment of my case.
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!state.agreed}
                    onClick={() => {
                      setCurrentStep("step-basics");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={`w-full mt-4 py-3.5 px-6 rounded-xl font-bold text-base transition-all shadow-[0_12px_22px_-12px_rgba(12,143,114,0.6)] ${
                      state.agreed
                        ? "bg-gradient-to-r from-[#0eb28d] to-[#0c8f72] text-white cursor-pointer hover:shadow-lg hover:-translate-y-px"
                        : "bg-[#e2ddd4] text-[#8e897e] cursor-not-allowed shadow-none"
                    }`}
                  >
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                UNION SCREEN-OUT BRANCH (CANADA)
            ════════════════════════════════════════════════════════════════ */}
            {currentStep === "union" && (
              <div className="bg-white border border-[#e7e4dd] rounded-[18px] p-7 sm:p-9 shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] text-center animate-in fade-in duration-300">
                <h1 className="font-serif font-medium text-2xl text-[#062c55] mt-2 mb-3">
                  Your union handles this one.
                </h1>
                <p className="text-sm text-[#5a6b78] max-w-[500px] mx-auto leading-relaxed">
                  Because you were a union member, your severance is set by your <b>collective agreement</b>, and disputes go through the <b>grievance process</b> — not the individual severance rules our tool is built for. Talking to your union rep is your fastest, strongest path here.
                </p>

                <div className="mt-5 border border-[#c7e6d6] rounded-xl overflow-hidden text-left max-w-[480px] mx-auto bg-[#eef8f3] text-xs divide-y divide-[#c7e6d6]">
                  <div className="p-3 flex justify-between gap-4">
                    <span className="font-bold text-[#5a6b78]">Your best first step</span>
                    <span className="font-semibold text-[#062c55]">Contact your union steward or local office</span>
                  </div>
                  <div className="p-3 flex justify-between gap-4">
                    <span className="font-bold text-[#5a6b78]">Ask them about</span>
                    <span className="font-semibold text-[#062c55]">Notice, severance &amp; grievance deadlines</span>
                  </div>
                </div>

                <p className="text-xs text-[#5a6b78] mt-4 italic">
                  If you&apos;re not sure whether your job was truly unionized, you can continue anyway — but a number from us won&apos;t reflect your collective agreement.
                </p>

                <div className="mt-6 flex flex-col gap-2.5 max-w-[360px] mx-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setState({ ...state, union: "no" });
                      setCurrentStep("step-basics");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="w-full py-3 px-5 rounded-xl border border-[#d8d3c8] bg-white font-bold text-sm text-[#062c55] hover:border-[#0eb28d] transition-colors cursor-pointer"
                  >
                    Continue anyway →
                  </button>
                  <button
                    type="button"
                    onClick={goToQ1}
                    className="text-xs font-semibold text-[#5a6b78] hover:text-[#062c55] py-1 cursor-pointer"
                  >
                    ‹ Oops, I&apos;m not in a union — change my answer
                  </button>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STEP 2: THE BASICS
            ════════════════════════════════════════════════════════════════ */}
            {currentStep === "step-basics" && (
              <div className="bg-white border border-[#e7e4dd] rounded-[18px] p-6 sm:p-8 shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] animate-in fade-in duration-300">
                <span className="inline-block text-xs font-bold text-[#062c55] bg-white border border-[#e7e4dd] px-3 py-1 rounded-full mb-3">
                  {isCanada ? "The basics" : "The layoff"}
                </span>
                <h1 className="font-serif font-medium text-2xl sm:text-[28px] text-[#062c55] leading-tight">
                  {isCanada ? "Now, the basics about you." : "How did the layoff happen?"}
                </h1>
                <p className="text-sm text-[#5a6b78] mt-2 mb-6">
                  {isCanada
                    ? "Four facts decide most of the number: where you worked, how old you are, how long you were there, and your pay."
                    : "This tells us whether advance-notice rules (the federal WARN Act or mini-WARN) applied to your layoff."}
                </p>

                <div className="space-y-4">
                  {isCanada ? (
                    <div>
                      <label className="block text-xs font-bold text-[#5a6b78] mb-1.5">Where were you employed?</label>
                      <select
                        value={state.province}
                        onChange={(e) => setState({ ...state, province: e.target.value })}
                        className="w-full border border-[#cdd3d8] rounded-xl px-3.5 py-2.5 text-sm font-medium bg-white focus:outline-none focus:border-[#0eb28d]"
                      >
                        <option value="ON">Ontario</option>
                        <option value="BC">British Columbia</option>
                        <option value="AB">Alberta</option>
                        <option value="NS">Nova Scotia</option>
                        <option value="OTHER">Another province / U.S. state</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-[#5a6b78] mb-1.5">Was it part of a group layoff?</label>
                      <div className="flex gap-2 flex-wrap">
                        {[
                          { k: "yes", label: "Yes — several people let go" },
                          { k: "no", label: "No — just me" },
                          { k: "unsure", label: "Not sure" },
                        ].map((p) => (
                          <button
                            key={p.k}
                            type="button"
                            onClick={() => setState({ ...state, groupLayoff: p.k })}
                            className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                              state.groupLayoff === p.k
                                ? "bg-[#062c55] text-white"
                                : "border border-[#e0ddd4] bg-white text-[#5a6b78] hover:border-[#c3ccd3]"
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#5a6b78] mb-1.5">Your age</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={state.age}
                        placeholder="52"
                        onChange={(e) => setState({ ...state, age: e.target.value })}
                        className="w-full border border-[#cdd3d8] rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:border-[#0eb28d]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#5a6b78] mb-1.5">Years on the job</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={state.years}
                        placeholder="14"
                        onChange={(e) => setState({ ...state, years: e.target.value })}
                        className="w-full border border-[#cdd3d8] rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:border-[#0eb28d]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5a6b78] mb-1.5">Pay per year ($, before tax)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={state.salary}
                      placeholder="110000"
                      onChange={(e) => setState({ ...state, salary: e.target.value })}
                      className="w-full border border-[#cdd3d8] rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:border-[#0eb28d]"
                    />
                  </div>

                  {isCanada && (
                    <div>
                      <label className="block text-xs font-bold text-[#5a6b78] mb-1.5">
                        Is employer&apos;s global payroll over $2.5M/yr?
                      </label>
                      <div className="flex gap-2 flex-wrap">
                        {[
                          { k: "yes", label: "Yes — big employer (50+)" },
                          { k: "no", label: "No — small employer" },
                          { k: "unsure", label: "Not sure" },
                        ].map((p) => (
                          <button
                            key={p.k}
                            type="button"
                            onClick={() => setState({ ...state, payroll: p.k })}
                            className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                              state.payroll === p.k
                                ? "bg-[#062c55] text-white"
                                : "border border-[#e0ddd4] bg-white text-[#5a6b78] hover:border-[#c3ccd3]"
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-[#5a6b78] mb-1.5">Your role / occupation</label>
                    <select
                      value={state.roleFactor}
                      onChange={(e) => setState({ ...state, roleFactor: parseFloat(e.target.value) })}
                      className="w-full border border-[#cdd3d8] rounded-xl px-3.5 py-2.5 text-sm font-medium bg-white focus:outline-none focus:border-[#0eb28d]"
                    >
                      {OCCUPATIONS.map((occ) => (
                        <option key={occ.label} value={occ.value}>
                          {occ.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-7 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      if (isCanada) goToQ4();
                      else setCurrentStep("us-situation");
                    }}
                    className="text-xs font-bold text-[#5a6b78] hover:text-[#062c55] cursor-pointer"
                  >
                    ‹ Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep("step-money");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="bg-gradient-to-r from-[#0eb28d] to-[#0c8f72] text-white font-extrabold text-sm px-6 py-3 rounded-full shadow-[0_10px_24px_-12px_rgba(12,143,114,0.7)] hover:-translate-y-0.5 transition-all cursor-pointer"
                  >
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STEP 3: THE MONEY PICTURE
            ════════════════════════════════════════════════════════════════ */}
            {currentStep === "step-money" && (
              <div className="bg-white border border-[#e7e4dd] rounded-[18px] p-6 sm:p-8 shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] animate-in fade-in duration-300">
                <span className="inline-block text-xs font-bold text-[#062c55] bg-white border border-[#e7e4dd] px-3 py-1 rounded-full mb-3">
                  The money picture
                </span>
                <h1 className="font-serif font-medium text-2xl text-[#062c55] leading-tight">
                  What else were you paid?
                </h1>
                <p className="text-sm text-[#5a6b78] mt-2 mb-6">
                  Bonuses, stock and benefits are often part of what you&apos;re owed — and they change the size of a case.
                </p>

                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-[#5a6b78] mb-2">Did your pay include any of these?</label>
                    <div className="flex gap-2 flex-wrap">
                      {["bonus", "stock", "benefits", "commission"].map((payKey) => (
                        <button
                          key={payKey}
                          type="button"
                          onClick={() =>
                            setState({
                              ...state,
                              pay: { ...state.pay, [payKey]: !state.pay[payKey] },
                            })
                          }
                          className={`px-4 py-2 rounded-full text-xs font-bold capitalize transition-all cursor-pointer ${
                            state.pay[payKey]
                              ? "bg-[#062c55] text-white"
                              : "border border-[#e0ddd4] bg-white text-[#5a6b78] hover:border-[#c3ccd3]"
                          }`}
                        >
                          {payKey === "stock" ? "Stock / RSUs" : payKey}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5a6b78] mb-1.5">
                      What are they offering you? ($ total, optional)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={state.offer || ""}
                      placeholder="24000"
                      onChange={(e) => setState({ ...state, offer: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-[#cdd3d8] rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:border-[#0eb28d]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5a6b78] mb-2">Have you already found a new job?</label>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { k: "no", label: "Not yet" },
                        { k: "soon", label: "Looking / interviews" },
                        { k: "yes", label: "Yes, already started" },
                      ].map((item) => (
                        <button
                          key={item.k}
                          type="button"
                          onClick={() => setState({ ...state, reemployed: item.k })}
                          className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            state.reemployed === item.k
                              ? "bg-[#062c55] text-white"
                              : "border border-[#e0ddd4] bg-white text-[#5a6b78] hover:border-[#c3ccd3]"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-7 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep("step-basics");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="text-xs font-bold text-[#5a6b78] hover:text-[#062c55] cursor-pointer"
                  >
                    ‹ Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep("step-clause");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="bg-gradient-to-r from-[#0eb28d] to-[#0c8f72] text-white font-extrabold text-sm px-6 py-3 rounded-full shadow-[0_10px_24px_-12px_rgba(12,143,114,0.7)] hover:-translate-y-0.5 transition-all cursor-pointer"
                  >
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STEP 4: KEY QUESTIONS
            ════════════════════════════════════════════════════════════════ */}
            {currentStep === "step-clause" && (
              <div className="bg-white border border-[#e7e4dd] rounded-[18px] p-6 sm:p-8 shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] animate-in fade-in duration-300">
                <span className="inline-block text-xs font-bold text-[#062c55] bg-white border border-[#e7e4dd] px-3 py-1 rounded-full mb-3">
                  The most important question
                </span>
                <h1 className="font-serif font-medium text-2xl text-[#062c55] leading-tight">
                  Does your offer limit you to the &quot;minimum&quot;?
                </h1>
                <p className="text-sm text-[#5a6b78] mt-2 mb-6">
                  Most severance letters try to cap you at the legal minimum. Whether that limit actually holds up is the single biggest factor.
                </p>

                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-[#5a6b78] mb-2">
                      Does your letter or contract say severance is limited to the legal minimum?
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { k: "yes", label: "Yes, it says that" },
                        { k: "no", label: "No / it doesn't" },
                        { k: "unsure", label: "Not sure" },
                      ].map((item) => (
                        <button
                          key={item.k}
                          type="button"
                          onClick={() => setState({ ...state, clause: item.k })}
                          className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            state.clause === item.k
                              ? "bg-[#062c55] text-white"
                              : "border border-[#e0ddd4] bg-white text-[#5a6b78] hover:border-[#c3ccd3]"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5a6b78] mb-2">Did you sign an employment contract?</label>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { k: "current", label: "Yes — same role since" },
                        { k: "old", label: "Yes — but promoted / role changed" },
                        { k: "none", label: "No written contract" },
                        { k: "unsure", label: "Not sure" },
                      ].map((item) => (
                        <button
                          key={item.k}
                          type="button"
                          onClick={() => setState({ ...state, contract: item.k })}
                          className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            state.contract === item.k
                              ? "bg-[#062c55] text-white"
                              : "border border-[#e0ddd4] bg-white text-[#5a6b78] hover:border-[#c3ccd3]"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-7 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep("step-money");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="text-xs font-bold text-[#5a6b78] hover:text-[#062c55] cursor-pointer"
                  >
                    ‹ Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep("step-details");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="bg-gradient-to-r from-[#0eb28d] to-[#0c8f72] text-white font-extrabold text-sm px-6 py-3 rounded-full shadow-[0_10px_24px_-12px_rgba(12,143,114,0.7)] hover:-translate-y-0.5 transition-all cursor-pointer"
                  >
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STEP 5: DETAILS
            ════════════════════════════════════════════════════════════════ */}
            {currentStep === "step-details" && (
              <div className="bg-white border border-[#e7e4dd] rounded-[18px] p-6 sm:p-8 shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] animate-in fade-in duration-300">
                <span className="inline-block text-xs font-bold text-[#062c55] bg-white border border-[#e7e4dd] px-3 py-1 rounded-full mb-3">
                  Almost done
                </span>
                <h1 className="font-serif font-medium text-2xl text-[#062c55] leading-tight">
                  A couple more quick taps
                </h1>

                <div className="space-y-5 mt-5">
                  <div>
                    <label className="block text-xs font-bold text-[#5a6b78] mb-2">How did your job end?</label>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { k: "layoff", label: "Laid off — no cause" },
                        { k: "cause", label: "For cause" },
                        { k: "constructive", label: "Forced out" },
                        { k: "templayoff", label: "Temporary layoff" },
                        { k: "mass", label: "Part of a big layoff (50+)" },
                      ].map((item) => (
                        <button
                          key={item.k}
                          type="button"
                          onClick={() => setState({ ...state, reason: item.k })}
                          className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            state.reason === item.k
                              ? "bg-[#062c55] text-white"
                              : "border border-[#e0ddd4] bg-white text-[#5a6b78] hover:border-[#c3ccd3]"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5a6b78] mb-2">
                      How hard would it be to find a similar job near you?
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { k: "easy", label: "Plenty of similar jobs" },
                        { k: "mid", label: "Some, but competitive" },
                        { k: "hard", label: "Very few — specialised" },
                      ].map((item) => (
                        <button
                          key={item.k}
                          type="button"
                          onClick={() => setState({ ...state, market: item.k })}
                          className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            state.market === item.k
                              ? "bg-[#062c55] text-white"
                              : "border border-[#e0ddd4] bg-white text-[#5a6b78] hover:border-[#c3ccd3]"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5a6b78] mb-2">Anything else you&apos;d flag?</label>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { k: "none", label: "Nothing unusual" },
                        { k: "mistreat", label: "Mistreatment / discrimination" },
                        { k: "unpaid", label: "Unpaid bonus / wages" },
                      ].map((item) => (
                        <button
                          key={item.k}
                          type="button"
                          onClick={() => setState({ ...state, redflag: item.k })}
                          className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            state.redflag === item.k
                              ? "bg-[#062c55] text-white"
                              : "border border-[#e0ddd4] bg-white text-[#5a6b78] hover:border-[#c3ccd3]"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-7 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep("step-clause");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="text-xs font-bold text-[#5a6b78] hover:text-[#062c55] cursor-pointer"
                  >
                    ‹ Back
                  </button>
                  <button
                    type="button"
                    onClick={handleStartAnalyze}
                    className="bg-gradient-to-r from-[#0eb28d] to-[#0c8f72] text-white font-extrabold text-sm px-7 py-3.5 rounded-full shadow-[0_10px_24px_-12px_rgba(12,143,114,0.7)] hover:-translate-y-0.5 transition-all cursor-pointer"
                  >
                    See my results →
                  </button>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STEP 5: ANALYZING SPINNER
            ════════════════════════════════════════════════════════════════ */}
            {currentStep === "step-analyzing" && (
              <div className="bg-white border border-[#e7e4dd] rounded-[18px] p-12 text-center shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] animate-in fade-in duration-300">
                <div className="w-12 h-12 border-4 border-[#e6e2d8] border-t-[#0eb28d] rounded-full mx-auto mb-5 animate-spin" />
                <h1 className="font-serif font-medium text-2xl text-[#062c55] mb-2">Reading your situation…</h1>
                <p className="text-sm text-[#5a6b78]">Weighing the same things a court and a lawyer weigh.</p>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STEP 6: RESULTS & VERDICT
            ════════════════════════════════════════════════════════════════ */}
            {currentStep === "step-results" && (
              <div className="bg-white border border-[#e7e4dd] rounded-[18px] p-6 sm:p-8 shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] animate-in fade-in duration-300">
                {/* Verdict Badge & Title */}
                <div className="text-center p-6 bg-gradient-to-b from-[#fbfdfc] to-[#eef8f3] border border-[#c7e6d6] rounded-2xl mb-6">
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#0c8f72]">
                    Often worth a closer look
                  </span>
                  <h2 className="font-serif font-bold text-2xl sm:text-3xl text-[#062c55] my-2">
                    {isCanada
                      ? "This is the kind of offer people often review with a lawyer."
                      : "A few things here are worth understanding before you sign."}
                  </h2>
                  <p className="text-sm text-[#17242f] max-w-[500px] mx-auto leading-relaxed">
                    {isCanada
                      ? "Offers with the features you described are the ones people most often take to an employment lawyer for a closer look. That's not an opinion on your case — only a lawyer can tell you what yours means."
                      : "Some of what you told us is worth understanding before you decide. A quick attorney conversation is a good way to verify your severance rights."}
                  </p>

                  {/* Reasons list */}
                  <div className="mt-4 text-left max-w-[420px] mx-auto space-y-1.5 text-xs text-[#17242f]">
                    <div className="flex gap-2 items-center">
                      <span className="text-[#0c8f72] font-bold">✓</span>
                      <span>Solid income — {money(parseFloat(state.salary))}/yr</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className="text-[#0c8f72] font-bold">✓</span>
                      <span>{state.years} years of service</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className="text-[#0c8f72] font-bold">✓</span>
                      <span>Senior role — longer notice</span>
                    </div>
                  </div>
                </div>

                {/* Estimate Box (Canada) */}
                {isCanada && estResult && estResult.statutory && (
                  <div className="border border-[#c7e6d6] rounded-2xl p-6 text-center bg-white shadow-sm mb-6">
                    <span className="inline-block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8a6400] bg-[#fbf3df] border border-[#eeddb0] px-2.5 py-1 rounded-full">
                      Estimate — not an assessment of your situation
                    </span>
                    <div className="text-[11px] font-extrabold uppercase tracking-widest text-[#5a6b78] mt-3">
                      Estimated range
                    </div>
                    <div className="font-serif font-bold text-3xl sm:text-4xl text-[#0c8f72] my-1.5">
                      {money(estResult.statutory.amount)}
                      {estResult.commonLaw && estResult.commonLaw.highAmount > estResult.statutory.amount
                        ? ` – ${money(estResult.commonLaw.highAmount)}`
                        : ""}
                    </div>
                    <p className="text-xs sm:text-sm text-[#17242f] max-w-[480px] mx-auto">
                      From the legal minimum you can verify yourself, up to what court-awarded &quot;reasonable notice&quot; may reach for a profile like yours.
                    </p>

                    {/* 3 Layers Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4 text-left">
                      <div className="border border-[#e7e4dd] rounded-xl p-3 bg-[#fafcfb] text-xs">
                        <b className="block text-[#062c55] font-bold mb-1">1 · Notice pay</b>
                        <span className="text-[#5a6b78]">{estResult.statutory.terminationWeeks} wks · legal minimum</span>
                      </div>
                      <div className="border border-[#e7e4dd] rounded-xl p-3 bg-[#fafcfb] text-xs">
                        <b className="block text-[#062c55] font-bold mb-1">2 · Severance pay</b>
                        <span className="text-[#5a6b78]">
                          {estResult.statutory.severanceWeeks ? `${estResult.statutory.severanceWeeks} wks` : "Depends on payroll"}
                        </span>
                      </div>
                      <div className="border border-[#e7e4dd] rounded-xl p-3 bg-[#fafcfb] text-xs">
                        <b className="block text-[#062c55] font-bold mb-1">3 · What courts award</b>
                        <span className="text-[#5a6b78]">
                          {estResult.commonLaw ? `${estResult.commonLaw.lowMonths}–${estResult.commonLaw.highMonths} months` : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Free Check Done Pill */}
                <div className="text-center mb-6">
                  <span className="inline-block bg-[#e6f5ef] text-[#0c7a60] font-extrabold text-xs px-3.5 py-1.5 rounded-md">
                    Your free check is done · no card, no signup, nothing owed
                  </span>
                </div>

                {/* Option Action Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border border-[#e7e4dd] rounded-2xl p-5 bg-white flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-extrabold uppercase text-[#5a6b78]">Do it yourself</span>
                      <h4 className="font-serif font-bold text-lg text-[#062c55] mt-1 mb-2">Get your Severance Report</h4>
                      <div className="font-serif text-2xl font-bold text-[#062c55] mb-2">$59</div>
                      <p className="text-xs text-[#5a6b78] leading-relaxed">
                        Your offer organized, your dates, your questions — a 13-page report to take into any conversation.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => alert("Report unlock flow")}
                      className="mt-4 w-full py-3 rounded-xl bg-[#062c55] text-white text-xs font-bold hover:bg-[#041D38] transition-colors cursor-pointer"
                    >
                      Get my report →
                    </button>
                  </div>

                  <div className="border-2 border-[#0eb28d] rounded-2xl p-5 bg-gradient-to-b from-[#fbfdfc] to-[#eef8f3] flex flex-col justify-between relative shadow-md">
                    <div>
                      <span className="text-[11px] font-extrabold uppercase text-[#0c8f72]">Get help</span>
                      <h4 className="font-serif font-bold text-lg text-[#062c55] mt-1 mb-2">
                        {isCanada ? "Talk to a lawyer" : "Talk to an attorney"}
                      </h4>
                      <div className="font-serif text-2xl font-bold text-[#062c55] mb-2">Free</div>
                      <p className="text-xs text-[#5a6b78] leading-relaxed">
                        Your best shot at the full number — and it&apos;s free for us to connect you.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => alert(isCanada ? "Connecting with licensed employment lawyer..." : "Connecting with licensed employment attorney...")}
                      className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-[#0eb28d] to-[#0c8f72] text-white text-xs font-extrabold shadow-md hover:shadow-lg transition-all cursor-pointer"
                    >
                      {isCanada ? "Ask a lawyer to contact me — free" : "Ask an attorney to contact me — free"}
                    </button>
                  </div>
                </div>

                <div className="mt-8 text-center">
                  <button
                    type="button"
                    onClick={goToQ1}
                    className="text-xs font-bold text-[#5a6b78] hover:text-[#062c55] cursor-pointer"
                  >
                    ← Start over
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: DESKTOP SIDEBAR ── */}
          <aside className="hidden lg:block w-full sticky top-20">
            {/* Dynamic Why Card */}
            {explainOn && whyCopy.title && (
              <div className="mb-3.5 p-3.5 rounded-r-xl border-l-[3px] border-[#0eb28d] bg-[#f3faf6] border border-[#cfe8dd] transition-all">
                <b className="block text-[11px] font-extrabold tracking-wider uppercase text-[#0c8f72] mb-1">
                  {whyCopy.title}
                </b>
                <span className="text-xs text-[#2b3a45] leading-relaxed">{whyCopy.text}</span>
              </div>
            )}

            {/* FairExit Summary Card */}
            <div className="bg-white border border-[#e7e4dd] rounded-2xl p-5 shadow-[0_4px_20px_0_rgba(6,44,85,0.06)]">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#5a6b78]">
                Your details so far
              </span>
              <h3 className="font-serif text-[17px] font-bold text-[#062c55] mb-3">FairExit summary</h3>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b border-dashed border-[#e7e4dd]">
                  <span className="text-[#5a6b78]">Age</span>
                  <b className="text-[#062c55] font-semibold">{state.age || "52"}</b>
                </div>
                <div className="flex justify-between py-1 border-b border-dashed border-[#e7e4dd]">
                  <span className="text-[#5a6b78]">Years of service</span>
                  <b className="text-[#062c55] font-semibold">{state.years ? `${state.years} yrs` : "14 yrs"}</b>
                </div>
                <div className="flex justify-between py-1 border-b border-dashed border-[#e7e4dd]">
                  <span className="text-[#5a6b78]">Pay</span>
                  <b className="text-[#062c55] font-semibold">
                    {state.salary ? `${kMoney(parseFloat(state.salary))}/yr` : "$110k/yr"}
                  </b>
                </div>
                {isCanada && (
                  <div className="flex justify-between py-1 border-b border-dashed border-[#e7e4dd]">
                    <span className="text-[#5a6b78]">Offer</span>
                    <b className="text-[#062c55] font-semibold">{state.offer ? kMoney(state.offer) : "$24k"}</b>
                  </div>
                )}
              </div>

              {/* Live Estimate Card Section (Canada) */}
              {isCanada && estResult && estResult.statutory && (
                <div className="mt-4 pt-3 border-t border-[#d3dae1]">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#5a6b78]">
                    Live estimate · not what you&apos;re owed
                  </div>
                  <div className="font-serif text-[21px] font-bold text-[#0c8f72] my-1">
                    {kMoney(estResult.statutory.amount)}
                    {estResult.commonLaw && estResult.commonLaw.highAmount > estResult.statutory.amount
                      ? ` – ${kMoney(estResult.commonLaw.highAmount)}`
                      : ""}
                  </div>
                  <div className="text-[11px] text-[#5a6b78] leading-tight mb-2.5">
                    {estResult.statutory.terminationWeeks} wks notice
                    {estResult.statutory.severanceWeeks ? ` + ${estResult.statutory.severanceWeeks} wks severance pay` : ""}
                    {estResult.commonLaw
                      ? ` · court-awarded ${estResult.commonLaw.lowMonths}–${estResult.commonLaw.highMonths} mo`
                      : ""}
                    <br />
                    <b>Your offer {kMoney(state.offer)}</b> — near the floor
                  </div>
                  <span className="inline-block text-[10.5px] font-bold text-[#0c7a60] bg-[#e6f5ef] border border-[#b9e6d4] px-2 py-0.5 rounded">
                    ✓ Enough to show your results
                  </span>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Floating action buttons at bottom-right (Desktop) */}
      <div className="fixed bottom-6 right-6 z-30 hidden md:flex flex-col items-center gap-2.5">
        <button
          type="button"
          className="w-10 h-10 rounded-full bg-white border border-[#d5dde4] shadow-[0_4px_14px_rgba(6,44,85,0.12)] flex items-center justify-center text-[#062c55] hover:scale-105 transition-transform cursor-pointer"
          aria-label="Call or chat"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
          </svg>
        </button>
        <button
          type="button"
          className="w-10 h-10 rounded-full bg-[#062c55] text-white shadow-[0_4px_14px_rgba(6,44,85,0.25)] flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
          aria-label="Accessibility options"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function QuestionsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f6f4ef] flex items-center justify-center">Loading questions…</div>}>
      <QuestionsContent />
    </Suspense>
  );
}
