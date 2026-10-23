"use client";

import { CountryContext, CountryCode } from "@/context/CountryContext";
import { AccessibilityProvider } from "@/context/AccessibilityContext";
import { GetAppProvider } from "@/context/GetAppContext";
import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import CountrySelectionDialog from "@/components/dialogs/CountrySelectionDialog";
import AccessibilityDialog from "@/components/accessibility/AccessibilityDialog";

type ProviderProp = {
  readonly children: React.ReactNode;
};

export default function Provider({ children }: ProviderProp) {
  const pathname = usePathname();
  // Default to US so page content renders immediately behind the dialog
  const [Country, setCountryState] = useState<CountryCode>("US");
  const [isCountryModalOpen, setIsCountryModalOpen] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    queueMicrotask(() => {
      setMounted(true);
      try {
        // 1. Check URL parameters for explicit country or state
        const params = new URLSearchParams(window.location.search);
        const countryParam = params.get("country")?.toUpperCase();
        const stParam = params.get("st") || params.get("state");

        let knownCountry: CountryCode | null = null;
        if (countryParam === "CA" || countryParam === "US") {
          knownCountry = countryParam;
        } else if (stParam) {
          knownCountry = "US";
        }

        // 2. Check localStorage for saved choice
        if (!knownCountry) {
          const stored = (
            localStorage.getItem("fairexit_country") ||
            localStorage.getItem("fx_country")
          )?.toUpperCase() as CountryCode | null;
          if (stored === "CA" || stored === "US") {
            knownCountry = stored;
          }
        }

        if (knownCountry) {
          setCountryState(knownCountry);
          try {
            localStorage.setItem("fairexit_country", knownCountry);
            localStorage.setItem("fx_country", knownCountry.toLowerCase());
          } catch {
            // ignore
          }
          setIsCountryModalOpen(false);
        } else {
          // If country is not known from URL or storage:
          // Never show the pop-up on /questions or /admin; only show on landing page
          const isQuestions = window.location.pathname.startsWith("/questions");
          const isAdmin = window.location.pathname.startsWith("/admin");
          if (!isQuestions && !isAdmin) {
            setIsCountryModalOpen(true);
          } else {
            setIsCountryModalOpen(false);
          }
        }
      } catch {
        setIsCountryModalOpen(false);
      }
    });
  }, [pathname]);

  const setCountry = (newCountry: CountryCode) => {
    setCountryState(newCountry);
    try {
      localStorage.setItem("fairexit_country", newCountry);
      localStorage.setItem("fx_country", newCountry.toLowerCase());
    } catch {
      // Ignore storage errors
    }
  };

  const handleSelectCountry = (selected: CountryCode) => {
    console.log("[FairExit] Country selected:", selected);
    setCountry(selected);
    setIsCountryModalOpen(false);
  };

  const isAdminRoute = pathname?.startsWith("/admin");
  const isQuestionsRoute = pathname?.startsWith("/questions");

  return (
    <AccessibilityProvider>
      <GetAppProvider>
        <CountryContext.Provider value={{ Country, setCountry }}>
          {children}
          {mounted && !isAdminRoute && !isQuestionsRoute && (
            <CountrySelectionDialog
              isOpen={isCountryModalOpen}
              onSelect={handleSelectCountry}
            />
          )}
          <AccessibilityDialog />
        </CountryContext.Provider>
      </GetAppProvider>
    </AccessibilityProvider>
  );
}