"use client";

import React, { useState } from "react";
import { notifyError, notifySuccess } from "@/lib/notifications";
import { fairexit, Country } from "@/lib/api/fairexit";

export interface AskLawyerModalProps {
  isOpen: boolean;
  onClose: () => void;
  country?: Country | string;
  regionName?: string;
  /** Free-check case, when there is one (sends the case summary, never documents) */
  caseId?: string | null;
  sourcePage?: string;
  enquiryType?: string;
}

export default function AskLawyerModal({
  isOpen,
  onClose,
  country = "CA",
  regionName = "Ontario",
  caseId = null,
  sourcePage,
  enquiryType = "ask_lawyer",
}: AskLawyerModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  if (!isOpen) return null;

  const isUS = country === "US";
  const professionalWord = isUS ? "attorney" : "lawyer";
  const professionalPlural = isUS ? "Attorneys" : "Lawyers";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;

    if (!name.trim()) {
      setError("Please add your name.");
      return;
    }
    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (phone.replace(/\D/g, "").length < 10) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }
    if (!agreed) {
      setError("Please tick the box to allow contact.");
      return;
    }

    setError("");
    setSending(true);
    const targetCountry: Country = country === "US" ? "US" : "CA";
    const currentPath = sourcePage || (typeof window !== "undefined" ? window.location.pathname : "");

    try {
      await fairexit.askLawyer({
        caseId: caseId || undefined,
        country: targetCountry,
        jurisdictionCode: regionName,
        regionName,
        name: name.trim(),
        email: trimmedEmail,
        phone: phone.trim(),
        consent: true,
        enquiryType,
        sourcePage: currentPath,
      });
      setSubmitted(true);
      notifySuccess("Inquiry sent successfully!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to submit lawyer consultation request.";
      setError(msg);
      notifyError(msg);
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setName("");
    setEmail("");
    setPhone("");
    setAgreed(false);
    setSubmitted(false);
    setError("");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#062C55]/45 backdrop-blur-[2px] animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        className="relative bg-white rounded-[18px] p-6 sm:p-8 max-w-[440px] w-full max-h-[94vh] overflow-y-auto shadow-[0_40px_80px_-25px_rgba(6,44,85,0.45)] border border-[#E7E4DD] text-left animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button ✕ */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-[#5A6B78] hover:text-[#062C55] hover:bg-[#F6F4EF] transition cursor-pointer"
          aria-label="Close"
        >
          ✕
        </button>

        {submitted ? (
          <div className="py-2">
            <div className="font-sans font-[800] text-[11px] uppercase tracking-[0.8px] text-[#0C8F72] mb-1.5">
              SENT
            </div>

            <h3 className="font-serif font-[600] text-[24px] sm:text-[26px] text-[#062C55] leading-[1.2] mb-3">
              Thanks, {name.trim().split(" ")[0] || "there"}.
            </h3>

            <p className="font-sans font-normal text-[14px] leading-[21px] text-[#17242F] mb-3">
              An employment {professionalWord} licensed in{" "}
              <strong className="font-bold text-[#062C55]">{regionName}</strong> will
              contact you within <strong className="font-bold text-[#062C55]">3 business days</strong> by phone or email.
            </p>

            <p className="font-sans font-normal text-[13.5px] leading-[20px] text-[#5A6B78] mb-6">
              We keep your details confidential and only pass them on to connect you.
            </p>

            <button
              type="button"
              onClick={handleClose}
              className="w-full h-[48px] rounded-[10px] bg-[#0EB28D] hover:bg-[#0C8F72] text-white font-sans font-[700] text-[15px] transition cursor-pointer flex items-center justify-center shadow-xs"
            >
              Done
            </button>
          </div>
        ) : (
          <div>
            {/* Tagline */}
            <div className="font-sans font-[800] text-[11px] uppercase tracking-[0.8px] text-[#0C8F72] mb-1.5">
              TALK TO A {isUS ? "LAWYER" : "LAWYER"} · FREE
            </div>

            {/* Heading */}
            <h3 className="font-serif font-[600] text-[24px] sm:text-[26px] text-[#062C55] leading-[1.2] mb-2.5">
              Want a {professionalWord} to contact you?
            </h3>

            {/* Subtext */}
            <p className="font-sans font-normal text-[14px] leading-[21px] text-[#5A6B78] mb-5">
              Leave your details. We pass them, with your organized summary, to an
              employment {professionalWord} licensed in{" "}
              <strong className="font-bold text-[#062C55]">{regionName}</strong>. They
              contact you and decide whether to offer a consultation.
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-[9px] bg-red-50 border border-red-200 text-red-700 text-[13px] font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-sans font-[700] text-[13px] text-[#062C55] mb-1.5">
                  Your name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  placeholder=""
                  className="w-full h-[46px] border border-[#D8D3C8] rounded-[10px] px-3.5 text-[15px] font-[500] text-[#062C55] focus:outline-none focus:border-[#0EB28D] focus:ring-2 focus:ring-[#0EB28D]/20 transition"
                  required
                />
              </div>

              <div>
                <label className="block font-sans font-[700] text-[13px] text-[#062C55] mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder=""
                  className="w-full h-[46px] border border-[#D8D3C8] rounded-[10px] px-3.5 text-[15px] font-[500] text-[#062C55] focus:outline-none focus:border-[#0EB28D] focus:ring-2 focus:ring-[#0EB28D]/20 transition"
                  required
                />
              </div>

              <div>
                <label className="block font-sans font-[700] text-[13px] text-[#062C55] mb-1.5">
                  Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  placeholder=""
                  className="w-full h-[46px] border border-[#D8D3C8] rounded-[10px] px-3.5 text-[15px] font-[500] text-[#062C55] focus:outline-none focus:border-[#0EB28D] focus:ring-2 focus:ring-[#0EB28D]/20 transition"
                  required
                />
              </div>

              <label className="flex items-start gap-3 pt-1 cursor-pointer text-left">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 w-[18px] h-[18px] rounded-[4px] border-[#CDD3D8] text-[#0EB28D] focus:ring-[#0EB28D] cursor-pointer shrink-0"
                />
                <span className="font-sans font-normal text-[12px] leading-[17px] text-[#5A6B78]">
                  Share my name, email, phone and summary with one {professionalWord} in {regionName}, who may contact me. {professionalPlural} pay FairExit a flat advertising fee, never a share of your case. This is not legal advice.
                </span>
              </label>

              <button
                type="submit"
                disabled={sending}
                className="w-full h-[50px] rounded-[10px] bg-[#0EB28D] hover:bg-[#0C8F72] text-white font-sans font-[700] text-[16px] leading-[22px] transition flex items-center justify-center cursor-pointer shadow-[0px_10px_25px_-5px_rgba(14,178,141,0.35)] mt-4 disabled:opacity-50"
              >
                {sending ? "Sending…" : "Send my details"}
              </button>

              <p className="font-sans font-normal text-[12px] leading-[17px] text-[#5A6B78] text-left mt-2.5">
                We keep your details only to pass them on. Documents are not shared.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
