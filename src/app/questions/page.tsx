"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import CanadaFlow from "./CanadaFlow";
import USFlow from "./USFlow";

function QuestionsRouter() {
  const searchParams = useSearchParams();
  const countryParam = searchParams?.get("country")?.toUpperCase();
  const stParam = searchParams?.get("st") || searchParams?.get("state");
  const isCanada = countryParam ? countryParam === "CA" : stParam ? false : true;
  const flowKey = `${isCanada ? "CA" : "US"}_${searchParams?.toString() || ""}`;

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
