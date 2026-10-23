"use client";

import React, { useState } from "react";

interface AskLawyerModalProps {
  isOpen: boolean;
  onClose: () => void;
  country?: "US" | "CA";
  regionName?: string;
}

export default function AskLawyerModal({
  isOpen,
  onClose,
  country = "US",
  regionName = "your state",
}: AskLawyerModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const isUS = country === "US";
  const professionalWord = isUS ? "attorney" : "lawyer";
  const professionalPlural = isUS ? "Attorneys" : "Lawyers";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please add your name.");
      return;
    }
    if (!email.includes("@")) {
      setError("Please enter a valid email.");
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
    setSubmitted(true);
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#062c55]/45 backdrop-blur-[2px] animate-scrimin"
      onClick={handleClose}
    >
      <div
        className="relative bg-white rounded-[16px] p-5 sm:p-6 max-w-[420px] w-full max-h-[92vh] overflow-y-auto shadow-[0_40px_80px_-30px_rgba(6,44,85,0.55)] border border-[#e7e4dd] text-left animate-dlgup"
        onClick={(e) => e.stopPropagation()}
      >
        {submitted ? (
          <div>
            <div className="font-sans font-[800] text-[11px] uppercase tracking-[0.6px] text-[#0c8f72] mb-1.5">
              Sent
            </div>

            <h3 className="font-serif font-[600] text-[22px] sm:text-[24px] text-[#062c55] leading-[1.1] mb-2">
              Thanks, {name.trim().split(" ")[0] || "there"}.
            </h3>

            <p className="font-sans font-normal text-[13px] leading-[19px] text-[#17242f] mb-3">
              An employment {professionalWord} licensed in <b>{regionName}</b> will
              contact you, within <b>3 business days</b>, by phone or email.
            </p>

            <p className="font-sans font-normal text-[13px] leading-[19px] text-[#5a6b78] mb-5">
              While you wait, your free check is still here. If you want something
              to bring to the call, the Severance Report lays out your numbers and
              questions.
            </p>

            <button
              type="button"
              onClick={handleClose}
              className="w-full py-3 rounded-[9px] bg-[#0c8f72] hover:bg-[#0aa07e] text-white font-sans font-[700] text-[14px] leading-[20px] transition-colors cursor-pointer text-center shadow-xs"
            >
              Done
            </button>
          </div>
        ) : (
          <div>
            <div className="font-sans font-[800] text-[11px] uppercase tracking-[0.6px] text-[#0c8f72] mb-1.5">
              Talk to {isUS ? "an attorney" : "a lawyer"} · free
            </div>

            <h3 className="font-serif font-[600] text-[22px] sm:text-[24px] text-[#062c55] leading-[1.1] mb-2">
              Want {isUS ? "an attorney" : "a lawyer"} to contact you?
            </h3>

            <p className="font-sans font-normal text-[13px] leading-[19px] text-[#5a6b78] mb-4">
              Leave your details. We pass them, with your organized summary, to an
              employment {professionalWord} licensed in <b>{regionName}</b>. They
              contact you and decide whether to offer a consultation.
            </p>

            {error && (
              <div className="mb-3 p-2.5 rounded-[8px] bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block font-sans font-semibold text-[12px] text-[#062c55] mb-1">
                  Your name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className="w-full border border-[#cdd3d8] rounded-[9px] px-3.5 py-2 text-[13.5px] text-[#17242f] focus:outline-none focus:border-[#0c8f72]"
                  required
                />
              </div>

              <div>
                <label className="block font-sans font-semibold text-[12px] text-[#062c55] mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full border border-[#cdd3d8] rounded-[9px] px-3.5 py-2 text-[13.5px] text-[#17242f] focus:outline-none focus:border-[#0c8f72]"
                  required
                />
              </div>

              <div>
                <label className="block font-sans font-semibold text-[12px] text-[#062c55] mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  className="w-full border border-[#cdd3d8] rounded-[9px] px-3.5 py-2 text-[13.5px] text-[#17242f] focus:outline-none focus:border-[#0c8f72]"
                  required
                />
              </div>

              <label className="flex items-start gap-2.5 pt-1 cursor-pointer text-left">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-[#cdd3d8] text-[#0c8f72] focus:ring-[#0c8f72]"
                />
                <span className="font-sans font-normal text-[11.5px] leading-[16px] text-[#5a6b78]">
                  Share my name, email, phone and summary with one{" "}
                  {professionalWord} in {regionName}, who may contact me.{" "}
                  {professionalPlural} pay FairExit a flat advertising fee, never
                  a share of your case. This is not legal advice.
                </span>
              </label>

              <button
                type="submit"
                className="w-full mt-2 py-3 rounded-[9px] bg-[#0c8f72] hover:bg-[#0aa07e] text-white font-sans font-[700] text-[14px] leading-[20px] transition-colors cursor-pointer text-center shadow-xs"
              >
                Send my details
              </button>

              <p className="font-sans font-normal text-[11.5px] text-[#8a98a4] text-center mt-2.5">
                We keep your details only to pass them on. Documents are not shared.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
