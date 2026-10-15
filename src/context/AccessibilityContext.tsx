"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type TextSize = "small" | "default" | "large" | "extraLarge";

export interface AccessibilitySettings {
  darkMode: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  textSize: TextSize;
}

export interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSetting: <K extends keyof AccessibilitySettings>(
    setting: K,
    value: AccessibilitySettings[K]
  ) => void;
  isDialogOpen: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  toggleDialog: () => void;
}

const defaultSettings: AccessibilitySettings = {
  darkMode: false,
  highContrast: false,
  reduceMotion: false,
  textSize: "default",
};

export const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  // Load persisted settings on client mount safely
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const stored = localStorage.getItem("fairexit_accessibility");
        if (stored) {
          const parsed = JSON.parse(stored);
          setSettings((prev) => ({ ...prev, ...parsed }));
        }
      } catch {
        // Ignore storage errors
      }
      setMounted(true);
    });
  }, []);

  // Apply accessibility settings to document element
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;

    // Dark mode
    if (settings.darkMode) {
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
    } else {
      root.classList.remove("dark");
      root.removeAttribute("data-theme");
    }

    // High contrast
    if (settings.highContrast) {
      root.classList.add("high-contrast");
      root.setAttribute("data-contrast", "high");
    } else {
      root.classList.remove("high-contrast");
      root.removeAttribute("data-contrast");
    }

    // Reduce motion
    if (settings.reduceMotion) {
      root.classList.add("reduce-motion");
      root.setAttribute("data-reduce-motion", "true");
    } else {
      root.classList.remove("reduce-motion");
      root.removeAttribute("data-reduce-motion");
    }

    // Text size
    root.setAttribute("data-text-size", settings.textSize);

    try {
      localStorage.setItem("fairexit_accessibility", JSON.stringify(settings));
    } catch {
      // Ignore storage errors
    }
  }, [settings, mounted]);

  const updateSetting = <K extends keyof AccessibilitySettings>(
    setting: K,
    value: AccessibilitySettings[K]
  ) => {
    console.log("[FairExit] Accessibility setting changed:", {
      setting,
      value,
    });
    setSettings((prev) => ({
      ...prev,
      [setting]: value,
    }));
  };

  const openDialog = () => {
    console.log("[FairExit] Accessibility dialog opened");
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    console.log("[FairExit] Accessibility dialog closed");
    setIsDialogOpen(false);
  };

  const toggleDialog = () => {
    if (isDialogOpen) {
      closeDialog();
    } else {
      openDialog();
    }
  };

  return (
    <AccessibilityContext.Provider
      value={{
        settings,
        updateSetting,
        isDialogOpen,
        openDialog,
        closeDialog,
        toggleDialog,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error("useAccessibility must be used within an AccessibilityProvider");
  }
  return context;
}
