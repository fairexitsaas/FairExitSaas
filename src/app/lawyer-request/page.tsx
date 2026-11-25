"use client";

import React, { useState, useEffect, useContext, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CountryContext, CountryCode } from "@/context/CountryContext";
import { fairexit, caseStore } from "@/lib/api/fairexit";
import { getReportInputs } from "@/lib/report-storage";
import Footer from "@/components/layout/Footer";
import FloatingActions from "@/components/landing/FloatingActions";

function LawyerRequestContent() {
  const context = useContext(CountryContext);
  const searchParams = useSearchParams();
  const urlCountry = searchParams?.get("country")?.toUpperCase();
  const urlCaseId = searchParams?.get("case");
  const urlReportId = searchParams?.get("report");
  const urlToken = searchParams?.get("t");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [caseContext, setCaseContext] = useState<any>(null);
  const [loadingCase, setLoadingCase] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Determine country
  const country: CountryCode =
    urlCountry === "US" || urlCountry === "CA"
      ? (urlCountry as CountryCode)
      : (caseContext?.country as CountryCode) || context?.Country || "CA";
  const isCanada = country === "CA";
  const lawyerWord = isCanada ? "lawyer" : "attorney";

  // Check for active case context
  const activeCaseId = urlCaseId || (typeof window !== "undefined" ? caseStore.last() : null);

  useEffect(() => {
    let isMounted = true;

    // 1. Extract dedicated lawyer token from URL fragment (preferred) or query string (fallback)
    let incomingToken: string | null = null;
    if (typeof window !== "undefined") {
      try {
        const hash = window.location.hash.replace(/^#/, "");
        if (hash) {
          const hashParams = new URLSearchParams(hash);
          incomingToken = hashParams.get("t") || hashParams.get("token") || (hash.startsWith("fxl_") || hash.startsWith("fxc_") ? hash : null);
        }
      } catch {}
    }
    if (!incomingToken && urlToken) {
      incomingToken = urlToken;
    }

    // 2. Cache token into caseStore and immediately strip token/hash from browser-visible URL
    if (activeCaseId && incomingToken && typeof window !== "undefined") {
      caseStore.set(activeCaseId, incomingToken);
    }
    if (typeof window !== "undefined") {
      try {
        const currentUrl = new URL(window.location.href);
        let modified = false;
        if (currentUrl.hash) {
          currentUrl.hash = "";
          modified = true;
        }
        if (currentUrl.searchParams.has("t")) {
          currentUrl.searchParams.delete("t");
          modified = true;
        }
        if (modified) {
          const cleanSearch = currentUrl.searchParams.toString();
          const cleanUrl = currentUrl.pathname + (cleanSearch ? `?${cleanSearch}` : "");
          window.history.replaceState({}, document.title, cleanUrl);
        }
      } catch {}
    }

    // Check local questionnaire inputs as initial fallback
    try {
      const stored = getReportInputs();
      if (stored && isMounted) {
        if (stored.email && !email) setEmail(stored.email);
        if (stored.employee_name && !fullName) setFullName(stored.employee_name);
        if (!caseContext) {
          setCaseContext({
            jurisdiction: { name: stored.provinceName || stored.province || stored.state },
            answers: {
              years: stored.years,
              salary: stored.salary,
              offer: stored.offer,
              role: stored.role,
            },
          });
        }
      }
    } catch {}

    if (!activeCaseId) return;
    setLoadingCase(true);

    // 3. Exchange lawyer token with backend via POST request, fallback to getCase
    const tokenToExchange = incomingToken || (typeof window !== "undefined" ? caseStore.get(activeCaseId) : null);
    const caseFetchPromise = (tokenToExchange && typeof fairexit.exchangeLawyerToken === "function")
      ? fairexit.exchangeLawyerToken(activeCaseId, tokenToExchange).catch(() => fairexit.getCase(activeCaseId))
      : fairexit.getCase(activeCaseId);

    caseFetchPromise
      .then((c) => {
        if (isMounted && c) {
          setCaseContext(c);
          if (c.email && !email) setEmail(c.email);
          const retrievedName = c.customerName || c.answers?.customer_name || c.answers?.name;
          if (retrievedName && !fullName) setFullName(retrievedName);
        }
      })
      .catch((err) => {
        console.warn("[LawyerRequest] Case context retrieval failed or unauthenticated:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingCase(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeCaseId, urlCaseId, urlToken]);

  const validateInputs = () => {
    if (!fullName.trim()) {
      setErrorMsg("Please enter your full name.");
      return false;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMsg("Please enter a valid 10-digit phone number.");
      return false;
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setErrorMsg("Please enter a valid email address.");
      return false;
    }
    setErrorMsg("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return; // Prevent duplicate clicks while submitting
    if (!validateInputs()) return;

    setSubmitting(true);
    setErrorMsg("");

    try {
      let activeToken = urlToken || (activeCaseId && typeof window !== "undefined" ? caseStore.get(activeCaseId) || undefined : undefined);
      if (!activeToken && typeof window !== "undefined") {
        try {
          const hash = window.location.hash.replace(/^#/, "");
          const hashParams = new URLSearchParams(hash);
          activeToken = hashParams.get("t") || hashParams.get("token") || (hash.startsWith("fxl_") || hash.startsWith("fxc_") ? hash : undefined) || undefined;
        } catch {}
      }
      await fairexit.askLawyer({
        caseId: activeCaseId || undefined,
        reportId: urlReportId || undefined,
        token: activeToken,
        country: (caseContext?.country as CountryCode) || country,
        jurisdictionCode: caseContext?.jurisdiction_code || undefined,
        regionName: caseContext?.jurisdiction?.name || undefined,
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        enquiryType: "lawyer_request_page",
        sourcePage: "/lawyer-request",
        consent: true,
      });

      setSubmitted(true);
    } catch (err: any) {
      console.error("[LawyerRequest] Submission failed:", err);
      setErrorMsg(
        err?.message ||
          "We could not submit your request at this moment. Please check your details and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F4EF] text-[#17242F] font-sans antialiased">
      {/* ── Minimal Header (Logo + Exit only, no nav links) ── */}
      <header className="w-full bg-[#F6F4EF]/95 backdrop-blur-md border-b border-[#E7E4DD] px-4 lg:px-8 h-[56px] flex items-center justify-between">
        <Link href="/" className="inline-flex items-center">
          <Image
            src="/fairexitlogo.png"
            alt="FairExit"
            width={103}
            height={26}
            className="h-[26px] w-auto object-contain"
            priority
          />
        </Link>
        <Link
          href="/"
          className="text-[13px] font-semibold text-[#5A6B78] hover:text-[#062C55] transition underline"
        >
          Exit ✕
        </Link>
      </header>

      {/* ── Main Single-Page Content Area ── */}
      <main className="flex-1 w-full max-w-[640px] md:max-w-[680px] mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-center">
        {submitted ? (
          /* ════════════════════════════════════════════════════════════
              SUCCESS / THANK-YOU CONFIRMATION (Inline on Same Page)
          ════════════════════════════════════════════════════════════ */
          <div className="bg-white border border-[#E7E4DD] rounded-2xl p-7 sm:p-10 shadow-sm animate-fade text-center">
            <div className="w-16 h-16 rounded-full bg-[#E6F5EF] text-[#0EB28D] flex items-center justify-center mx-auto mb-5 text-2xl font-bold shadow-xs">
              ✓
            </div>
            <span className="text-xs font-extrabold tracking-wider uppercase text-[#0C8F72] block mb-2">
              Request Confirmed
            </span>
            <h1 className="font-serif font-semibold text-2xl sm:text-3xl text-[#062C55] mb-3 leading-snug">
              Thank you — your request has been received.
            </h1>
            <p className="text-[15px] sm:text-[16px] text-[#5A6B78] leading-relaxed max-w-[480px] mx-auto mb-6">
              Thank you, <strong className="text-[#062C55]">{fullName}</strong>. We have received your request and forwarded your details to our legal support team.
            </p>

            <div className="p-4 sm:p-5 rounded-xl bg-[#FAF9F5] border border-[#E7E4DD] text-left max-w-[500px] mx-auto mb-8 text-xs sm:text-[13.5px] text-[#5A6B78] space-y-2 leading-relaxed">
              <p>
                An independent employment {lawyerWord} will review your circumstances to determine if they are in a position to assist you.
              </p>
              <p>
                Submitting this request does not guarantee a consultation or legal representation, and there is no obligation to proceed.
              </p>
            </div>

            <Link
              href="/"
              className="inline-block py-3 px-8 rounded-xl bg-[#062C55] hover:bg-[#041D38] text-white font-sans font-bold text-sm shadow-sm transition"
            >
              Return to homepage
            </Link>
          </div>
        ) : (
          /* ════════════════════════════════════════════════════════════
              SINGLE-PAGE FORM (All Questions Visible Together)
          ════════════════════════════════════════════════════════════ */
          <div className="bg-white border border-[#E7E4DD] rounded-2xl p-6 sm:p-9 shadow-sm animate-fade">
            <span className="text-xs font-extrabold tracking-wider uppercase text-[#0C8F72] block mb-2">
              Legal Network Consultation
            </span>
            <h1 className="font-serif font-semibold text-2xl sm:text-3xl text-[#062C55] mb-3 leading-snug">
              Request to speak with an employment {lawyerWord}
            </h1>
            <p className="text-[14.5px] sm:text-[15.5px] text-[#5A6B78] leading-relaxed mb-6">
              If you are facing a layoff or reviewing a severance agreement, an independent employment {lawyerWord} can assess your situation and explain your options. Please provide your contact details below.
            </p>

            {/* Existing Case Notice (if available) */}
            {caseContext && (
              <div className="mb-6 p-4 rounded-xl bg-[#F0F7F4] border border-[#CDE5DB] text-left">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-[#0EB28D]" />
                  <span className="font-sans font-bold text-xs uppercase tracking-wider text-[#062C55]">
                    Associated FairExit Case Found
                  </span>
                </div>
                <p className="text-xs sm:text-[13px] text-[#416155] leading-relaxed">
                  We found your previous severance check ({caseContext.jurisdiction?.name || (isCanada ? "Canada" : "United States")}{caseContext.answers?.years ? ` · ${caseContext.answers.years} yrs service` : ""}{caseContext.answers?.salary ? ` · $${Math.round(Number(caseContext.answers.salary)).toLocaleString()}/yr` : ""}). This case summary will be securely attached to your inquiry.
                </p>
              </div>
            )}
            {!caseContext && urlReportId && (
              <div className="mb-6 p-4 rounded-xl bg-[#F0F7F4] border border-[#CDE5DB] text-left">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-[#0EB28D]" />
                  <span className="font-sans font-bold text-xs uppercase tracking-wider text-[#062C55]">
                    Report Reference Linked
                  </span>
                </div>
                <p className="text-xs sm:text-[13px] text-[#416155] leading-relaxed">
                  Report ID <strong className="text-[#062C55]">{urlReportId}</strong> will be referenced with your consultation request. Please confirm your contact details below.
                </p>
              </div>
            )}

            {/* Error Message Alert */}
            {errorMsg && (
              <div
                role="alert"
                className="mb-5 p-3.5 rounded-xl bg-[#FDE8E8] border border-[#F8B4B4] text-[#9B1C1C] text-sm font-semibold"
              >
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              {/* Field 1: Full Name */}
              <div>
                <label className="block text-xs font-bold text-[#062C55] uppercase tracking-wider mb-1.5">
                  Full name <span className="text-[#0EB28D]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Jordan Miller"
                  disabled={submitting}
                  className="w-full px-4 py-3 bg-[#FAF9F5] border border-[#CFD8DF] rounded-xl text-sm sm:text-base text-[#062C55] outline-none focus:border-[#0EB28D] focus:bg-white transition"
                />
              </div>

              {/* Field 2: Phone Number */}
              <div>
                <label className="block text-xs font-bold text-[#062C55] uppercase tracking-wider mb-1.5">
                  Phone number <span className="text-[#0EB28D]">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. (555) 234-5678"
                  disabled={submitting}
                  className="w-full px-4 py-3 bg-[#FAF9F5] border border-[#CFD8DF] rounded-xl text-sm sm:text-base text-[#062C55] outline-none focus:border-[#0EB28D] focus:bg-white transition"
                />
                <span className="text-[11.5px] text-[#5A6B78] mt-1 block">
                  A 10-digit direct phone number where you can be reached.
                </span>
              </div>

              {/* Field 3: Email Address */}
              <div>
                <label className="block text-xs font-bold text-[#062C55] uppercase tracking-wider mb-1.5">
                  Email address <span className="text-[#0EB28D]">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. jordan.miller@gmail.com"
                  disabled={submitting}
                  className="w-full px-4 py-3 bg-[#FAF9F5] border border-[#CFD8DF] rounded-xl text-sm sm:text-base text-[#062C55] outline-none focus:border-[#0EB28D] focus:bg-white transition"
                />
                <span className="text-[11.5px] text-[#5A6B78] mt-1 block">
                  Use your personal email address, not your work email.
                </span>
              </div>

              {/* How this works & Legal Notice */}
              <div className="p-4 sm:p-4.5 rounded-xl bg-[#FAF9F5] border border-[#E7E4DD] text-left space-y-1.5 my-5">
                <h3 className="font-sans font-bold text-xs uppercase tracking-wider text-[#062C55]">
                  How this works
                </h3>
                <ul className="text-xs text-[#5A6B78] space-y-1 list-disc pl-4 leading-relaxed">
                  <li>
                    Your contact information and situation summary will be reviewed and routed to an independent employment {lawyerWord}.
                  </li>
                  <li>
                    Submitting a request does not create a lawyer-client relationship and does not guarantee representation or a consultation.
                  </li>
                  <li>
                    Connecting is completely free, with no obligation to proceed.
                  </li>
                </ul>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#0EB28D] hover:bg-[#0C8F72] text-white font-sans font-bold text-base shadow-sm hover:shadow transition cursor-pointer text-center flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Submitting request…</span>
                    </>
                  ) : (
                    "Submit request →"
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer country={country} />
      <FloatingActions />
    </div>
  );
}

export default function LawyerRequestPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen bg-[#F6F4EF]" />}
    >
      <LawyerRequestContent />
    </Suspense>
  );
}
