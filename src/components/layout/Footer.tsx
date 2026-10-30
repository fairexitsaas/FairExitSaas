"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { CountryCode } from "@/context/CountryContext";
import { triggerGetApp } from "@/context/GetAppContext";

interface FooterProps {
  country: CountryCode;
  onCountrySwitch?: (country: CountryCode) => void;
  onOpenAppModal?: () => void;
  variant?: "default" | "about" | "lawyers";
}

export default function Footer({
  country,
  onCountrySwitch,
  onOpenAppModal,
  variant = "default",
}: FooterProps) {
  const isCanada = country === "CA";

  const handleOpenApp = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onOpenAppModal) {
      onOpenAppModal();
    } else {
      triggerGetApp();
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
      const el = document.getElementById(href.slice(1));
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: "smooth" });
      } else {
        window.location.href = "/" + href;
      }
    }
  };

  if (variant === "about") {
    return (
      <footer className="border-t border-[#dfe3e8] dark:border-[#1e3b5c] py-8 sm:py-9 transition-colors">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 w-full flex flex-col sm:flex-row justify-between gap-8 sm:gap-10 items-start">
          {/* Left Column: Logo, Tagline, Disclaimer */}
          <div className="max-w-[600px]">
            <Image
              className="h-7 w-auto object-contain dark:hidden"
              src="/fairexitlogo.png"
              alt="FairExit"
              width={140}
              height={32}
            />
            <Image
              className="h-7 w-auto object-contain hidden dark:block"
              src="/fairexitlogo-dark.png"
              alt="FairExit"
              width={140}
              height={32}
            />
            <div className="text-sm font-bold text-[#0c8f72] dark:text-[#0eb28d] my-2">
              Challenge your severance offer.
            </div>
            {isCanada ? (
              <p className="text-[11.5px] sm:text-[12px] text-[#5a6b78] dark:text-[#9ab1c6] leading-[1.55]">
                <b className="font-bold text-[#062c55] dark:text-white">
                  Information, not legal advice.
                </b>{" "}
                Our verdict and ranges are estimates from AI and general rules — they can be wrong, and the law changes. Please do your own research.{" "}
                <b className="font-bold text-[#062c55] dark:text-white">
                  Only a licensed employment lawyer can confirm your exact number.
                </b>{" "}
                We&apos;re paid a flat advertising fee by lawyers, never a cut of your outcome, and you always choose who to talk to.{" "}
                <Link
                  href="/legal"
                  className="text-[#0c8f72] dark:text-[#0eb28d] hover:underline font-medium"
                >
                  Read the full Terms &amp; Disclaimer →
                </Link>
              </p>
            ) : (
              <p className="text-[11.5px] sm:text-[12px] text-[#5a6b78] dark:text-[#9ab1c6] leading-[1.55]">
                <b className="font-bold text-[#062c55] dark:text-white">
                  Educational &amp; organizational information — not legal advice.
                </b>{" "}
                FairExit helps you organize your offer and understand general federal rules; it doesn&apos;t assess whether your layoff was lawful, evaluate compliance, or tell you what you&apos;re owed. Any read or general information can be wrong, and the law changes. Please do your own research.{" "}
                <b className="font-bold text-[#062c55] dark:text-white">
                  Only a licensed employment attorney can advise you.
                </b>{" "}
                Deadlines to act can be short — confirm them with an attorney promptly. We&apos;re paid a flat advertising fee by attorneys, never a cut of your outcome, and you always choose who to talk to.{" "}
                <Link
                  href="/legal"
                  className="text-[#0c8f72] dark:text-[#0eb28d] hover:underline font-medium"
                >
                  Full disclaimer, terms &amp; privacy →
                </Link>
              </p>
            )}
          </div>

          {/* Right Column: Single column links matching the screenshot */}
          <div className="text-[13.5px] text-[#5a6b78] dark:text-[#9ab1c6] shrink-0 sm:min-w-[140px]">
            <div className="font-bold text-[#062c55] dark:text-white mb-2">
              FairExit
            </div>
            <div className="flex flex-col gap-[7px]">
              <Link
                href="/questions"
                className="hover:text-[#062c55] dark:hover:text-white transition-colors no-underline whitespace-nowrap"
              >
                {isCanada ? "Check my offer" : "Check my layoff"}
              </Link>
              <a
                href={isCanada ? "/#how" : "/#check"}
                onClick={(e) => handleNavLink(isCanada ? "#how" : "#check", e)}
                className="hover:text-[#062c55] dark:hover:text-white transition-colors no-underline whitespace-nowrap"
              >
                How it works
              </a>
              <a
                href="/#paths"
                onClick={(e) => handleNavLink("#paths", e)}
                className="hover:text-[#062c55] dark:hover:text-white transition-colors no-underline whitespace-nowrap"
              >
                Pricing
              </a>
              <Link
                href="/faq"
                className="hover:text-[#062c55] dark:hover:text-white transition-colors no-underline whitespace-nowrap"
              >
                FAQ
              </Link>
              <Link
                href="/about"
                className="hover:text-[#062c55] dark:hover:text-white transition-colors no-underline whitespace-nowrap"
              >
                About
              </Link>
              {isCanada ? (
                <Link
                  href="/lawyers"
                  className="hover:text-[#062c55] dark:hover:text-white transition-colors no-underline whitespace-nowrap"
                >
                  Are you a lawyer? →
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleCountryToggle}
                  className="text-left font-normal text-[#5a6b78] dark:text-[#9ab1c6] hover:text-[#062c55] dark:hover:text-white bg-transparent border-none p-0 cursor-pointer text-inherit whitespace-nowrap"
                >
                  🇨🇦 In Canada? →
                </button>
              )}
            </div>
          </div>
        </div>
      </footer>
    );
  }

  if (variant === "lawyers") {
    return (
      <footer className="border-t border-[#dfe3e8] dark:border-[#1e3b5c] py-8 sm:py-9 transition-colors">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 w-full flex flex-col sm:flex-row justify-between gap-8 sm:gap-10 items-start">
          {/* Left Column: Logo, Tagline, Disclaimer */}
          <div className="max-w-[620px]">
            <Image
              className="h-7 w-auto object-contain dark:hidden"
              src="/fairexitlogo.png"
              alt="FairExit"
              width={140}
              height={32}
            />
            <Image
              className="h-7 w-auto object-contain hidden dark:block"
              src="/fairexitlogo-dark.png"
              alt="FairExit"
              width={140}
              height={32}
            />
            <div className="text-sm font-bold text-[#0eb28d] my-2">
              Challenge your severance offer.
            </div>
            <p className="text-[11.5px] text-[#5a6b78] dark:text-[#9ab1c6] leading-[1.57]">
              <b className="font-bold text-[#17242f] dark:text-white">
                For lawyers — informational.
              </b>{" "}
              FairExit is an advertising and lead-generation service, not a law firm and not your agent. We provide structured intake information, not legal advice. Fees are flat and never contingent on outcome; you remain responsible for compliance with your law society&apos;s rules, including disclosure to your client.{" "}
              <Link
                href="/"
                className="text-[#0c8f72] dark:text-[#0eb28d] hover:underline font-medium inline-block"
              >
                See the client experience →
              </Link>{" "}
              ·{" "}
              <Link
                href="/legal"
                className="text-[#0c8f72] dark:text-[#0eb28d] hover:underline font-medium inline-block"
              >
                Terms &amp; Disclaimer →
              </Link>
            </p>
          </div>

          {/* Right Column */}
          <div className="text-[13.5px] text-[#5a6b78] dark:text-[#9ab1c6] shrink-0 sm:min-w-[140px]">
            <div className="font-bold text-[#062c55] dark:text-white mb-2">
              FairExit
            </div>
            <div className="flex flex-col gap-[7px]">
              <a
                href="#how"
                onClick={(e) => handleNavLink("#how", e)}
                className="hover:text-[#062c55] dark:hover:text-white transition-colors no-underline whitespace-nowrap"
              >
                How it works
              </a>
              <a
                href="#fee"
                onClick={(e) => handleNavLink("#fee", e)}
                className="hover:text-[#062c55] dark:hover:text-white transition-colors no-underline whitespace-nowrap"
              >
                The fee
              </a>
              <a
                href="#access"
                onClick={(e) => handleNavLink("#access", e)}
                className="hover:text-[#062c55] dark:hover:text-white transition-colors no-underline whitespace-nowrap"
              >
                Request access
              </a>
              <Link
                href="/"
                className="hover:text-[#062c55] dark:hover:text-white transition-colors no-underline whitespace-nowrap"
              >
                For individuals →
              </Link>
              <Link
                href="/attorneys"
                className="hover:text-[#062c55] dark:hover:text-white transition-colors no-underline whitespace-nowrap"
              >
                🇺🇸 US attorney page →
              </Link>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-t border-line pt-[54px] pb-11 transition-colors">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 w-full box-border grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 lg:gap-4 items-start">
        {/* Left Column: Logo, Tagline, Disclaimer */}
        <div>
          <Image
            className="h-7 w-auto object-contain dark:hidden"
            src="/fairexitlogo.png"
            alt="FairExit"
            width={140}
            height={32}
          />
          <Image
            className="h-7 w-auto object-contain hidden dark:block"
            src="/fairexitlogo-dark.png"
            alt="FairExit"
            width={140}
            height={32}
          />
          <div className="text-[13px] font-bold text-greend my-1.5 mb-3">
            Challenge your severance offer
          </div>
          {isCanada ? (
            <p className="text-xs text-slate leading-[1.55]">
              <b className="font-bold text-navy dark:text-white">
                Educational &amp; organizational information — not legal advice.
              </b>{" "}
              FairExit helps you organize your offer and understand general
              information; it does not assess whether an offer is fair,
              calculate what you&apos;re owed, or tell you what to do. Any read
              or general information can be wrong, and the law changes. Please
              do your own research.{" "}
              <b className="font-bold text-navy dark:text-white">
                Only a licensed employment lawyer can advise on your situation.
              </b>{" "}
              We&apos;re paid a fixed advertising fee by lawyers, never a cut of
              your outcome, and you always choose who to talk to.{" "}
              <b className="font-bold text-navy dark:text-white">
                Deadlines to act can be short — confirm them with a lawyer
                promptly.
              </b>{" "}
              <Link
                href="/legal"
                className="text-greend hover:underline font-medium"
              >
                Read our full Terms &amp; Disclaimer →
              </Link>
            </p>
          ) : (
            <p className="text-xs text-slate leading-[1.55]">
              <b className="font-bold text-navy dark:text-white">
                Educational &amp; organizational information — not legal advice.
              </b>{" "}
              FairExit US helps you organize your offer and understand general
              federal rules that may apply — it does{" "}
              <b className="font-bold text-navy dark:text-white">not</b> assess
              whether your layoff was lawful, evaluate compliance, tell you what
              you&apos;re owed, or create an attorney-client relationship. It is{" "}
              <b className="font-bold text-navy dark:text-white">
                not a substitute for an attorney
              </b>
              . US severance isn&apos;t set by law, so we never claim a legal
              minimum and we don&apos;t calculate WARN amounts. General rules
              referenced are US federal law (ADEA/OWBPA, WARN Act); your state
              may add more.{" "}
              <b className="font-bold text-navy dark:text-white">
                Deadlines to act can be short — confirm them with an attorney
                promptly.
              </b>{" "}
              We&apos;re paid a flat advertising fee by attorneys, never a cut
              of your outcome, and you always choose who to talk to.{" "}
              <Link
                href="/legal"
                className="text-greend hover:underline font-medium"
              >
                Read the full disclaimer, terms &amp; privacy →
              </Link>
            </p>
          )}
        </div>

        {/* Right Column: Badges sitting to the right of the logo, links in 2 columns under them */}
        <div className="text-[13.5px] text-slate w-fit mt-4">
          <div className="flex flex-row gap-2 mb-3.5">
            <div className="h-8 flex items-center">
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
            </div>
            <div className="h-8 flex items-center">
              <a
                className="inline-flex items-center no-underline"
                href="#app"
                onClick={handleOpenApp}
                aria-label="Get it on Google Play"
              >
                <img
                  src="/assets/brand/store/google-play-badge.png"
                  alt="Get it on Google Play"
                  className="h-8 w-auto"
                />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 items-start gap-x-8 sm:gap-x-12 gap-y-2 sm:gap-y-[13px]">
            {/* Column 1 Links */}
            <div className="flex flex-col min-w-0">
              <div className="flex flex-col gap-y-2 sm:gap-y-[13px] text-xs sm:text-[13.5px]">
                {isCanada ? (
                  <>
                    <Link
                      href="/questions"
                      className="hover:text-navy dark:hover:text-white transition-colors no-underline whitespace-nowrap"
                    >
                      Check my offer
                    </Link>
                    <a
                      href="/#paths"
                      onClick={(e) => handleNavLink("#paths", e)}
                      className="hover:text-navy dark:hover:text-white transition-colors no-underline whitespace-nowrap"
                    >
                      Pricing
                    </a>
                    <Link
                      href="/blog"
                      className="hover:text-navy dark:hover:text-white transition-colors no-underline whitespace-nowrap"
                    >
                      Blog
                    </Link>
                    <Link
                      href="/legal"
                      className="hover:text-navy dark:hover:text-white transition-colors no-underline whitespace-nowrap"
                    >
                      Terms &amp; Disclaimer
                    </Link>
                  </>
                ) : (
                  <>
                    <a
                      href="/#check"
                      onClick={(e) => handleNavLink("#check", e)}
                      className="hover:text-navy dark:hover:text-white transition-colors no-underline whitespace-nowrap"
                    >
                      What we check
                    </a>
                    <Link
                      href="/faq"
                      className="hover:text-navy dark:hover:text-white transition-colors no-underline whitespace-nowrap"
                    >
                      FAQ
                    </Link>
                    <Link
                      href="/about"
                      className="hover:text-navy dark:hover:text-white transition-colors no-underline whitespace-nowrap"
                    >
                      About
                    </Link>
                    <Link
                      href="/attorneys"
                      className="text-slate hover:text-navy dark:hover:text-white transition-colors no-underline whitespace-nowrap"
                    >
                      Are you an attorney? →
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Column 2 Links */}
            <div className="flex flex-col min-w-0">
              <div className="flex flex-col gap-y-2 sm:gap-y-[13px] text-xs sm:text-[13.5px]">
                {isCanada ? (
                  <>
                    <a
                      href="/#how"
                      onClick={(e) => handleNavLink("#how", e)}
                      className="hover:text-navy dark:hover:text-white transition-colors no-underline whitespace-nowrap"
                    >
                      How it works
                    </a>
                    <Link
                      href="/faq"
                      className="hover:text-navy dark:hover:text-white transition-colors no-underline whitespace-nowrap"
                    >
                      FAQ
                    </Link>
                    <Link
                      href="/about"
                      className="hover:text-navy dark:hover:text-white transition-colors no-underline whitespace-nowrap"
                    >
                      About
                    </Link>
                    <Link
                      href="/lawyers"
                      className="text-slate hover:text-navy dark:hover:text-white transition-colors no-underline whitespace-nowrap"
                    >
                      Are you a lawyer? →
                    </Link>
                  </>
                ) : (
                  <>
                    <a
                      href="/#paths"
                      onClick={(e) => handleNavLink("#paths", e)}
                      className="hover:text-navy dark:hover:text-white transition-colors no-underline whitespace-nowrap"
                    >
                      Pricing
                    </a>
                    <Link
                      href="/blog"
                      className="hover:text-navy dark:hover:text-white transition-colors no-underline whitespace-nowrap"
                    >
                      Blog
                    </Link>
                    <Link
                      href="/legal"
                      className="hover:text-navy dark:hover:text-white transition-colors no-underline whitespace-nowrap"
                    >
                      Legal, terms &amp; privacy
                    </Link>
                    <button
                      type="button"
                      onClick={handleCountryToggle}
                      className="text-left font-normal text-slate hover:text-navy dark:hover:text-white bg-transparent border-none p-0 cursor-pointer text-inherit whitespace-nowrap"
                    >
                      🇨🇦 In Canada? →
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
