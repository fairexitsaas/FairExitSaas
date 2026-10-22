"use client";

import React from "react";
import { useAccessibility } from "@/context/AccessibilityContext";
import { triggerGetApp } from "@/context/GetAppContext";

export default function FloatingActions() {
  const { isDialogOpen, toggleDialog } = useAccessibility();

  return (
    <>
      {/* ── Floating App Button ── */}
      <a
        id="appFab"
        className="fixed bottom-[84px] right-6 w-12 h-12 rounded-full bg-[#062c55] dark:bg-[#0D2238] border-[1.5px] border-transparent dark:border-[#1E3B5C] text-white dark:text-[#F0F6FC] hover:dark:border-[#0EB28D] hover:dark:text-[#0EB28D] flex items-center justify-center shadow-[0_8px_24px_rgba(6,44,85,0.3)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)] z-[100] no-underline hover:scale-108 transition-all group"
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
        <span className="absolute right-14 bg-[#062c55] dark:bg-[#0D2238] border border-transparent dark:border-[#1E3B5C] text-white dark:text-[#F0F6FC] py-1 px-2.5 rounded-md text-xs whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity">
          Get the app
        </span>
      </a>

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
    </>
  );
}
