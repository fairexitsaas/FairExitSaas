"use client";

import React, { useState } from "react";
import Image from "next/image";
import { fairexit, caseStore, FairExitApiError } from "@/lib/api/fairexit";
import { saveReportInputs } from "@/lib/report-storage";
import { notifySuccess } from "@/lib/notifications";

export interface PostPaymentCustomerModalProps {
  isOpen: boolean;
  caseId: string | null;
  initialName?: string;
  initialEmail?: string;
  onSuccess: (data: { name: string; email: string; privateLink?: string }) => void;
  onClose?: () => void;
}

export default function PostPaymentCustomerModal({
  isOpen,
  caseId,
  initialName = "",
  initialEmail = "",
  onSuccess,
  onClose,
}: PostPaymentCustomerModalProps) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [consentNews, setConsentNews] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setErrorMessage("Please enter your name.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      if (caseId) {
        const res = await fairexit.submitCustomerInfo(caseId, {
          name: trimmedName,
          email: trimmedEmail,
          consentNews,
        });
        saveReportInputs({
          employee_name: trimmedName,
          email: trimmedEmail,
          remindMe: consentNews,
        });
        if (res?.privateLink) {
          try {
            const parsed = new URL(res.privateLink);
            const t = parsed.searchParams.get("t");
            if (t) caseStore.set(caseId, t);
          } catch {
            const match = res.privateLink.match(/[?&]t=([^&]+)/);
            if (match?.[1]) caseStore.set(caseId, decodeURIComponent(match[1]));
          }
        }
        notifySuccess("Customer information saved!");
        onSuccess({
          name: trimmedName,
          email: trimmedEmail,
          privateLink: res?.privateLink,
        });
      } else {
        // Fallback for offline/local case
        saveReportInputs({
          employee_name: trimmedName,
          email: trimmedEmail,
          remindMe: consentNews,
        });
        onSuccess({
          name: trimmedName,
          email: trimmedEmail,
        });
      }
    } catch (err: unknown) {
      const msg =
        err instanceof FairExitApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Could not save your details. Please check your connection and try again.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Your payment is confirmed"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#062C55]/65 backdrop-blur-xs transition-opacity"
        onClick={() => {
          if (!isSubmitting && onClose) onClose();
        }}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-[460px] bg-white rounded-[16px] p-6 sm:p-8 shadow-[0_40px_90px_-30px_rgba(6,44,85,0.6)] border border-[#E7E4DD] z-10 animate-dlgup">
        {/* Success check badge */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-[26px] h-[26px] rounded-full bg-[#E5F5EE] border border-[#C7E6D6] flex items-center justify-center text-[#0C8F72] text-[13px] font-bold">
            ✓
          </div>
          <span className="font-sans font-[700] text-[12.5px] uppercase tracking-wider text-[#0C8F72]">
            Payment confirmed
          </span>
        </div>

        {/* Exact required title */}
        <h2 className="font-serif font-[600] text-[22px] sm:text-[24px] leading-[30px] text-[#062C55] mb-2">
          Your payment is confirmed. Enter your name and email so we can send you your report.
        </h2>

        <p className="font-sans text-[13px] leading-[19px] text-[#5A6B78] mb-5">
          We&apos;ll send your completed report and your secure, private access link here.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field */}
          <div>
            <label
              htmlFor="post-pay-name"
              className="block font-sans font-[700] text-[13px] leading-[18px] text-[#062C55] mb-1.5"
            >
              Your name
            </label>
            <div className="relative flex items-center rounded-[10px] bg-[#FFFDF5] border border-[#CFD8DF] focus-within:border-[#0EB28D] overflow-hidden transition-colors">
              <input
                id="post-pay-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Avery Morgan"
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 bg-transparent font-sans text-[14.5px] text-[#062C55] placeholder-[#9AA3AB] outline-none disabled:opacity-50"
                autoFocus
              />
            </div>
          </div>

          {/* Email Field */}
          <div>
            <label
              htmlFor="post-pay-email"
              className="block font-sans font-[700] text-[13px] leading-[18px] text-[#062C55] mb-1.5"
            >
              Email address
            </label>
            <div className="relative flex items-center rounded-[10px] bg-[#FFFDF5] border border-[#CFD8DF] focus-within:border-[#0EB28D] overflow-hidden transition-colors">
              <input
                id="post-pay-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 bg-transparent font-sans text-[14.5px] text-[#062C55] placeholder-[#9AA3AB] outline-none disabled:opacity-50"
              />
            </div>
          </div>

          {/* Newsletter / news optional checkbox */}
          <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              checked={consentNews}
              onChange={(e) => setConsentNews(e.target.checked)}
              disabled={isSubmitting}
              className="w-4 h-4 rounded-[3px] border-[1.5px] border-[#8A96A0] text-[#0EB28D] focus:ring-[#0EB28D] mt-0.5"
            />
            <span className="font-sans text-[12.5px] leading-[18px] text-[#5A6B78]">
              Also send me severance tips and FairExit updates. Unsubscribe any time.
            </span>
          </label>

          {/* Error Message */}
          {errorMessage && (
            <div
              role="alert"
              className="p-3 bg-[#FBECEB] border border-[#F4CBC8] text-[#A3231F] text-[13px] rounded-[10px] flex items-center gap-2"
            >
              <span className="font-bold">✕</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Exact required Button: "Send my report" */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-[50px] rounded-[12px] bg-[#12C79A] hover:bg-[#0EB28D] text-white font-sans font-[800] text-[16px] leading-[24px] transition-all shadow-[0px_18px_40px_-18px_rgba(5,43,84,0.12)] cursor-pointer flex items-center justify-center disabled:opacity-50 mt-2"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                <span>Saving details…</span>
              </div>
            ) : (
              "Send my report"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

