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
  userAnswers?: Record<string, string>;
  fullState?: Record<string, unknown>;
  timestamp?: number;
}

const STORAGE_KEY = "fairexit_temp_report_inputs";

export const defaultMockReportInputs: ReportInputs = {
  country: "CA",
  province: "ON",
  provinceName: "Ontario",
  age: 52,
  years: 14,
  salary: 110000,
  offer: 24000,
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
  signByDays: "14 days from your last day",
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

