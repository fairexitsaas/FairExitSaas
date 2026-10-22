"use client";

import React, { useState, useEffect, useMemo } from "react";
import NextLink from "next/link";
import { useSearchParams } from "next/navigation";
import { QuestionBackButton, QuestionNextButton } from "@/components/common/QuestionNavButtons";
import ChecklistModal from "@/components/dialogs/ChecklistModal";
import AskLawyerModal from "@/components/dialogs/AskLawyerModal";
import { triggerGetApp } from "@/context/GetAppContext";
import { useAccessibility } from "@/context/AccessibilityContext";

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
    return (
      "$" + (m >= 10 ? Math.round(m) : m.toFixed(1).replace(/\.0$/, "")) + "M"
    );
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
  const [notifiedState, setNotifiedState] = useState<boolean>(false);
  const [infoModal, setInfoModal] = useState<null | "report" | "lawyer">(null);
  const [checklistOpen, setChecklistOpen] = useState<boolean>(false);
  const [askLawyerOpen, setAskLawyerOpen] = useState<boolean>(false);
  const [emailModalOpen, setEmailModalOpen] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState<string>("");
  const [emailSent, setEmailSent] = useState<boolean>(false);
  const { toggleDialog } = useAccessibility();

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

  const unionMap: Record<string, string> = {
    yes: "Yes",
    no: "No",
    unsure: "Not sure",
  };
  const endedMap: Record<string, string> = {
    layoff: "Laid off",
    closure: "Site closed",
    mass: "Big group",
    cause: "For cause",
  };
  const empsizeMap: Record<string, string> = {
    small: "Under 100",
    big: "100+",
    unsure: "Not sure",
  };
  const othersMap: Record<string, string> = {
    me: "Just me",
    few: "A handful",
    "50": "50+",
    unsure: "Not sure",
  };
  const noticeMap: Record<string, string> = {
    none: "None",
    wk: "1–2 wks",
    mid: "3–8 wks",
    full: "60+ days",
  };

  const compList = useMemo(
    () => Object.keys(state.comp).filter((k) => state.comp[k]),
    [state.comp],
  );
  const compText = useMemo(() => {
    return compList.length
      ? compList
          .map(
            (k) =>
              ({
                bonus: "Bonus",
                equity: "Equity",
                pto: "PTO",
                benefits: "Benefits",
              })[k] || k,
          )
          .join(", ")
      : "None";
  }, [compList]);

  const US_SUMMARY_FIELDS = [
    { key: "usState", label: "State" },
    { key: "age", label: "Age" },
    { key: "years", label: "Years of service" },
    { key: "salary", label: "Pay" },
    { key: "comp", label: "On top of base" },
    { key: "union", label: "Union contract" },
    { key: "ended", label: "How it ended" },
    { key: "empsize", label: "Employer size" },
    { key: "others", label: "At your site" },
    { key: "notice", label: "Advance notice" },
    { key: "release", label: "Release asked?" },
    { key: "offer", label: "Offer" },
    { key: "promise", label: "Severance promised in writing?" },
    { key: "deadline", label: "Days to decide" },
    { key: "advise", label: "Told to see an attorney?" },
    { key: "list", label: "Got the list?" },
    { key: "revoke", label: "7-day take-back" },
    { key: "redflag", label: "Anything flagged" },
    { key: "nc", label: "Non-compete" },
  ];

  const STEP_ORDER_INDEX: Record<string, number> = {
    "us-situation-q1": 1,
    "us-situation-q2": 2,
    "us-situation-q3": 3,
    "us-situation-q4": 4,
    "us-situation-q5": 5,
    "step-basics": 6,
    "layoff-q1": 6,
    "layoff-q2": 7,
    "layoff-q3": 8,
    "layoff-q4": 9,
    "layoff-q5": 10,
    "step-money": 11,
    "papers-q1": 11,
    "papers-q2": 12,
    "papers-q3": 13,
    "step-clause": 14,
    "clause-q1": 14,
    "clause-q2": 15,
    "clause-q3": 16,
    "clause-q4": 17,
    "step-details": 18,
    "details-q1": 18,
    "details-q2": 19,
    "step-analyzing": 20,
    "step-results": 21,
  };

  const FIELD_TRIGGER_INDEX: Record<string, number> = {
    usState: 1,
    age: 2,
    years: 3,
    salary: 4,
    comp: 5,
    union: 6,
    ended: 7,
    empsize: 8,
    others: 9,
    notice: 10,
    release: 11,
    offer: 12,
    promise: 13,
    deadline: 14,
    advise: 15,
    list: 16,
    revoke: 17,
    redflag: 18,
    nc: 19,
  };

  const [maxStepIndex, setMaxStepIndex] = useState<number>(1);
  const [answeredFields, setAnsweredFields] = useState<Record<string, boolean>>({
    usState: true,
  });

  useEffect(() => {
    const curIdx = STEP_ORDER_INDEX[currentStep] || 1;
    setMaxStepIndex((prev) => Math.max(prev, curIdx));
  }, [currentStep]);

  const handleAnswer = (key: string, value: any) => {
    setState((prev) => ({ ...prev, [key]: value }));
    setAnsweredFields((prev) => ({ ...prev, [key]: true }));
  };

  const isFieldVisible = (key: string): boolean => {
    if (currentStep === "step-results" || currentStep === "step-analyzing") {
      return true;
    }
    const triggerIdx = FIELD_TRIGGER_INDEX[key] ?? 999;
    return maxStepIndex >= triggerIdx || Boolean(answeredFields[key]);
  };

  const getSummaryValue = (key: string): string => {
    switch (key) {
      case "usState":
        return state.usState || "California";
      case "age":
        return state.age || "52";
      case "years":
        return state.years ? `${state.years} yrs` : "9 yrs";
      case "salary":
        return state.salary
          ? `$${Math.round(parseFloat(state.salary) / 1000)}k/yr`
          : "$128k/yr";
      case "comp":
        return compText || "None";
      case "union":
        return state.union === "yes"
          ? "Yes"
          : state.union === "no"
            ? "No"
            : "Not sure";
      case "ended":
        return state.ended === "layoff"
          ? "Laid off"
          : state.ended === "closure"
            ? "Site closed"
            : state.ended === "mass"
              ? "Big group"
              : state.ended === "cause"
                ? "For cause"
                : (endedMap[state.ended] || "Laid off");
      case "empsize":
        return state.empsize === "big"
          ? "100+"
          : state.empsize === "small"
            ? "Under 100"
            : (empsizeMap[state.empsize] || "100+");
      case "others":
        return state.others === "50"
          ? "50+"
          : state.others === "few"
            ? "A handful"
            : state.others === "me"
              ? "Just me"
              : (othersMap[state.others] || "50+");
      case "notice":
        return state.notice === "none"
          ? "None"
          : state.notice === "wk"
            ? "1–2 wks"
            : state.notice === "mid"
              ? "3–8 wks"
              : state.notice === "full"
                ? "60+ days"
                : (noticeMap[state.notice] || "None");
      case "release":
        return state.release === "yes"
          ? "Yes"
          : state.release === "no"
            ? "No"
            : "Not sure";
      case "offer":
        return state.offer
          ? state.offer >= 1000
            ? `$${Math.round(state.offer / 1000)}k`
            : `$${state.offer}`
          : "$22k";
      case "promise":
        return state.promise === "yes"
          ? "Yes"
          : state.promise === "no"
            ? "No"
            : "Not sure";
      case "deadline":
        return state.deadline === "short"
          ? "Under 21"
          : state.deadline === "mid"
            ? "21–44 days"
            : state.deadline === "full"
              ? "45+ days"
              : "Not sure";
      case "advise":
        return state.advise === "yes"
          ? "Yes"
          : state.advise === "no"
            ? "No"
            : "Not sure";
      case "list":
        return state.list === "yes"
          ? "Yes"
          : state.list === "no"
            ? "No"
            : "Not sure";
      case "revoke":
        return state.revoke === "yes"
          ? "Yes"
          : state.revoke === "no"
            ? "Not mentioned"
            : "Not sure";
      case "redflag":
        return state.redflag === "discrim"
          ? "Mistreatment"
          : state.redflag === "unpaid"
            ? "Unpaid wages"
            : "Nothing unusual";
      case "nc":
        return state.nc === "yes"
          ? "Yes"
          : state.nc === "no"
            ? "No"
            : "Not sure";
      default:
        return "";
    }
  };

  const populateAllAnswers = (s: typeof state) => {
    setAnsweredFields({
      usState: true,
      age: true,
      years: true,
      salary: true,
      comp: true,
      union: true,
      ended: true,
      empsize: true,
      others: true,
      notice: true,
      release: true,
      offer: true,
      promise: true,
      deadline: true,
      advise: true,
      list: true,
      revoke: true,
      redflag: true,
      nc: true,
    });
  };

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
    const stepParam = searchParams.get("step");
    const loadingParam = searchParams.get("loading");

    setState((prev) => ({
      ...prev,
      usState: st || prev.usState,
      years: y ? y.replace(/\D/g, "") : prev.years,
      salary: s ? s.replace(/\D/g, "") : prev.salary,
      age: a ? a.replace(/\D/g, "") : age40 === "yes" ? "52" : prev.age,
      offer: off ? parseInt(off.replace(/\D/g, ""), 10) : prev.offer,
      groupLayoff: grp || prev.groupLayoff,
    }));

    if (stepParam === "loading" || loadingParam === "true") {
      setCurrentStep("step-analyzing");
      populateAllAnswers(state);
    } else if (stepParam === "results" || stepParam === "step-results") {
      setCurrentStep("step-results");
      populateAllAnswers(state);
    } else if (
      stepParam === "us-state-stop" ||
      stepParam === "stop" ||
      st === "Other state"
    ) {
      setCurrentStep("us-state-stop");
    } else {
      // Normal flow entry: always display questions from the beginning!
      setCurrentStep("us-situation-q1");
    }
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

  const isDetailsStep = ["details-q1", "details-q2", "step-details"].includes(
    currentStep,
  );

  const detailsQIndex = useMemo(() => {
    if (currentStep === "details-q1" || currentStep === "step-details")
      return 1;
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
      case "us-state-stop":
        return 28;
      case "step-analyzing":
      case "step-results":
        return 100;
      default:
        return 10;
    }
  }, [currentStep]);

  const activeRailIndex = useMemo(() => {
    if (currentStep === "us-state-stop") return 1;
    if (
      [
        "us-situation-q1",
        "us-situation-q2",
        "us-situation-q3",
        "us-situation-q4",
        "us-situation-q5",
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

  const handleExit = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setCurrentStep("us-situation-q1");
    setAnsweredFields({});
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-[#f6f4ef] text-[#17242f] font-sans antialiased pb-20 selection:bg-[#cbf3e4]">
      {/* ── HEADER NAVBAR ── */}
      <header className="sticky top-0 z-40 bg-[#f6f4ef]/90 backdrop-blur-md border-b border-[#e7e4dd]">
        <div className="max-w-[1160px] mx-auto px-4 sm:px-5 py-3 flex items-center justify-between">
          <NextLink
            href="/"
            className="inline-flex items-center gap-2 focus:outline-none shrink-0"
            aria-label="FairExit"
          >
            <img
              src="/fairexit-wordmark.png"
              alt="FairExit"
              className="h-[26px] w-auto"
            />
          </NextLink>

          <div className="flex items-center gap-5 sm:gap-6 ml-auto">
            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-5 sm:gap-6 text-[13.5px] font-semibold text-[#5a6b78]">
              <a
                href="/#how"
                className="hover:text-[#062c55] transition-colors"
              >
                How it works
              </a>
              <a
                href="/#paths"
                className="hover:text-[#062c55] transition-colors"
              >
                Pricing
              </a>
              <a href="/faq" className="hover:text-[#062c55] transition-colors">
                FAQ
              </a>
              <a
                href="/blog"
                className="hover:text-[#062c55] transition-colors"
              >
                Blog
              </a>
              <a
                href="/about"
                className="hover:text-[#062c55] transition-colors"
              >
                About
              </a>
            </nav>

            <button
              type="button"
              onClick={() => triggerGetApp()}
              className="hidden sm:inline-flex items-center text-[13px] font-bold text-[#0c8f72] hover:underline transition-colors whitespace-nowrap cursor-pointer"
            >
              Get the app
            </button>
            <button
              type="button"
              onClick={handleExit}
              className="hidden sm:inline-flex items-center text-[13px] font-semibold text-[#5a6b78] hover:text-[#062c55] transition-colors whitespace-nowrap cursor-pointer bg-transparent border-none p-0"
            >
              Exit ✕
            </button>

            {/* Mobile Your Details Trigger Button */}
            <button
              type="button"
              onClick={() => setMobileSummOpen(true)}
              className="md:hidden inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] border border-[#cfe8dd] bg-[#eef8f3] text-[13px] font-bold text-[#062c55] shadow-xs cursor-pointer"
              aria-expanded={mobileSummOpen}
            >
              Your details
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="w-3.5 h-3.5 text-[#062c55]"
              >
                <path
                  d="M6 9l6 6 6-6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {/* Hamburger for mobile */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-9 h-9 rounded-[10px] border border-[#d5dde4] bg-white text-[#062c55] flex items-center justify-center shadow-xs focus:outline-none cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                className="w-5 h-5"
              >
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#e7e4dd] bg-white px-5 py-4 space-y-3 text-sm font-bold text-[#062c55] animate-in fade-in">
            <a href="/#how" className="block py-1">
              How it works
            </a>
            <a href="/#paths" className="block py-1">
              Pricing
            </a>
            <a href="/faq" className="block py-1">
              FAQ
            </a>
            <a href="/blog" className="block py-1">
              Blog
            </a>
            <a href="/about" className="block py-1">
              About
            </a>
            <div className="pt-2 border-t border-[#e7e4dd] flex justify-between text-xs text-[#5a6b78]">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  triggerGetApp();
                }}
                className="font-bold text-[#0c8f72] cursor-pointer"
              >
                Get the app
              </button>
              <button
                type="button"
                onClick={handleExit}
                className="font-bold text-[#5a6b78] hover:text-[#062c55] cursor-pointer bg-transparent border-none p-0"
              >
                Exit ✕
              </button>
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
          <div className="fixed inset-x-0 bottom-0 max-h-[85vh] bg-[#EEF1F4] rounded-t-3xl z-50 p-6 shadow-2xl overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between pb-3 border-b border-[#e7e4dd] mb-4">
              <div>
                <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#5a6b78]">
                  Your details so far
                </span>
                <h3 className="font-serif text-lg font-bold text-[#062c55]">
                  FairExit summary
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMobileSummOpen(false)}
                className="w-8 h-8 rounded-full bg-[#f4f6f8] text-[#5a6b78] flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Dynamic Summary Details */}
            <div className="space-y-1.5 text-[13px]">
              {US_SUMMARY_FIELDS.filter((f) => isFieldVisible(f.key)).length ===
              0 ? (
                <div className="text-[#8a98a4] italic py-2">
                  Your answers will stack up here as you go.
                </div>
              ) : (
                US_SUMMARY_FIELDS.filter((f) => isFieldVisible(f.key)).map(
                  (f) => (
                    <div
                      key={f.key}
                      className="flex justify-between items-start py-1.5 border-b border-dashed border-[#e7e4dd] gap-2"
                    >
                      <span className="text-[#5a6b78] shrink-0">{f.label}</span>
                      <b className="text-[#062c55] font-semibold text-right leading-tight">
                        {getSummaryValue(f.key)}
                      </b>
                    </div>
                  ),
                )
              )}
            </div>

            {/* Enough to show results banner (as in original) */}
            {Boolean(
              (isFieldVisible("years") && isFieldVisible("salary")) ||
                (state.years && state.salary) ||
                currentStep === "step-results",
            ) && (
              <div className="mt-3 text-[12px] font-bold text-[#0c8f72] bg-[#e5f5ee] border border-[#b9e6d4] rounded-[9px] px-[11px] py-2">
                ✓ Enough to show your results
              </div>
            )}
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
              <ol
                className="grid grid-cols-6 gap-1.5 list-none m-0 p-0 mb-2 text-center"
                id="stepsBar"
              >
                {usSteps.map((s, idx) => {
                  const isDone = activeRailIndex > idx;
                  const isCur = activeRailIndex === idx;
                  return (
                    <li
                      key={s.label}
                      className={`relative pt-6 text-[11px] font-semibold transition-colors ${
                        isDone
                          ? "text-[#0c8f72] cursor-pointer"
                          : isCur
                            ? "text-[#062c55] font-extrabold"
                            : "text-[#a7b0b8]"
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
                      <span
                        className={`${isCur ? "inline" : "hidden md:inline"}`}
                      >
                        {s.label}
                      </span>
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
                    {currentStep === "us-state-stop" && "Your state"}
                    {isSituationStep &&
                      currentStep !== "us-state-stop" &&
                      "Step 1 of 5 · Your situation"}
                    {isLayoffStep && "Step 2 of 5 · The layoff"}
                    {isPapersStep && "Step 3 of 5 · The papers"}
                    {isClauseStep &&
                      "Step 4 of 5 · The most important question"}
                    {isDetailsStep && "Step 5 of 5 · Last details"}
                    {currentStep === "step-analyzing" &&
                      "Reading your situation…"}
                    {currentStep === "step-results" && "Your results"}
                  </span>
                  <span className="block sm:inline sm:ml-2 font-medium italic text-[#5a6b78] mt-0.5 sm:mt-0">
                    {isSituationStep &&
                      currentStep !== "us-state-stop" &&
                      "Ten seconds, promise."}
                    {isLayoffStep &&
                      "Nice — the facts an attorney would ask first."}
                    {isPapersStep && "Halfway. This is where it gets real."}
                    {isClauseStep && "The one that matters most."}
                    {isDetailsStep && "Last one — then your results."}
                    {currentStep === "step-results" &&
                      "Here's where you stand."}
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
                  <span className={explainOn ? "text-[#0c8f72]" : ""}>
                    Explain each question
                  </span>
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
                  <div
                    className="flex items-center gap-2 shrink-0 py-1"
                    aria-label={`Question ${situationQIndex} of 5`}
                  >
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
                    <b className="font-bold text-[#062c55]">
                      100% free to get your results.
                    </b>{" "}
                    No card. No signup. No sales call.
                  </span>
                </div>

                {/* Heading & Subtitle */}
                <h1 className="font-serif font-normal text-[23px] sm:text-[27px] text-[#062c55] leading-[1.2] tracking-tight">
                  Make sense of your separation offer.
                </h1>
                <p className="text-[13.5px] sm:text-sm text-[#5a6b78] mt-2 mb-4 leading-relaxed">
                  US law doesn&apos;t set a severance amount — so there&apos;s
                  no &quot;number you&apos;re owed&quot;. What the law{" "}
                  <b>does</b> control is <b>how</b> they can ask you to sign:
                  how long you get to think, whether you can take it back, and
                  how much notice a big layoff needs. That&apos;s what we check.
                  We don&apos;t assess your case — that&apos;s an
                  attorney&apos;s job.
                </p>

                {/* ── QUESTION 1 OF 5: STATE ── */}
                {currentStep === "us-situation-q1" && (
                  <div>
                    <div className="font-bold text-[15px] sm:text-[16px] text-[#062c55] mb-2.5">
                      Which state did you physically work in?
                    </div>

                    {/* Mobile Explainer */}
                    {explainOn && (
                      <div className="md:hidden my-3 p-3.5 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                        <b className="block text-[#0c7a60] font-bold text-[11px] mb-1">
                          Your state can add rules
                        </b>
                        federal law is the floor. Several states add their own
                        layoff notice, severance or non-compete rules on top.
                        Remote workers: your own state&apos;s rules usually
                        apply, even if the agreement names another one.
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
                      <QuestionNextButton
                        onClick={() => {
                          if (state.usState === "Other state") {
                            setCurrentStep("us-state-stop");
                          } else {
                            setCurrentStep("us-situation-q2");
                          }
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      />
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
                        <b className="block text-[#0c7a60] font-bold text-[11px] mb-1">
                          Forty is the line
                        </b>
                        if you&apos;re 40 or older and they want you to give up
                        age-discrimination claims, federal law gives you a set
                        number of days to decide and 7 days to take it back
                        after signing. Under 40, those rules don&apos;t apply.
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#5a6b78] mb-1.5">
                          Your age
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={state.age}
                          placeholder="52"
                          onChange={(e) =>
                            setState({ ...state, age: e.target.value })
                          }
                          className="w-full border border-[#cdd3d8] rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:border-[#0eb28d]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#5a6b78] mb-1.5">
                          Years on the job
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={state.years}
                          placeholder="9"
                          onChange={(e) =>
                            setState({ ...state, years: e.target.value })
                          }
                          className="w-full border border-[#cdd3d8] rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:border-[#0eb28d]"
                        />
                      </div>
                    </div>

                    {/* Navigation */}
                    <div className="mt-8 flex items-center justify-between">
                      <QuestionBackButton
                        onClick={() => {
                          setCurrentStep("us-situation-q1");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      />
                      <QuestionNextButton
                        onClick={() => {
                          setCurrentStep("us-situation-q3");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      />
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
                        <b className="block text-[#0c7a60] font-bold text-[11px] mb-1">
                          Pay sets the stakes
                        </b>
                        there&apos;s no US minimum to compare your offer to, but
                        your pay tells us what a week of notice is worth and
                        whether unpaid bonus, PTO or equity is a meaningful
                        amount.
                      </div>
                    )}

                    <input
                      type="text"
                      inputMode="numeric"
                      value={state.salary}
                      placeholder="128000"
                      onChange={(e) =>
                        setState({ ...state, salary: e.target.value })
                      }
                      className="w-full border border-[#cdd3d8] rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:border-[#0eb28d]"
                    />

                    {/* Navigation */}
                    <div className="mt-8 flex items-center justify-between">
                      <QuestionBackButton
                        onClick={() => {
                          setCurrentStep("us-situation-q2");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      />
                      <QuestionNextButton
                        onClick={() => {
                          setCurrentStep("us-situation-q4");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      />
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
                        <b className="block text-[#0c7a60] font-bold text-[11px] mb-1">
                          A release can waive these
                        </b>
                        signing usually gives up claims to money you&apos;ve
                        already earned unless it&apos;s paid first. Bonus,
                        commission, unused PTO and vested equity are the usual
                        things left on the table.
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
                                comp: {
                                  ...state.comp,
                                  [item.k]: !state.comp[item.k],
                                },
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
                      <QuestionBackButton
                        onClick={() => {
                          setCurrentStep("us-situation-q3");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      />
                      <QuestionNextButton
                        onClick={() => {
                          setCurrentStep("us-situation-q5");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      />
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
                        <b className="block text-[#0c7a60] font-bold text-[11px] mb-1">
                          A signature can close some doors
                        </b>
                        a signed release is usually final, but if you&apos;re
                        40+ you may still have 7 days to take it back, and some
                        claims can&apos;t be signed away.
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
                            onClick={() =>
                              setState({ ...state, signed: item.k })
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

                    {/* Disclaimer agreement box */}
                    <div
                      onClick={() =>
                        setState({ ...state, agreed: !state.agreed })
                      }
                      className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                        state.agreed
                          ? "bg-[#f3faf6] border-[#0eb28d] dark:bg-[#0A261E] dark:border-[#125E4A]"
                          : "bg-[#fafbfb] border-[#e2dfd7] dark:bg-[#0A1C2E] dark:border-[#1E3B5C] hover:border-[#c9c5bd]"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded border mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                          state.agreed
                            ? "bg-[#0eb28d] border-[#0eb28d] text-white text-xs font-bold"
                            : "border-[#b0bac3] dark:border-[#416285] bg-white dark:bg-[#071524]"
                        }`}
                      >
                        {state.agreed ? "✓" : ""}
                      </div>
                      <div className="text-xs text-[#2b3a45] dark:text-[#E1E7ED] leading-relaxed">
                        I understand this is{" "}
                        <b className="dark:text-white">
                          information to help me get oriented — not legal advice
                        </b>
                        , and not an assessment of my case. The full{" "}
                        <a
                          href="/legal"
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[#0c8f72] dark:text-[#34D399] font-bold underline"
                        >
                          Terms &amp; Disclaimer
                        </a>{" "}
                        apply if I buy a report or connect with an attorney.
                      </div>
                    </div>

                    {/* Navigation */}
                    <div className="mt-8">
                      <div className="flex items-center justify-between mb-3.5">
                        <QuestionBackButton
                          onClick={() => {
                            setCurrentStep("us-situation-q4");
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        />
                        <span className="text-xs font-bold text-[#0c8f72] dark:text-[#34D399]">
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
                        className={`w-full py-3.5 px-6 rounded-[9px] font-bold text-sm sm:text-base transition-all ${
                          state.agreed
                            ? "bg-[#0eb28d] hover:bg-[#0c8f72] text-white shadow-[0_8px_20px_-8px_rgba(14,178,141,0.7)] cursor-pointer"
                            : "bg-[#a1cfc4] dark:bg-[#152E46] text-white dark:text-[#5A6B78] cursor-not-allowed opacity-70"
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
                STATE STOP CARD (WHEN SELECTING "Other state" - MATCHING SCREENSHOT)
            ════════════════════════════════════════════════════════════════ */}
            {currentStep === "us-state-stop" && (
              <div className="bg-white border border-[#e7e4dd] rounded-[18px] p-6 sm:p-9 shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] text-center animate-in fade-in duration-300">
                {/* Map Emoji Icon */}
                <div
                  className="text-3xl sm:text-4xl mb-3 select-none"
                  aria-hidden="true"
                >
                  🗺️
                </div>

                <h1 className="font-serif font-bold text-2xl sm:text-[28px] text-[#062c55] leading-tight mb-3">
                  We don&apos;t cover your state yet.
                </h1>

                <p className="text-sm text-[#5a6b78] max-w-[520px] mx-auto leading-relaxed mb-6">
                  Layoff rules differ by state — several add their own WARN,
                  severance or non-compete rules on top of federal law. Rather
                  than give you a federal-only read that could be wrong for you,
                  we stop here. We&apos;re live in{" "}
                  <b className="text-[#17242f] font-bold">
                    California, New York, Texas, Florida, Illinois, New Jersey
                    and Washington
                  </b>{" "}
                  today.
                </p>

                {/* Info Container with 2 rows */}
                <div className="bg-[#f4f7f5] border border-[#e2e8e4] rounded-2xl p-4 sm:p-5 max-w-[490px] mx-auto text-left text-xs sm:text-[13px] space-y-3 mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
                    <span className="text-[#5a6b78] shrink-0">In Canada?</span>
                    <NextLink
                      href="/questions?country=CA"
                      className="text-[#0c8f72] font-bold hover:underline inline-flex items-center gap-1 text-left sm:text-right"
                    >
                      Use the Canadian site →
                    </NextLink>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-4 pt-3 border-t border-[#e2e8e4]">
                    <span className="text-[#5a6b78] shrink-0">Meanwhile</span>
                    <span className="text-[#062c55] font-semibold text-left sm:text-right leading-snug">
                      Your state labor department · the EEOC · a licensed
                      employment attorney (many offer a free first call)
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 max-w-[420px] mx-auto">
                  <button
                    type="button"
                    onClick={() => setNotifiedState(true)}
                    className="w-full py-3.5 px-6 rounded-xl bg-[#0eb28d] hover:bg-[#0c8f72] text-white font-bold text-sm sm:text-base shadow-[0_8px_20px_-8px_rgba(14,178,141,0.7)] transition-all cursor-pointer"
                  >
                    {notifiedState
                      ? "✓ We'll notify you when live!"
                      : "Notify me when you're live in my state"}
                  </button>

                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setState({ ...state, usState: "California" });
                        setCurrentStep("us-situation-q1");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="inline-flex items-center justify-center py-2 px-4 rounded-xl border border-[#e7e4dd] bg-[#fafbfc] hover:bg-[#f0f4f8] text-xs font-bold text-[#5a6b78] hover:text-[#062c55] transition-colors cursor-pointer"
                    >
                      ‹ Wrong state? Change my answer
                    </button>
                  </div>
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
                  <div
                    className="flex items-center gap-2 shrink-0 py-1"
                    aria-label={`Question ${layoffQIndex} of 5`}
                  >
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
                  This tells us whether the advance-notice rules (the federal
                  WARN Act) applied to your layoff.
                </p>

                {/* ── QUESTION 1 OF 5: UNION CONTRACT ── */}
                {(currentStep === "layoff-q1" ||
                  currentStep === "step-basics") && (
                  <div>
                    <div className="font-bold text-[15px] sm:text-[16px] text-[#062c55] mb-2.5">
                      Are you covered by a union contract?
                    </div>

                    {/* Mobile Explainer */}
                    {explainOn && (
                      <div className="md:hidden my-3 p-3.5 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                        <b className="block text-[#0c7a60] font-bold text-[11px] mb-1">
                          Union jobs follow their own rules
                        </b>
                        if you&apos;re under a collective agreement, severance
                        and disputes usually go through your union rep, not a
                        private agreement. Talk to your rep before signing
                        anything.
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
                      <QuestionBackButton
                        onClick={() => {
                          setCurrentStep("us-situation-q5");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      />
                      <QuestionNextButton
                        onClick={() => {
                          setCurrentStep("layoff-q2");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      />
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
                        <b className="block text-[#0c7a60] font-bold text-[11px] mb-1">
                          Group layoffs get more protection
                        </b>
                        a site closing or a big group let go at once can trigger
                        advance-notice rules and, if you&apos;re 40+, a longer
                        time to decide plus a list of who was let go.
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
                            onClick={() =>
                              setState({ ...state, ended: p.k, reason: p.k })
                            }
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
                      <QuestionBackButton
                        onClick={() => {
                          setCurrentStep("layoff-q1");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      />
                      <QuestionNextButton
                        onClick={() => {
                          setCurrentStep("layoff-q3");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      />
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
                        <b className="block text-[#0c7a60] font-bold text-[11px] mb-1">
                          The 100-employee line
                        </b>
                        the federal advance-notice law (WARN) only covers
                        employers with 100 or more employees. Smaller employers
                        may still be covered by a state version.
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
                      <QuestionBackButton
                        onClick={() => {
                          setCurrentStep("layoff-q2");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      />
                      <QuestionNextButton
                        onClick={() => {
                          setCurrentStep("layoff-q4");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      />
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
                        <b className="block text-[#0c7a60] font-bold text-[11px] mb-1">
                          Fifty at one site is the trigger
                        </b>
                        WARN generally applies when 50 or more people at one
                        location lose their jobs in a short window. It&apos;s
                        about your site, not the whole company.
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
                      <QuestionBackButton
                        onClick={() => {
                          setCurrentStep("layoff-q3");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      />
                      <QuestionNextButton
                        onClick={() => {
                          setCurrentStep("layoff-q5");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      />
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
                        <b className="block text-[#0c7a60] font-bold text-[11px] mb-1">
                          Sixty days is the standard
                        </b>
                        for a covered mass layoff or closing, the employer
                        generally owes 60 days&apos; written notice. Paying you
                        instead of notifying you can still be a shortfall.
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
                        <QuestionBackButton
                          onClick={() => {
                            setCurrentStep("layoff-q4");
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        />
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
                        className="w-full py-3.5 px-6 rounded-[9px] font-bold text-sm sm:text-base bg-[#0eb28d] hover:bg-[#0c8f72] text-white shadow-[0_8px_20px_-8px_rgba(14,178,141,0.7)] transition-all cursor-pointer"
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
                  <div
                    className="flex items-center gap-2 shrink-0 py-1"
                    aria-label={`Question ${papersQIndex} of 3`}
                  >
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
                  If you&apos;re 40+ and they want you to give up
                  age-discrimination claims, federal law (OWBPA) sets specific
                  rules for the release. Whether any of them apply to you is
                  worth understanding — it&apos;s what an attorney checks first.
                </p>

                {/* ── QUESTION 1 OF 3: DID THEY ASK YOU TO SIGN A RELEASE OR WAIVER? ── */}
                {(currentStep === "papers-q1" ||
                  currentStep === "step-money") && (
                  <div>
                    <div className="font-bold text-[15px] sm:text-[16px] text-[#062c55] mb-2.5">
                      Did they ask you to sign a release or waiver to get the
                      money?
                    </div>

                    {/* Mobile Explainer */}
                    {explainOn && (
                      <div className="md:hidden my-3 p-3.5 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                        <b className="block text-[#0c7a60] font-bold text-[11px] mb-1">
                          The release is the whole deal
                        </b>
                        a release means you give up the right to bring claims in
                        exchange for the money. If you&apos;re 40+ and it covers
                        age claims, federal law sets rules for how it must be
                        offered.
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
                      <QuestionBackButton
                        onClick={() => {
                          setCurrentStep("layoff-q5");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      />
                      <QuestionNextButton
                        onClick={() => {
                          setCurrentStep("papers-q2");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      />
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
                        <b className="block text-[#0c7a60] font-bold text-[11px] mb-1">
                          No minimum to compare to
                        </b>
                        US law doesn&apos;t set a severance amount, so we
                        won&apos;t judge the number. We show it in your summary
                        and in your report next to what the agreement asks you
                        to give up.
                      </div>
                    )}

                    <input
                      type="text"
                      inputMode="numeric"
                      value={state.offer || ""}
                      placeholder="22154"
                      onChange={(e) => {
                        const val =
                          parseFloat(e.target.value.replace(/[^0-9.]/g, "")) ||
                          0;
                        setState({ ...state, offer: val });
                      }}
                      className="w-full border border-[#0eb28d] rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-[#0eb28d] bg-white text-[#17242f] shadow-xs"
                    />

                    {/* Navigation */}
                    <div className="mt-8 flex items-center justify-between">
                      <QuestionBackButton
                        onClick={() => {
                          setCurrentStep("papers-q1");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      />
                      <QuestionNextButton
                        onClick={() => {
                          setCurrentStep("papers-q3");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* ── QUESTION 3 OF 3: PROMISE SEVERANCE ── */}
                {currentStep === "papers-q3" && (
                  <div>
                    <div className="font-bold text-[15px] sm:text-[16px] text-[#062c55] mb-2.5">
                      Does your offer letter, contract or employee handbook
                      promise severance?
                    </div>

                    {/* Mobile Explainer */}
                    {explainOn && (
                      <div className="md:hidden my-3 p-3.5 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                        <b className="block text-[#0c7a60] font-bold text-[11px] mb-1">
                          A written promise is the only minimum
                        </b>
                        no law requires severance, but a severance policy, an
                        offer-letter clause or a handbook section can. If one
                        exists, the offer has to match it.
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
                        onClick={() =>
                          setState({ ...state, promise: "unsure" })
                        }
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
                        <QuestionBackButton
                          onClick={() => {
                            setCurrentStep("papers-q2");
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        />
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
                        className="w-full py-3.5 px-6 rounded-[9px] font-bold text-sm sm:text-base bg-[#0eb28d] hover:bg-[#0c8f72] text-white shadow-[0_8px_20px_-8px_rgba(14,178,141,0.7)] transition-all cursor-pointer"
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
                  <div
                    className="flex items-center gap-2 shrink-0 py-1"
                    aria-label={`Question ${clauseQIndex} of 4`}
                  >
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
                  If you&apos;re 40 or older and they want you to give up
                  age-discrimination claims, federal law sets a minimum time to
                  consider (21 days alone, 45 in a group program) and 7 days to
                  change your mind after signing. Whether that applies to you is
                  the first thing an attorney checks.
                </p>

                {/* ── QUESTION 1 OF 4: How long did they give you to decide? ── */}
                {(currentStep === "clause-q1" ||
                  currentStep === "step-clause") && (
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
                          If you&apos;re 40+ and giving up age claims, the law
                          says you must be offered at least 21 days to consider
                          (45 in a group program). A shorter deadline is the
                          most common slip.
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
                          onClick={() =>
                            setState((prev) => ({
                              ...prev,
                              deadline: item.k,
                              clause: item.k,
                            }))
                          }
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
                      <QuestionBackButton
                        onClick={() => {
                          setCurrentStep("papers-q3");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      />
                      <QuestionNextButton
                        onClick={() => {
                          setCurrentStep("clause-q2");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* ── QUESTION 2 OF 4: Does it tell you in writing to talk to an attorney? ── */}
                {currentStep === "clause-q2" && (
                  <div className="animate-in fade-in duration-200">
                    <h2 className="text-sm sm:text-base font-bold text-[#062c55] mb-3">
                      Does the agreement tell you, in writing, to talk to an
                      attorney before signing?
                    </h2>

                    {/* Mobile In-card explanation */}
                    {explainOn && (
                      <div className="lg:hidden mb-4 p-3.5 rounded-xl border-l-[3px] border-[#0eb28d] bg-[#f3faf6] border border-[#cfe8dd]">
                        <b className="block text-[11px] font-extrabold tracking-wider uppercase text-[#0c8f72] mb-1">
                          IT HAS TO SAY SO
                        </b>
                        <span className="text-xs text-[#2b3a45] leading-relaxed">
                          An age-40+ release must advise you in writing to
                          consult an attorney. Missing that line is one of the
                          things that can make the waiver unenforceable.
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
                          onClick={() =>
                            setState((prev) => ({ ...prev, advise: item.k }))
                          }
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
                      <QuestionBackButton
                        onClick={() => {
                          setCurrentStep("clause-q1");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      />
                      <QuestionNextButton
                        onClick={() => {
                          setCurrentStep("clause-q3");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* ── QUESTION 3 OF 4: Did they give you the list of ages and job titles? ── */}
                {currentStep === "clause-q3" && (
                  <div className="animate-in fade-in duration-200">
                    <h2 className="text-sm sm:text-base font-bold text-[#062c55] mb-3">
                      Did they give you a list of the ages and job titles of who
                      was let go and who was kept?
                    </h2>

                    {/* Mobile In-card explanation */}
                    {explainOn && (
                      <div className="lg:hidden mb-4 p-3.5 rounded-xl border-l-[3px] border-[#0eb28d] bg-[#f3faf6] border border-[#cfe8dd]">
                        <b className="block text-[11px] font-extrabold tracking-wider uppercase text-[#0c8f72] mb-1">
                          THE LIST IS REQUIRED IN A GROUP PROGRAM
                        </b>
                        <span className="text-xs text-[#2b3a45] leading-relaxed">
                          For an age-40+ group layoff, the employer must
                          disclose the job titles and ages of who was selected
                          and who wasn&apos;t. It&apos;s how you&apos;d spot a
                          pattern.
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
                          onClick={() =>
                            setState((prev) => ({ ...prev, list: item.k }))
                          }
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
                      <QuestionBackButton
                        onClick={() => {
                          setCurrentStep("clause-q2");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      />
                      <QuestionNextButton
                        onClick={() => {
                          setCurrentStep("clause-q4");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      />
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
                          An age-40+ release must give you 7 days after signing
                          to revoke it, and that can&apos;t be waived. If the
                          agreement doesn&apos;t say so, that&apos;s worth an
                          attorney&apos;s look.
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
                          onClick={() =>
                            setState((prev) => ({ ...prev, revoke: item.k }))
                          }
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
                        <QuestionBackButton
                          onClick={() => {
                            setCurrentStep("clause-q3");
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        />
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
                        className="w-full py-3.5 px-6 rounded-[9px] font-bold text-sm sm:text-base bg-[#0eb28d] hover:bg-[#0c8f72] text-white shadow-[0_8px_20px_-8px_rgba(14,178,141,0.7)] transition-all cursor-pointer"
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
                  <div
                    className="flex items-center gap-2 shrink-0 py-1"
                    aria-label={`Question ${detailsQIndex} of 2`}
                  >
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
                {(currentStep === "details-q1" ||
                  currentStep === "step-details") && (
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
                          Discrimination or retaliation is its own claim. Unpaid
                          wages, bonus or PTO are owed regardless of what you
                          sign. Both change what an attorney looks at first.
                        </span>
                      </div>
                    )}

                    {/* Option Pills */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {[
                        { k: "none", label: "Nothing unusual" },
                        {
                          k: "discrim",
                          label: "Felt discriminatory / retaliatory",
                        },
                        { k: "unpaid", label: "Unpaid wages / bonus / PTO" },
                      ].map((item) => (
                        <button
                          key={item.k}
                          type="button"
                          onClick={() =>
                            setState((prev) => ({ ...prev, redflag: item.k }))
                          }
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
                      <QuestionBackButton
                        onClick={() => {
                          setCurrentStep("clause-q4");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      />
                      <QuestionNextButton
                        onClick={() => {
                          setCurrentStep("details-q2");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      />
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
                          Some states void non-competes outright, others enforce
                          them. If one is in your agreement, whether it can stop
                          you working is a state-law question.
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
                          onClick={() =>
                            setState((prev) => ({ ...prev, nc: item.k }))
                          }
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
                        <QuestionBackButton
                          onClick={() => {
                            setCurrentStep("details-q1");
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        />
                        <span className="text-xs font-bold text-[#0c8f72]">
                          Ready — continue below ↓
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          populateAllAnswers(state);
                          setCurrentStep("step-analyzing");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                          setTimeout(() => {
                            setCurrentStep("step-results");
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }, 2400);
                        }}
                        className="w-full py-3.5 px-6 rounded-[9px] font-bold text-sm sm:text-base bg-[#0eb28d] hover:bg-[#0c8f72] text-white shadow-[0_8px_20px_-8px_rgba(14,178,141,0.7)] transition-all cursor-pointer"
                      >
                        See my results →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STEP: ANALYZING (MATCHING SCREENSHOT)
            ════════════════════════════════════════════════════════════════ */}
            {currentStep === "step-analyzing" && (
              <div className="bg-white border border-[#e7e4dd] rounded-[22px] py-14 sm:py-20 px-6 sm:px-12 text-center shadow-[0_20px_50px_-25px_rgba(6,44,85,0.12)] max-w-[620px] mx-auto animate-in fade-in duration-300">
                {/* Document outline icon with green top banner matching screenshot */}
                <div className="relative mx-auto w-14 h-[68px] mb-6 flex items-center justify-center">
                  <div className="absolute inset-0 bg-[#0eb28d]/15 rounded-lg blur-md animate-pulse" />
                  <div className="relative w-12 h-16 bg-white border-[1.75px] border-[#a3d9c4] rounded-[6px] shadow-sm overflow-hidden flex flex-col">
                    <div className="h-2 bg-[#0eb28d] w-full" />
                    <div className="p-2 space-y-1.5 flex-1 relative bg-gradient-to-b from-white to-[#fafcfb]">
                      <div className="h-1 bg-[#e7e4dd] rounded-full w-4/5" />
                      <div className="h-1 bg-[#e7e4dd] rounded-full w-full" />
                      <div className="h-1 bg-[#e7e4dd] rounded-full w-3/4" />
                      <div className="absolute inset-x-0 h-4 bg-gradient-to-b from-transparent via-[#0eb28d]/20 to-transparent animate-pulse" />
                    </div>
                  </div>
                </div>

                <h1 className="font-serif font-normal text-2xl sm:text-[28px] text-[#062c55] mb-2 tracking-tight">
                  Reading your situation…
                </h1>
                <p className="text-sm sm:text-base text-[#5a6b78] max-w-[420px] mx-auto leading-relaxed">
                  Weighing the same things a court and a lawyer weigh.
                </p>

                {searchParams?.get("step") === "loading" && (
                  <div className="mt-8">
                    <button
                      type="button"
                      onClick={() => setCurrentStep("step-results")}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#062c55] text-white text-xs font-bold hover:bg-[#041D38] transition-colors cursor-pointer"
                    >
                      Preview Results Now →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STEP 6: RESULTS & VERDICT
            ════════════════════════════════════════════════════════════════ */}
            {currentStep === "step-results" && (
              <div className="bg-white border border-[#e7e4dd] rounded-[18px] p-5 sm:p-8 md:p-9 shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] animate-in fade-in duration-300">
                {/* ── VERDICT CARD (encompasses tag, title, reasons, and srcbadge) ── */}
                <div className="text-center p-5 sm:p-7 md:p-[24px_26px] bg-gradient-to-b from-[#fbfdfc] to-[#eef8f3] border border-[#c7e6d6] rounded-[16px]">
                  {/* Upper Badges */}
                  <div className="mb-2">
                    <span className="inline-block font-sans font-[800] uppercase text-[#8a6400] bg-[#fbf3df] border border-[#eeddb0] text-[10.5px] leading-[16.5px] tracking-[0.5px] px-[10px] py-[3px] rounded-[6px] mb-2">
                      NOT AN ASSESSMENT OF YOUR SITUATION
                    </span>
                    <div className="font-sans font-[800] uppercase text-[#0c8f72] text-[11.5px] leading-[18px] tracking-[1px] mb-2">
                      WORTH AN ATTORNEY&apos;S LOOK
                    </div>
                  </div>

                  {/* Main Title */}
                  <h2 className="font-serif font-[600] text-[26px] sm:text-[30px] md:text-[32px] text-[#062c55] leading-[31.5px] sm:leading-[36px] tracking-normal max-w-[580px] mx-auto mb-3">
                    A few things here are worth an attorney&apos;s look.
                  </h2>

                  {/* Intro Description */}
                  <p className="font-sans font-normal text-[14.5px] sm:text-[15px] text-[#17242f] max-w-[460px] mx-auto leading-[23.5px] tracking-normal mb-5 sm:mb-6">
                    Some of your answers point to federal rules worth confirming — in
                    the US the question usually isn&apos;t a legal minimum (there
                    isn&apos;t one), it&apos;s the process and the notice. A free
                    attorney call can tell you what applies to you. This isn&apos;t
                    an opinion on your case.
                  </p>

                  {/* Federal Law Expects Intro */}
                  <p className="font-sans font-normal text-[12.5px] text-[#5a6b78] leading-[19px] tracking-normal mb-3 text-left max-w-[440px] mx-auto">
                    What federal law generally expects — and what your answers
                    suggest to double-check with an attorney:
                  </p>

                  {/* 5 Bullet Points with Teal Exclamation */}
                  <div className="space-y-2 mb-4 text-left max-w-[440px] mx-auto">
                    <div className="flex items-start gap-2.5 font-sans font-normal text-[13.5px] text-[#17242f] leading-[21px] py-0.5">
                      <span className="text-[#0c8f72] font-[800] text-[13.5px] shrink-0">
                        !
                      </span>
                      <span>
                        Time to consider looks short — for an age-40+ group program
                        the law sets a 45-day minimum to offer (you may still sign
                        earlier)
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5 font-sans font-normal text-[13.5px] text-[#17242f] leading-[21px] py-0.5">
                      <span className="text-[#0c8f72] font-[800] text-[13.5px] shrink-0">
                        !
                      </span>
                      <span>
                        A 7-day period to change your mind is a common requirement
                        for age-40+ releases — worth confirming yours has one
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5 font-sans font-normal text-[13.5px] text-[#17242f] leading-[21px] py-0.5">
                      <span className="text-[#0c8f72] font-[800] text-[13.5px] shrink-0">
                        !
                      </span>
                      <span>
                        For an age-40+ group program, the law requires a disclosure
                        of the ages &amp; job titles selected — keep your copy for
                        the attorney
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5 font-sans font-normal text-[13.5px] text-[#17242f] leading-[21px] py-0.5">
                      <span className="text-[#0c8f72] font-[800] text-[13.5px] shrink-0">
                        !
                      </span>
                      <span>
                        50+ people lost their job at your site and the employer has
                        100+ staff — that&apos;s the fact pattern where WARN&apos;s
                        advance-notice rules can apply. Confirm the notice you got
                        with an attorney
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5 font-sans font-normal text-[13.5px] text-[#17242f] leading-[21px] py-0.5">
                      <span className="text-[#0c8f72] font-[800] text-[13.5px] shrink-0">
                        !
                      </span>
                      <span>
                        {state.usState} has its own{" "}
                        {state.usState === "California"
                          ? "Cal-WARN Act"
                          : `${state.usState} WARN rules`}{" "}
                        (often broader than federal) and generally voids
                        non-competes — a state-specific attorney should check
                        both.
                      </span>
                    </div>
                  </div>

                  {/* Amber/Yellow Callout Box (warnbox) */}
                  <div className="p-[13px_16px] rounded-[12px] bg-[#fffdf6] border border-[#f0dca8] font-sans font-normal text-[13px] text-[#17242f] leading-[20px] mb-4 text-left max-w-[440px] mx-auto">
                    <b className="font-[700] text-[#8a6400]">
                      Advance-notice (WARN) rules may apply.
                    </b>{" "}
                    For a covered mass layoff or closing, a 100+-employee
                    employer generally must give 60 days&apos; written notice. If
                    yours was shorter, the shortfall can matter — but the amount
                    depends on offsets an attorney applies, and any civil penalty
                    runs to the government, not to you. We don&apos;t calculate
                    it. We never claim a legal severance minimum; the US doesn&apos;t
                    set one.
                  </div>

                  {/* Official Government Source Card (srcbadge) */}
                  <a
                    href="https://www.eeoc.gov/laws/guidance/understanding-waivers-discrimination-claims-employee-severance-agreements"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border border-[#cbdcee] bg-white hover:border-[#0c8f72] rounded-[11px] p-[9px_12px_9px_14px] flex items-center justify-between transition-all group text-left cursor-pointer shadow-[0_6px_16px_-12px_rgba(11,46,79,0.4)] max-w-[440px] mx-auto mt-4"
                  >
                    <div>
                      <div className="font-sans font-[800] uppercase text-[11px] leading-[15px] tracking-[0.5px] text-[#062c55] mb-0.5">
                        Official government source
                      </div>
                      <div className="font-sans font-[600] text-[12px] leading-[16px] text-[#5a6b78] group-hover:text-[#0c8f72] transition-colors">
                        EEOC — severance &amp; age-claim waivers · eeoc.gov ·{" "}
                        <i className="italic">last reviewed Sept 2026</i>
                      </div>
                    </div>
                    <span className="text-[#0c8f72] font-[800] text-[15px] group-hover:translate-x-1 transition-transform ml-3">
                      →
                    </span>
                  </a>
                </div>
                {/* ── END VERDICT CARD ── */}

                {/* Free Check Done Pill + Email Link */}
                <div className="text-center my-6">
                  <div className="inline-block bg-[#e6f5ef] text-[#0c7a60] font-sans font-[800] text-[12.5px] leading-[18px] px-3.5 py-1.5 rounded-[6px] mb-2.5">
                    Your free check is done · no card, no signup, nothing owed
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => setEmailModalOpen(true)}
                      className="font-sans font-[700] text-[14px] leading-[20px] text-[#0c8f72] underline hover:no-underline cursor-pointer"
                    >
                      Email me my free result →
                    </button>
                  </div>
                </div>

                {/* Divider Line */}
                <div className="my-7 border-t border-[#e7e4dd]" />

                {/* NEXT STEP · OPTIONAL SECTION */}
                <div className="text-center mb-6">
                  <div className="font-sans font-[800] uppercase tracking-[0.9px] text-[11px] leading-[16px] text-[#0c8f72] mb-1">
                    Next step · optional
                  </div>
                  <h2 className="font-serif font-[600] text-[26px] sm:text-[32px] text-[#062c55] leading-[32px] sm:leading-[36px] tracking-normal mb-2">
                    Want to take it a step further?
                  </h2>
                  <p className="font-sans font-normal text-[14px] sm:text-[15px] leading-[20px] text-[#5a6b78] max-w-[540px] mx-auto">
                    Two ways, both optional. Tap the ⓘ on either card for detail.
                  </p>
                </div>

                {/* 2 Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-[640px] mx-auto">
                  {/* Card 1: Do It Yourself */}
                  <div className="relative border-[1.5px] border-[#e7e4dd] rounded-[15px] p-5 sm:p-6 bg-white flex flex-col justify-between shadow-xs hover:border-[#062c55] transition-all">
                    <button
                      type="button"
                      onClick={() => setInfoModal("report")}
                      className="absolute top-3.5 right-3.5 w-[27px] h-[27px] rounded-full bg-[#062c55] text-white flex items-center justify-center hover:bg-[#0c8f72] transition-colors cursor-pointer shadow-[0_2px_6px_-1px_rgba(6,44,85,0.4)] z-10"
                      aria-label="Info about Severance Report"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-[15px] h-[15px] block"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="6.6" r="1.7" />
                        <rect x="10.5" y="10" width="3" height="8.4" rx="1.5" />
                      </svg>
                    </button>
                    <div>
                      <span className="font-sans font-[800] uppercase tracking-[0.8px] text-[11px] leading-[16px] text-[#5a6b78]">
                        Do it yourself
                      </span>
                      <h3 className="font-serif font-[600] text-[19px] leading-[24px] text-[#062c55] mt-1 mb-2">
                        Get your Severance Report
                      </h3>
                      <div className="font-serif font-[600] text-[30px] leading-none text-[#062c55] mb-2 flex items-baseline gap-2 flex-wrap">
                        $59{" "}
                        <span className="font-sans font-[700] text-[11px] leading-none text-[#5a6b78]">
                          one-time · no subscription
                        </span>
                      </div>
                      <p className="font-sans font-normal text-[13px] leading-[19.5px] text-[#5a6b78] mb-5">
                        Your agreement organized, the federal rules that may
                        apply, your dates — a 15-page review to take into any
                        conversation.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInfoModal("report")}
                      className="w-full py-3 px-4 rounded-[9px] bg-[#062c55] hover:bg-[#041D38] text-white font-sans font-[800] text-[14px] leading-[20px] shadow-xs transition-all cursor-pointer text-center min-h-[50px] flex items-center justify-center"
                    >
                      Get my report
                    </button>
                  </div>

                  {/* Card 2: Get Help */}
                  <div className="relative border-2 border-[#0eb28d] rounded-[15px] p-5 sm:p-6 bg-gradient-to-b from-[#fbfdfc] to-[#eef8f3] flex flex-col justify-between shadow-[0_18px_34px_-22px_rgba(12,143,114,0.45)] hover:shadow-lg transition-all">
                    <button
                      type="button"
                      onClick={() => setInfoModal("lawyer")}
                      className="absolute top-3.5 right-3.5 w-[27px] h-[27px] rounded-full bg-[#062c55] text-white flex items-center justify-center hover:bg-[#0c8f72] transition-colors cursor-pointer shadow-[0_2px_6px_-1px_rgba(6,44,85,0.4)] z-10"
                      aria-label="Info about talking to an attorney"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-[15px] h-[15px] block"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="6.6" r="1.7" />
                        <rect x="10.5" y="10" width="3" height="8.4" rx="1.5" />
                      </svg>
                    </button>
                    <div>
                      <span className="font-sans font-[800] uppercase tracking-[0.8px] text-[11px] leading-[16px] text-[#0c7a60]">
                        Get help
                      </span>
                      <h3 className="font-serif font-[600] text-[19px] leading-[24px] text-[#062c55] mt-1 mb-2">
                        Talk to an attorney
                      </h3>
                      <div className="font-serif font-[600] text-[30px] leading-none text-[#062c55] mb-2 flex items-baseline gap-2 flex-wrap">
                        Free{" "}
                        <span className="font-sans font-[700] text-[11px] leading-none text-[#0c7a60]">
                          first call · free to connect
                        </span>
                      </div>
                      <p className="font-sans font-normal text-[13px] leading-[19.5px] text-[#5a6b78] mb-5">
                        The clearest way to understand what actually applies
                        to your situation.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAskLawyerOpen(true)}
                      className="w-full py-3 px-4 rounded-[9px] bg-gradient-to-b from-[#0eb28d] to-[#0c8f72] hover:brightness-105 text-white font-sans font-[800] text-[14px] leading-[20px] shadow-[0_12px_22px_-14px_rgba(12,143,114,0.7)] transition-all cursor-pointer text-center min-h-[50px] flex items-center justify-center"
                    >
                      Ask an attorney to contact me — free
                    </button>
                  </div>
                </div>

                {/* Checklist Link */}
                <div className="text-center my-4 font-sans font-normal text-[13.5px] leading-[20px] text-[#5a6b78]">
                  Happy with the offer as it is?{" "}
                  <button
                    type="button"
                    onClick={() => setChecklistOpen(true)}
                    className="font-sans font-[700] text-[#0c8f72] underline hover:no-underline cursor-pointer"
                  >
                    Get your free 3-point checklist →
                  </button>
                </div>

                {/* Why talk to an attorney? Callout (whylaw) */}
                <div className="rounded-[12px] p-[14px_18px] bg-[#f0f9f5] border border-[#c7e6d6] font-sans font-normal text-[13.5px] leading-[21px] text-[#12523f] my-4 text-center max-w-[640px] mx-auto">
                  <b className="font-bold text-[#062c55]">Why talk to an attorney?</b> In
                  the US there&apos;s no set severance amount — the value is in
                  the <b>process</b>: whether the release and notice followed the
                  rules, and what leverage that gives you. An employment attorney
                  can spot it, the first call is <b>free</b>, there&apos;s no
                  obligation, and you choose who to talk to.
                </div>

                {/* Legal Disclaimer Text (disc) */}
                <p className="font-sans font-normal text-[11.5px] leading-[17px] text-[#5a6b78] leading-relaxed text-left mt-6 max-w-[640px] mx-auto">
                  Educational and organizational information — not legal advice.
                  FairExit does not assess whether your layoff was lawful,
                  evaluate compliance, or tell you what you&apos;re owed. Federal
                  and state rules differ and every situation turns on the details
                  — only a licensed employment attorney can advise you. Deadlines
                  to act (for example EEOC charge deadlines) can be short —
                  confirm them with an attorney promptly. We&apos;re paid a flat
                  advertising fee by attorneys; never a cut of your outcome, and
                  you always choose who to talk to.
                </p>
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
                <span className="text-xs text-[#2b3a45] leading-relaxed">
                  {whyCopy.text}
                </span>
              </div>
            )}

            {/* FairExit Summary Card */}
            <div className="bg-[#EEF1F4] border border-[#e7e4dd] rounded-[14px] p-4 sm:p-5 shadow-[0_4px_20px_0_rgba(6,44,85,0.06)]">
              <span className="font-sans font-[800] uppercase text-[10.5px] leading-[16px] tracking-[0.8px] text-[#5a6b78]">
                Your details so far
              </span>
              <h3 className="font-serif font-[600] text-[18px] leading-[22px] text-[#062c55] mb-3">
                FairExit summary
              </h3>

              {/* Dynamic Summary Details */}
              <div className="space-y-1.5 text-xs">
                {US_SUMMARY_FIELDS.filter((f) => isFieldVisible(f.key)).length ===
                0 ? (
                  <div className="text-[#8a98a4] italic py-2 font-sans font-normal text-xs">
                    Your answers will stack up here as you go.
                  </div>
                ) : (
                  US_SUMMARY_FIELDS.filter((f) => isFieldVisible(f.key)).map(
                    (f) => (
                      <div
                        key={f.key}
                        className="flex justify-between items-start py-1 border-b border-dashed border-[#e7e4dd] gap-2"
                      >
                        <span className="font-sans font-normal text-[13px] leading-[18px] text-[#5a6b78] shrink-0">
                          {f.label}
                        </span>
                        <b className="font-sans font-[700] text-[13px] leading-[18px] text-[#062c55] text-right">
                          {getSummaryValue(f.key)}
                        </b>
                      </div>
                    ),
                  )
                )}
              </div>

              {/* Enough to show results banner */}
              {currentStep !== "step-results" &&
                Boolean(
                  (isFieldVisible("years") && isFieldVisible("salary")) ||
                    (state.years && state.salary),
                ) && (
                  <div className="mt-3 text-[12px] font-sans font-[700] leading-[16px] text-[#0c8f72] bg-[#e5f5ee] border border-[#b9e6d4] rounded-[6px] px-3 py-2 text-center">
                    ✓ Enough to show your results
                  </div>
                )}
            </div>

            {/* Live Read Card in results step matching screenshot */}
            {currentStep === "step-results" && (
              <div className="mt-4 bg-[#f3faf6] border border-[#cfe8dd] rounded-[14px] p-4 sm:p-5 shadow-[0_4px_20px_0_rgba(6,44,85,0.06)] animate-in fade-in">
                <span className="font-sans font-[800] uppercase text-[10.5px] leading-[16px] tracking-[0.8px] text-[#5a6b78]">
                  LIVE READ · NOT AN ASSESSMENT
                </span>
                <h4 className="font-serif font-[600] text-[18px] leading-[22px] text-[#0c8f72] mt-0.5 mb-2.5">
                  5 things to check
                </h4>
                <ul className="space-y-2 font-sans font-normal text-[13px] leading-[19px] text-[#5a6b78] mb-4">
                  <li className="flex items-start gap-1.5 leading-relaxed">
                    <span>•</span>
                    <span>Time to consider looks short</span>
                  </li>
                  <li className="flex items-start gap-1.5 leading-relaxed">
                    <span>•</span>
                    <span>
                      A 7-day period to change your mind is a common requirement
                      for age-40+ releases
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5 leading-relaxed">
                    <span>•</span>
                    <span>
                      For an age-40+ group program, the law requires a disclosure
                      of the ages &amp; job titles selected
                    </span>
                  </li>
                </ul>
                <div className="text-[12px] font-sans font-[700] leading-[16px] text-[#0c8f72] bg-[#e5f5ee] border border-[#b9e6d4] rounded-[6px] px-3 py-2 text-center">
                  ✓ Enough to show your results
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Floating action buttons at bottom-right (Desktop) */}
      <div className="fixed bottom-6 right-6 z-30 hidden md:flex flex-col items-center gap-2.5">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            triggerGetApp();
          }}
          className="w-10 h-10 rounded-full bg-white border border-[#d5dde4] shadow-[0_4px_14px_rgba(6,44,85,0.12)] flex items-center justify-center text-[#062c55] hover:scale-105 transition-transform cursor-pointer"
          aria-label="Get the app"
          title="Get the app"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5"
          >
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
          </svg>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleDialog();
          }}
          className="w-10 h-10 rounded-full bg-[#062c55] text-white shadow-[0_4px_14px_rgba(6,44,85,0.25)] flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
          aria-label="Accessibility options"
          title="Accessibility options"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z" />
          </svg>
        </button>
      </div>

      {/* ── OPTION INFO POP-UP (ⓘ) ── */}
      {infoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#062c55]/45 backdrop-blur-[2px] animate-in fade-in duration-150"
          onClick={() => setInfoModal(null)}
        >
          <div
            className="relative bg-white rounded-[16px] p-5 sm:p-6 max-w-[420px] w-full max-h-[92vh] overflow-y-auto shadow-[0_40px_80px_-30px_rgba(6,44,85,0.55)] border border-[#e7e4dd] text-left animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-sans font-[800] text-[11px] uppercase tracking-[0.6px] text-[#0c8f72] mb-1.5">
              Details
            </div>

            {infoModal === "report" ? (
              <>
                <h3 className="font-sans font-[700] text-[16px] text-[#062c55] leading-snug mb-3">
                  Inside your $59 Severance Report
                </h3>
                <ul className="space-y-2 mb-5">
                  <li className="flex items-start gap-2.5 font-sans font-normal text-[13px] leading-[19px] text-[#17242f]">
                    <span className="text-[#0c8f72] font-[800] text-[13px] leading-[19px] flex-shrink-0">
                      ✓
                    </span>
                    <span>A 15-page PDF you can hand to HR or an attorney</span>
                  </li>
                  <li className="flex items-start gap-2.5 font-sans font-normal text-[13px] leading-[19px] text-[#17242f]">
                    <span className="text-[#0c8f72] font-[800] text-[13px] leading-[19px] flex-shrink-0">
                      ✓
                    </span>
                    <span>Your key terms, explained in plain language</span>
                  </li>
                  <li className="flex items-start gap-2.5 font-sans font-normal text-[13px] leading-[19px] text-[#17242f]">
                    <span className="text-[#0c8f72] font-[800] text-[13px] leading-[19px] flex-shrink-0">
                      ✓
                    </span>
                    <span>The federal rules that may apply, in plain English</span>
                  </li>
                  <li className="flex items-start gap-2.5 font-sans font-normal text-[13px] leading-[19px] text-[#17242f]">
                    <span className="text-[#0c8f72] font-[800] text-[13px] leading-[19px] flex-shrink-0">
                      ✓
                    </span>
                    <span>Your dates &amp; deadlines in one timeline</span>
                  </li>
                  <li className="flex items-start gap-2.5 font-sans font-normal text-[13px] leading-[19px] text-[#17242f]">
                    <span className="text-[#0c8f72] font-[800] text-[13px] leading-[19px] flex-shrink-0">
                      ✓
                    </span>
                    <span>General questions to prepare for HR or an attorney</span>
                  </li>
                  <li className="flex items-start gap-2.5 font-sans font-normal text-[13px] leading-[19px] text-[#17242f]">
                    <span className="text-[#0c8f72] font-[800] text-[13px] leading-[19px] flex-shrink-0">
                      ✓
                    </span>
                    <span>A checklist to think through before you sign</span>
                  </li>
                </ul>
              </>
            ) : (
              <>
                <h3 className="font-sans font-[700] text-[16px] text-[#062c55] leading-snug mb-1.5">
                  How connecting works
                </h3>
                <p className="font-sans font-normal text-[13px] leading-[19px] text-[#5a6b78] mb-3.5">
                  We pass your organized summary to an employment attorney in your state. They decide whether to offer a consultation, and you choose whether to go further. You keep a plain-English summary; the attorney gets a clean intake.
                </p>

                {/* Intake Fact Rows */}
                <div className="mt-2 mb-4 space-y-0 text-[12.5px]">
                  <div className="flex justify-between items-center gap-3 py-[5px] border-b border-dashed border-[#c7e6d6]">
                    <span className="font-sans font-normal text-[#5a6b78]">State</span>
                    <span className="font-sans font-[600] text-[#062c55] text-right">
                      {state.usState || "Washington"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-3 py-[5px] border-b border-dashed border-[#c7e6d6]">
                    <span className="font-sans font-normal text-[#5a6b78]">Age 40 or older?</span>
                    <span className="font-sans font-[600] text-[#062c55] text-right">
                      {Number(state.age) >= 40 ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-3 py-[5px] border-b border-dashed border-[#c7e6d6]">
                    <span className="font-sans font-normal text-[#5a6b78]">How it ended</span>
                    <span className="font-sans font-[600] text-[#062c55] text-right">
                      {{ layoff: "Laid off", closure: "Site closure", mass: "Mass layoff", cause: "For cause" }[state.ended] || "Laid off"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-3 py-[5px] border-b border-dashed border-[#c7e6d6]">
                    <span className="font-sans font-normal text-[#5a6b78]">Group layoff?</span>
                    <span className="font-sans font-[600] text-[#062c55] text-right">
                      {state.groupLayoff === "yes" || state.ended === "closure" || state.ended === "mass" || state.others === "50" ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-3 py-[5px] border-b border-dashed border-[#c7e6d6]">
                    <span className="font-sans font-normal text-[#5a6b78]">Employer size</span>
                    <span className="font-sans font-[600] text-[#062c55] text-right">
                      {{ big: "100+", small: "Under 100", unsure: "Unknown" }[state.empsize] || "100+"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-3 py-[5px] border-b border-dashed border-[#c7e6d6]">
                    <span className="font-sans font-normal text-[#5a6b78]">Advance notice</span>
                    <span className="font-sans font-[600] text-[#062c55] text-right">
                      {{ none: "None", wk: "1–2 wks", mid: "3–8 wks", full: "60+ days" }[state.notice] || "None"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-3 py-[5px] border-b border-dashed border-[#c7e6d6]">
                    <span className="font-sans font-normal text-[#5a6b78]">Release requested?</span>
                    <span className="font-sans font-[600] text-[#062c55] text-right">
                      {{ yes: "Yes", no: "No", unsure: "Unclear" }[state.release] || "No"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-3 py-[5px] border-b border-dashed border-[#c7e6d6]">
                    <span className="font-sans font-normal text-[#5a6b78]">Severance promised in writing?</span>
                    <span className="font-sans font-[600] text-[#062c55] text-right">
                      {{ yes: "Yes", no: "No", unsure: "Unclear" }[state.promise] || "Unclear"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-3 py-[5px] border-b border-dashed border-[#c7e6d6]">
                    <span className="font-sans font-normal text-[#5a6b78]">Review period</span>
                    <span className="font-sans font-[600] text-[#062c55] text-right">
                      {{ short: "<21 days", mid: "21–44", full: "45+", unsure: "Unclear" }[state.deadline] || "<21 days"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-3 py-[5px] border-b border-dashed border-[#c7e6d6]">
                    <span className="font-sans font-normal text-[#5a6b78]">7-day revocation</span>
                    <span className="font-sans font-[600] text-[#062c55] text-right">
                      {{ yes: "Yes", no: "Not mentioned", unsure: "Unclear" }[state.revoke] || "Not mentioned"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-3 py-[5px] border-b border-dashed border-[#c7e6d6]">
                    <span className="font-sans font-normal text-[#5a6b78]">Already signed?</span>
                    <span className="font-sans font-[600] text-[#062c55] text-right">
                      {state.signed === "yes" ? "Yes" : "Not yet"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-3 py-[5px] border-b-0">
                    <span className="font-sans font-normal text-[#5a6b78]">Flags</span>
                    <span className="font-sans font-[600] text-[#062c55] text-right">
                      {{ none: "None noted", discrim: "Possible discrimination/retaliation", unpaid: "Unpaid wages/bonus" }[state.redflag] || "Possible discrimination/retaliation"}
                    </span>
                  </div>
                </div>
              </>
            )}

            <button
              type="button"
              onClick={() => setInfoModal(null)}
              className="w-full py-2.5 sm:py-3 rounded-[9px] bg-[#0c8f72] hover:bg-[#0aa07e] text-white font-sans font-[700] text-[14px] leading-[20px] transition-colors cursor-pointer text-center shadow-xs"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Floating action buttons at bottom-right (Desktop) */}
      <div className="fixed bottom-6 right-6 z-30 hidden md:flex flex-col items-center gap-2.5">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            triggerGetApp();
          }}
          className="w-10 h-10 rounded-full bg-white dark:bg-[#133863] border border-[#d5dde4] dark:border-[#2A5A8C] shadow-[0_4px_14px_rgba(6,44,85,0.12)] flex items-center justify-center text-[#062c55] dark:text-white hover:scale-105 transition-transform cursor-pointer"
          aria-label="Get the app"
          title="Get the app"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5"
          >
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
          </svg>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleDialog();
          }}
          className="w-10 h-10 rounded-full bg-[#062c55] dark:bg-[#0EB28D] text-white dark:text-[#062C55] shadow-[0_4px_14px_rgba(6,44,85,0.25)] flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
          aria-label="Accessibility options"
          title="Accessibility options"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z" />
          </svg>
        </button>
      </div>

      {/* ── 3-POINT CHECKLIST MODAL (PHOTO 1 & PHOTO 4) ── */}
      <ChecklistModal
        isOpen={checklistOpen}
        onClose={() => setChecklistOpen(false)}
        onOpenLawyerModal={() => setAskLawyerOpen(true)}
        country="US"
        contractType={state.contract === "none" ? "none" : "signed"}
      />

      {/* ── ASK AN ATTORNEY TO CONTACT ME MODAL (PHOTO 2) ── */}
      <AskLawyerModal
        isOpen={askLawyerOpen}
        onClose={() => setAskLawyerOpen(false)}
        country="US"
        regionName={state.usState || "your state"}
      />

      {/* ── EMAIL ME MY FREE RESULTS MODAL ── */}
      {emailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-[#062c55]/45 backdrop-blur-xs transition-opacity"
            onClick={() => setEmailModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl border border-[#e7e4dd] p-6 sm:p-7 max-w-[420px] w-full shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200 text-center">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0c8f72] block mb-1">
              Free · No card needed
            </span>
            <h3 className="font-serif font-bold text-2xl text-[#062c55] mb-2 leading-tight">
              Email me my free results
            </h3>
            <p className="text-xs sm:text-[13px] text-[#5a6b78] leading-relaxed mb-4">
              We&apos;ll send a clean PDF summary of your checklist and
              details so you have them for reference.
            </p>

            {emailSent ? (
              <div className="p-4 bg-[#e6f5ef] border border-[#b9e6d4] rounded-xl text-sm font-bold text-[#0c7a60] mb-4">
                ✓ Check your inbox! Your results have been sent.
              </div>
            ) : (
              <div className="space-y-3 mb-4">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full border border-[#cdd3d8] rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:border-[#0eb28d]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (emailInput.includes("@")) {
                      setEmailSent(true);
                    }
                  }}
                  className="w-full py-3 rounded-xl bg-[#0eb28d] hover:bg-[#0c8f72] text-white font-bold text-sm shadow-md transition-all cursor-pointer"
                >
                  Send my results →
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setEmailModalOpen(false);
                setEmailSent(false);
              }}
              className="text-xs font-bold text-[#5a6b78] hover:text-[#062c55] cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
