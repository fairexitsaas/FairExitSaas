"use client";
"use no memo";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { triggerGetApp } from "@/context/GetAppContext";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getReportInputs, saveReportInputs, ReportInputs } from "@/lib/report-storage";
import { fairexit, FairExitApiError } from "@/lib/api/fairexit";
import { useErrorModal } from "@/context/ErrorModalContext";
import PaidReportReadyPage from "@/components/report/PaidReportReadyPage";
import ChangeJurisdictionModal from "@/components/report/ChangeJurisdictionModal";

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
  section: "you" | "offer" | "layoff";
  isOptional?: boolean;
}

const MONTHS_MAP: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseDateToISO(str?: string): string {
  if (!str) return "";
  const m = str.match(/([a-zA-Z]{3,})s+([0-9]{1,2}),?s+([0-9]{4})/);
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

export const US_KEY_MAP: Record<string, string> = {
  state: "state",
  employee_name: "employee_name",
  employer_name: "employer_name",
  age: "age",
  years: "years",
  salary: "pay",
  offerMoney: "offer_amount",
  pay_rate: "pay_rate",
  document_place: "document_place",
  contractStartDate: "contract_start",
  contractJobTitle: "job_title_contract",
  signRelease: "release_required",
  daysToDecide: "days_to_decide",
  revocationPeriod: "take_back",
  seeAttorney: "attorney_line",
  agesTitlesList: "age_list",
  nonCompete: "non_compete",
  lastDayAgreement: "last_day",
  advanceNotice: "advance_notice",
};

export const US_FIELD_CONFIGS: Record<string, USFieldConfig> = {
  employee_name: {
    type: "text",
    label: "Your name",
    placeholder: "e.g. Jordan Taylor",
  },
  employer_name: {
    type: "text",
    label: "Employer",
    placeholder: "e.g. Empire Harbor Analytics",
  },
  pay_rate: {
    type: "text",
    label: "Pay rate",
    placeholder: "e.g. $32.00 per hour or $128,000 / year",
  },
  document_place: {
    type: "text",
    label: "Place in documents",
    placeholder: "e.g. New York, NY",
  },
  contractStartDate: {
    type: "date",
    label: "Contract start date",
    placeholder: "Aug 11, 2025",
  },
  contractJobTitle: {
    type: "text",
    label: "Contract job title",
    placeholder: "e.g. Temporary Data Operations Analyst",
  },
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
    options: ["Not found", "Provided", "Not applicable"],
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
  const { showErrorModal } = useErrorModal();
  const router = useRouter();
  const [isDone, setIsDone] = useState(false);
  const [data] = useState<ReportInputs>(() => getReportInputs());
  const [explainQuestions, setExplainQuestions] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSubmittingBuild, setIsSubmittingBuild] = useState(false);
  const [buildError, setBuildError] = useState("");
  const buildSubmitLock = useRef(false);
  // Change 21: Location mismatch state & modal
  const [locationMismatch, setLocationMismatch] = useState<{
    detected: boolean;
    documentPlace?: string | null;
    selectedPlace?: string;
    message?: string | null;
    documentCountry?: "CA" | "US" | null;
    documentRegion?: string | null;
    docPlace?: string;
    chosen?: string;
  } | null>(null);
  const [locationMismatchDismissed, setLocationMismatchDismissed] = useState(false);
  const [showChangeRegionModal, setShowChangeRegionModal] = useState(false);

  // Change 19: Years of service conflict (contract start vs answered years)
  const [hasServiceConflict, setHasServiceConflict] = useState<boolean>(false);
  const [docServiceDisplay, setDocServiceDisplay] = useState<string>("");
  const [docServiceQuote, setDocServiceQuote] = useState<string>("");
  const [docServiceWhere, setDocServiceWhere] = useState<string>("");
  const [intakeServiceDisplay, setIntakeServiceDisplay] = useState<string>("");
  const [serviceConflictChoice, setServiceConflictChoice] = useState<"contract" | "told" | "custom" | null>(null);
  const [showServiceConflictCustom, setShowServiceConflictCustom] = useState(false);
  const [serviceConflictCustomVal, setServiceConflictCustomVal] = useState("");


  // Resolved intake answers (from server case answers or client storage)
  const answers = (cs?.answers as Record<string, any>) || {};
  const intakeOfferNum = answers.offer !== undefined && answers.offer !== null && answers.offer !== ""
    ? Number(answers.offer)
    : (data.offer !== undefined && data.offer !== null && data.offer !== "" ? Number(data.offer) : null);

  // ══════════════════════════════════════════════════════════
  // Section 1: Conflict resolution ("Check these first")
  // ══════════════════════════════════════════════════════════
  // Offer conflict
  const [hasOfferConflict, setHasOfferConflict] = useState<boolean>(false);
  const [docOfferDisplay, setDocOfferDisplay] = useState<string>("");
  const [docOfferQuote, setDocOfferQuote] = useState<string>("");
  const [docOfferWhere, setDocOfferWhere] = useState<string>("");
  const [intakeOfferDisplay, setIntakeOfferDisplay] = useState<string>(intakeOfferNum ? `${intakeOfferNum.toLocaleString()}` : "");
  const [offerConflictChoice, setOfferConflictChoice] = useState<"agreement" | "told" | "custom" | null>(null);
  const [showOfferConflictCustom, setShowOfferConflictCustom] = useState(false);
  const [offerConflictCustomVal, setOfferConflictCustomVal] = useState("");

  // Notice conflict
  const [hasNoticeConflict, setHasNoticeConflict] = useState<boolean>(false);
  const [docNoticeVal, setDocNoticeVal] = useState<string>("");
  const [docNoticeQuote, setDocNoticeQuote] = useState<string>("");
  const [docNoticeWhere, setDocNoticeWhere] = useState<string>("");
  const [intakeNoticeVal, setIntakeNoticeVal] = useState<string>("");
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
  // Review Items (13 items total matching US spec)
  // ══════════════════════════════════════════════════════════
  const [items, setItems] = useState<USReviewItem[]>([
    // Section 3: About you (6 items)
    {
      id: "state",
      section: "you",
      label: "State",
      value: answers.state || data.state || (cs?.jurisdiction as any)?.name || "California",
      originalDocumentValue: answers.state || data.state || (cs?.jurisdiction as any)?.name || "California",
      source: "From your answers",
      confirmed: false,
    },
    {
      id: "employee_name",
      section: "you",
      label: "Your name",
      value: answers.employee_name || answers.name || answers.full_name || data.employee_name || "",
      originalDocumentValue: "",
      source: "Your agreement",
      citation: "",
      confirmed: false,
    },
    {
      id: "employer_name",
      section: "you",
      label: "Employer",
      value: answers.employer_name || answers.employer || answers.company || data.employer_name || "",
      originalDocumentValue: "",
      source: "Your agreement",
      citation: "",
      confirmed: false,
    },
    {
      id: "age",
      section: "you",
      label: "Age",
      value: answers.age !== undefined && answers.age !== null ? String(answers.age) : (data.age ? String(data.age) : ""),
      originalDocumentValue: answers.age !== undefined && answers.age !== null ? String(answers.age) : (data.age ? String(data.age) : ""),
      source: "From your answers",
      confirmed: false,
    },
    {
      id: "years",
      section: "you",
      label: "Years on the job",
      value: answers.years !== undefined && answers.years !== null ? `${answers.years} years` : (data.years ? `${data.years} years` : ""),
      originalDocumentValue: answers.years !== undefined && answers.years !== null ? `${answers.years} years` : (data.years ? `${data.years} years` : ""),
      source: "From your answers",
      confirmed: false,
    },
    {
      id: "salary",
      section: "you",
      label: "Pay per year",
      value: answers.salary ? `$${Number(answers.salary).toLocaleString()}` : (data.salary ? `$${Number(data.salary).toLocaleString()}` : ""),
      originalDocumentValue: answers.salary ? `$${Number(answers.salary).toLocaleString()}` : (data.salary ? `$${Number(data.salary).toLocaleString()}` : ""),
      source: "From your answers",
      confirmed: false,
    },

    // Section 4: Your agreement (from your documents) - 12 items
    {
      id: "offerMoney",
      section: "offer",
      label: "Money offered",
      value: intakeOfferNum ? `$${intakeOfferNum.toLocaleString()}` : "",
      originalDocumentValue: "",
      source: "Your agreement",
      citation: "",
      confirmed: false,
    },
    {
      id: "pay_rate",
      section: "offer",
      label: "Pay rate",
      value: "",
      originalDocumentValue: "",
      source: "Your agreement",
      citation: "",
      confirmed: false,
    },
    {
      id: "document_place",
      section: "offer",
      label: "Place in documents",
      value: "",
      originalDocumentValue: "",
      source: "Your agreement",
      citation: "",
      confirmed: false,
    },
    {
      id: "contractStartDate",
      section: "offer",
      label: "Contract start date",
      value: "",
      originalDocumentValue: "",
      source: "Your contract",
      citation: "",
      confirmed: false,
    },
    {
      id: "contractJobTitle",
      section: "offer",
      label: "Contract job title",
      value: "",
      originalDocumentValue: "",
      source: "Your contract",
      citation: "",
      confirmed: false,
    },
    {
      id: "signRelease",
      section: "offer",
      label: "You must sign a release",
      value: "",
      originalDocumentValue: "",
      source: "Your agreement",
      citation: "",
      confirmed: false,
    },
    {
      id: "daysToDecide",
      section: "offer",
      label: "Days to decide",
      value: "",
      originalDocumentValue: "",
      source: "Your agreement",
      citation: "",
      confirmed: false,
    },
    {
      id: "revocationPeriod",
      section: "offer",
      label: "7 days to change your mind after signing",
      value: "",
      originalDocumentValue: "",
      source: "Your agreement",
      citation: "",
      confirmed: false,
    },
    {
      id: "seeAttorney",
      section: "offer",
      label: "Tells you to see an attorney",
      value: "",
      originalDocumentValue: "",
      source: "Your agreement",
      citation: "",
      confirmed: false,
    },
    {
      id: "agesTitlesList",
      section: "offer",
      label: "List of ages and job titles",
      value: "",
      originalDocumentValue: "",
      source: "The list attached to your agreement",
      citation: "",
      confirmed: false,
    },
    {
      id: "nonCompete",
      section: "offer",
      label: "Non-compete",
      value: "",
      originalDocumentValue: "",
      source: "Your agreement",
      citation: "",
      confirmed: false,
    },
    {
      id: "lastDayAgreement",
      section: "offer",
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
      section: "layoff",
      label: "Advance notice you got",
      value: "",
      originalDocumentValue: "",
      source: "Your agreement",
      citation: "",
      confirmed: false,
    },
  ]);

    // Load real extracted facts and saved review data from backend
  useEffect(() => {
    const activeCaseId = caseId || cs?.id;
    if (!activeCaseId) return;

    fairexit.getReviewData(activeCaseId).then((res) => {
      if (!res) return;
      const facts: any[] = res.originalExtractedFacts || [];
      const corrections: Record<string, any> = res.correctedFacts || {};
      const checkRows: Record<string, any> = res.checkState?.rows || {};
      const conflicts: any[] = res.reviewModel?.conflicts || [];

      // 1. Process Offer Conflict
      const confOffer = conflicts.find((c: any) => c.key === 'offer_amount');
      const fOffer = facts.find((f: any) => f.key === 'offer_amount');
      let docOffVal = "";
      if (confOffer) {
        docOffVal = confOffer.document.display || (fOffer?.value ? `${Number(fOffer.value).toLocaleString()}` : "");
        setDocOfferQuote(confOffer.document.quote || fOffer?.quote || "");
        setDocOfferWhere(confOffer.document.where || fOffer?.where || "");
      } else if (fOffer?.value) {
        docOffVal = `${Number(fOffer.value).toLocaleString()}`;
        setDocOfferQuote(fOffer.quote || "");
        setDocOfferWhere(fOffer.where || "");
      }
      setDocOfferDisplay(docOffVal);

      if (confOffer) {
        setHasOfferConflict(true);
      } else if (intakeOfferNum && fOffer?.value && Math.abs(Number(fOffer.value) - intakeOfferNum) > 100) {
        setHasOfferConflict(true);
      } else {
        setHasOfferConflict(false);
      }

      // Sync extracted document facts into storage
      const fSignBy = facts.find((f: any) => f.key === 'sign_by');
      const fDays = facts.find((f: any) => f.key === 'days_to_decide');
      const fRelease = facts.find((f: any) => f.key === 'release_required');
      const fName = facts.find((f: any) => f.key === 'employee_name');
      const fEmployer = facts.find((f: any) => f.key === 'employer_name');
      const dOfferNum = fOffer?.value ? Number(String(fOffer.value).replace(/[^0-9.]/g, '')) : null;
      const syncUpdates: Partial<ReportInputs> = {
        documentsExtracted: true,
        extractionStatus: "success",
        documentOfferFound: Boolean(dOfferNum && dOfferNum > 0),
        documentReleaseFound: Boolean(fRelease?.value),
        documentSignByFound: Boolean(fSignBy?.value || fDays?.value),
      };
      if (dOfferNum !== null && dOfferNum > 0) {
        syncUpdates.offer = dOfferNum;
        syncUpdates.offerSource = "document";
      }
      if (fSignBy?.value) {
        syncUpdates.signByDays = String(fSignBy.value);
        syncUpdates.signBySource = "document";
      } else if (fDays?.value) {
        syncUpdates.signByDays = `${fDays.value} days to decide`;
        syncUpdates.signBySource = "document";
      }
      if (fDays?.value) syncUpdates.daysToDecide = fDays.value;
      if (fRelease?.value) {
        syncUpdates.releaseRequired = String(fRelease.value);
        syncUpdates.releaseRequiredSource = "document";
      }
      if (fName?.value) syncUpdates.employee_name = String(fName.value);
      if (fEmployer?.value) syncUpdates.employer_name = String(fEmployer.value);
      saveReportInputs(syncUpdates);

      // 2. Process Notice Conflict
      const confNotice = conflicts.find((c: any) => c.key === 'advance_notice');
      const fNotice = facts.find((f: any) => f.key === 'advance_notice');
      const intakeNotice = answers.advanceNotice || data.userAnswers?.advanceNotice || (data.flagged ? "None, or the same day" : "");

      if (confNotice) {
        setHasNoticeConflict(true);
        setDocNoticeVal(confNotice.document.display || String(fNotice?.value || ""));
        setDocNoticeQuote(confNotice.document.quote || fNotice?.quote || "");
        setDocNoticeWhere(confNotice.document.where || fNotice?.where || "");
        setIntakeNoticeVal(confNotice.answers.display || intakeNotice || "None, or the same day");
      } else if (fNotice?.value && intakeNotice && String(fNotice.value).toLowerCase() !== intakeNotice.toLowerCase()) {
        const dVal = String(fNotice.value).includes('day') ? String(fNotice.value) : `${fNotice.value} days`;
        setHasNoticeConflict(true);
        setDocNoticeVal(dVal);
        setDocNoticeQuote(fNotice.quote || "");
        setDocNoticeWhere(fNotice.where || "");
        setIntakeNoticeVal(intakeNotice);
      } else {
        setHasNoticeConflict(false);
        if (fNotice?.value) {
          const dVal = String(fNotice.value).includes('day') ? String(fNotice.value) : `${fNotice.value} days`;
          setDocNoticeVal(dVal);
        }
      }

            // 3. Process Service Conflict (contract start vs answered years)
      const confService = conflicts.find((c: any) => c.key === 'contract_start');
      if (confService) {
        setHasServiceConflict(true);
        setDocServiceDisplay(confService.document?.display || "");
        setDocServiceQuote(confService.document?.quote || "");
        setDocServiceWhere(confService.document?.where || "");
        setIntakeServiceDisplay(confService.answers?.display || (answers.years ? `${answers.years} years` : ""));
      } else {
        setHasServiceConflict(false);
      }

      if (res.reviewModel?.locationMismatch?.detected) {
        setLocationMismatch(res.reviewModel.locationMismatch);
      }
      // 2. Process Last Day of Work (check if present in agreement)
      const fLastDay = facts.find((f: any) => f.key === 'last_day');
      if (fLastDay?.value) {
        setLastDayWork(String(fLastDay.value));
        setLastDayWorkSaved(true);
      }

      // 3. Update items from extracted facts and review rows
      const allModelRows: any[] = [];
      if (res.reviewModel?.groups) {
        for (const grp of res.reviewModel.groups) {
          if (Array.isArray(grp.rows)) {
            allModelRows.push(...grp.rows);
          }
        }
      }

      setItems((prev) =>
        prev.map((item) => {
          const keyMap = US_KEY_MAP;
          const factKey = keyMap[item.id] || item.id;
          const modelRow = allModelRows.find((r: any) => r.key === factKey);

          const fact = facts.find((f: any) => f.key === factKey);
          const correction = corrections[factKey];
          const checkRow = checkRows[factKey];

          let origVal = item.originalDocumentValue || "";
          let cit = item.citation || "";
          let src = item.source;
          let val = item.value;
          let warningNote = item.warningNote;
          let confirmed = item.confirmed;
          let userChanged = item.userChanged;
          let userChangeAck = item.userChangeAck;

          if (fact && fact.value !== null && fact.value !== undefined && fact.value !== "") {
            let formatted = String(fact.value);
            if (factKey === 'offer_amount') {
              const n = Number(formatted.replace(/[^0-9.]/g, ''));
              formatted = n > 0 ? `$${n.toLocaleString()}` : formatted;
              const pay = Number(answers.salary || data.salary || 0);
              if (pay > 0 && n > 0) {
                const wks = Math.round(n / (pay / 52));
                if (wks > 0) formatted += ` (about ${wks} weeks)`;
              }
            } else if (factKey === 'days_to_decide') {
              formatted = formatted.includes('day') ? formatted : `${formatted} days`;
            } else if (factKey === 'advance_notice') {
              formatted = formatted.includes('day') ? formatted : `${formatted} days`;
            } else if (factKey === 'release_required') {
              formatted = /yes|true|full/i.test(formatted) ? "Yes" : /no/i.test(formatted) ? "No" : formatted;
            } else if (factKey === 'take_back') {
              formatted = formatted === '7_days' || formatted === '7' ? "7 days" : /not/i.test(formatted) ? "Not mentioned" : formatted;
            } else if (factKey === 'attorney_line') {
              formatted = /yes|advis/i.test(formatted) ? "Yes" : /no/i.test(formatted) ? "No" : formatted;
            } else if (factKey === 'age_list') {
              formatted = /provided|given|yes/i.test(formatted) ? "Provided" : /miss|no/i.test(formatted) ? "Missing" : formatted;
            } else if (factKey === 'non_compete') {
              formatted = /yes/i.test(formatted) ? "Yes" : /no/i.test(formatted) ? "No" : formatted;
            }

            origVal = formatted;
            val = formatted;
            if (factKey === 'last_day') item.hasOnlyChange = false;
            if (fact.quote) {
              cit = fact.where ? `"${fact.quote}" · ${fact.where}` : `"${fact.quote}"`;
            }
            if (fact.where) {
              src = `Your agreement, ${fact.where}`;
            }
            if (item.id === 'lastDayAgreement') {
              warningNote = undefined;
            }
          }

          if (checkRow) {
            if (checkRow.status === 'confirmed') confirmed = true;
            if (checkRow.status === 'corrected') {
              userChanged = true;
              val = String(checkRow.user_value ?? checkRow.value);
              userChangeAck = !!checkRow.change_ack;
            }
          } else if (correction) {
            userChanged = true;
            val = String(correction.user_value);
            userChangeAck = !!correction.change_ack;
            if (correction.status === 'confirmed') confirmed = true;
          }

          if (val && val.toLowerCase().includes('no date') && val.length > 25) {
            if (!cit) cit = `"${val}"`;
            val = "No date given";
          }
          if (origVal && origVal.toLowerCase().includes('no date') && origVal.length > 25) {
            origVal = "No date given";
          }

          return {
            ...item,
            section: item.section,
            value: val,
            originalDocumentValue: origVal,
            source: src,
            citation: cit,
            warningNote,
            confirmed,
            userChanged,
            userChangeAck,
          };
        })
      );
    }).catch((e) => console.warn('Could not load US review data:', e));
  }, [caseId, cs, intakeOfferNum]);

  // Confirmation counting: 1-to-1 mapping with actual confirmation tasks
  const hasMissingLastDay = !items.find((i) => i.id === "lastDayAgreement")?.originalDocumentValue ||
    items.find((i) => i.id === "lastDayAgreement")?.originalDocumentValue === "Not in your agreement";

  const requiredItems = items.filter((i) => !i.isOptional);

  const isItemConfirmed = (item: USReviewItem) => {
    if (item.id === "advanceNotice" && hasNoticeConflict) {
      return noticeConflictChoice !== null || (item.userChanged ? item.userChangeAck === true : item.confirmed === true);
    }
    if (item.id === "lastDayAgreement" && hasMissingLastDay) {
      return lastDayWorkSaved || (item.userChanged ? item.userChangeAck === true : item.confirmed === true);
    }
    if (item.id === "offerMoney" && hasOfferConflict) {
      return offerConflictChoice !== null || (item.userChanged ? item.userChangeAck === true : item.confirmed === true);
    }
    if (item.id === "years" && hasServiceConflict) {
      return serviceConflictChoice !== null || (item.userChanged ? item.userChangeAck === true : item.confirmed === true);
    }
    if (item.userChanged) {
      return item.userChangeAck === true;
    }
    return item.confirmed === true;
  };

  const totalCount = requiredItems.length;
  const confirmedCount = Math.min(
    totalCount,
    requiredItems.filter(isItemConfirmed).length
  );
  const remainingCount = Math.max(0, totalCount - confirmedCount);
  const isAllConfirmed = remainingCount === 0;
  const canBuild = isAllConfirmed && declaredCorrect;
  const changedItemsCount = items.filter((i) => i.userChanged).length;

  // ── Handlers ──
  const handleChooseOfferConflict = (choice: "agreement" | "told" | "custom", customVal?: string) => {
    setOfferConflictChoice(choice);
    setShowOfferConflictCustom(false);
    let chosenVal = docOfferDisplay;
    if (choice === "told") {
      chosenVal = intakeOfferDisplay;
    } else if (choice === "custom" && customVal) {
      const cleanNum = Number(customVal.replace(/[^0-9]/g, ""));
      chosenVal = cleanNum ? `${cleanNum.toLocaleString()}` : customVal;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === "offerMoney" ? { ...i, value: chosenVal, userChanged: false, showSecondLook: false } : i))
    );
    const activeCaseId = caseId || cs?.id;
    if (activeCaseId) {
      fairexit.saveReviewData(activeCaseId, { key: 'offer_amount', action: 'conflict_choice', value: chosenVal }).catch(() => {});
    }
  };

  const toggleConfirm = (id: string) => {
    const item = items.find((i) => i.id === id);
    const newConfirmed = !item?.confirmed;
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, confirmed: newConfirmed, userChanged: false, showSecondLook: false } : i))
    );
    const activeCaseId = caseId || cs?.id;
    if (activeCaseId && newConfirmed) {
      const keyMap = US_KEY_MAP;
      const factKey = keyMap[id] || id;
      fairexit.saveReviewData(activeCaseId, { key: factKey, action: 'confirm', value: item?.value }).catch(() => {});
    }
  };

  const handleConfirmAll = () => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        value:
          item.id === "lastDayAgreement" && (item.value === "Not in your agreement" || !lastDayWork)
            ? (item.originalDocumentValue && item.originalDocumentValue !== "Not in your agreement" ? item.originalDocumentValue : (lastDayWork || "Not specified"))
            : item.value,
        warningNote: undefined,
        confirmed: true,
        userChangeAck: item.userChanged ? true : item.userChangeAck,
      }))
    );
    if (hasOfferConflict) setOfferConflictChoice("agreement");
    if (hasNoticeConflict) setNoticeConflictChoice("agreement");
    if (hasServiceConflict) setServiceConflictChoice("contract");
    if (hasOfferConflict) setOfferConflictChoice("agreement");
    setLastDayWork((prev) => prev || items.find(i => i.id === "lastDayAgreement")?.value || "");
    setLastDayWorkSaved(true);
    setDeclaredCorrect(true);
    const activeCaseId = caseId || cs?.id;
    if (activeCaseId) {
      fairexit.saveReviewData(activeCaseId, { action: 'confirm_all' }).catch(() => {});
    }
  };

    const handleChooseServiceConflict = (choice: "contract" | "told" | "custom", customVal?: string) => {
    setServiceConflictChoice(choice);
    setShowServiceConflictCustom(false);
    let chosenVal = docServiceDisplay;
    if (choice === "told") {
      chosenVal = intakeServiceDisplay;
    } else if (choice === "custom" && customVal) {
      chosenVal = customVal;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.id === "years"
          ? { ...i, value: chosenVal }
          : i
      )
    );
    const activeCaseId = caseId || cs?.id;
    if (activeCaseId) {
      fairexit.saveReviewData(activeCaseId, { key: 'years', action: choice === 'custom' ? 'change' : 'confirm', value: chosenVal }).catch(() => {});
    }
  };

  const handleChooseNoticeConflict = (choice: "agreement" | "told" | "custom", customVal?: string) => {
    setNoticeConflictChoice(choice);
    setShowNoticeConflictCustom(false);
    let chosenVal = docNoticeVal;
    if (choice === "told") {
      chosenVal = intakeNoticeVal || "None, or the same day";
    } else if (choice === "custom" && customVal) {
      chosenVal = customVal;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.id === "advanceNotice"
          ? { ...i, value: chosenVal, warningNote: undefined }
          : i
      )
    );
    const activeCaseId = caseId || cs?.id;
    if (activeCaseId) {
      fairexit.saveReviewData(activeCaseId, { key: 'advance_notice', action: choice === 'custom' ? 'change' : 'confirm', value: chosenVal }).catch(() => {});
    }
  };

  const handleSaveLastDay = (dayStr: string) => {
    const finalVal = dayStr.trim() ? dayStr : "";
    if (!finalVal) return;
    setLastDayWork(finalVal);
    setLastDayWorkSaved(true);
    setItems((prev) =>
      prev.map((i) =>
        i.id === "lastDayAgreement"
          ? { ...i, value: finalVal, warningNote: undefined, confirmed: true }
          : i
      )
    );
    const activeCaseId = caseId || cs?.id;
    if (activeCaseId) {
      fairexit.saveReviewData(activeCaseId, { key: 'last_day', action: 'change', value: finalVal }).catch(() => {});
    }
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
      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                value: formattedVal,
                inlineInputValue: formattedVal,
                isEditingInline: false,
                userChanged: true,
                showSecondLook: true,
                showPlausibilityAlert: false,
                confirmed: false,
              }
            : i
        )
      );
    } else {
      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                value: formattedVal,
                isEditingInline: false,
                confirmed: true,
                userChanged: false,
                showSecondLook: false,
                userChangeAck: false,
              }
            : i
        )
      );
      const activeCaseId = caseId || cs?.id;
      if (activeCaseId) {
        if (id === 'state') {
          fairexit.changeJurisdiction(activeCaseId, 'US', formattedVal).then((res) => {
            handleJurisdictionChanged(formattedVal, res);
          }).catch((err) => {
            console.error('Failed to update jurisdiction via state card inline edit:', err);
          });
        } else {
          const keyMap = US_KEY_MAP;
          fairexit.saveReviewData(activeCaseId, { key: keyMap[id] || id, action: 'change', value: formattedVal }).catch(() => {});
        }
      }
    }
  };

  const handleJurisdictionChanged = (newRegion?: string, apiResult?: { case?: any; page?: any }) => {
    setShowChangeRegionModal(false);
    if (!newRegion) return;

    // 1. In-place update of state review item (preserving all other review items)
    setItems((prev) =>
      prev.map((i) =>
        i.id === 'state'
          ? {
              ...i,
              value: newRegion,
              originalDocumentValue: newRegion,
              confirmed: true,
              userChanged: false,
              showSecondLook: false,
              userChangeAck: false,
            }
          : i
      )
    );

    // 2. Update location mismatch banner in-place
    if (apiResult?.case?.checkState?.locationMismatch || apiResult?.page?.locationMismatch) {
      setLocationMismatch(apiResult.case?.checkState?.locationMismatch || apiResult.page?.locationMismatch);
    } else {
      setLocationMismatch((prev: any) => {
        if (!prev) return null;
        const docPlace = prev.documentPlace || prev.docPlace || prev.documentRegion || '';
        const docLower = docPlace.toLowerCase();
        const newLower = newRegion.toLowerCase();
        if (docLower.includes(newLower) || newLower.includes(docLower)) {
          return { ...prev, detected: false };
        }
        return prev;
      });
    }

    // 3. User must re-attest after changing state (statutory rules/calculations updated)
    setDeclaredCorrect(false);

    // 4. Background refresh review data without restarting document reading
    const activeCaseId = caseId || cs?.id;
    if (activeCaseId) {
      fairexit.getReviewData(activeCaseId).then((rev) => {
        if (rev && (rev as any).locationMismatch) {
          setLocationMismatch((rev as any).locationMismatch);
        }
      }).catch(() => {});
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
    const activeCaseId = caseId || cs?.id;
    if (activeCaseId) {
      const keyMap = US_KEY_MAP;
      const factKey = keyMap[id] || id;
      const currentItem = items.find((i) => i.id === id);
      fairexit.saveReviewData(activeCaseId, { key: factKey, action: 'confirm', value: currentItem?.originalDocumentValue }).catch(() => {});
    }
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
          userChanged: false,
          userChangeAck: true,
          confirmed: true,
          isEditingInline: false,
          showSecondLook: false,
        };
      })
    );
    const activeCaseId = caseId || cs?.id;
    if (activeCaseId) {
      const keyMap = US_KEY_MAP;
      const factKey = keyMap[id] || id;
      const currentItem = items.find((i) => i.id === id);
      fairexit.saveReviewData(activeCaseId, { key: factKey, action: 'change', value: currentItem?.inlineInputValue || currentItem?.value }).catch(() => {});
    }
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
            <Link href="/#how" className="hover:text-[#062C55] transition">How it works</Link>
            <Link href="/#paths" className="hover:text-[#062C55] transition">Pricing</Link>
            <Link href="/faq" className="hover:text-[#062C55] transition">FAQ</Link>
            <Link href="/blog" className="hover:text-[#062C55] transition">Blog</Link>
            <Link href="/about" className="hover:text-[#062C55] transition">About</Link>
            <button type="button" onClick={() => triggerGetApp()} className="text-[#0C8F72] font-[700] text-[12.5px] hover:underline">Get the app</button>
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
        <div className="relative flex items-center justify-between pb-3">
          <div
            className={`absolute left-[15px] right-[15px] top-[9px] rounded-full -z-0 transition-all duration-500 ${
              isAllConfirmed
                ? "h-[6px] bg-gradient-to-r from-[#0C8F72] to-[#0EB28D]"
                : "h-[2px] bg-[#0EB28D]"
            }`}
          />


          {[
            { label: "Eligible", done: true },
            { label: "Basics", done: true },
            { label: "Money", done: true },
            { label: "Key questions", done: true },
            { label: "Details", done: true },
            { label: "Your results", active: true },
          ].map((st, i) => (
            <div key={i} className="relative z-10 flex flex-col items-center">
              {st.active ? (
                <div className="relative flex items-center justify-center w-[18px] h-[18px]">
                  <div className="absolute w-[28px] h-[28px] rounded-full border-[4px] border-[#062C55]/10 pointer-events-none" />
                  <div className="w-[20px] h-[20px] rounded-full bg-[#062C55] text-white flex items-center justify-center text-[10px] font-extrabold z-10">
                    ★
                  </div>
                </div>
              ) : (
                <div
                  className={`w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                    st.done
                      ? "bg-[#0EB28D] text-white border border-[#0EB28D]"
                      : "bg-white text-[#8A96A0] border border-[#D8D3C8]"
                  }`}
                >
                  {st.done ? "✓" : ""}
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
          <div className="inline-flex items-center px-3 py-1 bg-white border border-[#E7E4DD] rounded-[6px] text-[12px] font-[700] text-[#062C55] mb-4">
            We read your documents
          </div>

          <h1 className="font-serif font-[500] text-[24px] sm:text-[27px] leading-[1.15] text-[#062C55] tracking-[-0.5px] mb-3">
            Check everything your report will use
          </h1>

          <p className="font-sans font-normal text-[15px] sm:text-[15.5px] leading-[24px] text-[#17242F] mb-6">
            We&apos;ve read your severance agreement. Before we build your report, check that everything we found is right. Your report is built only on what you confirm here. About 2 minutes.
          </p>

          {/* Progress Card */}
          {isAllConfirmed ? (
            <div className="w-full bg-[#EEF8F3] border border-[#C7E6D6] rounded-[12px] shadow-[0px_18px_40px_-18px_rgba(5,43,84,0.12)] p-4 sm:px-5 sm:py-3.5 mb-8">
              <div className="flex items-center justify-between">
                <span className="font-sans font-[700] text-[15px] text-[#0C8F72]">
                  All set
                </span>
                <span className="font-sans font-[400] text-[13px] text-[#5A6B78]">
                  {confirmedCount} of {totalCount} confirmed
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

                    {/* Change 21: Location Mismatch Warning Banner */}
          {locationMismatch?.detected && !locationMismatchDismissed && (
            <div className="mb-8 rounded-[14px] bg-[#FFF8E7] border border-[#E8D196] border-l-4 border-l-[#B07A00] p-4.5 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="text-[22px] leading-none mt-0.5">📍</span>
                <div>
                  <h4 className="font-sans font-[700] text-[15.5px] text-[#062C55]">
                    {locationMismatch.message || `Your documents mention ${locationMismatch.documentPlace || locationMismatch.docPlace}. Is ${locationMismatch.selectedPlace || locationMismatch.chosen} right?`}
                  </h4>
                  <p className="font-sans text-[13px] text-[#5A6B78] mt-0.5">
                    Severance laws and regulations differ by state. If you worked in {locationMismatch.documentPlace || locationMismatch.docPlace}, please update your state before generating the report.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={() => setShowChangeRegionModal(true)}
                  className="px-4 py-2 bg-[#062C55] hover:bg-[#0C3B6E] text-white font-sans font-[700] text-[13px] rounded-[8px] transition cursor-pointer shadow-xs"
                >
                  Change region
                </button>
                <button
                  type="button"
                  onClick={() => setLocationMismatchDismissed(true)}
                  className="px-3 py-2 text-[#5A6B78] hover:text-[#062C55] font-sans font-[600] text-[13px] rounded-[8px] hover:bg-black/5 transition cursor-pointer"
                >
                  It&apos;s right
                </button>
              </div>
            </div>
          )}

          {/* SECTION 1: Check these first (Conflict card if exists) */}
          {hasNoticeConflict && (
            <div className="mb-8">
              <div className="flex items-baseline gap-2 mb-3">
                <h2 className="font-sans font-[700] text-[17px] text-[#062C55]">
                  Check these first
                </h2>
                <span className="font-sans font-normal text-[12.5px] text-[#5A6B78]">
                  your answers and your agreement don&apos;t match
                </span>
              </div>

              <div className="bg-white border border-[#E7E4DD] border-l-4 border-l-[#B07A00] rounded-[14px] p-5 sm:p-6 shadow-xs">
                <span className="font-sans font-[700] text-[12px] tracking-[0.5px] text-[#5A6B78] uppercase block mb-1">
                  ADVANCE NOTICE YOU GOT
                </span>
                <h3 className="font-sans font-[700] text-[16px] leading-[24px] text-[#062C55] mb-3.5">
                  Which is right?
                </h3>

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
                        {docNoticeVal || "—"}
                      </span>
                      {docNoticeQuote && (
                        <p className="font-serif italic text-[14.5px] text-[#17242F] mt-2 mb-3 leading-[20px]">
                          &ldquo;{docNoticeQuote}&rdquo;
                        </p>
                      )}
                      <span className="font-sans text-[12px] text-[#5A6B78] block">
                        {docNoticeWhere ? `Your agreement, ${docNoticeWhere}` : "Your agreement"}
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
                        {intakeNoticeVal || "None, or the same day"}
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

          {/* SECTION 2: We need one more answer (Only if last day not specified yet) */}
          {!lastDayWorkSaved && (
            <div className="mb-8">
              <div className="flex items-baseline gap-2 mb-3">
                <h2 className="font-sans font-[700] text-[17px] text-[#062C55]">
                  We need one more answer
                </h2>
                <span className="font-sans font-normal text-[12.5px] text-[#5A6B78]">
                  your agreement doesn&apos;t say
                </span>
              </div>

              <div className="bg-white border border-[#E7E4DD] border-l-4 border-l-[#2F6AA3] rounded-[14px] p-5 sm:p-6 shadow-xs">
                <span className="font-sans font-[800] text-[11.5px] tracking-[1px] text-[#2F6AA3] uppercase block mb-1">
                  LAST DAY OF WORK
                </span>
                <p className="font-sans font-[700] text-[15px] sm:text-[16px] text-[#062C55] mb-3.5">
                  What was (or will be) your last day of work?
                </p>

                <div className="flex flex-wrap items-center gap-2.5">
                  <input
                    type="date"
                    value={lastDayWork ? (parseDateToISO(lastDayWork) || lastDayWork) : ""}
                    onChange={(e) => setLastDayWork(formatDateFromISO(e.target.value) || e.target.value)}
                    className="h-[45.5px] px-3.5 bg-[#FFFDF5] border border-[#E7C074] border-l-4 border-l-[#E7B74D] rounded-[10px] text-[15px] font-[600] text-[#062C55] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveLastDay(lastDayWork)}
                    className="h-[45.5px] px-5 rounded-[10px] bg-[#062C55] hover:bg-[#041D38] text-white font-sans font-[700] text-[14px] transition cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: About you (you told us) */}
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
              {items.filter((item) => item.section === "you").map((item) => (
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

          {/* SECTION 4: Your agreement (from your documents) */}
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
              {items.filter((item) => item.section === "offer").map((item) => (
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

          {/* SECTION 5: The layoff (from your documents) */}
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
              {items.filter((item) => item.section === "layoff").map((item) => (
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

          {/* Confirmation Checkbox Box */}
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

          {/* Bottom Action CTA */}
          <div>
            {buildError && <p role="alert" className="mb-3 text-sm text-[#A3231F]">{buildError}</p>}
            <button
              type="button"
              disabled={!canBuild || isSubmittingBuild}
              onClick={async () => {
                if (buildSubmitLock.current) return;
                const activeCaseId = caseId || cs?.id;
                if (!activeCaseId) {
                  showErrorModal({
                    title: "Case Not Found",
                    message: "No case identifier was found to start building your report.",
                    stage: "Report Generation",
                  });
                  return;
                }
                buildSubmitLock.current = true;
                setIsSubmittingBuild(true);
                setBuildError("");
                let started = false;
                try {
                  await fairexit.attest(activeCaseId);
                  await fairexit.buildReport(activeCaseId);
                  started = true;
                } catch (err: unknown) {
                  const apiErr = err instanceof FairExitApiError ? err : new FairExitApiError(0, err instanceof Error ? err.message : "Could not start report generation. Please try again.");
                  setBuildError(apiErr.message);
                  showErrorModal({
                    title: "Report Generation Failed",
                    message: apiErr.message,
                    stage: apiErr.stage || "Report Generation",
                    statusCode: apiErr.status,
                    requestId: apiErr.requestId,
                  });
                } finally {
                  setIsSubmittingBuild(false);
                }
                if (started) {
                  if (onContinue) onContinue();
                  else setIsDone(true);
                } else {
                  buildSubmitLock.current = false;
                }
              }}
              className={`w-full h-[48px] rounded-[9px] font-sans font-[700] text-[16px] transition flex items-center justify-center ${
                canBuild && !isSubmittingBuild
                  ? "bg-[#0EB28D] hover:bg-[#0C8F72] text-white shadow-[0px_18px_40px_-18px_rgba(5,43,84,0.12)] cursor-pointer"
                  : "bg-[#C9D1D7] text-white cursor-not-allowed opacity-90"
              }`}
            >
              {isSubmittingBuild ? (
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  <span>Starting report build…</span>
                </div>
              ) : canBuild ? (
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


      {/* ── Change Jurisdiction Modal ── */}
      <ChangeJurisdictionModal
        isOpen={showChangeRegionModal}
        onClose={() => setShowChangeRegionModal(false)}
        caseId={caseId || (cs?.id as string) || ""}
        currentCountry="US"
        currentRegion={items.find(i => i.id === 'state')?.value || answers.state || data.state || (cs?.jurisdiction as any)?.name || "California"}
        suggestedCountry={locationMismatch?.documentCountry || (locationMismatch?.docPlace?.includes("CA") || locationMismatch?.documentPlace?.includes("Canada") ? "CA" : locationMismatch?.docPlace?.includes("US") || locationMismatch?.documentPlace?.includes("United States") ? "US" : null)}
        suggestedRegion={locationMismatch?.documentRegion || locationMismatch?.docPlace || locationMismatch?.documentPlace}
        onSuccess={(result, updatedRegion) => {
          handleJurisdictionChanged(updatedRegion || locationMismatch?.documentRegion || locationMismatch?.docPlace || locationMismatch?.documentPlace || undefined, result);
        }}
      />
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

  // 1. CONFIRMED ROW STATE (Matches Image 1)
  if (item.confirmed && !item.isEditingInline && !item.userChanged && !item.showSecondLook) {
    const rawVal = item.value || "Yes";
    const isLongVal = rawVal.length > 25;
    const isNoDate = rawVal.toLowerCase().includes("no date");
    const displayPillVal = isNoDate && isLongVal ? "No date given" : rawVal;

    return (
      <div className="rounded-[10px] border border-[#E7E4DD] bg-white hover:border-[#D0CBC0] transition p-3.5 sm:px-5 sm:py-3.5 flex items-center justify-between gap-3 min-w-0">
        <div className="flex-1 min-w-[150px] sm:min-w-[180px] pr-2">
          <div className="font-sans font-bold text-[14.5px] leading-[20px] text-[#062C55]">
            {item.label}:
          </div>
          <div className="font-sans text-[12.5px] leading-[18px] text-[#5A6B78] mt-0.5">
            {item.source}
            {item.citation && (
              <>
                <span className="mx-1">·</span>
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

        <div className="flex flex-col items-end shrink-0 max-w-[55%] sm:max-w-[60%]">
          {item.id === "agesTitlesList" && (rawVal.toLowerCase().includes("missing") || rawVal.toLowerCase().includes("not found")) ? (
            <div
              onClick={onToggleConfirm}
              className="min-h-[34px] max-w-full px-3.5 py-1.5 rounded-[6px] font-sans font-bold text-[13px] flex items-center gap-1.5 transition cursor-pointer bg-[#0EB28D] text-white shadow-xs"
            >
              <span className="truncate max-w-[180px] sm:max-w-[280px]" title={rawVal}>{rawVal || "Missing"}</span>
            </div>
          ) : (
            <div
              onClick={onToggleConfirm}
              className="min-h-[34px] max-w-full px-3.5 py-1.5 rounded-[6px] font-sans font-bold text-[13px] flex items-center gap-1.5 transition cursor-pointer bg-[#0EB28D] text-white shadow-xs"
            >
              <svg
                className="w-3.5 h-3.5 shrink-0 text-white"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3.5 8.5L6.5 11.5L12.5 4.5"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="truncate max-w-[200px] sm:max-w-[340px]" title={rawVal}>{displayPillVal}</span>
            </div>
          )}

          <button
            type="button"
            onClick={onStartInlineEdit}
            className="font-sans font-[600] text-[12px] leading-[18px] text-[#5A6B78] underline hover:text-[#062C55] transition cursor-pointer mt-1"
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  // 2. NORMAL OR USER-CHANGED ROW STATE (Matches Image 3)
  return (
    <div className="rounded-[10px] border border-[#E7E4DD] bg-white hover:border-[#D0CBC0] transition p-4 sm:px-5 sm:py-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 pr-2">
          <div className="font-sans font-bold text-[14.5px] text-[#062C55]">
            {item.label}
          </div>
          <div className="font-sans font-bold text-[16px] text-[#062C55] mt-0.5">
            {item.value && item.value.toLowerCase().includes('no date') && item.value.length > 25
              ? 'No date given'
              : item.value || "—"}
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
          {item.warningNote && (
            <div className="text-[12px] text-[#B07A00] font-medium mt-1">
              {item.warningNote}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          {!item.hasOnlyChange && (
            <button
              type="button"
              onClick={onToggleConfirm}
              className="h-[38px] px-5 rounded-[8px] font-sans font-bold text-[13.5px] transition cursor-pointer flex items-center justify-center gap-1.5 bg-white border border-[#0C8F72] text-[#0C8F72] hover:bg-[#0C8F72]/5"
            >
              Yes
            </button>
          )}
          <button
            type="button"
            onClick={onStartInlineEdit}
            className="h-[38px] px-4 rounded-[8px] bg-white border border-[#D8D3C8] text-[#062C55] font-sans font-bold text-[13.5px] hover:bg-[#F6F4EF] transition cursor-pointer flex items-center justify-center"
          >
            Change
          </button>
        </div>
      </div>

      {/* Amber "We looked again" banner if user changed value (Image 3) */}
      {(item.userChanged || item.showSecondLook) && !item.isEditingInline && (
        <div className="bg-[#FAF9F5] border border-[#E7E4DD] border-l-4 border-l-[#B07A00] rounded-[8px] p-3.5 sm:p-4 mt-3.5 animate-in fade-in duration-200">
          <p className="font-sans text-[13.5px] text-[#062C55] mb-3">
            We looked again. {item.source ? `${item.source} says:` : "Your agreement says:"}{" "}
            <span className="font-semibold">{item.originalDocumentValue || "original"}</span>
            {item.citation && (
              <span className="block font-serif italic font-medium mt-1 text-[#17242F]">
                &ldquo;{item.citation.replace(/^"|"$/g, "")}&rdquo;
              </span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onUseDocumentValue}
              className="h-[36px] px-4 rounded-[7px] bg-[#062C55] hover:bg-[#041D38] text-white font-[700] text-[13px] transition cursor-pointer"
            >
              Use {item.originalDocumentValue || "document value"}
            </button>
            <button
              type="button"
              onClick={onKeepUserValue}
              className="h-[36px] px-4 rounded-[7px] bg-white border border-[#D8D3C8] text-[#062C55] font-[700] text-[13px] hover:bg-[#F6F4EF] transition cursor-pointer"
            >
              Keep {item.value}
            </button>
            <button
              type="button"
              onClick={onAddClearerCopy}
              className="text-[12.5px] font-[600] text-[#0C8F72] hover:underline cursor-pointer ml-1"
            >
              Add a clearer copy
            </button>
          </div>
        </div>
      )}

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

// ── US Inline Editor Sub-component ──
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
      : localInput;

  return (
    <div className="bg-[#FAF9F5] border border-[#E7E4DD] rounded-[10px] p-4 sm:p-5 space-y-3.5 animate-in fade-in duration-150">
      <div className="flex items-center justify-between">
        <label className="font-sans font-[700] text-[13.5px] text-[#062C55]">
          {label}
        </label>
        <button
          type="button"
          onClick={onCancel}
          className="text-[12.5px] font-[600] text-[#5A6B78] hover:text-[#062C55] underline cursor-pointer"
        >
          Cancel
        </button>
      </div>

      <div>
        {type === "select" && fieldConfig?.options ? (
          <select
            value={localInput}
            onChange={(e) => setLocalInput(e.target.value)}
            className="w-full sm:w-[320px] h-[44px] px-3 bg-white border-2 border-[#0EB28D] ring-2 ring-[#0EB28D]/20 rounded-[8px] text-[15px] font-[600] text-[#062C55] focus:outline-none cursor-pointer"
            autoFocus
          >
            {fieldConfig.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : type === "date" ? (
          <input
            type="date"
            value={localInput}
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
              placeholder={fieldConfig?.placeholder || "0"}
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

      {item.showPlausibilityAlert && (
        <div className="bg-[#FAF9F5] border border-[#E7E4DD] border-l-4 border-l-[#B07A00] rounded-[10px] p-4 mt-3 animate-in fade-in duration-200">
          <p className="font-sans text-[13.5px] text-[#062C55] font-semibold mb-3">
            That&apos;s very different from what your agreement says ({item.originalDocumentValue || "original"}). Is {displayVal} right?
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
              Let me fix it
            </button>
          </div>
        </div>
      )}

      {item.isReReading && (
        <div className="flex items-center gap-2.5 p-3.5 bg-[#FAF9F5] border border-[#E7E4DD] rounded-[8px] mt-3 animate-in fade-in duration-150">
          <svg
            className="animate-spin h-4 w-4 text-[#0EB28D]"
            viewBox="0 0 24 24"
            fill="none"
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


    </div>
  );
}
