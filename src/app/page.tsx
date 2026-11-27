"use client";

import React, { useContext, useEffect } from "react";
import { CountryContext, CountryCode } from "@/context/CountryContext";
import Navbar from "@/components/layout/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import HowItWorks from "@/components/landing/HowItWorks";
import WhatWeCheck from "@/components/landing/WhatWeCheck";
import TheOutput from "@/components/landing/TheOutput";
import FirstGetFreeCheck from "@/components/landing/FirstGetFreeCheck";
import CantIAskChatGPT from "@/components/landing/CantIAskChatGPT";
import OurStory from "@/components/landing/OurStory";
import JurisdictionRules from "@/components/landing/JurisdictionRules";
import GetOnYourPhone from "@/components/landing/GetOnYourPhone";
import FaqSection from "@/components/landing/FaqSection";
import BottomCta from "@/components/landing/BottomCta";
import Footer from "@/components/layout/Footer";
import FloatingActions from "@/components/landing/FloatingActions";

export default function HomePage() {
  const context = useContext(CountryContext);
  const currentCountry: CountryCode = context?.Country || "US";

  const handleCountrySwitch = (nextCountry: CountryCode) => {
    if (context) context.setCountry(nextCountry);
  };

  const isCanada = currentCountry === "CA";

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const scrollToHash = (attempt = 0) => {
      const hash = window.location.hash?.slice(1);
      if (!hash) return;
      const el =
        document.getElementById(hash) ||
        (hash === "how"
          ? document.getElementById("check")
          : hash === "check"
          ? document.getElementById("how")
          : null);
      if (el && el.getClientRects().length > 0) {
        el.scrollIntoView({ behavior: "smooth" });
      } else if (attempt < 10) {
        timer = setTimeout(() => scrollToHash(attempt + 1), 60);
      }
    };

    // Defer slightly so Activity visibility and Next.js route scroll settle before scrolling to the section
    timer = setTimeout(() => scrollToHash(0), 50);

    const onHashChange = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => scrollToHash(0), 50);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, [currentCountry]);

  return (
    <div className="min-h-screen flex flex-col text-primary">
      {/* 1. Header / Navbar */}
      <Navbar
        country={currentCountry}
        onCountrySwitch={handleCountrySwitch}
      />

      <main id="main-content" className="flex-1">
        {/* 3. Hero Section & Explainer Video */}
        <HeroSection country={currentCountry} />

        {/* Section 2: Country-Specific Landing Page Section Flow */}
        {isCanada ? (
          <>
            {/* Canada Flow: How It Works -> Paths -> ChatGPT Comparison -> The Output -> Province Rules -> App -> FAQ -> CTA */}
            <HowItWorks />
            <FirstGetFreeCheck country={currentCountry} />
            <CantIAskChatGPT />
            <TheOutput country={currentCountry} />
            <JurisdictionRules country={currentCountry} />
            <GetOnYourPhone country={currentCountry} />
            <FaqSection country={currentCountry} />
            <BottomCta country={currentCountry} />
          </>
        ) : (
          <>
            {/* US Flow: What We Check -> The Output -> Paths -> Our Story -> App -> State Rules -> FAQ -> CTA */}
            <WhatWeCheck />
            <TheOutput country={currentCountry} />
            <FirstGetFreeCheck country={currentCountry} />
            <OurStory />
            <GetOnYourPhone country={currentCountry} />
            <JurisdictionRules country={currentCountry} />
            <FaqSection country={currentCountry} />
            <BottomCta country={currentCountry} />
          </>
        )}
      </main>

      {/* Footer */}
      <Footer country={currentCountry} onCountrySwitch={handleCountrySwitch} />

      {/* Floating Actions & Modals */}
      <FloatingActions />
    </div>
  );
}
