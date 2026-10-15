/* ============================================================================
   FairExit — Severance Rulebook + Engine (Canada + US)
   Ported for Next.js TypeScript support
   ========================================================================== */

export interface TerminationTableRow {
  minYears: number;
  weeks: number;
}

export interface SeveranceConfig {
  minYears: number;
  minPayrollGlobal: number;
  perYearWeeks: number;
  maxWeeks: number;
}

export interface JurisdictionRule {
  code: string;
  country: "CA" | "US";
  name: string;
  status: "live" | "ready" | "planned";
  commonLaw: boolean;
  strategy: "ontario" | "weeksTable" | "federalCA" | "usNone" | "usPerYear" | null;
  terminationTable?: TerminationTableRow[];
  severance?: SeveranceConfig;
  perYearWeeks?: number;
  intake?: string[];
  note?: string;
}

function weeksFromTable(table: TerminationTableRow[] = [], years: number): number {
  let w = 0;
  for (let i = 0; i < table.length; i++) {
    if (years >= table[i].minYears) w = table[i].weeks;
  }
  return w;
}

const STRATEGIES = {
  ontario: (rule: JurisdictionRule, inp: { years: number; payrollGlobal: number }) => {
    const term = weeksFromTable(rule.terminationTable, inp.years);
    let sev = 0;
    const s = rule.severance;
    if (s && inp.years >= s.minYears && inp.payrollGlobal >= s.minPayrollGlobal) {
      sev = Math.min(s.maxWeeks, inp.years * s.perYearWeeks);
    }
    return { terminationWeeks: term, severanceWeeks: sev, weeks: term + sev, exact: true };
  },
  weeksTable: (rule: JurisdictionRule, inp: { years: number }) => {
    const w = weeksFromTable(rule.terminationTable, inp.years);
    return { terminationWeeks: w, severanceWeeks: 0, weeks: w, exact: true };
  },
  federalCA: (rule: JurisdictionRule, inp: { years: number }) => {
    const term = weeksFromTable(rule.terminationTable, inp.years);
    let sev = 0;
    if (inp.years >= 1) {
      sev = Math.max(5, 2 * Math.floor(inp.years)) / 5;
    }
    return { terminationWeeks: term, severanceWeeks: sev, weeks: term + sev, exact: true };
  },
  usNone: () => {
    return { terminationWeeks: 0, severanceWeeks: 0, weeks: 0, exact: true, none: true };
  },
  usPerYear: (rule: JurisdictionRule, inp: { years: number }) => {
    const w = Math.floor(inp.years) * (rule.perYearWeeks || 1);
    return { terminationWeeks: 0, severanceWeeks: w, weeks: w, exact: true };
  },
};

function commonLawMonths(inp: { age?: number; years?: number; roleFactor?: number }) {
  let m = (inp.years || 0) * 1.0;
  const age = inp.age || 0;
  if (age >= 55) m += 3;
  else if (age >= 50) m += 2;
  else if (age >= 45) m += 1;
  m *= inp.roleFactor || 1;
  m = Math.min(24, m);
  const low = Math.max(1, Math.round(m * 0.8));
  const high = Math.min(24, Math.round(m * 1.15));
  return { lowMonths: low, highMonths: Math.max(low, high) };
}

function stub(code: string, name: string): JurisdictionRule {
  return {
    code,
    country: "CA",
    name,
    status: "planned",
    commonLaw: true,
    strategy: "weeksTable",
    terminationTable: [
      { minYears: 0.25, weeks: 1 },
      { minYears: 1, weeks: 2 },
      { minYears: 3, weeks: 3 },
      { minYears: 5, weeks: 5 },
      { minYears: 8, weeks: 8 },
    ],
    intake: ["age", "years", "salary", "role"],
    note: "Statutory table TBD — structurally similar to BC/AB.",
  };
}

export const RULES: Record<string, JurisdictionRule> = {
  "CA-ON": {
    code: "CA-ON",
    country: "CA",
    name: "Ontario",
    status: "live",
    commonLaw: true,
    strategy: "ontario",
    terminationTable: [
      { minYears: 0.25, weeks: 1 },
      { minYears: 1, weeks: 2 },
      { minYears: 3, weeks: 3 },
      { minYears: 4, weeks: 4 },
      { minYears: 5, weeks: 5 },
      { minYears: 6, weeks: 6 },
      { minYears: 7, weeks: 7 },
      { minYears: 8, weeks: 8 },
    ],
    severance: { minYears: 5, minPayrollGlobal: 2500000, perYearWeeks: 1, maxWeeks: 26 },
    intake: ["age", "years", "salary", "role", "payrollGlobal"],
    note: "Termination pay (max 8 wks) + severance pay (max 26 wks) if 5+ yrs AND GLOBAL payroll ≥ $2.5M.",
  },
  "CA-BC": {
    code: "CA-BC",
    country: "CA",
    name: "British Columbia",
    status: "ready",
    commonLaw: true,
    strategy: "weeksTable",
    terminationTable: [
      { minYears: 0.25, weeks: 1 },
      { minYears: 1, weeks: 2 },
      { minYears: 3, weeks: 3 },
      { minYears: 4, weeks: 4 },
      { minYears: 5, weeks: 5 },
      { minYears: 6, weeks: 6 },
      { minYears: 7, weeks: 7 },
      { minYears: 8, weeks: 8 },
    ],
    intake: ["age", "years", "salary", "role"],
    note: "ESA compensation for length of service, max 8 wks. Common law applies.",
  },
  "CA-AB": {
    code: "CA-AB",
    country: "CA",
    name: "Alberta",
    status: "ready",
    commonLaw: true,
    strategy: "weeksTable",
    terminationTable: [
      { minYears: 0.247, weeks: 1 },
      { minYears: 2, weeks: 2 },
      { minYears: 4, weeks: 4 },
      { minYears: 6, weeks: 5 },
      { minYears: 8, weeks: 6 },
      { minYears: 10, weeks: 8 },
    ],
    intake: ["age", "years", "salary", "role"],
    note: "Employment Standards Code termination pay, max 8 wks. Common law applies.",
  },
  "CA-FED": {
    code: "CA-FED",
    country: "CA",
    name: "Federally regulated (banks, telecom, air, rail)",
    status: "ready",
    commonLaw: true,
    strategy: "federalCA",
    terminationTable: [
      { minYears: 0.25, weeks: 2 },
      { minYears: 3, weeks: 3 },
      { minYears: 4, weeks: 4 },
      { minYears: 5, weeks: 5 },
      { minYears: 6, weeks: 6 },
      { minYears: 7, weeks: 7 },
      { minYears: 8, weeks: 8 },
    ],
    intake: ["age", "years", "salary", "role", "federalRegulated"],
    note: "Canada Labour Code: graduated notice + severance = greater of 2 days/yr or 5 days.",
  },
  "CA-QC": {
    code: "CA-QC",
    country: "CA",
    name: "Quebec",
    status: "planned",
    commonLaw: false,
    strategy: null,
    intake: ["age", "years", "salary", "role"],
    note: "Civil-law regime; NOT common-law.",
  },
  "CA-MB": stub("CA-MB", "Manitoba"),
  "CA-SK": stub("CA-SK", "Saskatchewan"),
  "CA-NS": stub("CA-NS", "Nova Scotia"),
  "CA-NB": stub("CA-NB", "New Brunswick"),
  "CA-PE": stub("CA-PE", "Prince Edward Island"),
  "CA-NL": stub("CA-NL", "Newfoundland and Labrador"),
  "CA-NT": stub("CA-NT", "Northwest Territories"),
  "CA-YT": stub("CA-YT", "Yukon"),
  "CA-NU": stub("CA-NU", "Nunavut"),
};

export interface EstimateInput {
  age?: number;
  years?: number;
  salary?: number;
  roleFactor?: number;
  payrollGlobal?: number;
  offered?: number;
}

export interface EstimateResult {
  code: string;
  name: string;
  country: "CA" | "US";
  status: "live" | "ready" | "planned";
  live: boolean;
  commonLawApplies: boolean;
  weekly: number;
  monthly: number;
  statutory: {
    weeks: number;
    terminationWeeks: number;
    severanceWeeks: number;
    amount: number;
    exact: boolean;
    none?: boolean;
  } | null;
  commonLaw: {
    lowMonths: number;
    highMonths: number;
    lowAmount: number;
    highAmount: number;
  } | null;
  note?: string;
}

export function estimate(code: string, inp: EstimateInput = {}): EstimateResult {
  const rule = RULES[code] || stub(code, code);
  const salary = +inp.salary! || 0;
  const years = +inp.years! || 0;
  const weekly = salary / 52;
  const monthly = salary / 12;

  const out: EstimateResult = {
    code: rule.code,
    name: rule.name,
    country: rule.country,
    status: rule.status,
    live: rule.status === "live",
    commonLawApplies: !!rule.commonLaw,
    weekly,
    monthly,
    statutory: null,
    commonLaw: null,
    note: rule.note,
  };

  if (rule.strategy && STRATEGIES[rule.strategy]) {
    const st = (STRATEGIES[rule.strategy] as any)(rule, {
      years,
      payrollGlobal: +inp.payrollGlobal! || 0,
    });
    out.statutory = {
      weeks: st.weeks,
      terminationWeeks: st.terminationWeeks,
      severanceWeeks: st.severanceWeeks,
      amount: Math.round(weekly * st.weeks),
      exact: !!st.exact,
      none: !!st.none,
    };
  }

  if (rule.commonLaw) {
    const cm = commonLawMonths({
      age: +inp.age! || 0,
      years,
      roleFactor: +inp.roleFactor! || 1,
    });
    out.commonLaw = {
      lowMonths: cm.lowMonths,
      highMonths: cm.highMonths,
      lowAmount: Math.round(monthly * cm.lowMonths),
      highAmount: Math.round(monthly * cm.highMonths),
    };
  }

  return out;
}

export const FairExitRules = {
  version: "0.1.0",
  lastUpdated: "2026-08-11",
  rules: RULES,
  estimate,
  commonLawMonths,
};
