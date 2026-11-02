"use client";

import React, { useState } from "react";

interface NoContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  country?: "CA" | "US";
  onSelectNeverSigned: () => void;
  onSelectMissingOrLater: (status: "missing" | "later") => void;
  onAddLater: () => void;
}

export default function NoContractModal({
  isOpen,
  onClose,
  country = "CA",
  onSelectNeverSigned,
  onSelectMissingOrLater,
  onAddLater,
}: NoContractModalProps) {
  const [selectedOption, setSelectedOption] = useState<
    "never" | "cant_find" | "not_sure"
  >("never");
  const [confirmedNeverSigned, setConfirmedNeverSigned] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  if (!isOpen) return null;

  const isUS = country === "US";
  const docName = isUS ? "offer letter or agreement" : "employment contract";
  const letterName = isUS ? "separation agreement" : "severance letter";

  const handleCopyEmail = async () => {
    const text =
      "Hi, could you send me a copy of the employment agreement or offer letter I signed when I was hired? Thank you.";
    try {
      await navigator.clipboard.writeText(text);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 3000);
    } catch {
      // fallback
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 3000);
    }
  };

  const handleContinue = () => {
    if (selectedOption === "never") {
      if (!confirmedNeverSigned) return;
      onSelectNeverSigned();
      onClose();
    } else {
      onSelectMissingOrLater("missing");
      onClose();
    }
  };

  const handleAddItClick = () => {
    onAddLater();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#062C55]/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div
        className="bg-white rounded-[20px] max-w-[480px] w-full p-6 sm:p-7 shadow-2xl border border-[#E7E4DD] relative my-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="no-contract-title"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-5 right-5 text-[#9AA7B2] hover:text-[#062C55] p-1.5 rounded-lg transition text-lg leading-none cursor-pointer"
        >
          ✕
        </button>

        {/* Modal Title & Subtitle */}
        <h2
          id="no-contract-title"
          className="font-serif text-[22px] sm:text-[24px] font-bold text-[#062C55] pr-8 leading-tight"
        >
          No {docName}?
        </h2>
        <p className="text-[13px] text-[#5A6B78] mt-1 mb-5">
          Pick what fits. It changes how your report reads your offer.
        </p>

        {/* Options List */}
        <div className="space-y-2.5">
          {/* Option 1: I never got one in writing */}
          <div
            onClick={() => setSelectedOption("never")}
            className={`border-[1.5px] rounded-2xl p-4 cursor-pointer transition flex items-start gap-3.5 ${
              selectedOption === "never"
                ? "border-[#0EB28D] bg-white ring-1 ring-[#0EB28D]/20 shadow-xs"
                : "border-[#E7E4DD] bg-white hover:border-[#CCD6DE]"
            }`}
          >
            <div className="pt-0.5 shrink-0">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                  selectedOption === "never"
                    ? "border-2 border-[#0EB28D]"
                    : "border-2 border-[#CCD6DE]"
                }`}
              >
                {selectedOption === "never" && (
                  <div className="w-2.5 h-2.5 rounded-full bg-[#0EB28D]" />
                )}
              </div>
            </div>
            <div>
              <h3 className="font-bold text-[14.5px] text-[#062C55] leading-snug">
                I never got one in writing
              </h3>
              <p className="text-[12px] sm:text-[12.5px] text-[#5A6B78] leading-normal mt-0.5">
                {isUS
                  ? "No signed offer letter or employment agreement for this job, on paper, by email or e-signature."
                  : "No signed employment contract or offer letter for this job, on paper, by email or e-signature."}
              </p>
            </div>
          </div>

          {/* Option 2: I signed one but can't find it */}
          <div
            onClick={() => setSelectedOption("cant_find")}
            className={`border-[1.5px] rounded-2xl p-4 cursor-pointer transition flex items-start gap-3.5 ${
              selectedOption === "cant_find"
                ? "border-[#0EB28D] bg-white ring-1 ring-[#0EB28D]/20 shadow-xs"
                : "border-[#E7E4DD] bg-white hover:border-[#CCD6DE]"
            }`}
          >
            <div className="pt-0.5 shrink-0">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                  selectedOption === "cant_find"
                    ? "border-2 border-[#0EB28D]"
                    : "border-2 border-[#CCD6DE]"
                }`}
              >
                {selectedOption === "cant_find" && (
                  <div className="w-2.5 h-2.5 rounded-full bg-[#0EB28D]" />
                )}
              </div>
            </div>
            <div>
              <h3 className="font-bold text-[14.5px] text-[#062C55] leading-snug">
                I signed one but can&apos;t find it
              </h3>
              <p className="text-[12px] sm:text-[12.5px] text-[#5A6B78] leading-normal mt-0.5">
                We&apos;ll show you where to look and how to ask for a copy.
              </p>
            </div>
          </div>

          {/* Option 3: I'm not sure */}
          <div
            onClick={() => setSelectedOption("not_sure")}
            className={`border-[1.5px] rounded-2xl p-4 cursor-pointer transition flex items-start gap-3.5 ${
              selectedOption === "not_sure"
                ? "border-[#0EB28D] bg-white ring-1 ring-[#0EB28D]/20 shadow-xs"
                : "border-[#E7E4DD] bg-white hover:border-[#CCD6DE]"
            }`}
          >
            <div className="pt-0.5 shrink-0">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                  selectedOption === "not_sure"
                    ? "border-2 border-[#0EB28D]"
                    : "border-2 border-[#CCD6DE]"
                }`}
              >
                {selectedOption === "not_sure" && (
                  <div className="w-2.5 h-2.5 rounded-full bg-[#0EB28D]" />
                )}
              </div>
            </div>
            <div>
              <h3 className="font-bold text-[14.5px] text-[#062C55] leading-snug">
                I&apos;m not sure
              </h3>
              <p className="text-[12px] sm:text-[12.5px] text-[#5A6B78] leading-normal mt-0.5">
                A signed offer letter counts. We&apos;ll help you check.
              </p>
            </div>
          </div>
        </div>

        {/* ── Option 1 Extra Card: Confirmation Checkbox ── */}
        {selectedOption === "never" && (
          <div className="bg-[#F6F4EF] border border-[#E7E4DD] rounded-xl p-4 mt-3.5 mb-4">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmedNeverSigned}
                onChange={(e) => setConfirmedNeverSigned(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-[#CFD8DF] text-[#0EB28D] focus:ring-[#0EB28D] shrink-0 accent-[#0EB28D]"
              />
              <span className="font-bold text-[13px] text-[#062C55] leading-snug select-none">
                I confirm I never signed a contract, offer letter or online agreement for this job.
              </span>
            </label>
            <p className="text-[12px] text-[#5A6B78] leading-relaxed mt-2 pl-6">
              We also check your {letterName}. If it mentions an agreement you signed, we&apos;ll ask you to add it.
            </p>
          </div>
        )}

        {/* ── Option 2 & 3 Extra Card: Where to look & Email copy ── */}
        {(selectedOption === "cant_find" || selectedOption === "not_sure") && (
          <div className="bg-[#F6F4EF] border border-[#E7E4DD] rounded-xl p-4 mt-3.5 mb-4 space-y-2">
            <h4 className="font-bold text-[13.5px] text-[#062C55]">
              Where to look
            </h4>
            <ol className="list-decimal pl-4 text-[12.5px] text-[#062C55] space-y-1.5 leading-normal">
              <li>
                Your personal email: search &ldquo;offer&rdquo;, &ldquo;agreement&rdquo;, &ldquo;DocuSign&rdquo;.
              </li>
              <li>
                Your HR or onboarding portal, if you can still log in.
              </li>
              <li>
                Ask HR for a copy. Most send one within a few days.{" "}
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="font-bold text-[#0C8F72] hover:underline cursor-pointer inline-block ml-0.5"
                >
                  {copiedEmail ? "✓ Copied!" : "Copy an email to HR"}
                </button>
              </li>
            </ol>
            <p className="text-[12px] text-[#5A6B78] leading-relaxed pt-1.5 border-t border-[#E7E4DD]/70 mt-2">
              No luck? You can still continue. Your report will be marked &ldquo;contract not added&rdquo; and some answers will stay open questions.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2.5 mt-5">
          {/* I'll add it / I'll add it later button */}
          <button
            type="button"
            onClick={handleAddItClick}
            className="w-full bg-white hover:bg-[#F6F4EF] border border-[#D5DDE4] hover:border-[#0EB28D] text-[#062C55] font-bold py-3.5 px-4 rounded-xl text-[14px] transition cursor-pointer flex items-center justify-center shadow-xs"
          >
            I&apos;ll add it
          </button>

          {/* Continue button */}
          {selectedOption === "never" ? (
            <button
              type="button"
              onClick={handleContinue}
              disabled={!confirmedNeverSigned}
              className={`w-full font-bold py-3.5 px-4 rounded-xl text-[14.5px] transition flex items-center justify-center ${
                confirmedNeverSigned
                  ? "bg-[#0EB28D] hover:bg-[#0C8F72] text-white shadow-sm cursor-pointer"
                  : "bg-[#A2E3D4] text-white cursor-not-allowed opacity-80"
              }`}
            >
              Continue without a contract
            </button>
          ) : (
            <button
              type="button"
              onClick={handleContinue}
              className="w-full bg-[#0EB28D] hover:bg-[#0C8F72] text-white font-bold py-3.5 px-4 rounded-xl text-[14.5px] transition cursor-pointer flex items-center justify-center shadow-sm"
            >
              Continue without it
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

