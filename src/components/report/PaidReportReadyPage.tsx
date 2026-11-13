"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { triggerGetApp } from "@/context/GetAppContext";
import Image from "next/image";
import { getReportInputs, saveReportInputs, ReportInputs } from "@/lib/report-storage";
import AskLawyerModal from "@/components/dialogs/AskLawyerModal";
import { fairexit, caseStore, FairExitApiError } from "@/lib/api/fairexit";
import { startPollLoop } from "@/lib/reportPolling";
import { useErrorModal } from "@/context/ErrorModalContext";
import { notifySuccess, notifyError } from "@/lib/notifications";
import FullScreenLoadingExperience from "@/components/report/loading/FullScreenLoadingExperience";

interface PaidReportReadyPageProps {
  caseId?: string | null;
  cs?: {
    id?: string;
    email?: string;
    country?: string;
    status?: string;
    report?: { reportId?: string } | null;
    jurisdiction?: { name?: string } | null;
    answers?: Record<string, unknown>;
    [key: string]: unknown;
  } | null;
  onLawyer?: () => void;
  onDownload?: () => void;
  onDone?: () => void;
}

export default function PaidReportReadyPage({
  caseId,
  cs,
  onLawyer,
  onDownload,
  onDone,
}: PaidReportReadyPageProps) {
  const { showErrorModal } = useErrorModal();
  const [data] = useState<ReportInputs>(() => getReportInputs());
  const [explainQuestions, setExplainQuestions] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lawyerModalOpen, setLawyerModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  // Build state: 'building' | 'ready' | 'failed'
  const isInitiallyReady = cs?.status === "ready" && !!cs?.report && !!cs?.report_pdf_path;
  const [buildStatus, setBuildStatus] = useState<"building" | "ready" | "failed">(
    isInitiallyReady ? "ready" : "building"
  );
  type FailureKind = "polling_timeout" | "claude_failed" | "pdf_failed" | "generic_failed" | null;
  const [failureKind, setFailureKind] = useState<FailureKind>(null);
  const [pdfPending, setPdfPending] = useState(false);
  const [buildError, setBuildError] = useState<string>("");
  const [buildProgressStep, setBuildProgressStep] = useState<number>(2);
  const [pollVersion, setPollVersion] = useState(0);
  const retryLock = useRef(false);

  // Email delivery & Private link state (Change 24)
  const [emailMode, setEmailMode] = useState<"mock" | "live">(() => {
    if (typeof process !== "undefined" && process.env.EMAIL_MODE === "live") return "live";
    return "mock";
  });

  useEffect(() => {
    fairexit
      .config()
      .then((cfg) => {
        if (cfg?.email?.mode === "live") setEmailMode("live");
        else if (cfg?.email?.mode === "mock") setEmailMode("mock");
      })
      .catch(() => {});
  }, []);

  const initialDelivery = (cs?.reportDelivery as any) || null;
  const [emailSentState, setEmailSentState] = useState<"sent" | "failed" | "pending" | "none">(
    initialDelivery?.status === "sent" ? "sent" : initialDelivery?.status === "failed" ? "failed" : "none"
  );
  const [emailError, setEmailError] = useState(initialDelivery?.error || "");
  const [isRetryingEmail, setIsRetryingEmail] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [postPayName, setPostPayName] = useState(() => (cs?.customerName || (cs?.answers as any)?.customer_name || data.employee_name || ""));
  const [postPayEmail, setPostPayEmail] = useState(() => (cs?.email || data.email || ""));
  const [isSubmittingCustomer, setIsSubmittingCustomer] = useState(false);
  const [postPayError, setPostPayError] = useState("");

  const activeId = caseId || cs?.id;

  // Sync actual email delivery status from backend in live mode when report is ready
  useEffect(() => {
    if (!activeId || emailMode !== "live" || buildStatus !== "ready") return;
    fairexit
      .getReportDelivery(activeId)
      .then((res) => {
        if (res?.delivery?.status === "sent") {
          setEmailSentState("sent");
        } else if (res?.delivery?.status === "failed") {
          setEmailSentState("failed");
          setEmailError(res.delivery.error || "Email delivery failed");
        } else if (res?.delivery?.status === "pending") {
          setEmailSentState("pending");
        }
      })
      .catch(() => {});
  }, [activeId, emailMode, buildStatus]);

  // Poll only the report status endpoint while a build is active.
  useEffect(() => {
    if (!activeId) return;

    // If report and PDF are already marked ready in the initial case data, don't start a poll
    if (cs?.status === "ready" && !!cs?.report && !!cs?.report_pdf_path) {
      setBuildStatus("ready");
      setPdfPending(false);
      return;
    }

    // Ensure report build is triggered if not already in building or ready status
    if (cs?.status !== "building" && cs?.status !== "ready") {
      (async () => {
        try {
          await fairexit.attest(activeId);
          await fairexit.buildReport(activeId);
        } catch (err) {
          console.warn("Background report build trigger error:", err);
        }
      })();
    }

    const stopPolling = startPollLoop({
      poll: (signal) => fairexit.reportStatus(activeId, signal),
      intervalMs: 3000,
      maxRetries: 3,
      isTerminal: (res) => (res.ready && res.pdfReady) || res.failed,
      onValue: (res) => {
        if (res.ready && res.pdfReady) {
          setBuildStatus("ready");
          setFailureKind(null);
          setPdfPending(false);
          notifySuccess("Your severance report is ready!");
          onDone?.();
        } else if (res.failed) {
          setBuildStatus("failed");
          const stage = res.failedStage || (res.statusDetail?.includes("claude") ? "claude" : res.statusDetail?.includes("pdf") ? "pdf" : "Report Generation");
          const isClaudeErr = stage === "claude" || res.statusDetail === "claude_failed" || res.statusDetail === "build_failed";
          const isPdfErr = stage === "pdf" || res.statusDetail === "pdf_failed" || res.statusDetail === "pdf_pending";

          if (isPdfErr) {
            setFailureKind("pdf_failed");
            const msg = res.error || "Report calculations are saved, but PDF rendering was delayed. Click to generate your PDF.";
            setBuildError(msg);
          } else if (isClaudeErr) {
            setFailureKind("claude_failed");
            const msg = res.error || "The AI document analysis could not be completed for these documents. Please try again.";
            setBuildError(msg);
          } else {
            setFailureKind("generic_failed");
            const msg = res.error || "Report generation failed. Please try again.";
            setBuildError(msg);
          }
        } else {
          // Status is 'building', 'preparing', 'checking', or PDF pending: keep full-screen loading active
          setBuildStatus("building");
          setFailureKind(null);
          if (res.stage === "pdf" || res.stage === "pdf_pending" || res.statusDetail === "pdf" || (res.ready && !res.pdfReady)) {
            setBuildProgressStep(3);
          } else {
            setBuildProgressStep(2);
          }
        }
      },
      onError: (error) => {
        setBuildStatus("failed");
        setFailureKind("polling_timeout");
        const apiErr =
          error instanceof FairExitApiError
            ? error
            : new FairExitApiError(0, error instanceof Error ? error.message : "Report status check timed out");
        setBuildError(apiErr.message);
      },
    });

    // Minor step progress animation for user feedback
    const stepTimer = setTimeout(() => {
      setBuildProgressStep(3);
    }, 4500);

    return () => {
      stopPolling();
      clearTimeout(stepTimer);
    };
  }, [activeId, cs?.status, cs?.report, onDone, pollVersion, showErrorModal]);

  const handleRetryBuild = async () => {
    if (!activeId || retryLock.current) return;
    retryLock.current = true;
    setBuildStatus("building");
    setBuildError("");
    setBuildProgressStep(2);
    try {
      await fairexit.attest(activeId).catch(() => {});
      await fairexit.buildReport(activeId);
      setPollVersion((version) => version + 1);
    } catch (e: unknown) {
      console.error("Retry build error:", e);
      setBuildStatus("failed");
      const apiErr =
        e instanceof FairExitApiError
          ? e
          : new FairExitApiError(0, e instanceof Error ? e.message : "Report generation could not be started.");
      setBuildError(apiErr.message);
      showErrorModal({
        title: "Report Generation Failed",
        message: apiErr.message,
        stage: "Report Generation",
        statusCode: apiErr.status,
        requestId: apiErr.requestId,
        onRetry: handleRetryBuild,
        retryLabel: "Try Again",
      });
    } finally {
      retryLock.current = false;
    }
  };

  const isCanada = cs?.country ? cs.country === "CA" : data.country !== "US";
  const answers = (cs?.answers as Record<string, unknown>) || {};
  const userEmail = postPayEmail || cs?.email || data.email || "";
  const priceCurrency = isCanada ? "$59 CAD" : "$59 USD";

  const [persistedToken, setPersistedToken] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    const activeCaseId = caseId || cs?.id;
    const urlT = new URLSearchParams(window.location.search).get("t");
    if (urlT && activeCaseId) {
      caseStore.set(activeCaseId, urlT);
      return urlT;
    }
    return activeCaseId ? caseStore.get(activeCaseId) || "" : "";
  });

  useEffect(() => {
    if (typeof window === "undefined" || !activeId) return;
    const urlT = new URLSearchParams(window.location.search).get("t");
    if (urlT) {
      caseStore.set(activeId, urlT);
      setPersistedToken(urlT);
    } else {
      const stored = caseStore.get(activeId);
      if (stored) setPersistedToken(stored);
    }
  }, [activeId]);

  const activeToken =
    persistedToken ||
    (activeId && typeof window !== "undefined" ? caseStore.get(activeId) || "" : "");
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const privateLink =
    activeId && activeToken
      ? `${origin}/report?case=${activeId}&t=${encodeURIComponent(activeToken)}`
      : activeId
      ? `${origin}/report?case=${activeId}`
      : "";

  const handleCopyLink = () => {
    if (privateLink) {
      navigator.clipboard.writeText(privateLink).then(() => {
        setCopiedLink(true);
        notifySuccess("Copied private report link to clipboard!");
        setTimeout(() => setCopiedLink(false), 3000);
      });
    }
  };

  const handleRetryEmail = async () => {
    if (!activeId || isRetryingEmail || emailMode === "mock") return;
    setIsRetryingEmail(true);
    setEmailError("");
    try {
      const res = await fairexit.sendReportEmail(activeId, { forceRetry: true, email: userEmail });
      if (res?.status === "sent") {
        setEmailSentState("sent");
        notifySuccess(`Report emailed to ${userEmail}!`);
      } else if (res?.status === "disabled") {
        setEmailSentState("none");
      } else {
        setEmailSentState("failed");
        setEmailError(res?.error || "Could not send report email");
      }
    } catch (err: unknown) {
      setEmailSentState("failed");
      setEmailError(err instanceof Error ? err.message : "Could not send report email");
    } finally {
      setIsRetryingEmail(false);
    }
  };

  const handlePostPaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingCustomer) return;
    const trimmedName = postPayName.trim();
    const trimmedEmail = postPayEmail.trim();

    if (!trimmedName) {
      setPostPayError("Please enter your name.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setPostPayError("Please enter a valid email address.");
      return;
    }

    setPostPayError("");
    setIsSubmittingCustomer(true);

    try {
      if (activeId) {
        const res = await fairexit.submitCustomerInfo(activeId, {
          name: trimmedName,
          email: trimmedEmail,
        });
        saveReportInputs({
          employee_name: trimmedName,
          email: trimmedEmail,
        });
        setPostPayName(trimmedName);
        setPostPayEmail(trimmedEmail);
        if (res?.privateLink) {
          try {
            const parsed = new URL(res.privateLink);
            const t = parsed.searchParams.get("t");
            if (t && activeId) {
              caseStore.set(activeId, t);
              setPersistedToken(t);
            }
          } catch {
            const match = res.privateLink.match(/[?&]t=([^&]+)/);
            if (match?.[1] && activeId) {
              const decoded = decodeURIComponent(match[1]);
              caseStore.set(activeId, decoded);
              setPersistedToken(decoded);
            }
          }
        }
        if (emailMode === "mock") {
          notifySuccess("Customer information saved!");
        } else if (res?.emailDelivery?.status === "sent") {
          setEmailSentState("sent");
          notifySuccess(`Report sent to ${trimmedEmail}!`);
        } else if (res?.emailDelivery?.status === "failed") {
          setEmailSentState("failed");
          setEmailError(res.emailDelivery.error || "Email delivery failed");
        } else {
          setEmailSentState("none");
          notifySuccess("Customer information saved!");
        }
      }
    } catch (err: unknown) {
      setPostPayError(err instanceof Error ? err.message : "Failed to save details");
    } finally {
      setIsSubmittingCustomer(false);
    }
  };

  // Sidebar detail values (dynamically resolved from answers, props, then storage)
  const provinceOrState =
    answers.provinceName ||
    answers.province ||
    answers.state ||
    answers.stateName ||
    cs?.jurisdiction?.name ||
    (isCanada ? data.provinceName || "Ontario" : data.state || "California");

  const ageVal = String(answers.age !== undefined && answers.age !== null ? answers.age : (data.age || 52));
  const yearsVal = answers.years !== undefined && answers.years !== null
    ? `${answers.years} yrs`
    : `${data.years || 14} yrs`;

  const rawSalary = Number(answers.salary ?? answers.pay ?? data.salary ?? 110000);
  const salaryVal = `$${rawSalary >= 1000 ? `${Math.round(rawSalary / 1000)}k` : rawSalary}/yr`;

  const roleVal = answers.role || data.role || "Middle management / Senior / Director";

  const hasOffer =
    answers.offer !== undefined &&
    answers.offer !== null &&
    answers.offer !== "" &&
    answers.offer !== "—"
      ? Number(answers.offer) > 0
      : typeof data.offer === "number"
        ? data.offer > 0
        : Boolean(data.offer && data.offer !== "—");

  const rawOffer = hasOffer ? Number(answers.offer ?? data.offer) : null;
  const offerVal =
    rawOffer !== null
      ? `$${rawOffer >= 1000 ? `${Math.round(rawOffer / 1000)}k` : rawOffer}`
      : data.documentsExtracted
        ? "Not in documents"
        : "From your documents";

  const handleDownload = async () => {
    if (onDownload) {
      onDownload();
      return;
    }
    if (!activeId) {
      window.print();
      return;
    }
    setIsDownloading(true);
    setDownloadError("");
    try {
      const token = caseStore.get(activeId) || "";
      const response = await fetch(fairexit.reportPdfUrl(activeId, token), { cache: "no-store" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || `Could not download the PDF (${response.status}). Please try again.`);
      }
      const objectUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `FairExit-Severance-Report-${cs?.report?.reportId || "report"}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
      notifySuccess("Downloaded your FairExit report PDF!");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "PDF generation failed. Your saved report is safe; please try again.";
      setDownloadError(msg);
      showErrorModal({
        title: "PDF Download Failed",
        message: msg,
        stage: "PDF Download",
        onRetry: handleDownload,
        retryLabel: "Retry Download",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleTalkToLawyer = () => {
    setLawyerModalOpen(true);
    if (onLawyer) {
      onLawyer();
    }
  };

  if (buildStatus === "building" || (buildStatus === "failed" && !cs?.report)) {
    const hasContract = Boolean(
      data.hasContract ?? (
        ((cs?.documents as any)?.contractPages ? (cs?.documents as any).contractPages > 0 : false) ||
        (Array.isArray((cs?.documents as any)?.uploaded) &&
          (cs?.documents as any).uploaded.some((d: any) => d.kind === "contract")) ||
        (Array.isArray(cs?.documents) && cs.documents.some((d: any) => d.kind === "contract"))
      )
    );

    const regionName = cs?.jurisdiction?.name || (isCanada ? data.provinceName : data.state);
    const regionCode =
      (cs as any)?.jurisdiction_code ||
      (cs?.jurisdiction as any)?.code ||
      (!isCanada
        ? data.state
          ? `US-${data.state}`
          : "US-*"
        : data.province
        ? `CA-${data.province}`
        : "CA-ON");

    return (
      <FullScreenLoadingExperience
        mode="building"
        caseId={activeId}
        hasContract={hasContract}
        jurisdictionName={regionName}
        jurisdictionCode={regionCode}
        isUS={!isCanada}
        error={buildStatus === "failed" ? buildError || "Report generation could not be completed." : null}
        onRetry={handleRetryBuild}
      />
    );
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

      {/* ── Main Container (1200px) ── */}
      <div className="w-full max-w-[1200px] mx-auto px-4 lg:px-[40px] pt-6 sm:pt-8">
        {/* ── Stepper Navigation ── */}
        <div className="w-full max-w-[714px]">
          {/* Stepper circles */}
          <div className="relative flex items-center justify-between pb-3">
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
                  <div className="w-[29.5px] h-[29.5px] rounded-full border-[4px] border-[#062C55]/10 flex items-center justify-center">
                    <div className="w-[21.5px] h-[21.5px] rounded-full bg-[#062C55] text-white flex items-center justify-center text-[10px] font-extrabold">
                      ★
                    </div>
                  </div>
                ) : (
                  <div className="w-[18px] h-[18px] rounded-full bg-[#0EB28D] text-white border border-[#0EB28D] flex items-center justify-center text-[10px] font-extrabold">
                    ✓
                  </div>
                )}
                {/* On mobile, "Your results" is stacked "Your" then "results" as in Figma */}
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

          {/* Stepper full gradient line with glowing green dot at end */}
          <div className="relative w-full h-[6px] bg-[#E9E5DC] rounded-[3px] mt-1 mb-3">
            <div className="h-full w-full bg-gradient-to-r from-[#0C8F72] to-[#0EB28D] rounded-[3px]" />

            {/* Glowing endpoint dot */}
            <div className="absolute right-[-1px] top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
              <div className="w-[30px] h-[30px] rounded-full border-[8px] border-[#0EB28D]/10 flex items-center justify-center">
                <div className="w-[22px] h-[22px] rounded-full border-[4px] border-[#0EB28D]/20 flex items-center justify-center">
                  <div className="w-[14px] h-[14px] rounded-full bg-[#0EB28D]" />
                </div>
              </div>
            </div>
          </div>

          {/* Stepper sub-bar: step indicator & toggle */}
          <div className="flex items-center justify-between text-[12px] pb-4">
            <span className="font-sans font-[700] text-[12px] leading-[18px] text-[#5A6B78]">
              {buildStatus === "ready" ? "Your Severance Report" : "Step 4 of 4 · Building your report"}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-sans font-[700] text-[12px] leading-[18px] text-[#0C8F72]">
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

        {/* ── Two-Column Layout (Left Card 714px + Right Sidebar 300px) ── */}
        <div className="flex flex-col lg:flex-row items-start gap-6 lg:gap-[26px] mt-2">
          {/* ══════════════════════════════════════════════════
              LEFT CARD: Report Ready vs Building vs Failed
             ══════════════════════════════════════════════════ */}
          <div className="w-full lg:w-[714px] bg-white border border-[#E7E4DD] rounded-[12px] shadow-[0px_18px_40px_-18px_rgba(5,43,84,0.12)] p-6 sm:p-10 flex flex-col items-center justify-center text-center min-h-[340px]">
            {buildStatus === "ready" ? (
              <>
                {/* Pill: Paid · $59 CAD (only mentions "receipt emailed" if actually sent in live mode) */}
                <div className="inline-flex items-center justify-center px-4 py-1 bg-white border border-[#E7E4DD] rounded-[6px] text-[12px] font-sans font-[700] text-[#062C55] mb-5 sm:mb-6">
                  Paid · {priceCurrency}{emailMode === "live" && emailSentState === "sent" ? " · receipt emailed" : ""}
                </div>

                {/* Title */}
                <h1 className="font-serif font-[500] text-[22px] sm:text-[24px] leading-[27px] tracking-[-0.5px] text-[#062C55] mb-6 sm:mb-7">
                  Your Severance Report is ready.
                </h1>

                {/* Primary Action: Download my report (PDF) - ONLY shown when report is ready! */}
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="w-full sm:w-[380px] h-[54px] rounded-[12px] bg-[#0EB28D] hover:bg-[#0C8F72] text-white font-sans font-[700] text-[17px] leading-[24px] shadow-[0px_18px_40px_-18px_rgba(5,43,84,0.12)] transition flex items-center justify-center cursor-pointer mb-3"
                >
                  {isDownloading ? (
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>{pdfPending ? "Compiling PDF…" : "Opening PDF…"}</span>
                    </div>
                  ) : pdfPending ? (
                    "Generate and download report (PDF)"
                  ) : (
                    "Download my report (PDF)"
                  )}
                </button>
                {downloadError && <p role="alert" className="w-full sm:w-[380px] mb-3 text-left text-[13px] text-[#A3231F]">{downloadError}</p>}

                {/* Secondary Action: Talk to a lawyer, free */}
                <button
                  type="button"
                  onClick={handleTalkToLawyer}
                  className="w-full sm:w-[380px] h-[53px] rounded-[12px] bg-white hover:bg-[#FAF9F5] border border-[#CFD8DF] text-[#062C55] font-sans font-[700] text-[16px] leading-[22px] transition flex items-center justify-center cursor-pointer mb-5 sm:mb-6"
                >
                  {isCanada ? "Talk to a lawyer, free" : "Talk to an attorney, free"}
                </button>

                {/* ── 1. Email delivery status (Shown in BOTH mock and live modes) ── */}
                {emailMode === "mock" ? (
                  <div className="w-full sm:w-[480px] p-3.5 rounded-[12px] bg-[#FAF9F5] border border-[#E7E4DD] text-left mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full bg-[#0EB28D]" />
                      <span className="font-sans font-[700] text-[13px] text-[#062C55]">
                        Email sent (Demo Mode)
                      </span>
                      {userEmail ? (
                        <span className="ml-auto text-[11.5px] font-mono text-[#5A6B78] truncate max-w-[200px]" title={userEmail}>
                          {userEmail}
                        </span>
                      ) : null}
                    </div>
                    <p className="font-sans font-[400] text-[12.5px] leading-[18px] text-[#5A6B78]">
                      Email delivery is simulated in demo mode. No actual email was sent.
                      {userEmail ? (
                        <span className="block mt-0.5 text-[11.5px] text-[#8695A0]">
                          Recipient: <strong className="font-[600] text-[#5A6B78]">{userEmail}</strong>
                        </span>
                      ) : null}
                    </p>
                  </div>
                ) : userEmail ? (
                  <div className="w-full flex flex-col items-center">
                    {emailSentState === "failed" ? (
                      <div className="w-full sm:w-[480px] p-3.5 rounded-[12px] bg-[#FBECEB] border border-[#F4CBC8] text-left mb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#A3231F]" />
                            <span className="font-sans font-[700] text-[13px] text-[#A3231F]">
                              Email delivery failed
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleRetryEmail}
                            disabled={isRetryingEmail}
                            className="px-3 py-1 bg-[#A3231F] hover:bg-[#821B18] text-white rounded-[6px] font-sans font-[700] text-[12px] transition cursor-pointer disabled:opacity-50"
                          >
                            {isRetryingEmail ? "Retrying…" : "Retry sending"}
                          </button>
                        </div>
                        {emailError && (
                          <p className="font-sans text-[11.5px] text-[#A3231F] mt-1">{emailError}</p>
                        )}
                      </div>
                    ) : emailSentState === "sent" ? (
                      <div className="w-full sm:w-[480px] p-3.5 rounded-[12px] bg-[#FAF9F5] border border-[#E7E4DD] text-left mb-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2 h-2 rounded-full bg-[#0EB28D]" />
                          <span className="font-sans font-[700] text-[13px] text-[#062C55]">
                            Email sent
                          </span>
                          <span className="ml-auto text-[11.5px] font-mono text-[#5A6B78] truncate max-w-[200px]" title={userEmail}>
                            {userEmail}
                          </span>
                        </div>
                        <p className="font-sans font-[400] text-[12.5px] leading-[18px] text-[#5A6B78]">
                          We emailed your report to{" "}
                          <strong className="font-[700] text-[#062C55]">{userEmail}</strong>.
                        </p>
                      </div>
                    ) : emailSentState === "pending" ? (
                      <div className="w-full sm:w-[480px] p-3.5 rounded-[12px] bg-[#FAF9F5] border border-[#E7E4DD] text-left mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full border-2 border-[#0EB28D] border-t-transparent animate-spin" />
                          <span className="font-sans font-[600] text-[13px] text-[#062C55]">
                            Sending report email to {userEmail}…
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {/* ── 2. Private Report Link Box (Shown in BOTH mock and live modes) ── */}
                {privateLink && (
                  <div className="w-full sm:w-[480px] p-4 rounded-[12px] bg-[#FAF9F5] border border-[#E7E4DD] text-left mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-sans font-[700] text-[12px] uppercase tracking-wider text-[#062C55]">
                        Your private report link
                      </span>
                      <span className="text-[11px] font-semibold text-[#0C8F72] bg-[#E5F5EE] px-2 py-0.5 rounded">
                        No sign-in needed
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="text"
                        readOnly
                        value={privateLink}
                        className="w-full bg-white border border-[#CFD8DF] rounded-[8px] px-3 py-2 text-[12px] font-mono text-[#062C55] outline-none select-all"
                      />
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="px-3.5 py-2 bg-[#0EB28D] hover:bg-[#0C8F72] text-white rounded-[8px] font-sans font-[700] text-[12px] whitespace-nowrap transition cursor-pointer shrink-0"
                      >
                        {copiedLink ? "Copied! ✓" : "Copy link"}
                      </button>
                    </div>
                    <p className="font-sans text-[11.5px] leading-[17px] text-[#5A6B78] mt-2">
                      Only someone with this secret link can access your report. Your documents are deleted after 30 days; your report is kept for 12 months.
                    </p>
                  </div>
                )}

                {/* ── 3. Customer Info Form (if customer name/email not yet provided) ── */}
                {!userEmail && (
                  <div className="w-full sm:w-[480px] p-5 rounded-[14px] bg-[#FAF9F5] border border-[#E7E4DD] text-left mb-3">
                    <h3 className="font-serif font-[600] text-[18px] text-[#062C55] mb-1">
                      Your payment is confirmed. Enter your name and email so we can send you your report.
                    </h3>
                    <p className="font-sans text-[12.5px] text-[#5A6B78] mb-3">
                      Enter your details below to receive your official severance report and private link.
                    </p>
                    <form onSubmit={handlePostPaySubmit} className="space-y-3">
                      <div>
                        <label className="block font-sans text-[12px] font-bold text-[#062C55] mb-1">Your name</label>
                        <input
                          type="text"
                          value={postPayName}
                          onChange={(e) => setPostPayName(e.target.value)}
                          placeholder="e.g. Avery Morgan"
                          disabled={isSubmittingCustomer}
                          className="w-full px-3 py-2 bg-white border border-[#CFD8DF] rounded-[8px] text-[14px] text-[#062C55] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-sans text-[12px] font-bold text-[#062C55] mb-1">Email address</label>
                        <input
                          type="email"
                          value={postPayEmail}
                          onChange={(e) => setPostPayEmail(e.target.value)}
                          placeholder="you@example.com"
                          disabled={isSubmittingCustomer}
                          className="w-full px-3 py-2 bg-white border border-[#CFD8DF] rounded-[8px] text-[14px] text-[#062C55] outline-none"
                        />
                      </div>
                      {postPayError && (
                        <p className="text-[12px] text-[#A3231F] font-semibold">{postPayError}</p>
                      )}
                      <button
                        type="submit"
                        disabled={isSubmittingCustomer}
                        className="w-full h-[46px] bg-[#12C79A] hover:bg-[#0EB28D] text-white font-sans font-[700] text-[15px] rounded-[10px] transition cursor-pointer disabled:opacity-50"
                      >
                        {isSubmittingCustomer ? "Sending report…" : "Send my report"}
                      </button>
                    </form>
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* ══════════════════════════════════════════════════
              RIGHT SIDEBAR: FairExit summary (300px, desktop)
             ══════════════════════════════════════════════════ */}
          <aside className="hidden lg:block w-[300px] shrink-0 bg-[#EEF1F4] border border-[#DDE3E9] rounded-[12px] p-5 shadow-xs">
            {/* Header */}
            <span className="font-sans font-[800] text-[11px] leading-[17px] tracking-[0.5px] uppercase text-[#5A6B78] block">
              YOUR DETAILS SO FAR
            </span>
            <h2 className="font-serif font-[400] text-[16px] leading-[25px] text-[#062C55] mt-1 mb-3">
              FairExit summary
            </h2>

            {/* Detail Rows */}
            <div className="space-y-0 text-[13px] leading-[20px]">
              {[
                { label: "Union member", value: data.union || "No" },
                { label: "Employment", value: data.employment || "Regular employee" },
                ...(data.signed ? [{ label: "Signed yet?", value: data.signed }] : []),
                ...(data.federal && isCanada ? [{ label: "Federally regulated", value: data.federal }] : []),
                { label: isCanada ? "Province" : "State", value: provinceOrState },
                { label: "Age", value: ageVal },
                { label: "Years of service", value: yearsVal },
                { label: "Pay", value: salaryVal },
                { label: "Occupation", value: roleVal },
                { label: isCanada ? "Employer payroll ≥ $2.5M" : "Employer size (100+ employees)", value: data.payroll || (isCanada ? "Not sure" : "100+") },
                { label: "Other pay", value: data.otherPay || "None" },
                { label: "New job yet?", value: data.newJob || "Not yet" },
                { label: "Min-only clause", value: data.minClause || "No" },
                { label: "Contract", value: data.contract || "Signed · role changed" },
                { label: "How it ended", value: data.howEnded || "Laid off" },
                { label: "Similar jobs nearby", value: data.market || "Some" },
                { label: "Anything flagged", value: data.flagged || "Nothing unusual" },
                { label: "Offer", value: offerVal },
              ].map((row, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-[7px] border-b border-[#D3DAE1]"
                >
                  <span className="font-sans font-[400] text-[#5A6B78] truncate pr-2">
                    {row.label}
                  </span>
                  <span className="font-sans font-[700] text-[#062C55] text-right truncate">
                    {String(row.value)}
                  </span>
                </div>
              ))}
            </div>

            {/* Live Estimate Card (Canada) or Severance Summary Card (US) */}
            {isCanada ? (
              <div className="pt-3.5">
                <span className="font-sans font-[800] text-[10.5px] leading-[16px] tracking-[0.5px] uppercase text-[#5A6B78] block">
                  LIVE ESTIMATE · NOT WHAT YOU&apos;RE OWED
                </span>
                <div className="font-serif font-[600] text-[20px] leading-[23px] text-[#0C8F72] mt-1 mb-1">
                  ${Math.round(Number(data.statutoryMin || 17000) / 1000)}k – ${Math.round(Number(data.courtAwardHigh || 193000) / 1000)}k
                </div>
                <div className="font-sans font-[400] text-[11.5px] leading-[16px] text-[#5A6B78]">
                  {data.noticeWeeks || 8} wks notice · court-awarded {data.courtMonths || "15–21 mo"}
                </div>
                <div className="font-sans text-[11.5px] leading-[16px] text-[#5A6B78] mt-0.5">
                  {hasOffer ? (
                    <>
                      <span className="font-[700]">Your offer {offerVal}</span>
                      <span className="font-[400]"> — near the floor</span>
                    </>
                  ) : (
                    <>
                      <span className="font-[700]">Your offer</span>
                      <span className="font-[400]"> — {data.documentsExtracted ? "not specified in documents" : "will be added from your documents"}</span>
                    </>
                  )}
                </div>

                {/* Enough badge */}
                <div className="bg-[#E5F5EE] border border-[#C7E6D6] rounded-[9px] h-[36.5px] flex items-center px-3 gap-1.5 mt-3">
                  <span className="font-sans font-[700] text-[12px] leading-[18px] text-[#0C8F72]">
                    ✓ Enough to show your results
                  </span>
                </div>
              </div>
            ) : (
              <div className="pt-3.5">
                <span className="font-sans font-[800] text-[10.5px] leading-[16px] tracking-[0.5px] uppercase text-[#5A6B78] block">
                  SEVERANCE REVIEW READY
                </span>
                <div className="font-serif font-[600] text-[20px] leading-[23px] text-[#0C8F72] mt-1 mb-1">
                  {offerVal}
                </div>
                <div className="font-sans text-[11.5px] leading-[16px] text-[#5A6B78] mt-0.5">
                  Federal &amp; state rules · Release terms &amp; deadlines
                </div>

                {/* Enough badge */}
                <div className="bg-[#E5F5EE] border border-[#C7E6D6] rounded-[9px] h-[36.5px] flex items-center px-3 gap-1.5 mt-3">
                  <span className="font-sans font-[700] text-[12px] leading-[18px] text-[#0C8F72]">
                    ✓ Enough to show your results
                  </span>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* ── Ask Lawyer Modal ── */}
      <AskLawyerModal
        isOpen={lawyerModalOpen}
        onClose={() => setLawyerModalOpen(false)}
        country={isCanada ? "CA" : "US"}
        regionName={String(provinceOrState)}
        caseId={caseId || cs?.id}
        sourcePage="/report/ready"
        enquiryType="ask_lawyer"
      />
    </div>
  );
}
