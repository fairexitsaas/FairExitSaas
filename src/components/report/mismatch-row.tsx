// Fix 4: when a typed answer and the documents disagree, ask "Which is right?"
"use client";
import { useState } from "react";

export type RowSource = "answers" | "letter" | "contract" | "agreement";
export interface CheckRow {
  value: unknown;
  source: RowSource;
  status?: string;
  doc_value?: unknown;
  user_value?: unknown;
  quote?: string;
  where?: string;
}
export type Rows = Record<string, CheckRow>;

export interface Mismatch {
  key: string;
  label: string;
  userValue: number | string;
  docValue: number | string;
  docSource: RowSource;
  quote?: string;
  where?: string;
}

/** How close two numbers must be to count as "the same". */
const RULES: Record<string, { label: string; kind: "money" | "whole" | "text"; tol?: number }> = {
  age: { label: "Your age", kind: "whole" },
  years_of_service: { label: "Years you worked there", kind: "whole" },
  annual_pay: { label: "Your yearly pay", kind: "money", tol: 0.02 },
  base_salary: { label: "Your yearly pay", kind: "money", tol: 0.02 },
  pay: { label: "Your yearly pay", kind: "money", tol: 0.02 },
  salary: { label: "Your yearly pay", kind: "money", tol: 0.02 },
  bonus: { label: "Your yearly bonus", kind: "money", tol: 0.02 },
  severance_offered: { label: "What they offered you", kind: "money", tol: 0.02 },
  notice_weeks: { label: "Weeks of notice", kind: "whole" },
  start_date: { label: "Your start date", kind: "text" },
  end_date: { label: "Your last day", kind: "text" },
};

function toNumber(v: unknown): number | null {
  if (typeof v === "number" && isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[$,\s]|CAD|USD/gi, ""));
    return v.trim() !== "" && isFinite(n) ? n : null;
  }
  return null;
}

function isEmpty(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}

/** Rows where the person's answer and the document disagree. */
export function findMismatches(rows: Rows): Mismatch[] {
  const out: Mismatch[] = [];
  for (const [key, row] of Object.entries(rows ?? {})) {
    if (!row || isEmpty(row.user_value) || isEmpty(row.doc_value)) continue;
    const rule = RULES[key] ?? { label: key.replace(/_/g, " "), kind: "text" as const };
    const u = toNumber(row.user_value);
    const d = toNumber(row.doc_value);
    let differs: boolean;
    if (rule.kind !== "text" && u !== null && d !== null) {
      if (rule.kind === "whole") differs = Math.round(u) !== Math.round(d);
      else differs = Math.abs(u - d) > (rule.tol ?? 0.02) * Math.max(Math.abs(u), Math.abs(d));
    } else {
      differs = String(row.user_value).trim().toLowerCase() !== String(row.doc_value).trim().toLowerCase();
    }
    if (!differs) continue;
    out.push({
      key,
      label: rule.label,
      userValue: (u ?? String(row.user_value)) as number | string,
      docValue: (d ?? String(row.doc_value)) as number | string,
      docSource: row.source === "answers" ? "letter" : row.source,
      quote: row.quote,
      where: row.where,
    });
  }
  return out;
}

/** Put the chosen values back into rows. The report reads rows[key].value. */
export function applyChoices(rows: Rows, choices: Record<string, "user" | "doc">): Rows {
  const next: Rows = { ...rows };
  for (const [key, pick] of Object.entries(choices)) {
    const r = rows[key];
    if (!r) continue;
    next[key] = pick === "user"
      ? { ...r, value: r.user_value, source: "answers", status: "confirmed_by_user" }
      : { ...r, value: r.doc_value, status: "confirmed_from_document" };
  }
  return next;
}

export function allChosen(mismatches: Mismatch[], choices: Record<string, "user" | "doc">): boolean {
  return mismatches.every(m => choices[m.key] === "user" || choices[m.key] === "doc");
}

const DOC_WORD: Record<RowSource, string> = {
  answers: "your answers", letter: "your letter", contract: "your contract", agreement: "your agreement",
};

function show(v: number | string, key: string): string {
  if (typeof v === "number" && RULES[key]?.kind === "money") {
    return "$" + v.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  return String(v);
}

/** One question: two big tap tiles. Nothing chosen at the start. */
export function MismatchRow(props: {
  m: Mismatch;
  choice?: "user" | "doc";
  onChoose: (key: string, pick: "user" | "doc") => void;
}) {
  const { m, choice, onChoose } = props;
  const tile = (pick: "user" | "doc", title: string, value: string, note?: string) => {
    const on = choice === pick;
    return (
      <button
        type="button"
        role="radio"
        aria-checked={on}
        onClick={() => onChoose(m.key, pick)}
        className={"fx-mm-tile" + (on ? " fx-mm-tile--on" : "")}
      >
        <span className="fx-mm-tile__title">{title}</span>
        <span className="fx-mm-tile__value">{value}</span>
        {note ? <span className="fx-mm-tile__note">{note}</span> : null}
      </button>
    );
  };
  return (
    <fieldset className="fx-mm">
      <legend className="fx-mm__q">{m.label}: which is right?</legend>
      <p className="fx-mm__help">What you told us and what {DOC_WORD[m.docSource]} says are different.</p>
      <div role="radiogroup" aria-label={`${m.label}: which is right?`} className="fx-mm__tiles">
        {tile("user", "What you told us", show(m.userValue, m.key))}
        {tile("doc", `What ${DOC_WORD[m.docSource]} says`, show(m.docValue, m.key),
          m.quote ? `"${m.quote}"${m.where ? ` (${m.where})` : ""}` : m.where)}
      </div>
    </fieldset>
  );
}

/** Inline mismatch card rendered directly inside a checklist item row. */
export function InlineMismatchPrompt(props: {
  mismatch: Mismatch;
  busy?: boolean;
  error?: string;
  onConfirm: (key: string, pick: "user" | "doc") => void;
}) {
  const [choice, setChoice] = useState<"user" | "doc" | undefined>(undefined);
  const { mismatch, busy, error, onConfirm } = props;
  return (
    <div className="fx-mm-inline" data-testid={`mismatch-inline-${mismatch.key}`}>
      {error ? (
        <div role="alert" className="fx-mm-inline__err">
          {error}
        </div>
      ) : null}
      <MismatchRow m={mismatch} choice={choice} onChoose={(_k, pick) => setChoice(pick)} />
      <button
        type="button"
        className="fx-mm-continue"
        disabled={busy || !choice}
        onClick={() => choice && onConfirm(mismatch.key, choice)}
      >
        {busy ? "Saving…" : "Continue"}
      </button>
    </div>
  );
}

/** Drop-in step: shows one mismatch at a time, Continue stays off until every one is picked. */
export function MismatchStep(props: { rows: Rows; busy?: boolean; onDone: (rows: Rows) => void }) {
  const mismatches = findMismatches(props.rows);
  const [choices, setChoices] = useState<Record<string, "user" | "doc">>({});
  const [i, setI] = useState(0);
  if (mismatches.length === 0) return null; // nothing to ask: caller just moves on
  const m = mismatches[Math.min(i, mismatches.length - 1)];
  const picked = !!choices[m.key];
  const last = i >= mismatches.length - 1;
  return (
    <div className="fx-mm-step">
      {mismatches.length > 1 ? <p className="fx-mm-step__count">{i + 1} of {mismatches.length}</p> : null}
      <MismatchRow m={m} choice={choices[m.key]} onChoose={(k, p) => setChoices(c => ({ ...c, [k]: p }))} />
      <button
        type="button"
        className="fx-mm-continue"
        disabled={props.busy || !picked || (last && !allChosen(mismatches, choices))}
        onClick={() => (last ? props.onDone(applyChoices(props.rows, choices)) : setI(i + 1))}
      >
        {props.busy && last ? "Saving…" : "Continue"}
      </button>
    </div>
  );
}
