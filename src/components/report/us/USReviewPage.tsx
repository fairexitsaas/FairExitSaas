"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getReportInputs, ReportInputs } from "@/lib/report-storage";
import PaidReportReadyPage from "@/components/report/PaidReportReadyPage";

interface USReviewPageProps {
  caseId?: string | null;
  cs?: { id?: string; [key: string]: unknown } | null;
  onContinue?: () => void;
}

interface USReviewItem {
  id: string;
  label: string;
  value: string;
  originalDocumentValue?: string;
  source: string;
  citation?: string;
  warningNote?: string;
  hasOnlyChange?: boolean;
  confirmed?: boolean;
  userChanged?: boolean;
  userChangeAck?: boolean;
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

export interface USFieldConfig {
  type: "select" | "date" | "dollar" | "number" | "text";
  label: string;
  options?: string[];
  placeholder?: string;
  formatSave?: (val: string) => string;
}

export const US_FIELD_CONFIGS: Record<string, USFieldConfig> = {
  state: {
    type: "select",
    label: "Choose state",
    options: [
      "California",
      "New York",
      "Texas",
      "Washington",
      "Illinois",
      "Florida",
      "Massachusetts",
      "Pennsylvania",
      "Ohio",
      "Georgia",
      "North Carolina",
      "Michigan",
      "New Jersey",
      "Virginia",
      "Colorado",
      "Arizona",
      "Oregon",
      "Minnesota",
      "Wisconsin",
      "Maryland",
      "Missouri",
      "Indiana",
      "Tennessee",
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
    placeholder: "e.g. 9",
    formatSave: (v) => {
      const num = v.replace(/[^0-9.]/g, "");
      return num ? `${num} years` : v;
    },
  },
  salary: {
    type: "dollar",
    label: "Pay per year",
    placeholder: "128000",
    formatSave: (v) => {
      const num = Number(v.replace(/[^0-9]/g, ""));
      return num ? `${num.toLocaleString()}` : v;
    },
  },
  offerMoney: {
    type: "dollar",
    label: "Amount in dollars",
    placeholder: "22154",
    formatSave: (v) => {
      const num = Number(v.replace(/[^0-9]/g, ""));
      return num ? `${num.toLocaleString()}` : v;
    },
  },
  signRelease: {
    type: "select",
    label: "Choose one",
    options: ["Yes", "No", "Unclear"],
  },
  daysToDecide: {
    type: "number",
    label: "Days to decide",
    placeholder: "e.g. 21",
    formatSave: (v) => {
      const num = v.replace(/[^0-9]/g, "");
      return num ? `${num} days` : v;
    },
  },
  revocationPeriod: {
    type: "select",
    label: "Choose one",
    options: ["Not mentioned", "7 days", "None"],
  },
  seeAttorney: {
    type: "select",
    label: "Choose one",
    options: ["Yes", "No", "Not mentioned"],
  },
  agesTitlesList: {
    type: "select",
    label: "Choose one",
    options: ["Missing", "Provided", "Not applicable"],
  },
  nonCompete: {
    type: "select",
    label: "Choose one",
    options: ["No", "Yes", "Not mentioned"],
  },
  lastDayAgreement: {
    type: "date",
    label: "Select date",
    placeholder: "Oct 31, 2026",
  },
  advanceNotice: {
    type: "text",
    label: "Advance notice you got",
    placeholder: "e.g. 12 days or None, or the same day",
  },
};

export default function USReviewPage({
  caseId,
  cs,
  onContinue,
}: USReviewPageProps) {
  const router = useRouter();
  const [isDone, setIsDone] = useState(false);
  const [data] = useState<ReportInputs>(() => getReportInputs());
  const [explainQuestions, setExplainQuestions] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ══════════════════════════════════════════════════════════
  // Section 1: Conflict resolution ("Check these first")
  // ══════════════════════════════════════════════════════════
  const [noticeConflictChoice, setNoticeConflictChoice] = useState<"agreement" | "told" | "custom" | null>(null);
  const [showNoticeConflictCustom, setShowNoticeConflictCustom] = useState(false);
  const [noticeConflictCustomVal, setNoticeConflictCustomVal] = useState("");

  // ══════════════════════════════════════════════════════════
  // Section 2: Missing numbers ("We need one more answer")
  // ══════════════════════════════════════════════════════════
  const [lastDayWork, setLastDayWork] = useState<string>("");
  const [lastDayWorkSaved, setLastDayWorkSaved] = useState<boolean>(false);

  // Modal for "See the words" citation preview
  const [activeCitation, setActiveCitation] = useState<{ title: string; text: string } | null>(null);

  // Overall declaration checkbox
  const [declaredCorrect, setDeclaredCorrect] = useState(false);

  // ══════════════════════════════════════════════════════════
  // Review Items (13 items total matching US Figma spec)
  // ══════════════════════════════════════════════════════════
  const [items, setItems] = useState<USReviewItem[]>([
    // Section 3: About you (4 items)
    {
      id: "state",
      label: "State",
      value: data.state || "California",
      originalDocumentValue: data.state || "California",
      source: "From your answers",
      confirmed: false,
    },
    {
      id: "age",
      label: "Age",
      value: String(data.age || 52),
      originalDocumentValue: String(data.age || 52),
      source: "From your answers",
      confirmed: false,
    },
    {
      id: "years",
      label: "Years on the job",
      value: `${data.years || 9} years`,
      originalDocumentValue: `${data.years || 9} years`,
      source: "From your answers",
      confirmed: false,
    },
    {
      id: "salary",
      label: "Pay per year",
      value: `$${Number(data.salary || 128000).toLocaleString()}`,
      originalDocumentValue: `$${Number(data.salary || 128000).toLocaleString()}`,
      source: "From your answers",
      confirmed: false,
    },

    // Section 4: Your agreement (from your documents) - 8 items
    {
      id: "offerMoney",
      label: "Money offered",
      value: "$22,154 (about 9 weeks)",
      originalDocumentValue: "$22,154 (about 9 weeks)",
      source: "Your agreement, section 2",
      citation: `"The Company will provide you a severance payment of $22,154, equivalent to approximately 9 weeks of base salary, subject to applicable withholdings and upon execution of this Agreement."`,
      confirmed: false,
    },
    {
      id: "signRelease",
      label: "You must sign a release",
      value: "Yes",
      originalDocumentValue: "Yes",
      source: "Your agreement, section 4",
      citation: `"Payment is contingent upon the Employee delivering an executed general release of all claims against the Company."`,
      confirmed: false,
    },
    {
      id: "daysToDecide",
      label: "Days to decide",
      value: "14 days",
      originalDocumentValue: "14 days",
      source: "Your agreement, section 6",
      citation: `"You have fourteen (14) days to consider this Agreement."`,
      confirmed: false,
    },
    {
      id: "revocationPeriod",
      label: "7 days to change your mind after signing",
      value: "Not mentioned",
      originalDocumentValue: "Not mentioned",
      source: "Your agreement, the revocation section",
      citation: `"No revocation period is specified in this agreement."`,
      confirmed: false,
    },
    {
      id: "seeAttorney",
      label: "Tells you to see an attorney",
      value: "No",
      originalDocumentValue: "No",
      source: "Your agreement, the “consult an attorney” line",
      citation: `"This agreement does not contain language advising consultation with legal counsel prior to execution."`,
      confirmed: false,
    },
    {
      id: "agesTitlesList",
      label: "List of ages and job titles",
      value: "Missing",
      originalDocumentValue: "Missing",
      source: "The list attached to your agreement (or its absence)",
      citation: `"No OWBPA disclosure attachment or Exhibit containing decisional unit ages and job titles was found attached."`,
      confirmed: false,
    },
    {
      id: "nonCompete",
      label: "Non-compete",
      value: "No",
      originalDocumentValue: "No",
      source: "Your agreement (all pages)",
      citation: `"The agreement contains confidentiality and non-solicitation covenants, but no post-employment non-compete restriction."`,
      confirmed: false,
    },
    {
      id: "lastDayAgreement",
      label: "Last day of work",
      value: "Not in your agreement",
      originalDocumentValue: "Not in your agreement",
      source: "Your agreement",
      warningNote: "Your agreement doesn't say. Answer the question at the top.",
      hasOnlyChange: true,
      confirmed: false,
    },

    // Section 5: The layoff (from your documents) - 1 item
    {
      id: "advanceNotice",
      label: "Advance notice you got",
      value: "12 days",
      originalDocumentValue: "12 days",
      source: "Your agreement, the separation date and notice section",
      citation: `"This Agreement confirms you received 12 days' notice before your layoff date"`,
      warningNote: "This doesn't match your answer. Choose one at the top.",
      confirmed: false,
    },
  ]);

  // Confirmation counting
  const totalCount = 13;
  const confirmedItemsCount = items.filter((i) => {
    if (i.userChanged) {
      return i.userChangeAck === true;
    }
    return i.confirmed === true;
  }).length;

  const conflictConfirmed = noticeConflictChoice !== null ? 1 : 0;
  const missingLastDayConfirmed = lastDayWorkSaved ? 1 : 0;

  // An item counts towards 13
  const confirmedCount = Math.min(
    totalCount,
    confirmedItemsCount +
      (conflictConfirmed > 0 && !items.find((i) => i.id === "advanceNotice")?.confirmed ? 1 : 0) +
      (missingLastDayConfirmed > 0 && !items.find((i) => i.id === "lastDayAgreement")?.confirmed ? 1 : 0)
  );
  const remainingCount = Math.max(0, totalCount - confirmedCount);
  const isAllConfirmed = remainingCount === 0;
  const canBuild = isAllConfirmed && declaredCorrect;
  const changedItemsCount = items.filter((i) => i.userChanged).length;

  // ── Handlers ──
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
          item.id === "lastDayAgreement" && (item.value === "Not in your agreement" || !lastDayWork)
            ? "Oct 31, 2026"
            : item.value,
        warningNote: undefined,
        confirmed: true,
        userChangeAck: item.userChanged ? true : item.userChangeAck,
      }))
    );
    setLastDayWork((prev) => prev || "Oct 31, 2026");
    setLastDayWorkSaved(true);
    setNoticeConflictChoice("agreement");
    setDeclaredCorrect(true);
  };

  const handleChooseNoticeConflict = (choice: "agreement" | "told" | "custom", customVal?: string) => {
    setNoticeConflictChoice(choice);
    setShowNoticeConflictCustom(false);
    let chosenVal = "12 days";
    if (choice === "told") {
      chosenVal = "None, or the same day";
    } else if (choice === "custom" && customVal) {
      chosenVal = customVal;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.id === "advanceNotice"
          ? { ...i, value: chosenVal, warningNote: undefined, confirmed: true }
          : i
      )
    );
  };

  const handleSaveLastDay = (dayStr: string) => {
    const finalVal = dayStr.trim() ? dayStr : "Oct 31, 2026";
    setLastDayWork(finalVal);
    setLastDayWorkSaved(true);
    setItems((prev) =>
      prev.map((i) =>
        i.id === "lastDayAgreement"
          ? { ...i, value: finalVal, warningNote: undefined, confirmed: true }
          : i
      )
    );
  };

  const handleUndoLastDay = () => {
    setLastDayWorkSaved(false);
    setItems((prev) =>
      prev.map((i) =>
        i.id === "lastDayAgreement"
          ? { ...i, confirmed: false, warningNote: "Your agreement doesn't say. Answer the question at the top." }
          : i
      )
    );
  };

    const startInlineEdit = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const cfg = US_FIELD_CONFIGS[id];
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

    const handleSaveInline = (id: string, inputVal: string, force = false) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    const cfg = US_FIELD_CONFIGS[id];
    let formattedVal = inputVal.trim();
    if (cfg?.type === "date" && formattedVal.includes("-")) {
      formattedVal = formatDateFromISO(formattedVal);
    } else if (cfg?.formatSave) {
      formattedVal = cfg.formatSave(formattedVal);
    }

    // Photo 3 Plausibility check: Far from original document value (only for dollar fields)
    if (cfg?.type === "dollar") {
      const cleanNum = Number(inputVal.replace(/[^0-9]/g, ""));
      const origNum = Number(item.originalDocumentValue?.replace(/[^0-9]/g, "") || 0);
      if (!force && origNum > 0 && cleanNum > 0 && (cleanNum < origNum * 0.4 || cleanNum > origNum * 2.5)) {
        setItems((prev) =>
          prev.map((i) => (i.id === id ? { ...i, inlineInputValue: inputVal, showPlausibilityAlert: true } : i))
        );
        return;
      }
    }

    const isDocItem = !!item.originalDocumentValue;
    const isChangedFromDoc = isDocItem && formattedVal !== item.originalDocumentValue;

    if (isChangedFromDoc) {
      // Photo 2: Re-reading state ("Looking again at your document…") ~1.2s
      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? { ...i, inlineInputValue: formattedVal, showPlausibilityAlert: false, isReReading: true }
            : i
        )
      );

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
                warningNote: undefined,
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

    const handleKeepUserValue = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const cfg = US_FIELD_CONFIGS[id];
        let formattedVal = item.inlineInputValue || item.value;
        if (cfg?.type === "date" && formattedVal.includes("-")) {
          formattedVal = formatDateFromISO(formattedVal);
        } else if (cfg?.formatSave) {
          formattedVal = cfg.formatSave(formattedVal);
        }

        return {
          ...item,
          value: formattedVal,
          warningNote: undefined,
          userChanged: true,
          userChangeAck: false, // Requires acknowledgement checkbox (Photo 1)
          confirmed: false,
          isEditingInline: false,
          showSecondLook: false,
        };
      })
    );
  };

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
      <header className="w-full bg-[#F6F4EF]/92 backdrop-blur-md border-b border-[#E7E4DD] px-4 lg:px-[40px] h-[51px] sm:h-[57px] flex items-center sticky top-0 z-40">
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

      {/* ── Stepper Navigation (US Steps) ── */}
      <div className="w-full max-w-[720px] mx-auto px-4 pt-6 pb-2">
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
            { label: "Situation", done: true },
            { label: "The layoff", done: true },
            { label: "The papers", done: true },
            { label: "Key question", done: true },
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
                      : "bg-[#062C55] text-white border border-[#062C55]"
                  }`}
                >
                  {st.done ? "✓" : "✦"}
                </div>
              )}
              <div className="mt-1.5 text-center">
                {st.active ? (
                  <>
                    <span className="hidden sm:inline font-sans font-[800] text-[11px] leading-[17px] text-[#062C55]">
                      Your results
                    </span>
                    <span className="sm:hidden block font-sans font-[800] text-[10.5px] leading-[14px] text-[#062C55]">
                      Your<br />results
                    </span>
                  </>
                ) : (
                  <span className="font-sans font-[600] text-[11px] leading-[17px] text-[#0C8F72]">
                    {st.label}
                  </span>
                )}
              </div>
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

      {/* ── Main Single-Column Card (720px) ── */}
      <main className="w-full max-w-[720px] mx-auto px-4 mt-4">
        <div className="bg-white border border-[#E7E4DD] rounded-[12px] shadow-[0px_18px_40px_-18px_rgba(5,43,84,0.12)] p-5 sm:p-7 md:p-8">
          {/* Pill Tag */}
          <div className="inline-flex items-center px-3.5 py-1 bg-white border border-[#E7E4DD] rounded-[6px] text-[12px] font-[700] text-[#062C55] mb-4">
            Your report · check
          </div>

          {/* Heading */}
          <h1 className="font-serif font-[500] text-[24px] sm:text-[27px] leading-[1.15] text-[#062C55] tracking-[-0.5px] mb-3">
            Check everything your report will use
          </h1>

          {/* Lead Paragraph */}
          <p className="font-sans font-normal text-[15px] sm:text-[15.5px] leading-[24px] text-[#17242F] mb-6">
            We&apos;ve read your separation agreement and contract. Before we build your report, check that everything we found is right. Your report is built only on what you confirm here. About 2 minutes.
          </p>

          {/* Progress Card */}
          {isAllConfirmed ? (
            <div className="w-full bg-[#EEF8F3] border border-[#C7E6D6] rounded-[12px] shadow-[0px_18px_40px_-18px_rgba(5,43,84,0.12)] p-4 sm:px-5 sm:py-3.5 mb-8">
              <div className="flex items-center justify-between">
                <span className="font-sans font-[700] text-[15px] text-[#0C8F72]">
                  All set
                </span>
                <span className="font-sans font-[400] text-[13px] text-[#5A6B78]">
                  13 of 13 confirmed
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
              <div className="w-full h-[4px] bg-[#EEF1F3] rounded-[2px] mt-2.5 overflow-hidden">
                <div
                  className="h-full bg-[#0EB28D] rounded-[2px] transition-all duration-300"
                  style={{ width: `${(confirmedCount / totalCount) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              SECTION 1: Check these first (Conflict Card)
              (Hidden in All Confirmed state, matches Photo 4)
             ══════════════════════════════════════════════════ */}
          {!isAllConfirmed && noticeConflictChoice === null && (
            <div className="mb-8">
              <div className="flex flex-wrap items-baseline gap-2 mb-3">
                <h2 className="font-sans font-[700] text-[17px] text-[#062C55]">
                  Check these first
                </h2>
                <span className="font-sans font-normal text-[12.5px] text-[#5A6B78]">
                  your answers and your agreement don&apos;t match
                </span>
              </div>

              {/* Conflict Card: Advance notice you got */}
              <div className="bg-white border border-[#E7E4DD] border-l-4 border-l-[#B07A00] rounded-[14px] p-5 sm:p-6 shadow-xs">
                <span className="font-sans font-[700] text-[12px] tracking-[0.5px] text-[#5A6B78] uppercase block mb-1">
                  ADVANCE NOTICE YOU GOT
                </span>
                <h3 className="font-sans font-[700] text-[16px] leading-[24px] text-[#062C55] mb-3.5">
                  Which is right?
                </h3>

                {/* Two Comparison Tiles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Tile 1: Your agreement says */}
                  <div
                    className={`rounded-[12px] p-4 flex flex-col justify-between transition border ${
                      noticeConflictChoice === "agreement"
                        ? "bg-[#EEF8F3] border-[#0C8F72] ring-1 ring-[#0C8F72]"
                        : "bg-white border-[#D9DEE2]"
                    }`}
                  >
                    <div>
                      <span className="font-sans text-[12.5px] font-[600] text-[#5A6B78] block">
                        Your agreement says
                      </span>
                      <span className="font-sans font-bold text-[18px] text-[#062C55] block mt-0.5">
                        12 days
                      </span>
                      <p className="font-serif italic text-[14.5px] text-[#17242F] mt-2 mb-3 leading-[20px]">
                        &ldquo;This Agreement confirms you received 12 days&apos; notice before your layoff date&rdquo;
                      </p>
                      <span className="font-sans text-[12px] text-[#5A6B78] block">
                        Your agreement, the separation date and notice section
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleChooseNoticeConflict("agreement")}
                      className={`w-full h-[38px] mt-4 rounded-[8px] font-sans font-[700] text-[13px] transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        noticeConflictChoice === "agreement"
                          ? "bg-[#0C8F72] text-white"
                          : "border border-[#0C8F72] text-[#0C8F72] bg-white hover:bg-[#0C8F72]/5"
                      }`}
                    >
                      {noticeConflictChoice === "agreement" ? "✓ Selected" : "Use this"}
                    </button>
                  </div>

                  {/* Tile 2: You told us */}
                  <div
                    className={`rounded-[12px] p-4 flex flex-col justify-between transition border ${
                      noticeConflictChoice === "told"
                        ? "bg-[#EEF8F3] border-[#0C8F72] ring-1 ring-[#0C8F72]"
                        : "bg-white border-[#D9DEE2]"
                    }`}
                  >
                    <div>
                      <span className="font-sans text-[12.5px] font-[600] text-[#5A6B78] block">
                        You told us
                      </span>
                      <span className="font-sans font-bold text-[18px] text-[#062C55] block mt-0.5">
                        None, or the same day
                      </span>
                      <p className="font-sans text-[12.5px] text-[#5A6B78] mt-2 mb-3 leading-[18px]">
                        Based on your initial intake answers.
                      </p>
                      <span className="font-sans text-[12px] text-[#5A6B78] block">
                        From your answers
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleChooseNoticeConflict("told")}
                      className={`w-full h-[38px] mt-4 rounded-[8px] font-sans font-[700] text-[13px] transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        noticeConflictChoice === "told"
                          ? "bg-[#0C8F72] text-white"
                          : "border border-[#0C8F72] text-[#0C8F72] bg-white hover:bg-[#0C8F72]/5"
                      }`}
                    >
                      {noticeConflictChoice === "told" ? "✓ Selected" : "Use this"}
                    </button>
                  </div>
                </div>

                {/* "Something else" */}
                <div className="mt-3.5">
                  {!showNoticeConflictCustom ? (
                    <button
                      type="button"
                      onClick={() => setShowNoticeConflictCustom(true)}
                      className="font-sans text-[13.5px] font-[700] text-[#0C8F72] underline hover:opacity-80 cursor-pointer"
                    >
                      Something else
                    </button>
                  ) : (
                    <div className="p-3.5 bg-[#FAF9F5] border border-[#E7E4DD] rounded-[10px] mt-2 space-y-3">
                      <label className="block text-[13px] font-[700] text-[#062C55]">
                        Enter correct advance notice days:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. 14 days"
                          value={noticeConflictCustomVal}
                          onChange={(e) => setNoticeConflictCustomVal(e.target.value)}
                          className="h-[38px] px-3 rounded-[8px] border border-[#D8D3C8] bg-white text-[14px] text-[#062C55] w-[180px]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (noticeConflictCustomVal) {
                              handleChooseNoticeConflict("custom", noticeConflictCustomVal);
                            }
                          }}
                          className="h-[38px] px-4 rounded-[8px] bg-[#062C55] text-white text-[13px] font-bold"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowNoticeConflictCustom(false)}
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
          )}

          {/* ══════════════════════════════════════════════════
              SECTION 2: We need one more answer
              (Collapses to confirmed green row with Undo in All Confirmed state)
             ══════════════════════════════════════════════════ */}
          <div className="mb-8">
            <h2 className="font-sans font-[700] text-[17px] text-[#062C55] mb-3">
              We need one more answer
            </h2>

            {lastDayWorkSaved ? (
              /* Photo 4 Collapsed Green Confirmed Row */
              <div className="rounded-[14px] bg-[#EEF8F3] border border-[#C7E6D6] border-l-4 border-l-[#0EB28D] p-3.5 sm:px-4 sm:py-3 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-[20px] h-[20px] rounded-full bg-[#0C8F72] text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                    ✓
                  </div>
                  <div className="font-sans text-[14px]">
                    <span className="font-bold text-[#062C55]">Last day of work</span>{" "}
                    <span className="text-[#17242F] ml-1">{lastDayWork || "Oct 31, 2026"}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleUndoLastDay}
                  className="font-sans font-[700] text-[13.5px] text-[#0C8F72] underline hover:opacity-80 cursor-pointer"
                >
                  Undo
                </button>
              </div>
            ) : (
              <div className="bg-[#F4F8FC] border border-[#D3E1F0] border-l-4 border-l-[#2F6FB0] rounded-[14px] p-5 sm:p-6 shadow-xs">
                <p className="font-sans font-[700] text-[15.5px] leading-[24px] text-[#062C55] mb-1">
                  What was (or will be) your last day of work?
                </p>
                <p className="font-sans text-[12.5px] leading-[19px] text-[#5A6B78] mb-3.5">
                  Your agreement doesn&apos;t say. Your deadlines are counted from this day.
                </p>

                <div className="flex flex-wrap items-center gap-2.5">
                  <input
                    type="text"
                    placeholder="e.g. Oct 31, 2026"
                    value={lastDayWork}
                    onChange={(e) => {
                      setLastDayWork(e.target.value);
                    }}
                    className="w-full sm:w-[240px] h-[44px] px-3.5 bg-white border border-[#CDD3D8] rounded-[10px] text-[15px] font-[600] text-[#062C55] placeholder:text-[#8A96A0] focus:outline-none focus:ring-1 focus:ring-[#2F6FB0]"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveLastDay(lastDayWork)}
                    className="h-[44px] px-5 rounded-[9px] font-sans font-[700] text-[14px] bg-[#2F6FB0] hover:bg-[#25588C] text-white transition cursor-pointer flex items-center justify-center"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveLastDay("Not sure")}
                    className="h-[44px] px-4 rounded-[10px] bg-white border border-[#CDD3D8] text-[#062C55] font-sans font-[700] text-[14px] hover:bg-[#F6F4EF] transition cursor-pointer"
                  >
                    Not sure
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════
              SECTION 3: About you (you told us) - 4 items
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
              {items.slice(0, 4).map((item) => (
                <USItemCard
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
              SECTION 4: Your agreement (from your documents) - 8 items
             ══════════════════════════════════════════════════ */}
          <div className="mb-8">
            <div className="flex items-baseline gap-2 mb-3">
              <h2 className="font-sans font-[700] text-[17px] text-[#062C55]">
                Your agreement
              </h2>
              <span className="font-sans font-normal text-[12.5px] text-[#5A6B78]">
                from your documents
              </span>
            </div>

            <div className="space-y-2.5">
              {items.slice(4, 12).map((item) => (
                <USItemCard
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
              SECTION 5: The layoff (from your documents) - 1 item
             ══════════════════════════════════════════════════ */}
          <div className="mb-8">
            <div className="flex items-baseline gap-2 mb-3">
              <h2 className="font-sans font-[700] text-[17px] text-[#062C55]">
                The layoff
              </h2>
              <span className="font-sans font-normal text-[12.5px] text-[#5A6B78]">
                from your documents
              </span>
            </div>

            <div className="space-y-2.5">
              {items.slice(12).map((item) => (
                <USItemCard
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
              CONFIRMATION CHECKBOX CARD
              (Pre-ticked in all confirmed, adds 'This includes X changes')
             ══════════════════════════════════════════════════ */}
          <div
            onClick={() => setDeclaredCorrect(!declaredCorrect)}
            className={`rounded-[12px] p-4.5 sm:p-5 mt-8 mb-5 flex items-start gap-3.5 shadow-xs cursor-pointer transition border ${
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
            <p className="font-sans font-[700] text-[14px] leading-[21px] text-[#062C55] select-none">
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
              className={`w-full h-[48px] rounded-[9px] font-sans font-[700] text-[16px] leading-[22px] transition flex items-center justify-center ${
                canBuild
                  ? "bg-[#0EB28D] hover:bg-[#0C8F72] text-white shadow-[0px_18px_40px_-18px_rgba(5,43,84,0.12)] cursor-pointer"
                  : "bg-[#D6DCDA] text-[#33424E] cursor-not-allowed opacity-90"
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

// ── US Single Review Item Card Component ──
function USItemCard({
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
  item: USReviewItem;
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
  const cfg = US_FIELD_CONFIGS[item.id];

  // ══════════════════════════════════════════════════════════
  // PHOTO 1: Violet Changed Row with Required Acknowledgement (when user changed & not editing)
  // ══════════════════════════════════════════════════════════
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
              Your agreement: {item.originalDocumentValue || "14 days"} → Your value: {item.value}
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
            className="w-[88px] h-[40px] rounded-[10px] bg-white border border-[#D8D3C8] text-[#062C55] font-sans font-[700] text-[14px] hover:bg-[#F6F4EF] transition cursor-pointer self-start flex items-center justify-center"
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

  // ══════════════════════════════════════════════════════════
  // CONFIRMED ROW STATE (Photos 4 & 5: One line collapsed with tick)
  // ══════════════════════════════════════════════════════════
  if (item.confirmed && !item.isEditingInline) {
    return (
      <div className="rounded-[12px] bg-[#EEF8F3] border border-[#C7E6D6] p-3 sm:px-4 sm:py-2.5 transition">
        <div className="w-full">
          <div className="flex items-center justify-between">
            <span className="font-sans font-[600] text-[14.5px] text-[#062C55]">
              {item.label}:
            </span>
            <div className="flex items-center gap-1.5">
              <div className="w-[18px] h-[18px] rounded-full bg-[#0C8F72] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                ✓
              </div>
              <span className="font-sans font-[700] text-[14.5px] text-[#062C55]">
                {item.value}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="font-sans text-[12px] text-[#5A6B78]">
              {item.source}
            </span>
            <button
              type="button"
              onClick={onStartInlineEdit}
              className="font-sans font-[700] text-[13px] text-[#5A6B78] underline hover:text-[#062C55] cursor-pointer"
            >
              Change
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  // NORMAL OR EDITING STATE (Photo 2: Upper side original row, downside option to change accordingly)
  // ══════════════════════════════════════════════════════════
  return (
    <div className="rounded-[12px] border border-[#E7E4DD] bg-white hover:border-[#D0CBC0] transition p-4 sm:px-5 sm:py-4">
      {/* Upper side: Original Row (always stays visible) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 pr-2">
          <span className="font-sans font-[600] text-[15.5px] leading-[21px] text-[#062C55] block">
            {item.label}
          </span>
          <div className="font-sans font-[700] text-[16px] leading-[25px] text-[#062C55] mt-0.5">
            {item.value}
          </div>
          <div className="font-sans text-[12.5px] leading-[20px] text-[#5A6B78] mt-1 flex flex-wrap items-center gap-1.5">
            <span>{item.source}</span>
            {item.citation && (
              <>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => onViewCitation(item.citation!)}
                  className="font-sans font-[700] text-[12.5px] leading-[20px] text-[#0C8F72] hover:opacity-80 underline cursor-pointer"
                >
                  See the words
                </button>
              </>
            )}
          </div>
          {item.warningNote && (
            <div className="font-sans text-[12.5px] leading-[20px] text-[#8A5A00] mt-1">
              {item.warningNote}
            </div>
          )}
        </div>

        {/* Right side: Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          {!item.hasOnlyChange && (
            <button
              type="button"
              onClick={onToggleConfirm}
              className="w-[88px] h-[44px] rounded-[10px] bg-white border border-[#0C8F72] hover:bg-[#0C8F72]/5 text-[#0C8F72] font-sans font-[700] text-[14px] leading-[22px] transition cursor-pointer flex items-center justify-center"
            >
              Yes
            </button>
          )}
          <button
            type="button"
            onClick={onStartInlineEdit}
            className="w-[88px] h-[44px] rounded-[10px] bg-white border border-[#CDD3D8] hover:bg-[#F6F4EF] text-[#062C55] font-sans font-[700] text-[14px] leading-[22px] transition cursor-pointer flex items-center justify-center"
          >
            Change
          </button>
        </div>
      </div>

      {/* Downside: Option to change accordingly (Photo 2) */}
      {item.isEditingInline && (
        <div className="mt-4 pt-3.5 border-t border-[#F0EFEA]">
          <USItemCardInlineEditor
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

// ── US Inline Editor Sub-component (Photo 2 layout) ──
function USItemCardInlineEditor({
  item,
  fieldConfig,
  onCancel,
  onSave,
  onFixPlausibility,
  onUseDocumentValue,
  onKeepUserValue,
  onAddClearerCopy,
}: {
  item: USReviewItem;
  fieldConfig?: USFieldConfig;
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
      : type === "number" && item.id === "daysToDecide"
      ? `${localInput.replace(/[^0-9]/g, "")} days`
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
              placeholder={fieldConfig?.placeholder || "22154"}
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
              setLocalInput("Not in my agreement");
              onSave("Not in my agreement", true);
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
            That&apos;s very different from what your agreement says ({item.originalDocumentValue || "$22,154"}). Is {displayVal} right?
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
            We looked again. Your agreement{item.citation ? ", section 6, says:" : `, says: ${item.originalDocumentValue}`}
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
              Use {item.originalDocumentValue}
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
