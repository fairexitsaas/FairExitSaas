"use client";

import React, { useState } from "react";
import Image from "next/image";
import { CountryCode } from "@/context/CountryContext";
import QuickCheckForm from "./QuickCheckForm";

interface HeroSectionProps {
  country: CountryCode;
  onOpenAppModal?: () => void;
}

export default function HeroSection({ country, onOpenAppModal }: HeroSectionProps) {
  const isCanada = country === "CA";
  const [videoPlaying, setVideoPlaying] = useState(false);

  const handleOpenApp = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onOpenAppModal) {
      onOpenAppModal();
    } else {
      const b = document.getElementById("appBox");
      if (b) b.hidden = false;
    }
  };

  return (
    <>
      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className="relative transition-colors" id="hero">
        <div className="max-w-[1040px] mx-auto px-6 w-full box-border">
          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-5 lg:gap-10 items-center py-7 lg:py-[46px] lg:pb-[30px]">
            {/* Left Column: Heading, Subtitle & Reference */}
            <div>
              <span className="inline-flex items-center text-[12px] font-extrabold uppercase tracking-[1.4px] text-[#0c8f72]">
                <Image
                  className="h-[22px] w-auto mr-[9px] rounded-[2px]"
                  style={{ verticalAlign: "-7px" }}
                  src={isCanada ? "/flag-ca.svg" : "/flag-us.svg"}
                  alt={isCanada ? "Canada" : "United States"}
                  width={34}
                  height={22}
                  priority
                />
                {isCanada ? "Free severance check · Canada" : "Free layoff check · United States"}
              </span>

              {isCanada ? (
                <h1 className="font-serif text-[32px] sm:text-[38px] lg:text-[44px] xl:text-[47px] leading-[1.12] text-[#062c55] font-semibold my-4 tracking-[-0.5px]">
                  <span className="sm:whitespace-nowrap">Just laid off in Canada?</span>
                  <br className="hidden sm:inline" />{" "}
                  <span className="sm:whitespace-nowrap">
                    <em className="italic text-[#0c8f72]">Make sense</em> of your
                  </span>
                  <br className="hidden sm:inline" />{" "}
                  <span>severance offer — in 60 seconds.</span>
                </h1>
              ) : (
                <h1 className="font-serif text-[32px] sm:text-[38px] lg:text-[41px] xl:text-[44px] leading-[1.12] text-[#062c55] font-semibold my-4 tracking-[-0.5px]">
                  <span className="sm:whitespace-nowrap">
                    Laid off in the US? <em className="italic text-[#0c8f72]">Make</em>
                  </span>
                  <br className="hidden sm:inline" />{" "}
                  <span className="sm:whitespace-nowrap">
                    <em className="italic text-[#0c8f72]">sense</em> of your separation
                  </span>
                  <br className="hidden sm:inline" />{" "}
                  <span>offer.</span>
                </h1>
              )}

              <p className="text-[18px] leading-[1.6] text-[#5a6b78] mb-5 max-w-[520px]">
                {isCanada
                  ? "It's easy to sign the first offer without knowing what else was possible. FairExit helps you organize the offer, understand the key terms, and prepare your questions — starting free."
                  : "US law doesn't set a severance amount — but your employer still has rules to follow. We check whether they did, in plain English, and flag anything that looks off. Free."}
              </p>

              <div className="mt-4 text-[13px] text-[#5a6b78]">
                📚 Built from{" "}
                <b className="font-bold text-[#062c55]">
                  {isCanada ? "official federal & provincial sources" : "official federal & state sources"}
                </b>
                , checked with {isCanada ? "employment lawyers." : "employment attorneys."}
              </div>

              <div className="mt-[18px] flex items-center gap-3 flex-wrap text-[12.5px] text-[#5a6b78] font-bold">
                <span>Or do it on your phone</span>
                <div className="flex items-center gap-2.5">
                  <a
                    className="inline-flex items-center no-underline"
                    href="#app"
                    onClick={handleOpenApp}
                    aria-label="Download on the App Store"
                  >
                    <img
                      src="/assets/brand/store/app-store-badge.svg"
                      alt="Download on the App Store"
                      className="h-8 w-auto"
                    />
                  </a>
                  <a
                    className="inline-flex items-center no-underline"
                    href="#app"
                    onClick={handleOpenApp}
                    aria-label="Get it on Google Play"
                  >
                    <img
                      src="/assets/brand/store/google-play-badge.svg"
                      alt="Get it on Google Play"
                      className="h-8 w-auto"
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
      <section className="py-14 mx-auto" id="video">
        <div className="max-w-[1040px] mx-auto px-6 w-full box-border">
          <div className="text-center">
            <span className="inline-flex items-center text-[12px] font-extrabold uppercase tracking-[1.4px] text-[#0c8f72]">In 90 seconds</span>
            <h2 className="font-serif text-[26px] md:text-[32px] text-[#062c55] font-semibold leading-[1.1] tracking-[-0.5px] mt-[6px]">
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
              <div className="w-[68px] h-[68px] rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white text-[26px] border-[1.5px] border-white/40 group-hover:scale-110 group-hover:bg-white/30 transition-all duration-200">
                ▶
              </div>
            </div>
            <div className="mt-3.5 text-[13.5px] text-[#5a6b78] leading-[1.5]">
              <b className="font-bold text-[#062c55]">Our explainer video is on the way.</b> A quick walkthrough of the free{" "}
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
