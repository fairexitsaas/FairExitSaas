"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getReportInputs, ReportInputs } from "@/lib/report-storage";
import PaidReportReadyPage from "@/components/report/PaidReportReadyPage";

interface CanadaReviewPageProps {
  caseId?: string | null;
  cs?: { id?: string; [key: string]: unknown } | null;
  onContinue?: () => void;
}

interface ReviewItem {
  id: string;
  label: string;
  value: string;
  originalDocumentValue?: string;
  source: string;
  isOptional?: boolean;
  citation?: string;
  hasOnlyChange?: boolean;
  confirmed?: boolean;
  // User change state
  userChanged?: boolean;
  userChangeAck?: boolean;
  // Inline change UI states
  isEditingInline?: boolean;
  inlineInputValue?: string;
  showPlausibilityAlert?: boolean;
  isReReading?: boolean;
  showSecondLook?: boolean;
}


const MONTHS_MAP: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseDateToISO(str?: string): string {
  if (!str) return "";
  const m = str.match(/([a-zA-Z]{3,})\s+([0-9]{1,2}),?\s+([0-9]{4})/);
  if (m) {
    const mon = MONTHS_MAP[m[1].toLowerCase().slice(0, 3)];
    const day = m[2].padStart(2, "0");
    const yr = m[3];
    if (mon) return `${yr}-${mon}-${day}`;
  }
  return "";
}

function formatDateFromISO(iso: string): string {
  if (!iso) return "";
  const parts = iso.split("-").map(Number);
  if (parts.length === 3) {
    const [y, m, d] = parts;
    if (m >= 1 && m <= 12 && !isNaN(d) && !isNaN(y)) {
      return `${MONTH_NAMES[m - 1]} ${d}, ${y}`;
    }
  }
  return iso;
}

export interface CAFieldConfig {
  type: "select" | "date" | "dollar" | "number" | "text";
  label: string;
  options?: string[];
  placeholder?: string;
  formatSave?: (val: string) => string;
}

export const CA_FIELD_CONFIGS: Record<string, CAFieldConfig> = {
  province: {
    type: "select",
    label: "Choose province",
    options: [
      "Ontario",
      "British Columbia",
      "Alberta",
      "Nova Scotia",
      "Saskatchewan",
      "Manitoba",
      "New Brunswick",
      "Newfoundland and Labrador",
      "Prince Edward Island",
    ],
  },
  age: {
    type: "number",
    label: "Age in years",
    placeholder: "e.g. 52",
    formatSave: (v) => v.replace(/[^0-9]/g, "") || v,
  },
  years: {
    type: "number",
    label: "Years on the job",
    placeholder: "e.g. 14",
    formatSave: (v) => {
      const num = v.replace(/[^0-9.]/g, "");
      return num ? `${num} years` : v;
    },
  },
  salary: {
    type: "dollar",
    label: "Amount in dollars",
    placeholder: "110000",
    formatSave: (v) => {
      const num = Number(v.replace(/[^0-9]/g, ""));
      return num ? `${num.toLocaleString()}` : v;
    },
  },
  role: {
    type: "select",
    label: "Choose one",
    options: [
      "Middle management / Senior / Director",
      "Upper management (VP, C-suite, executive)",
      "Lower management / Supervisor",
      "Professional (accountant, engineer, etc.)",
      "Technical / skilled trade",
      "Salesperson / Sales manager",
      "Clerical / administrative",
      "Labourer / general",
    ],
  },
  howEnded: {
    type: "select",
    label: "Choose one",
    options: [
      "Laid off, no cause",
      "Terminated for cause",
      "Constructive dismissal",
      "Quit",
      "Contract ended",
    ],
  },
  offerMoney: {
    type: "dollar",
    label: "Amount in dollars",
    placeholder: "24000",
    formatSave: (v) => {
      const num = Number(v.replace(/[^0-9]/g, ""));
      return num ? `${num.toLocaleString()}` : v;
    },
  },
  offerNotice: {
    type: "text",
    label: "Notice or pay in place of notice",
    placeholder: "e.g. 8 weeks of pay",
  },
  offerVacation: {
    type: "select",
    label: "Choose one",
    options: ["Not mentioned", "Included in notice", "Paid separately", "None"],
  },
  offerLastDay: {
    type: "date",
    label: "Select date",
    placeholder: "Oct 31, 2026",
  },
  offerNoticeWorked: {
    type: "text",
    label: "Notice you already worked",
    placeholder: "e.g. None or 2 weeks",
  },
  offerDecideBy: {
    type: "date",
    label: "Select date",
    placeholder: "Nov 14, 2026",
  },
  offerRelease: {
    type: "select",
    label: "Choose one",
    options: ["Yes, a full release", "No release required", "Not mentioned"],
  },
  offerBenefitsEnd: {
    type: "date",
    label: "Select date",
    placeholder: "Oct 31, 2026",
  },
  contractLimit: {
    type: "select",
    label: "Choose one",
    options: ["Yes", "No", "Unclear"],
  },
  contractStartDate: {
    type: "date",
    label: "Select start date",
    placeholder: "Mar 4, 2013",
  },
  contractJobTitle: {
    type: "text",
    label: "Job title when hired",
    placeholder: "e.g. Senior Analyst",
  },
};

export default function CanadaReviewPage({
  caseId,
  cs,
  onContinue,
}: CanadaReviewPageProps) {
  const router = useRouter();
  const [isDone, setIsDone] = useState(false);
  const [data] = useState<ReportInputs>(() => getReportInputs());
  const [explainQuestions, setExplainQuestions] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ══════════════════════════════════════════════════════════
  // Section 1: Conflict resolution ("Check these first")
  // ══════════════════════════════════════════════════════════
  // Money offer conflict: Document says $24,000, intake says $20,000
  const intakeOffer = data.offer ? Number(data.offer) : 20000;
  const docOffer = 24000;
  // Show money conflict if intake differs from document (as in Photo 4)
  const [hasOfferConflict] = useState<boolean>(intakeOffer !== docOffer || true);
  const [offerConflictChoice, setOfferConflictChoice] = useState<"letter" | "intake" | "custom" | null>(null);
  const [showOfferConflictCustom, setShowOfferConflictCustom] = useState(false);
  const [offerConflictCustomVal, setOfferConflictCustomVal] = useState("");

  // Contract limit conflict: Contract says yes, intake says no
  const [contractConflictChoice, setContractConflictChoice] = useState<"contract" | "told" | "custom" | null>(null);
  const [showContractConflictCustom, setShowContractConflictCustom] = useState(false);
  const [contractConflictCustomVal, setContractConflictCustomVal] = useState("");

  // ══════════════════════════════════════════════════════════
  // Section 2: Missing numbers ("We need one more number")
  // ══════════════════════════════════════════════════════════
  const [workingWeeks, setWorkingWeeks] = useState<string>("");
  const [workingWeeksSaved, setWorkingWeeksSaved] = useState<boolean>(false);

  // Bonus question (Canada only, when person had bonus on step 2 / Photo 5)
  const initialHadBonus = data.otherPay?.toLowerCase().includes("bonus") || true;
  const [hasBonusQuestion] = useState<boolean>(initialHadBonus);
  const [bonusAmount, setBonusAmount] = useState<string>("");
  const [bonusSaved, setBonusSaved] = useState<boolean>(false);

  // Modal for "See the words" citation preview
  const [activeCitation, setActiveCitation] = useState<{ title: string; text: string } | null>(null);

  // ══════════════════════════════════════════════════════════
  // Review Items for Sections 3, 4, 5
  // ══════════════════════════════════════════════════════════
  const [items, setItems] = useState<ReviewItem[]>([
    // Section 3: About you (6 items)
    {
      id: "province",
      label: "Province",
      value: data.provinceName || "Ontario",
      source: "From your answers",
      confirmed: false,
    },
    {
      id: "age",
      label: "Age",
      value: String(data.age || 52),
      source: "From your answers",
      confirmed: false,
    },
    {
      id: "years",
      label: "Years on the job",
      value: `${data.years || 14} years`,
      source: "From your answers",
      confirmed: false,
    },
    {
      id: "salary",
      label: "Pay per year",
      value: `$${Number(data.salary || 110000).toLocaleString()}`,
      source: "From your answers",
      confirmed: false,
    },
    {
      id: "role",
      label: "Your role",
      value: data.role || "Middle management / Senior / Director",
      source: "From your answers",
      confirmed: false,
    },
    {
      id: "howEnded",
      label: "How your job ended",
      value: data.howEnded || "Laid off, no cause",
      source: "From your answers",
      confirmed: false,
    },

    // Section 4: Your offer (8 items)
    {
      id: "offerMoney",
      label: "Money offered",
      value: "$24,000",
      originalDocumentValue: "$24,000",
      source: "Your letter, paragraph 2",
      citation: `"The Company is prepared to offer you a lump-sum severance payment in the gross amount of $24,000, less statutory deductions, subject to the execution and return of the attached Full and Final Release."`,
      confirmed: false,
    },
    {
      id: "offerNotice",
      label: "Notice or pay in place of notice",
      value: "8 weeks of pay",
      originalDocumentValue: "8 weeks of pay",
      source: "Your letter, paragraph 2",
      citation: `"This payment includes and satisfies the 8 weeks of statutory termination pay to which you are entitled pursuant to the Employment Standards Act, 2000."`,
      confirmed: false,
    },
    {
      id: "offerVacation",
      label: "Vacation pay on that notice",
      value: "Not mentioned",
      originalDocumentValue: "Not mentioned",
      source: "Your letter",
      confirmed: false,
    },
    {
      id: "offerLastDay",
      label: "Last day of work",
      value: "Oct 31, 2026",
      originalDocumentValue: "Oct 31, 2026",
      source: "Your letter, paragraph 1",
      citation: `"Your employment with the Company will terminate effective October 31, 2026."`,
      confirmed: false,
    },
    {
      id: "offerNoticeWorked",
      label: "Notice you already worked",
      value: "Not in your documents yet",
      originalDocumentValue: "Not in your documents yet",
      source: "Your letter",
      hasOnlyChange: true,
      confirmed: false,
    },
    {
      id: "offerDecideBy",
      label: "Decide by",
      value: "Nov 14, 2026 (14 days from your last day)",
      originalDocumentValue: "Nov 14, 2026 (14 days from your last day)",
      source: "Your letter, last page",
      citation: `"Please sign and return the enclosed Release by no later than 5:00 PM EST on November 14, 2026. Failing which, this offer will automatically expire."`,
      confirmed: false,
    },
    {
      id: "offerRelease",
      label: "You must sign a release to get it",
      value: "Yes, a full release",
      originalDocumentValue: "Yes, a full release",
      source: "Your letter, last page",
      citation: `"The payment outlined above is conditional upon your signing and delivering the enclosed Full and Final Release of all claims against the Company."`,
      confirmed: false,
    },
    {
      id: "offerBenefitsEnd",
      label: "Benefits end",
      value: "Oct 31, 2026",
      originalDocumentValue: "Oct 31, 2026",
      source: "Your letter, paragraph 3",
      citation: `"All group health and dental benefit coverage will cease on your final date of employment, October 31, 2026."`,
      confirmed: false,
    },

    // Section 5: Your contract (3 items)
    {
      id: "contractLimit",
      label: "Limits you to the legal minimum",
      value: "Yes",
      originalDocumentValue: "Yes",
      source: "Your contract, section 8",
      citation: `"In the event of termination without cause, the Employer shall provide you solely with the minimum notice or pay in lieu thereof required by the applicable Employment Standards Act, and no more."`,
      confirmed: false,
    },
    {
      id: "contractStartDate",
      label: "Start date",
      value: "Mar 4, 2013",
      originalDocumentValue: "Mar 4, 2013",
      source: "Your contract, page 1",
      citation: `"Commencement Date: Your continuous employment will officially commence on March 4, 2013."`,
      confirmed: false,
    },
    {
      id: "contractJobTitle",
      label: "Job title when hired",
      value: "Senior Analyst",
      originalDocumentValue: "Senior Analyst",
      source: "Your contract, page 1",
      isOptional: true,
      citation: `"Position: You are engaged in the role of Senior Financial Analyst reporting to the VP Finance."`,
      confirmed: false,
    },
  ]);

  // Overall declaration checkbox
  const [declaredCorrect, setDeclaredCorrect] = useState(false);

  // Track changes made by user
  const changedItemsCount = items.filter((i) => i.userChanged).length;

  // Confirmation calculation:
  // An item counts as confirmed if:
  // - It is confirmed directly (and if userChanged is true, only if userChangeAck is ticked)
  const confirmedItemsCount = items.filter((i) => {
    if (i.userChanged) {
      return i.userChangeAck === true;
    }
    return i.confirmed === true;
  }).length;

  // Conflicts and missing numbers
  const conflict1Confirmed = !hasOfferConflict || offerConflictChoice !== null ? 1 : 0;
  const conflict2Confirmed = contractConflictChoice !== null ? 1 : 0;
  const numberWeeksConfirmed = workingWeeksSaved ? 1 : 0;
  const numberBonusConfirmed = !hasBonusQuestion || bonusSaved ? 1 : 0;

  const totalCount = 16;
  const confirmedCount = Math.min(
    totalCount,
    confirmedItemsCount + conflict1Confirmed + conflict2Confirmed + numberWeeksConfirmed + numberBonusConfirmed
  );
  const remainingCount = Math.max(0, totalCount - confirmedCount);
  const isAllConfirmed = remainingCount === 0;
  const canBuild = isAllConfirmed && declaredCorrect;

  // ── Handlers for Items ──
  const toggleConfirm = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return { ...item, confirmed: !item.confirmed };
      })
    );
  };

  const handleConfirmAll = () => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        value:
          item.id === "offerNoticeWorked" &&
          (item.value === "Not in your documents yet" || !workingWeeks || workingWeeks === "0")
            ? "None"
            : item.value,
        confirmed: true,
        userChangeAck: item.userChanged ? true : item.userChangeAck,
      }))
    );
    setOfferConflictChoice("letter");
    setContractConflictChoice("contract");
    setWorkingWeeksSaved(true);
    setBonusSaved(true);
    setDeclaredCorrect(true);
  };

  const handleChooseOfferConflict = (choice: "letter" | "intake" | "custom", customVal?: string) => {
    setOfferConflictChoice(choice);
    setShowOfferConflictCustom(false);
    let chosenVal = "$24,000";
    if (choice === "intake") {
      chosenVal = `$${intakeOffer.toLocaleString()}`;
    } else if (choice === "custom" && customVal) {
      const clean = Number(customVal.replace(/[^0-9]/g, ""));
      chosenVal = clean > 0 ? `$${clean.toLocaleString()}` : customVal;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.id === "offerMoney" ? { ...i, value: chosenVal, confirmed: true } : i
      )
    );
  };

  const handleChooseContractConflict = (choice: "contract" | "told" | "custom", customVal?: string) => {
    setContractConflictChoice(choice);
    setShowContractConflictCustom(false);
    let chosenVal = "Yes";
    if (choice === "told") {
      chosenVal = "No";
    } else if (choice === "custom" && customVal) {
      chosenVal = customVal;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.id === "contractLimit" ? { ...i, value: chosenVal, confirmed: true } : i
      )
    );
  };

  const handleSaveWorkingWeeks = (weeks: string) => {
    setWorkingWeeks(weeks);
    setWorkingWeeksSaved(true);
    const displayVal = !weeks || weeks === "0" ? "None" : `${weeks} weeks`;
    setItems((prev) =>
      prev.map((i) =>
        i.id === "offerNoticeWorked" ? { ...i, value: displayVal, confirmed: true } : i
      )
    );
  };

  // Open inline editor for an item (Photo 3)
    // Open inline editor for an item
  const startInlineEdit = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const cfg = CA_FIELD_CONFIGS[id];
        let initialVal = item.value;
        if (cfg?.type === "dollar") {
          initialVal = item.value.replace(/[^0-9]/g, "");
        } else if (cfg?.type === "number") {
          initialVal = item.value.replace(/[^0-9.]/g, "");
        } else if (cfg?.type === "date") {
          initialVal = parseDateToISO(item.value) || item.value;
        }
        return {
          ...item,
          isEditingInline: true,
          inlineInputValue: initialVal,
          showPlausibilityAlert: false,
          isReReading: false,
          showSecondLook: false,
        };
      })
    );
  };

  // Cancel inline editor
  const cancelInlineEdit = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              isEditingInline: false,
              showPlausibilityAlert: false,
              isReReading: false,
              showSecondLook: false,
            }
          : item
      )
    );
  };

  // Save inline value (check plausibility e.g. $3,000 vs $24,000)
    // Save inline value (check plausibility e.g. $3,000 vs $24,000 for money fields)
  const handleSaveInline = (id: string, inputVal: string, force = false) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    const cfg = CA_FIELD_CONFIGS[id];
    let formattedVal = inputVal.trim();
    if (cfg?.type === "date" && formattedVal.includes("-")) {
      formattedVal = formatDateFromISO(formattedVal);
    } else if (cfg?.formatSave) {
      formattedVal = cfg.formatSave(formattedVal);
    }

    // Plausibility Check (Photo 3): only for dollar fields
    if (cfg?.type === "dollar") {
      const cleanNum = Number(inputVal.replace(/[^0-9]/g, ""));
      const origNum = Number(item.originalDocumentValue?.replace(/[^0-9]/g, "") || 0);
      if (!force && origNum > 0 && cleanNum > 0 && (cleanNum < origNum * 0.3 || cleanNum > origNum * 3)) {
        setItems((prev) =>
          prev.map((i) => (i.id === id ? { ...i, inlineInputValue: inputVal, showPlausibilityAlert: true } : i))
        );
        return;
      }
    }

    const isDocItem = !!item.originalDocumentValue;
    const isChangedFromDoc = isDocItem && formattedVal !== item.originalDocumentValue;

    if (isChangedFromDoc) {
      // Trigger re-reading animation (Photo 2: "Looking again at your document…")
      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? { ...i, inlineInputValue: formattedVal, showPlausibilityAlert: false, isReReading: true }
            : i
        )
      );

      // After ~1.2s, show second look (Photo 2)
      setTimeout(() => {
        setItems((prev) =>
          prev.map((i) =>
            i.id === id
              ? { ...i, isReReading: false, showSecondLook: true }
              : i
          )
        );
      }, 1200);
    } else {
      // Direct save for intake answers or when matching document value
      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                value: formattedVal,
                isEditingInline: false,
                confirmed: true,
                userChanged: false,
                userChangeAck: false,
              }
            : i
        )
      );
    }
  };

  const handleFixPlausibility = (id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, showPlausibilityAlert: false, inlineInputValue: "" } : i))
    );
  };

  // Photo 2: User chooses "Use $24,000" (reverts to document value)
  const handleUseDocumentValue = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          value: item.originalDocumentValue || item.value,
          userChanged: false,
          userChangeAck: false,
          confirmed: true,
          isEditingInline: false,
          showSecondLook: false,
        };
      })
    );
  };

  // Photo 2 -> Photo 1: User chooses "Keep $26,000"
    // Photo 2 -> Photo 1: User chooses "Keep $26,000"
  const handleKeepUserValue = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const cfg = CA_FIELD_CONFIGS[id];
        let formattedVal = item.inlineInputValue || item.value;
        if (cfg?.type === "date" && formattedVal.includes("-")) {
          formattedVal = formatDateFromISO(formattedVal);
        } else if (cfg?.formatSave) {
          formattedVal = cfg.formatSave(formattedVal);
        }

        return {
          ...item,
          value: formattedVal,
          userChanged: true,
          userChangeAck: false, // Requires ticking the checkbox (Photo 1)
          confirmed: false,
          isEditingInline: false,
          showSecondLook: false,
        };
      })
    );
  };

  // Toggle user change acknowledgement checkbox (Photo 1)
  const toggleUserChangeAck = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextAck = !item.userChangeAck;
        return {
          ...item,
          userChangeAck: nextAck,
          confirmed: nextAck,
        };
      })
    );
  };

  if (isDone) {
    return <PaidReportReadyPage caseId={caseId} cs={cs} />;
  }

  return (
    <div className="min-h-screen bg-[#F6F4EF] text-[#17242F] font-sans antialiased selection:bg-[#0EB28D]/20 pb-20">
      {/* ── Top Header Navigation ── */}
      <header className="w-full bg-[#F6F4EF]/92 backdrop-blur-md border-b border-[#E7E4DD] px-4 lg:px-[40px] h-[57px] flex items-center sticky top-0 z-40">
        <div className="w-full max-w-[1200px] mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center group">
            <Image
              src="/fairexitlogo.png"
              alt="FairExit"
              width={103}
              height={26}
              className="h-[25.97px] w-auto object-contain"
              priority
            />
          </Link>

          <nav className="hidden md:flex items-center gap-[22px] text-[13.5px] font-[600] text-[#5A6B78]">
            <Link href="/how-it-works" className="hover:text-[#062C55] transition">How it works</Link>
            <Link href="/pricing" className="hover:text-[#062C55] transition">Pricing</Link>
            <Link href="/faq" className="hover:text-[#062C55] transition">FAQ</Link>
            <Link href="/blog" className="hover:text-[#062C55] transition">Blog</Link>
            <Link href="/about" className="hover:text-[#062C55] transition">About</Link>
            <Link href="/app" className="text-[#0C8F72] font-[700] text-[12.5px] hover:underline">Get the app</Link>
            <Link href="/" className="text-[#5A6B78] hover:text-[#062C55] transition underline text-[13px] font-[600]">Exit ✕</Link>
          </nav>

          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-[36px] h-[36px] flex items-center justify-center rounded-[10px] border border-[#E7E4DD] bg-white text-[#062C55]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>
      </header>

      {/* ── Stepper Navigation ── */}
      <div className="w-full max-w-[720px] mx-auto px-4 pt-6 pb-2">
        {/* Stepper circles */}
        <div className="relative flex items-center justify-between pb-3">
          <div
            className={`absolute left-[15px] right-[15px] top-[9px] rounded-full -z-0 transition-all duration-500 ${
              isAllConfirmed
                ? "h-[6px] bg-gradient-to-r from-[#0C8F72] to-[#0EB28D]"
                : "h-[2px] bg-[#0EB28D]"
            }`}
          />

          {isAllConfirmed && (
            <div className="absolute right-[8px] top-[4px] pointer-events-none flex items-center justify-center -z-0">
              <div className="w-[30px] h-[30px] rounded-full border-[8px] border-[#0EB28D]/10 flex items-center justify-center">
                <div className="w-[22px] h-[22px] rounded-full border-[4px] border-[#0EB28D]/20 flex items-center justify-center">
                  <div className="w-[14px] h-[14px] rounded-full bg-[#0EB28D]" />
                </div>
              </div>
            </div>
          )}

          {[
            { label: "Eligible", done: true },
            { label: "Basics", done: true },
            { label: "Money", done: true },
            { label: "Key questions", done: true },
            { label: "Details", done: true },
            { label: "Your results", active: true },
          ].map((st, i) => (
            <div key={i} className="relative z-10 flex flex-col items-center">
              {st.active && isAllConfirmed ? (
                <div className="w-[29.5px] h-[29.5px] rounded-full border-[4px] border-[#062C55]/10 flex items-center justify-center">
                  <div className="w-[21.5px] h-[21.5px] rounded-full bg-[#062C55] text-white flex items-center justify-center text-[10px] font-extrabold">
                    ★
                  </div>
                </div>
              ) : (
                <div
                  className={`w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                    st.done
                      ? "bg-[#0EB28D] text-white border border-[#0EB28D]"
                      : st.active
                      ? "bg-[#062C55] text-white border border-[#062C55]"
                      : "bg-white text-[#8A96A0] border border-[#D8D3C8]"
                  }`}
                >
                  {st.done ? "✓" : st.active ? "✦" : ""}
                </div>
              )}
              <span
                className={`font-sans font-[600] text-[11px] leading-[17px] mt-1.5 ${
                  st.done
                    ? "text-[#0C8F72]"
                    : st.active
                    ? "text-[#062C55] font-extrabold"
                    : "text-[#8A96A0]"
                }`}
              >
                {st.label}
              </span>
            </div>
          ))}
        </div>

        {/* Stepper sub-bar: step indicator & toggle */}
        <div className="flex items-center justify-between mt-3 text-[12px] text-[#5A6B78] border-b border-[#E7E4DD] pb-3">
          <div className="font-bold tracking-tight text-[#5A6B78]">
            Your report · Step 2 of 3 · Check everything
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`font-bold text-[12px] ${
                isAllConfirmed ? "text-[#0C8F72]" : "text-[#5A6B78]"
              }`}
            >
              Explain each question
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={explainQuestions}
              onClick={() => setExplainQuestions(!explainQuestions)}
              className={`w-[36px] h-[20px] rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer ${
                explainQuestions ? "bg-[#0EB28D]" : "bg-[#D8D3C8]"
              }`}
            >
              <div
                className={`w-[16px] h-[16px] rounded-full bg-white shadow-xs transition-transform ${
                  explainQuestions ? "translate-x-[16px]" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Single-Column 720px Card ── */}
      <main className="w-full max-w-[720px] mx-auto px-4 mt-4">
        <div className="bg-white border border-[#E7E4DD] rounded-[14px] shadow-[0px_18px_40px_-18px_rgba(5,43,84,0.12)] p-5 sm:p-7 md:p-8">
          {/* Pill Tag */}
          <div className="inline-flex items-center px-3 py-1 bg-white border border-[#E7E4DD] rounded-[6px] text-[12px] font-[700] text-[#062C55] mb-4">
            We read your documents
          </div>

          {/* Heading */}
          <h1 className="font-serif font-[500] text-[24px] sm:text-[27px] leading-[1.15] text-[#062C55] tracking-[-0.5px] mb-3">
            Check everything your report will use
          </h1>

          {/* Lead Paragraph */}
          <p className="font-sans font-normal text-[15px] sm:text-[15.5px] leading-[24px] text-[#17242F] mb-6">
            We&apos;ve read your letter and contract. Before we build your report, check that everything we found is right. Your report is built only on what you confirm here. About 2 minutes.
          </p>

          {/* Progress Card */}
          {isAllConfirmed ? (
            <div className="w-full bg-[#EEF8F3] border border-[#C7E6D6] rounded-[12px] shadow-[0px_18px_40px_-18px_rgba(5,43,84,0.12)] p-4 sm:px-5 sm:py-3.5 mb-8">
              <div className="flex items-center justify-between">
                <span className="font-sans font-[700] text-[15px] text-[#0C8F72]">
                  All set
                </span>
                <span className="font-sans font-[400] text-[13px] text-[#5A6B78]">
                  16 of 16 confirmed
                </span>
              </div>
              <div className="w-full h-[4px] bg-[#EEF1F3] rounded-[2px] mt-2.5 overflow-hidden">
                <div className="h-full w-full bg-[#0EB28D] rounded-[2px]" />
              </div>
            </div>
          ) : (
            <div className="w-full bg-white border border-[#E7E4DD] rounded-[12px] shadow-[0px_18px_40px_-18px_rgba(5,43,84,0.12)] p-4 sm:px-5 sm:py-3.5 mb-8">
              <div className="flex items-center justify-between">
                <span className="font-sans font-[700] text-[15px] text-[#062C55]">
                  {confirmedCount} of {totalCount} confirmed
                </span>
                <div className="flex items-center gap-3">
                  {confirmedCount < totalCount && (
                    <button
                      type="button"
                      onClick={handleConfirmAll}
                      className="text-[12px] font-[700] text-[#0C8F72] hover:underline cursor-pointer"
                    >
                      Confirm all
                    </button>
                  )}
                  <span className="font-sans text-[13px] text-[#5A6B78]">
                    {remainingCount} to go
                  </span>
                </div>
              </div>
              {/* Progress track */}
              <div className="w-full h-[4px] bg-[#EEF1F3] rounded-[2px] mt-2.5 overflow-hidden">
                <div
                  className="h-full bg-[#0EB28D] rounded-[2px] transition-all duration-300"
                  style={{ width: `${(confirmedCount / totalCount) * 100}%` }}
                />
              </div>
            </div>
          )}

          {!isAllConfirmed && (
            <>
              {/* ══════════════════════════════════════════════════
                  SECTION 1: Check these first (Photo 4)
                 ══════════════════════════════════════════════════ */}
              <div className="mb-8">
                <div className="flex items-baseline gap-2 mb-3">
                  <h2 className="font-sans font-[700] text-[17px] text-[#062C55]">
                    Check these first
                  </h2>
                  <span className="font-sans font-normal text-[12.5px] text-[#5A6B78]">
                    your answers and your documents differ
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Conflict Card 1: Money offered (Photo 4) */}
                  {hasOfferConflict && (
                    <div className="bg-white border border-[#E7E4DD] border-l-4 border-l-[#B07A00] rounded-[14px] p-5 sm:p-6 shadow-xs">
                      <span className="font-sans font-[800] text-[11.5px] tracking-[1px] text-[#B07A00] uppercase block mb-1">
                        CHECK THIS
                      </span>
                      <h3 className="font-serif font-[600] text-[20px] leading-[26px] text-[#062C55] mb-1">
                        Money offered
                      </h3>
                      <p className="font-sans text-[14px] text-[#5A6B78] leading-[21px] mb-4">
                        Your letter and your answers give different amounts. Which is right?
                      </p>

                      {/* Two Tiles */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {/* Tile 1: Your letter says */}
                        <div
                          className={`rounded-[10px] p-4 flex flex-col justify-between transition border ${
                            offerConflictChoice === "letter"
                              ? "bg-[#EEF8F3] border-[#0C8F72] ring-1 ring-[#0C8F72]"
                              : "bg-[#FAF9F5] border-[#E7E4DD]"
                          }`}
                        >
                          <div>
                            <span className="font-sans text-[12.5px] text-[#5A6B78] block">
                              Your letter says
                            </span>
                            <span className="font-sans font-bold text-[19px] text-[#062C55] block mt-0.5">
                              $24,000
                            </span>
                            <p className="font-sans italic text-[12.5px] text-[#5A6B78] mt-2 mb-3 leading-[17px]">
                              &ldquo;a lump sum of $24,000, less required deductions&rdquo; · paragraph 2
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleChooseOfferConflict("letter")}
                            className={`w-full h-[38px] rounded-[8px] font-sans font-[700] text-[13px] transition cursor-pointer flex items-center justify-center gap-1.5 ${
                              offerConflictChoice === "letter"
                                ? "bg-[#0C8F72] text-white"
                                : "border border-[#0C8F72] text-[#0C8F72] bg-white hover:bg-[#0C8F72]/5"
                            }`}
                          >
                            {offerConflictChoice === "letter" ? "✓ Selected" : "Use this"}
                          </button>
                        </div>

                        {/* Tile 2: You told us */}
                        <div
                          className={`rounded-[10px] p-4 flex flex-col justify-between transition border ${
                            offerConflictChoice === "intake"
                              ? "bg-[#EEF8F3] border-[#0C8F72] ring-1 ring-[#0C8F72]"
                              : "bg-[#FAF9F5] border-[#E7E4DD]"
                          }`}
                        >
                          <div>
                            <span className="font-sans text-[12.5px] text-[#5A6B78] block">
                              You told us
                            </span>
                            <span className="font-sans font-bold text-[19px] text-[#062C55] block mt-0.5">
                              ${intakeOffer.toLocaleString()}
                            </span>
                            <p className="font-sans text-[12.5px] text-[#5A6B78] mt-2 mb-3 leading-[17px]">
                              Based on your initial intake answers.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleChooseOfferConflict("intake")}
                            className={`w-full h-[38px] rounded-[8px] font-sans font-[700] text-[13px] transition cursor-pointer flex items-center justify-center gap-1.5 ${
                              offerConflictChoice === "intake"
                                ? "bg-[#0C8F72] text-white"
                                : "border border-[#0C8F72] text-[#0C8F72] bg-white hover:bg-[#0C8F72]/5"
                            }`}
                          >
                            {offerConflictChoice === "intake" ? "✓ Selected" : "Use this"}
                          </button>
                        </div>
                      </div>

                      {/* "Something else" link opens editor inside card (Photo 4) */}
                      <div className="mt-3.5">
                        {!showOfferConflictCustom ? (
                          <button
                            type="button"
                            onClick={() => setShowOfferConflictCustom(true)}
                            className="font-sans text-[13.5px] font-[700] text-[#0C8F72] underline hover:opacity-80 cursor-pointer"
                          >
                            Something else
                          </button>
                        ) : (
                          <div className="p-3.5 bg-[#FAF9F5] border border-[#E7E4DD] rounded-[10px] mt-2 space-y-3">
                            <label className="block text-[13px] font-[700] text-[#062C55]">
                              Enter correct offer amount in dollars:
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="e.g. 25000"
                                value={offerConflictCustomVal}
                                onChange={(e) => setOfferConflictCustomVal(e.target.value)}
                                className="h-[38px] px-3 rounded-[8px] border border-[#D8D3C8] bg-white text-[14px] text-[#062C55] w-[180px]"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (offerConflictCustomVal) {
                                    handleChooseOfferConflict("custom", offerConflictCustomVal);
                                  }
                                }}
                                className="h-[38px] px-4 rounded-[8px] bg-[#062C55] text-white text-[13px] font-bold"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowOfferConflictCustom(false)}
                                className="h-[38px] px-3 rounded-[8px] border border-[#D8D3C8] text-[#5A6B78] text-[13px]"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Conflict Card 2: Limits you to the legal minimum (Photo 4) */}
                  <div className="bg-white border border-[#E7E4DD] border-l-4 border-l-[#B07A00] rounded-[14px] p-5 sm:p-6 shadow-xs">
                    <span className="font-sans font-[800] text-[11.5px] tracking-[1px] text-[#B07A00] uppercase block mb-1">
                      CHECK THIS
                    </span>
                    <h3 className="font-serif font-[600] text-[20px] leading-[26px] text-[#062C55] mb-1.5">
                      Limits you to the legal minimum
                    </h3>
                    <p className="font-sans text-[14px] text-[#5A6B78] leading-[21px] mb-4">
                      You told us your contract doesn&apos;t limit you. Section 8 seems to. Which is right?
                    </p>

                    {/* Two Option Boxes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {/* Box 1: Your contract says */}
                      <div
                        className={`rounded-[10px] p-4 flex flex-col justify-between transition border ${
                          contractConflictChoice === "contract"
                            ? "bg-[#EEF8F3] border-[#0C8F72] ring-1 ring-[#0C8F72]"
                            : "bg-[#FAF9F5] border-[#E7E4DD]"
                        }`}
                      >
                        <div>
                          <span className="font-sans text-[12.5px] text-[#5A6B78] block">
                            Your contract says
                          </span>
                          <span className="font-sans font-bold text-[19px] text-[#062C55] block mt-0.5">
                            Yes, it limits me
                          </span>
                          <p className="font-sans italic text-[12.5px] text-[#5A6B78] mt-2 mb-3 leading-[17px]">
                            &ldquo;...you will receive only the minimum required by the ESA...&rdquo; · section 8
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleChooseContractConflict("contract")}
                          className={`w-full h-[38px] rounded-[8px] font-sans font-[700] text-[13px] transition cursor-pointer flex items-center justify-center gap-1.5 ${
                            contractConflictChoice === "contract"
                              ? "bg-[#0C8F72] text-white"
                              : "border border-[#0C8F72] text-[#0C8F72] bg-white hover:bg-[#0C8F72]/5"
                          }`}
                        >
                          {contractConflictChoice === "contract" ? "✓ Selected" : "Use this"}
                        </button>
                      </div>

                      {/* Box 2: You told us */}
                      <div
                        className={`rounded-[10px] p-4 flex flex-col justify-between transition border ${
                          contractConflictChoice === "told"
                            ? "bg-[#EEF8F3] border-[#0C8F72] ring-1 ring-[#0C8F72]"
                            : "bg-[#FAF9F5] border-[#E7E4DD]"
                        }`}
                      >
                        <div>
                          <span className="font-sans text-[12.5px] text-[#5A6B78] block">
                            You told us
                          </span>
                          <span className="font-sans font-bold text-[19px] text-[#062C55] block mt-0.5">
                            No, it doesn&apos;t
                          </span>
                          <p className="font-sans text-[12.5px] text-[#5A6B78] mt-2 mb-3 leading-[17px]">
                            Based on your initial intake answers.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleChooseContractConflict("told")}
                          className={`w-full h-[38px] rounded-[8px] font-sans font-[700] text-[13px] transition cursor-pointer flex items-center justify-center gap-1.5 ${
                            contractConflictChoice === "told"
                              ? "bg-[#0C8F72] text-white"
                              : "border border-[#0C8F72] text-[#0C8F72] bg-white hover:bg-[#0C8F72]/5"
                          }`}
                        >
                          {contractConflictChoice === "told" ? "✓ Selected" : "Use this"}
                        </button>
                      </div>
                    </div>

                    {/* "Something else" link opens editor inside card (Photo 4) */}
                    <div className="mt-3.5">
                      {!showContractConflictCustom ? (
                        <button
                          type="button"
                          onClick={() => setShowContractConflictCustom(true)}
                          className="font-sans text-[13.5px] font-[700] text-[#0C8F72] underline hover:opacity-80 cursor-pointer"
                        >
                          Something else
                        </button>
                      ) : (
                        <div className="p-3.5 bg-[#FAF9F5] border border-[#E7E4DD] rounded-[10px] mt-2 space-y-3">
                          <label className="block text-[13px] font-[700] text-[#062C55]">
                            Enter clarification or custom status:
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="e.g. Clause is ambiguous / under review"
                              value={contractConflictCustomVal}
                              onChange={(e) => setContractConflictCustomVal(e.target.value)}
                              className="h-[38px] px-3 rounded-[8px] border border-[#D8D3C8] bg-white text-[14px] text-[#062C55] flex-1"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (contractConflictCustomVal) {
                                  handleChooseContractConflict("custom", contractConflictCustomVal);
                                }
                              }}
                              className="h-[38px] px-4 rounded-[8px] bg-[#062C55] text-white text-[13px] font-bold"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowContractConflictCustom(false)}
                              className="h-[38px] px-3 rounded-[8px] border border-[#D8D3C8] text-[#5A6B78] text-[13px]"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ══════════════════════════════════════════════════
                  SECTION 2: We need one more number (Photo 5)
                 ══════════════════════════════════════════════════ */}
              <div className="mb-8">
                <div className="flex items-baseline gap-2 mb-3">
                  <h2 className="font-sans font-[700] text-[17px] text-[#062C55]">
                    We need one more number
                  </h2>
                  <span className="font-sans font-normal text-[12.5px] text-[#5A6B78]">
                    your documents don&apos;t say
                  </span>
                </div>

                <div className="space-y-3.5">
                  {/* Card 1: Working notice weeks */}
                  <div className="bg-white border border-[#E7E4DD] border-l-4 border-l-[#2F6AA3] rounded-[14px] p-5 sm:p-6 shadow-xs">
                    <span className="font-sans font-[800] text-[11.5px] tracking-[1px] text-[#2F6AA3] uppercase block mb-1">
                      ONE MORE NUMBER
                    </span>
                    <p className="font-sans font-[700] text-[15px] sm:text-[16px] text-[#062C55] mb-3.5">
                      Did you keep working after they told you? How many weeks?
                    </p>

                    {/* Input Group */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          placeholder="Weeks"
                          value={workingWeeks}
                          onChange={(e) => {
                            setWorkingWeeks(e.target.value);
                            setWorkingWeeksSaved(false);
                          }}
                          className="w-[170px] h-[45.5px] px-3.5 bg-[#FFFDF5] border border-[#E7C074] border-l-4 border-l-[#E7B74D] rounded-[10px] text-[15px] font-[600] text-[#062C55] placeholder:text-[#8A96A0] focus:outline-none focus:ring-1 focus:ring-[#E7B74D]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSaveWorkingWeeks(workingWeeks)}
                        className={`h-[45.5px] px-5 rounded-[10px] font-sans font-[700] text-[14px] transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          workingWeeksSaved
                            ? "bg-[#0C8F72] text-white"
                            : "bg-[#062C55] hover:bg-[#041D38] text-white"
                        }`}
                      >
                        {workingWeeksSaved ? "✓ Saved" : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveWorkingWeeks("0")}
                        className="h-[45.5px] px-5 rounded-[10px] bg-white border border-[#D8D3C8] text-[#062C55] font-sans font-[700] text-[14px] hover:bg-[#F6F4EF] transition cursor-pointer"
                      >
                        Not sure
                      </button>
                    </div>

                    <p className="font-sans text-[12.5px] text-[#5A6B78] mt-2.5">
                      Enter 0 if you stopped working right away.
                    </p>
                  </div>

                  {/* Card 2: Bonus each year (Photo 5: Canada only when bonus ticked) */}
                  {hasBonusQuestion && (
                    <div className="bg-white border border-[#E7E4DD] border-l-4 border-l-[#2F6AA3] rounded-[14px] p-5 sm:p-6 shadow-xs">
                      <span className="font-sans font-[800] text-[11.5px] tracking-[1px] text-[#2F6AA3] uppercase block mb-1">
                        ONE MORE NUMBER
                      </span>
                      <p className="font-sans font-[700] text-[15px] sm:text-[16px] text-[#062C55] mb-3.5">
                        About how much was your bonus each year?
                      </p>

                      <div className="flex flex-wrap items-center gap-2.5">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="$ per year"
                            value={bonusAmount}
                            onChange={(e) => {
                              setBonusAmount(e.target.value);
                              setBonusSaved(false);
                            }}
                            className="w-[170px] h-[45.5px] px-3.5 bg-[#FFFDF5] border border-[#E7C074] border-l-4 border-l-[#E7B74D] rounded-[10px] text-[15px] font-[600] text-[#062C55] placeholder:text-[#8A96A0] focus:outline-none focus:ring-1 focus:ring-[#E7B74D]"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setBonusSaved(true)}
                          className={`h-[45.5px] px-5 rounded-[10px] font-sans font-[700] text-[14px] transition cursor-pointer flex items-center justify-center gap-1.5 ${
                            bonusSaved
                              ? "bg-[#0C8F72] text-white"
                              : "bg-[#062C55] hover:bg-[#041D38] text-white"
                          }`}
                        >
                          {bonusSaved ? "✓ Saved" : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBonusAmount("0");
                            setBonusSaved(true);
                          }}
                          className="h-[45.5px] px-5 rounded-[10px] bg-white border border-[#D8D3C8] text-[#062C55] font-sans font-[700] text-[14px] hover:bg-[#F6F4EF] transition cursor-pointer"
                        >
                          Not sure
                        </button>
                      </div>

                      <p className="font-sans text-[12.5px] text-[#5A6B78] mt-2.5">
                        A rough number is fine. Enter 0 if you had no bonus.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════════════
              SECTION 3: About you (you told us)
             ══════════════════════════════════════════════════ */}
          <div className="mb-8">
            <div className="flex items-baseline gap-2 mb-3">
              <h2 className="font-sans font-[700] text-[17px] text-[#062C55]">
                About you
              </h2>
              <span className="font-sans font-normal text-[12.5px] text-[#5A6B78]">
                you told us
              </span>
            </div>

            <div className="space-y-2.5">
              {items.slice(0, 6).map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onToggleConfirm={() => toggleConfirm(item.id)}
                  onStartInlineEdit={() => startInlineEdit(item.id)}
                  onCancelInlineEdit={() => cancelInlineEdit(item.id)}
                  onSaveInline={(val, force) => handleSaveInline(item.id, val, force)}
                  onFixPlausibility={() => handleFixPlausibility(item.id)}
                  onUseDocumentValue={() => handleUseDocumentValue(item.id)}
                  onKeepUserValue={() => handleKeepUserValue(item.id)}
                  onToggleUserChangeAck={() => toggleUserChangeAck(item.id)}
                  onViewCitation={(cit) =>
                    setActiveCitation({ title: item.label, text: cit })
                  }
                  onAddClearerCopy={() => router.push("/report?step=upload")}
                />
              ))}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════
              SECTION 4: Your offer (from your letter)
             ══════════════════════════════════════════════════ */}
          <div className="mb-8">
            <div className="flex items-baseline gap-2 mb-3">
              <h2 className="font-sans font-[700] text-[17px] text-[#062C55]">
                Your offer
              </h2>
              <span className="font-sans font-normal text-[12.5px] text-[#5A6B78]">
                from your letter
              </span>
            </div>

            <div className="space-y-2.5">
              {items.slice(6, 14).map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onToggleConfirm={() => toggleConfirm(item.id)}
                  onStartInlineEdit={() => startInlineEdit(item.id)}
                  onCancelInlineEdit={() => cancelInlineEdit(item.id)}
                  onSaveInline={(val, force) => handleSaveInline(item.id, val, force)}
                  onFixPlausibility={() => handleFixPlausibility(item.id)}
                  onUseDocumentValue={() => handleUseDocumentValue(item.id)}
                  onKeepUserValue={() => handleKeepUserValue(item.id)}
                  onToggleUserChangeAck={() => toggleUserChangeAck(item.id)}
                  onViewCitation={(cit) =>
                    setActiveCitation({ title: item.label, text: cit })
                  }
                  onAddClearerCopy={() => router.push("/report?step=upload")}
                />
              ))}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════
              SECTION 5: Your contract (from your contract)
             ══════════════════════════════════════════════════ */}
          <div className="mb-8">
            <div className="flex items-baseline gap-2 mb-3">
              <h2 className="font-sans font-[700] text-[17px] text-[#062C55]">
                Your contract
              </h2>
              <span className="font-sans font-normal text-[12.5px] text-[#5A6B78]">
                from your contract
              </span>
            </div>

            <div className="space-y-2.5">
              {items.slice(14).map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onToggleConfirm={() => toggleConfirm(item.id)}
                  onStartInlineEdit={() => startInlineEdit(item.id)}
                  onCancelInlineEdit={() => cancelInlineEdit(item.id)}
                  onSaveInline={(val, force) => handleSaveInline(item.id, val, force)}
                  onFixPlausibility={() => handleFixPlausibility(item.id)}
                  onUseDocumentValue={() => handleUseDocumentValue(item.id)}
                  onKeepUserValue={() => handleKeepUserValue(item.id)}
                  onToggleUserChangeAck={() => toggleUserChangeAck(item.id)}
                  onViewCitation={(cit) =>
                    setActiveCitation({ title: item.label, text: cit })
                  }
                  onAddClearerCopy={() => router.push("/report?step=upload")}
                />
              ))}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════
              CONFIRMATION CHECKBOX CARD (Photo 1 & All Confirmed)
             ══════════════════════════════════════════════════ */}
          <div
            onClick={() => setDeclaredCorrect(!declaredCorrect)}
            className={`rounded-[14px] p-4.5 sm:p-5 mt-8 mb-5 flex items-start gap-3.5 shadow-xs cursor-pointer transition border ${
              declaredCorrect
                ? "bg-[#EEF8F3] border-[#0C8F72]"
                : "bg-white border-[#E7E4DD] hover:border-[#C9D1D7]"
            }`}
          >
            <div
              className={`w-[22px] h-[22px] rounded-[3px] flex items-center justify-center shrink-0 mt-0.5 transition ${
                declaredCorrect
                  ? "bg-[#0C8F72] text-white text-[16px] font-extrabold"
                  : "border-[1.5px] border-[#8A96A0] bg-white"
              }`}
            >
              {declaredCorrect && "✓"}
            </div>
            <p className="font-sans font-[700] text-[14.5px] leading-[22px] text-[#17242F] select-none">
              I&apos;ve checked each item against my documents and confirmed it&apos;s correct to the best of my knowledge. I understand my report is built on what I confirmed here.
              {changedItemsCount > 0 && (
                <span className="block mt-1 font-bold text-[#7A3CE3]">
                  This includes {changedItemsCount} {changedItemsCount === 1 ? "change" : "changes"}.
                </span>
              )}
            </p>
          </div>

          {/* ══════════════════════════════════════════════════
              BOTTOM CTA BUTTON
             ══════════════════════════════════════════════════ */}
          <div>
            <button
              type="button"
              disabled={!canBuild}
              onClick={() => {
                if (onContinue) {
                  onContinue();
                } else {
                  setIsDone(true);
                }
              }}
              className={`w-full h-[48px] rounded-[9px] font-sans font-[700] text-[16px] transition flex items-center justify-center ${
                canBuild
                  ? "bg-[#0EB28D] hover:bg-[#0C8F72] text-white shadow-[0px_18px_40px_-18px_rgba(5,43,84,0.12)] cursor-pointer"
                  : "bg-[#C9D1D7] text-white cursor-not-allowed opacity-90"
              }`}
            >
              {canBuild ? (
                "Build my report (PDF) →"
              ) : remainingCount > 0 ? (
                `Confirm ${remainingCount} more to build your report`
              ) : (
                "Check the confirmation box above to proceed"
              )}
            </button>
          </div>
        </div>
      </main>

      {/* ── Citation Modal ("See the words") ── */}
      {activeCitation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
          <div className="bg-white border border-[#E7E4DD] rounded-[14px] shadow-2xl max-w-[520px] w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E4DD]">
              <span className="font-sans font-[700] text-[12px] uppercase tracking-wider text-[#0C8F72]">
                Document Excerpt
              </span>
              <button
                type="button"
                onClick={() => setActiveCitation(null)}
                className="w-7 h-7 flex items-center justify-center rounded-full text-[#5A6B78] hover:text-[#062C55] hover:bg-[#F6F4EF]"
              >
                ✕
              </button>
            </div>
            <div className="mt-3.5 mb-2">
              <h4 className="font-serif font-[600] text-[18px] text-[#062C55] mb-2">
                {activeCitation.title}
              </h4>
              <div className="p-4 bg-[#FAF9F5] border border-[#E7E4DD] rounded-[8px] font-serif italic text-[14px] leading-[22px] text-[#17242F]">
                {activeCitation.text}
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveCitation(null)}
                className="px-5 h-[38px] rounded-[8px] bg-[#062C55] text-white font-[700] text-[13px] hover:bg-[#041D38]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Single Review Item Card Component with Photo 1, 2, 3 flows ──
function ItemCard({
  item,
  onToggleConfirm,
  onStartInlineEdit,
  onCancelInlineEdit,
  onSaveInline,
  onFixPlausibility,
  onUseDocumentValue,
  onKeepUserValue,
  onToggleUserChangeAck,
  onViewCitation,
  onAddClearerCopy,
}: {
  item: ReviewItem;
  onToggleConfirm: () => void;
  onStartInlineEdit: () => void;
  onCancelInlineEdit: () => void;
  onSaveInline: (val: string, force?: boolean) => void;
  onFixPlausibility: () => void;
  onUseDocumentValue: () => void;
  onKeepUserValue: () => void;
  onToggleUserChangeAck: () => void;
  onViewCitation: (citation: string) => void;
  onAddClearerCopy: () => void;
}) {
  const cfg = CA_FIELD_CONFIGS[item.id];

  // 1. PHOTO 1: Violet Changed Row with Required Acknowledgement (when user changed & not editing)
  if (item.userChanged && !item.isEditingInline) {
    return (
      <div className="rounded-[12px] border border-[#D8C6FA] bg-[#FAF7FD] border-l-4 border-l-[#8A50EE] p-4 sm:p-5 transition">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex-1 pr-2">
            <span className="font-sans font-normal text-[13px] text-[#5A6B78] block">
              {item.label}
            </span>

            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-sans font-bold text-[18px] text-[#062C55]">
                {item.value}
              </span>
              <span className="px-2 py-0.5 rounded-[4px] bg-[#F1EAFF] text-[#7A3CE3] text-[11px] font-bold">
                You changed this
              </span>
            </div>

            {/* Comparison line */}
            <div className="text-[12.5px] text-[#7A3CE3] font-semibold mt-1">
              Your letter: {item.originalDocumentValue || "$24,000"} → Your value: {item.value}
            </div>

            {/* Source and citation */}
            <div className="font-sans text-[12.5px] text-[#5A6B78] mt-1 flex flex-wrap items-center gap-1.5">
              <span>{item.source}</span>
              {item.citation && (
                <>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => onViewCitation(item.citation!)}
                    className="text-[#0C8F72] underline hover:opacity-80 font-medium cursor-pointer"
                  >
                    See the words
                  </button>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onStartInlineEdit}
            className="h-[40px] px-4 rounded-[10px] bg-white border border-[#D8D3C8] text-[#062C55] font-sans font-[700] text-[14px] hover:bg-[#F6F4EF] transition cursor-pointer self-start"
          >
            Change
          </button>
        </div>

        {/* Required Acknowledgement Checkbox Box (Photo 1) */}
        <div
          onClick={onToggleUserChangeAck}
          className="bg-white border border-[#E5DCF9] rounded-[8px] p-3.5 mt-3.5 flex items-start gap-3 cursor-pointer hover:border-[#D8C6FA] transition"
        >
          <input
            type="checkbox"
            checked={!!item.userChangeAck}
            onChange={onToggleUserChangeAck}
            onClick={(e) => e.stopPropagation()}
            className="w-[18px] h-[18px] mt-0.5 rounded-[3px] border-[1.5px] border-[#8A96A0] text-[#7A3CE3] focus:ring-[#7A3CE3] cursor-pointer"
          />
          <p className="font-sans text-[13px] leading-[19px] text-[#17242F]">
            <strong className="font-bold text-[#062C55]">Required.</strong> I confirm my change is correct. I understand my report will use my value instead of what my document says, and FairExit isn&apos;t responsible for results based on information I changed.
          </p>
        </div>
      </div>
    );
  }

  // 2. CONFIRMED ROW STATE (when confirmed & not editing)
  if (item.confirmed && !item.isEditingInline) {
    return (
      <div className="rounded-[12px] bg-[#EEF8F3] border border-[#C7E6D6] p-3.5 sm:px-5 sm:py-3.5 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
        {/* Left side: Icon, Label with colon, Value */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 shrink-0 text-[#0C8F72]"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3.5 8.5L6.5 11.5L12.5 4.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="font-sans font-[600] text-[15.5px] leading-[21px] text-[#062C55]">
              {item.label} :
            </span>
            {item.isOptional && (
              <span className="text-[12px] font-medium text-[#5A6B78] ml-1">
                Optional
              </span>
            )}
          </div>
          <div className="font-sans font-[600] text-[15px] leading-[24px] text-[#17242F] pl-[24px] mt-0.5">
            {item.value}
          </div>
        </div>

        {/* Right side: Underlined Change text link */}
        <button
          type="button"
          onClick={onStartInlineEdit}
          className="font-sans font-[700] text-[13px] leading-[20px] text-[#5A6B78] underline hover:text-[#062C55] transition cursor-pointer self-start sm:self-center ml-[24px] sm:ml-0 shrink-0"
        >
          Change
        </button>
      </div>
    );
  }

  // 3. NORMAL OR EDITING STATE (Photo 2: Upper side original row, downside option to change accordingly)
  return (
    <div className="rounded-[12px] border border-[#E7E4DD] bg-white hover:border-[#D0CBC0] transition p-4 sm:px-5 sm:py-4">
      {/* Upper side: Original Row (always stays visible) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 pr-2">
          <div className="flex items-center gap-2">
            <span className="font-sans font-normal text-[13px] text-[#5A6B78]">
              {item.label}
            </span>
            {item.isOptional && (
              <span className="px-1.5 py-0.5 rounded-[4px] bg-[#EEF1F3] text-[#5A6B78] text-[10px] font-bold tracking-wide">
                OPTIONAL
              </span>
            )}
          </div>
          <div className="font-sans font-bold text-[16px] text-[#062C55] mt-0.5">
            {item.value}
          </div>
          <div className="font-sans text-[12.5px] text-[#5A6B78] mt-1 flex flex-wrap items-center gap-1.5">
            <span>{item.source}</span>
            {item.citation && (
              <>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => onViewCitation(item.citation!)}
                  className="text-[#0C8F72] underline hover:opacity-80 font-medium cursor-pointer"
                >
                  See the words
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right side: Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          {!item.hasOnlyChange && (
            <button
              type="button"
              onClick={onToggleConfirm}
              className="h-[40px] px-5 rounded-[10px] font-sans font-[700] text-[14px] transition cursor-pointer flex items-center justify-center gap-1.5 bg-white border border-[#0C8F72] text-[#0C8F72] hover:bg-[#0C8F72]/5"
            >
              Yes
            </button>
          )}
          <button
            type="button"
            onClick={onStartInlineEdit}
            className="h-[40px] px-4 rounded-[10px] bg-white border border-[#D8D3C8] text-[#062C55] font-sans font-[700] text-[14px] hover:bg-[#F6F4EF] transition cursor-pointer"
          >
            Change
          </button>
        </div>
      </div>

      {/* Downside: Option to change accordingly (Photo 2) */}
      {item.isEditingInline && (
        <div className="mt-4 pt-3.5 border-t border-[#F0EFEA]">
          <ItemCardInlineEditor
            item={item}
            fieldConfig={cfg}
            onCancel={onCancelInlineEdit}
            onSave={onSaveInline}
            onFixPlausibility={onFixPlausibility}
            onUseDocumentValue={onUseDocumentValue}
            onKeepUserValue={onKeepUserValue}
            onAddClearerCopy={onAddClearerCopy}
          />
        </div>
      )}
    </div>
  );
}

// ── Inline Editor Sub-component (Clean local state, Photo 2 layout) ──
function ItemCardInlineEditor({
  item,
  fieldConfig,
  onCancel,
  onSave,
  onFixPlausibility,
  onUseDocumentValue,
  onKeepUserValue,
  onAddClearerCopy,
}: {
  item: ReviewItem;
  fieldConfig?: CAFieldConfig;
  onCancel: () => void;
  onSave: (val: string, force?: boolean) => void;
  onFixPlausibility: () => void;
  onUseDocumentValue: () => void;
  onKeepUserValue: () => void;
  onAddClearerCopy: () => void;
}) {
  const type = fieldConfig?.type || "text";
  const [localInput, setLocalInput] = useState(() => {
    if (item.inlineInputValue !== undefined) return item.inlineInputValue;
    if (type === "dollar") {
      return item.value.replace(/[^0-9]/g, "");
    }
    if (type === "date") {
      return parseDateToISO(item.value) || item.value;
    }
    return item.value;
  });

  const label =
    fieldConfig?.label ||
    (type === "dollar"
      ? "Amount in dollars"
      : type === "date"
      ? "Select date"
      : type === "select"
      ? "Choose one"
      : "Edit value");

  const displayVal =
    type === "dollar"
      ? `$${Number(localInput.replace(/[^0-9]/g, "") || 0).toLocaleString()}`
      : type === "date" && localInput.includes("-")
      ? formatDateFromISO(localInput)
      : localInput;

  return (
    <div className="bg-[#FAF9F5] border border-[#E7E4DD] rounded-[10px] p-4 sm:p-5 space-y-3.5 animate-in fade-in duration-150">
      {/* Top header */}
      <div className="flex items-center justify-between">
        <span className="font-sans font-bold text-[14px] text-[#062C55]">
          {label}
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="text-[12.5px] font-semibold text-[#5A6B78] hover:text-[#062C55] cursor-pointer"
        >
          ✕ Cancel
        </button>
      </div>

      {/* Input controls based on field type */}
      <div>
        {type === "select" ? (
          <div className="relative w-full sm:w-[320px]">
            <select
              value={localInput}
              onChange={(e) => setLocalInput(e.target.value)}
              className="w-full h-[44px] px-3.5 pr-8 bg-white border-2 border-[#0EB28D] ring-2 ring-[#0EB28D]/20 rounded-[8px] text-[15px] font-[600] text-[#062C55] focus:outline-none appearance-none cursor-pointer"
              autoFocus
            >
              {fieldConfig?.options?.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#062C55]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        ) : type === "date" ? (
          <input
            type="date"
            value={localInput.includes("-") ? localInput : parseDateToISO(localInput)}
            onChange={(e) => setLocalInput(e.target.value)}
            className="w-full sm:w-[240px] h-[44px] px-3.5 bg-white border-2 border-[#0EB28D] ring-2 ring-[#0EB28D]/20 rounded-[8px] text-[15px] font-[600] text-[#062C55] focus:outline-none cursor-pointer"
            autoFocus
          />
        ) : type === "dollar" ? (
          <div className="relative w-full sm:w-[240px]">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5A6B78] font-bold text-[16px] pointer-events-none">
              $
            </span>
            <input
              type="text"
              value={localInput.replace(/[^0-9]/g, "")}
              onChange={(e) => setLocalInput(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder={fieldConfig?.placeholder || "24000"}
              className="w-full h-[44px] pl-8 pr-3.5 bg-white border-2 border-[#0EB28D] ring-2 ring-[#0EB28D]/20 rounded-[8px] text-[16px] font-[600] text-[#062C55] focus:outline-none"
              autoFocus
            />
          </div>
        ) : (
          <input
            type="text"
            value={localInput}
            onChange={(e) => setLocalInput(e.target.value)}
            placeholder={fieldConfig?.placeholder || ""}
            className="w-full sm:w-[280px] h-[44px] px-3.5 bg-white border-2 border-[#0EB28D] ring-2 ring-[#0EB28D]/20 rounded-[8px] text-[15px] font-[600] text-[#062C55] focus:outline-none"
            autoFocus
          />
        )}
      </div>

      {/* Buttons: Save, Not in my documents (if document item), Not sure */}
      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <button
          type="button"
          onClick={() => onSave(localInput, false)}
          className="h-[40px] px-5 rounded-[8px] bg-[#062C55] hover:bg-[#041D38] text-white font-[700] text-[14px] transition cursor-pointer"
        >
          Save
        </button>
        {item.originalDocumentValue && (
          <button
            type="button"
            onClick={() => {
              setLocalInput("Not in my documents");
              onSave("Not in my documents", true);
            }}
            className="h-[40px] px-4 rounded-[8px] bg-white border border-[#D8D3C8] text-[#062C55] font-[700] text-[14px] hover:bg-[#F6F4EF] transition cursor-pointer"
          >
            Not in my documents
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setLocalInput("Not sure");
            onSave("Not sure", true);
          }}
          className="h-[40px] px-4 rounded-[8px] bg-white border border-[#D8D3C8] text-[#062C55] font-[700] text-[14px] hover:bg-[#F6F4EF] transition cursor-pointer"
        >
          Not sure
        </button>
      </div>

      {/* PHOTO 3: Plausibility Alert Box */}
      {item.showPlausibilityAlert && (
        <div className="bg-[#FAF9F5] border border-[#E7E4DD] border-l-4 border-l-[#B07A00] rounded-[10px] p-4 mt-3 animate-in fade-in duration-200">
          <p className="font-sans text-[13.5px] text-[#062C55] font-semibold mb-3">
            That&apos;s very different from what your letter says ({item.originalDocumentValue || "$24,000"}). Is {displayVal} right?
          </p>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onSave(localInput, true)}
              className="h-[36px] px-4 rounded-[7px] bg-[#062C55] hover:bg-[#041D38] text-white font-[700] text-[13px] transition cursor-pointer"
            >
              Yes, use {displayVal}
            </button>
            <button
              type="button"
              onClick={() => {
                onFixPlausibility();
                setLocalInput("");
              }}
              className="h-[36px] px-4 rounded-[7px] bg-white border border-[#D8D3C8] text-[#062C55] font-[700] text-[13px] hover:bg-[#F6F4EF] transition cursor-pointer"
            >
              Fix it
            </button>
          </div>
        </div>
      )}

      {/* Re-reading loader state (~1.2s) */}
      {item.isReReading && (
        <div className="p-3.5 bg-white border border-[#E7E4DD] rounded-[8px] flex items-center gap-3 mt-3">
          <svg
            className="animate-spin h-5 w-5 text-[#0EB28D]"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          <span className="font-sans text-[13.5px] font-[600] text-[#062C55]">
            Looking again at your document…
          </span>
        </div>
      )}

      {/* PHOTO 2: Second Look Box */}
      {item.showSecondLook && (
        <div className="bg-[#FAF9F5] border border-[#E7E4DD] border-l-4 border-l-[#B07A00] rounded-[10px] p-4 mt-3 animate-in fade-in duration-200">
          <p className="font-sans text-[13.5px] text-[#062C55] mb-3">
            We looked again. Your letter{item.citation ? ", paragraph 2, says:" : `, says: ${item.originalDocumentValue}`}
            {item.citation && (
              <em className="block font-serif italic font-medium mt-1 text-[#17242F]">
                &ldquo;{item.citation.replace(/^"|"$/g, "")}&rdquo;
              </em>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onUseDocumentValue}
              className="h-[36px] px-4 rounded-[7px] bg-[#062C55] hover:bg-[#041D38] text-white font-[700] text-[13px] transition cursor-pointer"
            >
              Use {item.originalDocumentValue || "$24,000"}
            </button>
            <button
              type="button"
              onClick={onKeepUserValue}
              className="h-[36px] px-4 rounded-[7px] bg-white border border-[#D8D3C8] text-[#062C55] font-[700] text-[13px] hover:bg-[#F6F4EF] transition cursor-pointer"
            >
              Keep {displayVal}
            </button>
            <button
              type="button"
              onClick={onAddClearerCopy}
              className="font-sans text-[13px] font-[700] text-[#0C8F72] underline hover:opacity-80 ml-1 cursor-pointer"
            >
              Add a clearer copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
