"use client";

import { CountryContext, CountryCode } from "@/context/CountryContext";
import { AccessibilityProvider } from "@/context/AccessibilityContext";
import React, { useState, useEffect } from "react";
import CountrySelectionDialog from "@/components/dialogs/CountrySelectionDialog";
import AccessibilityDialog from "@/components/accessibility/AccessibilityDialog";

type ProviderProp = {
  readonly children: React.ReactNode;
};

export default function Provider({ children }: ProviderProp) {
  // Default to US so page content renders immediately behind the dialog
  const [Country, setCountryState] = useState<CountryCode>("US");
  const [isCountryModalOpen, setIsCountryModalOpen] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    queueMicrotask(() => {
      setMounted(true);
      try {
        const stored = localStorage.getItem("fairexit_country") as CountryCode | null;
        if (stored === "CA" || stored === "US") {
          setCountryState(stored);
        } else {
          // Show dialog — page already shows US content as background
          setIsCountryModalOpen(true);
        }
      } catch {
        setIsCountryModalOpen(true);
      }
    });
  }, []);

  const setCountry = (newCountry: CountryCode) => {
    setCountryState(newCountry);
    try {
      localStorage.setItem("fairexit_country", newCountry);
    } catch {
      // Ignore storage errors
    }
  };

  const handleSelectCountry = (selected: CountryCode) => {
    console.log("[FairExit] Country selected:", selected);
    setCountry(selected);
    setIsCountryModalOpen(false);
  };

  return (
    <AccessibilityProvider>
      <CountryContext.Provider value={{ Country, setCountry }}>
        {children}
        {mounted && (
          <CountrySelectionDialog
            isOpen={isCountryModalOpen}
            onSelect={handleSelectCountry}
          />
        )}
        <AccessibilityDialog />
      </CountryContext.Provider>
    </AccessibilityProvider>
  );
}