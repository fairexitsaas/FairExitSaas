"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { CountryCode } from "@/context/CountryContext";

interface FooterProps {
  country: CountryCode;
  onCountrySwitch?: (country: CountryCode) => void;
  onOpenAppModal?: () => void;
}

export default function Footer({
  country,
  onCountrySwitch,
  onOpenAppModal,
}: FooterProps) {
  const isCanada = country === "CA";

  const handleOpenApp = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onOpenAppModal) {
      onOpenAppModal();
    } else {
      const b = document.getElementById("appBox");
      if (b) b.hidden = false;
    }
  };

  const handleCountryToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onCountrySwitch) {
      onCountrySwitch(isCanada ? "US" : "CA");
    }
  };

  const handleNavLink = (href: string, e: React.MouseEvent) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      const el = document.getElementById(href.slice(1));
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer className="border-t border-line pt-[54px] pb-11 transition-colors">
      <div className="max-w-[1200px] mx-auto px-6 w-full box-border grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-9 lg:gap-12">
        <div>
          <Image
            className="h-7 w-auto object-contain"
            src="/fairexitlogo.png"
            alt="FairExit"
            width={140}
            height={32}
          />
          <div className="text-[13px] font-bold text-greend my-1.5 mb-3">
            Challenge your severance offer
          </div>
          {isCanada ? (
            <p className="text-xs text-slate leading-[1.6]">
              <b className="font-bold text-navy dark:text-white">Educational &amp; organizational information — not legal advice.</b> FairExit helps you organize your offer and understand general information; it does not assess whether an offer is fair, calculate what you&apos;re owed, or tell you what to do. Any read or general information can be wrong, and the law changes. Please do your own research. <b className="font-bold text-navy dark:text-white">Only a licensed employment lawyer can advise on your situation.</b> We&apos;re paid a fixed advertising fee by lawyers, never a cut of your outcome, and you always choose who to talk to. <b className="font-bold text-navy dark:text-white">Deadlines to act can be short — confirm them with a lawyer promptly.</b>{" "}
              <a href="#legal" className="text-greend hover:underline font-medium">
                Read our full Terms &amp; Disclaimer →
              </a>
            </p>
          ) : (
            <p className="text-xs text-slate leading-[1.6]">
              <b className="font-bold text-navy dark:text-white">Educational &amp; organizational information — not legal advice.</b> FairExit US helps you organize your offer and understand general federal rules that may apply — it does <b className="font-bold text-navy dark:text-white">not</b> assess whether your layoff was lawful, evaluate compliance, tell you what you&apos;re owed, or create an attorney-client relationship. It is <b className="font-bold text-navy dark:text-white">not a substitute for an attorney</b>. US severance isn&apos;t set by law, so we never claim a legal minimum and we don&apos;t calculate WARN amounts. General rules referenced are US federal law (ADEA/OWBPA, WARN Act); your state may add more. <b className="font-bold text-navy dark:text-white">Deadlines to act can be short — confirm them with an attorney promptly.</b> We&apos;re paid a flat advertising fee by attorneys, never a cut of your outcome, and you always choose who to talk to.{" "}
              <a href="#legal" className="text-greend hover:underline font-medium">
                Read the full disclaimer, terms &amp; privacy →
              </a>
            </p>
          )}
        </div>

        <div className="text-[13.5px] text-slate">
          <div className="mb-3.5">
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

          <div className="grid grid-cols-2 gap-x-[18px] gap-y-[9px]">
            {isCanada ? (
              <>
                <Link href="/questions" className="hover:text-navy dark:hover:text-white transition-colors no-underline">
                  Check my offer
                </Link>
                <a href="#how" onClick={(e) => handleNavLink("#how", e)} className="hover:text-navy dark:hover:text-white transition-colors no-underline">
                  How it works
                </a>
                <a href="#paths" onClick={(e) => handleNavLink("#paths", e)} className="hover:text-navy dark:hover:text-white transition-colors no-underline">
                  Pricing
                </a>
                <a href="#faq" onClick={(e) => handleNavLink("#faq", e)} className="hover:text-navy dark:hover:text-white transition-colors no-underline">
                  FAQ
                </a>
                <a href="#why" onClick={(e) => handleNavLink("#why", e)} className="hover:text-navy dark:hover:text-white transition-colors no-underline">
                  Blog
                </a>
                <a href="#how" onClick={(e) => handleNavLink("#how", e)} className="hover:text-navy dark:hover:text-white transition-colors no-underline">
                  About
                </a>
                <a href="#legal" className="hover:text-navy dark:hover:text-white transition-colors no-underline">
                  Terms &amp; Disclaimer
                </a>
                <a href="#lawyers" className="text-slate hover:text-navy dark:hover:text-white transition-colors no-underline">
                  Are you a lawyer? →
                </a>
              </>
            ) : (
              <>
                <a href="#check" onClick={(e) => handleNavLink("#check", e)} className="hover:text-navy dark:hover:text-white transition-colors no-underline">
                  What we check
                </a>
                <a href="#paths" onClick={(e) => handleNavLink("#paths", e)} className="hover:text-navy dark:hover:text-white transition-colors no-underline">
                  Pricing
                </a>
                <a href="#faq" onClick={(e) => handleNavLink("#faq", e)} className="hover:text-navy dark:hover:text-white transition-colors no-underline">
                  FAQ
                </a>
                <a href="#states" onClick={(e) => handleNavLink("#states", e)} className="hover:text-navy dark:hover:text-white transition-colors no-underline">
                  Blog
                </a>
                <a href="#about" onClick={(e) => handleNavLink("#about", e)} className="hover:text-navy dark:hover:text-white transition-colors no-underline">
                  About
                </a>
                <a href="#legal" className="hover:text-navy dark:hover:text-white transition-colors no-underline">
                  Legal, terms &amp; privacy
                </a>
                <a href="#lawyers" className="text-slate hover:text-navy dark:hover:text-white transition-colors no-underline">
                  Are you an attorney? →
                </a>
                <button
                  type="button"
                  onClick={handleCountryToggle}
                  className="text-left font-semibold text-greend bg-transparent border-none p-0 cursor-pointer text-inherit hover:underline"
                >
                  🇨🇦 In Canada? →
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
