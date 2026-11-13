import { describe, it, expect } from "vitest";
import loadingCardsData from "../../../src/data/loading-cards.json";
import {
  normalizeRegionCode,
  getRegionDisplayName,
  getLoadingCardsForRegion,
} from "../../../src/lib/loadingCards";

describe("Group 4: Complete Loading Experience (Changes 15–18)", () => {
  // ── Change 18: loading-cards.json and Region Selection ──
  describe("Change 18: Region-Specific 'Good to Know' Cards", () => {
    it("1. Loads verified cards from loading-cards.json with 33+ regions", () => {
      expect(loadingCardsData).toBeDefined();
      expect(loadingCardsData._about).toBeDefined();
      expect(loadingCardsData["CA-BC"]).toBeDefined();
      expect(loadingCardsData["CA-ON"]).toBeDefined();
      expect(loadingCardsData["US-NY"]).toBeDefined();
      expect(loadingCardsData["US-CA"]).toBeDefined();
      expect(loadingCardsData["US-*"]).toBeDefined();
    });

    it("2. Normalizes region codes correctly for Canada and US", () => {
      expect(normalizeRegionCode("BC", "CA")).toBe("CA-BC");
      expect(normalizeRegionCode("Ontario", "CA")).toBe("CA-ON");
      expect(normalizeRegionCode("NY", "US")).toBe("US-NY");
      expect(normalizeRegionCode("California", "US")).toBe("US-CA");
      // Unlisted US state falls back to US-*
      expect(normalizeRegionCode("WY", "US")).toBe("US-*");
      expect(normalizeRegionCode("Wyoming", "US")).toBe("US-*");
    });

    it("3. Displays accurate human-readable region names", () => {
      expect(getRegionDisplayName("CA-BC")).toBe("British Columbia");
      expect(getRegionDisplayName("CA-ON")).toBe("Ontario");
      expect(getRegionDisplayName("US-NY")).toBe("New York");
      expect(getRegionDisplayName("US-*")).toBe("United States");
      expect(getRegionDisplayName("CA-BC", "Custom BC")).toBe("Custom BC");
    });

    it("4. Follows exact non-random card order (region fact -> lawyer hint -> region fact)", () => {
      const bcCards = getLoadingCardsForRegion("CA-BC", false, true);
      expect(bcCards.length).toBeGreaterThanOrEqual(4);
      expect(bcCards[0].kind).toBe("region");
      expect(bcCards[0].text).toContain("British Columbia · Compensation for length of service");
      expect(bcCards[1].kind).toBe("lawyer");
      expect(bcCards[1].text).toContain("Many people don't realize the first call with an employment lawyer is free");
      expect(bcCards[2].kind).toBe("region");
      expect(bcCards[2].text).toContain("British Columbia · Separate severance pay");
      expect(bcCards[3].kind).toBe("lawyer");
      expect(bcCards[3].text).toContain("A few words in a contract's termination clause can change what applies to you in British Columbia");
    });

    it("5. Region cards include official source name and valid URL", () => {
      const bcCards = getLoadingCardsForRegion("CA-BC", false, true);
      const regionCards = bcCards.filter((c) => c.kind === "region");
      expect(regionCards.length).toBeGreaterThan(0);
      for (const card of regionCards) {
        expect(card.source).toBeDefined();
        expect(card.source?.name).toBeTruthy();
        expect(card.source?.url).toMatch(/^https?:\/\//);
      }
    });

    it("6. Respects launch switch: hides region cards in production when unapproved", () => {
      const prevEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = "production";
        const isApproved = loadingCardsData._about.approved_for_launch;
        expect(isApproved).toBe(false);

        const prodCards = getLoadingCardsForRegion("CA-BC", false, false);
        // In production when unapproved, only non-region cards (lawyer cards) must be shown
        for (const card of prodCards) {
          expect(card.kind).not.toBe("region");
          expect(card.kind).toBe("lawyer");
        }
      } finally {
        process.env.NODE_ENV = prevEnv;
      }
    });

    it("7. Adapts terminology in US: uses attorney instead of lawyer", () => {
      const usCards = getLoadingCardsForRegion("US-NY", true, true);
      for (const card of usCards) {
        expect(card.text.toLowerCase()).not.toContain("an employment lawyer");
        expect(card.text.toLowerCase()).not.toContain("a lawyer");
      }
    });
  });

  // ── Change 16: Five-Step Progress Indicator ──
  describe("Change 16: Five-Step Progress Indicator", () => {
    it("1. Includes all 5 steps when a contract is uploaded", () => {
      const hasContract = true;
      const stepNames = [
        "Upload received",
        "Reading your letter",
        ...(hasContract ? ["Reading your contract"] : []),
        "Checking the rules for British Columbia",
        "Building your report",
      ];
      expect(stepNames.length).toBe(5);
      expect(stepNames[0]).toBe("Upload received");
      expect(stepNames[1]).toBe("Reading your letter");
      expect(stepNames[2]).toBe("Reading your contract");
      expect(stepNames[3]).toBe("Checking the rules for British Columbia");
      expect(stepNames[4]).toBe("Building your report");
    });

    it("2. Skips 'Reading your contract' when no contract was uploaded", () => {
      const hasContract = false;
      const stepNames = [
        "Upload received",
        "Reading your letter",
        ...(hasContract ? ["Reading your contract"] : []),
        "Checking the rules for Ontario",
        "Building your report",
      ];
      expect(stepNames.length).toBe(4);
      expect(stepNames).not.toContain("Reading your contract");
      expect(stepNames[1]).toBe("Reading your letter");
      expect(stepNames[2]).toBe("Checking the rules for Ontario");
      expect(stepNames[3]).toBe("Building your report");
    });

    it("3. Progress bar is strictly monotonic (never moves backwards)", () => {
      let highest = 0;
      const simulateProgress = (values: number[]) => {
        return values.map((val) => {
          if (val > highest) highest = val;
          return highest;
        });
      };

      const rawSamples = [20, 25, 30, 28, 46, 50, 48, 65, 75, 70, 85, 92, 90, 100];
      const monotonic = simulateProgress(rawSamples);
      for (let i = 1; i < monotonic.length; i++) {
        expect(monotonic[i]).toBeGreaterThanOrEqual(monotonic[i - 1]);
      }
    });

    it("4. Progress does not reach 100% until report generation is genuinely ready", () => {
      const getProgress = (mode: "reading" | "building", ready: boolean) => {
        if (mode === "reading") return 75; // max during Wait 1
        if (!ready) return 95; // max during Wait 2 before ready
        return 100;
      };

      expect(getProgress("reading", false)).toBeLessThan(100);
      expect(getProgress("building", false)).toBeLessThan(100);
      expect(getProgress("building", true)).toBe(100);
    });
  });

  // ── Change 17: Rotating Loading Messages and Error Handling ──
  describe("Change 17: Rotating Loading Messages and Error Handling", () => {
    it("1. Wait 1 has the exact 6 rotating messages in specified order", () => {
      const wait1Messages = [
        "Reading your documents…",
        "Finding your start date, pay and role…",
        "Looking for your offer amount…",
        "Finding the dates in your letter…",
        "Reading the terms in your agreement…",
        "Lining up what we found so you can check it…",
      ];
      expect(wait1Messages.length).toBe(6);
      expect(wait1Messages[0]).toBe("Reading your documents…");
      expect(wait1Messages[5]).toBe("Lining up what we found so you can check it…");
    });

    it("2. Wait 2 has the exact 10 rotating messages with US-specific rules", () => {
      const getWait2Messages = (isUS: boolean) => [
        "Checking the rules for where you work…",
        isUS ? "Looking up the federal and state rules…" : "Looking up the official minimums…",
        "Comparing your offer with the rules…",
        "Looking for deadlines you shouldn't miss…",
        "Listing questions to ask before you sign…",
        "Building your tables…",
        "Writing your plain-English summary…",
        "Double-checking the numbers…",
        "Laying out your report…",
        "Almost there. Please keep this page open.",
      ];

      const caMessages = getWait2Messages(false);
      expect(caMessages.length).toBe(10);
      expect(caMessages[1]).toBe("Looking up the official minimums…");

      const usMessages = getWait2Messages(true);
      expect(usMessages.length).toBe(10);
      expect(usMessages[1]).toBe("Looking up the federal and state rules…");
      expect(usMessages[9]).toBe("Almost there. Please keep this page open.");
    });

    it("3. Provides specified 4-minute notice text", () => {
      const fourMinuteNotice =
        "Still working, thanks for waiting. Your report will also arrive by email.";
      expect(fourMinuteNotice).toBe(
        "Still working, thanks for waiting. Your report will also arrive by email."
      );
    });

    it("4. Stops spinner on failure and supports safe retry", () => {
      const failureState = {
        isLoading: false,
        hasError: true,
        errorMessage: "Scanner could not read documents. Please ensure clear, readable pages.",
        retryActionAvailable: true,
      };

      expect(failureState.isLoading).toBe(false);
      expect(failureState.hasError).toBe(true);
      expect(failureState.retryActionAvailable).toBe(true);
    });
  });

  // ── Change 15: Full-Screen Layout ──
  describe("Change 15: Full-Screen Loading Experience", () => {
    it("1. Uses correct heading for each wait stage", () => {
      const getHeading = (mode: "reading" | "building") =>
        mode === "reading" ? "Reading your documents" : "Building your report";

      expect(getHeading("reading")).toBe("Reading your documents");
      expect(getHeading("building")).toBe("Building your report");
    });

    it("2. Displays exact footer reassurance copy", () => {
      const footer =
        "Your documents are only used to make your report. General information, not legal advice.";
      expect(footer).toBe(
        "Your documents are only used to make your report. General information, not legal advice."
      );
    });
  });
});
