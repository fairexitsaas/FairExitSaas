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
      <section className="py-12 sm:py-14 lg:pt-[60px] lg:pb-12 bg-page transition-colors" id="hero">
        <div className="max-w-[1200px] mx-auto px-6 w-full box-border">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-9 lg:gap-14 items-start">
            {/* Left Column: Heading, Subtitle & Reference */}
            <div>
              <span className="inline-flex items-center text-xs font-extrabold uppercase tracking-[1.5px] text-greend">
                <Image
                  className="h-[22px] w-auto -translate-y-0.5 mr-2.5 rounded-[2px]"
                  src={isCanada ? "/flag-ca.svg" : "/flag-us.svg"}
                  alt={isCanada ? "Canada" : "United States"}
                  width={34}
                  height={22}
                  priority
                />
                {isCanada ? "Free severance check · Canada" : "Free layoff check · United States"}
              </span>

              {isCanada ? (
                <h1 className="font-serif text-[clamp(28px,8vw,34px)] sm:text-[clamp(36px,4vw,48px)] leading-[1.1] text-navy dark:text-white font-bold my-2.5 mb-4.5 tracking-[-0.5px]">
                  Just laid off in Canada? <em className="italic text-greend font-bold not-italic"> <br />Make sense</em> of your <br /> severance offer — in 60 <br /> seconds.
                </h1>
              ) : (
                <h1 className="font-serif text-[clamp(28px,8vw,34px)] sm:text-[clamp(36px,4vw,48px)] leading-[1.1] text-navy dark:text-white font-bold my-2.5 mb-4.5 tracking-[-0.5px]">
                  Laid off in the US? <em className="italic text-greend font-bold not-italic">Make <br /> sense</em> of your separation <br /> offer.
                </h1>
              )}

              <p className="text-base sm:text-[16.5px] leading-[1.6] text-slate mb-5 max-w-[480px]">
                {isCanada
                  ? "It's easy to sign the first offer without knowing what else was possible. FairExit helps you organize the offer, understand the key terms, and prepare your questions — starting free."
                  : "US law doesn't set a severance amount — but your employer still has rules to follow. We check whether they did, in plain English, and flag anything that looks off. Free."}
              </p>

              <div className="inline-flex items-start gap-1.5 py-[9px] px-3.5 text-[13px] text-slate mb-[22px]">
                <span>📚</span> Built from{" "}
                <b className="font-bold text-navy dark:text-white">
                  {isCanada ? "official federal & provincial sources" : "official federal & state sources"}
                </b>
                , checked with {isCanada ? "employment lawyers." : "employment attorneys."}
              </div>

              <div className="flex items-center gap-3.5 text-[13px] text-slate font-semibold">
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
      <section className="py-16 mx-auto" id="video">
        <div className="max-w-[1200px] mx-auto px-6 w-full box-border">
          <div className="text-center">
            <span className="inline-flex items-center text-xs font-extrabold uppercase tracking-[1.5px] text-greend">In 90 seconds</span>
            <h2 className="font-serif text-[26px] sm:text-[clamp(24px,3vw,28px)] text-navy dark:text-white font-bold leading-[1.15] mt-1.5">
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
              <div className="w-[68px] h-[68px] rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white text-[26px] border-[1.5px] border-white/40 group-hover:scale-108 group-hover:bg-white/30 transition-all duration-200">
                ▶
              </div>
            </div>
            <div className="mt-3.5 text-[13.5px] text-slate leading-[1.5]">
              <b className="font-bold text-navy dark:text-white">Our explainer video is on the way.</b> A quick walkthrough of the free{" "}
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
