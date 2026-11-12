"use client";

import React, { useState } from "react";
import { fairexit } from "@/lib/api/fairexit";

export interface ChangeJurisdictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  currentCountry: "CA" | "US";
  currentRegion?: string;
  suggestedCountry?: "CA" | "US" | null;
  suggestedRegion?: string | null;
  onSuccess?: (result?: { case?: any; page?: any }, region?: string) => void;
}

const CA_PROVINCES = [
  "Ontario",
  "British Columbia",
  "Alberta",
  "Nova Scotia",
  "Saskatchewan",
  "Manitoba",
  "New Brunswick",
  "Newfoundland and Labrador",
  "Prince Edward Island",
];

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming"
];

function matchRegion(val: string | null | undefined, c: "CA" | "US"): string | null {
  if (!val) return null;
  const list = c === "CA" ? CA_PROVINCES : US_STATES;
  const clean = val.trim().toLowerCase();
  const exact = list.find((r) => r.toLowerCase() === clean);
  if (exact) return exact;
  const sub = list.find((r) => clean.includes(r.toLowerCase()) || r.toLowerCase().includes(clean));
  if (sub) return sub;
  return null;
}

export default function ChangeJurisdictionModal({
  isOpen,
  onClose,
  caseId,
  currentCountry,
  currentRegion,
  suggestedCountry,
  suggestedRegion,
  onSuccess,
}: ChangeJurisdictionModalProps) {
  const initialCountry = suggestedCountry || currentCountry || "CA";
  const [country, setCountry] = useState<"CA" | "US">(initialCountry);
  const [region, setRegion] = useState<string>(() => {
    const matchedSuggested = matchRegion(suggestedRegion, initialCountry);
    if (matchedSuggested) return matchedSuggested;
    const matchedCurrent = matchRegion(currentRegion, initialCountry);
    if (matchedCurrent) return matchedCurrent;
    return initialCountry === "CA" ? "Ontario" : "California";
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  React.useEffect(() => {
    if (isOpen) {
      const initCountry = suggestedCountry || currentCountry || "CA";
      setCountry(initCountry);
      const matchedSuggested = matchRegion(suggestedRegion, initCountry);
      const matchedCurrent = matchRegion(currentRegion, initCountry);
      setRegion(matchedSuggested || matchedCurrent || (initCountry === "CA" ? "Ontario" : "California"));
      setErrorMessage("");
      setIsSubmitting(false);
    }
  }, [isOpen, suggestedCountry, suggestedRegion, currentCountry, currentRegion]);

  if (!isOpen) return null;

  const handleCountryChange = (newCountry: "CA" | "US") => {
    setCountry(newCountry);
    if (newCountry === "CA") {
      setRegion(suggestedCountry === "CA" && suggestedRegion ? suggestedRegion : "Ontario");
    } else {
      setRegion(suggestedCountry === "US" && suggestedRegion ? suggestedRegion : "California");
    }
  };

  const handleSave = async () => {
    if (!caseId || !region) return;
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fairexit.changeJurisdiction(caseId, country, region);
      if (onSuccess) {
        onSuccess(res, region);
      } else {
        onClose();
      }
    } catch (err: any) {
      console.error("Failed to update jurisdiction:", err);
      setErrorMessage(err?.message || "Failed to update jurisdiction. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="bg-white rounded-[18px] max-w-md w-full p-6 sm:p-7 shadow-2xl border border-[#E7E4DD] relative animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4.5 right-4.5 text-[#5A6B78] hover:text-[#062C55] w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#FAF9F5] transition text-[18px]"
          aria-label="Close"
          disabled={isSubmitting}
        >
          ✕
        </button>

        <span className="font-sans font-[800] text-[11px] tracking-[1px] text-[#0C8F72] uppercase block mb-1">
          LOCATION SETTINGS
        </span>
        <h3 className="font-serif font-[600] text-[22px] text-[#062C55] mb-1.5">
          Change your jurisdiction
        </h3>
        <p className="font-sans text-[13.5px] text-[#5A6B78] leading-[20px] mb-5">
          Severance laws differ by location. Choose the province or state where you worked.
        </p>

        {suggestedRegion && (
          <div className="mb-4.5 p-3 rounded-[10px] bg-[#FFF8E7] border border-[#E8D196] text-[12.5px] text-[#062C55]">
            <span className="font-bold">Detected in documents:</span> {suggestedRegion}
            {suggestedCountry ? ` (${suggestedCountry === "CA" ? "Canada" : "United States"})` : ""}
          </div>
        )}

        {errorMessage && (
          <div className="mb-4.5 p-3 rounded-[10px] bg-[#FDF2F2] border border-[#F8B4B4] text-[13px] text-[#991B1B]">
            {errorMessage}
          </div>
        )}

        <div className="space-y-4 mb-6">
          {/* Country Selection */}
          <div>
            <label className="block font-sans font-[700] text-[13px] text-[#062C55] mb-2">
              Country
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleCountryChange("CA")}
                className={`py-2.5 px-3 rounded-[10px] font-sans font-[700] text-[13.5px] border transition flex items-center justify-center gap-2 ${
                  country === "CA"
                    ? "bg-[#EEF8F3] border-[#0C8F72] text-[#0C8F72] shadow-xs"
                    : "bg-[#FAF9F5] border-[#E7E4DD] text-[#5A6B78] hover:border-[#C9D1D7]"
                }`}
              >
                <span>🇨🇦</span>
                <span>Canada</span>
              </button>
              <button
                type="button"
                onClick={() => handleCountryChange("US")}
                className={`py-2.5 px-3 rounded-[10px] font-sans font-[700] text-[13.5px] border transition flex items-center justify-center gap-2 ${
                  country === "US"
                    ? "bg-[#EEF8F3] border-[#0C8F72] text-[#0C8F72] shadow-xs"
                    : "bg-[#FAF9F5] border-[#E7E4DD] text-[#5A6B78] hover:border-[#C9D1D7]"
                }`}
              >
                <span>🇺🇸</span>
                <span>United States</span>
              </button>
            </div>
          </div>

          {/* Region Selection */}
          <div>
            <label className="block font-sans font-[700] text-[13px] text-[#062C55] mb-2">
              {country === "CA" ? "Province" : "State"}
            </label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full h-[42px] px-3.5 rounded-[10px] border border-[#D8D3C8] bg-white font-sans text-[14px] text-[#062C55] focus:outline-hidden focus:border-[#0C8F72] focus:ring-1 focus:ring-[#0C8F72]"
            >
              {(country === "CA" ? CA_PROVINCES : US_STATES).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E7E4DD]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-[9px] border border-[#D8D3C8] text-[#5A6B78] font-sans font-[600] text-[13.5px] hover:bg-[#FAF9F5] transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-[9px] bg-[#062C55] hover:bg-[#0C3B6E] text-white font-sans font-[700] text-[13.5px] transition shadow-xs flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <span>Update jurisdiction</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

