"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  normalizeRegionCode,
  getRegionDisplayName,
  getLoadingCardsForRegion,
  LoadingCard,
} from "@/lib/loadingCards";

export interface FullScreenLoadingExperienceProps {
  /** "reading" for Wait 1 (document extraction) or "building" for Wait 2 (report compilation) */
  mode: "reading" | "building";
  /** Case ID for polling or logging */
  caseId?: string | null;
  /** Whether the user uploaded an employment contract document */
  hasContract?: boolean;
  /** Jurisdiction name, e.g. "British Columbia" or "New York" */
  jurisdictionName?: string | null;
  /** Jurisdiction code, e.g. "CA-BC" or "US-NY" */
  jurisdictionCode?: string | null;
  /** Country code or flag */
  isUS?: boolean;
  /** Internal progress stage (optional hint from parent) */
  currentStage?: "upload" | "letter" | "contract" | "rules" | "building" | "ready";
  /** Processing error if any */
  error?: string | null;
  /** Retry callback */
  onRetry?: () => Promise<void> | void;
  /** Force allow region cards in production test environment */
  forceAllowRegionCards?: boolean;
}

export type StepState = "completed" | "active" | "pending";

export interface StepItem {
  id: string;
  label: string;
  state: StepState;
}

export default function FullScreenLoadingExperience({
  mode,
  hasContract = false,
  jurisdictionName,
  jurisdictionCode,
  isUS = false,
  currentStage,
  error,
  onRetry,
  forceAllowRegionCards = false,
}: FullScreenLoadingExperienceProps) {
  // ── Regional Cards & Jurisdiction Setup ──
  const resolvedRegionCode = useMemo(
    () => normalizeRegionCode(jurisdictionCode, isUS ? "US" : "CA"),
    [jurisdictionCode, isUS]
  );

  const resolvedRegionName = useMemo(
    () => getRegionDisplayName(resolvedRegionCode, jurisdictionName),
    [resolvedRegionCode, jurisdictionName]
  );

  const cards = useMemo<LoadingCard[]>(() => {
    return getLoadingCardsForRegion(resolvedRegionCode, isUS, forceAllowRegionCards);
  }, [resolvedRegionCode, isUS, forceAllowRegionCards]);

  // ── Change 17: Rotating Loading Messages ──
  const rotatingLines = useMemo<string[]>(() => {
    if (mode === "reading") {
      return [
        "Reading your documents…",
        "Finding your start date, pay and role…",
        "Looking for your offer amount…",
        "Finding the dates in your letter…",
        "Reading the terms in your agreement…",
        "Lining up what we found so you can check it…",
      ];
    } else {
      return [
        "Checking the rules for where you work…",
        isUS
          ? "Looking up the federal and state rules…"
          : "Looking up the official minimums…",
        "Comparing your offer with the rules…",
        "Looking for deadlines you shouldn't miss…",
        "Listing questions to ask before you sign…",
        "Building your tables…",
        "Writing your plain-English summary…",
        "Double-checking the numbers…",
        "Laying out your report…",
        "Almost there. Please keep this page open.",
      ];
    }
  }, [mode, isUS]);

  const [messageIndex, setMessageIndex] = useState(0);
  const [messageFading, setMessageFading] = useState(false);

  // Rotate messages every 7 seconds (6–8s requirement). When list runs out, stay on last line.
  useEffect(() => {
    const timer = setInterval(() => {
      setMessageIndex((prev) => {
        if (prev < rotatingLines.length - 1) {
          setMessageFading(true);
          setTimeout(() => {
            setMessageIndex((i) => Math.min(i + 1, rotatingLines.length - 1));
            setMessageFading(false);
          }, 300);
          return prev;
        }
        return prev;
      });
    }, 7000);
    return () => clearInterval(timer);
  }, [rotatingLines]);

  // ── Change 18: Rotating "Good to Know" Cards (every 13s, 12-15s requirement) ──
  const [cardIndex, setCardIndex] = useState(0);
  const [cardFading, setCardFading] = useState(false);

  useEffect(() => {
    if (cards.length <= 1) return;
    const timer = setInterval(() => {
      setCardFading(true);
      setTimeout(() => {
        setCardIndex((prev) => (prev + 1) % cards.length);
        setCardFading(false);
      }, 300);
    }, 13000);
    return () => clearInterval(timer);
  }, [cards.length]);

  // ── 4-Minute Processing Notice (240 seconds) ──
  const [showFourMinuteNotice, setShowFourMinuteNotice] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowFourMinuteNotice(true);
    }, 240000);
    return () => clearTimeout(timer);
  }, []);

  // ── Retry State Handling (prevents duplicate submissions) ──
  const [isRetrying, setIsRetrying] = useState(false);
  const handleRetryClick = async () => {
    if (isRetrying || !onRetry) return;
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  // ── Elapsed Time & Simulated Micro-Stages for Realistic Progress ──
  // Progress must update according to actual backend/frontend stages and never move backwards
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Change 16: Five-Step Progress Indicator ──
  // 1. Upload received
  // 2. Reading your letter
  // 3. Reading your contract (skip if no contract was uploaded)
  // 4. Checking the rules for [province / state]
  // 5. Building your report
  const steps = useMemo<StepItem[]>(() => {
    const items: StepItem[] = [];

    // Step 1: Upload received (always completed once loading starts)
    items.push({
      id: "step-upload",
      label: "Upload received",
      state: "completed",
    });

    if (mode === "reading") {
      // In Wait 1 (document reading / extraction):
      if (hasContract) {
        // Contract was uploaded: all 5 steps exist
        let letterState: StepState = "active";
        let contractState: StepState = "pending";
        let rulesState: StepState = "pending";

        if (currentStage === "contract" || elapsedSeconds >= 8) {
          letterState = "completed";
          contractState = "active";
        }
        if (currentStage === "rules" || elapsedSeconds >= 18) {
          letterState = "completed";
          contractState = "completed";
          rulesState = "active";
        }

        items.push({ id: "step-letter", label: "Reading your letter", state: letterState });
        items.push({ id: "step-contract", label: "Reading your contract", state: contractState });
        items.push({
          id: "step-rules",
          label: `Checking the rules for ${resolvedRegionName}`,
          state: rulesState,
        });
      } else {
        // Contract was NOT uploaded: skip Step 3 entirely (4 steps displayed)
        let letterState: StepState = "active";
        let rulesState: StepState = "pending";

        if (currentStage === "rules" || elapsedSeconds >= 10) {
          letterState = "completed";
          rulesState = "active";
        }

        items.push({ id: "step-letter", label: "Reading your letter", state: letterState });
        items.push({
          id: "step-rules",
          label: `Checking the rules for ${resolvedRegionName}`,
          state: rulesState,
        });
      }

      // Step 5: Building your report (pending during Wait 1)
      items.push({
        id: "step-building",
        label: "Building your report",
        state: "pending",
      });
    } else {
      // In Wait 2 (building the report):
      // Steps 1-4 are already completed!
      items.push({ id: "step-letter", label: "Reading your letter", state: "completed" });
      if (hasContract) {
        items.push({ id: "step-contract", label: "Reading your contract", state: "completed" });
      }
      items.push({
        id: "step-rules",
        label: `Checking the rules for ${resolvedRegionName}`,
        state: "completed",
      });

      // Step 5: Building your report is active (or completed if ready)
      const buildingState: StepState = currentStage === "ready" ? "completed" : "active";
      items.push({
        id: "step-building",
        label: "Building your report",
        state: buildingState,
      });
    }

    return items;
  }, [mode, hasContract, currentStage, elapsedSeconds, resolvedRegionName]);

  // ── Monotonic Progress Bar Calculation (Never moves backwards, never hits 100% prematurely) ──
  const highestProgressRef = useRef(0);
  const calculatedProgress = useMemo(() => {
    let p = 0;
    if (mode === "reading") {
      if (hasContract) {
        if (elapsedSeconds < 8) {
          p = 20 + Math.min(18, Math.floor(elapsedSeconds * 2.2)); // 20 -> ~38%
        } else if (elapsedSeconds < 18) {
          p = 38 + Math.min(22, Math.floor((elapsedSeconds - 8) * 2.2)); // 38 -> ~60% (hits ~46% in middle!)
        } else {
          p = 60 + Math.min(15, Math.floor((elapsedSeconds - 18) * 1.5)); // 60 -> ~75% max
        }
      } else {
        if (elapsedSeconds < 10) {
          p = 25 + Math.min(25, Math.floor(elapsedSeconds * 2.5)); // 25 -> 50%
        } else {
          p = 50 + Math.min(25, Math.floor((elapsedSeconds - 10) * 1.5)); // 50 -> 75% max
        }
      }
    } else {
      // Building mode: starts around 75%, smoothly advances to ~92%
      if (currentStage === "ready") {
        p = 100;
      } else {
        p = 75 + Math.min(20, Math.floor(elapsedSeconds * 1.2)); // 75 -> 95% max
      }
    }

    if (p > highestProgressRef.current) {
      highestProgressRef.current = p;
    }
    return highestProgressRef.current;
  }, [mode, hasContract, elapsedSeconds, currentStage]);

  // Heading text matching design
  const heading = mode === "reading" ? "Reading your documents" : "Building your report";

  // Current Card
  const currentCard = cards.length > 0 ? cards[cardIndex % cards.length] : null;
  const isLawyerCard = currentCard?.kind === "lawyer";
  const cardBadgeLabel = isLawyerCard
    ? isUS ? "Good to know · Attorney tip" : "Good to know · Lawyer tip"
    : `Good to know · ${resolvedRegionName}`;

  return (
    <div className="min-h-screen w-full bg-[#f4f2ed] flex items-center justify-center p-4 sm:p-6 text-[#17242f] font-sans antialiased selection:bg-[#0eb28d]/20">
      <div className="w-full max-w-[350px] sm:max-w-[640px] bg-white border border-[#e2ddd2] rounded-[18px] p-[24px_20px] sm:p-[36px_40px] shadow-[0_20px_50px_-30px_rgba(6,44,85,0.35)]">
        {/* Eyebrow */}
        <div className="text-[12px] tracking-[1.4px] uppercase text-[#0c8f72] font-bold">
          Your Severance Report
        </div>

        {/* Heading */}
        <h1 className="font-serif font-semibold text-[26px] sm:text-[30px] leading-[1.2] text-[#062c55] mt-2 mb-1.5">
          {heading}
        </h1>

        {/* Subtitle */}
        <p className="text-[#5a6b78] text-[14px] sm:text-[15px] mb-5">
          About 2–3 minutes. You can keep this page open; we&apos;ll also email it to you.
        </p>

        {/* Progress bar */}
        <div className="h-[6px] bg-[#eceae4] rounded-[9px] overflow-hidden mb-[22px]">
          <div
            className="h-full bg-[#0eb28d] rounded-[9px] transition-all duration-700 ease-out"
            style={{ width: `${calculatedProgress}%` }}
          />
        </div>

        {/* Step list (5 steps, with contract skipped if no contract uploaded) */}
        <ol className="list-none m-0 mb-[22px] p-0 grid gap-[10px] text-[14.5px] sm:text-[15px]">
          {steps.map((s) => (
            <li
              key={s.id}
              className={`flex gap-[10px] items-center transition-colors duration-300 ${
                s.state === "active"
                  ? "font-bold text-[#062c55]"
                  : s.state === "pending"
                  ? "text-[#9aa6b0]"
                  : "text-[#17242f]"
              }`}
            >
              {s.state === "completed" && (
                <span className="w-5 h-5 rounded-full bg-[#0eb28d] text-white text-[12px] flex items-center justify-center shrink-0 font-bold">
                  ✓
                </span>
              )}
              {s.state === "active" && (
                <span className="w-5 h-5 rounded-full border-[2.5px] border-[#0eb28d] border-t-transparent animate-spin shrink-0" />
              )}
              {s.state === "pending" && (
                <span className="w-5 h-5 rounded-full border-2 border-[#d8d4ca] shrink-0" />
              )}
              <span>{s.label}</span>
            </li>
          ))}
        </ol>

        {/* Rotating line with smooth fade transition */}
        <div className="text-[14px] sm:text-[15px] text-[#062c55] bg-[#eef8f3] rounded-[10px] p-[10px_14px] mb-[14px] min-h-[44px] flex items-center">
          <span
            className={`transition-opacity duration-300 ease-in-out ${
              messageFading ? "opacity-0" : "opacity-100"
            }`}
          >
            {rotatingLines[messageIndex]}
          </span>
        </div>

        {/* "Good to know" card with smooth fade transition */}
        {currentCard && (
          <div
            className={`border border-[#e2ddd2] rounded-[12px] p-[12px_14px] text-[13.5px] sm:text-[14px] text-[#3d4d5a] mb-4 min-h-[82px] transition-opacity duration-300 ease-in-out ${
              cardFading ? "opacity-0" : "opacity-100"
            }`}
          >
            <b className="block text-[11px] tracking-[1px] uppercase text-[#a86a00] mb-1 font-bold">
              {cardBadgeLabel}
            </b>
            <p className="leading-snug">{currentCard.text}</p>
            {currentCard.source && (
              <span className="block mt-1.5 text-[12px] text-[#5a6b78]">
                Source:{" "}
                <a
                  href={currentCard.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-[#062c55] transition"
                >
                  {currentCard.source.name}
                </a>
              </span>
            )}
          </div>
        )}

        {/* 4-Minute Waiting Notice */}
        {showFourMinuteNotice && !error && (
          <div className="mb-4 p-3 bg-[#fdf8ed] border border-[#f5dfb8] rounded-[10px] text-[13px] sm:text-[13.5px] text-[#855302] flex items-center gap-2">
            <svg
              className="w-4 h-4 text-[#a86a00] shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Still working, thanks for waiting. Your report will also arrive by email.</span>
          </div>
        )}

        {/* Error / Failure State (Stops spinner and provides Try again button) */}
        {error && (
          <div className="mb-4 p-4 bg-[#fbeceb] border border-[#f5c2c0] rounded-[12px] text-left">
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-[#d42e2b] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                !
              </span>
              <div className="flex-1">
                <p className="font-bold text-[#a3231f] text-[14px] mb-1">
                  Processing could not be completed
                </p>
                <p className="text-[#a3231f] text-[13px] leading-relaxed mb-3">
                  {error}
                </p>
                {onRetry && (
                  <button
                    type="button"
                    onClick={handleRetryClick}
                    disabled={isRetrying}
                    className="px-4 py-2 bg-[#0eb28d] hover:bg-[#0c8f72] text-white rounded-[8px] font-bold text-[13px] transition cursor-pointer disabled:opacity-50"
                  >
                    {isRetrying ? "Retrying…" : "Try again"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-[12px] sm:text-[12.5px] text-[#5a6b78] mt-4">
          Your documents are only used to make your report. General information, not legal advice.
        </div>
      </div>
    </div>
  );
}

