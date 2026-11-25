import type { Rows, RowSource } from "@/components/report/mismatch-row";

export interface ExtractedDocValue {
  value: number;
  source: RowSource;
  quote?: string;
  where?: string;
}

interface RawFact {
  key?: string;
  value?: unknown;
  document?: string;
  quote?: string | null;
  where?: string | null;
}

function normalizeDocSource(doc?: string, isUS?: boolean): RowSource {
  if (doc === "contract") return "contract";
  if (doc === "agreement") return "agreement";
  if (doc === "letter") return isUS ? "agreement" : "letter";
  return isUS ? "agreement" : "letter";
}

function parsePositiveNum(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) && v > 0 ? v : null;
  if (typeof v === "string") {
    const cleaned = v.replace(/[$,\s]|CAD|USD/gi, "");
    const n = Number(cleaned);
    return cleaned !== "" && Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

function parseAgeNumber(raw: unknown): number | null {
  if (typeof raw === "number") {
    const r = Math.round(raw);
    return Number.isFinite(r) && r >= 16 && r <= 100 ? r : null;
  }
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^\d{2,3}$/.test(trimmed)) {
    const n = parseInt(trimmed, 10);
    return n >= 16 && n <= 100 ? n : null;
  }
  const m = trimmed.match(/\bage\s*(?:is|:|=)?\s*(\d{2})\b/i) || trimmed.match(/\b(\d{2})\s*(?:years?\s*old|yrs?\s*old|y\.?o\.?)\b/i) || trimmed.match(/^(\d{2})\b/);
  if (m) {
    const n = parseInt(m[1], 10);
    return n >= 16 && n <= 100 ? n : null;
  }
  return null;
}

const NON_ANNUAL_RE = /\b(per\s*hour|\/\s*h(?:ou)?r|hourly|per\s*week|\/\s*wk|weekly|per\s*month|\/\s*mo|monthly|bi-?weekly|semi-?monthly|per\s*day|daily)\b/i;
const ANNUAL_RE = /\b(per\s*year|\/\s*y(?:ea)?r|a\s*year|annual(?:ly)?|base\s*salary|salary)\b/i;

function parseAnnualDollarAmount(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) && raw > 0 ? raw : null;
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s) return null;
  if (NON_ANNUAL_RE.test(s) && !ANNUAL_RE.test(s)) return null;

  const matches = Array.from(s.matchAll(/\$\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(k|thousand)?/gi));
  if (matches.length > 0) {
    const last = matches[matches.length - 1];
    const base = parseFloat(last[1].replace(/,/g, ""));
    const mult = last[2] ? 1000 : 1;
    const val = Math.round(base * mult * 100) / 100;
    if (Number.isFinite(val) && val > 0) {
      if (!ANNUAL_RE.test(s) && val < 1000) return null;
      return val;
    }
  }
  const plain = s.match(/^\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(k)?\s*$/i);
  if (plain) {
    const val = parseFloat(plain[1].replace(/,/g, "")) * (plain[2] ? 1000 : 1);
    return Number.isFinite(val) && val >= 1000 ? val : null;
  }
  return null;
}

function docPriority(doc?: string): number {
  if (doc === "letter" || doc === "agreement") return 0;
  if (doc === "contract") return 1;
  return 2;
}

export function extractDocAge(facts: RawFact[] | undefined, isUS?: boolean): ExtractedDocValue | null {
  if (!Array.isArray(facts) || facts.length === 0) return null;

  const direct = facts
    .filter((f) => (f.key === "age_stated" || f.key === "age") && f.value != null && String(f.value).trim() !== "")
    .sort((a, b) => docPriority(a.document) - docPriority(b.document));

  for (const f of direct) {
    const n = parseAgeNumber(f.value);
    if (n !== null) {
      return {
        value: n,
        source: normalizeDocSource(f.document, isUS),
        quote: f.quote || undefined,
        where: f.where || undefined,
      };
    }
  }

  const otherFacts = facts.filter((f) => f.key === "other");
  for (const f of otherFacts) {
    const text = [f.value, f.quote].filter(Boolean).map(String).join(" ");
    const m = text.match(/\bage\s*(?:is|:|=)?\s*(\d{2})\b|\(\s*age\s+(\d{2})\s*\)/i);
    if (m) {
      const n = parseInt(m[1] || m[2], 10);
      if (n >= 16 && n <= 100) {
        return {
          value: n,
          source: normalizeDocSource(f.document, isUS),
          quote: f.quote || undefined,
          where: f.where || undefined,
        };
      }
    }
  }

  return null;
}

export function extractDocAnnualPay(facts: RawFact[] | undefined, isUS?: boolean): ExtractedDocValue | null {
  if (!Array.isArray(facts) || facts.length === 0) return null;

  const keyRank = (k?: string): number => {
    if (k === "annual_pay" || k === "base_salary" || k === "salary" || k === "pay") return 0;
    if (k === "pay_rate") return 1;
    return 9;
  };

  const candidates = facts
    .filter((f) => keyRank(f.key) < 9 && f.value != null && String(f.value).trim() !== "")
    .sort((a, b) => {
      const kr = keyRank(a.key) - keyRank(b.key);
      if (kr !== 0) return kr;
      return docPriority(a.document) - docPriority(b.document);
    });

  for (const f of candidates) {
    const n = parseAnnualDollarAmount(f.value);
    if (n !== null) {
      return {
        value: n,
        source: normalizeDocSource(f.document, isUS),
        quote: f.quote || undefined,
        where: f.where || undefined,
      };
    }
  }

  const otherFacts = facts.filter((f) => f.key === "other");
  for (const f of otherFacts) {
    const text = [f.value, f.quote].filter(Boolean).map(String).join(" ");
    const m = text.match(/(?:annual\s+(?:base\s+)?salary|base\s+salary)\s*(?:of|:)?\s*\$\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i);
    if (m) {
      const n = parseFloat(m[1].replace(/,/g, ""));
      if (Number.isFinite(n) && n >= 1000) {
        return {
          value: n,
          source: normalizeDocSource(f.document, isUS),
          quote: f.quote || undefined,
          where: f.where || undefined,
        };
      }
    }
  }

  return null;
}

export function buildMismatchRows(params: {
  answers?: Record<string, unknown> | null;
  data?: { age?: unknown; salary?: unknown } | null;
  facts?: RawFact[];
  checkRows?: Record<string, { status?: string | null; value?: unknown; user_value?: unknown; doc_value?: unknown }>;
  conflicts?: Array<{ key: string; document?: { value?: unknown; quote?: string | null; where?: string | null }; answers?: { value?: unknown } }>;
  isUS?: boolean;
}): Rows {
  const { answers, data, facts, checkRows, conflicts, isUS } = params;
  const rows: Rows = {};

  // 1. Age mismatch (skip if already resolved in checkRows)
  const ageResolved = Boolean(checkRows?.age?.status);
  if (!ageResolved) {
    const ageConflict = conflicts?.find((c) => c.key === "age");
    const typedAge = parseAgeNumber(answers?.age ?? data?.age ?? ageConflict?.answers?.value);
    const docAge = ageConflict?.document?.value != null
      ? (() => {
          const n = parseAgeNumber(ageConflict.document!.value);
          return n !== null
            ? {
                value: n,
                source: (isUS ? "agreement" : "letter") as RowSource,
                quote: ageConflict.document?.quote || undefined,
                where: ageConflict.document?.where || undefined,
              }
            : null;
        })()
      : extractDocAge(facts, isUS);

    if (typedAge !== null && docAge !== null) {
      rows.age = {
        value: typedAge,
        source: docAge.source,
        user_value: typedAge,
        doc_value: docAge.value,
        quote: docAge.quote,
        where: docAge.where,
      };
    }
  }

  // 2. Annual pay mismatch (skip if already resolved in checkRows)
  const payResolved = Boolean(checkRows?.pay?.status || checkRows?.annual_pay?.status);
  if (!payResolved) {
    const payConflict = conflicts?.find((c) => c.key === "pay" || c.key === "annual_pay");
    const rawAnsPay =
      answers?.salary ??
      (typeof answers?.pay === "number" || typeof answers?.pay === "string" ? answers.pay : undefined) ??
      data?.salary ??
      payConflict?.answers?.value;
    const typedPay = parsePositiveNum(rawAnsPay);
    const docPay = payConflict?.document?.value != null
      ? (() => {
          const n = parsePositiveNum(payConflict.document!.value);
          return n !== null
            ? {
                value: n,
                source: (isUS ? "agreement" : "letter") as RowSource,
                quote: payConflict.document?.quote || undefined,
                where: payConflict.document?.where || undefined,
              }
            : null;
        })()
      : extractDocAnnualPay(facts, isUS);

    if (typedPay !== null && docPay !== null) {
      rows.annual_pay = {
        value: typedPay,
        source: docPay.source,
        user_value: typedPay,
        doc_value: docPay.value,
        quote: docPay.quote,
        where: docPay.where,
      };
    }
  }

  return rows;
}
