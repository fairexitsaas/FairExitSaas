"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import NextLink from "next/link";
import { useSearchParams } from "next/navigation";
import { estimate, EstimateResult } from "@/lib/severance-rules";
import { QuestionBackButton, QuestionNextButton } from "@/components/common/QuestionNavButtons";
import ChecklistModal from "@/components/dialogs/ChecklistModal";
import AskLawyerModal from "@/components/dialogs/AskLawyerModal";
import SeveranceReportPreviewDialog from "@/components/dialogs/SeveranceReportPreviewDialog";
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
  return "$" + Math.round(n).toLocaleString("en-CA");
}

const PROVINCE_NAMES: Record<string, string> = {
  ON: "Ontario",
  BC: "British Columbia",
  AB: "Alberta",
  NS: "Nova Scotia",
  OTHER: "Other",
};

const EMP_TYPE_LABELS: Record<string, string> = {
  regular: "Regular employee",
  contract: "Fixed-term contract",
  commission: "Mostly commission / self-employed",
};

const SUMMARY_FIELDS = [
  { key: "union", label: "Union member" },
  { key: "emptype", label: "Employment" },
  { key: "province", label: "Province" },
  { key: "age", label: "Age" },
  { key: "years", label: "Years of service" },
  { key: "salary", label: "Pay" },
  { key: "occupation", label: "Occupation" },
  { key: "payroll", label: "Employer payroll >= $2.5M" },
  { key: "otherPay", label: "Other pay" },
  { key: "reemployed", label: "New job yet?" },
  { key: "clause", label: "Min-only clause" },
  { key: "contract", label: "Contract" },
  { key: "reason", label: "How it ended" },
  { key: "market", label: "Similar jobs nearby" },
  { key: "redflag", label: "Anything flagged" },
  { key: "offer", label: "Offer" },
];

function QuestionsContent() {
  const searchParams = useSearchParams();

  const countryParam = searchParams?.get("country")?.toUpperCase();
  const stParam = searchParams?.get("st");
  const isCanada = countryParam
    ? countryParam === "CA"
    : stParam
      ? false
      : true;

  // Overall workflow step:
  // "q1", "q2", "q3", "q4" for the 4 sequential Canada eligibility questions
  // "basics-q1", "basics-q2" for Canada Step 2
  // 1 = Basics, 2 = Money, 3 = Key questions, 4 = Details, 5 = Analyzing, 6 = Results
  // "union" = Union stop
  // For US: "us-situation", 1, 2, 3, 4, 5, 6
  const [currentStep, setCurrentStep] = useState<string>(
    isCanada ? "q1" : "us-situation",
  );
  const [explainOn, setExplainOn] = useState<boolean>(true);

  // Default "Explain each question" switch to off under 768px (phone), on for desktop
  useEffect(() => {
    try {
      const stored = localStorage.getItem("fx_plain");
      if (stored !== null) {
        setExplainOn(stored === "1");
        return;
      }
    } catch (e) {}
    if (typeof window !== "undefined") {
      setExplainOn(window.innerWidth >= 768);
    }
  }, []);

  const handleToggleExplain = (checked: boolean) => {
    setExplainOn(checked);
    try {
      localStorage.setItem("fx_plain", checked ? "1" : "0");
    } catch (e) {}
  };

  const [editingBasics, setEditingBasics] = useState<boolean>(false);
  const [mobileSummOpen, setMobileSummOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [notifiedProvince, setNotifiedProvince] = useState<boolean>(false);
  const [infoModal, setInfoModal] = useState<"report" | "lawyer" | null>(null);
  const [checkoutState, setCheckoutState] = useState<"idle" | "verifying" | "success">("idle");
  const [isReportUnlocked, setIsReportUnlocked] = useState<boolean>(false);
  const [emailModalOpen, setEmailModalOpen] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState<string>("");
  const [emailSent, setEmailSent] = useState<boolean>(false);
  const [checklistModalOpen, setChecklistModalOpen] = useState<boolean>(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [askLawyerOpen, setAskLawyerOpen] = useState<boolean>(false);
  const [reportPreviewOpen, setReportPreviewOpen] = useState<boolean>(false);
  const { toggleDialog } = useAccessibility();

  const validateBasicsFields = (): { isValid: boolean; errors: Record<string, boolean>; message: string } => {
    const errors: Record<string, boolean> = {};
    let msg = "";

    // 1. Age validation
    const ageClean = String(state.age || "").trim();
    const ageNum = parseInt(ageClean, 10);
    const isAgeEmpty = !ageClean;
    const isAgeOutOfRange = !isAgeEmpty && (isNaN(ageNum) || ageNum < 16 || ageNum > 99);
    if (isAgeEmpty) {
      errors.age = true;
      if (!msg) msg = "Please enter your age.";
    } else if (isAgeOutOfRange) {
      errors.age = true;
      if (!msg) msg = "Age must be between 16 and 99.";
    }

    // 2. Years of service validation
    const yearsClean = String(state.years || "").trim();
    const yearsNum = parseFloat(yearsClean);
    const isYearsEmpty = !yearsClean;
    const isYearsOutOfRange = !isYearsEmpty && (isNaN(yearsNum) || yearsNum < 0 || yearsNum > 70);
    const isYearsExceedAge =
      !isYearsEmpty && !isNaN(yearsNum) && !isNaN(ageNum) && (yearsNum >= ageNum || yearsNum > ageNum - 14);

    if (isYearsEmpty) {
      errors.years = true;
      if (!msg) msg = "Please enter your years of service.";
    } else if (isYearsExceedAge) {
      errors.years = true;
      if (!msg) msg = "Years of service cannot exceed your age (started after age 14).";
    } else if (isYearsOutOfRange) {
      errors.years = true;
      if (!msg) msg = "Years of service must be between 0 and 70.";
    }

    // 3. Salary validation
    const salClean = String(state.salary || "").replace(/[^0-9.]/g, "");
    const salNum = parseFloat(salClean);
    const isSalEmpty = !salClean;
    const isSalOutOfRange = !isSalEmpty && (isNaN(salNum) || salNum < 500 || salNum > 1000000000);

    if (isSalEmpty) {
      errors.salary = true;
      if (!msg) msg = "Please enter your annual pay.";
    } else if (isSalOutOfRange) {
      errors.salary = true;
      if (!msg) msg = "Annual pay must be at least $500.";
    }

    if (errors.age && errors.years) {
      if (isAgeOutOfRange && (isYearsOutOfRange || isYearsExceedAge)) {
        msg = "Please enter a valid age (16–99) and years of service (0–70).";
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      message: msg,
    };
  };

  const handleUnlockReport = () => {
    setCheckoutState("verifying");
    setTimeout(() => {
      setCheckoutState("success");
      setTimeout(() => {
        setIsReportUnlocked(true);
        setCheckoutState("idle");
        setInfoModal(null);
      }, 900);
    }, 1100);
  };

  // User answers tracking via useState for FairExit summary box
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});

  const getMobileSummarySnippet = () => {
    const parts: string[] = [];
    const provRaw = userAnswers.province || state.province;
    const provName = {
      ON: "Ontario",
      BC: "British Columbia",
      AB: "Alberta",
      NS: "Nova Scotia",
      OTHER: "Other",
    }[provRaw] || provRaw;

    if (provName) parts.push(provName);
    const yrs = userAnswers.years || state.years;
    if (yrs) parts.push(`${String(yrs).replace(/[^0-9.]/g, "")} yrs`);
    else {
      const a = userAnswers.age || state.age;
      if (a) parts.push(`Age ${a}`);
    }

    if (parts.length > 0) {
      return `— ${parts.join(" · ")}`;
    }
    return "— just getting started";
  };

  const saveAnswer = (key: string, val: string) => {
    setUserAnswers((prev) => ({ ...prev, [key]: val }));
  };

  const populateAllAnswers = (s: typeof state) => {
    const occLabel =
      OCCUPATIONS.find((o) => Math.abs(o.value - s.roleFactor) < 0.01)?.label ||
      "Middle management / Senior / Director";
    const payLabelMap: Record<string, string> = {
      bonus: "Bonus",
      stock: "Stock",
      benefits: "Benefits",
      commission: "Commission",
      pto: "PTO",
    };
    const checkedPay = Object.entries(s.pay)
      .filter(([_, v]) => Boolean(v))
      .map(([k]) => payLabelMap[k] || k);
    const otherPayText = checkedPay.length > 0 ? checkedPay.join(", ") : "None";

    const contractMap: Record<string, string> = {
      changed: "Signed - role changed",
      old: "Signed - role changed",
      original: "Original contract",
      current: "Original contract",
      never: "Never signed",
      none: "Never signed",
      unsure: "Not sure",
    };
    const reasonMap: Record<string, string> = {
      layoff: "Laid off",
      fired: "Fired / For cause",
      cause: "For cause",
      quit: "Constructive dismissal / Quit",
      constructive: "Forced out",
      templayoff: '"Temporary layoff"',
      mass: "Part of a big layoff (50+)",
      restructure: "Restructure / Downsized",
    };
    const marketMap: Record<string, string> = {
      mid: "Some",
      easy: "Many",
      hard: "Few / Hard",
    };
    const redflagMap: Record<string, string> = {
      none: "Nothing unusual",
      harassment: "Harassment / Reprisal",
      mistreat: "Mistreatment / discrimination",
      medical: "Medical / Disability",
      pregnant: "Pregnancy / Parental",
      unpaid: "Unpaid bonus / wages",
      other: "Other",
    };

    const newAnswers: Record<string, string> = {
      union: s.union === "yes" ? "Yes" : s.union === "no" ? "No" : "Not sure",
      emptype: EMP_TYPE_LABELS[s.emptype] || "Regular employee",
      province: PROVINCE_NAMES[s.province] || s.province || "Ontario",
      age: s.age || "52",
      years: s.years ? `${s.years} yrs` : "14 yrs",
      salary: s.salary ? `${kMoney(parseFloat(s.salary))}/yr` : "$110k/yr",
      occupation: occLabel,
      payroll:
        s.payroll === "yes" ? "Yes" : s.payroll === "no" ? "No" : "Not sure",
      otherPay: otherPayText,
      reemployed:
        s.reemployed === "no"
          ? "Not yet"
          : s.reemployed === "yes"
            ? "Yes"
            : s.reemployed === "soon"
              ? "Interviews"
              : "Offer received",
      clause:
        s.clause === "no" ? "No" : s.clause === "yes" ? "Yes" : "Not sure",
      contract: contractMap[s.contract] || "Signed - role changed",
      reason: reasonMap[s.reason] || "Laid off",
      market: marketMap[s.market] || "Some",
      redflag: redflagMap[s.redflag] || "Nothing unusual",
      offer: s.offer ? kMoney(s.offer) : "$24k",
    };

    setUserAnswers(newAnswers);
    return newAnswers;
  };

  // Form State
  const [state, setState] = useState({
    union: "",
    emptype: "",
    signed: "",
    federal: "",
    agreed: false,
    province: "",
    usState: "",
    age: "",
    years: "",
    salary: "",
    payroll: "",
    roleFactor: 1.15,
    pay: {
      bonus: false,
      stock: false,
      benefits: false,
      commission: false,
      pto: false,
    } as Record<string, boolean>,
    offer: 0,
    reemployed: "",
    clause: "",
    contract: "",
    reason: "",
    market: "",
    redflag: "",
    groupLayoff: "",
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

    if (p || st || y || s || a || age40 || grp || r || off) {
      setState((prev) => ({
        ...prev,
        ...(p ? { province: p } : {}),
        ...(st ? { usState: st } : {}),
        ...(y ? { years: y.replace(/\D/g, "") } : {}),
        ...(s ? { salary: s.replace(/\D/g, "") } : {}),
        ...(a ? { age: a.replace(/\D/g, "") } : age40 === "yes" ? { age: "52" } : {}),
        ...(r ? { roleFactor: parseFloat(r) } : {}),
        ...(off ? { offer: parseInt(off.replace(/\D/g, ""), 10) } : {}),
        ...(grp ? { groupLayoff: grp } : {}),
      }));
    }

    const stepParam = searchParams.get("step");
    const loadingParam = searchParams.get("loading");
    if (
      stepParam === "loading" ||
      stepParam === "step-analyzing" ||
      loadingParam === "true" ||
      loadingParam === "1"
    ) {
      setCurrentStep("step-analyzing");
      populateAllAnswers({
        ...state,
        province: p || state.province,
        years: y ? y.replace(/\D/g, "") : state.years,
        salary: s ? s.replace(/\D/g, "") : state.salary,
        age: a ? a.replace(/\D/g, "") : age40 === "yes" ? "52" : state.age,
        roleFactor: r ? parseFloat(r) : state.roleFactor,
        offer: off ? parseInt(off.replace(/\D/g, ""), 10) : state.offer,
      });
    } else if (stepParam === "union") {
      setCurrentStep("union");
      if (a) saveAnswer("age", a);
      if (y) saveAnswer("years", `${y} yrs`);
      if (s) saveAnswer("salary", `${Math.round(parseFloat(s) / 1000)}k/yr`);
      if (off) saveAnswer("offer", `$${off}`);
    } else if (
      stepParam === "province-stop" ||
      stepParam === "stop" ||
      p === "OTHER"
    ) {
      setCurrentStep("province-stop");
      if (a) saveAnswer("age", a);
      if (y) saveAnswer("years", `${y} yrs`);
      if (s) saveAnswer("salary", `${Math.round(parseFloat(s) / 1000)}k/yr`);
      if (off) saveAnswer("offer", `$${off}`);
    } else if (stepParam === "step-results" || stepParam === "results") {
      setCurrentStep("step-results");
      populateAllAnswers({
        ...state,
        province: p || state.province,
        years: y ? y.replace(/\D/g, "") : state.years,
        salary: s ? s.replace(/\D/g, "") : state.salary,
        age: a ? a.replace(/\D/g, "") : age40 === "yes" ? "52" : state.age,
        roleFactor: r ? parseFloat(r) : state.roleFactor,
        offer: off ? parseInt(off.replace(/\D/g, ""), 10) : state.offer,
      });
    } else {
      // Normal flow entry: always display questions from the beginning!
      setCurrentStep("q1");
    }
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

      const mkFactor =
        state.market === "easy" ? 0.9 : state.market === "hard" ? 1.15 : 1;
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
  }, [
    isCanada,
    state.age,
    state.years,
    state.salary,
    state.province,
    state.roleFactor,
    state.payroll,
    state.market,
  ]);

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
          text: 'A fixed-term contract can be owed the rest of the term; a commission or contractor role may not be an "employee" at all. Both change the answer.',
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
      } else if (
        ["basics-q1", "basics-q2", "step-basics"].includes(currentStep)
      ) {
        return {
          title: "ONTARIO'S EXTRA LAYER",
          text: "Ontario has an extra layer called severance pay — a week per year, up to 26 weeks — but only for people with 5+ years at an employer whose global payroll tops $2.5 million — every location, plus parent and related companies count. Many people never hear about it, and most calculators get it wrong.",
        };
      } else if (currentStep === "money-q1") {
        return {
          title: "YOUR WHOLE PAY COUNTS",
          text: "Notice is usually measured in months of your total pay — bonus, commission and benefits count. Leaving them out makes the number too small.",
        };
      } else if (currentStep === "money-q2") {
        return {
          title: "WHERE YOUR OFFER LANDS",
          text: "So the read can show where your offer sits — under the floor, near it, or inside the range courts award. That gap is the whole conversation.",
        };
      } else if (["money-q3", "step-money"].includes(currentStep)) {
        return {
          title: "A NEW JOB CAN SHRINK THE CLAIM",
          text: "If you've started a new job, the amount you can claim usually goes down — the law expects you to look for work, and counts what you earn.",
        };
      } else if (["clause-q1", "step-clause"].includes(currentStep)) {
        return {
          title: "THE SENTENCE THAT CAN CAP YOU",
          text: "This one sentence in a contract is what employers rely on to pay only the minimum. Courts often find these clauses don't hold up — and then the bigger what courts award applies. It's the first thing a lawyer reads.",
        };
      } else if (currentStep === "clause-q2") {
        return {
          title: "AN OLD CONTRACT MAY NOT BIND YOU",
          text: "No contract means no clause can cap you. An old contract from before a promotion often can't either — the job it describes isn't the job you were doing.",
        };
      } else if (["details-q1", "step-details"].includes(currentStep)) {
        return {
          title: "HOW IT ENDED CHANGES EVERYTHING",
          text: '"for cause" means the employer says you did something serious enough to owe you nothing — a bar they rarely clear. "Forced out" (constructive dismissal) can count the same as being let go. A "temporary layoff" you never agreed to in writing can be a termination in disguise. And if 50+ people at one location lost their jobs within 4 weeks, Ontario\'s mass-termination rules can raise the minimum notice.',
        };
      } else if (currentStep === "details-q2") {
        return {
          title: "SCARCE JOBS MEAN LONGER NOTICE",
          text: "This is the fourth thing courts weigh (with age, tenure and role): how long it realistically takes someone like you to land an equivalent job. Specialised roles, small towns and shrinking industries all push the range up.",
        };
      } else if (currentStep === "details-q3") {
        return {
          title: "SEPARATE CLAIMS, ON TOP OF SEVERANCE",
          text: "Mistreatment or discrimination is a separate claim on top of severance; unpaid wages or bonus are owed regardless. Both change what a lawyer would look at.",
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
    if (currentStep === "union") return 16;
    if (currentStep === "province-stop") return 28;
    if (currentStep === "us-situation") return 20;
    if (currentStep === "basics-q1") return 28;
    if (currentStep === "basics-q2" || currentStep === "step-basics") return 36;
    if (currentStep === "money-q1") return 42;
    if (currentStep === "money-q2") return 48;
    if (["money-q3", "step-money"].includes(currentStep)) return 54;
    if (currentStep === "clause-q1") return 66;
    if (["clause-q2", "step-clause"].includes(currentStep)) return 76;
    if (currentStep === "details-q1") return 82;
    if (currentStep === "details-q2") return 88;
    if (["details-q3", "step-details"].includes(currentStep)) return 94;
    if (currentStep === "step-analyzing" || currentStep === "step-results")
      return 100;
    return 10;
  }, [currentStep]);

  const activeRailIndex = useMemo(() => {
    if (["q1", "q2", "q3", "q4", "union", "us-situation"].includes(currentStep))
      return 0;
    if (
      ["basics-q1", "basics-q2", "step-basics", "province-stop"].includes(
        currentStep,
      )
    )
      return 1;
    if (
      ["money-q1", "money-q2", "money-q3", "step-money"].includes(currentStep)
    )
      return 2;
    if (["clause-q1", "clause-q2", "step-clause"].includes(currentStep))
      return 3;
    if (
      ["details-q1", "details-q2", "details-q3", "step-details"].includes(
        currentStep,
      )
    )
      return 4;
    if (["step-analyzing", "step-results"].includes(currentStep)) return 5;
    return 0;
  }, [currentStep]);

  const handleExit = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setCurrentStep("q1");
    setUserAnswers({});
    window.location.href = "/";
  };

  // Navigation handlers for the Canada steps
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
    if (!state.agreed || !state.federal) return;
    if (!userAnswers.federal) {
      saveAnswer("federal", state.federal === "yes" ? "Yes" : "No");
    }
    if (state.union === "yes") {
      setCurrentStep("union");
    } else {
      setCurrentStep("basics-q1");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStartAnalyze = () => {
    populateAllAnswers(state);
    setCurrentStep("step-analyzing");
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => {
      setCurrentStep("step-results");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 2400);
  };

  const caSteps = [
    { key: "q1", num: "1", label: "Eligible" },
    { key: "basics-q1", num: "2", label: "Basics" },
    { key: "money-q1", num: "3", label: "Money" },
    { key: "clause-q1", num: "4", label: "Key questions" },
    { key: "details-q1", num: "5", label: "Details" },
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
    <div className="min-h-screen bg-[#f6f4ef] text-[#17242f] font-sans antialiased pb-16">
      {/* ── TOP HEADER / NAV ── */}
      <header className="sticky top-0 z-30 bg-[#f6f4ef]/95 backdrop-blur-md border-b border-[#e7e4dd]">
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
            <nav
              className="hidden lg:flex items-center gap-5 sm:gap-6 text-[13.5px] font-semibold text-[#5a6b78]"
              aria-label="Site"
            >
              <NextLink
                href="/#how"
                className="hover:text-[#062c55] transition-colors"
              >
                How it works
              </NextLink>
              <NextLink
                href="/#paths"
                className="hover:text-[#062c55] transition-colors"
              >
                Pricing
              </NextLink>
              <NextLink
                href="/#faq"
                className="hover:text-[#062c55] transition-colors"
              >
                FAQ
              </NextLink>
              <NextLink
                href="/#why"
                className="hover:text-[#062c55] transition-colors"
              >
                Blog
              </NextLink>
              <NextLink
                href="/#about"
                className="hover:text-[#062c55] transition-colors"
              >
                About
              </NextLink>
            </nav>

            <button
              type="button"
              onClick={() => triggerGetApp()}
              className="hidden lg:inline-block text-[13px] font-bold text-[#0c8f72] hover:underline whitespace-nowrap cursor-pointer"
            >
              Get the app
            </button>
            <button
              type="button"
              onClick={handleExit}
              className="hidden lg:inline-block text-[13px] font-semibold text-[#5a6b78] hover:text-[#062c55] transition-colors whitespace-nowrap cursor-pointer bg-transparent border-none p-0"
            >
              Exit ✕
            </button>

            {/* Mobile Your Details Trigger Button */}
            <button
              type="button"
              onClick={() => setMobileSummOpen((prev) => !prev)}
              className="lg:hidden inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] border border-[#cfe8dd] bg-[#eef8f3] text-[13px] font-bold text-[#062c55] shadow-xs cursor-pointer"
              aria-expanded={mobileSummOpen}
            >
              Your details
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className={`w-3.5 h-3.5 text-[#062c55] transition-transform duration-200 ${mobileSummOpen ? "rotate-180" : ""}`}
              >
                <path
                  d="M6 15l6-6 6 6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {/* Hamburger for mobile */}
            <button
              type="button"
              className="lg:hidden w-9 h-9 rounded-[10px] border border-[#d5dde4] bg-white text-[#062c55] flex items-center justify-center shadow-xs focus:outline-none cursor-pointer"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile menu"
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

        {/* Mobile Nav Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#f6f4ef] border-b border-[#e7e4dd] px-5 py-2 text-sm font-bold text-[#062c55] animate-in fade-in">
            <NextLink
              href="/#how"
              className="block py-2.5 border-b border-[#e7e4dd]/80 text-[#062c55] hover:text-[#0c8f72] transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              How it works
            </NextLink>
            <NextLink
              href="/#paths"
              className="block py-2.5 border-b border-[#e7e4dd]/80 text-[#062c55] hover:text-[#0c8f72] transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </NextLink>
            <NextLink
              href="/#faq"
              className="block py-2.5 border-b border-[#e7e4dd]/80 text-[#062c55] hover:text-[#0c8f72] transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              FAQ
            </NextLink>
            <NextLink
              href="/#why"
              className="block py-2.5 border-b border-[#e7e4dd]/80 text-[#062c55] hover:text-[#0c8f72] transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Blog
            </NextLink>
            <NextLink
              href="/#about"
              className="block py-2.5 border-b border-[#e7e4dd]/80 text-[#062c55] hover:text-[#0c8f72] transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              About
            </NextLink>
            <div className="pt-3 pb-2 flex justify-between text-xs text-[#5a6b78]">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  triggerGetApp();
                }}
                className="font-bold text-[#0c8f72] cursor-pointer bg-transparent border-none p-0"
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

      {/* ── MOBILE / TABLET SUMMARY BOTTOM SHEET ── */}
      {mobileSummOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-[60] bg-[#062c55]/40 backdrop-blur-xs animate-scrimin"
            onClick={() => setMobileSummOpen(false)}
          />
          <div className="lg:hidden fixed inset-x-0 bottom-0 z-[70] bg-[#EEF1F4] border-t border-[#e7e4dd] rounded-t-2xl sm:max-w-xl sm:mx-auto p-5 pb-8 shadow-2xl max-h-[80vh] overflow-y-auto animate-dlgup">
            <div className="flex items-center justify-between pb-3 border-b border-[#e7e4dd] mb-4">
              <div>
                <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#5a6b78]">
                  Your details so far
                </span>
                <h3 className="font-serif text-lg font-semibold text-[#062c55]">
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
            {/* Summary Details */}
            <div className="space-y-1.5 text-[13px]">
              {SUMMARY_FIELDS.filter((f) => Boolean(userAnswers[f.key]))
                .length === 0 ? (
                <div className="text-[#8a98a4] italic py-2">
                  Your answers will stack up here as you go.
                </div>
              ) : (
                SUMMARY_FIELDS.filter((f) => Boolean(userAnswers[f.key])).map(
                  (f) => (
                    <div
                      key={f.key}
                      className="flex justify-between items-start py-1.5 border-b border-dashed border-[#e7e4dd] gap-2 animate-rowin"
                    >
                      <span className="text-[#5a6b78] shrink-0">{f.label}</span>
                      <b className="text-[#062c55] font-semibold text-right leading-tight animate-flash">
                        {userAnswers[f.key]}
                      </b>
                    </div>
                  ),
                )
              )}
            </div>

            {/* Enough to show results banner (as in original) */}
            {Boolean(
              (userAnswers.years && userAnswers.salary) ||
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
      <div className="max-w-[1080px] mx-auto px-4 sm:px-5 pt-4 pb-20 lg:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,720px)_320px] gap-8 justify-center items-start">
          {/* LEFT: MAIN WORKFLOW (PROGRESS + CARD) */}
          <div className="w-full">
            {/* PROGRESS RAIL & TRACK (Directly on top of questions box) */}
            <div className="mb-5">
              <ol
                className="grid grid-cols-6 gap-1.5 list-none m-0 p-0 mb-2 text-center"
                id="stepsBar"
              >
                {stepsList.map((s, idx) => {
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
              <div className="h-1.5 bg-[#e9e5dc] rounded-full relative mx-2">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#0c8f72] to-[#0eb28d] transition-all duration-500 relative"
                  style={{ width: `${progressPercent}%` }}
                >
                  <span
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 rounded-full bg-[#0eb28d] border-2 border-white shadow-[0_1px_4px_rgba(6,44,85,0.25)] transition-all duration-500 pointer-events-none"
                    aria-hidden="true"
                  />
                </div>
              </div>

              {/* Subheading row: Step label + Explain toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 mt-3">
                <div className="text-xs font-bold text-[#5a6b78] w-full sm:w-auto">
                  <span>
                    {["q1", "q2", "q3", "q4"].includes(currentStep) &&
                      "Step 1 of 5 · Are you eligible?"}
                    {currentStep === "union" && "Union members"}
                    {currentStep === "province-stop" && "Your province"}
                    {currentStep === "us-situation" &&
                      "Step 1 · Your situation"}
                    {["basics-q1", "basics-q2", "step-basics"].includes(
                      currentStep,
                    ) &&
                      (isCanada
                        ? "Step 2 of 5 · The basics"
                        : "Step 2 · The layoff")}
                    {[
                      "money-q1",
                      "money-q2",
                      "money-q3",
                      "step-money",
                    ].includes(currentStep) &&
                      (isCanada
                        ? "Step 3 of 5 · The money picture"
                        : "Step 3 · The papers")}
                    {["clause-q1", "clause-q2", "step-clause"].includes(
                      currentStep,
                    ) &&
                      (isCanada
                        ? "Step 4 of 5 · The key questions"
                        : "Step 4 · Key question")}
                    {[
                      "details-q1",
                      "details-q2",
                      "details-q3",
                      "step-details",
                    ].includes(currentStep) &&
                      (isCanada
                        ? "Step 5 of 5 · Last details"
                        : "Step 5 · Details")}
                    {currentStep === "step-analyzing" &&
                      "Reading your situation…"}
                    {currentStep === "step-results" && "Your results"}
                  </span>
                  <span className="block sm:inline sm:ml-2 font-medium italic text-[#5a6b78] mt-0.5 sm:mt-0">
                    {["q1", "q2", "q3", "q4"].includes(currentStep) &&
                      "Ten seconds, promise."}
                    {["basics-q1", "basics-q2", "step-basics"].includes(
                      currentStep,
                    ) &&
                      (isCanada
                        ? "Nice — the facts a lawyer would ask first."
                        : "The facts a lawyer would ask first.")}
                    {[
                      "money-q1",
                      "money-q2",
                      "money-q3",
                      "step-money",
                    ].includes(currentStep) &&
                      "Halfway. This is where the number gets real."}
                    {["clause-q1", "clause-q2", "step-clause"].includes(
                      currentStep,
                    ) && "The one that matters most."}
                    {[
                      "details-q1",
                      "details-q2",
                      "details-q3",
                      "step-details",
                    ].includes(currentStep) && "Last one — then your read."}
                    {currentStep === "step-results" &&
                      "Here's where you stand."}
                  </span>
                </div>

                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-[#5a6b78] select-none ml-auto">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={explainOn}
                    onChange={(e) => handleToggleExplain(e.target.checked)}
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
                SCREEN 1 (QUESTION 1 OF 4): WERE YOU IN A UNION?
            ════════════════════════════════════════════════════════════════ */}
            {currentStep === "q1" && (
              <div className="relative bg-white border border-[#e7e4dd] rounded-[18px] p-4 sm:p-6 md:p-8 shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] animate-fade">
                {/* 4 Dots Indicator - Upper Right Corner */}
                <div className="flex justify-end mb-2">
                  <div
                    className="flex items-center gap-1.5 shrink-0"
                    aria-label="Question 1 of 4"
                  >
                    <i className="inline-block w-2 h-2 rounded-full bg-[#0eb28d]" />
                    <i className="inline-block w-2 h-2 rounded-full bg-[#dcd8cf]" />
                    <i className="inline-block w-2 h-2 rounded-full bg-[#dcd8cf]" />
                    <i className="inline-block w-2 h-2 rounded-full bg-[#dcd8cf]" />
                  </div>
                </div>

                {/* Full-width 100% Free Badge Box */}
                <div className="w-full flex items-center gap-2.5 p-2.5 px-3.5 rounded-xl bg-gradient-to-r from-[#e6f8f1] to-[#f3faf6] border border-[#b9e6d4] shadow-[0_4px_16px_-12px_rgba(14,178,141,0.5)] mb-5">
                  <span className="w-5 h-5 rounded-full bg-[#0eb28d] text-white font-extrabold flex items-center justify-center shrink-0 text-[11px]">
                    ✓
                  </span>
                  <span className="text-xs sm:text-[13px] text-[#1f3b32]">
                    <b className="font-bold text-[#062c55]">
                      100% free to get your read.
                    </b>{" "}
                    No card. No signup. No sales call.
                  </span>
                </div>

                {/* Heading */}
                <h1 className="font-serif font-normal text-[23px] sm:text-[27px] text-[#062c55] leading-[1.2] tracking-tight">
                  First — a few things that decide how this works.
                </h1>

                {/* Mobile Ontario Explainer: ONLY when explainOn is true and md:hidden */}
                {explainOn && (
                  <div className="md:hidden my-3 p-3.5 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                    <b>How severance works in Ontario, in one breath:</b> there
                    are three layers. <b>1 · Notice pay</b> — about a week per
                    year, max 8 weeks; everyone gets this.{" "}
                    <b>2 · Severance pay</b> — an extra week per year (max 26)
                    only if you were there 5+ years and the employer&apos;s
                    payroll is over $2.5M. <b>3 · Common law</b> — what courts
                    award when your contract doesn&apos;t validly cap you:
                    months not weeks, up to about 24. Most people are only
                    offered layer 1.{" "}
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
                  These change which rules apply to you. They take ten seconds
                  and make everything after more accurate.
                </p>

                {/* Question title */}
                <div className="font-bold text-[15px] sm:text-[16px] text-[#062c55] mb-2.5">
                  Were you in a union?
                </div>

                {/* Mobile contextual explanation box */}
                {explainOn && (
                  <div className="md:hidden mb-3.5 p-3 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                    <b className="block text-[#0c8f72] font-bold uppercase text-[11px] mb-1">
                      Union jobs follow their own rules
                    </b>
                    If you&apos;re in a union, your severance is set by your
                    collective agreement and handled through your union — the
                    rules below don&apos;t apply to you.
                  </div>
                )}

                {/* Big Pills */}
                <div className="space-y-2.5">
                  <div
                    onClick={() => {
                      setState({ ...state, union: "no" });
                      saveAnswer("union", "No");
                    }}
                    className={`flex items-center gap-3 p-3.5 px-4 rounded-[14px] border-[1.5px] cursor-pointer transition-all ${
                      state.union === "no"
                        ? "border-[#062c55] bg-[#f0f4f8] shadow-sm"
                        : "border-[#e0ddd4] bg-white hover:border-[#c3ccd3] hover:bg-[#fafbfc]"
                    }`}
                  >
                    <span
                      className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 ${
                        state.union === "no"
                          ? "border-[#0eb28d] bg-[#0eb28d]"
                          : "border-[#c3ccd3] bg-white"
                      }`}
                    />
                    <span className="text-[14.5px] font-semibold text-[#17242f]">
                      No — I was not in a union
                    </span>
                  </div>

                  <div
                    onClick={() => {
                      setState({ ...state, union: "yes" });
                      saveAnswer("union", "Yes");
                    }}
                    className={`flex items-start gap-3 p-3.5 px-4 rounded-[14px] border-[1.5px] cursor-pointer transition-all ${
                      state.union === "yes"
                        ? "border-[#062c55] bg-[#f0f4f8] shadow-sm"
                        : "border-[#e0ddd4] bg-white hover:border-[#c3ccd3] hover:bg-[#fafbfc]"
                    }`}
                  >
                    <span
                      className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        state.union === "yes"
                          ? "border-[#0eb28d] bg-[#0eb28d]"
                          : "border-[#c3ccd3] bg-white"
                      }`}
                    />
                    <div>
                      <div className="text-[14.5px] font-semibold text-[#17242f]">
                        Yes — I was a union member
                      </div>
                      <div className="text-xs text-[#5a6b78] mt-0.5">
                        Your collective agreement governs your severance, not
                        the usual rules.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Row: Only Next button */}
                <div className="mt-8 flex items-center justify-end">
                  <QuestionNextButton
                    onClick={() => {
                      if (!state.union) return;
                      if (!userAnswers.union) {
                        saveAnswer(
                          "union",
                          state.union === "yes" ? "Yes" : "No",
                        );
                      }
                      goToQ2();
                    }}
                  />
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                SCREEN 2 (QUESTION 2 OF 4): WHAT KIND OF ROLE WAS IT?
            ════════════════════════════════════════════════════════════════ */}
            {currentStep === "q2" && (
              <div className="relative bg-white border border-[#e7e4dd] rounded-[18px] p-4 sm:p-6 md:p-8 shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] animate-fade">
                {/* 4 Dots Indicator - Upper Right Corner */}
                <div className="flex justify-end mb-2">
                  <div
                    className="flex items-center gap-1.5 shrink-0"
                    aria-label="Question 2 of 4"
                  >
                    <i className="inline-block w-2 h-2 rounded-full bg-[#0eb28d]" />
                    <i className="inline-block w-2 h-2 rounded-full bg-[#0eb28d]" />
                    <i className="inline-block w-2 h-2 rounded-full bg-[#dcd8cf]" />
                    <i className="inline-block w-2 h-2 rounded-full bg-[#dcd8cf]" />
                  </div>
                </div>

                {/* Full-width 100% Free Badge Box */}
                <div className="w-full flex items-center gap-2.5 p-2.5 px-3.5 rounded-xl bg-gradient-to-r from-[#e6f8f1] to-[#f3faf6] border border-[#b9e6d4] shadow-[0_4px_16px_-12px_rgba(14,178,141,0.5)] mb-5">
                  <span className="w-5 h-5 rounded-full bg-[#0eb28d] text-white font-extrabold flex items-center justify-center shrink-0 text-[11px]">
                    ✓
                  </span>
                  <span className="text-xs sm:text-[13px] text-[#1f3b32]">
                    <b className="font-bold text-[#062c55]">
                      100% free to get your read.
                    </b>{" "}
                    No card. No signup. No sales call.
                  </span>
                </div>

                {/* Heading */}
                <h1 className="font-serif font-normal text-[23px] sm:text-[27px] text-[#062c55] leading-[1.2] tracking-tight">
                  First — a few things that decide how this works.
                </h1>

                {explainOn && (
                  <div className="md:hidden my-3 p-3.5 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                    <b>How severance works in Ontario, in one breath:</b> there
                    are three layers. <b>1 · Notice pay</b> — about a week per
                    year, max 8 weeks; everyone gets this.{" "}
                    <b>2 · Severance pay</b> — an extra week per year (max 26)
                    only if you were there 5+ years and the employer&apos;s
                    payroll is over $2.5M. <b>3 · Common law</b> — what courts
                    award when your contract doesn&apos;t validly cap you:
                    months not weeks, up to about 24. Most people are only
                    offered layer 1.{" "}
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
                  These change which rules apply to you. They take ten seconds
                  and make everything after more accurate.
                </p>

                {/* Question title */}
                <div className="font-bold text-[15px] sm:text-[16px] text-[#062c55] mb-2.5">
                  What kind of role was it?
                </div>

                {/* Mobile contextual explanation box */}
                {explainOn && (
                  <div className="md:hidden mb-3.5 p-3 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                    <b className="block text-[#0c8f72] font-bold uppercase text-[11px] mb-1">
                      Your job type changes what&apos;s owed
                    </b>
                    A fixed-term contract can be owed the rest of the term; a
                    commission or contractor role may not be an
                    &quot;employee&quot; at all. Both change the answer.
                  </div>
                )}

                {/* Big Pills */}
                <div className="space-y-2.5">
                  {[
                    {
                      key: "regular",
                      title: "Regular employee",
                      desc: "Salaried or hourly, ongoing.",
                    },
                    {
                      key: "contract",
                      title: "Fixed-term contract",
                      desc: "A set end date or project term.",
                    },
                    {
                      key: "commission",
                      title: "Mostly commission / self-employed",
                      desc: "Sales or contractor pay.",
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      onClick={() => {
                        setState({ ...state, emptype: item.key });
                        saveAnswer("emptype", item.title);
                      }}
                      className={`flex items-start gap-3 p-3.5 px-4 rounded-[14px] border-[1.5px] cursor-pointer transition-all ${
                        state.emptype === item.key
                          ? "border-[#062c55] bg-[#f0f4f8] shadow-sm"
                          : "border-[#e0ddd4] bg-white hover:border-[#c3ccd3] hover:bg-[#fafbfc]"
                      }`}
                    >
                      <span
                        className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                          state.emptype === item.key
                            ? "border-[#0eb28d] bg-[#0eb28d]"
                            : "border-[#c3ccd3] bg-white"
                        }`}
                      />
                      <div>
                        <div className="text-[14.5px] font-semibold text-[#17242f]">
                          {item.title}
                        </div>
                        <div className="text-xs text-[#5a6b78] mt-0.5">
                          {item.desc}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom Action Row: Back and Next buttons */}
                <div className="mt-8 flex items-center justify-between">
                  <QuestionBackButton onClick={goToQ1} />
                  <QuestionNextButton
                    onClick={() => {
                      if (!state.emptype) return;
                      if (!userAnswers.emptype) {
                        saveAnswer(
                          "emptype",
                          EMP_TYPE_LABELS[state.emptype] || "Regular employee",
                        );
                      }
                      goToQ3();
                    }}
                  />
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                SCREEN 3 (QUESTION 3 OF 4): HAVE YOU SIGNED ANYTHING YET?
            ════════════════════════════════════════════════════════════════ */}
            {currentStep === "q3" && (
              <div className="relative bg-white border border-[#e7e4dd] rounded-[18px] p-4 sm:p-6 md:p-8 shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] animate-fade">
                {/* 4 Dots Indicator - Upper Right Corner */}
                <div className="flex justify-end mb-2">
                  <div
                    className="flex items-center gap-1.5 shrink-0"
                    aria-label="Question 3 of 4"
                  >
                    <i className="inline-block w-2 h-2 rounded-full bg-[#0eb28d]" />
                    <i className="inline-block w-2 h-2 rounded-full bg-[#0eb28d]" />
                    <i className="inline-block w-2 h-2 rounded-full bg-[#0eb28d]" />
                    <i className="inline-block w-2 h-2 rounded-full bg-[#dcd8cf]" />
                  </div>
                </div>

                {/* Full-width 100% Free Badge Box */}
                <div className="w-full flex items-center gap-2.5 p-2.5 px-3.5 rounded-xl bg-gradient-to-r from-[#e6f8f1] to-[#f3faf6] border border-[#b9e6d4] shadow-[0_4px_16px_-12px_rgba(14,178,141,0.5)] mb-5">
                  <span className="w-5 h-5 rounded-full bg-[#0eb28d] text-white font-extrabold flex items-center justify-center shrink-0 text-[11px]">
                    ✓
                  </span>
                  <span className="text-xs sm:text-[13px] text-[#1f3b32]">
                    <b className="font-bold text-[#062c55]">
                      100% free to get your read.
                    </b>{" "}
                    No card. No signup. No sales call.
                  </span>
                </div>

                {/* Heading */}
                <h1 className="font-serif font-normal text-[23px] sm:text-[27px] text-[#062c55] leading-[1.2] tracking-tight">
                  First — a few things that decide how this works.
                </h1>

                {explainOn && (
                  <div className="md:hidden my-3 p-3.5 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                    <b>How severance works in Ontario, in one breath:</b> there
                    are three layers. <b>1 · Notice pay</b> — about a week per
                    year, max 8 weeks; everyone gets this.{" "}
                    <b>2 · Severance pay</b> — an extra week per year (max 26)
                    only if you were there 5+ years and the employer&apos;s
                    payroll is over $2.5M. <b>3 · Common law</b> — what courts
                    award when your contract doesn&apos;t validly cap you:
                    months not weeks, up to about 24. Most people are only
                    offered layer 1.{" "}
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
                  These change which rules apply to you. They take ten seconds
                  and make everything after more accurate.
                </p>

                {/* Question title */}
                <div className="font-bold text-[15px] sm:text-[16px] text-[#062c55] mb-2.5">
                  Have you signed anything yet?
                </div>

                {/* Mobile contextual explanation box */}
                {explainOn && (
                  <div className="md:hidden mb-3.5 p-3 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                    <b className="block text-[#0c8f72] font-bold uppercase text-[11px] mb-1">
                      A signature can close some doors
                    </b>
                    A signed release is usually final, but some rights survive
                    it. Knowing this now means we don&apos;t show you options
                    you no longer have.
                  </div>
                )}

                {/* Big Pills */}
                <div className="space-y-2.5">
                  <div
                    onClick={() => setState({ ...state, signed: "no" })}
                    className={`flex items-center gap-3 p-3.5 px-4 rounded-[14px] border-[1.5px] cursor-pointer transition-all ${
                      state.signed === "no"
                        ? "border-[#062c55] bg-[#f0f4f8] shadow-sm"
                        : "border-[#e0ddd4] bg-white hover:border-[#c3ccd3] hover:bg-[#fafbfc]"
                    }`}
                  >
                    <span
                      className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 ${
                        state.signed === "no"
                          ? "border-[#0eb28d] bg-[#0eb28d]"
                          : "border-[#c3ccd3] bg-white"
                      }`}
                    />
                    <span className="text-[14.5px] font-semibold text-[#17242f]">
                      No, not yet
                    </span>
                  </div>

                  <div
                    onClick={() => setState({ ...state, signed: "yes" })}
                    className={`flex items-start gap-3 p-3.5 px-4 rounded-[14px] border-[1.5px] cursor-pointer transition-all ${
                      state.signed === "yes"
                        ? "border-[#062c55] bg-[#f0f4f8] shadow-sm"
                        : "border-[#e0ddd4] bg-white hover:border-[#c3ccd3] hover:bg-[#fafbfc]"
                    }`}
                  >
                    <span
                      className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        state.signed === "yes"
                          ? "border-[#0eb28d] bg-[#0eb28d]"
                          : "border-[#c3ccd3] bg-white"
                      }`}
                    />
                    <div>
                      <div className="text-[14.5px] font-semibold text-[#17242f]">
                        Yes — I already signed
                      </div>
                      <div className="text-xs text-[#5a6b78] mt-0.5">
                        Some rights survive a signature; a lawyer can tell you
                        which.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Row: Back and Next buttons */}
                <div className="mt-8 flex items-center justify-between">
                  <QuestionBackButton onClick={goToQ2} />
                  <QuestionNextButton
                    onClick={() => {
                      if (!state.signed) return;
                      if (!userAnswers.signed) {
                        saveAnswer("signed", state.signed === "yes" ? "Yes" : "No");
                      }
                      goToQ4();
                    }}
                  />
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                SCREEN 4 (QUESTION 4 OF 4): WAS EMPLOYER FEDERALLY REGULATED?
            ════════════════════════════════════════════════════════════════ */}
            {currentStep === "q4" && (
              <div className="relative bg-white border border-[#e7e4dd] rounded-[18px] p-4 sm:p-6 md:p-8 shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] animate-fade">
                {/* 4 Dots Indicator - Upper Right Corner */}
                <div className="flex justify-end mb-2">
                  <div
                    className="flex items-center gap-1.5 shrink-0"
                    aria-label="Question 4 of 4"
                  >
                    <i className="inline-block w-2 h-2 rounded-full bg-[#0eb28d]" />
                    <i className="inline-block w-2 h-2 rounded-full bg-[#0eb28d]" />
                    <i className="inline-block w-2 h-2 rounded-full bg-[#0eb28d]" />
                    <i className="inline-block w-2 h-2 rounded-full bg-[#0eb28d]" />
                  </div>
                </div>

                {/* Full-width 100% Free Badge Box */}
                <div className="w-full flex items-center gap-2.5 p-2.5 px-3.5 rounded-xl bg-gradient-to-r from-[#e6f8f1] to-[#f3faf6] border border-[#b9e6d4] shadow-[0_4px_16px_-12px_rgba(14,178,141,0.5)] mb-5">
                  <span className="w-5 h-5 rounded-full bg-[#0eb28d] text-white font-extrabold flex items-center justify-center shrink-0 text-[11px]">
                    ✓
                  </span>
                  <span className="text-xs sm:text-[13px] text-[#1f3b32]">
                    <b className="font-bold text-[#062c55]">
                      100% free to get your read.
                    </b>{" "}
                    No card. No signup. No sales call.
                  </span>
                </div>

                {/* Heading */}
                <h1 className="font-serif font-normal text-[23px] sm:text-[27px] text-[#062c55] leading-[1.2] tracking-tight">
                  First — a few things that decide how this works.
                </h1>

                {explainOn && (
                  <div className="md:hidden my-3 p-3.5 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                    <b>How severance works in Ontario, in one breath:</b> there
                    are three layers. <b>1 · Notice pay</b> — about a week per
                    year, max 8 weeks; everyone gets this.{" "}
                    <b>2 · Severance pay</b> — an extra week per year (max 26)
                    only if you were there 5+ years and the employer&apos;s
                    payroll is over $2.5M. <b>3 · Common law</b> — what courts
                    award when your contract doesn&apos;t validly cap you:
                    months not weeks, up to about 24. Most people are only
                    offered layer 1.{" "}
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
                  These change which rules apply to you. They take ten seconds
                  and make everything after more accurate.
                </p>

                {/* Question title */}
                <div className="font-bold text-[15px] sm:text-[16px] text-[#062c55] mb-2.5">
                  Was your employer federally regulated?
                </div>

                {/* Mobile contextual explanation box */}
                {explainOn && (
                  <div className="md:hidden mb-3.5 p-3 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                    <b className="block text-[#0c8f72] font-bold uppercase text-[11px] mb-1">
                      Federal jobs have their own law
                    </b>
                    Banks, airlines, telecom and rail follow federal rules
                    (Canada Labour Code), not provincial ones — different
                    minimums.
                  </div>
                )}

                {/* Big Pills */}
                <div className="space-y-2.5">
                  <div
                    onClick={() => setState({ ...state, federal: "no" })}
                    className={`flex items-start gap-3 p-3.5 px-4 rounded-[14px] border-[1.5px] cursor-pointer transition-all ${
                      state.federal === "no"
                        ? "border-[#062c55] bg-[#f0f4f8] shadow-sm"
                        : "border-[#e0ddd4] bg-white hover:border-[#c3ccd3] hover:bg-[#fafbfc]"
                    }`}
                  >
                    <span
                      className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        state.federal === "no"
                          ? "border-[#0eb28d] bg-[#0eb28d]"
                          : "border-[#c3ccd3] bg-white"
                      }`}
                    />
                    <div>
                      <div className="text-[14.5px] font-semibold text-[#17242f]">
                        No / not sure
                      </div>
                      <div className="text-xs text-[#5a6b78] mt-0.5">
                        Most Ontario jobs are provincially regulated.
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => setState({ ...state, federal: "yes" })}
                    className={`flex items-start gap-3 p-3.5 px-4 rounded-[14px] border-[1.5px] cursor-pointer transition-all ${
                      state.federal === "yes"
                        ? "border-[#062c55] bg-[#f0f4f8] shadow-sm"
                        : "border-[#e0ddd4] bg-white hover:border-[#c3ccd3] hover:bg-[#fafbfc]"
                    }`}
                  >
                    <span
                      className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        state.federal === "yes"
                          ? "border-[#0eb28d] bg-[#0eb28d]"
                          : "border-[#c3ccd3] bg-white"
                      }`}
                    />
                    <div>
                      <div className="text-[14.5px] font-semibold text-[#17242f]">
                        Yes — a federally regulated employer
                      </div>
                      <div className="text-xs text-[#5a6b78] mt-0.5">
                        Different law applies (Canada Labour Code).
                      </div>
                    </div>
                  </div>
                </div>

                {/* Disclaimer Checkbox Box */}
                <div
                  onClick={() => setState({ ...state, agreed: !state.agreed })}
                  className={`flex gap-3 items-start mt-5 p-3.5 px-4 rounded-[14px] border-[1.5px] cursor-pointer transition-all ${
                    state.agreed
                      ? "border-[#0eb28d] bg-[#f3faf6] dark:bg-[#0A261E] dark:border-[#125E4A]"
                      : "border-[#cdd3d8] dark:border-[#1E3B5C] bg-[#fafcfb] dark:bg-[#0A1C2E] hover:border-[#0eb28d]"
                  }`}
                >
                  <div
                    className={`w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 text-xs font-extrabold ${
                      state.agreed
                        ? "bg-[#0eb28d] border-[#0eb28d] text-white"
                        : "border-[#c3ccd3] dark:border-[#416285] dark:bg-[#071524] text-transparent"
                    }`}
                  >
                    ✓
                  </div>
                  <div className="text-[12.5px] sm:text-[13px] text-[#17242f] dark:text-[#E1E7ED] leading-snug">
                    I understand this is{" "}
                    <b className="dark:text-white">
                      information to help me get oriented — not legal advice
                    </b>
                    . Any range shown is an estimate, not what I&apos;m owed.
                    The full{" "}
                    <a
                      href="#legal"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[#0c8f72] dark:text-[#34D399] font-bold underline"
                    >
                      Terms &amp; Disclaimer
                    </a>{" "}
                    apply if I buy a report or connect with a lawyer.
                  </div>
                </div>

                {/* Navigation and Confirmation Row */}
                <div className="mt-5 flex items-center justify-between">
                  <QuestionBackButton onClick={goToQ3} />
                  <span className="text-xs font-bold text-[#0c8f72] dark:text-[#34D399]">
                    Ready — continue below ↓
                  </span>
                </div>

                {/* Full-Width Continue Button */}
                <button
                  type="button"
                  disabled={!state.agreed}
                  onClick={handleContinueFromQ4}
                  className={`w-full mt-3.5 py-3.5 px-6 rounded-[9px] font-bold text-sm sm:text-base transition-all ${
                    state.agreed
                      ? "bg-[#0eb28d] hover:bg-[#0c8f72] text-white shadow-[0_8px_20px_-8px_rgba(14,178,141,0.7)] cursor-pointer"
                      : "bg-[#dce3e0] dark:bg-[#152E46] text-[#8c9693] dark:text-[#5A6B78] cursor-not-allowed shadow-none"
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
              <div className="bg-white border border-[#e7e4dd] rounded-[18px] p-4 sm:p-6 md:p-8 shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] animate-fade">
                <div className="flex items-center gap-3 p-3 px-4 rounded-xl bg-gradient-to-r from-[#e6f8f1] to-[#f3faf6] border border-[#b9e6d4] shadow-[0_8px_24px_-16px_rgba(14,178,141,0.6)] mb-5">
                  <span className="w-7 h-7 rounded-full bg-[#0eb28d] text-white font-extrabold flex items-center justify-center shrink-0 shadow-[0_0_0_4px_rgba(14,178,141,0.18)] text-xs">
                    ✓
                  </span>
                  <span className="text-sm text-[#1f3b32]">
                    <b className="font-bold text-[#062c55]">
                      100% free to get your results.
                    </b>{" "}
                    No card. No signup. No sales call.
                  </span>
                </div>

                <h1 className="font-serif font-medium text-[27px] sm:text-[29px] text-[#062c55] leading-[1.12] tracking-tight">
                  Make sense of your separation offer.
                </h1>
                <p className="text-sm sm:text-[15px] text-[#5a6b78] mt-2 mb-6">
                  US law doesn&apos;t set a severance amount — so there&apos;s
                  no &quot;number you&apos;re owed&quot;. What the law{" "}
                  <b>does</b> control is <b>how</b> they can ask you to sign:
                  how long you get to think, whether you can take it back, and
                  how much notice a big layoff needs.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#5a6b78] mb-1.5">
                      Which state did you physically work in?
                    </label>
                    <select
                      value={state.usState}
                      onChange={(e) =>
                        setState({ ...state, usState: e.target.value })
                      }
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
                        className="us-needs-input w-full rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none transition-colors placeholder:text-[#9aa3ab] text-[#17242f]"
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
                        className="us-needs-input w-full rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none transition-colors placeholder:text-[#9aa3ab] text-[#17242f]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5a6b78] mb-1.5">
                      Pay per year ($, before tax)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={state.salary}
                      placeholder="128000"
                      onChange={(e) =>
                        setState({ ...state, salary: e.target.value })
                      }
                      className="us-needs-input w-full rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none transition-colors placeholder:text-[#9aa3ab] text-[#17242f]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5a6b78] mb-1.5">
                      Anything on top of base pay?
                    </label>
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
                              pay: {
                                ...state.pay,
                                [item.k]: !state.pay[item.k],
                              },
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
                    <label className="block text-xs font-bold text-[#5a6b78] mb-1.5">
                      Have you signed anything yet?
                    </label>
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
                    onClick={() =>
                      setState({ ...state, agreed: !state.agreed })
                    }
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
                      I understand this is{" "}
                      <b>
                        information to help me get oriented — not legal advice
                      </b>
                      , and not an assessment of my case.
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
                UNION SCREEN-OUT BRANCH (CANADA - MATCHING SCREENSHOT)
            ════════════════════════════════════════════════════════════════ */}
            {currentStep === "union" && (
              <div className="bg-white border border-[#e7e4dd] rounded-[18px] p-6 sm:p-9 shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] text-center animate-fade">
                {/* Handshake Emoji Icon */}
                <div
                  className="text-3xl sm:text-4xl mb-3 select-none"
                  aria-hidden="true"
                >
                  🤝
                </div>

                <h1 className="font-serif font-semibold text-2xl sm:text-[28px] text-[#062c55] leading-tight mb-3">
                  Your union handles this one.
                </h1>

                <p className="text-sm text-[#5a6b78] max-w-[500px] mx-auto leading-relaxed mb-6">
                  Because you were a union member, your severance is set by your{" "}
                  <b className="text-[#17242f] font-bold">
                    collective agreement
                  </b>
                  , and disputes go through the{" "}
                  <b className="text-[#17242f] font-bold">grievance process</b>{" "}
                  — not the individual severance rules our tool is built for.
                  Talking to your union rep is your fastest, strongest path
                  here.
                </p>

                {/* Info Container with 2 rows */}
                <div className="bg-[#f4f7f5] border border-[#e2e8e4] rounded-2xl p-4 sm:p-5 max-w-[490px] mx-auto text-left text-xs sm:text-[13px] space-y-3 mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
                    <span className="text-[#5a6b78] shrink-0">
                      Your best first step
                    </span>
                    <b className="text-[#062c55] font-bold text-left sm:text-right">
                      Contact your union steward or local office
                    </b>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-4 pt-3 border-t border-[#e2e8e4]">
                    <span className="text-[#5a6b78] shrink-0">
                      Ask them about
                    </span>
                    <b className="text-[#062c55] font-bold text-left sm:text-right leading-snug">
                      Notice, severance &amp; grievance deadlines in your
                      agreement
                    </b>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 max-w-[420px] mx-auto">
                  <button
                    type="button"
                    onClick={() => {
                      // Continue anyway as requested
                      setCurrentStep("basics-q1");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="w-full py-3.5 px-6 rounded-xl border border-[#d5dde4] bg-white hover:bg-[#fafbfc] hover:border-[#0eb28d] font-bold text-sm text-[#062c55] shadow-xs transition-all cursor-pointer"
                  >
                    Continue anyway →
                  </button>

                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setState({ ...state, union: "no" });
                        saveAnswer("union", "No");
                        goToQ1();
                      }}
                      className="inline-flex items-center justify-center py-2 px-4 rounded-xl border border-[#e7e4dd] bg-[#fafbfc] hover:bg-[#f0f4f8] text-xs font-bold text-[#5a6b78] hover:text-[#062c55] transition-colors cursor-pointer"
                    >
                      ‹ Oops, I&apos;m not in a union — change my answer
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                PROVINCE STOP / REGION NOT COVERED (CANADA - MATCHING SCREENSHOT)
            ════════════════════════════════════════════════════════════════ */}
            {currentStep === "province-stop" && (
              <div className="bg-white border border-[#e7e4dd] rounded-[18px] p-6 sm:p-9 shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] text-center animate-fade">
                {/* Map Emoji Icon */}
                <div
                  className="text-3xl sm:text-4xl mb-3 select-none"
                  aria-hidden="true"
                >
                  🗺️
                </div>

                <h1 className="font-serif font-semibold text-2xl sm:text-[28px] text-[#062c55] leading-tight mb-3">
                  We don&apos;t cover your province yet.
                </h1>

                <p className="text-sm text-[#5a6b78] max-w-[520px] mx-auto leading-relaxed mb-6">
                  Severance rules are different in every province, and
                  Quebec&apos;s are a different legal system altogether. Rather
                  than give you an Ontario answer that could be wrong for you,
                  we stop here. We&apos;re live in{" "}
                  <b className="text-[#17242f] font-bold">
                    Ontario, British Columbia, Alberta and Nova Scotia
                  </b>{" "}
                  today.
                </p>

                {/* Info Container with 2 rows */}
                <div className="bg-[#f4f7f5] border border-[#e2e8e4] rounded-2xl p-4 sm:p-5 max-w-[490px] mx-auto text-left text-xs sm:text-[13px] space-y-3 mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
                    <span className="text-[#5a6b78] shrink-0">In the US?</span>
                    <NextLink
                      href="/questions?country=US"
                      className="text-[#0c8f72] font-bold hover:underline inline-flex items-center gap-1 text-left sm:text-right"
                    >
                      Use the US site →
                    </NextLink>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-4 pt-3 border-t border-[#e2e8e4]">
                    <span className="text-[#5a6b78] shrink-0">Meanwhile</span>
                    <span className="text-[#062c55] font-semibold text-left sm:text-right leading-snug">
                      Your provincial employment-standards office · a licensed
                      employment lawyer (many offer a free first call)
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 max-w-[420px] mx-auto">
                  <button
                    type="button"
                    onClick={() => setNotifiedProvince(true)}
                    className="w-full py-3.5 px-6 rounded-xl bg-[#0eb28d] hover:bg-[#0c8f72] text-white font-bold text-sm sm:text-base shadow-[0_8px_20px_-8px_rgba(14,178,141,0.7)] transition-all cursor-pointer"
                  >
                    {notifiedProvince
                      ? "✓ We'll notify you when live!"
                      : "Notify me when you're live in my province"}
                  </button>

                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setState({ ...state, province: "ON" });
                        saveAnswer("province", "Ontario");
                        setEditingBasics(true);
                        setCurrentStep("basics-q1");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="inline-flex items-center justify-center py-2 px-4 rounded-xl border border-[#e7e4dd] bg-[#fafbfc] hover:bg-[#f0f4f8] text-xs font-bold text-[#5a6b78] hover:text-[#062c55] transition-colors cursor-pointer"
                    >
                      ‹ Wrong province? Change my answer
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STEP 2: THE BASICS
            ════════════════════════════════════════════════════════════════ */}
            {/* ════════════════════════════════════════════════════════════════
                CANADA STEP 2 (QUESTION 1 OF 2): PAYROLL OVER $2.5M
            ════════════════════════════════════════════════════════════════ */}
            {currentStep === "basics-q1" && (
              <div className="bg-white border border-[#e7e4dd] rounded-[18px] p-4 sm:p-6 md:p-8 shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] animate-fade">
                {/* Top Row: Pill Tag on left, 2 Dots on right */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="inline-block text-xs font-semibold text-[#5a6b78] bg-white border border-[#e7e4dd] px-3 py-1 rounded-full">
                    The basics
                  </span>

                  <div
                    className="flex items-center gap-1.5 shrink-0"
                    aria-label="Question 1 of 2"
                  >
                    <i className="inline-block w-2 h-2 rounded-full bg-[#0eb28d]" />
                    <i className="inline-block w-2 h-2 rounded-full bg-[#dcd8cf]" />
                  </div>
                </div>

                <h1 className="font-serif font-normal text-[23px] sm:text-[27px] text-[#062c55] leading-[1.2] tracking-tight">
                  Now, the basics about you.
                </h1>
                <p className="text-[13.5px] sm:text-sm text-[#5a6b78] mt-2 mb-4 leading-relaxed">
                  Four facts decide most of the number: <b>where</b> you worked
                  (the province sets the minimum), <b>how old</b> you are and{" "}
                  <b>how long</b> you were there (courts give more notice to
                  older, longer-serving workers because a new job takes longer
                  to find), and <b>your pay</b> (the number is weeks or months
                  of it).
                </p>

                {/* Prefilled Box */}
                <div className="my-4 p-3.5 sm:p-4 rounded-xl bg-[#f3faf6] border border-[#b9e6d4]">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <div className="w-full text-[11px] font-extrabold uppercase tracking-wider text-[#0c7a60] flex items-center gap-1.5">
                      <span>✓</span> ALREADY FILLED FROM YOUR QUICK START
                    </div>
                    <div className="text-sm sm:text-[14.5px] font-bold text-[#062c55]">
                      {PROVINCE_NAMES[state.province] || state.province} · age{" "}
                      {state.age || "52"} · {state.years || "14"} yrs · $
                      {Number(state.salary || 110000).toLocaleString("en-CA")}
                      /yr
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingBasics(!editingBasics)}
                      className="ml-auto text-xs sm:text-[12.5px] font-bold text-[#0c7a60] border border-[#b9e6d4] bg-white rounded-full px-3.5 py-1 hover:bg-[#f3faf6] transition-colors cursor-pointer shrink-0 shadow-2xs"
                    >
                      {editingBasics ? "Done" : "Change something"}
                    </button>
                  </div>

                  {/* Inline fields revealed when clicking Change something */}
                  {editingBasics && (
                    <div className="mt-4 pt-3.5 border-t border-[#cfe8dd] grid grid-cols-1 sm:grid-cols-2 gap-3 text-left animate-fade">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-[#5a6b78] mb-1">
                          Where were you employed?
                        </label>
                        <select
                          value={state.province}
                          onChange={(e) => {
                            const val = e.target.value;
                            setState({ ...state, province: val });
                            if (val === "OTHER") {
                              saveAnswer(
                                "province",
                                "Another province / U.S. state",
                              );
                              setCurrentStep("province-stop");
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            } else {
                              saveAnswer(
                                "province",
                                PROVINCE_NAMES[val] || val,
                              );
                            }
                          }}
                          className="w-full border border-[#cdd3d8] rounded-xl px-3 py-2 text-xs font-medium bg-white focus:outline-none focus:border-[#0eb28d]"
                        >
                          <option value="">Select your province</option>
                          <option value="ON">Ontario</option>
                          <option value="BC">British Columbia</option>
                          <option value="AB">Alberta</option>
                          <option value="NS">Nova Scotia</option>
                          <option value="OTHER">
                            Another province / U.S. state
                          </option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#5a6b78] mb-1">
                          Your age
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={state.age}
                          placeholder="52"
                          onChange={(e) => {
                            setState({ ...state, age: e.target.value });
                            if (fieldErrors.age) {
                              setFieldErrors((prev) => ({ ...prev, age: false }));
                              setErrorMessage("");
                            }
                          }}
                          className={`ca-needs-input w-full rounded-xl px-3 py-2 text-xs font-medium outline-none transition-colors placeholder:text-[#9aa3ab] ${
                            fieldErrors.age
                              ? "ca-input-error text-[#c53030]"
                              : "text-[#17242f]"
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#5a6b78] mb-1">
                          Years on the job
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={state.years}
                          placeholder="14"
                          onChange={(e) => {
                            setState({ ...state, years: e.target.value });
                            if (fieldErrors.years) {
                              setFieldErrors((prev) => ({ ...prev, years: false }));
                              setErrorMessage("");
                            }
                          }}
                          className={`ca-needs-input w-full rounded-xl px-3 py-2 text-xs font-medium outline-none transition-colors placeholder:text-[#9aa3ab] ${
                            fieldErrors.years
                              ? "ca-input-error text-[#c53030]"
                              : "text-[#17242f]"
                          }`}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-[#5a6b78] mb-1">
                          Pay per year ($, before tax)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={state.salary}
                          placeholder="110000"
                          onChange={(e) => {
                            setState({ ...state, salary: e.target.value });
                            if (fieldErrors.salary) {
                              setFieldErrors((prev) => ({ ...prev, salary: false }));
                              setErrorMessage("");
                            }
                          }}
                          className={`ca-needs-input w-full rounded-xl px-3 py-2 text-xs font-medium outline-none transition-colors placeholder:text-[#9aa3ab] ${
                            fieldErrors.salary
                              ? "ca-input-error text-[#c53030]"
                              : "text-[#17242f]"
                          }`}
                        />
                      </div>

                      {errorMessage && (
                        <div className="sm:col-span-2 mt-1 text-xs font-bold text-[#e53e3e] flex items-center gap-1.5 animate-in fade-in">
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0 text-[#e53e3e]">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span>{errorMessage}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Question 1: Global payroll */}
                <div className="font-bold text-[15px] sm:text-[16px] text-[#062c55] mb-2.5">
                  Is your employer&apos;s payroll over $2.5 million a year —
                  counting every location and any parent or sister company?
                </div>

                {/* Mobile contextual note (when explainOn is true) */}
                {explainOn && (
                  <div className="md:hidden my-3 p-3.5 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                    <b className="block text-[#0c7a60] font-bold uppercase text-[11px] mb-1">
                      Ontario&apos;s extra layer
                    </b>
                    Ontario has an <i>extra</i> layer called severance pay — a
                    week per year, up to 26 weeks — but only for people with 5+
                    years at an employer whose <i>global</i> payroll tops $2.5
                    million — every location, plus parent and related companies
                    count. Many people never hear about it, and most calculators
                    get it wrong.
                  </div>
                )}

                {/* Payroll Options Pills */}
                <div className="flex flex-col gap-2 mt-3 items-start">
                  <button
                    type="button"
                    onClick={() => {
                      setState({ ...state, payroll: "yes" });
                      saveAnswer("payroll", "Yes (50+)");
                    }}
                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all cursor-pointer ${
                      state.payroll === "yes"
                        ? "bg-[#062c55] text-white border border-[#062c55] shadow-sm"
                        : "border border-[#e0ddd4] bg-white text-[#17242f] hover:border-[#c3ccd3]"
                    }`}
                  >
                    Yes — a big employer (50+ staff)
                  </button>

                  <div className="flex items-center gap-2 flex-nowrap">
                    <button
                      type="button"
                      onClick={() => {
                        setState({ ...state, payroll: "no" });
                        saveAnswer("payroll", "No");
                      }}
                      className={`px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                        state.payroll === "no"
                          ? "bg-[#062c55] text-white border border-[#062c55] shadow-sm"
                          : "border border-[#e0ddd4] bg-white text-[#17242f] hover:border-[#c3ccd3]"
                      }`}
                    >
                      No — small employer
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setState({ ...state, payroll: "unsure" });
                        saveAnswer("payroll", "Not sure");
                      }}
                      className={`px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                        state.payroll === "unsure"
                          ? "bg-[#062c55] text-white border border-[#062c55] shadow-sm"
                          : "border border-[#e0ddd4] bg-white text-[#17242f] hover:border-[#c3ccd3]"
                      }`}
                    >
                      Not sure
                    </button>
                  </div>
                </div>

                {errorMessage && (
                  <div className="mt-4 text-xs sm:text-[13px] font-bold text-[#e53e3e] flex items-center gap-1.5 animate-in fade-in">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0 text-[#e53e3e]">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Navigation Row */}
                <div className="mt-8 flex items-center justify-between">
                  <QuestionBackButton
                    onClick={() => {
                      setFieldErrors({});
                      setErrorMessage("");
                      goToQ4();
                    }}
                  />
                  <QuestionNextButton
                    onClick={() => {
                      const validation = validateBasicsFields();
                      if (!validation.isValid) {
                        setEditingBasics(true);
                        setFieldErrors(validation.errors);
                        setErrorMessage(validation.message);
                        return;
                      }

                      setFieldErrors({});
                      setErrorMessage("");

                      if (state.province === "OTHER") {
                        saveAnswer("province", "Another province / U.S. state");
                        setCurrentStep("province-stop");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                        return;
                      }
                      saveAnswer(
                        "province",
                        PROVINCE_NAMES[state.province] ||
                          state.province ||
                          "Ontario",
                      );
                      saveAnswer(
                        "payroll",
                        state.payroll === "yes"
                          ? "Yes (50+)"
                          : state.payroll === "no"
                            ? "No"
                            : "Not sure",
                      );
                      setCurrentStep("basics-q2");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                CANADA STEP 2 (QUESTION 2 OF 2): ROLE / OCCUPATION
            ════════════════════════════════════════════════════════════════ */}
            {currentStep === "basics-q2" && (
              <div className="bg-white border border-[#e7e4dd] rounded-[18px] p-4 sm:p-6 md:p-8 shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] animate-fade">
                {/* Top Row: Pill Tag on left, 2 Dots on right */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="inline-block text-xs font-semibold text-[#5a6b78] bg-white border border-[#e7e4dd] px-3 py-1 rounded-full">
                    The basics
                  </span>

                  <div
                    className="flex items-center gap-1.5 shrink-0"
                    aria-label="Question 2 of 2"
                  >
                    <i className="inline-block w-2 h-2 rounded-full bg-[#dcd8cf]" />
                    <i className="inline-block w-2 h-2 rounded-full bg-[#0eb28d]" />
                  </div>
                </div>

                <h1 className="font-serif font-normal text-[23px] sm:text-[27px] text-[#062c55] leading-[1.2] tracking-tight">
                  Now, the basics about you.
                </h1>
                <p className="text-[13.5px] sm:text-sm text-[#5a6b78] mt-2 mb-4 leading-relaxed">
                  Four facts decide most of the number: <b>where</b> you worked
                  (the province sets the minimum), <b>how old</b> you are and{" "}
                  <b>how long</b> you were there (courts give more notice to
                  older, longer-serving workers because a new job takes longer
                  to find), and <b>your pay</b> (the number is weeks or months
                  of it).
                </p>

                {/* Prefilled Box */}
                <div className="my-4 p-3.5 sm:p-4 rounded-xl bg-[#f3faf6] border border-[#b9e6d4]">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <div className="w-full text-[11px] font-extrabold uppercase tracking-wider text-[#0c7a60] flex items-center gap-1.5">
                      <span>✓</span> ALREADY FILLED FROM YOUR QUICK START
                    </div>
                    <div className="text-sm sm:text-[14.5px] font-bold text-[#062c55]">
                      {PROVINCE_NAMES[state.province] || state.province} · age{" "}
                      {state.age || "52"} · {state.years || "14"} yrs · $
                      {Number(state.salary || 110000).toLocaleString("en-CA")}
                      /yr
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingBasics(!editingBasics)}
                      className="ml-auto text-xs sm:text-[12.5px] font-bold text-[#0c7a60] border border-[#b9e6d4] bg-white rounded-full px-3.5 py-1 hover:bg-[#f3faf6] transition-colors cursor-pointer shrink-0 shadow-2xs"
                    >
                      {editingBasics ? "Done" : "Change something"}
                    </button>
                  </div>

                  {/* Inline fields revealed when clicking Change something */}
                  {editingBasics && (
                    <div className="mt-4 pt-3.5 border-t border-[#cfe8dd] grid grid-cols-1 sm:grid-cols-2 gap-3 text-left animate-fade">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-[#5a6b78] mb-1">
                          Where were you employed?
                        </label>
                        <select
                          value={state.province}
                          onChange={(e) => {
                            const val = e.target.value;
                            setState({ ...state, province: val });
                            if (val === "OTHER") {
                              saveAnswer(
                                "province",
                                "Another province / U.S. state",
                              );
                              setCurrentStep("province-stop");
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            } else {
                              saveAnswer(
                                "province",
                                PROVINCE_NAMES[val] || val,
                              );
                            }
                          }}
                          className="w-full border border-[#cdd3d8] rounded-xl px-3 py-2 text-xs font-medium bg-white focus:outline-none focus:border-[#0eb28d]"
                        >
                          <option value="">Select your province</option>
                          <option value="ON">Ontario</option>
                          <option value="BC">British Columbia</option>
                          <option value="AB">Alberta</option>
                          <option value="NS">Nova Scotia</option>
                          <option value="OTHER">
                            Another province / U.S. state
                          </option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#5a6b78] mb-1">
                          Your age
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={state.age}
                          placeholder="52"
                          onChange={(e) => {
                            setState({ ...state, age: e.target.value });
                            if (fieldErrors.age) {
                              setFieldErrors((prev) => ({ ...prev, age: false }));
                              setErrorMessage("");
                            }
                          }}
                          className={`ca-needs-input w-full rounded-xl px-3 py-2 text-xs font-medium outline-none transition-colors placeholder:text-[#9aa3ab] ${
                            fieldErrors.age
                              ? "ca-input-error text-[#c53030]"
                              : "text-[#17242f]"
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#5a6b78] mb-1">
                          Years on the job
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={state.years}
                          placeholder="14"
                          onChange={(e) => {
                            setState({ ...state, years: e.target.value });
                            if (fieldErrors.years) {
                              setFieldErrors((prev) => ({ ...prev, years: false }));
                              setErrorMessage("");
                            }
                          }}
                          className={`ca-needs-input w-full rounded-xl px-3 py-2 text-xs font-medium outline-none transition-colors placeholder:text-[#9aa3ab] ${
                            fieldErrors.years
                              ? "ca-input-error text-[#c53030]"
                              : "text-[#17242f]"
                          }`}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-[#5a6b78] mb-1">
                          Pay per year ($, before tax)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={state.salary}
                          placeholder="110000"
                          onChange={(e) => {
                            setState({ ...state, salary: e.target.value });
                            if (fieldErrors.salary) {
                              setFieldErrors((prev) => ({ ...prev, salary: false }));
                              setErrorMessage("");
                            }
                          }}
                          className={`ca-needs-input w-full rounded-xl px-3 py-2 text-xs font-medium outline-none transition-colors placeholder:text-[#9aa3ab] ${
                            fieldErrors.salary
                              ? "ca-input-error text-[#c53030]"
                              : "text-[#17242f]"
                          }`}
                        />
                      </div>

                      {errorMessage && (
                        <div className="sm:col-span-2 mt-1 text-xs font-bold text-[#e53e3e] flex items-center gap-1.5 animate-in fade-in">
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0 text-[#e53e3e]">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span>{errorMessage}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Question 2: Role / Occupation */}
                <div className="mb-2">
                  <label className="block text-[12px] sm:text-[8px] font-bold text-[#062c55] mb-2">
                    Your role / occupation{" "}
                    <span className="font-normal text-xs text-[#5a6b78] inline">
                      — senior and specialised roles get longer notice, because
                      they&apos;re harder to replace
                    </span>
                  </label>
                  <select
                    value={state.roleFactor}
                    onChange={(e) =>
                      setState({
                        ...state,
                        roleFactor: parseFloat(e.target.value),
                      })
                    }
                    className="w-full border-[1.5px] border-[#0eb28d] rounded-xl px-4 py-3 text-sm font-medium text-[#17242f] bg-white focus:outline-none shadow-sm cursor-pointer"
                  >
                    {OCCUPATIONS.map((occ) => (
                      <option key={occ.label} value={occ.value}>
                        {occ.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Navigation and Confirmation Row */}
                <div className="mt-8">
                  {errorMessage && (
                    <div className="mb-3.5 text-xs sm:text-[13px] font-bold text-[#e53e3e] flex items-center gap-1.5 animate-in fade-in">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0 text-[#e53e3e]">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-3.5">
                    <QuestionBackButton
                      onClick={() => {
                        setFieldErrors({});
                        setErrorMessage("");
                        setCurrentStep("basics-q1");
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
                      const validation = validateBasicsFields();
                      if (!validation.isValid) {
                        setEditingBasics(true);
                        setFieldErrors(validation.errors);
                        setErrorMessage(validation.message);
                        return;
                      }

                      setFieldErrors({});
                      setErrorMessage("");

                      const occ =
                        OCCUPATIONS.find(
                          (o) => Math.abs(o.value - state.roleFactor) < 0.01,
                        )?.label || "Middle management / Senior / Director";
                      saveAnswer("age", state.age || "52");
                      saveAnswer("years", `${state.years || "14"} yrs`);
                      saveAnswer(
                        "salary",
                        `${kMoney(parseFloat(state.salary || "110000"))}/yr`,
                      );
                      saveAnswer("occupation", occ);
                      setCurrentStep("money-q1");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="w-full py-3.5 px-6 rounded-[9px] font-bold text-sm sm:text-base bg-[#0eb28d] hover:bg-[#0c8f72] text-white shadow-[0_8px_20px_-8px_rgba(14,178,141,0.7)] transition-all cursor-pointer"
                  >
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                US STEP 2: THE LAYOFF (WHEN IN US MODE)
            ════════════════════════════════════════════════════════════════ */}
            {currentStep === "step-basics" && !isCanada && (
              <div className="bg-white border border-[#e7e4dd] rounded-[18px] p-4 sm:p-6 md:p-8 shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] animate-fade">
                <span className="inline-block text-xs font-bold text-[#062c55] bg-white border border-[#e7e4dd] px-3 py-1 rounded-full mb-3">
                  The layoff
                </span>
                <h1 className="font-serif font-medium text-2xl sm:text-[28px] text-[#062c55] leading-tight">
                  How did the layoff happen?
                </h1>
                <p className="text-sm text-[#5a6b78] mt-2 mb-6">
                  This tells us whether advance-notice rules (the federal WARN
                  Act or mini-WARN) applied to your layoff.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#5a6b78] mb-1.5">
                      Was it part of a group layoff?
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { k: "yes", label: "Yes — several people let go" },
                        { k: "no", label: "No — just me" },
                        { k: "unsure", label: "Not sure" },
                      ].map((p) => (
                        <button
                          key={p.k}
                          type="button"
                          onClick={() =>
                            setState({ ...state, groupLayoff: p.k })
                          }
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

                  <div className="grid grid-cols-2 gap-3">
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
                        placeholder="14"
                        onChange={(e) =>
                          setState({ ...state, years: e.target.value })
                        }
                        className="w-full border border-[#cdd3d8] rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:border-[#0eb28d]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5a6b78] mb-1.5">
                      Pay per year ($, before tax)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={state.salary}
                      placeholder="110000"
                      onChange={(e) =>
                        setState({ ...state, salary: e.target.value })
                      }
                      className="w-full border border-[#cdd3d8] rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:border-[#0eb28d]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5a6b78] mb-1.5">
                      Your role / occupation
                    </label>
                    <select
                      value={state.roleFactor}
                      onChange={(e) =>
                        setState({
                          ...state,
                          roleFactor: parseFloat(e.target.value),
                        })
                      }
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
                  <QuestionBackButton
                    onClick={() => {
                      setCurrentStep("us-situation");
                    }}
                  />
                  <QuestionNextButton
                    onClick={() => {
                      setCurrentStep("step-money");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Continue →
                  </QuestionNextButton>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STEP 3: THE MONEY PICTURE
            {/* ════════════════════════════════════════════════════════════════
                STEP 3 (QUESTION 1 OF 3): WHAT ELSE WERE YOU PAID?
            ════════════════════════════════════════════════════════════════ */}
            {currentStep === "money-q1" && (
              <div className="bg-white border border-[#e7e4dd] rounded-[18px] p-4 sm:p-6 md:p-8 shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] animate-fade">
                {/* Top Row: Pill tag on left, 3 dots on right */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="inline-block text-xs font-semibold text-[#5a6b78] bg-white border border-[#e7e4dd] px-3 py-1 rounded-full">
                    The money picture
                  </span>

                  <div
                    className="flex items-center gap-1.5 shrink-0"
                    aria-label="Question 1 of 3"
                  >
                    <i className="inline-block w-2 h-2 rounded-full bg-[#0eb28d]" />
                    <i className="inline-block w-2 h-2 rounded-full bg-[#dcd8cf]" />
                    <i className="inline-block w-2 h-2 rounded-full bg-[#dcd8cf]" />
                  </div>
                </div>

                <h1 className="font-serif font-normal text-[23px] sm:text-[27px] text-[#062c55] leading-[1.2] tracking-tight">
                  What else were you paid?
                </h1>
                <p className="text-[13.5px] sm:text-sm text-[#5a6b78] mt-2 mb-6 leading-relaxed">
                  Bonuses, stock and benefits are often part of what you&apos;re
                  owed — and they change the size of a case.
                </p>

                <div>
                  <div className="font-bold text-[14.5px] sm:text-[15px] text-[#062c55] mb-3">
                    Did your pay include any of these?
                  </div>
                  {/* Mobile explainer note (when explainOn) */}
                  {explainOn && (
                    <div className="md:hidden my-3 p-3.5 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                      <b className="block text-[#0c7a60] font-bold uppercase text-[11px] mb-1">
                        Your whole pay counts
                      </b>
                      Notice is usually measured in months of your total pay —
                      bonus, commission and benefits count. Leaving them out
                      makes the number too small.
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { k: "bonus", label: "Bonus" },
                      { k: "stock", label: "Stock / RSUs" },
                      { k: "benefits", label: "Benefits" },
                      { k: "commission", label: "Commission" },
                    ].map((item) => {
                      const selected = !!state.pay[item.k];
                      return (
                        <button
                          key={item.k}
                          type="button"
                          onClick={() => {
                            const nextPay = {
                              ...state.pay,
                              [item.k]: !state.pay[item.k],
                            };
                            setState({ ...state, pay: nextPay });
                            const payMap: Record<string, string> = {
                              bonus: "Bonus",
                              stock: "Stock",
                              benefits: "Benefits",
                              commission: "Commission",
                              pto: "PTO",
                            };
                            const checked = Object.entries(nextPay)
                              .filter(([_, v]) => v)
                              .map(([k]) => payMap[k] || k);
                            saveAnswer(
                              "otherPay",
                              checked.length > 0 ? checked.join(", ") : "None",
                            );
                          }}
                          className={`px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all cursor-pointer ${
                            selected
                              ? "bg-[#062c55] text-white border border-[#062c55] shadow-xs"
                              : "border border-[#e0ddd4] bg-white text-[#17242f] hover:border-[#c3ccd3]"
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Navigation Row */}
                <div className="mt-8 flex items-center justify-between">
                  <QuestionBackButton
                    onClick={() => {
                      setCurrentStep("basics-q2");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                  <QuestionNextButton
                    onClick={() => {
                      const payMap: Record<string, string> = {
                        bonus: "Bonus",
                        stock: "Stock",
                        benefits: "Benefits",
                        commission: "Commission",
                        pto: "PTO",
                      };
                      const checked = Object.entries(state.pay)
                        .filter(([_, v]) => v)
                        .map(([k]) => payMap[k] || k);
                      saveAnswer(
                        "otherPay",
                        checked.length > 0 ? checked.join(", ") : "None",
                      );
                      setCurrentStep("money-q2");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STEP 3 (QUESTION 2 OF 3): WHAT ARE THEY OFFERING YOU?
            ════════════════════════════════════════════════════════════════ */}
            {currentStep === "money-q2" && (
              <div className="bg-white border border-[#e7e4dd] rounded-[18px] p-4 sm:p-6 md:p-8 shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] animate-fade">
                {/* Top Row: Pill tag on left, 3 dots on right */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="inline-block text-xs font-semibold text-[#5a6b78] bg-white border border-[#e7e4dd] px-3 py-1 rounded-full">
                    The money picture
                  </span>

                  <div
                    className="flex items-center gap-1.5 shrink-0"
                    aria-label="Question 2 of 3"
                  >
                    <i className="inline-block w-2 h-2 rounded-full bg-[#0eb28d]" />
                    <i className="inline-block w-2 h-2 rounded-full bg-[#0eb28d]" />
                    <i className="inline-block w-2 h-2 rounded-full bg-[#dcd8cf]" />
                  </div>
                </div>

                <h1 className="font-serif font-normal text-[23px] sm:text-[27px] text-[#062c55] leading-[1.2] tracking-tight">
                  What else were you paid?
                </h1>
                <p className="text-[13.5px] sm:text-sm text-[#5a6b78] mt-2 mb-6 leading-relaxed">
                  Bonuses, stock and benefits are often part of what you&apos;re
                  owed — and they change the size of a case.
                </p>

                <div>
                  <div className="font-bold text-[14.5px] sm:text-[15px] text-[#062c55] mb-3">
                    What are they offering you?{" "}
                    <span className="font-normal text-xs text-[#5a6b78] inline">
                      — total $ (optional). We&apos;ll show where it sits.
                    </span>
                  </div>

                  {/* Mobile explainer note (when explainOn) */}
                  {explainOn && (
                    <div className="md:hidden my-3 p-3.5 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                      <b className="block text-[#0c7a60] font-bold uppercase text-[11px] mb-1">
                        Where your offer lands
                      </b>
                      So the read can show where your offer sits — under the
                      floor, near it, or inside the range courts award. That gap
                      is the whole conversation.
                    </div>
                  )}

                  <input
                    type="text"
                    inputMode="numeric"
                    value={state.offer || ""}
                    placeholder="55000"
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      const num = val ? parseFloat(val) : 0;
                      setState({ ...state, offer: num });
                      if (fieldErrors.offer) {
                        setFieldErrors((prev) => ({ ...prev, offer: false }));
                        setErrorMessage("");
                      }
                      if (num > 0) {
                        saveAnswer(
                          "offer",
                          `$${num >= 1000 ? Math.round(num / 1000) + "k" : num.toLocaleString()}`,
                        );
                      } else {
                        saveAnswer("offer", "");
                      }
                    }}
                    className={`w-full border-[1.5px] rounded-xl px-4 py-3 text-sm font-medium bg-white focus:outline-none shadow-xs transition-colors ${
                      fieldErrors.offer
                        ? "ca-input-error border-[#e53e3e] bg-[#fff5f5] ring-2 ring-[#e53e3e]/20 text-[#c53030]"
                        : "border-[#0eb28d] text-[#17242f]"
                    }`}
                  />

                  {errorMessage && (
                    <div className="mt-3 text-xs sm:text-[13px] font-bold text-[#e53e3e] flex items-center gap-1.5 animate-in fade-in">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0 text-[#e53e3e]">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span>{errorMessage}</span>
                    </div>
                  )}
                </div>

                {/* Navigation Row */}
                <div className="mt-8 flex items-center justify-between">
                  <QuestionBackButton
                    onClick={() => {
                      setFieldErrors({});
                      setErrorMessage("");
                      setCurrentStep("money-q1");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                  <QuestionNextButton
                    onClick={() => {
                      if (state.offer !== undefined && state.offer !== null && state.offer < 0) {
                        setFieldErrors({ offer: true });
                        setErrorMessage("Severance offer cannot be negative.");
                        return;
                      }
                      setFieldErrors({});
                      setErrorMessage("");
                      if (state.offer) {
                        saveAnswer(
                          "offer",
                          `$${state.offer >= 1000 ? Math.round(state.offer / 1000) + "k" : state.offer.toLocaleString()}`,
                        );
                      }
                      setCurrentStep("money-q3");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STEP 3 (QUESTION 3 OF 3): HAVE YOU ALREADY FOUND A NEW JOB?
            ════════════════════════════════════════════════════════════════ */}
            {currentStep === "money-q3" && (
              <div className="bg-white border border-[#e7e4dd] rounded-[18px] p-4 sm:p-6 md:p-8 shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] animate-fade">
                {/* Top Row: Pill tag on left, 3 dots on right */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="inline-block text-xs font-semibold text-[#5a6b78] bg-white border border-[#e7e4dd] px-3 py-1 rounded-full">
                    The money picture
                  </span>

                  <div
                    className="flex items-center gap-1.5 shrink-0"
                    aria-label="Question 3 of 3"
                  >
                    <i className="inline-block w-2 h-2 rounded-full bg-[#0eb28d]" />
                    <i className="inline-block w-2 h-2 rounded-full bg-[#0eb28d]" />
                    <i className="inline-block w-2 h-2 rounded-full bg-[#0eb28d]" />
                  </div>
                </div>

                <h1 className="font-serif font-normal text-[23px] sm:text-[27px] text-[#062c55] leading-[1.2] tracking-tight">
                  What else were you paid?
                </h1>
                <p className="text-[13.5px] sm:text-sm text-[#5a6b78] mt-2 mb-6 leading-relaxed">
                  Bonuses, stock and benefits are often part of what you&apos;re
                  owed — and they change the size of a case.
                </p>

                <div>
                  <div className="font-bold text-[14.5px] sm:text-[15px] text-[#062c55] mb-3">
                    Have you already found a new job?
                  </div>

                  {/* Mobile explainer note (when explainOn) */}
                  {explainOn && (
                    <div className="md:hidden my-3 p-3.5 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                      <b className="block text-[#0c7a60] font-bold uppercase text-[11px] mb-1">
                        A new job can shrink the claim
                      </b>
                      If you&apos;ve started a new job, the amount you can claim
                      usually goes down — the law expects you to look for work,
                      and counts what you earn.
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { k: "no", label: "Not yet", summary: "Not yet" },
                      {
                        k: "soon",
                        label: "Looking / interviews",
                        summary: "Interviews",
                      },
                      {
                        k: "yes",
                        label: "Yes, already started",
                        summary: "Already started",
                      },
                    ].map((item) => {
                      const selected = state.reemployed === item.k;
                      return (
                        <button
                          key={item.k}
                          type="button"
                          onClick={() => {
                            setState({ ...state, reemployed: item.k });
                            saveAnswer("reemployed", item.summary);
                          }}
                          className={`px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all cursor-pointer ${
                            selected
                              ? "bg-[#062c55] text-white border border-[#062c55] shadow-xs"
                              : "border border-[#e0ddd4] bg-white text-[#17242f] hover:border-[#c3ccd3]"
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Navigation and Confirmation Row */}
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-3.5">
                    <QuestionBackButton
                      onClick={() => {
                        setCurrentStep("money-q2");
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

            {/* ════════════════════════════════════════════════════════════════
                STEP 4 (QUESTION 1 OF 2): DOES YOUR OFFER LIMIT YOU TO THE MINIMUM?
            ════════════════════════════════════════════════════════════════ */}
            {(currentStep === "clause-q1" || currentStep === "step-clause") && (
              <div className="bg-white border border-[#e7e4dd] rounded-[18px] p-4 sm:p-6 md:p-8 shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] animate-fade">
                {/* Top Row: Pill tag on left, 2 dots on right */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="inline-block text-xs font-semibold text-[#5a6b78] bg-white border border-[#e7e4dd] px-3 py-1 rounded-full">
                    The most important question
                  </span>

                  <div
                    className="flex items-center gap-1.5 shrink-0"
                    aria-label="Question 1 of 2"
                  >
                    <i className="inline-block w-2 h-2 rounded-full bg-[#0eb28d]" />
                    <i className="inline-block w-2 h-2 rounded-full bg-[#dcd8cf]" />
                  </div>
                </div>

                <h1 className="font-serif font-normal text-[23px] sm:text-[27px] text-[#062c55] leading-[1.2] tracking-tight">
                  Does your offer limit you to the &quot;minimum&quot;?
                </h1>
                <p className="text-[13.5px] sm:text-sm text-[#5a6b78] mt-2 mb-6 leading-relaxed">
                  Most severance letters try to cap you at the legal minimum.
                  Whether that limit actually holds up is the single biggest
                  factor in your case — and it&apos;s exactly what a lawyer
                  checks first.
                </p>

                <div>
                  <div className="font-bold text-[14.5px] sm:text-[15px] text-[#062c55] mb-3">
                    Does your letter or contract say your severance is limited
                    to the minimum required by law?
                  </div>

                  {/* Mobile explainer note (when explainOn) */}
                  {explainOn && (
                    <div className="md:hidden my-3 p-3.5 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                      <b className="block text-[#0c7a60] font-bold uppercase text-[11px] mb-1">
                        The sentence that can cap you
                      </b>
                      This one sentence in a contract is what employers rely on
                      to pay only the minimum. Courts often find these clauses
                      don&apos;t hold up — and then the bigger what courts award
                      applies. It&apos;s the first thing a lawyer reads.
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {[
                      { k: "yes", label: "Yes, it says that", summary: "Yes" },
                      { k: "no", label: "No / it doesn't", summary: "No" },
                      { k: "unsure", label: "Not sure", summary: "Not sure" },
                    ].map((item) => {
                      const selected = state.clause === item.k;
                      return (
                        <button
                          key={item.k}
                          type="button"
                          onClick={() => {
                            setState({ ...state, clause: item.k });
                            saveAnswer("clause", item.summary);
                          }}
                          className={`px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all cursor-pointer ${
                            selected
                              ? "bg-[#062c55] text-white border border-[#062c55] shadow-xs"
                              : "border border-[#e0ddd4] bg-white text-[#17242f] hover:border-[#c3ccd3] hover:bg-[#fafbfc]"
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Navigation Row */}
                <div className="mt-8 flex items-center justify-between">
                  <QuestionBackButton
                    onClick={() => {
                      setCurrentStep("money-q3");
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

            {/* ════════════════════════════════════════════════════════════════
                STEP 4 (QUESTION 2 OF 2): DID YOU SIGN AN EMPLOYMENT CONTRACT?
            ════════════════════════════════════════════════════════════════ */}
            {currentStep === "clause-q2" && (
              <div className="bg-white border border-[#e7e4dd] rounded-[18px] p-4 sm:p-6 md:p-8 shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] animate-fade">
                {/* Top Row: Pill tag on left, 2 dots on right */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="inline-block text-xs font-semibold text-[#5a6b78] bg-white border border-[#e7e4dd] px-3 py-1 rounded-full">
                    The most important question
                  </span>

                  <div
                    className="flex items-center gap-1.5 shrink-0"
                    aria-label="Question 2 of 2"
                  >
                    <i className="inline-block w-2 h-2 rounded-full bg-[#0eb28d]" />
                    <i className="inline-block w-2 h-2 rounded-full bg-[#0eb28d]" />
                  </div>
                </div>

                <h1 className="font-serif font-normal text-[23px] sm:text-[27px] text-[#062c55] leading-[1.2] tracking-tight">
                  Does your offer limit you to the &quot;minimum&quot;?
                </h1>
                <p className="text-[13.5px] sm:text-sm text-[#5a6b78] mt-2 mb-6 leading-relaxed">
                  Most severance letters try to cap you at the legal minimum.
                  Whether that limit actually holds up is the single biggest
                  factor in your case — and it&apos;s exactly what a lawyer
                  checks first.
                </p>

                <div>
                  <div className="font-bold text-[14.5px] sm:text-[15px] text-[#062c55] mb-3">
                    Did you sign an employment contract?
                  </div>

                  {/* Mobile explainer note (when explainOn) */}
                  {explainOn && (
                    <div className="md:hidden my-3 p-3.5 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                      <b className="block text-[#0c7a60] font-bold uppercase text-[11px] mb-1">
                        An old contract may not bind you
                      </b>
                      No contract means no clause can cap you. An old contract
                      from before a promotion often can&apos;t either — the job
                      it describes isn&apos;t the job you were doing.
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {[
                      {
                        k: "current",
                        label: "Yes — same role since I signed",
                        summary: "Signed - same role",
                      },
                      {
                        k: "old",
                        label: "Yes — but I was promoted / changed roles since",
                        summary: "Signed - role changed",
                      },
                      {
                        k: "none",
                        label: "No written contract",
                        summary: "Never signed",
                      },
                      { k: "unsure", label: "Not sure", summary: "Not sure" },
                    ].map((item) => {
                      const selected = state.contract === item.k;
                      return (
                        <button
                          key={item.k}
                          type="button"
                          onClick={() => {
                            setState({ ...state, contract: item.k });
                            saveAnswer("contract", item.summary);
                          }}
                          className={`px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all cursor-pointer ${
                            selected
                              ? "bg-[#062c55] text-white border border-[#062c55] shadow-xs"
                              : "border border-[#e0ddd4] bg-white text-[#17242f] hover:border-[#c3ccd3] hover:bg-[#fafbfc]"
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Navigation and Confirmation Row */}
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-3.5">
                    <QuestionBackButton
                      onClick={() => {
                        setCurrentStep("clause-q1");
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

            {/* ════════════════════════════════════════════════════════════════
                STEP 5 (QUESTION 1 OF 3): HOW DID YOUR JOB END?
            ════════════════════════════════════════════════════════════════ */}
            {(currentStep === "details-q1" ||
              currentStep === "step-details") && (
              <div className="bg-white border border-[#e7e4dd] rounded-[18px] p-4 sm:p-6 md:p-8 shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] animate-fade">
                {/* Top Row: Pill tag on left, 3 dots on right */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="inline-block text-xs font-semibold text-[#5a6b78] bg-white border border-[#e7e4dd] px-3 py-1 rounded-full">
                    Almost done
                  </span>

                  <div
                    className="flex items-center gap-1.5 shrink-0"
                    aria-label="Question 1 of 3"
                  >
                    <i className="inline-block w-2 h-2 rounded-full bg-[#0eb28d]" />
                    <i className="inline-block w-2 h-2 rounded-full bg-[#dcd8cf]" />
                    <i className="inline-block w-2 h-2 rounded-full bg-[#dcd8cf]" />
                  </div>
                </div>

                <h1 className="font-serif font-normal text-[23px] sm:text-[27px] text-[#062c55] leading-[1.2] tracking-tight">
                  A couple more quick taps
                </h1>

                <div className="mt-5">
                  <div className="font-bold text-[14.5px] sm:text-[15px] text-[#062c55] mb-3">
                    How did your job end?
                  </div>

                  {/* Mobile explainer note (when explainOn) */}
                  {explainOn && (
                    <div className="md:hidden my-3 p-3.5 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                      <b className="block text-[#0c7a60] font-bold uppercase text-[11px] mb-1">
                        How it ended changes everything
                      </b>
                      &quot;for cause&quot; means the employer says you did
                      something serious enough to owe you nothing — a bar they
                      rarely clear. &quot;Forced out&quot; (constructive
                      dismissal) can count the same as being let go. A
                      &quot;temporary layoff&quot; you never agreed to in
                      writing can be a termination in disguise. And if 50+
                      people at one location lost their jobs within 4 weeks,
                      Ontario&apos;s mass-termination rules can raise the
                      minimum notice.
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {[
                      {
                        k: "layoff",
                        label: "Laid off — no cause",
                        summary: "Laid off",
                      },
                      { k: "cause", label: "For cause", summary: "For cause" },
                      {
                        k: "constructive",
                        label: "Forced out",
                        summary: "Forced out",
                      },
                      {
                        k: "templayoff",
                        label: '"Temporary layoff"',
                        summary: "Temporary layoff",
                      },
                      {
                        k: "mass",
                        label: "Part of a big layoff (50+)",
                        summary: "Mass layoff (50+)",
                      },
                    ].map((item) => {
                      const selected = state.reason === item.k;
                      return (
                        <button
                          key={item.k}
                          type="button"
                          onClick={() => {
                            setState({ ...state, reason: item.k });
                            saveAnswer("reason", item.summary);
                          }}
                          className={`px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all cursor-pointer ${
                            selected
                              ? "bg-[#062c55] text-white border border-[#062c55] shadow-xs"
                              : "border border-[#e0ddd4] bg-white text-[#17242f] hover:border-[#c3ccd3] hover:bg-[#fafbfc]"
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Navigation Row */}
                <div className="mt-8 flex items-center justify-between">
                  <QuestionBackButton
                    onClick={() => {
                      setCurrentStep("clause-q2");
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

            {/* ════════════════════════════════════════════════════════════════
                STEP 5 (QUESTION 2 OF 3): HOW HARD WOULD IT BE TO FIND A SIMILAR JOB?
            ════════════════════════════════════════════════════════════════ */}
            {currentStep === "details-q2" && (
              <div className="bg-white border border-[#e7e4dd] rounded-[18px] p-4 sm:p-6 md:p-8 shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] animate-fade">
                {/* Top Row: Pill tag on left, 3 dots on right */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="inline-block text-xs font-semibold text-[#5a6b78] bg-white border border-[#e7e4dd] px-3 py-1 rounded-full">
                    Almost done
                  </span>

                  <div
                    className="flex items-center gap-1.5 shrink-0"
                    aria-label="Question 2 of 3"
                  >
                    <i className="inline-block w-2 h-2 rounded-full bg-[#0eb28d]" />
                    <i className="inline-block w-2 h-2 rounded-full bg-[#0eb28d]" />
                    <i className="inline-block w-2 h-2 rounded-full bg-[#dcd8cf]" />
                  </div>
                </div>

                <h1 className="font-serif font-normal text-[23px] sm:text-[27px] text-[#062c55] leading-[1.2] tracking-tight">
                  A couple more quick taps
                </h1>

                <div className="mt-5">
                  <div className="font-bold text-[14.5px] sm:text-[15px] text-[#062c55] mb-3">
                    How hard would it be to find a similar job near you?
                  </div>

                  {/* Mobile explainer note (when explainOn) */}
                  {explainOn && (
                    <div className="md:hidden my-3 p-3.5 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                      <b className="block text-[#0c7a60] font-bold uppercase text-[11px] mb-1">
                        Scarce jobs mean longer notice
                      </b>
                      This is the fourth thing courts weigh (with age, tenure
                      and role): how long it realistically takes someone like
                      you to land an equivalent job. Specialised roles, small
                      towns and shrinking industries all push the range up.
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {[
                      {
                        k: "easy",
                        label: "Plenty of similar jobs",
                        summary: "Plenty",
                      },
                      {
                        k: "mid",
                        label: "Some, but competitive",
                        summary: "Some",
                      },
                      {
                        k: "hard",
                        label: "Very few — specialised or small market",
                        summary: "Few / Hard",
                      },
                    ].map((item) => {
                      const selected = state.market === item.k;
                      return (
                        <button
                          key={item.k}
                          type="button"
                          onClick={() => {
                            setState({ ...state, market: item.k });
                            saveAnswer("market", item.summary);
                          }}
                          className={`px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all cursor-pointer ${
                            selected
                              ? "bg-[#062c55] text-white border border-[#062c55] shadow-xs"
                              : "border border-[#e0ddd4] bg-white text-[#17242f] hover:border-[#c3ccd3] hover:bg-[#fafbfc]"
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Navigation Row */}
                <div className="mt-8 flex items-center justify-between">
                  <QuestionBackButton
                    onClick={() => {
                      setCurrentStep("details-q1");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                  <QuestionNextButton
                    onClick={() => {
                      setCurrentStep("details-q3");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STEP 5 (QUESTION 3 OF 3): ANYTHING ELSE YOU'D FLAG?
            ════════════════════════════════════════════════════════════════ */}
            {currentStep === "details-q3" && (
              <div className="bg-white border border-[#e7e4dd] rounded-[18px] p-4 sm:p-6 md:p-8 shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] animate-fade">
                {/* Top Row: Pill tag on left, 3 dots on right */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="inline-block text-xs font-semibold text-[#5a6b78] bg-white border border-[#e7e4dd] px-3 py-1 rounded-full">
                    Almost done
                  </span>

                  <div
                    className="flex items-center gap-1.5 shrink-0"
                    aria-label="Question 3 of 3"
                  >
                    <i className="inline-block w-2 h-2 rounded-full bg-[#0eb28d]" />
                    <i className="inline-block w-2 h-2 rounded-full bg-[#0eb28d]" />
                    <i className="inline-block w-2 h-2 rounded-full bg-[#0eb28d]" />
                  </div>
                </div>

                <h1 className="font-serif font-normal text-[23px] sm:text-[27px] text-[#062c55] leading-[1.2] tracking-tight">
                  A couple more quick taps
                </h1>

                <div className="mt-5">
                  <div className="font-bold text-[14.5px] sm:text-[15px] text-[#062c55] mb-3">
                    Anything else you&apos;d flag?
                  </div>

                  {/* Mobile explainer note (when explainOn) */}
                  {explainOn && (
                    <div className="md:hidden my-3 p-3.5 bg-[#f3faf6] border border-[#cfe8dd] border-l-[3px] border-l-[#0eb28d] rounded-r-xl text-xs text-[#2b3a45] leading-relaxed">
                      <b className="block text-[#0c7a60] font-bold uppercase text-[11px] mb-1">
                        Separate claims, on top of severance
                      </b>
                      Mistreatment or discrimination is a separate claim on top
                      of severance; unpaid wages or bonus are owed regardless.
                      Both change what a lawyer would look at.
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {[
                      {
                        k: "none",
                        label: "Nothing unusual",
                        summary: "Nothing unusual",
                      },
                      {
                        k: "mistreat",
                        label: "Mistreatment / discrimination",
                        summary: "Mistreatment / Discrimination",
                      },
                      {
                        k: "unpaid",
                        label: "Unpaid bonus / wages",
                        summary: "Unpaid bonus / wages",
                      },
                    ].map((item) => {
                      const selected = state.redflag === item.k;
                      return (
                        <button
                          key={item.k}
                          type="button"
                          onClick={() => {
                            setState({ ...state, redflag: item.k });
                            saveAnswer("redflag", item.summary);
                          }}
                          className={`px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all cursor-pointer ${
                            selected
                              ? "bg-[#062c55] text-white border border-[#062c55] shadow-xs"
                              : "border border-[#e0ddd4] bg-white text-[#17242f] hover:border-[#c3ccd3] hover:bg-[#fafbfc]"
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Navigation and Confirmation Row */}
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-3.5">
                    <QuestionBackButton
                      onClick={() => {
                        setCurrentStep("details-q2");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    />
                    <span className="text-xs font-bold text-[#0c8f72]">
                      Ready — continue below ↓
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleStartAnalyze}
                    className="w-full py-3.5 px-6 rounded-[9px] font-bold text-sm sm:text-base bg-[#0eb28d] hover:bg-[#0c8f72] text-white shadow-[0_8px_20px_-8px_rgba(14,178,141,0.7)] transition-all cursor-pointer"
                  >
                    See my results →
                  </button>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STEP 5: ANALYZING STATE (MATCHING SCREENSHOT)
            ════════════════════════════════════════════════════════════════ */}
            {currentStep === "step-analyzing" && (
              <div className="bg-white border border-[#e7e4dd] rounded-[22px] py-14 sm:py-20 px-6 sm:px-12 text-center shadow-[0_20px_50px_-25px_rgba(6,44,85,0.12)] max-w-[620px] mx-auto animate-fade">
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

                <h1 className="font-serif font-semibold text-2xl sm:text-[30px] text-[#062c55] leading-tight tracking-tight mb-2">
                  Reading your situation…
                </h1>
                <p className="text-sm sm:text-base text-[#5a6b78] font-normal leading-relaxed max-w-[420px] mx-auto">
                  Weighing the same things a court and a lawyer weigh.
                </p>

                {searchParams?.get("step") === "loading" && (
                  <div className="mt-8 pt-4 border-t border-[#f0ece1]">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentStep("step-results");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#0eb28d] text-white text-xs font-bold hover:bg-[#0c8f72] shadow-sm transition-all cursor-pointer"
                    >
                      See results preview →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STEP 6: RESULTS & VERDICT (CANADA · MATCHING SCREENSHOT)
            ════════════════════════════════════════════════════════════════ */}
            {currentStep === "step-results" &&
              (() => {
                const lowAmt = estResult?.statutory
                  ? estResult.statutory.amount
                  : 16923;
                const loAmt = estResult?.commonLaw
                  ? estResult.commonLaw.lowAmount
                  : 137500;
                const highAmt = estResult?.commonLaw
                  ? estResult.commonLaw.highAmount
                  : 192500;
                const offerAmt = state.offer || 24000;
                const termWeeks = estResult?.statutory
                  ? estResult.statutory.terminationWeeks
                  : 8;
                const sevWeeks = estResult?.statutory?.severanceWeeks || 0;
                const sevLine =
                  sevWeeks > 0
                    ? `${sevWeeks} wks severance pay`
                    : state.province === "ON"
                      ? "severance pay — depends on employer payroll (≥ $2.5M)"
                      : "depends on provincial rules";
                const clMonths = estResult?.commonLaw
                  ? `${estResult.commonLaw.lowMonths}–${estResult.commonLaw.highMonths} months`
                  : "15–21 months";

                // Gauge percentage relative to span
                const span = highAmt * 1.08;
                const pct = (val: number) =>
                  Math.max(0, Math.min(100, (val / span) * 100));
                const minPct = pct(lowAmt);
                const loPct = pct(loAmt);
                const hiPct = pct(highAmt);
                const offerPct = pct(offerAmt);

                return (
                  <div className="bg-white border border-[#e7e4dd] rounded-[18px] p-4 sm:p-7 md:p-9 shadow-[0_30px_60px_-40px_rgba(6,44,85,0.35)] animate-fade">
                    {/* ── VERDICT CARD (encompasses tag, title, reasons, estbox, and srcbadge) ── */}
                    <div className="text-center p-4 sm:p-7 md:p-[24px_26px] bg-gradient-to-b from-[#fbfdfc] to-[#eef8f3] border border-[#c7e6d6] rounded-[16px]">
                      <span className="text-[11.5px] font-extrabold uppercase tracking-[0.8px] text-[#0c8f72] block mb-1.5">
                        Often worth a closer look
                      </span>
                      <h2 className="font-serif font-semibold text-2xl sm:text-[28px] text-[#062c55] my-2 leading-[1.14] tracking-tight">
                        This is the kind of offer people often review with a
                        lawyer.
                      </h2>
                      <p className="text-[13.5px] sm:text-[14.5px] text-[#17242f] max-w-[460px] mx-auto leading-relaxed mt-2.5">
                        Offers with the features you described are the ones
                        people most often take to an employment lawyer for a
                        closer look. That&apos;s not an opinion on your case —
                        only a lawyer can tell you what yours means.
                      </p>

                      {/* Reasons Checklist */}
                      <div className="mt-4 text-left max-w-[440px] mx-auto space-y-1.5 text-[13px] sm:text-[13.5px] text-[#17242f]">
                        <div className="flex items-start gap-2.5">
                          <span className="text-[#0eb28d] font-extrabold text-[15px] shrink-0">
                            ✓
                          </span>
                          <span>Solid income</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <span className="text-[#0eb28d] font-extrabold text-[15px] shrink-0">
                            ✓
                          </span>
                          <span>
                            {state.years || "14"} years of service — long tenure
                          </span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <span className="text-[#0eb28d] font-extrabold text-[15px] shrink-0">
                            ✓
                          </span>
                          <span>
                            Your answers don&apos;t mention a cap to the minimum
                          </span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <span className="text-[#0eb28d] font-extrabold text-[15px] shrink-0">
                            ✓
                          </span>
                          <span>
                            Your contract predates a promotion or role change —
                            a lawyer checks whether it still applies
                          </span>
                        </div>
                      </div>

                      {/* ── ESTIMATED RANGE BOX (.estbox) ── */}
                      <div className="mt-[18px] border border-[#c7e6d6] rounded-[12px] p-4 sm:p-6 text-center bg-white shadow-xs">
                        <span className="inline-block text-[10.5px] font-extrabold uppercase tracking-[0.05em] text-[#8a6400] bg-[#fbf3df] border border-[#eeddb0] px-2.5 py-0.5 rounded-[6px] mb-2.5">
                          Estimate — not an assessment of your situation
                        </span>
                        <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#5a6b78] mt-1 mb-1">
                          Estimated range
                        </div>
                        <div className="font-serif font-bold text-3xl sm:text-[34px] text-[#0c8f72] my-1 tracking-tight leading-tight">
                          {money(lowAmt)} – {money(highAmt)}
                        </div>
                        <p className="text-xs sm:text-[13px] text-[#17242f] max-w-[500px] mx-auto leading-relaxed">
                          From the legal minimum you can verify yourself, up to
                          what court-awarded &quot;reasonable notice&quot; may
                          reach for a profile like yours.
                        </p>

                        {/* Reading this callout box */}
                        <div className="my-3.5 p-3 sm:p-3.5 rounded-lg border-l-[3px] border-[#0eb28d] bg-[#f3faf6] border border-[#cfe8dd] text-left text-xs sm:text-[12.5px] text-[#2b3a45] leading-relaxed max-w-[540px] mx-auto">
                          <b className="text-[#062c55] font-bold">
                            Reading this:
                          </b>{" "}
                          the left number is the legal minimum you can check
                          yourself. The right number is what courts have awarded
                          people like you when no valid clause capped them. Your
                          offer will usually sit somewhere between — and where it
                          sits is the whole conversation.
                        </div>

                        {/* 3 Column Grid Breakdown */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3.5 text-left max-w-[540px] mx-auto">
                          <div className="border border-[#e7e4dd] rounded-[10px] p-2.5 sm:p-3 bg-[#fafcfb] text-xs text-[#5a6b78]">
                            <b className="block text-xs font-bold text-[#062c55] mb-0.5">
                              1 · Notice pay
                            </b>
                            <span>
                              {termWeeks} wks · the minimum everyone gets
                            </span>
                          </div>
                          <div className="border border-[#e7e4dd] rounded-[10px] p-2.5 sm:p-3 bg-[#fafcfb] text-xs text-[#5a6b78]">
                            <b className="block text-xs font-bold text-[#062c55] mb-0.5">
                              2 · Severance pay
                            </b>
                            <span>{sevLine}</span>
                          </div>
                          <div className="border border-[#e7e4dd] rounded-[10px] p-2.5 sm:p-3 bg-[#fafcfb] text-xs text-[#5a6b78]">
                            <b className="block text-xs font-bold text-[#062c55] mb-0.5">
                              3 · What courts award
                            </b>
                            <span>
                              {clMonths} · what courts award when no valid clause
                              caps you — a lawyer&apos;s call
                            </span>
                          </div>
                        </div>

                        {/* Visual Range Bar Gauge (.rbar) */}
                        <div className="mt-4 max-w-[540px] mx-auto text-left bg-white border border-[#e7e4dd] rounded-[12px] p-4 pt-9">
                          <div className="relative pb-1 mx-2 sm:mx-3">
                            {/* Track */}
                            <div className="relative h-3 bg-[#eef1f4] rounded-full overflow-visible">
                              {/* Min Bar (Gray) */}
                              <div
                                className="absolute left-0 top-0 bottom-0 bg-[#b9c5cf] rounded-l-full"
                                style={{ width: `${minPct}%` }}
                              />
                              {/* Court-awarded Band (Green Gradient) */}
                              <div
                                className="absolute top-0 bottom-0 bg-gradient-to-r from-[#b7e3d1] via-[#5fc9a6] to-[#0eb28d] rounded-full shadow-[0_0_0_2px_rgba(14,178,141,0.15)]"
                                style={{
                                  left: `${loPct}%`,
                                  width: `${Math.max(2, hiPct - loPct)}%`,
                                }}
                              />
                              {/* Your Offer Pin Marker */}
                              <div
                                className="absolute top-[-8px] bottom-[-8px] w-[3px] bg-[#062c55] rounded-full -translate-x-1/2 z-10"
                                style={{ left: `${offerPct}%` }}
                              >
                                <div className="absolute bottom-[calc(100%+4px)] left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-extrabold text-white bg-[#062c55] px-2 py-0.5 rounded-[6px] shadow-sm flex items-center gap-1 select-none">
                                  <span>Your offer · {kMoney(offerAmt)}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Key / Legend below */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3.5 text-xs text-[#5a6b78]">
                            <span className="inline-flex items-center gap-1.5">
                              <i className="w-2.5 h-2.5 rounded-[3px] bg-[#b9c5cf] inline-block shrink-0" />
                              Legal minimum · {kMoney(lowAmt)}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <i className="w-2.5 h-2.5 rounded-[3px] bg-[#0eb28d] inline-block shrink-0" />
                              What courts often award · {kMoney(loAmt)}–
                              {kMoney(highAmt)}
                            </span>
                          </div>
                          <div className="text-[11.5px] text-[#5a6b78] italic mt-1.5">
                            An estimate from a general model, not what you&apos;re
                            owed. Only a lawyer can tell you that.
                          </div>
                        </div>

                        {/* Footnote */}
                        <div className="mt-4 pt-3 border-t border-[#e7e4dd] text-[11.5px] text-[#5a6b78] leading-relaxed max-w-[540px] mx-auto text-left">
                          Rules v0.1.0 · legal minimum table from the official
                          source below · court-awarded band is a general estimate
                          pending employment-lawyer sign-off. Not what you are
                          owed; only a lawyer can tell you that.
                        </div>
                      </div>

                      {/* Official government source badge (inside verdict) */}
                      <div className="mt-3.5 max-w-[540px] mx-auto text-left">
                        <a
                          href="https://www.ontario.ca/document/your-guide-employment-standards-act-0/termination-employment"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2.5 px-3.5 rounded-[9px] border border-[#cbdcee] bg-white hover:border-[#0eb28d] shadow-[0_6px_16px_-12px_rgba(11,46,79,0.4)] transition-all group no-underline"
                        >
                          <div className="text-xs text-[#5a6b78] leading-tight">
                            <b className="block text-[#062c55] font-bold text-xs mb-0.5">
                              Official government source
                            </b>
                            <span>
                              Ontario ESA — termination &amp; severance ·
                              ontario.ca ·{" "}
                              <i className="italic">last reviewed Sept 2026</i>
                            </span>
                          </div>
                          <span className="text-[#0c8f72] font-extrabold text-sm ml-2 group-hover:translate-x-0.5 transition-transform">
                            →
                          </span>
                        </a>
                      </div>
                    </div>
                    {/* ── END VERDICT CARD ── */}

                    {/* Free Check Done Ribbon & Email Link */}
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

                    {/* ── NEXT STEP · OPTIONAL ── */}
                    <div className="text-center mb-6">
                      <div className="font-sans font-[800] uppercase tracking-[0.9px] text-[11px] leading-[16px] text-[#0c8f72] mb-1">
                        Next step · optional
                      </div>
                      <h2 className="font-serif font-[600] text-[26px] sm:text-[32px] text-[#062c55] leading-[32px] sm:leading-[36px] mb-2">
                        Want to take it a step further?
                      </h2>
                      <p className="font-sans font-normal text-[14px] sm:text-[15px] leading-[20px] text-[#5a6b78] max-w-[540px] mx-auto">
                        Two ways, both optional. Tap the ⓘ on either card for detail.
                      </p>
                    </div>

                    {/* 2 Options Cards */}
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
                            Your offer organized, your dates, your questions —
                            a 13-page report to take into any conversation.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setReportPreviewOpen(true)}
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
                          aria-label="Info about talking to a lawyer"
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
                            Talk to a lawyer
                          </h3>
                          <div className="font-serif font-[600] text-[30px] leading-none text-[#062c55] mb-2 flex items-baseline gap-2 flex-wrap">
                            Free{" "}
                            <span className="font-sans font-[700] text-[11px] leading-none text-[#0c7a60]">
                              first call · free to connect
                            </span>
                          </div>
                          <p className="font-sans font-normal text-[13px] leading-[19.5px] text-[#5a6b78] mb-5">
                            Your best shot at the full number — and it&apos;s
                            free for us to connect you.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAskLawyerOpen(true)}
                          className="w-full py-3 px-4 rounded-[9px] bg-gradient-to-b from-[#0eb28d] to-[#0c8f72] hover:brightness-105 text-white font-sans font-[800] text-[14px] leading-[20px] shadow-[0_12px_22px_-14px_rgba(12,143,114,0.7)] transition-all cursor-pointer text-center min-h-[50px] flex items-center justify-center"
                        >
                          Ask a lawyer to contact me — free
                        </button>
                      </div>
                    </div>

                    {/* Third Option Link */}
                    <div className="text-center my-4 font-sans font-normal text-[13.5px] leading-[20px] text-[#5a6b78]">
                      Happy with the offer as it is?{" "}
                      <button
                        type="button"
                        onClick={() => setChecklistModalOpen(true)}
                        className="font-sans font-[700] text-[#0c8f72] underline hover:no-underline cursor-pointer"
                      >
                        Get your free 3-point checklist →
                      </button>
                    </div>

                    {/* Why talk to a lawyer? Box */}
                    <div className="rounded-[12px] p-[14px_18px] bg-[#f0f9f5] border border-[#c7e6d6] font-sans font-normal text-[13.5px] leading-[21px] text-[#12523f] my-4 text-center max-w-[640px] mx-auto">
                      <b className="font-bold text-[#062c55]">
                        Why talk to a lawyer?
                      </b>{" "}
                      Most people don&apos;t realize the first offer is
                      usually just a{" "}
                      <b>starting point</b>{" "}
                      — an employment lawyer can spot money and terms people
                      miss, and often recovers{" "}
                      <b>more than they cost</b>
                      . The first call is <b>free</b>,
                      there&apos;s no obligation, and you choose who to talk
                      to.
                    </div>

                    {/* Educational disclaimer */}
                    <div className="mt-6 pt-5 border-t border-[#e7e4dd] font-sans font-normal text-[11.5px] leading-[17px] text-[#5a6b78] text-left max-w-[640px] mx-auto">
                      Educational and organizational information — not legal
                      advice. FairExit does not assess whether an offer is
                      fair, calculate what you&apos;re owed, or tell you what
                      to do. Only a licensed employment lawyer can advise on
                      your situation. Deadlines to act can be short — confirm
                      them with a lawyer promptly. We&apos;re paid a fixed
                      advertising fee by lawyers; never a cut of your
                      outcome, and you always choose who to talk to.{" "}
                      <a
                        href="#legal"
                        className="text-[#0c8f72] font-bold underline"
                      >
                        Terms &amp; Disclaimer →
                      </a>
                    </div>
                  </div>
                );
              })()}
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
            <div className="bg-[#EEF1F4] border border-[#e7e4dd] rounded-2xl p-5 shadow-[0_4px_20px_0_rgba(6,44,85,0.06)]">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#5a6b78]">
                Your details so far
              </span>
              <h3 className="font-serif text-[17px] font-semibold text-[#062c55] mb-3">
                FairExit summary
              </h3>

              <div className="space-y-1.5 text-xs">
                {SUMMARY_FIELDS.filter((f) => Boolean(userAnswers[f.key]))
                  .length === 0 ? (
                  <div className="text-[#8a98a4] italic py-2 text-[12px]">
                    Your answers will stack up here as you go.
                  </div>
                ) : (
                  SUMMARY_FIELDS.filter((f) => Boolean(userAnswers[f.key])).map(
                    (f) => (
                      <div
                        key={f.key}
                        className="flex justify-between items-start py-1 border-b border-dashed border-[#e7e4dd] gap-2 animate-rowin"
                      >
                        <span className="text-[#5a6b78] shrink-0">
                          {f.label}
                        </span>
                        <b className="text-[#062c55] font-semibold text-right leading-tight animate-flash">
                          {userAnswers[f.key]}
                        </b>
                      </div>
                    ),
                  )
                )}
              </div>

              {/* Enough to show results banner (as in original) */}
              {Boolean(
                (userAnswers.years && userAnswers.salary) ||
                (state.years && state.salary) ||
                currentStep === "step-results",
              ) && (
                <div className="mt-3 text-[12px] font-bold text-[#0c8f72] bg-[#e5f5ee] border border-[#b9e6d4] rounded-[9px] px-[11px] py-2">
                  ✓ Enough to show your results
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

      {/* ── MODALS FOR RESULTS SCREEN ── */}
      {/* 1. Option Info Pop-up (ⓘ) */}
      {infoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#062c55]/45 backdrop-blur-[2px] animate-scrimin"
          onClick={() => setInfoModal(null)}
        >
          <div
            className="relative bg-white rounded-[16px] p-6 max-w-[420px] w-full shadow-[0_40px_80px_-30px_rgba(6,44,85,0.55)] border border-[#e7e4dd] text-left animate-dlgup max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-sans font-[800] text-[11px] uppercase tracking-[0.6px] text-[#0c8f72] mb-1.5">
              DETAILS
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
                    <span>A 13-page PDF you can hand to HR or a lawyer</span>
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
                    <span>Your dates &amp; deadlines in one timeline</span>
                  </li>
                  <li className="flex items-start gap-2.5 font-sans font-normal text-[13px] leading-[19px] text-[#17242f]">
                    <span className="text-[#0c8f72] font-[800] text-[13px] leading-[19px] flex-shrink-0">
                      ✓
                    </span>
                    <span>General questions to prepare</span>
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
                <h3 className="font-sans font-[700] text-[16px] text-[#062c55] leading-snug mb-2">
                  How the free call works
                </h3>
                <p className="font-sans font-normal text-[13px] leading-[19.5px] text-[#5a6b78] mb-4">
                  Leave your name, email and phone. We pass them, with your organized summary, to an employment lawyer in your province who contacts you. They decide whether to offer a consultation. You keep a plain-English summary; the lawyer gets a clean intake.
                </p>

                {(() => {
                  const payLabelMap: Record<string, string> = {
                    bonus: "Bonus",
                    stock: "Stock",
                    benefits: "Benefits",
                    commission: "Commission",
                    pto: "PTO",
                  };
                  const checkedPay = Object.entries(state.pay || {})
                    .filter(([_, v]) => Boolean(v))
                    .map(([k]) => payLabelMap[k] || k);
                  const otherPayVal =
                    checkedPay.length > 0
                      ? checkedPay.join(", ")
                      : userAnswers["otherPay"] || "Benefits";

                  const getRoleLabel = () => {
                    const occ = OCCUPATIONS.find(
                      (o) => Math.abs(o.value - state.roleFactor) < 0.01,
                    );
                    if (occ) {
                      return occ.label.split(" (")[0];
                    }
                    return "Professional";
                  };

                  const contractMap: Record<string, string> = {
                    current: "Signed - same role",
                    old: "Signed - role changed",
                    none: "No written contract",
                    unsure: "Unsure",
                  };

                  const reasonMap: Record<string, string> = {
                    layoff: "Laid off (no cause)",
                    cause: "For cause",
                    constructive: "Forced out",
                    templayoff: "Temporary layoff",
                    mass: "Part of a big layoff (50+)",
                    restructure: "Restructure / Downsized",
                  };

                  const flagMap: Record<string, string> = {
                    none: "None noted",
                    mistreat: "Mistreatment / discrimination",
                    unpaid: "Unpaid bonus / wages",
                    harassment: "Harassment / Reprisal",
                    medical: "Medical / Disability",
                    pregnant: "Pregnancy / Parental",
                    other: "Other",
                  };

                  const rows = [
                    {
                      label: "Jurisdiction",
                      value:
                        PROVINCE_NAMES[state.province] ||
                        state.province ||
                        "Ontario",
                    },
                    {
                      label: "Union member",
                      value:
                        state.union === "yes"
                          ? "Yes"
                          : state.union === "unsure"
                            ? "Unsure"
                            : "No",
                    },
                    {
                      label: "Employment type",
                      value:
                        EMP_TYPE_LABELS[state.emptype] || "Regular employee",
                    },
                    {
                      label: "Age",
                      value: state.age || "23",
                    },
                    {
                      label: "Length of service",
                      value: state.years ? `${state.years} yrs` : "3 yrs",
                    },
                    {
                      label: "Role / seniority",
                      value: getRoleLabel(),
                    },
                    {
                      label: "Base salary",
                      value: state.salary
                        ? `${money(parseFloat(state.salary))}/yr`
                        : "$100,000/yr",
                    },
                    {
                      label: "Other pay",
                      value: otherPayVal,
                    },
                    {
                      label: "Termination clause",
                      value:
                        state.clause === "yes"
                          ? "Clause present — needs review"
                          : state.clause === "no"
                            ? "No clause"
                            : "Unclear — needs review",
                    },
                    {
                      label: "Employment contract",
                      value: contractMap[state.contract] || "Unsure",
                    },
                    {
                      label: "Payroll ≥ $2.5M",
                      value:
                        state.payroll === "yes"
                          ? "Yes"
                          : state.payroll === "no"
                            ? "No"
                            : "Unsure",
                    },
                    {
                      label: "How it ended",
                      value:
                        reasonMap[state.reason] || "Laid off (no cause)",
                    },
                    {
                      label: "Flags",
                      value: flagMap[state.redflag] || "None noted",
                    },
                    {
                      label: "Re-employed?",
                      value:
                        state.reemployed === "yes"
                          ? "Yes"
                          : state.reemployed === "soon"
                            ? "Interviews"
                            : state.reemployed === "offer"
                              ? "Offer received"
                              : "Not yet",
                    },
                  ];

                  return (
                    <div className="space-y-0 mb-5">
                      {rows.map((row, idx) => (
                        <div
                          key={row.label}
                          className={`flex justify-between items-center py-2 ${
                            idx < rows.length - 1
                              ? "border-b border-dotted border-[#d5dde4]"
                              : ""
                          } gap-4 text-[13px] leading-tight`}
                        >
                          <span className="text-[#5a6b78] shrink-0 font-normal">
                            {row.label}
                          </span>
                          <span className="text-[#062c55] font-[700] text-right">
                            {row.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
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

      {/* 2. Email Modal */}
      {emailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-[#062c55]/45 backdrop-blur-xs animate-scrimin"
            onClick={() => setEmailModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl border border-[#e7e4dd] p-6 sm:p-7 max-w-[420px] w-full shadow-2xl z-10 animate-dlgup text-center">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0c8f72] block mb-1">
              Free · No card needed
            </span>
            <h3 className="font-serif font-semibold text-2xl text-[#062c55] mb-2 leading-tight">
              Email me my free results
            </h3>
            <p className="text-xs sm:text-[13px] text-[#5a6b78] leading-relaxed mb-4">
              We&apos;ll send a clean PDF summary of your estimate range and
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

      {/* ── SEVERANCE REPORT PREVIEW MODAL ── */}
      <SeveranceReportPreviewDialog
        isOpen={reportPreviewOpen}
        onClose={() => setReportPreviewOpen(false)}
        country="CA"
        isResultsPage={true}
        onDownload={handleUnlockReport}
      />

      {/* ── 3-POINT CHECKLIST MODAL (PHOTO 1 & PHOTO 4) ── */}
      <ChecklistModal
        isOpen={checklistModalOpen}
        onClose={() => setChecklistModalOpen(false)}
        onOpenLawyerModal={() => setAskLawyerOpen(true)}
        country="CA"
        contractType={state.contract === "none" ? "none" : "signed"}
      />

      {/* ── ASK A LAWYER TO CONTACT ME MODAL (PHOTO 2) ── */}
      <AskLawyerModal
        isOpen={askLawyerOpen}
        onClose={() => setAskLawyerOpen(false)}
        country="CA"
        regionName={state.province || "Ontario"}
      />

      {/* ── STICKY BOTTOM BAR ("Your details — Ontario · 14 yrs [View]") ── */}
      {currentStep !== "step-results" &&
        currentStep !== "step-analyzing" &&
        currentStep !== "union" && (
          <div className="fixed left-3 right-3 bottom-3 z-40 block md:hidden animate-fade">
            <button
              type="button"
              onClick={() => setMobileSummOpen((prev) => !prev)}
              className="w-full bg-white border border-[#d5dde4] rounded-xl px-3.5 py-2.5 shadow-[0_10px_28px_-12px_rgba(6,44,85,0.35)] flex items-center gap-1.5 cursor-pointer text-left transition-all hover:border-[#0eb28d] active:scale-[0.99]"
              aria-expanded={mobileSummOpen}
              aria-controls="mobileSummary"
            >
              <span className="font-bold text-[13px] text-[#062c55] shrink-0">
                Your details
              </span>
              <span className="text-[12.5px] text-[#5a6b78] font-medium truncate flex-1 min-w-0">
                {getMobileSummarySnippet()}
              </span>
              <span className="shrink-0 inline-flex items-center gap-1 bg-[#0c8f72] text-white text-xs font-extrabold px-3 py-1.5 rounded-lg shadow-xs">
                <span>{mobileSummOpen ? "Hide" : "View"}</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${mobileSummOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                >
                  <path d="M6 15l6-6 6 6" />
                </svg>
              </span>
            </button>
          </div>
        )}
    </div>
  );
}

export default function CanadaFlow() {
  return <QuestionsContent />;
}
