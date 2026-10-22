"use client";

import React, { useEffect, useRef } from "react";
import { useAccessibility, TextSize } from "@/context/AccessibilityContext";

export default function AccessibilityDialog() {
  const { settings, updateSetting, isDialogOpen, closeDialog } = useAccessibility();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isDialogOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDialog();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDialogOpen, closeDialog]);

  // Focus management
  useEffect(() => {
    if (isDialogOpen && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [isDialogOpen]);

  if (!isDialogOpen) return null;

  const textSizes: { id: TextSize; label: string }[] = [
    { id: "small", label: "A-" },
    { id: "default", label: "A" },
    { id: "large", label: "A+" },
    { id: "extraLarge", label: "A++" },
  ];

  return (
    <>
      {/* Invisible backdrop to dismiss popup when clicking outside (keeps page bright & visible) */}
      <div
        className="fixed inset-0 z-40 a11y-backdrop"
        style={{ backgroundColor: "transparent", background: "transparent" }}
        onClick={closeDialog}
        aria-hidden="true"
      />

      {/* Floating popup positioned right above the bottom-right accessibility button */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="accessibility-heading"
        tabIndex={-1}
        className="fixed bottom-20 right-6 z-50 w-76 sm:w-80 rounded-2xl border border-card-border bg-card text-primary p-6 focus:outline-none shadow-[0_16px_48px_-8px_rgba(0,0,0,0.16)] dark:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.6)] transition-colors duration-200"
      >
        {/* Header */}
        <div className="pb-3.5">
          <span
            id="accessibility-heading"
            className="text-[11px] font-bold tracking-widest uppercase select-none text-muted transition-colors"
          >
            ACCESSIBILITY
          </span>
        </div>

        {/* Options */}
        <div className="space-y-4">
          {/* Dark mode */}
          <Toggle
            id="toggle-dark-mode"
            label="Dark mode"
            checked={settings.darkMode}
            onChange={() => updateSetting("darkMode", !settings.darkMode)}
          />

          {/* High contrast */}
          <Toggle
            id="toggle-high-contrast"
            label="High contrast"
            checked={settings.highContrast}
            onChange={() => updateSetting("highContrast", !settings.highContrast)}
          />

          {/* Reduce motion */}
          <Toggle
            id="toggle-reduce-motion"
            label="Reduce motion"
            checked={settings.reduceMotion}
            onChange={() => updateSetting("reduceMotion", !settings.reduceMotion)}
          />

          {/* Text size */}
          <div className="flex items-center justify-between pt-0.5">
            <span className="text-sm font-semibold select-none text-primary transition-colors">
              Text size
            </span>
            <div className="flex items-center gap-1.5">
              {textSizes.map((item) => {
                const isActive = settings.textSize === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => updateSetting("textSize", item.id)}
                    className={`min-w-7 h-7 px-2 text-xs font-bold rounded-md transition-all focus:outline-none focus:ring-1 focus:ring-green flex items-center justify-center cursor-pointer ${
                      isActive
                        ? "bg-navy dark:bg-green text-white"
                        : "text-primary hover:bg-slate/10 bg-transparent"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Toggle switch row ─── */
function Toggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <label
        htmlFor={id}
        className="text-sm font-semibold cursor-pointer select-none text-primary transition-colors"
      >
        {label}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`a11y-toggle-btn relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 ${
          checked
            ? "bg-navy dark:bg-green"
            : "bg-[#D8D2C5] dark:bg-[#1E3A56]"
        }`}
      >
        <span
          className={`a11y-toggle-knob pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
