"use client";

import React, { Suspense, useContext, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CountryContext } from "@/context/CountryContext";
import { detectIsUS } from "@/lib/report-storage";
import CanadaFlow from "./CanadaFlow";
import USFlow from "./USFlow";

function QuestionsRouter() {
  const searchParams = useSearchParams();
  const countryContext = useContext(CountryContext);
  const isUS = detectIsUS({
    country: countryContext?.Country,
    searchParams,
  });
  const isCanada = !isUS;
  const flowKey = `${isCanada ? "CA" : "US"}_${searchParams?.toString() || ""}`;

  useEffect(() => {
    if (isCanada && countryContext?.Country !== "CA") {
      countryContext?.setCountry("CA");
    } else if (isUS && countryContext?.Country !== "US") {
      countryContext?.setCountry("US");
    }
  }, [isCanada, isUS, countryContext]);

  return isCanada ? (
    <CanadaFlow key={flowKey} />
  ) : (
    <USFlow key={flowKey} />
  );
}

export default function QuestionsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f6f4ef] flex items-center justify-center text-sm font-bold text-[#5a6b78]">
          Loading questions…
        </div>
      }
    >
      <QuestionsRouter />
    </Suspense>
  );
}
