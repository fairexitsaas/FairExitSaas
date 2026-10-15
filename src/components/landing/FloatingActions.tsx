"use client";

import React, { useState, useEffect } from "react";
import { useAccessibility, TextSize } from "@/context/AccessibilityContext";
import { useCountry } from "@/context/CountryContext";

export default function FloatingActions() {
  const { settings, updateSetting, isDialogOpen, toggleDialog, closeDialog } =
    useAccessibility();
  const { Country } = useCountry();

  const [appBoxOpen, setAppBoxOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAppBoxOpen(false);
        closeDialog();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeDialog]);

  const handleCopy = () => {
    const appUrl = "https://sevapp-opal.vercel.app/resource-hub-v2/index-v3.html#app";
    try {
      navigator.clipboard.writeText(appUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // fallback
    }
  };

  const textSizes: { id: TextSize; label: string }[] = [
    { id: "small", label: "A-" },
    { id: "default", label: "A" },
    { id: "large", label: "A+" },
    { id: "extraLarge", label: "A++" },
  ];

  return (
    <>
      {/* ── Floating App Button ── */}
      <a
        className="fixed bottom-[84px] right-6 w-12 h-12 rounded-full bg-navy text-white flex items-center justify-center shadow-[0_8px_24px_rgba(6,44,85,0.3)] z-[100] no-underline hover:scale-108 transition-transform group"
        href="#app"
        aria-label="Get the app"
        onClick={(e) => {
          e.preventDefault();
          setAppBoxOpen(true);
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-[22px] h-[22px]"
          aria-hidden="true"
        >
          <rect x="6" y="2.5" width="12" height="19" rx="2.5"></rect>
          <path d="M10.5 18.5h3"></path>
        </svg>
        <span className="absolute right-14 bg-navy text-white py-1 px-2.5 rounded-md text-xs whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity">
          Get the app
        </span>
      </a>

      {/* ── App Box Modal ── */}
      {appBoxOpen && (
        <div
          className="fixed inset-0 bg-[#062C55]/55 z-[300] flex items-center justify-center p-5"
          id="appBox"
          role="dialog"
          aria-modal="true"
          aria-label="Get the FairExit app"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAppBoxOpen(false);
          }}
        >
          <div className="bg-card rounded-[20px] p-8 px-7 pb-6 max-w-[420px] w-full text-center relative shadow-[0_40px_90px_-30px_rgba(6,44,85,0.6)] border border-line">
            <button
              className="absolute top-4 right-[18px] bg-transparent border-none text-lg text-slate cursor-pointer hover:text-navy dark:hover:text-white"
              onClick={() => setAppBoxOpen(false)}
              aria-label="Close"
            >
              ✕
            </button>
            <div className="text-[11px] font-extrabold tracking-[0.6px] uppercase text-greend">
              FairExit on your phone
            </div>
            <h3 className="font-serif text-2xl text-navy dark:text-white my-1.5 mb-2 font-bold">
              Scan to get the app
            </h3>
            <p className="text-[13.5px] text-slate mb-4">
              Point your phone&apos;s camera at the code. It opens the download page for your phone.
            </p>
            <img
              className="w-[140px] h-[140px] mx-auto mb-3.5 bg-[#f6f4ef] rounded-xl p-2.5 border border-line"
              src="/assets/brand/store/app-qr.svg"
              alt="QR code linking to the FairExit app download page"
            />
            <div className="text-xs text-slate my-3 mb-2 uppercase tracking-[0.5px]">
              or open this link on your phone
            </div>
            <div className="flex gap-2 mb-4">
              <input
                id="appLink"
                type="text"
                readOnly
                value="https://sevapp-opal.vercel.app/resource-hub-v2/index-v3.html#app"
                className="flex-1 py-2 px-2.5 text-xs border border-line rounded-lg bg-page text-ink dark:text-white outline-none"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="bg-navy hover:bg-navy-dark text-white border-none py-2 px-3.5 rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="flex justify-center gap-2.5 mb-3.5">
              <a
                className="inline-flex items-center no-underline"
                href="https://sevapp-opal.vercel.app/resource-hub-v2/index-v3.html#app"
                aria-label="Download on the App Store"
              >
                <img
                  src="/assets/brand/store/app-store-badge.svg"
                  alt="Download on the App Store"
                  className="h-9 w-auto"
                />
              </a>
              <a
                className="inline-flex items-center no-underline"
                href="https://sevapp-opal.vercel.app/resource-hub-v2/index-v3.html#app"
                aria-label="Get it on Google Play"
              >
                <img
                  src="/assets/brand/store/google-play-badge.svg"
                  alt="Get it on Google Play"
                  className="h-9 w-auto"
                />
              </a>
            </div>
            <div className="text-xs text-slate leading-[1.45]">
              Snap a photo of your {Country === "CA" ? "letter" : "agreement"}, get your results on the spot, and get a reminder before your signing deadline.
            </div>
          </div>
        </div>
      )}

      {/* ── Floating Accessibility Button ── */}
      <button
        id="a11yFab"
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-card border-[1.5px] border-line text-navy dark:text-white flex items-center justify-center shadow-[0_8px_24px_rgba(6,44,85,0.15)] z-[100] cursor-pointer hover:scale-108 hover:border-green transition-all"
        aria-label="Accessibility options"
        aria-expanded={isDialogOpen}
        onClick={(e) => {
          e.stopPropagation();
          toggleDialog();
        }}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="22" height="22">
          <circle cx="12" cy="3.6" r="2"></circle>
          <path d="M20 8.2c-2.3.7-5 1-8 1s-5.7-.3-8-1L3.4 10c1.9.6 4 .9 5.9 1v3.1L7.5 20.6l1.9.6L11 16h2l1.6 5.2 1.9-.6-1.8-6.5V11c1.9-.1 4-.4 5.9-1L20 8.2z"></path>
        </svg>
      </button>

      {/* ── Floating Accessibility Panel ── */}
      <div
        id="a11yPanel"
        className={`${isDialogOpen ? "block" : "hidden"} fixed bottom-[84px] right-6 bg-card border-[1.5px] border-line rounded-[18px] p-5 px-[22px] w-[290px] shadow-[0_20px_50px_rgba(6,44,85,0.2)] z-[105]`}
        role="dialog"
        aria-label="Accessibility options"
      >
        <h4 className="text-xs font-extrabold uppercase tracking-[0.8px] text-greend m-0 mb-3.5">
          Accessibility
        </h4>
        <div className="flex items-center justify-between mb-3 text-sm text-navy dark:text-white font-semibold">
          <span>Dark mode</span>
          <button
            className={`w-11 h-6 rounded-full border-none relative cursor-pointer p-0.5 transition-colors ${settings.darkMode ? "bg-green" : "bg-[#d3cec3] dark:bg-slate-700"}`}
            id="a11yTheme"
            aria-label="Toggle dark mode"
            onClick={() => updateSetting("darkMode", !settings.darkMode)}
          >
            <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${settings.darkMode ? "translate-x-5" : "translate-x-0"}`}></span>
          </button>
        </div>
        <div className="flex items-center justify-between mb-3 text-sm text-navy dark:text-white font-semibold">
          <span>High contrast</span>
          <button
            className={`w-11 h-6 rounded-full border-none relative cursor-pointer p-0.5 transition-colors ${settings.highContrast ? "bg-green" : "bg-[#d3cec3] dark:bg-slate-700"}`}
            id="a11yContrast"
            aria-label="Toggle high contrast"
            onClick={() => updateSetting("highContrast", !settings.highContrast)}
          >
            <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${settings.highContrast ? "translate-x-5" : "translate-x-0"}`}></span>
          </button>
        </div>
        <div className="flex items-center justify-between mb-3 text-sm text-navy dark:text-white font-semibold">
          <span>Reduce motion</span>
          <button
            className={`w-11 h-6 rounded-full border-none relative cursor-pointer p-0.5 transition-colors ${settings.reduceMotion ? "bg-green" : "bg-[#d3cec3] dark:bg-slate-700"}`}
            id="a11yMotion"
            aria-label="Toggle reduce motion"
            onClick={() => updateSetting("reduceMotion", !settings.reduceMotion)}
          >
            <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${settings.reduceMotion ? "translate-x-5" : "translate-x-0"}`}></span>
          </button>
        </div>
        <div className="flex items-center justify-between mb-3 text-sm text-navy dark:text-white font-semibold">
          <span>Text size</span>
          <span className="flex bg-page rounded-lg p-0.5 gap-0.5">
            {textSizes.map((s) => (
              <button
                key={s.id}
                data-fs={s.id === "default" ? "" : s.id}
                className={`bg-transparent border-none py-1 px-2 rounded-md text-xs font-bold cursor-pointer transition-colors ${
                  settings.textSize === s.id
                    ? "bg-white dark:bg-slate-800 text-navy dark:text-white shadow-[0_1px_3px_rgba(0,0,0,0.1)]"
                    : "text-slate"
                }`}
                aria-label={`Set text size to ${s.label}`}
                onClick={() => updateSetting("textSize", s.id)}
              >
                {s.label}
              </button>
            ))}
          </span>
        </div>
      </div>
    </>
  );
}
