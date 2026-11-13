export interface ReportInputs {
  country?: string;
  province?: string;
  provinceName?: string;
  state?: string;
  age?: number | string;
  years?: number | string;
  salary?: number | string;
  offer?: number | string;
  role?: string;
  union?: string;
  employment?: string;
  signed?: string;
  federal?: string;
  payroll?: string;
  otherPay?: string;
  newJob?: string;
  minClause?: string;
  contract?: string;
  howEnded?: string;
  market?: string;
  flagged?: string;
  statutoryMin?: number;
  courtAwardLow?: number;
  courtAwardHigh?: number;
  noticeWeeks?: number;
  courtMonths?: string;
  signByDays?: string;
  email?: string;
  termsAccepted?: boolean;
  remindMe?: boolean;
  employee_name?: string;
  employer_name?: string;
  userAnswers?: Record<string, string>;
  fullState?: Record<string, unknown>;
  timestamp?: number;

  // Document-derived fields & tracking (Change 23)
  offerSource?: "questionnaire" | "document" | "user";
  signBySource?: "document";
  releaseRequired?: string;
  releaseRequiredSource?: "document";
  daysToDecide?: number | string;
  hasContract?: boolean;
  documentsExtracted?: boolean;
  extractionStatus?: "none" | "reading" | "success" | "failed";
  documentOfferFound?: boolean;
  documentReleaseFound?: boolean;
  documentSignByFound?: boolean;
}

const STORAGE_KEY = "fairexit_temp_report_inputs";

export const defaultMockReportInputs: ReportInputs = {
  country: "CA",
  province: "ON",
  provinceName: "Ontario",
  age: 52,
  years: 14,
  salary: 110000,
  offer: undefined,
  role: "Middle management / Senior / Director",
  union: "No",
  employment: "Regular employee",
  signed: "No",
  federal: "No",
  payroll: "Not sure",
  otherPay: "None",
  newJob: "Not yet",
  minClause: "No",
  contract: "Signed · role changed",
  howEnded: "Laid off",
  market: "Some",
  flagged: "Nothing unusual",
  statutoryMin: 17000,
  courtAwardLow: 138000,
  courtAwardHigh: 193000,
  noticeWeeks: 8,
  courtMonths: "15–21 mo",
  signByDays: undefined,
  documentsExtracted: false,
};

export function saveReportInputs(data: Partial<ReportInputs>): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getReportInputs();
    const merged = { ...existing, ...data, timestamp: Date.now() };
    const serialized = JSON.stringify(merged);
    localStorage.setItem(STORAGE_KEY, serialized);
    sessionStorage.setItem(STORAGE_KEY, serialized);
  } catch (e) {
    console.error("Failed to save report inputs to storage", e);
  }
}

export function getReportInputs(): ReportInputs {
  if (typeof window === "undefined") return defaultMockReportInputs;
  try {
    const fromSession = sessionStorage.getItem(STORAGE_KEY);
    if (fromSession) {
      return { ...defaultMockReportInputs, ...JSON.parse(fromSession) };
    }
    const fromLocal = localStorage.getItem(STORAGE_KEY);
    if (fromLocal) {
      return { ...defaultMockReportInputs, ...JSON.parse(fromLocal) };
    }
  } catch (e) {
    console.error("Failed to read report inputs from storage", e);
  }
  return defaultMockReportInputs;
}

/**
 * Determines whether the user selected the bonus option under "Other pay" during intake.
 * Strictly checks the pay object (state.pay.bonus) and otherPay string representations.
 */
export function isBonusInOtherPay(
  answers?: Record<string, any> | null,
  data?: ReportInputs | null
): boolean {
  // 1. Explicit pay object (from CanadaFlow state.pay: { bonus: boolean, ... })
  const payCandidates = [
    answers?.pay,
    (answers?.fullState as any)?.pay,
    (data?.fullState as any)?.pay,
    (data as any)?.pay,
  ];

  for (const payObj of payCandidates) {
    if (payObj && typeof payObj === "object") {
      if (payObj.bonus === true || payObj.bonus === "true" || payObj.bonus === 1 || payObj.bonus === "1") {
        return true;
      }
      if (payObj.bonus === false || payObj.bonus === "false" || payObj.bonus === 0 || payObj.bonus === "0") {
        return false;
      }
    }
  }

  // 2. String check helper: strictly match the word "bonus" in otherPay, but reject negative/empty forms
  const isBonusWord = (val: unknown): boolean => {
    if (!val) return false;
    if (Array.isArray(val)) {
      return val.some((v) => isBonusWord(v));
    }
    if (typeof val === "string") {
      const s = val.trim().toLowerCase();
      if (!s || s === "none" || s === "no" || s === "n/a" || s === "false" || s === "0") return false;
      if (s.includes("no bonus")) return false;
      return /\bbonus\b/i.test(s);
    }
    return false;
  };

  // If case answers exist and define otherPay/other_pay, prioritize them over local storage
  if (answers) {
    if (isBonusWord(answers.otherPay) || isBonusWord(answers.other_pay) || isBonusWord(answers.userAnswers?.otherPay)) {
      return true;
    }
    if (
      typeof answers.otherPay === "string" ||
      typeof answers.other_pay === "string" ||
      typeof answers.userAnswers?.otherPay === "string"
    ) {
      return false;
    }
  }

  // Fallback to local report inputs data (e.g. before remote case is loaded)
  if (data) {
    if (isBonusWord(data.otherPay) || isBonusWord(data.userAnswers?.otherPay)) {
      return true;
    }
    if (typeof data.otherPay === "string" && data.otherPay.trim().length > 0) {
      return false;
    }
  }

  return false;
}

