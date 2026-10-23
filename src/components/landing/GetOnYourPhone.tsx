"use client";

import React, { useState } from "react";
import { CountryCode } from "@/context/CountryContext";
import { triggerGetApp } from "@/context/GetAppContext";

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
      triggerGetApp();
    }
  };

  return (
    <section className="pt-0 pb-6 sm:pb-8">
      <div className="wrap max-w-[1040px] mx-auto px-4 sm:px-6 w-full box-border">
        <div
          className="bg-navy dark:bg-[#0B1E32] rounded-[14px] p-[18px_20px] flex items-center justify-between gap-[14px_20px] flex-wrap mt-[22px] shadow-[0_12px_36px_rgba(6,44,85,0.16)] transition-colors"
          id="app"
        >
          <div className="flex-[1_1_320px] min-w-0">
            <b className="block font-serif text-[20px] font-bold text-white mb-[3px] leading-[1.3]">
              Get FairExit on your phone
            </b>
            <span className="text-[13.5px] text-[#c9d6e5] dark:text-[#9AB1C6] leading-[1.5] block">
              {isCanada
                ? "Snap a photo of your letter, get your results on the spot, and get a reminder before your signing deadline."
                : "Snap a photo of your agreement, get your results on the spot, and get a reminder before your signing deadline."}
            </span>
          </div>
          <div className="flex items-center gap-[10px] shrink-0">
            <a
              className="inline-flex items-center h-[40px] no-underline"
              href="#app"
              onClick={handleAppSoon}
              aria-label="Download on the App Store"
            >
              <img
                src="/assets/brand/store/app-store-badge.svg"
                alt="Download on the App Store"
                className="h-[40px] w-auto block"
              />
            </a>
            <a
              className="inline-flex items-center h-[40px] no-underline"
              href="#app"
              onClick={handleAppSoon}
              aria-label="Get it on Google Play"
            >
              <img
                src="/assets/brand/store/google-play-badge.png"
                alt="Get it on Google Play"
                className="h-[40px] w-auto block"
              />
            </a>
          </div>
          {appSoonVisible && (
            <div className="mt-2.5 text-[12.5px] text-[#7ff0cf] w-full" id="appsoon">
              The app is coming. Leave your email at checkout or on the free check and we&apos;ll tell you the day it&apos;s out.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
