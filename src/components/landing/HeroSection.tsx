"use client";

import React, { useState } from "react";
import Image from "next/image";
import { CountryCode } from "@/context/CountryContext";
import { triggerGetApp } from "@/context/GetAppContext";
import QuickCheckForm from "./QuickCheckForm";

interface HeroSectionProps {
  country: CountryCode;
  onOpenAppModal?: () => void;
}

export default function HeroSection({
  country,
  onOpenAppModal,
}: HeroSectionProps) {
  const isCanada = country === "CA";
  const [videoPlaying, setVideoPlaying] = useState(false);

  const handleOpenApp = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onOpenAppModal) {
      onOpenAppModal();
    } else {
      triggerGetApp();
    }
  };

  return (
    <>
      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className="relative transition-colors" id="hero">
        <div className="wrap max-w-[1040px] mx-auto px-4 sm:px-6 w-full box-border">
          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-5 lg:gap-10 items-center py-6 sm:py-7 lg:py-[46px] lg:pb-[30px]">
            {/* Left Column: Heading, Subtitle & Reference */}
            <div>
              <span className="inline-flex items-center text-[11px] sm:text-[12px] font-extrabold uppercase tracking-[1.4px] text-[#0c8f72] flex-wrap gap-1.5">
                <Image
                  className="h-[20px] sm:h-[22px] w-auto rounded-[2px]"
                  src={isCanada ? "/flag-ca.svg" : "/flag-us.svg"}
                  alt={isCanada ? "Canada" : "United States"}
                  width={34}
                  height={22}
                  priority
                />
                <span>
                  {isCanada
                    ? "Free severance check · Canada"
                    : "Free layoff check · United States"}
                </span>
              </span>

              {isCanada ? (
                <h1 className="font-serif text-[24px] sm:text-[34px] lg:text-[44px] leading-[1.15] text-[#062c55] font-semibold my-2.5 sm:my-4 tracking-[-0.5px]">
                  Just laid off in Canada?{" "}
                  <em
                    className="italic text-[#0c8f72]"
                    style={{ fontStyle: "italic" }}
                  >
                    Make sense
                  </em>{" "}
                  of your severance offer — in 60 seconds.
                </h1>
              ) : (
                <h1 className="font-serif text-[24px] sm:text-[34px] lg:text-[44px] leading-[1.15] text-[#062c55] font-semibold my-2.5 sm:my-4 tracking-[-0.5px]">
                  Laid off in the US?{" "}
                  <em
                    className="italic text-[#0c8f72]"
                    style={{ fontStyle: "italic" }}
                  >
                    Make sense
                  </em>{" "}
                  of your separation offer.
                </h1>
              )}

              <p className="text-[14px] sm:text-[16.5px] leading-[1.5] sm:leading-[1.6] text-[#5a6b78] mb-3.5 sm:mb-5 max-w-[480px]">
                {isCanada
                  ? "It's easy to sign the first offer without knowing what else was possible. FairExit helps you organize the offer, understand the key terms, and prepare your questions — starting free."
                  : "US law doesn't set a severance amount — but your employer still has rules to follow. We check whether they did, in plain English, and flag anything that looks off. Free."}
              </p>

              <div className="mt-3 sm:mt-4 text-[12.5px] sm:text-[13px] text-[#5a6b78] leading-relaxed">
                📚 Built from{" "}
                <b className="font-bold text-[#062c55]">
                  {isCanada
                    ? "official federal & provincial sources"
                    : "official federal & state sources"}
                </b>
                , checked with{" "}
                {isCanada ? "employment lawyers." : "employment attorneys."}
              </div>

              <div className="mt-4 sm:mt-[18px] flex items-center gap-2.5 sm:gap-3 flex-wrap text-[12px] sm:text-[12.5px] text-[#5a6b78] font-bold">
                <span>Or do it on your phone</span>
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <a
                    className="inline-flex items-center no-underline"
                    href="#app"
                    onClick={handleOpenApp}
                    aria-label="Download on the App Store"
                  >
                    <img
                      src="/assets/brand/store/app-store-badge.svg"
                      alt="Download on the App Store"
                      className="h-7 sm:h-8 w-auto"
                    />
                  </a>
                  <a
                    className="inline-flex items-center no-underline"
                    href="#app"
                    onClick={handleOpenApp}
                    aria-label="Get it on Google Play"
                  >
                    <img
                      src="/assets/brand/store/google-play-badge.png"
                      alt="Get it on Google Play"
                      className="h-7 sm:h-8 w-auto"
                    />
                  </a>
                </div>
              </div>
            </div>

            {/* Right Column: Quick Check Form Card */}
            <QuickCheckForm key={country} country={country} />
          </div>
        </div>
      </section>

      {/* ── EXPLAINER VIDEO (placeholder) ─────────────────────────────── */}
      <section className="py-10 sm:py-14 mx-auto" id="video">
        <div className="wrap max-w-[1040px] mx-auto px-4 sm:px-6 w-full box-border">
          <div className="text-center">
            <span className="inline-flex items-center text-[12px] font-extrabold uppercase tracking-[1.4px] text-[#0c8f72]">
              In 90 seconds
            </span>
            <h2 className="font-serif text-[24px] sm:text-[28px] md:text-[32px] text-[#062c55] font-semibold leading-[1.15] tracking-[-0.5px] mt-[6px]">
              {isCanada ? "See how FairExit works." : "See how it works."}
            </h2>
          </div>
          <div className="max-w-[760px] mx-auto mt-[26px] text-center">
            <div
              className="relative w-full aspect-video bg-[#062c55] rounded-[20px] overflow-hidden flex items-center justify-center cursor-pointer shadow-[0_16px_40px_rgba(6,44,85,0.18)] group"
              role="button"
              tabIndex={0}
              onClick={() => setVideoPlaying(!videoPlaying)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setVideoPlaying(!videoPlaying);
                }
              }}
              aria-label="Explainer video coming soon"
            >
              {/* Coming soon pill in top right */}
              <span className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 inline-flex items-center px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-[10.5px] font-bold tracking-[1px] uppercase bg-white/15 text-white border border-white/20 backdrop-blur-sm pointer-events-none select-none">
                COMING SOON
              </span>

              <div className="w-[68px] h-[68px] rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white text-[26px] border-[1.5px] border-white/40 group-hover:scale-110 group-hover:bg-white/30 transition-all duration-200">
                ▶
              </div>
            </div>
            <div className="mt-3.5 text-[13.5px] text-[#5a6b78] leading-[1.5]">
              <b className="font-bold text-[#062c55]">
                Our explainer video is on the way.
              </b>{" "}
              A quick walkthrough of the free{" "}
              {isCanada
                ? "check, your options, and how we connect you to a lawyer."
                : "compliance check, your options, and how we connect you to an attorney."}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
