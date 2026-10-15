"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CountryCode } from "@/context/CountryContext";
import { useAccessibility } from "@/context/AccessibilityContext";

interface NavbarProps {
  country: CountryCode;
  onCountrySwitch: (nextCountry: CountryCode) => void;
  onOpenCountryModal?: () => void;
}

export default function Navbar({ country, onCountrySwitch }: NavbarProps) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isCanada = country === "CA";
  const { toggleDialog } = useAccessibility();

  const handleNavLinkClick = (href: string, e: React.MouseEvent) => {
    e.preventDefault();
    setMobileMenuOpen(false);

    if (href === "#how" || href === "#check") {
      const targetId = isCanada ? "how" : "check";
      const el =
        document.getElementById(targetId) ||
        document.getElementById("how") ||
        document.getElementById("check");
      el?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (href === "#paths") {
      document.getElementById("paths")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (href === "faq.html" || href === "#faq") {
      document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (href === "blog/index.html" || href.includes("blog")) {
      const el = isCanada
        ? document.getElementById("why")
        : document.getElementById("states");
      (
        el ||
        document.getElementById("why") ||
        document.getElementById("states")
      )?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (href === "#app") {
      document.getElementById("app")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (href === "about.html" || href === "#about") {
      const el = isCanada
        ? document.getElementById("how")
        : document.getElementById("about");
      (
        el ||
        document.getElementById("how") ||
        document.getElementById("about")
      )?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (href === "demo-v3.html" || href === "/questions") {
      handleCtaClick(e);
      return;
    }

    if (href.startsWith("#")) {
      const targetId = href.slice(1);
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }
  };

  const handleToggleCountry = (e: React.MouseEvent) => {
    e.preventDefault();
    const nextCountry: CountryCode = isCanada ? "US" : "CA";
    onCountrySwitch(nextCountry);
    setMobileMenuOpen(false);
  };

  const handleCtaClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    router.push(isCanada ? "/questions?country=CA" : "/questions?country=US");
  };

  const handleA11yClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleDialog();
  };

  // Flag SVGs matching the reference markup
  const UsFlagSvg = (
    <svg className="w-[18px] h-[12.5px] rounded-[2px] shrink-0 inline-block shadow-[0_0_0_1px_rgba(0,0,0,0.06)]" viewBox="0 0 20 14" aria-hidden="true">
      <rect width="20" height="14" fill="#b22234"></rect>
      <rect y="2" width="20" height="2" fill="#fff"></rect>
      <rect y="6" width="20" height="2" fill="#fff"></rect>
      <rect y="10" width="20" height="2" fill="#fff"></rect>
      <rect width="9" height="8" fill="#3c3b6e"></rect>
    </svg>
  );

  const CaFlagSvg = (
    <svg className="w-[18px] h-[12.5px] rounded-[2px] shrink-0 inline-block shadow-[0_0_0_1px_rgba(0,0,0,0.06)]" viewBox="0 0 20 14" aria-hidden="true">
      <rect width="20" height="14" fill="#fff"></rect>
      <rect width="5.5" height="14" fill="#d52b1e"></rect>
      <rect x="14.5" width="5.5" height="14" fill="#d52b1e"></rect>
      <g transform="translate(10 7) scale(0.11) translate(-50 -48)">
        <path
          d="M50 6L55 25L60 20L58 40L75 35L68 48L90 50L68 58L72 70L55 65L57 90L50 82L43 90L45 65L28 70L32 58L10 50L32 48L25 35L42 40L40 20L45 25Z"
          fill="#d52b1e"
        ></path>
      </g>
    </svg>
  );

  return (
    <header className="sticky top-0 z-50 w-full bg-page/95 border-b border-line backdrop-blur-md transition-colors">
      <div className="max-w-[1200px] mx-auto px-6 w-full flex items-center h-[72px] box-border">
        {/* Brand Lock */}
        <div className="flex flex-col items-start no-underline shrink-0">
          <Link
            href="/"
            aria-label="FairExit"
            className="inline-flex"
            onClick={(e) => {
              if (window.location.pathname === "/") {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
          >
            <Image
              className="h-7 w-auto object-contain"
              src="/fairexit-wordmark.png"
              alt="FairExit"
              width={140}
              height={32}
              priority
            />
          </Link>
          <span className="text-[11px] text-slate font-medium mt-0.5 text-left tracking-[-0.1px]">
            {isCanada
              ? "Challenge your severance offer"
              : "Make sense of your offer"}
          </span>
        </div>

        {/* Desktop Links */}
        <div className="hidden lg:flex items-center gap-[26px] ml-auto mr-7">
          <a
            className="text-[#475569] dark:text-slate hover:text-navy dark:hover:text-white no-underline text-[14.5px] font-medium transition-colors whitespace-nowrap"
            href={isCanada ? "#how" : "#check"}
            onClick={(e) => handleNavLinkClick(isCanada ? "#how" : "#check", e)}
          >
            How it works
          </a>
          <a
            className="text-[#475569] dark:text-slate hover:text-navy dark:hover:text-white no-underline text-[14.5px] font-medium transition-colors whitespace-nowrap"
            href="#paths"
            onClick={(e) => handleNavLinkClick("#paths", e)}
          >
            Pricing
          </a>
          <a
            className="text-[#475569] dark:text-slate hover:text-navy dark:hover:text-white no-underline text-[14.5px] font-medium transition-colors whitespace-nowrap"
            href="faq.html"
            onClick={(e) => handleNavLinkClick("faq.html", e)}
          >
            FAQ
          </a>
          <a
            className="text-[#475569] dark:text-slate hover:text-navy dark:hover:text-white no-underline text-[14.5px] font-medium transition-colors whitespace-nowrap"
            href="blog/index.html"
            onClick={(e) => handleNavLinkClick("blog/index.html", e)}
          >
            Blog
          </a>
          <a
            className="text-[#475569] dark:text-slate hover:text-navy dark:hover:text-white no-underline text-[14.5px] font-medium transition-colors whitespace-nowrap"
            href="#app"
            onClick={(e) => handleNavLinkClick("#app", e)}
          >
            Get the app
          </a>
          <a
            className="text-[#475569] dark:text-slate hover:text-navy dark:hover:text-white no-underline text-[14.5px] font-medium transition-colors whitespace-nowrap"
            href="about.html"
            onClick={(e) => handleNavLinkClick("about.html", e)}
          >
            About
          </a>
        </div>

        {/* Nav Right */}
        <div className="hidden sm:flex items-center gap-3 shrink-0 ml-auto lg:ml-0">
          {/* Accessibility button */}
          <button
            type="button"
            onClick={handleA11yClick}
            aria-label="Accessibility options"
            title="Accessibility"
            className="hidden lg:inline-flex items-center justify-center w-[34px] h-[34px] rounded-full border border-line bg-card text-navy dark:text-white cursor-pointer shadow-[0_1px_3px_rgba(6,44,85,0.04)] hover:border-green hover:scale-105 transition-all"
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-[19px] h-[19px]"
              aria-hidden="true"
            >
              <circle cx="12" cy="3.6" r="2"></circle>
              <path d="M20 8.2c-2.3.7-5 1-8 1s-5.7-.3-8-1L3.4 10c1.9.6 4 .9 5.9 1v3.1L7.5 20.6l1.9.6L11 16h2l1.6 5.2 1.9-.6-1.8-6.5V11c1.9-.1 4-.4 5.9-1L20 8.2z"></path>
            </svg>
          </button>

          {/* Country Pill Switcher */}
          <a
            className="hidden lg:inline-flex items-center gap-1.5 h-[34px] px-3 rounded-full border border-line bg-card text-navy dark:text-white text-[13px] font-bold cursor-pointer shadow-[0_1px_3px_rgba(6,44,85,0.04)] hover:border-green hover:bg-[#EEF8F3] dark:hover:bg-slate-800 transition-all no-underline"
            href={
              isCanada
                ? "../resource-hub-us/index-v3.html"
                : "../resource-hub-v2/index-v3.html"
            }
            onClick={handleToggleCountry}
            title={
              isCanada
                ? "Switch to the US site"
                : "Switch to the Canadian site"
            }
          >
            {isCanada ? (
              <>
                {CaFlagSvg}
                <span>
                  CA <span className="font-normal text-slate text-xs">· switch to</span>
                </span>
                {UsFlagSvg}
              </>
            ) : (
              <>
                {UsFlagSvg}
                <span>
                  US <span className="font-normal text-slate text-xs">· switch to</span>
                </span>
                {CaFlagSvg}
              </>
            )}
          </a>

          {/* Primary CTA */}
          <a
            className="inline-flex items-center justify-center gap-1.5 bg-green hover:bg-greend text-white px-5 py-[9px] rounded-xl font-bold text-sm no-underline border-none cursor-pointer shadow-button hover:shadow-button-hover hover:-translate-y-px active:scale-[0.98] transition-all whitespace-nowrap"
            href={isCanada ? "/questions" : "#check"}
            onClick={handleCtaClick}
          >
            {isCanada ? "Check my offer →" : "Check my layoff →"}
          </a>
        </div>

        {/* Hamburger Trigger */}
        <button
          className="lg:hidden flex bg-transparent border-none cursor-pointer p-2 flex-col gap-[5px] ml-auto sm:ml-2"
          aria-label="Menu"
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <span className={`block w-[22px] h-[2px] bg-navy dark:bg-white rounded-full transition-all duration-200 ${mobileMenuOpen ? "translate-y-[7px] rotate-45" : ""}`}></span>
          <span className={`block w-[22px] h-[2px] bg-navy dark:bg-white rounded-full transition-all duration-200 ${mobileMenuOpen ? "opacity-0" : ""}`}></span>
          <span className={`block w-[22px] h-[2px] bg-navy dark:bg-white rounded-full transition-all duration-200 ${mobileMenuOpen ? "-translate-y-[7px] -rotate-45" : ""}`}></span>
        </button>
      </div>

      {/* Mobile Drawer */}
      <div
        className={`${mobileMenuOpen ? "flex" : "hidden"} lg:hidden flex-col px-6 py-4 pb-6 bg-page border-b border-line gap-3`}
        id="mobmenu"
      >
        <a
          className="text-slate hover:text-navy dark:hover:text-white text-[15px] font-semibold py-1.5 transition-colors no-underline"
          href={isCanada ? "#how" : "#check"}
          onClick={(e) => handleNavLinkClick(isCanada ? "#how" : "#check", e)}
        >
          How it works
        </a>
        <a
          className="text-slate hover:text-navy dark:hover:text-white text-[15px] font-semibold py-1.5 transition-colors no-underline"
          href="#paths"
          onClick={(e) => handleNavLinkClick("#paths", e)}
        >
          Pricing
        </a>
        <a
          className="text-slate hover:text-navy dark:hover:text-white text-[15px] font-semibold py-1.5 transition-colors no-underline"
          href="faq.html"
          onClick={(e) => handleNavLinkClick("faq.html", e)}
        >
          FAQ
        </a>
        <a
          className="text-slate hover:text-navy dark:hover:text-white text-[15px] font-semibold py-1.5 transition-colors no-underline"
          href="blog/index.html"
          onClick={(e) => handleNavLinkClick("blog/index.html", e)}
        >
          Blog
        </a>
        <a
          className="text-slate hover:text-navy dark:hover:text-white text-[15px] font-semibold py-1.5 transition-colors no-underline"
          href="#app"
          onClick={(e) => handleNavLinkClick("#app", e)}
        >
          Get the app
        </a>
        <a
          className="text-slate hover:text-navy dark:hover:text-white text-[15px] font-semibold py-1.5 transition-colors no-underline"
          href="about.html"
          onClick={(e) => handleNavLinkClick("about.html", e)}
        >
          About
        </a>
        <a
          className="text-slate hover:text-navy dark:hover:text-white text-[15px] font-semibold py-1.5 transition-colors no-underline"
          href={
            isCanada
              ? "../resource-hub-us/index-v3.html"
              : "../resource-hub-v2/index-v3.html"
          }
          onClick={handleToggleCountry}
        >
          {isCanada
            ? "Switch to the US site →"
            : "Switch to the Canadian site →"}
        </a>
        <a
          className="text-slate hover:text-navy dark:hover:text-white text-[15px] font-semibold py-1.5 transition-colors no-underline"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleDialog();
            setMobileMenuOpen(false);
          }}
        >
          Accessibility options
        </a>
        <a
          className="inline-flex items-center justify-center gap-1.5 bg-green hover:bg-greend text-white px-5 py-[9px] rounded-xl font-bold text-sm no-underline border-none cursor-pointer shadow-button hover:shadow-button-hover active:scale-[0.98] transition-all whitespace-nowrap mt-2 w-full"
          href={isCanada ? "/questions" : "#check"}
          onClick={handleCtaClick}
        >
          {isCanada ? "Check my offer →" : "Check my layoff →"}
        </a>
      </div>
    </header>
  );
}
