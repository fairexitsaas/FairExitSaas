"use client";

import React, { useState, useEffect } from "react";
import { useAccessibility } from "@/context/AccessibilityContext";
import { triggerGetApp } from "@/context/GetAppContext";

export default function FloatingActions() {
  const { isDialogOpen, toggleDialog } = useAccessibility();
  const [hideOnPhone, setHideOnPhone] = useState(false);

  useEffect(() => {
    const getTarget = () =>
      document.getElementById("heroForm") || document.getElementById("hero");

    const checkVisibility = () => {
      if (window.innerWidth >= 1024) {
        setHideOnPhone(false);
        return;
      }
      const el = getTarget();
      if (!el) {
        setHideOnPhone(false);
        return;
      }
      const rect = el.getBoundingClientRect();
      // If hero form is on screen on phone
      const isHeroOnScreen = rect.top < window.innerHeight && rect.bottom > 0;
      setHideOnPhone(isHeroOnScreen);
    };

    checkVisibility();
    window.addEventListener("scroll", checkVisibility, { passive: true });
    window.addEventListener("resize", checkVisibility, { passive: true });

    return () => {
      window.removeEventListener("scroll", checkVisibility);
      window.removeEventListener("resize", checkVisibility);
    };
  }, []);

  return (
    <>
      {/* ── Floating App Button (white with navy icon) ── */}
      <a
        id="appFab"
        className={`fixed bottom-[74px] sm:bottom-[84px] right-3 sm:right-6 w-12 h-12 rounded-full bg-white text-[#062c55] border-none flex items-center justify-center shadow-[0_12px_26px_-8px_rgba(6,44,85,0.45)] z-[100] no-underline hover:scale-105 hover:bg-[#0eb28d] hover:text-white transition-all duration-300 group ${
          hideOnPhone
            ? "max-lg:opacity-0 max-lg:pointer-events-none max-lg:translate-y-4 max-lg:scale-95"
            : "max-lg:opacity-100 max-lg:pointer-events-auto max-lg:translate-y-0 max-lg:scale-100"
        }`}
        href="#app"
        aria-label="Get the app"
        onClick={(e) => {
          e.preventDefault();
          triggerGetApp();
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
        <span className="absolute right-14 bg-[#062c55] text-white py-1 px-2.5 rounded-md text-xs font-bold whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity">
          Get the app
        </span>
      </a>

      {/* ── Floating Accessibility Button (navy with white icon) ── */}
      <button
        id="a11yFab"
        type="button"
        className={`fixed bottom-3 sm:bottom-6 right-3 sm:right-6 w-12 h-12 rounded-full bg-[#062c55] text-white border-none flex items-center justify-center shadow-[0_12px_26px_-8px_rgba(6,44,85,0.55)] z-[100] cursor-pointer hover:scale-105 transition-all duration-300 ${
          hideOnPhone
            ? "max-lg:opacity-0 max-lg:pointer-events-none max-lg:translate-y-4 max-lg:scale-95"
            : "max-lg:opacity-100 max-lg:pointer-events-auto max-lg:translate-y-0 max-lg:scale-100"
        }`}
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
    </>
  );
}
