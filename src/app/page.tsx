"use client";

import React, { useContext } from "react";
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

  return (
    <div className="min-h-screen flex flex-col text-primary">
      {/* Navigation Bar */}
      <Navbar
        country={currentCountry}
        onCountrySwitch={handleCountrySwitch}
      />

      <main id="main-content" className="flex-1">
        {/* Section 1: Hero & Explainer Video */}
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
