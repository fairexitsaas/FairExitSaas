"use client";

import React from "react";
import { useAccessibility } from "@/context/AccessibilityContext";
import { AccessibilitySymbol } from "@/components/common/Icons";

interface AccessibilityButtonProps {
  variant?: "navbar" | "floating";
  className?: string;
}

export default function AccessibilityButton({
  variant = "navbar",
  className = "",
}: AccessibilityButtonProps) {
  const { toggleDialog } = useAccessibility();

  if (variant === "floating") {
    return (
      <button
        type="button"
        onClick={toggleDialog}
        aria-label="Toggle accessibility settings"
        title="Accessibility Settings"
        className={`fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full text-white bg-brand-navy hover:opacity-90 active:scale-95 shadow-xl flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-2 ${className}`}
      >
        <AccessibilitySymbol className="w-6 h-6" fill="white" />
      </button>
    );
  }

  // Navbar variant
  return (
    <button
      type="button"
      onClick={toggleDialog}
      aria-label="Accessibility settings"
      title="Accessibility Settings"
      className={`w-9 h-9 rounded-full border border-nav-border bg-card text-primary flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-green hover:opacity-80 ${className}`}
    >
      <AccessibilitySymbol className="w-4 h-4" />
    </button>
  );
}
