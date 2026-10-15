"use client";

import React, { useState, useEffect, useMemo } from "react";
import NextLink from "next/link";
import { useSearchParams } from "next/navigation";

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
  return "$" + Math.round(n).toLocaleString("en-US");
}

export default function USFlow() {
  const searchParams = useSearchParams();

  // Step 1: "us-situation-q1" .. "us-situation-q5"
  // Step 2: "step-basics" (The layoff)
  // Step 3: "step-money" (The papers)
  // Step 4: "step-clause" (Key question)
  // Step 5: "step-details" (Details)
  // Step 6: "step-analyzing" -> "step-results" (Your results)
  // Stop: "us-state-stop"
  const [currentStep, setCurrentStep] = useState<string>("us-situation-q1");
  const [explainOn, setExplainOn] = useState<boolean>(true);
  const [mobileSummOpen, setMobileSummOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // US Form State matching demo-v3.html
  const [state, setState] = useState({
    usState: "California",
    age: "52",
    years: "9",
    salary: "128000",
    comp: {
      bonus: false,
      equity: false,
      pto: false,
      benefits: false,
    } as Record<string, boolean>,
    signed: "no",
    agreed: false,

    // Step 2-5 fields
    union: "no",
    ended: "layoff",
    empsize: "big",
    others: "50",
    notice: "none",
    release: "yes",
    promise: "unsure",
    groupLayoff: "yes",
    roleFactor: 1.15,
    offer: 22154,
    reemployed: "no",
    clause: "unsure",
    deadline: "short",
    advise: "unsure",
    list: "unsure",
    revoke: "no",
    contract: "unsure",
    reason: "layoff",
    market: "mid",
    redflag: "none",
    nc: "no",
  });

  const unionMap: Record<string, string> = { yes: "Yes", no: "No", unsure: "Not sure" };
  const endedMap: Record<string, string> = { layoff: "Laid off", closure: "Site closed", mass: "Big group", cause: "For cause" };
  const empsizeMap: Record<string, string> = { small: "Under 100", big: "100+", unsure: "Not sure" };
  const othersMap: Record<string, string> = { me: "Just me", few: "A handful", "50": "50+", unsure: "Not sure" };
  const noticeMap: Record<string, string> = { none: "None", wk: "1–2 wks", mid: "3–8 wks", full: "60+ days" };

  const compList = useMemo(() => Object.keys(state.comp).filter((k) => state.comp[k]), [state.comp]);
  const compText = useMemo(() => {
    return compList.length
      ? compList
          .map((k) => ({ bonus: "Bonus", equity: "Equity", pto: "PTO", benefits: "Benefits" }[k] || k))
          .join(", ")
      : "None";
  }, [compList]);

  // Prefill from URL query params
  useEffect(() => {
    if (!searchParams) return;
    const st = searchParams.get("st") || searchParams.get("state");
    const y = searchParams.get("y") || searchParams.get("years");
    const s = searchParams.get("s") || searchParams.get("salary");
    const a = searchParams.get("age");
    const age40 = searchParams.get("age40");
    const grp = searchParams.get("group");
    const off = searchParams.get("offer");

    setState((prev) => ({
      ...prev,
      usState: st || prev.usState,
      years: y ? y.replace(/\D/g, "") : prev.years,
      salary: s ? s.replace(/\D/g, "") : prev.salary,
      age: a ? a.replace(/\D/g, "") : age40 === "yes" ? "52" : prev.age,
      offer: off ? parseInt(off.replace(/\D/g, ""), 10) : prev.offer,
      groupLayoff: grp || prev.groupLayoff,
    }));
  }, [searchParams]);

  // Context Why Card data matching active question
  const whyCopy = useMemo(() => {
    switch (currentStep) {
      case "us-situation-q1":
        return {
          title: "YOUR STATE CAN ADD RULES",
          text: "Federal law is the floor. Several states add their own layoff notice, severance or non-compete rules on top. Remote workers: your own state's rules usually apply, even if the agreement names another one.",
        };
      case "us-situation-q2":
        return {
          title: "FORTY IS THE LINE",
          text: "If you're 40 or older and they want you to give up age-discrimination claims, federal law gives you a set number of days to decide and 7 days to take it back after signing. Under 40, those rules don't apply.",
        };
      case "us-situation-q3":
        return {
          title: "PAY SETS THE STAKES",
          text: "There's no US minimum to compare your offer to, but your pay tells us what a week of notice is worth and whether unpaid bonus, PTO or equity is a meaningful amount.",
        };
      case "us-situation-q4":
        return {
          title: "A RELEASE CAN WAIVE THESE",
          text: "Signing usually gives up claims to money you've already earned unless it's paid first. Bonus, commission, unused PTO and vested equity are the usual things left on the table.",
        };
      case "us-situation-q5":
        return {
          title: "A SIGNATURE CAN CLOSE SOME DOORS",
          text: "A signed release is usually final, but if you're 40+ you may still have 7 days to take it back, and some claims can't be signed away.",
        };
      case "layoff-q1":
      case "step-basics":
        return {
          title: "UNION JOBS FOLLOW THEIR OWN RULES",
          text: "If you're under a collective agreement, severance and disputes usually go through your union rep, not a private agreement. Talk to your rep before signing anything.",
        };
      case "layoff-q2":
        return {
          title: "GROUP LAYOFFS GET MORE PROTECTION",
          text: "A site closing or a big group let go at once can trigger advance-notice rules and, if you're 40+, a longer time to decide plus a list of who was let go.",
        };
      case "layoff-q3":
        return {
          title: "THE 100-EMPLOYEE LINE",
          text: "The federal advance-notice law (WARN) only covers employers with 100 or more employees. Smaller employers may still be covered by a state version.",
        };
      case "layoff-q4":
        return {
          title: "FIFTY AT ONE SITE IS THE TRIGGER",
          text: "WARN generally applies when 50 or more people at one location lose their jobs in a short window. It's about your site, not the whole company.",
        };
      case "layoff-q5":
        return {
          title: "SIXTY DAYS IS THE STANDARD",
          text: "For a covered mass layoff or closing, the employer generally owes 60 days' written notice. Paying you instead of notifying you can still be a shortfall.",
        };
      case "papers-q1":
      case "step-money":
        return {
          title: "THE RELEASE IS THE WHOLE DEAL",
          text: "A release means you give up the right to bring claims in exchange for the money. If you're 40+ and it covers age claims, federal law sets rules for how it must be offered.",
        };
      case "papers-q2":
        return {
          title: "NO MINIMUM TO COMPARE TO",
          text: "US law doesn't set a severance amount, so we won't judge the number. We show it in your summary and in your report next to what the agreement asks you to give up.",
        };
      case "papers-q3":
        return {
          title: "A WRITTEN PROMISE IS THE ONLY MINIMUM",
          text: "No law requires severance, but a severance policy, an offer-letter clause or a handbook section can. If one exists, the offer has to match it.",
        };
      case "clause-q1":
      case "step-clause":
        return {
          title: "THEIR DEADLINE ISN'T THE LAW'S",
          text: "If you're 40+ and giving up age claims, the law says you must be offered at least 21 days to consider (45 in a group program). A shorter deadline is the most common slip.",
        };
      case "clause-q2":
        return {
          title: "IT HAS TO SAY SO",
          text: "An age-40+ release must advise you in writing to consult an attorney. Missing that line is one of the things that can make the waiver unenforceable.",
        };
      case "clause-q3":
        return {
          title: "THE LIST IS REQUIRED IN A GROUP PROGRAM",
          text: "For an age-40+ group layoff, the employer must disclose the job titles and ages of who was selected and who wasn't. It's how you'd spot a pattern.",
        };
      case "clause-q4":
        return {
          title: "SEVEN DAYS TO TAKE IT BACK",
          text: "An age-40+ release must give you 7 days after signing to revoke it, and that can't be waived. If the agreement doesn't say so, that's worth an attorney's look.",
        };
      case "details-q1":
      case "step-details":
        return {
          title: "SEPARATE CLAIMS, ON TOP OF SEVERANCE",
          text: "Discrimination or retaliation is its own claim. Unpaid wages, bonus or PTO are owed regardless of what you sign. Both change what an attorney looks at first.",
        };
      case "details-q2":
        return {
          title: "DEPENDS ENTIRELY ON YOUR STATE",
          text: "Some states void non-competes outright, others enforce them. If one is in your agreement, whether it can stop you working is a state-law question.",
        };
      default:
        return { title: "", text: "" };
    }
  }, [currentStep]);

  const isLayoffStep = [
    "layoff-q1",
    "layoff-q2",
    "layoff-q3",
    "layoff-q4",
    "layoff-q5",
    "step-basics",
  ].includes(currentStep);

  const layoffQIndex = useMemo(() => {
    if (currentStep === "layoff-q1" || currentStep === "step-basics") return 1;
    if (currentStep === "layoff-q2") return 2;
    if (currentStep === "layoff-q3") return 3;
    if (currentStep === "layoff-q4") return 4;
    if (currentStep === "layoff-q5") return 5;
    return 1;
  }, [currentStep]);

  const isPapersStep = [
    "papers-q1",
    "papers-q2",
    "papers-q3",
    "step-money",
  ].includes(currentStep);

  const papersQIndex = useMemo(() => {
    if (currentStep === "papers-q1" || currentStep === "step-money") return 1;
    if (currentStep === "papers-q2") return 2;
    if (currentStep === "papers-q3") return 3;
    return 1;
  }, [currentStep]);

  const isClauseStep = [
    "clause-q1",
    "clause-q2",
    "clause-q3",
    "clause-q4",
    "step-clause",
  ].includes(currentStep);

  const clauseQIndex = useMemo(() => {
    if (currentStep === "clause-q1" || currentStep === "step-clause") return 1;
    if (currentStep === "clause-q2") return 2;
    if (currentStep === "clause-q3") return 3;
    if (currentStep === "clause-q4") return 4;
    return 1;
  }, [currentStep]);

  const isDetailsStep = [
    "details-q1",
    "details-q2",
    "step-details",
  ].includes(currentStep);

  const detailsQIndex = useMemo(() => {
    if (currentStep === "details-q1" || currentStep === "step-details") return 1;
    if (currentStep === "details-q2") return 2;
    return 1;
  }, [currentStep]);

  // Overall progress percentage for track
  const progressPercent = useMemo(() => {
    switch (currentStep) {
      case "us-situation-q1":
        return 8;
      case "us-situation-q2":
        return 12;
      case "us-situation-q3":
        return 16;
      case "us-situation-q4":
        return 20;
      case "us-situation-q5":
        return 24;
      case "layoff-q1":
      case "step-basics":
        return 28;
      case "layoff-q2":
        return 32;
      case "layoff-q3":
        return 36;
      case "layoff-q4":
        return 40;
      case "layoff-q5":
        return 44;
      case "papers-q1":
      case "step-money":
        return 50;
      case "papers-q2":
        return 56;
      case "papers-q3":
        return 62;
      case "clause-q1":
      case "step-clause":
        return 68;
      case "clause-q2":
        return 73;
      case "clause-q3":
        return 78;
      case "clause-q4":
        return 83;
      case "details-q1":
      case "step-details":
        return 90;
      case "details-q2":
        return 95;
      case "step-analyzing":
      case "step-results":
        return 100;
      default:
        return 10;
    }
  }, [currentStep]);

  const activeRailIndex = useMemo(() => {
    if (
      [
        "us-situation-q1",
        "us-situation-q2",
        "us-situation-q3",
        "us-situation-q4",
        "us-situation-q5",
        "us-state-stop",
      ].includes(currentStep)
    )
      return 0;
    if (isLayoffStep) return 1;
    if (isPapersStep) return 2;
    if (isClauseStep) return 3;
    if (isDetailsStep) return 4;
    if (["step-analyzing", "step-results"].includes(currentStep)) return 5;
    return 0;
  }, [currentStep, isLayoffStep, isPapersStep, isClauseStep, isDetailsStep]);

  const usSteps = [
    { key: "us-situation-q1", num: "1", label: "Situation" },
    { key: "layoff-q1", num: "2", label: "The layoff" },
    { key: "papers-q1", num: "3", label: "The papers" },
    { key: "clause-q1", num: "4", label: "Key question" },
    { key: "details-q1", num: "5", label: "Details" },
    { key: "step-results", num: "★", label: "Your results" },
  ];

  // Helper to get active situation question index (1 to 5)
  const situationQIndex = useMemo(() => {
    if (currentStep === "us-situation-q1") return 1;
    if (currentStep === "us-situation-q2") return 2;
    if (currentStep === "us-situation-q3") return 3;
    if (currentStep === "us-situation-q4") return 4;
    if (currentStep === "us-situation-q5") return 5;
    return 1;
  }, [currentStep]);

  const isSituationStep = currentStep.startsWith("us-situation-");

  return (
    <div className="min-h-screen bg-[#f6f4ef] text-[#17242f] font-sans antialiased pb-20 selection:bg-[#cbf3e4]">
      {/* ── HEADER NAVBAR ── */}
      <header className="sticky top-0 z-40 bg-[#f6f4ef]/90 backdrop-blur-md border-b border-[#e7e4dd]">
        <div className="max-w-[1160px] mx-auto px-4 sm:px-5 py-3 flex items-center justify-between">
          <NextLink href="/" className="inline-flex items-center gap-2 focus:outline-none shrink-0" aria-label="FairExit">
            <img src="/fairexit-wordmark.png" alt="FairExit" className="h-[26px] w-auto" />
          </NextLink>

          <div className="flex items-center gap-5 sm:gap-6 ml-auto">
            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-5 sm:gap-6 text-[13.5px] font-semibold text-[#5a6b78]">
              <a href="/#how" className="hover:text-[#062c55] transition-colors">How it works</a>
              <a href="/#paths" className="hover:text-[#062c55] transition-colors">Pricing</a>
              <a href="/faq" className="hover:text-[#062c55] transition-colors">FAQ</a>
              <a href="/blog" className="hover:text-[#062c55] transition-colors">Blog</a>
              <a href="/about" className="hover:text-[#062c55] transition-colors">About</a>
            </nav>

            <a
              href="/#app"
              className="hidden sm:inline-flex items-center text-[13px] font-bold text-[#0c8f72] hover:underline transition-colors whitespace-nowrap"
            >
              Get the app
            </a>
            <NextLink
              href="/"
              className="hidden sm:inline-flex items-center text-[13px] font-semibold text-[#5a6b78] hover:text-[#062c55] transition-colors whitespace-nowrap"
            >
              Exit ✕
            </NextLink>

            {/* Mobile Your Details Trigger Button */}
            <button
              type="button"
              onClick={() => setMobileSummOpen(true)}
              className="md:hidden inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] border border-[#cfe8dd] bg-[#eef8f3] text-[13px] font-bold text-[#062c55] shadow-xs cursor-pointer"
              aria-expanded={mobileSummOpen}
            >
              Your details
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 text-[#062c55]">
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Hamburger for mobile */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-9 h-9 rounded-[10px] border border-[#d5dde4] bg-white text-[#062c55] flex items-center justify-center shadow-xs focus:outline-none cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-5 h-5">
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#e7e4dd] bg-white px-5 py-4 space-y-3 text-sm font-bold text-[#062c55] animate-in fade-in">
            <a href="/#how" className="block py-1">How it works</a>
            <a href="/#paths" className="block py-1">Pricing</a>
            <a href="/faq" className="block py-1">FAQ</a>
            <a href="/blog" className="block py-1">Blog</a>
            <a href="/about" className="block py-1">About</a>
            <div className="pt-2 border-t border-[#e7e4dd] flex justify-between text-xs text-[#5a6b78]">
              <a href="/#app" className="font-bold text-[#0c8f72]">Get the app</a>
              <NextLink href="/" className="font-bold text-[#5a6b78]">Exit ✕</NextLink>
            </div>
          </div>
        )}
      </header>

      {/* ── MOBILE SUMMARY BOTTOM SHEET / MODAL ── */}
      {mobileSummOpen && (
        <>
          <div
            className="fixed inset-0 bg-[#062c55]/40 backdrop-blur-sm z-50 transition-opacity"
            onClick={() => setMobileSummOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 max-h-[85vh] bg-white rounded-t-3xl z-50 p-6 shadow-2xl overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between pb-3 border-b border-[#e7e4dd] mb-4">
              <div>
                <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#5a6b78]">
                  Your details so far
                </span>
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
                <span className="text-[#5a6b78]">State</span>
                <b className="text-[#062c55] font-semibold">{state.usState || "California"}</b>
              </div>
              <div className="flex justify-between py-1.5 border-b border-dashed border-[#e7e4dd]">
                <span className="text-[#5a6b78]">Age</span>
                <b className="text-[#062c55] font-semibold">{state.age || "52"}</b>
              </div>
              <div className="flex justify-between py-1.5 border-b border-dashed border-[#e7e4dd]">
                <span className="text-[#5a6b78]">Years of service</span>
                <b className="text-[#062c55] font-semibold">{state.years ? `${state.years} yrs` : "9 yrs"}</b>
              </div>
              <div className="flex justify-between py-1.5 border-b border-dashed border-[#e7e4dd]">
                <span className="text-[#5a6b78]">Pay</span>
                <b className="text-[#062c55] font-semibold">
                  {state.salary ? `${kMoney(parseFloat(state.salary))}/yr` : "$128k/yr"}
                </b>
              </div>
              <div className="flex justify-between py-1.5 border-b border-dashed border-[#e7e4dd]">
                <span className="text-[#5a6b78]">On top of base</span>
                <b className="text-[#062c55] font-semibold">{compText}</b>
              </div>
              {state.union && (
                <div className="flex justify-between py-1.5 border-b border-dashed border-[#e7e4dd]">
                  <span className="text-[#5a6b78]">Union contract</span>
                  <b className="text-[#062c55] font-semibold">{unionMap[state.union] || state.union}</b>
                </div>
              )}
              {state.ended && (
                <div className="flex justify-between py-1.5 border-b border-dashed border-[#e7e4dd]">
                  <span className="text-[#5a6b78]">How it ended</span>
                  <b className="text-[#062c55] font-semibold">{endedMap[state.ended] || state.ended}</b>
                </div>
              )}
              {state.empsize && (
                <div className="flex justify-between py-1.5 border-b border-dashed border-[#e7e4dd]">
                  <span className="text-[#5a6b78]">Employer size</span>
                  <b className="text-[#062c55] font-semibold">{empsizeMap[state.empsize] || state.empsize}</b>
                </div>
              )}
              {state.others && (
                <div className="flex justify-between py-1.5 border-b border-dashed border-[#e7e4dd]">
                  <span className="text-[#5a6b78]">At your site</span>
                  <b className="text-[#062c55] font-semibold">{othersMap[state.others] || state.others}</b>
                </div>
              )}
              {state.notice && (
                <div className="flex justify-between py-1.5 border-b border-dashed border-[#e7e4dd]">
                  <span className="text-[#5a6b78]">Advance notice</span>
                  <b className="text-[#062c55] font-semibold">{noticeMap[state.notice] || state.notice}</b>
                </div>
              )}
              {state.release && (
                <div className="flex justify-between py-1.5 border-b border-dashed border-[#e7e4dd]">
                  <span className="text-[#5a6b78]">Release asked?</span>
                  <b className="text-[#062c55] font-semibold">{state.release === "yes" ? "Yes" : state.release === "no" ? "No" : "Not sure"}</b>
                </div>
              )}
              <div className="flex justify-between py-1.5 border-b border-dashed border-[#e7e4dd]">
                <span className="text-[#5a6b78]">Offer</span>
                <b className="text-[#062c55] font-semibold">{state.offer ? kMoney(state.offer) : "$22k"}</b>
              </div>
              {state.promise && (
                <div className="flex justify-between py-1.5 border-b border-dashed border-[#e7e4dd]">
                  <span className="text-[#5a6b78]">Severance promised in writing?</span>
                  <b className="text-[#062c55] font-semibold">{state.promise === "yes" ? "Yes" : state.promise === "no" ? "No" : "Not sure"}</b>
                </div>
              )}
              {state.deadline && (
                <div className="flex justify-between py-1.5 border-b border-dashed border-[#e7e4dd]">
                  <span className="text-[#5a6b78]">Days to decide</span>
                  <b className="text-[#062c55] font-semibold">
                    {{ short: "Under 21", mid: "21–44 days", full: "45+ days", unsure: "Not sure" }[state.deadline] || state.deadline}
                  </b>
                </div>
              )}
              {state.advise && (
                <div className="flex justify-between py-1.5 border-b border-dashed border-[#e7e4dd]">
                  <span className="text-[#5a6b78]">Told to see an attorney?</span>
                  <b className="text-[#062c55] font-semibold">
                    {{ yes: "Yes", no: "No", unsure: "Not sure" }[state.advise] || state.advise}
                  </b>
                </div>
              )}
              {state.list && (
                <div className="flex justify-between py-1.5 border-b border-dashed border-[#e7e4dd]">
                  <span className="text-[#5a6b78]">Got the list?</span>
                  <b className="text-[#062c55] font-semibold">
                    {{ yes: "Yes", no: "No", unsure: "Not sure" }[state.list] || state.list}
                  </b>
                </div>
              )}
              {state.revoke && (
                <div className="flex justify-between py-1.5 border-b border-dashed border-[#e7e4dd]">
                  <span className="text-[#5a6b78]">7-day take-back</span>
                  <b className="text-[#062c55] font-semibold">
                    {{ yes: "Yes", no: "Not mentioned", unsure: "Not sure" }[state.revoke] || state.revoke}
                  </b>
                </div>
              )}
            </div>

            {/* Live Read Block (US) */}
            <div className="mt-4 pt-3 border-t border-[#d3dae1]">
              <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#5a6b78]">
                Live read · not an assessment
              </div>
              <div className="font-serif text-[22px] font-bold text-[#0c8f72] my-1">
                5 things to check
              </div>
              <div className="text-xs text-[#5a6b78] leading-relaxed mb-3 space-y-1">
                <div>• Time to consider looks short</div>
                <div>• A 7-day period to change your mind is a common requirement for age-40+ releases</div>
                <div>• For an age-40+ group program, the law requires a disclosure of the ages &amp; job titles selected</div>
              </div>
              <span className="inline-block text-[11px] font-bold text-[#0c7a60] bg-[#e6f5ef] border border-[#b9e6d4] px-2.5 py-1 rounded-md">
                ✓ Enough to show your results
              </span>
            </div>
          </div>
        </>
      )}

      {/* ── TWO COLUMN SHELL: MAIN (PROGRESS + CARD) + DESKTOP SIDEBAR ── */}
      <div className="max-w-[1080px] mx-auto px-4 sm:px-5 pt-4">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,720px)_320px] gap-8 justify-center items-start">
          {/* LEFT: MAIN WORKFLOW (PROGRESS + CARD) */}
          <div className="w-full">
            {/* PROGRESS RAIL & TRACK (Directly on top of questions box) */}
            <div className="mb-5">
              <ol className="grid grid-cols-6 gap-1.5 list-none m-0 p-0 mb-2 text-center" id="stepsBar">
                {usSteps.map((s, idx) => {
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 mt-3">
                <div className="text-xs font-bold text-[#5a6b78] w-full sm:w-auto">
                  <span>
                    {isSituationStep && "Step 1 of 5 · Your situation"}
                    {isLayoffStep && "Step 2 of 5 · The layoff"}
                    {isPapersStep && "Step 3 of 5 · The papers"}
                    {isClauseStep && "Step 4 of 5 · The most important question"}
                    {isDetailsStep && "Step 5 of 5 · Last details"}
                    {currentStep === "step-analyzing" && "Reading your situation…"}
                    {currentStep === "step-results" && "Your results"}
                  </span>
                  <span className="block sm:inline sm:ml-2 font-medium italic text-[#5a6b78] mt-0.5 sm:mt-0">
                    {isSituationStep && "Ten seconds, promise."}
                    {isLayoffStep && "Nice — the facts an attorney would ask first."}
                    {isPapersStep && "Halfway. This is where it gets real."}
                    {isClauseStep && "The one that matters most."}
                    {isDetailsStep && "Last one — then your results."}
                    {currentStep === "step-results" && "Here's where you stand."}
                  </span>
                </div>

                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-[#5a6b78] select-none ml-auto mt-0.5 sm:mt-0">
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

            {/* ════════════════════════════════════════════════════════════════
                STEP 1: US SITUATION (5 SEQUENTIAL SINGLE-QUESTION SCREENS)
            ════════════════════════════════════════════════════════════════ */}
            {isSituationStep && (
              <div className="bg-white border border-[#e7e4dd] rounded-[18px] p-6 sm:p-8 shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] animate-in fade-in duration-300">
                {/* 5 Dots Indicator - Upper Right Corner */}
                <div className="flex justify-end mb-2">
                  <div className="flex items-center gap-2 shrink-0 py-1" aria-label={`Question ${situationQIndex} of 5`}>
                    {[1, 2, 3, 4, 5].map((d) => (
                      <i
                        key={d}
                        className={`inline-block w-2 h-2 rounded-full transition-all duration-200 ${
                          d < situationQIndex
                            ? "bg-[#0eb28d]"
                            : d === situationQIndex
                            ? "bg-[#0eb28d] shadow-[0_0_0_3.5px_rgba(14,178,141,0.35)]"
                            : "bg-[#dcd8cf]"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Full-width 100% Free Badge Box */}
                <div className="w-full flex items-center gap-2.5 p-2.5 px-3.5 rounded-xl bg-gradient-to-r from-[#e6f8f1] to-[#f3faf6] border border-[#b9e6d4] shadow-[0_4px_16px_-12px_rgba(14,178,141,0.5)] mb-4">
                  <span className="w-5 h-5 rounded-full bg-[#0eb28d] text-white font-extrabold flex items-center justify-center shrink-0 text-[11px]">
                    ✓
                  </span>
                  <span className="text-xs sm:text-[13px] text-[#1f3b32]">
                    <b className="font-bold text-[#062c55]">100% free to get your results.</b> No card. No signup. No sales call.
                  </span>
                </div>

                {/* Heading & Subtitle */}
                <h1 className="font-serif font-normal text-[23px] sm:text-[27px] text-[#062c55] leading-[1.2] tracking-tight">
                  Make sense of your separation offer.
                </h1>
                <p className="text-[13.5px] sm:text-sm text-[#5a6b78] mt-2 mb-4 leading-relaxed">
                  US law doesn&apos;t set a severance amount — so there&apos;s no &quot;number you&apos;re owed&quot;. What the law <b>does</b> control is <b>how</b> they can ask you to sign: how long you get to think, whether you can take it back, and how much notice a big layoff needs. That&apos;s what we check. We don&apos;t assess your case — that&apos;s an attorney&apos;s job.
                </p>

                {/* Prefilled Banner */}
                <div className="my-4 p-3.5 sm:p-4 rounded-xl bg-[#f3faf6] border border-[#b9e6d4]">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#0c7a60] flex items-center gap-1.5 mb-1">
                    <span>✓</span> ALREADY FILLED FROM YOUR QUICK START
                  </div>
                  <div className="text-sm sm:text-[14.5px] font-bold text-[#062c55]">
                    {state.usState || "California"} · we still need your exact age, years and pay ↓
                  </div>
                </div>

                {/* ── QUESTION 1 OF 5: STATE ── */}
                {currentStep === "us-situation-q1" && (
                  <div>
                    <div className="font-bold text-[15px] sm:text-[16px] text-[#062c55] mb-2.5">
                      Which state did you physically work in?
                    </div>

                    {/* Mobile Explainer */}
                    {explainOn && (
                      <div className="md:hidden my-3 p-3.5 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                        <b className="block text-[#0c7a60] font-bold text-[11px] mb-1">Your state can add rules</b>
                        federal law is the floor. Several states add their own layoff notice, severance or non-compete rules on top. Remote workers: your own state&apos;s rules usually apply, even if the agreement names another one.
                      </div>
                    )}

                    <select
                      value={state.usState}
                      onChange={(e) => {
                        const val = e.target.value;
                        setState({ ...state, usState: val });
                        if (val === "Other state") {
                          setCurrentStep("us-state-stop");
                        }
                      }}
                      className="w-full border border-[#cdd3d8] rounded-xl px-4 py-3 text-sm font-medium bg-white focus:outline-none focus:border-[#0eb28d] shadow-sm cursor-pointer"
                    >
                      {US_STATES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>

                    {/* Navigation */}
                    <div className="mt-8 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (state.usState === "Other state") {
                            setCurrentStep("us-state-stop");
                          } else {
                            setCurrentStep("us-situation-q2");
                          }
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#0eb28d] hover:bg-[#0c8f72] text-white text-sm font-bold shadow-[0_8px_18px_-6px_rgba(14,178,141,0.6)] transition-all cursor-pointer"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}

                {/* ── QUESTION 2 OF 5: AGE AND YEARS ── */}
                {currentStep === "us-situation-q2" && (
                  <div>
                    <div className="font-bold text-[15px] sm:text-[16px] text-[#062c55] mb-2.5">
                      Your age and years there
                    </div>

                    {/* Mobile Explainer */}
                    {explainOn && (
                      <div className="md:hidden my-3 p-3.5 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                        <b className="block text-[#0c7a60] font-bold text-[11px] mb-1">Forty is the line</b>
                        if you&apos;re 40 or older and they want you to give up age-discrimination claims, federal law gives you a set number of days to decide and 7 days to take it back after signing. Under 40, those rules don&apos;t apply.
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
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

                    {/* Navigation */}
                    <div className="mt-8 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep("us-situation-q1");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-[#e7e4dd] bg-white text-xs font-bold text-[#5a6b78] hover:text-[#062c55] hover:border-[#c3ccd3] transition-colors cursor-pointer"
                      >
                        ‹ Back
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep("us-situation-q3");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#0eb28d] hover:bg-[#0c8f72] text-white text-sm font-bold shadow-[0_8px_18px_-6px_rgba(14,178,141,0.6)] transition-all cursor-pointer"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}

                {/* ── QUESTION 3 OF 5: PAY PER YEAR ── */}
                {currentStep === "us-situation-q3" && (
                  <div>
                    <div className="font-bold text-[15px] sm:text-[16px] text-[#062c55] mb-2.5">
                      Pay per year ($, before tax)
                    </div>

                    {/* Mobile Explainer */}
                    {explainOn && (
                      <div className="md:hidden my-3 p-3.5 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                        <b className="block text-[#0c7a60] font-bold text-[11px] mb-1">Pay sets the stakes</b>
                        there&apos;s no US minimum to compare your offer to, but your pay tells us what a week of notice is worth and whether unpaid bonus, PTO or equity is a meaningful amount.
                      </div>
                    )}

                    <input
                      type="text"
                      inputMode="numeric"
                      value={state.salary}
                      placeholder="128000"
                      onChange={(e) => setState({ ...state, salary: e.target.value })}
                      className="w-full border border-[#cdd3d8] rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:border-[#0eb28d]"
                    />

                    {/* Navigation */}
                    <div className="mt-8 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep("us-situation-q2");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-[#e7e4dd] bg-white text-xs font-bold text-[#5a6b78] hover:text-[#062c55] hover:border-[#c3ccd3] transition-colors cursor-pointer"
                      >
                        ‹ Back
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep("us-situation-q4");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#0eb28d] hover:bg-[#0c8f72] text-white text-sm font-bold shadow-[0_8px_18px_-6px_rgba(14,178,141,0.6)] transition-all cursor-pointer"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}

                {/* ── QUESTION 4 OF 5: ANYTHING ON TOP OF BASE PAY ── */}
                {currentStep === "us-situation-q4" && (
                  <div>
                    <div className="font-bold text-[15px] sm:text-[16px] text-[#062c55] mb-2.5">
                      Anything on top of base pay?
                    </div>

                    {/* Mobile Explainer */}
                    {explainOn && (
                      <div className="md:hidden my-3 p-3.5 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                        <b className="block text-[#0c7a60] font-bold text-[11px] mb-1">A release can waive these</b>
                        signing usually gives up claims to money you&apos;ve already earned unless it&apos;s paid first. Bonus, commission, unused PTO and vested equity are the usual things left on the table.
                      </div>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      {[
                        { k: "bonus", label: "Bonus / commission" },
                        { k: "equity", label: "Stock / RSUs / options" },
                        { k: "pto", label: "Unused PTO" },
                        { k: "benefits", label: "Health benefits" },
                      ].map((item) => {
                        const isSelected = !!state.comp[item.k];
                        return (
                          <button
                            key={item.k}
                            type="button"
                            onClick={() =>
                              setState({
                                ...state,
                                comp: { ...state.comp, [item.k]: !state.comp[item.k] },
                              })
                            }
                            className={`px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all cursor-pointer ${
                              isSelected
                                ? "bg-[#062c55] text-white border border-[#062c55] shadow-sm"
                                : "border border-[#e0ddd4] bg-white text-[#17242f] hover:border-[#c3ccd3]"
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Navigation */}
                    <div className="mt-8 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep("us-situation-q3");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-[#e7e4dd] bg-white text-xs font-bold text-[#5a6b78] hover:text-[#062c55] hover:border-[#c3ccd3] transition-colors cursor-pointer"
                      >
                        ‹ Back
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep("us-situation-q5");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#0eb28d] hover:bg-[#0c8f72] text-white text-sm font-bold shadow-[0_8px_18px_-6px_rgba(14,178,141,0.6)] transition-all cursor-pointer"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}

                {/* ── QUESTION 5 OF 5: HAVE YOU SIGNED ANYTHING YET ── */}
                {currentStep === "us-situation-q5" && (
                  <div>
                    <div className="font-bold text-[15px] sm:text-[16px] text-[#062c55] mb-2.5">
                      Have you signed anything yet?
                    </div>

                    {/* Mobile Explainer */}
                    {explainOn && (
                      <div className="md:hidden my-3 p-3.5 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                        <b className="block text-[#0c7a60] font-bold text-[11px] mb-1">A signature can close some doors</b>
                        a signed release is usually final, but if you&apos;re 40+ you may still have 7 days to take it back, and some claims can&apos;t be signed away.
                      </div>
                    )}

                    <div className="flex gap-2 flex-wrap mb-5">
                      {[
                        { k: "no", label: "No, not yet" },
                        { k: "yes", label: "Yes, already signed" },
                      ].map((item) => {
                        const isSelected = state.signed === item.k;
                        return (
                          <button
                            key={item.k}
                            type="button"
                            onClick={() => setState({ ...state, signed: item.k })}
                            className={`px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all cursor-pointer ${
                              isSelected
                                ? "bg-[#062c55] text-white border border-[#062c55] shadow-sm"
                                : "border border-[#e0ddd4] bg-white text-[#17242f] hover:border-[#c3ccd3]"
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Disclaimer agreement box */}
                    <div
                      onClick={() => setState({ ...state, agreed: !state.agreed })}
                      className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                        state.agreed
                          ? "bg-[#f3faf6] border-[#0eb28d]"
                          : "bg-[#fafbfb] border-[#e2dfd7] hover:border-[#c9c5bd]"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded border mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                          state.agreed
                            ? "bg-[#0eb28d] border-[#0eb28d] text-white text-xs font-bold"
                            : "border-[#b0bac3] bg-white"
                        }`}
                      >
                        {state.agreed ? "✓" : ""}
                      </div>
                      <div className="text-xs text-[#2b3a45] leading-relaxed">
                        I understand this is <b>information to help me get oriented — not legal advice</b>, and not an assessment of my case. The full{" "}
                        <a
                          href="/legal"
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[#0c8f72] font-bold underline"
                        >
                          Terms &amp; Disclaimer
                        </a>{" "}
                        apply if I buy a report or connect with an attorney.
                      </div>
                    </div>

                    {/* Navigation */}
                    <div className="mt-8">
                      <div className="flex items-center justify-between mb-3.5">
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentStep("us-situation-q4");
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-[#e7e4dd] bg-white text-xs font-bold text-[#5a6b78] hover:text-[#062c55] hover:border-[#c3ccd3] transition-colors cursor-pointer"
                        >
                          ‹ Back
                        </button>
                        <span className="text-xs font-bold text-[#0c8f72]">
                          Ready — continue below ↓
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={!state.agreed}
                        onClick={() => {
                          setCurrentStep("layoff-q1");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm sm:text-base transition-all ${
                          state.agreed
                            ? "bg-[#0eb28d] hover:bg-[#0c8f72] text-white shadow-[0_8px_20px_-8px_rgba(14,178,141,0.7)] cursor-pointer"
                            : "bg-[#a1cfc4] text-white cursor-not-allowed opacity-70"
                        }`}
                      >
                        Continue →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STATE STOP CARD (WHEN SELECTING "Other state")
            ════════════════════════════════════════════════════════════════ */}
            {currentStep === "us-state-stop" && (
              <div className="bg-white border border-[#e7e4dd] rounded-[18px] p-6 sm:p-8 shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] animate-in fade-in duration-300">
                <span className="inline-block text-xs font-bold text-[#b45309] bg-[#fef3c7] border border-[#fde68a] px-3 py-1 rounded-full mb-3">
                  State coverage
                </span>
                <h1 className="font-serif font-medium text-2xl sm:text-[28px] text-[#062c55] leading-tight">
                  We don&apos;t cover your state yet.
                </h1>
                <p className="text-sm text-[#5a6b78] mt-2 mb-6 leading-relaxed">
                  Layoff rules differ by state — several add their own WARN, severance or non-compete rules on top of federal law. Rather than give you a federal-only read that could be wrong for you, we stop here. We cover <b>California, New York, Texas, Florida, Illinois, New Jersey and Washington</b> today.
                </p>

                <div className="p-4 rounded-xl bg-[#fafbfb] border border-[#e7e4dd] space-y-3 mb-6 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#5a6b78]">In Canada?</span>
                    <a href="/questions?country=CA" className="text-[#0c8f72] font-bold hover:underline">
                      Use the Canadian site →
                    </a>
                  </div>
                  <div className="flex justify-between items-start pt-2 border-t border-[#e7e4dd]">
                    <span className="font-bold text-[#5a6b78]">Meanwhile</span>
                    <span className="text-right text-[#5a6b78]">
                      Your state labor department · the EEOC · a licensed employment attorney (many offer a free first call)
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => alert("We'll notify you as soon as FairExit is live in your state!")}
                    className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-[#0eb28d] hover:bg-[#0c8f72] text-white shadow-sm transition-all cursor-pointer"
                  >
                    Notify me when you&apos;re live in my state
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setState({ ...state, usState: "California" });
                      setCurrentStep("us-situation-q1");
                    }}
                    className="w-full py-2.5 text-xs font-bold text-[#5a6b78] hover:text-[#062c55] cursor-pointer text-center"
                  >
                    ‹ Wrong state? Change my answer
                  </button>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STEP 2: THE LAYOFF (5 SEQUENTIAL SINGLE-QUESTION SCREENS)
            ════════════════════════════════════════════════════════════════ */}
            {isLayoffStep && (
              <div className="bg-white border border-[#e7e4dd] rounded-[18px] p-6 sm:p-8 shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] animate-in fade-in duration-300">
                {/* Tag & 5-Dot Indicator */}
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-block text-xs font-semibold text-[#5a6b78] bg-white border border-[#e7e4dd] px-3 py-1 rounded-full">
                    The layoff
                  </span>
                  <div className="flex items-center gap-2 shrink-0 py-1" aria-label={`Question ${layoffQIndex} of 5`}>
                    {[1, 2, 3, 4, 5].map((d) => (
                      <i
                        key={d}
                        className={`inline-block w-2 h-2 rounded-full transition-all duration-200 ${
                          d < layoffQIndex
                            ? "bg-[#0eb28d]"
                            : d === layoffQIndex
                            ? "bg-[#0eb28d] shadow-[0_0_0_3.5px_rgba(14,178,141,0.35)]"
                            : "bg-[#dcd8cf]"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Title & Subtitle */}
                <h1 className="font-serif font-normal text-[23px] sm:text-[27px] text-[#062c55] leading-[1.2] tracking-tight">
                  How did it happen?
                </h1>
                <p className="text-[13.5px] sm:text-sm text-[#5a6b78] mt-2 mb-6 leading-relaxed">
                  This tells us whether the advance-notice rules (the federal WARN Act) applied to your layoff.
                </p>

                {/* ── QUESTION 1 OF 5: UNION CONTRACT ── */}
                {(currentStep === "layoff-q1" || currentStep === "step-basics") && (
                  <div>
                    <div className="font-bold text-[15px] sm:text-[16px] text-[#062c55] mb-2.5">
                      Are you covered by a union contract?
                    </div>

                    {/* Mobile Explainer */}
                    {explainOn && (
                      <div className="md:hidden my-3 p-3.5 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                        <b className="block text-[#0c7a60] font-bold text-[11px] mb-1">Union jobs follow their own rules</b>
                        if you&apos;re under a collective agreement, severance and disputes usually go through your union rep, not a private agreement. Talk to your rep before signing anything.
                      </div>
                    )}

                    {/* Options: Yes / No / Not sure */}
                    <div className="flex gap-2.5 flex-wrap">
                      {[
                        { k: "yes", label: "Yes" },
                        { k: "no", label: "No" },
                        { k: "unsure", label: "Not sure" },
                      ].map((p) => {
                        const isSelected = state.union === p.k;
                        return (
                          <button
                            key={p.k}
                            type="button"
                            onClick={() => setState({ ...state, union: p.k })}
                            className={`px-5 py-2.5 rounded-lg text-[13.5px] sm:text-sm font-semibold transition-all cursor-pointer ${
                              isSelected
                                ? "bg-[#062c55] text-white border border-[#062c55] shadow-xs"
                                : "border border-[#dcd8cf] bg-white text-[#062c55] hover:border-[#b0bac3]"
                            }`}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Navigation */}
                    <div className="mt-8 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep("us-situation-q5");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-[#e7e4dd] bg-white text-xs font-bold text-[#5a6b78] hover:text-[#062c55] hover:border-[#c3ccd3] transition-colors cursor-pointer"
                      >
                        ‹ Back
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep("layoff-q2");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#0eb28d] hover:bg-[#0c8f72] text-white text-sm font-bold shadow-[0_8px_18px_-6px_rgba(14,178,141,0.6)] transition-all cursor-pointer"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}

                {/* ── QUESTION 2 OF 5: HOW DID YOUR JOB END? ── */}
                {currentStep === "layoff-q2" && (
                  <div>
                    <div className="font-bold text-[15px] sm:text-[16px] text-[#062c55] mb-2.5">
                      How did your job end?
                    </div>

                    {/* Mobile Explainer */}
                    {explainOn && (
                      <div className="md:hidden my-3 p-3.5 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                        <b className="block text-[#0c7a60] font-bold text-[11px] mb-1">Group layoffs get more protection</b>
                        a site closing or a big group let go at once can trigger advance-notice rules and, if you&apos;re 40+, a longer time to decide plus a list of who was let go.
                      </div>
                    )}

                    {/* Options: Laid off / My whole site closed / A big group of us / For cause */}
                    <div className="flex gap-2.5 flex-wrap">
                      {[
                        { k: "layoff", label: "Laid off" },
                        { k: "closure", label: "My whole site closed" },
                        { k: "mass", label: "A big group of us" },
                        { k: "cause", label: "For cause" },
                      ].map((p) => {
                        const isSelected = state.ended === p.k;
                        return (
                          <button
                            key={p.k}
                            type="button"
                            onClick={() => setState({ ...state, ended: p.k, reason: p.k })}
                            className={`px-5 py-2.5 rounded-lg text-[13.5px] sm:text-sm font-semibold transition-all cursor-pointer ${
                              isSelected
                                ? "bg-[#062c55] text-white border border-[#062c55] shadow-xs"
                                : "border border-[#dcd8cf] bg-white text-[#062c55] hover:border-[#b0bac3]"
                            }`}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Navigation */}
                    <div className="mt-8 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep("layoff-q1");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-[#e7e4dd] bg-white text-xs font-bold text-[#5a6b78] hover:text-[#062c55] hover:border-[#c3ccd3] transition-colors cursor-pointer"
                      >
                        ‹ Back
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep("layoff-q3");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#0eb28d] hover:bg-[#0c8f72] text-white text-sm font-bold shadow-[0_8px_18px_-6px_rgba(14,178,141,0.6)] transition-all cursor-pointer"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}

                {/* ── QUESTION 3 OF 5: HOW BIG IS THE EMPLOYER? ── */}
                {currentStep === "layoff-q3" && (
                  <div>
                    <div className="font-bold text-[15px] sm:text-[16px] text-[#062c55] mb-2.5">
                      How big is the employer?
                    </div>

                    {/* Mobile Explainer */}
                    {explainOn && (
                      <div className="md:hidden my-3 p-3.5 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                        <b className="block text-[#0c7a60] font-bold text-[11px] mb-1">The 100-employee line</b>
                        the federal advance-notice law (WARN) only covers employers with 100 or more employees. Smaller employers may still be covered by a state version.
                      </div>
                    )}

                    {/* Options: Under 100 / 100 or more / Not sure */}
                    <div className="flex gap-2.5 flex-wrap">
                      {[
                        { k: "small", label: "Under 100" },
                        { k: "big", label: "100 or more" },
                        { k: "unsure", label: "Not sure" },
                      ].map((p) => {
                        const isSelected = state.empsize === p.k;
                        return (
                          <button
                            key={p.k}
                            type="button"
                            onClick={() => setState({ ...state, empsize: p.k })}
                            className={`px-5 py-2.5 rounded-lg text-[13.5px] sm:text-sm font-semibold transition-all cursor-pointer ${
                              isSelected
                                ? "bg-[#062c55] text-white border border-[#062c55] shadow-xs"
                                : "border border-[#dcd8cf] bg-white text-[#062c55] hover:border-[#b0bac3]"
                            }`}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Navigation */}
                    <div className="mt-8 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep("layoff-q2");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-[#e7e4dd] bg-white text-xs font-bold text-[#5a6b78] hover:text-[#062c55] hover:border-[#c3ccd3] transition-colors cursor-pointer"
                      >
                        ‹ Back
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep("layoff-q4");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#0eb28d] hover:bg-[#0c8f72] text-white text-sm font-bold shadow-[0_8px_18px_-6px_rgba(14,178,141,0.6)] transition-all cursor-pointer"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}

                {/* ── QUESTION 4 OF 5: HOW MANY PEOPLE LOST THEIR JOB AT YOUR SITE? ── */}
                {currentStep === "layoff-q4" && (
                  <div>
                    <div className="font-bold text-[15px] sm:text-[16px] text-[#062c55] mb-2.5">
                      Roughly how many people lost their job at your site?
                    </div>

                    {/* Mobile Explainer */}
                    {explainOn && (
                      <div className="md:hidden my-3 p-3.5 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                        <b className="block text-[#0c7a60] font-bold text-[11px] mb-1">Fifty at one site is the trigger</b>
                        WARN generally applies when 50 or more people at one location lose their jobs in a short window. It&apos;s about your site, not the whole company.
                      </div>
                    )}

                    {/* Options: Just me / A handful / 50 or more / Not sure */}
                    <div className="flex gap-2.5 flex-wrap">
                      {[
                        { k: "me", label: "Just me" },
                        { k: "few", label: "A handful" },
                        { k: "50", label: "50 or more" },
                        { k: "unsure", label: "Not sure" },
                      ].map((p) => {
                        const isSelected = state.others === p.k;
                        return (
                          <button
                            key={p.k}
                            type="button"
                            onClick={() => setState({ ...state, others: p.k })}
                            className={`px-5 py-2.5 rounded-lg text-[13.5px] sm:text-sm font-semibold transition-all cursor-pointer ${
                              isSelected
                                ? "bg-[#062c55] text-white border border-[#062c55] shadow-xs"
                                : "border border-[#dcd8cf] bg-white text-[#062c55] hover:border-[#b0bac3]"
                            }`}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Navigation */}
                    <div className="mt-8 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep("layoff-q3");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-[#e7e4dd] bg-white text-xs font-bold text-[#5a6b78] hover:text-[#062c55] hover:border-[#c3ccd3] transition-colors cursor-pointer"
                      >
                        ‹ Back
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep("layoff-q5");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#0eb28d] hover:bg-[#0c8f72] text-white text-sm font-bold shadow-[0_8px_18px_-6px_rgba(14,178,141,0.6)] transition-all cursor-pointer"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}

                {/* ── QUESTION 5 OF 5: HOW MUCH ADVANCE NOTICE DID THEY GIVE YOU? ── */}
                {currentStep === "layoff-q5" && (
                  <div>
                    <div className="font-bold text-[15px] sm:text-[16px] text-[#062c55] mb-2.5">
                      How much advance notice did they give you?
                    </div>

                    {/* Mobile Explainer */}
                    {explainOn && (
                      <div className="md:hidden my-3 p-3.5 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                        <b className="block text-[#0c7a60] font-bold text-[11px] mb-1">Sixty days is the standard</b>
                        for a covered mass layoff or closing, the employer generally owes 60 days&apos; written notice. Paying you instead of notifying you can still be a shortfall.
                      </div>
                    )}

                    {/* Options: None / same day / 1–2 weeks / 3–8 weeks / 60+ days */}
                    <div className="flex gap-2.5 flex-wrap">
                      {[
                        { k: "none", label: "None / same day" },
                        { k: "wk", label: "1–2 weeks" },
                        { k: "mid", label: "3–8 weeks" },
                        { k: "full", label: "60+ days" },
                      ].map((p) => {
                        const isSelected = state.notice === p.k;
                        return (
                          <button
                            key={p.k}
                            type="button"
                            onClick={() => setState({ ...state, notice: p.k })}
                            className={`px-5 py-2.5 rounded-lg text-[13.5px] sm:text-sm font-semibold transition-all cursor-pointer ${
                              isSelected
                                ? "bg-[#062c55] text-white border border-[#062c55] shadow-xs"
                                : "border border-[#dcd8cf] bg-white text-[#062c55] hover:border-[#b0bac3]"
                            }`}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Navigation */}
                    <div className="mt-8">
                      <div className="flex items-center justify-between mb-3.5">
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentStep("layoff-q4");
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-[#e7e4dd] bg-white text-xs font-bold text-[#5a6b78] hover:text-[#062c55] hover:border-[#c3ccd3] transition-colors cursor-pointer"
                        >
                          ‹ Back
                        </button>
                        <span className="text-xs font-bold text-[#0c8f72]">
                          Ready — continue below ↓
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep("papers-q1");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="w-full py-3.5 px-6 rounded-xl font-bold text-sm sm:text-base bg-[#0eb28d] hover:bg-[#0c8f72] text-white shadow-[0_8px_20px_-8px_rgba(14,178,141,0.7)] transition-all cursor-pointer"
                      >
                        Continue →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STEP 3: THE PAPERS (3 SEQUENTIAL SINGLE-QUESTION SCREENS)
            ════════════════════════════════════════════════════════════════ */}
            {isPapersStep && (
              <div className="bg-white border border-[#e7e4dd] rounded-[18px] p-6 sm:p-8 shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] animate-in fade-in duration-300">
                {/* Tag & 3-Dot Indicator */}
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-block text-xs font-semibold text-[#5a6b78] bg-white border border-[#e7e4dd] px-3 py-1 rounded-full">
                    The most important part
                  </span>
                  <div className="flex items-center gap-2 shrink-0 py-1" aria-label={`Question ${papersQIndex} of 3`}>
                    {[1, 2, 3].map((d) => (
                      <i
                        key={d}
                        className={`inline-block w-2 h-2 rounded-full transition-all duration-200 ${
                          d < papersQIndex
                            ? "bg-[#0eb28d]"
                            : d === papersQIndex
                            ? "bg-[#0eb28d] shadow-[0_0_0_3.5px_rgba(14,178,141,0.35)]"
                            : "bg-[#dcd8cf]"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Title & Subtitle */}
                <h1 className="font-serif font-normal text-[23px] sm:text-[27px] text-[#062c55] leading-[1.2] tracking-tight">
                  The papers they asked you to sign.
                </h1>
                <p className="text-[13.5px] sm:text-sm text-[#5a6b78] mt-2 mb-6 leading-relaxed">
                  If you&apos;re 40+ and they want you to give up age-discrimination claims, federal law (OWBPA) sets specific rules for the release. Whether any of them apply to you is worth understanding — it&apos;s what an attorney checks first.
                </p>

                {/* ── QUESTION 1 OF 3: DID THEY ASK YOU TO SIGN A RELEASE OR WAIVER? ── */}
                {(currentStep === "papers-q1" || currentStep === "step-money") && (
                  <div>
                    <div className="font-bold text-[15px] sm:text-[16px] text-[#062c55] mb-2.5">
                      Did they ask you to sign a release or waiver to get the money?
                    </div>

                    {/* Mobile Explainer */}
                    {explainOn && (
                      <div className="md:hidden my-3 p-3.5 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                        <b className="block text-[#0c7a60] font-bold text-[11px] mb-1">The release is the whole deal</b>
                        a release means you give up the right to bring claims in exchange for the money. If you&apos;re 40+ and it covers age claims, federal law sets rules for how it must be offered.
                      </div>
                    )}

                    {/* Options: Yes / No / Not sure */}
                    <div className="flex gap-2.5 flex-wrap">
                      {[
                        { k: "yes", label: "Yes" },
                        { k: "no", label: "No" },
                        { k: "unsure", label: "Not sure" },
                      ].map((p) => {
                        const isSelected = state.release === p.k;
                        return (
                          <button
                            key={p.k}
                            type="button"
                            onClick={() => setState({ ...state, release: p.k })}
                            className={`px-5 py-2.5 rounded-lg text-[13.5px] sm:text-sm font-semibold transition-all cursor-pointer ${
                              isSelected
                                ? "bg-[#062c55] text-white border border-[#062c55] shadow-xs"
                                : "border border-[#dcd8cf] bg-white text-[#062c55] hover:border-[#b0bac3]"
                            }`}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Navigation */}
                    <div className="mt-8 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep("layoff-q5");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-[#e7e4dd] bg-white text-xs font-bold text-[#5a6b78] hover:text-[#062c55] hover:border-[#c3ccd3] transition-colors cursor-pointer"
                      >
                        ‹ Back
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep("papers-q2");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#0eb28d] hover:bg-[#0c8f72] text-white text-sm font-bold shadow-[0_8px_18px_-6px_rgba(14,178,141,0.6)] transition-all cursor-pointer"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}

                {/* ── QUESTION 2 OF 3: WHAT ARE THEY OFFERING YOU? ── */}
                {currentStep === "papers-q2" && (
                  <div>
                    <div className="font-bold text-[15px] sm:text-[16px] text-[#062c55] mb-2.5">
                      What are they offering you?
                    </div>

                    {/* Mobile Explainer */}
                    {explainOn && (
                      <div className="md:hidden my-3 p-3.5 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                        <b className="block text-[#0c7a60] font-bold text-[11px] mb-1">No minimum to compare to</b>
                        US law doesn&apos;t set a severance amount, so we won&apos;t judge the number. We show it in your summary and in your report next to what the agreement asks you to give up.
                      </div>
                    )}

                    <input
                      type="text"
                      inputMode="numeric"
                      value={state.offer || ""}
                      placeholder="22154"
                      onChange={(e) => {
                        const val = parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0;
                        setState({ ...state, offer: val });
                      }}
                      className="w-full border border-[#0eb28d] rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-[#0eb28d] bg-white text-[#17242f] shadow-xs"
                    />

                    {/* Navigation */}
                    <div className="mt-8 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep("papers-q1");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-[#e7e4dd] bg-white text-xs font-bold text-[#5a6b78] hover:text-[#062c55] hover:border-[#c3ccd3] transition-colors cursor-pointer"
                      >
                        ‹ Back
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep("papers-q3");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#0eb28d] hover:bg-[#0c8f72] text-white text-sm font-bold shadow-[0_8px_18px_-6px_rgba(14,178,141,0.6)] transition-all cursor-pointer"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}

                {/* ── QUESTION 3 OF 3: PROMISE SEVERANCE ── */}
                {currentStep === "papers-q3" && (
                  <div>
                    <div className="font-bold text-[15px] sm:text-[16px] text-[#062c55] mb-2.5">
                      Does your offer letter, contract or employee handbook promise severance?
                    </div>

                    {/* Mobile Explainer */}
                    {explainOn && (
                      <div className="md:hidden my-3 p-3.5 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                        <b className="block text-[#0c7a60] font-bold text-[11px] mb-1">A written promise is the only minimum</b>
                        no law requires severance, but a severance policy, an offer-letter clause or a handbook section can. If one exists, the offer has to match it.
                      </div>
                    )}

                    {/* Options: Yes — it's written down somewhere (full width on mobile) / No / Not sure */}
                    <div className="flex flex-wrap gap-2.5">
                      <button
                        type="button"
                        onClick={() => setState({ ...state, promise: "yes" })}
                        className={`w-full sm:w-auto px-5 py-2.5 rounded-lg text-[13.5px] sm:text-sm font-semibold transition-all cursor-pointer ${
                          state.promise === "yes"
                            ? "bg-[#062c55] text-white border border-[#062c55] shadow-xs"
                            : "border border-[#dcd8cf] bg-white text-[#062c55] hover:border-[#b0bac3]"
                        }`}
                      >
                        Yes — it&apos;s written down somewhere
                      </button>
                      <button
                        type="button"
                        onClick={() => setState({ ...state, promise: "no" })}
                        className={`flex-1 sm:flex-none px-5 py-2.5 rounded-lg text-[13.5px] sm:text-sm font-semibold transition-all cursor-pointer ${
                          state.promise === "no"
                            ? "bg-[#062c55] text-white border border-[#062c55] shadow-xs"
                            : "border border-[#dcd8cf] bg-white text-[#062c55] hover:border-[#b0bac3]"
                        }`}
                      >
                        No
                      </button>
                      <button
                        type="button"
                        onClick={() => setState({ ...state, promise: "unsure" })}
                        className={`flex-1 sm:flex-none px-5 py-2.5 rounded-lg text-[13.5px] sm:text-sm font-semibold transition-all cursor-pointer ${
                          state.promise === "unsure"
                            ? "bg-[#062c55] text-white border border-[#062c55] shadow-xs"
                            : "border border-[#dcd8cf] bg-white text-[#062c55] hover:border-[#b0bac3]"
                        }`}
                      >
                        Not sure
                      </button>
                    </div>

                    {/* Navigation */}
                    <div className="mt-8">
                      <div className="flex items-center justify-between mb-3.5">
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentStep("papers-q2");
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-[#e7e4dd] bg-white text-xs font-bold text-[#5a6b78] hover:text-[#062c55] hover:border-[#c3ccd3] transition-colors cursor-pointer"
                        >
                          ‹ Back
                        </button>
                        <span className="text-xs font-bold text-[#0c8f72]">
                          Ready — continue below ↓
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep("clause-q1");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="w-full py-3.5 px-6 rounded-xl font-bold text-sm sm:text-base bg-[#0eb28d] hover:bg-[#0c8f72] text-white shadow-[0_8px_20px_-8px_rgba(14,178,141,0.7)] transition-all cursor-pointer"
                      >
                        Continue →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STEP 4: THE MOST IMPORTANT QUESTION (4 SEQUENTIAL SCREENS)
            ════════════════════════════════════════════════════════════════ */}
            {isClauseStep && (
              <div className="bg-white border border-[#e7e4dd] rounded-[18px] p-6 sm:p-8 shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] animate-in fade-in duration-300">
                {/* Upper Badge & 4 Progress Dots */}
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-block text-xs font-semibold text-[#5a6b78] bg-white border border-[#e7e4dd] px-3 py-1 rounded-full">
                    The most important question
                  </span>
                  <div className="flex items-center gap-2 shrink-0 py-1" aria-label={`Question ${clauseQIndex} of 4`}>
                    {[1, 2, 3, 4].map((d) => (
                      <i
                        key={d}
                        className={`inline-block w-2 h-2 rounded-full transition-all duration-200 ${
                          d < clauseQIndex
                            ? "bg-[#0eb28d]"
                            : d === clauseQIndex
                            ? "bg-[#0eb28d] shadow-[0_0_0_3.5px_rgba(14,178,141,0.35)]"
                            : "bg-[#dcd8cf]"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Title & Subtitle */}
                <h1 className="font-serif font-normal text-[23px] sm:text-[27px] text-[#062c55] leading-[1.2] tracking-tight">
                  How long did they give you — and can you take it back?
                </h1>
                <p className="text-[13.5px] sm:text-sm text-[#5a6b78] mt-2 mb-6 leading-relaxed">
                  If you&apos;re 40 or older and they want you to give up age-discrimination claims, federal law sets a minimum time to consider (21 days alone, 45 in a group program) and 7 days to change your mind after signing. Whether that applies to you is the first thing an attorney checks.
                </p>

                {/* ── QUESTION 1 OF 4: How long did they give you to decide? ── */}
                {(currentStep === "clause-q1" || currentStep === "step-clause") && (
                  <div className="animate-in fade-in duration-200">
                    <h2 className="text-sm sm:text-base font-bold text-[#062c55] mb-3">
                      How long did they give you to decide?
                    </h2>

                    {/* Mobile In-card explanation */}
                    {explainOn && (
                      <div className="lg:hidden mb-4 p-3.5 rounded-xl border-l-[3px] border-[#0eb28d] bg-[#f3faf6] border border-[#cfe8dd]">
                        <b className="block text-[11px] font-extrabold tracking-wider uppercase text-[#0c8f72] mb-1">
                          THEIR DEADLINE ISN&apos;T THE LAW&apos;S
                        </b>
                        <span className="text-xs text-[#2b3a45] leading-relaxed">
                          If you&apos;re 40+ and giving up age claims, the law says you must be offered at least 21 days to consider (45 in a group program). A shorter deadline is the most common slip.
                        </span>
                      </div>
                    )}

                    {/* Option Pills */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {[
                        { k: "short", label: "Under 21 days" },
                        { k: "mid", label: "21–44 days" },
                        { k: "full", label: "45+ days" },
                        { k: "unsure", label: "Not sure" },
                      ].map((item) => (
                        <button
                          key={item.k}
                          type="button"
                          onClick={() => setState((prev) => ({ ...prev, deadline: item.k, clause: item.k }))}
                          className={`px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-semibold sm:font-bold transition-all cursor-pointer ${
                            state.deadline === item.k
                              ? "bg-[#062c55] text-white shadow-sm"
                              : "border border-[#e0ddd4] bg-white text-[#5a6b78] hover:border-[#c3ccd3]"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep("papers-q3");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-[#e7e4dd] bg-white text-xs font-bold text-[#5a6b78] hover:text-[#062c55] hover:border-[#c3ccd3] transition-colors cursor-pointer"
                      >
                        ‹ Back
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep("clause-q2");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="py-2.5 px-6 rounded-xl font-bold text-xs sm:text-sm bg-[#0eb28d] hover:bg-[#0c8f72] text-white shadow-[0_8px_20px_-8px_rgba(14,178,141,0.7)] transition-all cursor-pointer"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}

                {/* ── QUESTION 2 OF 4: Does it tell you in writing to talk to an attorney? ── */}
                {currentStep === "clause-q2" && (
                  <div className="animate-in fade-in duration-200">
                    <h2 className="text-sm sm:text-base font-bold text-[#062c55] mb-3">
                      Does the agreement tell you, in writing, to talk to an attorney before signing?
                    </h2>

                    {/* Mobile In-card explanation */}
                    {explainOn && (
                      <div className="lg:hidden mb-4 p-3.5 rounded-xl border-l-[3px] border-[#0eb28d] bg-[#f3faf6] border border-[#cfe8dd]">
                        <b className="block text-[11px] font-extrabold tracking-wider uppercase text-[#0c8f72] mb-1">
                          IT HAS TO SAY SO
                        </b>
                        <span className="text-xs text-[#2b3a45] leading-relaxed">
                          An age-40+ release must advise you in writing to consult an attorney. Missing that line is one of the things that can make the waiver unenforceable.
                        </span>
                      </div>
                    )}

                    {/* Option Pills */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {[
                        { k: "yes", label: "Yes" },
                        { k: "no", label: "No" },
                        { k: "unsure", label: "Not sure" },
                      ].map((item) => (
                        <button
                          key={item.k}
                          type="button"
                          onClick={() => setState((prev) => ({ ...prev, advise: item.k }))}
                          className={`px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-semibold sm:font-bold transition-all cursor-pointer ${
                            state.advise === item.k
                              ? "bg-[#062c55] text-white shadow-sm"
                              : "border border-[#e0ddd4] bg-white text-[#5a6b78] hover:border-[#c3ccd3]"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep("clause-q1");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-[#e7e4dd] bg-white text-xs font-bold text-[#5a6b78] hover:text-[#062c55] hover:border-[#c3ccd3] transition-colors cursor-pointer"
                      >
                        ‹ Back
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep("clause-q3");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="py-2.5 px-6 rounded-xl font-bold text-xs sm:text-sm bg-[#0eb28d] hover:bg-[#0c8f72] text-white shadow-[0_8px_20px_-8px_rgba(14,178,141,0.7)] transition-all cursor-pointer"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}

                {/* ── QUESTION 3 OF 4: Did they give you the list of ages and job titles? ── */}
                {currentStep === "clause-q3" && (
                  <div className="animate-in fade-in duration-200">
                    <h2 className="text-sm sm:text-base font-bold text-[#062c55] mb-3">
                      Did they give you a list of the ages and job titles of who was let go and who was kept?
                    </h2>

                    {/* Mobile In-card explanation */}
                    {explainOn && (
                      <div className="lg:hidden mb-4 p-3.5 rounded-xl border-l-[3px] border-[#0eb28d] bg-[#f3faf6] border border-[#cfe8dd]">
                        <b className="block text-[11px] font-extrabold tracking-wider uppercase text-[#0c8f72] mb-1">
                          THE LIST IS REQUIRED IN A GROUP PROGRAM
                        </b>
                        <span className="text-xs text-[#2b3a45] leading-relaxed">
                          For an age-40+ group layoff, the employer must disclose the job titles and ages of who was selected and who wasn&apos;t. It&apos;s how you&apos;d spot a pattern.
                        </span>
                      </div>
                    )}

                    {/* Option Pills */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {[
                        { k: "yes", label: "Yes" },
                        { k: "no", label: "No" },
                        { k: "unsure", label: "Not sure" },
                      ].map((item) => (
                        <button
                          key={item.k}
                          type="button"
                          onClick={() => setState((prev) => ({ ...prev, list: item.k }))}
                          className={`px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-semibold sm:font-bold transition-all cursor-pointer ${
                            state.list === item.k
                              ? "bg-[#062c55] text-white shadow-sm"
                              : "border border-[#e0ddd4] bg-white text-[#5a6b78] hover:border-[#c3ccd3]"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep("clause-q2");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-[#e7e4dd] bg-white text-xs font-bold text-[#5a6b78] hover:text-[#062c55] hover:border-[#c3ccd3] transition-colors cursor-pointer"
                      >
                        ‹ Back
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep("clause-q4");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="py-2.5 px-6 rounded-xl font-bold text-xs sm:text-sm bg-[#0eb28d] hover:bg-[#0c8f72] text-white shadow-[0_8px_20px_-8px_rgba(14,178,141,0.7)] transition-all cursor-pointer"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}

                {/* ── QUESTION 4 OF 4: Does it give you 7 days after signing to change your mind? ── */}
                {currentStep === "clause-q4" && (
                  <div className="animate-in fade-in duration-200">
                    <h2 className="text-sm sm:text-base font-bold text-[#062c55] mb-3">
                      Does it give you 7 days after signing to change your mind?
                    </h2>

                    {/* Mobile In-card explanation */}
                    {explainOn && (
                      <div className="lg:hidden mb-4 p-3.5 rounded-xl border-l-[3px] border-[#0eb28d] bg-[#f3faf6] border border-[#cfe8dd]">
                        <b className="block text-[11px] font-extrabold tracking-wider uppercase text-[#0c8f72] mb-1">
                          SEVEN DAYS TO TAKE IT BACK
                        </b>
                        <span className="text-xs text-[#2b3a45] leading-relaxed">
                          An age-40+ release must give you 7 days after signing to revoke it, and that can&apos;t be waived. If the agreement doesn&apos;t say so, that&apos;s worth an attorney&apos;s look.
                        </span>
                      </div>
                    )}

                    {/* Option Pills */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {[
                        { k: "yes", label: "Yes" },
                        { k: "no", label: "No / not mentioned" },
                        { k: "unsure", label: "Not sure" },
                      ].map((item) => (
                        <button
                          key={item.k}
                          type="button"
                          onClick={() => setState((prev) => ({ ...prev, revoke: item.k }))}
                          className={`px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-semibold sm:font-bold transition-all cursor-pointer ${
                            state.revoke === item.k
                              ? "bg-[#062c55] text-white shadow-sm"
                              : "border border-[#e0ddd4] bg-white text-[#5a6b78] hover:border-[#c3ccd3]"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {/* Navigation Buttons for Question 4: Back on left, Ready text on right, Continue full button below */}
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentStep("clause-q3");
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-[#e7e4dd] bg-white text-xs font-bold text-[#5a6b78] hover:text-[#062c55] hover:border-[#c3ccd3] transition-colors cursor-pointer"
                        >
                          ‹ Back
                        </button>
                        <span className="text-xs font-bold text-[#0c8f72]">
                          Ready — continue below ↓
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep("details-q1");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="w-full py-3.5 px-6 rounded-xl font-bold text-sm sm:text-base bg-[#0eb28d] hover:bg-[#0c8f72] text-white shadow-[0_8px_20px_-8px_rgba(14,178,141,0.7)] transition-all cursor-pointer"
                      >
                        Continue →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STEP 5: DETAILS (2 SEQUENTIAL SINGLE-QUESTION SCREENS)
            ════════════════════════════════════════════════════════════════ */}
            {isDetailsStep && (
              <div className="bg-white border border-[#e7e4dd] rounded-[18px] p-6 sm:p-8 shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] animate-in fade-in duration-300">
                {/* Upper Badge & 2 Progress Dots */}
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-block text-xs font-semibold text-[#5a6b78] bg-white border border-[#e7e4dd] px-3 py-1 rounded-full">
                    Almost done
                  </span>
                  <div className="flex items-center gap-2 shrink-0 py-1" aria-label={`Question ${detailsQIndex} of 2`}>
                    {[1, 2].map((d) => (
                      <i
                        key={d}
                        className={`inline-block w-2 h-2 rounded-full transition-all duration-200 ${
                          d < detailsQIndex
                            ? "bg-[#0eb28d]"
                            : d === detailsQIndex
                            ? "bg-[#0eb28d] shadow-[0_0_0_3.5px_rgba(14,178,141,0.35)]"
                            : "bg-[#dcd8cf]"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Title */}
                <h1 className="font-serif font-normal text-[23px] sm:text-[27px] text-[#062c55] leading-[1.2] tracking-tight mb-4">
                  A couple more quick taps
                </h1>

                {/* ── QUESTION 1 OF 2: Anything else you'd flag? ── */}
                {(currentStep === "details-q1" || currentStep === "step-details") && (
                  <div className="animate-in fade-in duration-200">
                    <h2 className="text-sm sm:text-base font-bold text-[#062c55] mb-3">
                      Anything else you&apos;d flag?
                    </h2>

                    {/* Mobile In-card explanation */}
                    {explainOn && (
                      <div className="lg:hidden mb-4 p-3.5 rounded-xl border-l-[3px] border-[#0eb28d] bg-[#f3faf6] border border-[#cfe8dd]">
                        <b className="block text-[11px] font-extrabold tracking-wider uppercase text-[#0c8f72] mb-1">
                          SEPARATE CLAIMS, ON TOP OF SEVERANCE
                        </b>
                        <span className="text-xs text-[#2b3a45] leading-relaxed">
                          Discrimination or retaliation is its own claim. Unpaid wages, bonus or PTO are owed regardless of what you sign. Both change what an attorney looks at first.
                        </span>
                      </div>
                    )}

                    {/* Option Pills */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {[
                        { k: "none", label: "Nothing unusual" },
                        { k: "discrim", label: "Felt discriminatory / retaliatory" },
                        { k: "unpaid", label: "Unpaid wages / bonus / PTO" },
                      ].map((item) => (
                        <button
                          key={item.k}
                          type="button"
                          onClick={() => setState((prev) => ({ ...prev, redflag: item.k }))}
                          className={`px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-semibold sm:font-bold transition-all cursor-pointer ${
                            state.redflag === item.k
                              ? "bg-[#062c55] text-white shadow-sm"
                              : "border border-[#e0ddd4] bg-white text-[#5a6b78] hover:border-[#c3ccd3]"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep("clause-q4");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-[#e7e4dd] bg-white text-xs font-bold text-[#5a6b78] hover:text-[#062c55] hover:border-[#c3ccd3] transition-colors cursor-pointer"
                      >
                        ‹ Back
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep("details-q2");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="py-2.5 px-6 rounded-xl font-bold text-xs sm:text-sm bg-[#0eb28d] hover:bg-[#0c8f72] text-white shadow-[0_8px_20px_-8px_rgba(14,178,141,0.7)] transition-all cursor-pointer"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}

                {/* ── QUESTION 2 OF 2: Is there a non-compete in your agreement? ── */}
                {currentStep === "details-q2" && (
                  <div className="animate-in fade-in duration-200">
                    <h2 className="text-sm sm:text-base font-bold text-[#062c55] mb-3">
                      Is there a non-compete in your agreement?
                    </h2>

                    {/* Mobile In-card explanation */}
                    {explainOn && (
                      <div className="lg:hidden mb-4 p-3.5 rounded-xl border-l-[3px] border-[#0eb28d] bg-[#f3faf6] border border-[#cfe8dd]">
                        <b className="block text-[11px] font-extrabold tracking-wider uppercase text-[#0c8f72] mb-1">
                          DEPENDS ENTIRELY ON YOUR STATE
                        </b>
                        <span className="text-xs text-[#2b3a45] leading-relaxed">
                          Some states void non-competes outright, others enforce them. If one is in your agreement, whether it can stop you working is a state-law question.
                        </span>
                      </div>
                    )}

                    {/* Option Pills */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {[
                        { k: "yes", label: "Yes" },
                        { k: "no", label: "No" },
                        { k: "unsure", label: "Not sure" },
                      ].map((item) => (
                        <button
                          key={item.k}
                          type="button"
                          onClick={() => setState((prev) => ({ ...prev, nc: item.k }))}
                          className={`px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-semibold sm:font-bold transition-all cursor-pointer ${
                            state.nc === item.k
                              ? "bg-[#062c55] text-white shadow-sm"
                              : "border border-[#e0ddd4] bg-white text-[#5a6b78] hover:border-[#c3ccd3]"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {/* Navigation Buttons for Question 2 */}
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentStep("details-q1");
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-[#e7e4dd] bg-white text-xs font-bold text-[#5a6b78] hover:text-[#062c55] hover:border-[#c3ccd3] transition-colors cursor-pointer"
                        >
                          ‹ Back
                        </button>
                        <span className="text-xs font-bold text-[#0c8f72]">
                          Ready — continue below ↓
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep("step-analyzing");
                          setTimeout(() => {
                            setCurrentStep("step-results");
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }, 1000);
                        }}
                        className="w-full py-3.5 px-6 rounded-xl font-bold text-sm sm:text-base bg-[#0eb28d] hover:bg-[#0c8f72] text-white shadow-[0_8px_20px_-8px_rgba(14,178,141,0.7)] transition-all cursor-pointer"
                      >
                        See my results →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STEP: ANALYZING
            ════════════════════════════════════════════════════════════════ */}
            {currentStep === "step-analyzing" && (
              <div className="bg-white border border-[#e7e4dd] rounded-[18px] p-12 text-center shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] animate-in fade-in duration-300">
                <div className="w-12 h-12 border-4 border-[#e6e2d8] border-t-[#0eb28d] rounded-full mx-auto mb-5 animate-spin" />
                <h1 className="font-serif font-medium text-2xl text-[#062c55] mb-2">Analyzing your separation offer…</h1>
                <p className="text-sm text-[#5a6b78]">Checking federal and {state.usState} employment rules.</p>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STEP 6: RESULTS & VERDICT
            ════════════════════════════════════════════════════════════════ */}
            {currentStep === "step-results" && (
              <div className="bg-white border border-[#e7e4dd] rounded-[18px] p-6 sm:p-8 shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] animate-in fade-in duration-300">
                <div className="text-center p-6 bg-gradient-to-b from-[#fbfdfc] to-[#eef8f3] border border-[#c7e6d6] rounded-2xl mb-6">
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#0c8f72]">
                    Review recommended
                  </span>
                  <h2 className="font-serif font-bold text-2xl sm:text-3xl text-[#062c55] my-2">
                    A few things here are worth understanding before you sign.
                  </h2>
                  <p className="text-sm text-[#17242f] max-w-[500px] mx-auto leading-relaxed">
                    Some of what you told us is worth understanding before you decide. A quick attorney conversation is a good way to verify your severance rights in {state.usState}.
                  </p>

                  <div className="mt-4 text-left max-w-[420px] mx-auto space-y-1.5 text-xs text-[#17242f]">
                    <div className="flex gap-2 items-center">
                      <span className="text-[#0c8f72] font-bold">✓</span>
                      <span>Solid compensation — {money(parseFloat(state.salary))}/yr</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className="text-[#0c8f72] font-bold">✓</span>
                      <span>{state.years} years of service</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className="text-[#0c8f72] font-bold">✓</span>
                      <span>Governed by {state.usState} &amp; federal separation law</span>
                    </div>
                  </div>
                </div>

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
                      <h4 className="font-serif font-bold text-lg text-[#062c55] mt-1 mb-2">Talk to an attorney</h4>
                      <div className="font-serif text-2xl font-bold text-[#062c55] mb-2">Free</div>
                      <p className="text-xs text-[#5a6b78] leading-relaxed">
                        Your best shot at the full number — and it&apos;s free for us to connect you.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => alert("Connecting with licensed employment attorney...")}
                      className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-[#0eb28d] to-[#0c8f72] text-white text-xs font-extrabold shadow-md hover:shadow-lg transition-all cursor-pointer"
                    >
                      Ask an attorney to contact me — free
                    </button>
                  </div>
                </div>

                <div className="mt-8 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep("us-situation-q1");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="text-xs font-bold text-[#5a6b78] hover:text-[#062c55] cursor-pointer"
                  >
                    ← Start over
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: DESKTOP SIDEBAR ── */}
          <aside className="hidden lg:block w-full sticky top-20 lg:pt-[82px]">
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
                  <span className="text-[#5a6b78]">State</span>
                  <b className="text-[#062c55] font-semibold">{state.usState || "California"}</b>
                </div>
                <div className="flex justify-between py-1 border-b border-dashed border-[#e7e4dd]">
                  <span className="text-[#5a6b78]">Age</span>
                  <b className="text-[#062c55] font-semibold">{state.age || "52"}</b>
                </div>
                <div className="flex justify-between py-1 border-b border-dashed border-[#e7e4dd]">
                  <span className="text-[#5a6b78]">Years of service</span>
                  <b className="text-[#062c55] font-semibold">{state.years ? `${state.years} yrs` : "9 yrs"}</b>
                </div>
                <div className="flex justify-between py-1 border-b border-dashed border-[#e7e4dd]">
                  <span className="text-[#5a6b78]">Pay</span>
                  <b className="text-[#062c55] font-semibold">
                    {state.salary ? `${kMoney(parseFloat(state.salary))}/yr` : "$128k/yr"}
                  </b>
                </div>
                <div className="flex justify-between py-1 border-b border-dashed border-[#e7e4dd]">
                  <span className="text-[#5a6b78]">On top of base</span>
                  <b className="text-[#062c55] font-semibold">{compText}</b>
                </div>
                {state.union && (
                  <div className="flex justify-between py-1 border-b border-dashed border-[#e7e4dd]">
                    <span className="text-[#5a6b78]">Union contract</span>
                    <b className="text-[#062c55] font-semibold">{unionMap[state.union] || state.union}</b>
                  </div>
                )}
                {state.ended && (
                  <div className="flex justify-between py-1 border-b border-dashed border-[#e7e4dd]">
                    <span className="text-[#5a6b78]">How it ended</span>
                    <b className="text-[#062c55] font-semibold">{endedMap[state.ended] || state.ended}</b>
                  </div>
                )}
                {state.empsize && (
                  <div className="flex justify-between py-1 border-b border-dashed border-[#e7e4dd]">
                    <span className="text-[#5a6b78]">Employer size</span>
                    <b className="text-[#062c55] font-semibold">{empsizeMap[state.empsize] || state.empsize}</b>
                  </div>
                )}
                {state.others && (
                  <div className="flex justify-between py-1 border-b border-dashed border-[#e7e4dd]">
                    <span className="text-[#5a6b78]">At your site</span>
                    <b className="text-[#062c55] font-semibold">{othersMap[state.others] || state.others}</b>
                  </div>
                )}
                {state.notice && (
                  <div className="flex justify-between py-1 border-b border-dashed border-[#e7e4dd]">
                    <span className="text-[#5a6b78]">Advance notice</span>
                    <b className="text-[#062c55] font-semibold">{noticeMap[state.notice] || state.notice}</b>
                  </div>
                )}
                {state.release && (
                  <div className="flex justify-between py-1 border-b border-dashed border-[#e7e4dd]">
                    <span className="text-[#5a6b78]">Release asked?</span>
                    <b className="text-[#062c55] font-semibold">{state.release === "yes" ? "Yes" : state.release === "no" ? "No" : "Not sure"}</b>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-dashed border-[#e7e4dd]">
                  <span className="text-[#5a6b78]">Offer</span>
                  <b className="text-[#062c55] font-semibold">{state.offer ? kMoney(state.offer) : "$22k"}</b>
                </div>
                {state.promise && (
                  <div className="flex justify-between py-1 border-b border-dashed border-[#e7e4dd]">
                    <span className="text-[#5a6b78]">Severance promised in writing?</span>
                    <b className="text-[#062c55] font-semibold">{state.promise === "yes" ? "Yes" : state.promise === "no" ? "No" : "Not sure"}</b>
                  </div>
                )}
                {state.deadline && (
                  <div className="flex justify-between py-1 border-b border-dashed border-[#e7e4dd]">
                    <span className="text-[#5a6b78]">Days to decide</span>
                    <b className="text-[#062c55] font-semibold">
                      {{ short: "Under 21", mid: "21–44 days", full: "45+ days", unsure: "Not sure" }[state.deadline] || state.deadline}
                    </b>
                  </div>
                )}
                {state.advise && (
                  <div className="flex justify-between py-1 border-b border-dashed border-[#e7e4dd]">
                    <span className="text-[#5a6b78]">Told to see an attorney?</span>
                    <b className="text-[#062c55] font-semibold">
                      {{ yes: "Yes", no: "No", unsure: "Not sure" }[state.advise] || state.advise}
                    </b>
                  </div>
                )}
                {state.list && (
                  <div className="flex justify-between py-1 border-b border-dashed border-[#e7e4dd]">
                    <span className="text-[#5a6b78]">Got the list?</span>
                    <b className="text-[#062c55] font-semibold">
                      {{ yes: "Yes", no: "No", unsure: "Not sure" }[state.list] || state.list}
                    </b>
                  </div>
                )}
                {state.revoke && (
                  <div className="flex justify-between py-1 border-b border-dashed border-[#e7e4dd]">
                    <span className="text-[#5a6b78]">7-day take-back</span>
                    <b className="text-[#062c55] font-semibold">
                      {{ yes: "Yes", no: "Not mentioned", unsure: "Not sure" }[state.revoke] || state.revoke}
                    </b>
                  </div>
                )}
              </div>

              {/* Live Read Section (US) */}
              <div className="mt-4 pt-3 border-t border-[#d3dae1]">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#5a6b78]">
                  Live read · not an assessment
                </div>
                <div className="font-serif text-[21px] font-bold text-[#0c8f72] my-1">
                  5 things to check
                </div>
                <div className="text-[11px] text-[#5a6b78] leading-relaxed mb-2.5 space-y-1">
                  <div>• Time to consider looks short</div>
                  <div>• A 7-day period to change your mind is a common requirement for age-40+ releases</div>
                  <div>• For an age-40+ group program, the law requires a disclosure of the ages &amp; job titles selected</div>
                </div>
                <span className="inline-block text-[10.5px] font-bold text-[#0c7a60] bg-[#e6f5ef] border border-[#b9e6d4] px-2 py-0.5 rounded">
                  ✓ Enough to show your results
                </span>
              </div>
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
