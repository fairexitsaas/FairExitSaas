"use client";
"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useRef, useState } from "react";
import NextLink from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { fairexit, caseStore, FairExitApiError } from "@/lib/api/fairexit";
import { useErrorModal } from "@/context/ErrorModalContext";
import { notifyError, notifySuccess } from "@/lib/notifications";
import AskLawyerModal from "@/components/dialogs/AskLawyerModal";
import ReportSalesPage from "@/components/report/ReportSalesPage";
import ReportUploadPage from "@/components/report/ReportUploadPage";
import ReadingLetterPage from "@/components/report/reading/ReadingLetterPage";
import CanadaReviewPage from "@/components/report/ca/CanadaReviewPage";
import USReviewPage from "@/components/report/us/USReviewPage";
import PaidReportReadyPage from "@/components/report/PaidReportReadyPage";

/* ── palette (same tokens as the prototype) ── */
const C = {
  navy: "#062c55", green: "#0eb28d", greend: "#0c8f72", cream: "#f6f4ef", line: "#e7e4dd",
  slate: "#5a6b78", ink: "#17242f", amber: "#b07a00", amberbg: "#fbf3df", violet: "#6b4bbf", violetbg: "#f3effc", red: "#d42e2b",
};

function errText(e: unknown) {
  return e instanceof FairExitApiError ? e.message : e instanceof Error ? e.message : "Something went wrong";
}

function Card({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <div className={`bg-white border border-[#e7e4dd] rounded-2xl p-5 ${className}`} style={style}>{children}</div>;
}
function Kicker({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#0c8f72] mb-1">{children}</div>;
}
function H1({ children }: { children: React.ReactNode }) {
  return <h1 className="font-serif text-[30px] leading-tight text-[#062c55] font-semibold mb-2">{children}</h1>;
}
function Btn({ children, onClick, disabled, kind = "pri", className = "", type = "button" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; kind?: "pri" | "o" | "link"; className?: string; type?: "button" | "submit" }) {
  const k = kind === "pri"
    ? "bg-[#0eb28d] text-[#04291f] border-[#0eb28d] hover:bg-[#0c8f72] hover:text-white"
    : kind === "o" ? "bg-white text-[#062c55] border-[#d5dde4] hover:border-[#0eb28d]" : "bg-transparent border-transparent text-[#0c8f72] underline px-1";
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`min-h-[44px] px-4 rounded-xl border font-bold text-[14px] transition disabled:opacity-45 disabled:cursor-not-allowed ${k} ${className}`}>
      {children}
    </button>
  );
}
function Spinner({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 text-[#062c55] font-semibold">
      <span className="inline-block w-5 h-5 rounded-full border-[3px] border-[#c7e6d6] border-t-[#0eb28d] animate-spin" />
      {text}
    </div>
  );
}
function ErrorBox({ text }: { text: string }) {
  if (!text) return null;
  return <div role="alert" className="mt-3 rounded-xl bg-[#fbeceb] text-[#a3231f] px-3 py-2 text-[13.5px]">{text}</div>;
}

/* ── semicircle gauge, same drawing as app-proto/app.js gauge() ── */
function Gauge({ frac }: { frac: number }) {
  const cx = 110, cy = 106, r = 86, sw = 14;
  const pt = (f: number, rad: number) => { const t = Math.PI * (1 - f); return [cx + rad * Math.cos(t), cy - rad * Math.sin(t)]; };
  const arc = (f0: number, f1: number, col: string, k: number) => {
    const p0 = pt(f0, r), p1 = pt(f1, r);
    return <path key={k} d={`M${p0[0].toFixed(2)} ${p0[1].toFixed(2)} A${r} ${r} 0 0 1 ${p1[0].toFixed(2)} ${p1[1].toFixed(2)}`} stroke={col} strokeWidth={sw} fill="none" strokeLinecap="round" />;
  };
  const g = 0.075;
  const segs: [number, number, string][] = [[0, 1 / 3, "#e0574a"], [1 / 3, 2 / 3, "#eeb33c"], [2 / 3, 1, "#1fb487"]];
  const n = pt(frac, r - 26);
  return (
    <svg width="220" height="122" viewBox="0 0 220 122" className="block mx-auto mt-2" aria-hidden>
      {segs.map((s, i) => arc(s[0] + (i ? g / 2 : 0.02), s[1] - (i < 2 ? g / 2 : 0.02), s[2], i))}
      <line x1={cx} y1={cy} x2={n[0].toFixed(2)} y2={n[1].toFixed(2)} stroke={C.navy} strokeWidth="3.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="8" fill={C.navy} /><circle cx={cx} cy={cy} r="3" fill="#fff" />
    </svg>
  );
}

const money = (n: number, country: string) => "$" + Math.round(n).toLocaleString(country === "US" ? "en-US" : "en-CA");

/* =========================================================================
   Main
   ========================================================================= */
export default function ReportFlow() {
  const { showErrorModal } = useErrorModal();
  const router = useRouter();
  const sp = useSearchParams();
  const [caseId, setCaseId] = useState<string | null>(() => sp?.get("case") || null);
  const [cs, setCs] = useState<any>(null);
  const [cfg, setCfg] = useState<any>(null);
  const [view, setView] = useState<string | null>(null); // local override, e.g. "upload" for "Add a clearer copy"
  const [error, setError] = useState("");
  const [lawyerOpen, setLawyerOpen] = useState(false);

  // resolve the case from ?case=&t= (email link) or the last case in this browser
  useEffect(() => {
    const t = sp?.get("t");
    const fromUrl = sp?.get("case");
    if (fromUrl && t) caseStore.set(fromUrl, t);
    if (!fromUrl) {
      const last = caseStore.last(); // reopen the last report in this browser
      if (last) queueMicrotask(() => setCaseId(last));
    }
    fairexit.config().then(setCfg).catch(() => undefined);
  }, [sp]);

  const refresh = useCallback(async () => {
    if (!caseId) return;
    try {
      setCs(await fairexit.getCase(caseId));
      setError("");
    } catch (e) {
      setError(errText(e));
    }
  }, [caseId]);

  // Stripe redirect back: confirm the payment, then load the case
  useEffect(() => {
    if (!caseId) return;
    const sessionId = sp?.get("session_id");
    (async () => {
      if (sessionId) {
        try { await fairexit.stripeConfirm(caseId, { sessionId }); } catch (e) { setError(errText(e)); }
      }
      await refresh();
    })();
  }, [caseId, sp, refresh]);

  const urlStep = sp?.get("step");
  const step = view || urlStep || cs?.nextStep;
  const country = cs?.country || "CA";
  const words = cs?.jurisdiction?.words || (country === "US"
    ? { lawyer: "attorney", region: "state", letter: "separation agreement", contract: "offer letter or employment contract" }
    : { lawyer: "lawyer", region: "province", letter: "severance letter", contract: "employment contract" });

  const handlePaySuccess = async (newCaseId?: string) => {
    const id = newCaseId || caseId;
    if (id) {
      setCaseId(id);
      try {
        const c = await fairexit.getCase(id);
        setCs(c);
      } catch (e) {
        console.warn("Could not load case", e);
      }
    }
    setView("upload");
    router.push(`/report?step=upload${id ? `&case=${id}` : ""}`);
  };

  // If jurisdiction is genuinely not covered (e.g. Quebec), show the not covered screen
  if (cs && !cs.covered && (cs.answers?.province === "QC" || cs.answers?.province === "Quebec")) {
    return (
      <div className="min-h-screen bg-[#F6F4EF] flex items-center justify-center p-4">
        <div className="bg-white border border-[#E7E4DD] rounded-2xl p-8 max-w-[500px] text-center shadow-lg">
          <h1 className="font-serif text-[28px] text-[#062C55] font-semibold mb-3">Not covered yet</h1>
          <p className="text-[#5A6B78] text-[15px] leading-relaxed mb-6">
            FairExit doesn&apos;t cover {cs.freeResult?.name || "Quebec"} yet. We currently support Canadian common-law provinces and all 50 US states.
          </p>
          <NextLink
            href="/"
            className="inline-block px-6 py-3 rounded-xl bg-[#0EB28D] text-white font-bold text-[14px] hover:bg-[#0C8F72] transition"
          >
            Back to home
          </NextLink>
        </div>
      </div>
    );
  }

  // Allow post-pay steps (upload, reading, review, ready) directly during testing
  const isPostPayStep = step === "upload" || view === "upload" || step === "reading" || view === "reading" || step === "review" || view === "review" || step === "ready" || view === "ready";
  if ((urlStep === "pay" || step === "pay") && !isPostPayStep) {
    return (
      <ReportSalesPage
        caseId={caseId}
        cs={cs}
        cfg={cfg}
        onPaySuccess={handlePaySuccess}
      />
    );
  }

  // If on upload step (post payment), show the Figma 1200px/390px upload screen
  if (step === "upload" || view === "upload") {
    return (
      <ReportUploadPage
        caseId={caseId}
        cs={cs}
        onContinue={async () => {
          setView("reading");
        }}
      />
    );
  }

  // Loading / Reading state after submission (COMMON / Reading your letter)
  if (step === "reading" || view === "reading") {
    return (
      <ReadingLetterPage
        caseId={caseId}
        cs={cs}
        onDone={() => {
          setView("review");
        }}
      />
    );
  }

  // Country-specific flow after reading state
  if (step === "review" || view === "review") {
    if (country === "US") {
      return (
        <USReviewPage
          caseId={caseId}
          cs={cs}
          onContinue={() => {
            setView("ready");
            refresh();
          }}
        />
      );
    }
    return (
      <CanadaReviewPage
        caseId={caseId}
        cs={cs}
        onContinue={() => {
          setView("ready");
          refresh();
        }}
      />
    );
  }

  // Report Ready or Building state (COMMON / Paid · report ready (PDF))
  if (step === "ready" || view === "ready" || step === "building" || view === "building") {
    return (
      <PaidReportReadyPage
        caseId={caseId}
        cs={cs}
        onDone={refresh}
      />
    );
  }

  return (
    <Shell rail={step}>
      <ErrorBox text={error} />
      {step === "not_covered" && (
        <Card><H1>Not covered yet</H1><p className="text-[#5a6b78]">FairExit doesn&apos;t cover {cs.freeResult?.name || "this region"} yet.</p></Card>
      )}
      {step === "pay" && <PayStep cs={cs} cfg={cfg} onDone={refresh} />}
      {step === "upload" && <UploadStep cs={cs} words={words} onRead={async () => { setView(null); await refresh(); }} />}
      {step === "reading" && (
        <Card><Kicker>Step 2 of 4</Kicker><H1>Reading your documents…</H1><Spinner text="This usually takes under a minute." />
          <p className="text-[13px] text-[#5a6b78] mt-3">You can leave this page; your progress is saved.</p></Card>
      )}
      {step === "check" && <CheckStep cs={cs} words={words} onAddClearerCopy={() => setView("upload")} onBuilt={() => { setView("building"); void refresh(); }} />}
      {step === "building" && (
        <Card><Kicker>Step 4 of 4</Kicker><H1>Building your report…</H1><Spinner text="This takes a minute or two." />
          <p className="text-[13px] text-[#5a6b78] mt-3">We&apos;ll also email it to {cs.email || "you"}.</p></Card>
      )}
      {step === "ready" && <ReadyStep cs={cs} caseId={caseId || cs.id || ""} words={words} onLawyer={() => setLawyerOpen(true)} />}
      {cs.status === "failed" && (
        <Card className="mt-4" style={{ borderLeft: `4px solid ${C.red}` }}>
          <b className="text-[#062c55]">{cs.statusDetail === "build_failed" ? "We couldn't build your report." : "We couldn't read your documents."}</b>
          <p className="text-[13.5px] text-[#5a6b78] mt-1">
            {cs.statusDetail === "build_failed" ? "Your confirmed details are saved. Try again below." : "Add a clearer copy (a PDF or a flat, well-lit photo) and try again."}
          </p>
          {cs.statusDetail === "build_failed" && <Btn className="mt-3" onClick={async () => { try { if (caseId || cs.id) await fairexit.buildReport(caseId || cs.id); await refresh(); } catch (e) { setError(errText(e)); } }}>Try again</Btn>}
        </Card>
      )}
      <AskLawyerModal isOpen={lawyerOpen} onClose={() => setLawyerOpen(false)} country={country} regionName={cs.jurisdiction?.name} caseId={caseId || undefined} />
    </Shell>
  );
}

function Shell({ children, rail }: { children: React.ReactNode; rail?: string }) {
  const steps = [["pay", "Pay"], ["upload", "Add documents"], ["check", "Check"], ["ready", "Your report"]];
  const idx = rail === "reading" ? 1 : rail === "building" ? 3 : steps.findIndex((s) => s[0] === rail);
  return (
    <div className="min-h-screen bg-[#f6f4ef] text-[#17242f] font-sans antialiased pb-24">
      <header className="sticky top-0 z-30 bg-[#f6f4ef]/95 backdrop-blur-md border-b border-[#e7e4dd]">
        <div className="max-w-[760px] mx-auto px-4 py-3 flex items-center justify-between">
          <NextLink href="/" className="font-extrabold text-[#062c55] text-[18px]">FairExit</NextLink>
          {rail && idx >= 0 && (
            <ol className="hidden sm:flex gap-3 text-[12px] font-bold">
              {steps.map((s, i) => <li key={s[0]} className={i < idx ? "text-[#0c8f72]" : i === idx ? "text-[#062c55]" : "text-[#9aa7b2]"}>{i < idx ? "✓ " : ""}{s[1]}</li>)}
            </ol>
          )}
        </div>
      </header>
      <main className="max-w-[760px] mx-auto px-4 pt-6">{children}</main>
    </div>
  );
}

/* =========================================================================
   Pay $59
   ========================================================================= */
function PayStep({ cs, cfg, onDone }: { cs: any; cfg: any; onDone: () => void }) {
  const [email, setEmail] = useState(cs.email || "");
  const [terms, setTerms] = useState(false);
  const [remind, setRemind] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const cur = cs.country === "US" ? "USD" : "CAD";
  const mock = cfg?.payments?.mode === "mock";

  async function pay() {
    if (!/.+@.+\..+/.test(email)) return setErr("Enter a valid email so we can send your report.");
    if (!terms) return setErr("Tick the box to accept the terms.");
    setBusy(true); setErr("");
    try {
      await fairexit.prepareCheckout(cs.id, { email, remind, termsAccepted: true });
      if (mock) {
        await fairexit.mockPay(cs.id);
        onDone();
      } else {
        const back = `${window.location.origin}/report?case=${cs.id}`;
        const r = await fairexit.stripeCheckout(cs.id, { successUrl: back, cancelUrl: back });
        if (r.url) window.location.assign(r.url);
      }
    } catch (e) { setErr(errText(e)); setBusy(false); }
  }

  return (
    <Card>
      <Kicker>Severance Report · $59 {cur}</Kicker>
      <H1>Get your Severance Report</H1>
      <p className="text-[#5a6b78] text-[14.5px] mb-4">$59 plus applicable tax, one time. Next you add your {cs.jurisdiction?.words?.letter || "letter"} and contract, check what we read, and we build your report (PDF).</p>
      <label className="block text-[13px] font-bold text-[#062c55] mb-1" htmlFor="ppEmail">Email for your receipt and report</label>
      <input id="ppEmail" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)}
        className="w-full min-h-[44px] rounded-xl border border-[#d5dde4] px-3 mb-3" placeholder="you@example.com" />
      <label className="flex gap-2 text-[13.5px] mb-2 items-start"><input type="checkbox" className="mt-1" checked={remind} onChange={(e) => setRemind(e.target.checked)} /> Remind me before my deadline</label>
      <label className="flex gap-2 text-[13.5px] mb-4 items-start"><input type="checkbox" className="mt-1" checked={terms} onChange={(e) => setTerms(e.target.checked)} /> I agree to the <NextLink href="/legal" className="underline text-[#0c8f72]">terms and privacy policy</NextLink>. FairExit gives information, not legal advice.</label>
      <Btn onClick={pay} disabled={busy} className="w-full">{busy ? "Working…" : `Pay $59.00 ${cur} + applicable tax →`}</Btn>
      {mock && <p className="text-[12px] text-[#b07a00] mt-2">Test mode: no card is charged (PAYMENTS_MODE=mock).</p>}
      <ErrorBox text={err} />
    </Card>
  );
}

/* =========================================================================
   Upload (only two documents)
   ========================================================================= */
function UploadStep({ cs, words, onRead }: { cs: any; words: any; onRead: () => void }) {
  const [docs, setDocs] = useState<any>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const load = useCallback(async () => setDocs(await fairexit.documents(cs.id)), [cs.id]);
  useEffect(() => { fairexit.documents(cs.id).then(setDocs).catch((e) => setErr(errText(e))); }, [cs.id]);

  async function add(kind: "letter" | "contract", files: FileList | null) {
    if (!files?.length) return;
    setErr("");
    for (const f of Array.from(files)) {
      if (/heic|heif/i.test(f.type) || /\.heic$/i.test(f.name)) { setErr("iPhone HEIC photos aren't supported here. Export as JPEG or use a PDF."); continue; }
      setBusy(`Uploading ${f.name}…`);
      try { await fairexit.uploadFile(cs.id, kind, f); } catch (e) { setErr(errText(e)); }
    }
    setBusy("");
    await load();
  }
  async function remove(id: string) { try { setDocs(await fairexit.removeDocument(cs.id, id)); } catch (e) { setErr(errText(e)); } }
  async function noContract(status: "never" | "missing") { try { await fairexit.setContractStatus(cs.id, status); await load(); } catch (e) { setErr(errText(e)); } }
  async function read() { setBusy("Starting…"); try { await fairexit.startRead(cs.id); onRead(); } catch (e) { setErr(errText(e)); setBusy(""); } }

  const list = (kind: string) => (docs?.documents || []).filter((d: any) => d.kind === kind && d.status === "uploaded");
  const slot = (kind: "letter" | "contract", title: string) => (
    <Card className="mb-3">
      <div className="flex items-center justify-between mb-2">
        <b className="text-[#062c55] capitalize">{title}</b>
        <span className={`text-[11px] font-extrabold uppercase ${list(kind).length ? "text-[#0c8f72]" : "text-[#b07a00]"}`}>{list(kind).length ? "✓ Added" : kind === "contract" && docs?.contractStatus && docs.contractStatus !== "added" ? (docs.contractStatus === "never" ? "Never signed one" : "Not added") : "Needed"}</span>
      </div>
      {list(kind).map((d: any) => (
        <div key={d.id} className="flex justify-between text-[13.5px] py-1 border-t border-[#f0ede6]">
          <span>Page {d.page} · {d.fileName || d.mimeType}</span>
          <button className="text-[#a3231f] underline text-[12.5px]" onClick={() => remove(d.id)}>Remove</button>
        </div>
      ))}
      <label className="inline-flex mt-2 min-h-[44px] items-center px-4 rounded-xl border border-[#d5dde4] font-bold text-[14px] text-[#062c55] cursor-pointer hover:border-[#0eb28d]">
        {list(kind).length ? "Add another page" : "Add a file or photo"}
        <input type="file" className="hidden" multiple accept="application/pdf,image/jpeg,image/png,image/webp,text/plain" onChange={(e) => { add(kind, e.target.files); e.target.value = ""; }} />
      </label>
    </Card>
  );

  return (
    <div>
      <Kicker>Step 1 of 4 · Add your documents</Kicker>
      <H1>Add your {words.letter} and contract</H1>
      <p className="text-[#5a6b78] text-[14.5px] mb-4">PDF or clear photos (one file per page). Your documents are never sent to a {words.lawyer} and are deleted 30 days after your report is ready.</p>
      {slot("letter", `Your ${words.letter}`)}
      {slot("contract", `Your ${words.contract}`)}
      {!list("contract").length && (
        <Card className="mb-3">
          <b className="text-[#062c55]">No employment contract?</b>
          <div className="flex flex-wrap gap-2 mt-2">
            <Btn kind="o" onClick={() => noContract("never")}>I never signed one</Btn>
            <Btn kind="o" onClick={() => noContract("missing")}>I signed one but can&apos;t add it / not sure</Btn>
          </div>
        </Card>
      )}
      {busy && <div className="my-3"><Spinner text={busy} /></div>}
      <ErrorBox text={err} />
      <Btn className="w-full mt-2" disabled={!docs?.canRead || !!busy} onClick={read}>
        {list("letter").length && list("contract").length ? "Continue — both added →" : docs?.contractStatus === "never" ? "Continue — no written contract →" : docs?.contractStatus === "missing" ? "Continue — contract not added →" : "Add both to continue"}
      </Btn>
    </div>
  );
}

/* =========================================================================
   Step 8 · Check everything your report will use (server-driven)
   ========================================================================= */
function CheckStep({ cs, words, onAddClearerCopy, onBuilt }: { cs: any; words: any; onAddClearerCopy: () => void; onBuilt: () => void }) {
  const { showErrorModal } = useErrorModal();
  const [page, setPage] = useState<any>(null);
  const [busyKey, setBusyKey] = useState<string>("");
  const [buildPending, setBuildPending] = useState(false);
  const [err, setErr] = useState("");
  const buildPendingRef = useRef(false);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => { fairexit.checkPage(cs.id).then(setPage).catch((e) => setErr(errText(e))); }, [cs.id]);

  async function act(key: string, action: string, extra: { value?: unknown; agreed?: boolean } = {}) {
    setBusyKey(key + ":" + action); setErr("");
    try { const r = await fairexit.rowAction(cs.id, key, action, extra); setPage(r.page); } catch (e) { setErr(errText(e)); }
    setBusyKey("");
  }
  async function resolve(key: string, choice: "document" | "answers" | "other" | "not_sure", value?: unknown) {
    setBusyKey(key + ":conflict"); setErr("");
    try { setPage(await fairexit.resolveConflict(cs.id, key, choice, value)); } catch (e) { setErr(errText(e)); }
    setBusyKey("");
  }
  async function attest(on: boolean) {
    if (!on) return;
    try { setPage(await fairexit.attest(cs.id)); } catch (e) { setErr(errText(e)); }
  }
  async function build() {
    if (buildPendingRef.current) return;
    if (!page.build.enabled) {
      const k = page.build.firstUnconfirmedKey;
      if (k && rowRefs.current[k]) rowRefs.current[k]!.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    buildPendingRef.current = true;
    setBuildPending(true);
    setErr("");
    try {
      await fairexit.buildReport(cs.id);
      onBuilt();
    } catch (e: unknown) {
      const apiErr = e instanceof FairExitApiError ? e : new FairExitApiError(0, errText(e));
      setErr(apiErr.message);
      showErrorModal({
        title: "Report Generation Failed",
        message: apiErr.message,
        stage: "Report Generation",
        statusCode: apiErr.status,
        requestId: apiErr.requestId,
        onRetry: build,
        retryLabel: "Try Again",
      });
      buildPendingRef.current = false;
      setBuildPending(false);
    }
  }

  if (!page) return err ? <ErrorBox text={err} /> : <Spinner text="Loading what we read…" />;
  const pct = page.counter.total ? Math.round((page.counter.confirmed / page.counter.total) * 100) : 0;

  return (
    <div>
      <Kicker>Step 3 of 4</Kicker>
      <H1>{page.title}</H1>
      <p className="text-[#5a6b78] text-[14.5px] mb-3">{page.subtitle}</p>

      <div className="sticky top-[57px] z-20 bg-[#f6f4ef] py-2 mb-3">
        <div className="flex justify-between text-[13px] font-bold text-[#062c55]"><span>{page.counter.allSet ? "All set" : page.counter.label}</span><span>{pct}%</span></div>
        <div className="h-[6px] bg-[#e7e4dd] rounded-full mt-1 overflow-hidden"><div className="h-full bg-[#0eb28d] transition-all" style={{ width: `${pct}%` }} /></div>
      </div>
      <ErrorBox text={err} />

      {page.conflicts.length > 0 && <h2 className="font-bold text-[#062c55] text-[17px] mt-4 mb-2">Check these first</h2>}
      {page.conflicts.map((c: any) => <ConflictCard key={c.key} c={c} busy={busyKey.startsWith(c.key)} onResolve={resolve} />)}

      {page.missing.length > 0 && <h2 className="font-bold text-[#062c55] text-[17px] mt-4 mb-2">We need one more number</h2>}
      {page.missing.map((m: any) => <MissingCard key={m.key} m={m} busy={busyKey.startsWith(m.key)} onSave={(v) => act(m.key, "answer", { value: v })} onNotSure={() => act(m.key, "not_sure")} />)}

      {page.groups.map((g: any) => (
        <section key={g.id} className="mt-5">
          <h2 className="font-bold text-[#062c55] text-[17px]">{g.title} <span className="font-normal text-[#5a6b78] text-[13px]">· {g.subtitle}</span></h2>
          {g.id === "contract" && page.noContractNote && <p className="text-[13px] text-[#5a6b78] mt-1">{page.noContractNote}</p>}
          <div className="mt-2 space-y-2">
            {g.rows.map((r: any) => (
              <div key={r.key} ref={(el) => { rowRefs.current[r.key] = el; }}>
                <Row r={r} words={words} busy={busyKey.startsWith(r.key + ":")} busyAction={busyKey} act={act} onAddClearerCopy={onAddClearerCopy} />
              </div>
            ))}
          </div>
        </section>
      ))}

      <Card className="mt-6">
        <label className="flex gap-3 items-start text-[14px]">
          <input type="checkbox" className="mt-1 w-5 h-5" checked={page.finalAgreement.attested} disabled={!page.build.allRequiredConfirmed} onChange={(e) => attest(e.target.checked)} />
          <span>{page.finalAgreement.text}</span>
        </label>
      </Card>
      <Btn className={`w-full mt-3 ${page.build.enabled ? "shadow-[0_0_0_4px_rgba(14,178,141,0.25)]" : ""}`} disabled={buildPending} onClick={build}>{buildPending ? "Starting your report…" : page.build.enabled ? page.build.label : page.build.allRequiredConfirmed ? "Tick the box above to build your report" : page.build.label}</Btn>
    </div>
  );
}

function ValueEditor({ r, initial, onSave, onCancel, extra }: { r: any; initial?: unknown; onSave: (v: unknown) => void; onCancel?: () => void; extra?: React.ReactNode }) {
  const [v, setV] = useState<string>(initial === null || initial === undefined ? "" : String(initial));
  const input = r.type === "choice" && r.options
    ? <select className="min-h-[44px] rounded-xl border border-[#d5dde4] px-3 w-full" value={v} onChange={(e) => setV(e.target.value)} autoFocus>
        <option value="">Choose…</option>
        {r.options.map((o: string[]) => <option key={o[0]} value={o[0]}>{o[1]}</option>)}
      </select>
    : <input autoFocus className="min-h-[44px] rounded-xl border border-[#d5dde4] px-3 w-full"
        type={r.type === "date" ? "date" : r.type === "text" ? "text" : "text"} inputMode={["money", "weeks", "days", "number"].includes(r.type) ? "decimal" : undefined}
        placeholder={r.type === "money" ? "$" : r.type === "weeks" ? "weeks" : r.type === "days" ? "days" : ""} value={v} onChange={(e) => setV(e.target.value)} />;
  return (
    <div className="mt-2">
      {input}
      <div className="flex flex-wrap gap-2 mt-2">
        <Btn onClick={() => v !== "" && onSave(["money", "weeks", "days", "number"].includes(r.type) ? Number(String(v).replace(/[$,\s]/g, "")) : v)} disabled={v === ""}>Save</Btn>
        {extra}
        {onCancel && <Btn kind="link" onClick={onCancel}>Cancel</Btn>}
      </div>
    </div>
  );
}

function Row({ r, words, busy, busyAction, act, onAddClearerCopy }: { r: any; words: any; busy: boolean; busyAction: string; act: (k: string, a: string, x?: any) => void; onAddClearerCopy: () => void }) {
  const [editing, setEditing] = useState(false);
  const [showQuote, setShowQuote] = useState(false);
  const corrected = r.status === "corrected";
  const sl = r.pendingSecondLook;
  const lookingAgain = busy && busyAction === `${r.key}:change` && r.isDocumentRow;
  const docWord = r.source === "contract" ? "contract" : words.region === "state" ? "agreement" : "letter";

  if (r.notAdded) {
    return <Card className="!p-3 opacity-70"><div className="flex justify-between text-[14px]"><span>{r.label}</span><b className="text-[#5a6b78]">Not added</b></div></Card>;
  }
  return (
    <Card className="!p-3" style={corrected ? { background: C.violetbg, borderColor: "#d9cdf5" } : undefined}>
      <div className="flex justify-between gap-3 items-start">
        <div className="min-w-0">
          <div className="text-[13px] text-[#5a6b78]">{r.label}{!r.required && " (optional)"}</div>
          <div className="font-bold text-[#062c55] text-[15.5px]">{r.counted && <span className="text-[#0c8f72]">✓ </span>}{r.display}</div>
          <div className="text-[12px] text-[#5a6b78]">
            {r.sourceLine}
            {r.quote && <> · <button className="underline text-[#0c8f72]" onClick={() => setShowQuote((s) => !s)}>See the words</button></>}
            {r.confidence === "low" && <span className="text-[#b07a00]"> · hard to read</span>}
          </div>
          {showQuote && r.quote && <blockquote className="mt-1 text-[13px] italic border-l-[3px] border-[#c7e6d6] pl-2 text-[#17242f]">&ldquo;{r.quote}&rdquo;</blockquote>}
          {r.tag && <span className="inline-block mt-1 text-[11px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-md" style={corrected ? { background: "#e6dcfa", color: C.violet } : { background: C.amberbg, color: C.amber }}>{r.tag}</span>}
          {r.changeLine && <div className="text-[12.5px] mt-1" style={{ color: C.violet }}>{r.changeLine}</div>}
        </div>
        {!r.status && !editing && !sl && (
          <div className="flex gap-2 shrink-0">
            {r.value !== null && r.value !== undefined && <Btn onClick={() => act(r.key, "confirm")} disabled={busy}>Yes</Btn>}
            <Btn kind="o" onClick={() => setEditing(true)} disabled={busy}>Change</Btn>
          </div>
        )}
        {r.status && !editing && <Btn kind="link" onClick={() => act(r.key, "reset")}>Undo</Btn>}
      </div>

      {editing && !lookingAgain && (
        <ValueEditor r={r} initial={r.value} onCancel={() => setEditing(false)}
          onSave={(v) => { act(r.key, "change", { value: v }); setEditing(false); }}
          extra={<>
            {r.isDocumentRow && <Btn kind="o" onClick={() => { act(r.key, "not_in_docs"); setEditing(false); }}>Not in my documents</Btn>}
            <Btn kind="o" onClick={() => { act(r.key, "not_sure"); setEditing(false); }}>Not sure</Btn>
          </>} />
      )}
      {lookingAgain && <div className="mt-2"><Spinner text="Looking again at your document…" /></div>}

      {sl && (
        <div className="mt-3 rounded-xl bg-[#f6f4ef] p-3">
          <div className="text-[14px]">
            {sl.found_value
              ? <>We looked again. Your {docWord}{sl.where ? `, ${sl.where},` : ""} says: <i>&ldquo;{sl.quote}&rdquo;</i></>
              : <>We looked again and couldn&apos;t find this in your {docWord}.</>}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {sl.documentDisplay && <Btn onClick={() => act(r.key, "use_document")}>Use {sl.documentDisplay}</Btn>}
            <Btn kind="o" onClick={() => act(r.key, "keep_mine")}>Keep {sl.yourDisplay}</Btn>
            <Btn kind="link" onClick={onAddClearerCopy}>Add a clearer copy</Btn>
          </div>
        </div>
      )}

      {r.needsChangeAck && (
        <label className="flex gap-2 items-start mt-3 text-[13px]" style={{ color: C.violet }}>
          <input type="checkbox" className="mt-0.5 w-4 h-4" onChange={(e) => e.target.checked && act(r.key, "ack_change", { agreed: true })} />
          <span>{r.changeAckText}</span>
        </label>
      )}
    </Card>
  );
}

function ConflictCard({ c, busy, onResolve }: { c: any; busy: boolean; onResolve: (k: string, ch: "document" | "answers" | "other" | "not_sure", v?: unknown) => void }) {
  const [other, setOther] = useState(false);
  return (
    <Card className="mb-3 !p-4" style={{ borderLeft: `4px solid ${C.amber}` }}>
      <div className="text-[12px] font-extrabold uppercase tracking-wide text-[#b07a00]">{c.title}</div>
      <p className="text-[14px] mt-1 mb-3">{c.lead}</p>
      <div className="grid sm:grid-cols-2 gap-2">
        <button disabled={busy} onClick={() => onResolve(c.key, "document")} className="text-left rounded-xl border-2 border-[#e7e4dd] hover:border-[#0eb28d] p-3 min-h-[44px]">
          <div className="text-[12px] text-[#5a6b78]">{c.document.label}</div>
          <div className="font-bold text-[#062c55] text-[18px]">{c.document.display}</div>
          {c.document.quote && <div className="text-[12px] italic text-[#5a6b78] mt-1">&ldquo;{c.document.quote}&rdquo;</div>}
        </button>
        <button disabled={busy} onClick={() => onResolve(c.key, "answers")} className="text-left rounded-xl border-2 border-[#e7e4dd] hover:border-[#0eb28d] p-3 min-h-[44px]">
          <div className="text-[12px] text-[#5a6b78]">{c.answers.label}</div>
          <div className="font-bold text-[#062c55] text-[18px]">{c.answers.display}</div>
        </button>
      </div>
      {!other
        ? <button className="mt-2 underline text-[#0c8f72] text-[13.5px]" onClick={() => setOther(true)}>Something else</button>
        : <ValueEditor r={{ type: c.key === "years" ? "number" : typeof c.document.value === "number" ? "money" : "text" }} onSave={(v) => onResolve(c.key, "other", v)} onCancel={() => setOther(false)}
            extra={<Btn kind="o" onClick={() => onResolve(c.key, "not_sure")}>Not sure</Btn>} />}
    </Card>
  );
}

function MissingCard({ m, busy, onSave, onNotSure }: { m: any; busy: boolean; onSave: (v: unknown) => void; onNotSure: () => void }) {
  return (
    <Card className="mb-3 !p-4" style={{ borderLeft: "4px solid #2c62b8" }}>
      <div className="text-[12px] font-extrabold uppercase tracking-wide text-[#2c62b8]">{m.label}</div>
      <p className="text-[14px] mt-1">{m.question}</p>
      {busy ? <div className="mt-2"><Spinner text="Saving…" /></div> : (
        <ValueEditor r={m} onSave={onSave} extra={<>
          {(m.extraChoices || []).map((x: string[]) => <Btn key={x[0]} kind="o" onClick={() => onSave(Number(x[0]))}>{x[1]}</Btn>)}
          <Btn kind="o" onClick={onNotSure}>Not sure</Btn>
        </>} />
      )}
    </Card>
  );
}

/* =========================================================================
   Ready · the report
   ========================================================================= */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-6"><h2 className="font-serif text-[22px] text-[#062c55] font-semibold mb-2">{title}</h2>{children}</section>;
}

const STATUS_LABEL: Record<string, string> = { ok: "Looks right", bad: "Worth a closer look", ask: "Ask about this", info: "Good to know" };
const STATUS_STYLE: Record<string, string> = { ok: "bg-[#eef8f3] text-[#0c8f72]", bad: "bg-[#fbeceb] text-[#d42e2b]", ask: "bg-[#fbf3df] text-[#8a6400]", info: "bg-[#eaf1fb] text-[#2c62b8]" };

function ReadyStep({ cs, caseId, words, onLawyer }: { cs: any; caseId: string; words: any; onLawyer: () => void }) {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");
  useEffect(() => { fairexit.report(caseId).then(setData).catch((e) => setErr(errText(e))); }, [caseId]);
  if (!data) return err ? <ErrorBox text={err} /> : <Spinner text="Opening your report…" />;
  const r = data.report, nb = data.numbers, country = cs.country;
  const token = caseStore.get(caseId) || "";
  const factorNames: Record<string, string> = { service: "Years of service", age: "Age", job_level: "Job level", similar_jobs: "Similar jobs nearby" };

  return (
    <div>
      <Kicker>Your Severance Report · {data.reportId}</Kicker>
      <H1>Your report is ready</H1>
      <p className="text-[#5a6b78] text-[14px]">{r.cover?.role_line} · {r.cover?.place_line}</p>
      <div className="flex flex-wrap gap-2 mt-3">
        <a className="min-h-[44px] inline-flex items-center px-4 rounded-xl bg-[#0eb28d] text-[#04291f] font-bold" href={fairexit.reportPdfUrl(caseId, token)}>Download my report (PDF)</a>
        <Btn kind="o" onClick={onLawyer}>Ask a {words.lawyer} to contact me</Btn>
      </div>
      {cs.email && <p className="text-[13px] text-[#5a6b78] mt-2">We also emailed it to <b>{cs.email}</b>.</p>}

      {r.glance && <Section title="At a glance"><Card><p className="text-[15px]">{r.glance}</p>{r.contract_note && <p className="mt-2 rounded-lg bg-[#fbf3df] p-2 text-[13.5px]">{r.contract_note}</p>}</Card></Section>}

      {nb?.country === "CA" && nb.range && nb.minimum?.amount != null && (
        <Section title="Your range">
          <Card className="text-center">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#5a6b78]">Estimated severance range</div>
            <div className="font-serif text-[30px] text-[#0c8f72] font-semibold">{money(nb.minimum.amount, country)} – {money(nb.range.high, country)}</div>
            {nb.gauge && <>
              <Gauge frac={nb.gauge.position} />
              <div className="flex justify-between w-[220px] mx-auto text-[10px] font-bold uppercase tracking-wide text-[#5a6b78]"><span>Floor</span><span>Common-law</span></div>
              <div className="text-[15px] text-[#062c55] font-semibold mt-1">{nb.gauge.label} ({money(nb.gauge.offer, country)})</div>
            </>}
            <div className="text-left text-[13.5px] mt-3 space-y-1">
              <div><b>Legal minimum ({nb.minimum.statute_short}):</b> {money(nb.minimum.amount, country)}{nb.minimum.weeks != null && ` · ${nb.minimum.weeks} weeks of pay`}</div>
              {nb.minimum.arithmetic && <div className="text-[#5a6b78]">{nb.minimum.arithmetic}</div>}
              <div><b>What courts have awarded people like you:</b> {money(nb.range.low, country)} – {money(nb.range.high, country)} · {nb.range.lowMonths} to {nb.range.highMonths} months ({nb.range.basis})</div>
            </div>
          </Card>
          <div className="mt-2 rounded-xl border border-[#ecdca6] border-l-4 border-l-[#c9a227] bg-[#fff8e8] p-2 text-[12.5px] text-[#6b5a1e]">An estimate, not legal advice or a guarantee. Only a licensed employment {words.lawyer} can confirm what you&apos;re owed.</div>
        </Section>
      )}
      {nb?.country === "US" && (
        <Section title="Is there a legal minimum?">
          <Card><div className="font-serif text-[28px] text-[#0c8f72] font-semibold">{nb.minimum.none ? "No." : money(nb.minimum.amount || 0, country)}</div>
            <p className="text-[14px]">{nb.minimum.none ? `Neither ${cs.jurisdiction?.name} nor federal law requires severance.${nb.offer != null ? ` Your ${money(nb.offer, country)} is what they chose to offer — there is no floor to be "below".` : ""}` : nb.minimum.arithmetic}</p></Card>
        </Section>
      )}

      {r.checks?.length > 0 && (
        <Section title="What we checked">
          <div className="space-y-2">{r.checks.map((c: any, i: number) => (
            <Card key={i} className="!p-4">
              <div className="flex gap-2 items-baseline"><span className={`text-[10.5px] font-extrabold uppercase px-2 py-0.5 rounded-md ${STATUS_STYLE[c.status] || ""}`}>{STATUS_LABEL[c.status] || c.status}</span><b className="text-[#062c55]">{c.topic}</b></div>
              {c.letter_says && <p className="text-[13.5px] mt-1"><span className="text-[#5a6b78]">Your {words.letter} says: </span>{c.letter_says}</p>}
              {c.contract_says && <p className="text-[13.5px] mt-1"><span className="text-[#5a6b78]">Your {words.contract} says: </span>{c.contract_says}</p>}
              {c.rule_says && <p className="text-[13.5px] mt-1"><span className="text-[#5a6b78]">The rule says: </span>{c.rule_says}</p>}
              {c.why && <p className="text-[13.5px] mt-1">{c.why}</p>}
            </Card>))}</div>
        </Section>
      )}

      {r.factors && (
        <Section title="What moves the range">
          <Card className="space-y-3">{Object.keys(factorNames).filter((k) => r.factors[k] !== undefined).map((k) => (
            <div key={k}>
              <div className="flex justify-between text-[14px]"><b className="text-[#062c55]">{factorNames[k]}</b><span className="text-[#5a6b78]">{nb?.factorValues?.[k]}</span></div>
              <div className="h-[7px] bg-[#e7e4dd] rounded-full my-1 overflow-hidden"><div className="h-full bg-[#0eb28d]" style={{ width: `${Math.round(Math.max(0, Math.min(1, Number(r.factors[k]))) * 100)}%` }} /></div>
              <small className="text-[12.5px] text-[#5a6b78]">{r.factors.reasons?.[k]}</small>
            </div>))}</Card>
        </Section>
      )}

      {r.release_check?.length > 0 && (
        <Section title="Release check">
          <Card className="space-y-2">{r.release_check.map((x: any, i: number) => (
            <div key={i} className="flex gap-2 text-[14px]"><b className={x.status === "ok" ? "text-[#0c8f72]" : "text-[#b07a00]"}>{x.status === "ok" ? "✓" : "!"}</b><span><b>{x.point}</b> — {x.detail}</span></div>))}</Card>
        </Section>
      )}

      {r.clauses?.length > 0 && (
        <Section title="Terms to understand">
          <div className="space-y-2">{r.clauses.map((c: any, i: number) => (
            <Card key={i} className="!p-4"><b className="text-[#062c55]">{c.title}</b>
              <p className="text-[13.5px] mt-1"><span className="text-[#5a6b78]">What it says: </span>{c.what_it_says}</p>
              <p className="text-[13.5px] mt-1"><span className="text-[#5a6b78]">What it means: </span>{c.what_it_means}</p>
              <p className="text-[13.5px] mt-1 text-[#0c8f72]">→ {c.question_to_ask}</p></Card>))}</div>
        </Section>
      )}

      {r.myths?.length > 0 && (
        <Section title="Common myths">
          <div className="space-y-2">{r.myths.map((m: any, i: number) => <Card key={i} className="!p-4"><b className="text-[#062c55]">{m.myth}</b><p className="text-[13.5px] mt-1">{m.fact}</p></Card>)}</div>
        </Section>
      )}

      {r.questions?.length > 0 && <Section title="Questions to ask"><Card><ol className="list-decimal pl-5 space-y-1 text-[14px]">{r.questions.map((q: string, i: number) => <li key={i}>{q}</li>)}</ol></Card></Section>}
      {r.next_steps?.length > 0 && <Section title="This week"><Card><ol className="list-decimal pl-5 space-y-1 text-[14px]">{r.next_steps.map((q: string, i: number) => <li key={i}>{q}</li>)}</ol></Card></Section>}

      {data.sources?.length > 0 && (
        <Section title="Sources">
          <Card><ol className="list-decimal pl-5 space-y-1 text-[13px]">{data.sources.map((s: any) => <li key={s.id}><b>{s.rule}</b>. {s.section}. <a className="text-[#0c8f72] underline break-all" href={s.url} target="_blank" rel="noopener noreferrer">{s.url}</a></li>)}</ol></Card>
        </Section>
      )}

      <Section title="Before you use this">
        <Card className="text-[13.5px] space-y-1">
          <p>{r.confirmed_line}</p>
          {data.rulesAsOf && <p>Rules as of {new Date(data.rulesAsOf + "T12:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}.</p>}
          <p>This report is information, not legal advice. Only a {words.lawyer} licensed in your {words.region} can tell you what you are owed.</p>
          <p className="text-[#5a6b78]">Report ID {data.reportId}</p>
        </Card>
      </Section>
    </div>
  );
}
