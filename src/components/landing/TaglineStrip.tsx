"use client";

import React from "react";

/**
 * Brand tagline strip placed immediately below the navbar on the homepage.
 *
 * Section order on homepage:
 * 1. Header / Navbar
 * 2. Tagline strip
 * 3. Hero section
 *
 * Requirements:
 * - Font: DM Sans Bold (font-sans font-bold)
 * - Color: FairExit green (#0EB28D) for both lines
 * - Placement: Immediately below navbar
 * - First line: 18–20px mobile, 18–20px desktop ("Know your worth.")
 * - Main line: 25–28px mobile (390px+) and 32–36px desktop, smoothly adjusted to 20px (320px)
 *   and 22.5px (360px) to physically guarantee single-line display without text truncation,
 *   ellipsis, or clipping across all viewports.
 */
export default function TaglineStrip() {
  return (
    <aside
      aria-label="Brand tagline"
      className="w-full  border-b border-[#e7e4dd] dark:border-[#1a3b5c] py-2 sm:py-3 px-2 sm:px-6 transition-colors overflow-hidden"
    >
      <div className="max-w-[1040px] mx-auto flex flex-col items-center justify-center text-center">
        {/* First line: 18–20px mobile, 18–20px desktop */}
        <span className="font-sans font-bold text-[#041a33] dark:text-white text-[18px] sm:text-[19px] md:text-[20px] leading-tight tracking-[-0.01em] block">
          Know your worth.
        </span>

        {/* Second line: Single line guaranteed without truncation, ellipsis, or clipping */}
        <span className="font-sans font-bold text-[#0EB28D] text-[clamp(19.5px,6.15vw,36px)] min-[320px]:text-[20px] min-[360px]:text-[22.5px] min-[375px]:text-[24px] min-[390px]:text-[25px] sm:text-[32px] md:text-[36px] leading-tight tracking-[-0.02em] whitespace-nowrap inline-block">
          Challenge your severance offer.
        </span>
      </div>
    </aside>
  );
}
