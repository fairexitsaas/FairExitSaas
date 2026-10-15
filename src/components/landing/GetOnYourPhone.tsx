"use client";

import React, { useState } from "react";
import { CountryCode } from "@/context/CountryContext";

interface GetOnYourPhoneProps {
  country?: CountryCode;
  onOpenAppModal?: () => void;
}

export default function GetOnYourPhone({ country = "US", onOpenAppModal }: GetOnYourPhoneProps) {
  const isCanada = country === "CA";
  const [appSoonVisible, setAppSoonVisible] = useState(false);

  const handleAppSoon = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onOpenAppModal) {
      onOpenAppModal();
    } else {
      const b = document.getElementById("appBox");
      if (b) b.hidden = false;
      setAppSoonVisible(true);
    }
  };

  return (
    <section className="py-16 pt-0 mx-auto">
      <div className="max-w-[1200px] mx-auto px-6 w-full box-border">
        <div
          className="bg-brand-navy dark:bg-[#0B1E32] rounded-[20px] p-8 sm:p-[32px_40px] flex items-center justify-between gap-6 flex-wrap shadow-[0_12px_36px_rgba(6,44,85,0.16)] border border-white/8 dark:border-[#183654] transition-colors"
          id="app"
        >
          <div>
            <b className="block font-serif text-2xl font-semibold text-white mb-1.5 leading-[1.25]">
              Get FairExit on your phone
            </b>
            <span className="text-sm text-[#CFE0F0] dark:text-[#9AB1C6] leading-[1.5] block max-w-[520px]">
              {isCanada
                ? "Snap a photo of your letter, get your results on the spot, and get a reminder before your signing deadline."
                : "Snap a photo of your agreement, get your results on the spot, and get a reminder before your signing deadline."}
            </span>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <a
              className="inline-flex items-center no-underline"
              href="#app"
              onClick={handleAppSoon}
              aria-label="Download on the App Store"
            >
              <img
                src="/assets/brand/store/app-store-badge.svg"
                alt="Download on the App Store"
                className="h-10 w-auto"
              />
            </a>
            <a
              className="inline-flex items-center no-underline"
              href="#app"
              onClick={handleAppSoon}
              aria-label="Get it on Google Play"
            >
              <img
                src="/assets/brand/store/google-play-badge.svg"
                alt="Get it on Google Play"
                className="h-10 w-auto"
              />
            </a>
          </div>
          {appSoonVisible && (
            <div className="mt-2.5 text-[13px] text-[#CFE0F0] w-full" id="appsoon">
              The app is coming. Leave your email at checkout or on the free check and we&apos;ll tell you the day it&apos;s out.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
