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

export const defaultMockUSReportInputs: ReportInputs = {
  country: "US",
  province: "US-CA",
  provinceName: "California",
  state: "California",
  age: 52,
  years: 9,
  salary: 110000,
  offer: undefined,
  role: "Middle management / Senior / Director",
  union: "No",
  employment: "Regular employee",
  signed: "No",
  federal: "No",
  payroll: "100+",
  otherPay: "None",
  newJob: "Not yet",
  minClause: "No",
  contract: "Signed · role changed",
  howEnded: "Laid off",
  market: "Some",
  flagged: "Nothing unusual",
  statutoryMin: 0,
  courtAwardLow: 0,
  courtAwardHigh: 0,
  noticeWeeks: 0,
  courtMonths: "—",
  signByDays: undefined,
  documentsExtracted: false,
};

export const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming"
] as const;

export const US_STATE_CODES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA",
  "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT",
  "VA", "WA", "WV", "WI", "WY"
] as const;

const US_STATE_SET_LOWER = new Set([
  ...US_STATES.map((s) => s.toLowerCase()),
  ...US_STATE_CODES.map((c) => c.toLowerCase()),
  ...US_STATE_CODES.map((c) => `us-${c.toLowerCase()}`),
]);

export function isUSState(val?: unknown): boolean {
  if (!val || typeof val !== "string") return false;
  const s = val.trim().toLowerCase();
  return US_STATE_SET_LOWER.has(s);
}

export function detectIsUS(opts?: {
  country?: unknown;
  cs?: any;
  data?: ReportInputs | null;
  searchParams?: URLSearchParams | null;
}): boolean {
  const { country, cs, data, searchParams } = opts || {};
  const countryStr = typeof country === "string" ? country.toUpperCase() : null;

  // 1. Explicit country override
  if (countryStr === "US") return true;

  // 2. Case from server
  if (cs?.country === "US") return true;
  if (cs?.jurisdiction?.country === "US") return true;
  if (typeof cs?.jurisdiction_code === "string" && cs.jurisdiction_code.toUpperCase().startsWith("US-")) return true;
  if (typeof cs?.region === "string" && (cs.region.toLowerCase().startsWith("us") || isUSState(cs.region))) return true;
  if (isUSState(cs?.answers?.usState) || isUSState(cs?.answers?.state)) return true;
  if (isUSState(cs?.jurisdiction?.name)) return true;

  // 3. Form / stored inputs
  if (data?.country === "US") return true;
  if (typeof data?.province === "string" && data.province.toLowerCase().startsWith("us")) return true;
  if (isUSState(data?.state)) return true;
  if (isUSState(data?.provinceName)) return true;
  if (isUSState((data?.fullState as any)?.usState) || isUSState((data?.fullState as any)?.state)) return true;

  // 4. URL parameters
  if (searchParams) {
    const cParam = searchParams.get("country")?.toUpperCase();
    if (cParam === "US") return true;
    if (searchParams.get("st") || searchParams.get("state")) return true;
  } else if (typeof window !== "undefined") {
    try {
      const sp = new URLSearchParams(window.location.search);
      const cParam = sp.get("country")?.toUpperCase();
      if (cParam === "US") return true;
      if (sp.get("st") || sp.get("state")) return true;
    } catch {}
  }

  // 5. Browser storage
  if (typeof window !== "undefined") {
    try {
      const localCountry = (
        localStorage.getItem("fairexit_country") ||
        localStorage.getItem("fx_country")
      )?.toUpperCase();
      if (localCountry === "US") return true;

      const raw = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed.country === "US" ||
          isUSState(parsed.state) ||
          isUSState(parsed.provinceName) ||
          isUSState(parsed.fullState?.usState)
        ) {
          return true;
        }
      }
    } catch {}
  }

  return false;
}

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
      const parsed = JSON.parse(fromSession);
      const fallback = parsed?.country === "US" || isUSState(parsed?.state) ? defaultMockUSReportInputs : defaultMockReportInputs;
      return { ...fallback, ...parsed };
    }
    const fromLocal = localStorage.getItem(STORAGE_KEY);
    if (fromLocal) {
      const parsed = JSON.parse(fromLocal);
      const fallback = parsed?.country === "US" || isUSState(parsed?.state) ? defaultMockUSReportInputs : defaultMockReportInputs;
      return { ...fallback, ...parsed };
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

