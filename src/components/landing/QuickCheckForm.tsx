"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CountryCode } from "@/context/CountryContext";

interface QuickCheckFormProps {
  country: CountryCode;
}

export default function QuickCheckForm({ country }: QuickCheckFormProps) {
  const router = useRouter();
  const isCanada = country === "CA";

  // Canada fields
  const [qsProvince, setQsProvince] = useState("");
  const [qsAge, setQsAge] = useState("");
  const [qsYears, setQsYears] = useState("");
  const [qsSalary, setQsSalary] = useState("");

  // US fields
  const [usState, setUsState] = useState("");
  const [usAge, setUsAge] = useState("");
  const [usGroup, setUsGroup] = useState("");

  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  const handleUsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q: string[] = ["country=US"];
    if (usState) q.push("st=" + encodeURIComponent(usState));
    if (usAge) q.push("age40=" + (usAge.startsWith("Yes") ? "yes" : "no"));
    if (usGroup)
      q.push(
        "group=" +
          (usGroup.startsWith("Yes")
            ? "yes"
            : usGroup.startsWith("No")
            ? "no"
            : "unsure")
      );

    router.push("/questions?" + q.join("&"));
  };

  const handleCaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q: string[] = ["country=CA"];
    if (qsProvince) q.push("p=" + encodeURIComponent(qsProvince));
    if (qsAge) q.push("age=" + encodeURIComponent(qsAge));
    if (qsYears) q.push("y=" + encodeURIComponent(qsYears));
    if (qsSalary) q.push("s=" + encodeURIComponent(qsSalary));

    router.push("/questions?" + q.join("&"));
  };

  const selectArrowStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1.5 1.75L6 6.25L10.5 1.75' stroke='%23062C55' stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 14px center",
    backgroundSize: "12px 8px",
  };

  return (
    <div className="bg-card border border-line rounded-[20px] p-7 sm:p-[30px_28px] shadow-card-elevated static lg:sticky lg:top-[88px] transition-colors">
      {isCanada ? (
        /* ── CANADA FORM: 4 quick questions ── */
        <form onSubmit={handleCaSubmit}>
          <div className="font-serif text-[21px] font-bold text-navy dark:text-white mb-1 leading-[1.2]">
            Start here — 4 quick questions
          </div>
          <div className="text-[13px] text-slate mb-4 leading-[1.4]">
            Takes 15 seconds. No signup. You won&apos;t be asked these again.
          </div>

          <label htmlFor="qsProvince" className="block text-[10.5px] font-extrabold tracking-[0.9px] uppercase text-slate mt-3.5 mb-1.5">
            Where did you work?
          </label>
          <select
            id="qsProvince"
            value={qsProvince}
            onChange={(e) => setQsProvince(e.target.value)}
            style={selectArrowStyle}
            className="w-full px-3.5 py-[11px] pr-9 border-[1.5px] border-line rounded-[10px] text-sm text-ink dark:text-white bg-card font-inherit box-border outline-none transition-colors appearance-none cursor-pointer focus:border-green focus:ring-3 focus:ring-green/12"
          >
            <option value="">Where did you work?</option>
            <option value="ON">Ontario</option>
            <option value="BC">British Columbia</option>
            <option value="AB">Alberta</option>
            <option value="OTHER">Another province / U.S. state</option>
          </select>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="qsAge" className="block text-[10.5px] font-extrabold tracking-[0.9px] uppercase text-slate mt-3.5 mb-1.5">
                Your age
              </label>
              <input
                id="qsAge"
                type="number"
                inputMode="numeric"
                placeholder="52"
                value={qsAge}
                onChange={(e) => setQsAge(e.target.value)}
                className="w-full px-3.5 py-[11px] border-[1.5px] border-line rounded-[10px] text-sm text-ink dark:text-white bg-card font-inherit box-border outline-none transition-colors focus:border-green focus:ring-3 focus:ring-green/12"
              />
            </div>
            <div>
              <label htmlFor="qsYears" className="block text-[10.5px] font-extrabold tracking-[0.9px] uppercase text-slate mt-3.5 mb-1.5">
                Years there
              </label>
              <input
                id="qsYears"
                type="number"
                inputMode="numeric"
                placeholder="14"
                value={qsYears}
                onChange={(e) => setQsYears(e.target.value)}
                className="w-full px-3.5 py-[11px] border-[1.5px] border-line rounded-[10px] text-sm text-ink dark:text-white bg-card font-inherit box-border outline-none transition-colors focus:border-green focus:ring-3 focus:ring-green/12"
              />
            </div>
          </div>

          <label htmlFor="qsSalary" className="block text-[10.5px] font-extrabold tracking-[0.9px] uppercase text-slate mt-3.5 mb-1.5">
            Pay / year
          </label>
          <input
            id="qsSalary"
            type="text"
            inputMode="numeric"
            placeholder="$110,000"
            value={qsSalary}
            onChange={(e) => setQsSalary(e.target.value)}
            className="w-full px-3.5 py-[11px] border-[1.5px] border-line rounded-[10px] text-sm text-ink dark:text-white bg-card font-inherit box-border outline-none transition-colors focus:border-green focus:ring-3 focus:ring-green/12"
          />

          <button
            type="submit"
            className="w-full mt-4 text-[15px] font-bold h-12 rounded-xl inline-flex items-center justify-center gap-1.5 bg-green hover:bg-greend text-white border-none cursor-pointer shadow-button hover:shadow-button-hover active:scale-[0.98] transition-all"
          >
            See what kind of offer it is →
          </button>

          {submittedMessage && (
            <p className="text-xs font-bold text-center mt-2.5 text-greend">
              {submittedMessage}
            </p>
          )}

          {/* Freebar */}
          <div className="flex justify-between items-start mt-[18px] pt-4 border-t border-dashed border-line">
            <span className="flex flex-col items-center gap-1.5 text-center flex-1 text-slate">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 text-green stroke-green shrink-0"
                aria-hidden="true"
              >
                <path d="M20 12v9H4v-9"></path>
                <path d="M2 7h20v5H2z"></path>
                <path d="M12 22V7"></path>
                <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
                <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
              </svg>
              <b className="text-[11px] font-bold text-navy dark:text-white whitespace-nowrap">Free</b>
            </span>
            <span className="flex flex-col items-center gap-1.5 text-center flex-1 text-slate">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 text-green stroke-green shrink-0"
                aria-hidden="true"
              >
                <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                <path d="M2 10h20"></path>
                <path d="M4 4l16 16"></path>
              </svg>
              <b className="text-[11px] font-bold text-navy dark:text-white whitespace-nowrap">No card</b>
            </span>
            <span className="flex flex-col items-center gap-1.5 text-center flex-1 text-slate">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 text-green stroke-green shrink-0"
                aria-hidden="true"
              >
                <circle cx="12" cy="8" r="4"></circle>
                <path d="M4 21a8 8 0 0 1 16 0"></path>
                <path d="M3 3l18 18"></path>
              </svg>
              <b className="text-[11px] font-bold text-navy dark:text-white whitespace-nowrap">No signup</b>
            </span>
            <span className="flex flex-col items-center gap-1.5 text-center flex-1 text-slate">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 text-green stroke-green shrink-0"
                aria-hidden="true"
              >
                <path d="M17 2l4 4-4 4"></path>
                <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                <path d="M7 22l-4-4 4-4"></path>
                <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                <path d="M4 4l16 16"></path>
              </svg>
              <b className="text-[11px] font-bold text-navy dark:text-white whitespace-nowrap">No subscription</b>
            </span>
          </div>
        </form>
      ) : (
        /* ── US FORM: 3 quick questions ── */
        <form onSubmit={handleUsSubmit}>
          <div className="font-serif text-[21px] font-bold text-navy dark:text-white mb-1 leading-[1.2]">
            Start here — 3 quick questions
          </div>
          <div className="text-[13px] text-slate mb-4 leading-[1.4]">
            Takes about 60 seconds. No signup.
          </div>

          <label htmlFor="state" className="block text-[10.5px] font-extrabold tracking-[0.9px] uppercase text-slate mt-3.5 mb-1.5">
            Which state did you work in?
          </label>
          <select
            id="state"
            value={usState}
            onChange={(e) => setUsState(e.target.value)}
            style={selectArrowStyle}
            className="w-full px-3.5 py-[11px] pr-9 border-[1.5px] border-line rounded-[10px] text-sm text-ink dark:text-white bg-card font-inherit box-border outline-none transition-colors appearance-none cursor-pointer focus:border-green focus:ring-3 focus:ring-green/12"
          >
            <option value="">Select your state</option>
            <option>California</option>
            <option>New York</option>
            <option>Texas</option>
            <option>Florida</option>
            <option>Illinois</option>
            <option>Other state</option>
          </select>

          <label htmlFor="age" className="block text-[10.5px] font-extrabold tracking-[0.9px] uppercase text-slate mt-3.5 mb-1.5">
            Were you 40 or older?
          </label>
          <select
            id="age"
            value={usAge}
            onChange={(e) => setUsAge(e.target.value)}
            style={selectArrowStyle}
            className="w-full px-3.5 py-[11px] pr-9 border-[1.5px] border-line rounded-[10px] text-sm text-ink dark:text-white bg-card font-inherit box-border outline-none transition-colors appearance-none cursor-pointer focus:border-green focus:ring-3 focus:ring-green/12"
          >
            <option value="">Select</option>
            <option>Yes, 40 or older</option>
            <option>No, under 40</option>
          </select>

          <label htmlFor="group" className="block text-[10.5px] font-extrabold tracking-[0.9px] uppercase text-slate mt-3.5 mb-1.5">
            Was it part of a group layoff?
          </label>
          <select
            id="group"
            value={usGroup}
            onChange={(e) => setUsGroup(e.target.value)}
            style={selectArrowStyle}
            className="w-full px-3.5 py-[11px] pr-9 border-[1.5px] border-line rounded-[10px] text-sm text-ink dark:text-white bg-card font-inherit box-border outline-none transition-colors appearance-none cursor-pointer focus:border-green focus:ring-3 focus:ring-green/12"
          >
            <option value="">Select</option>
            <option>Yes — several people let go</option>
            <option>No — just me</option>
            <option>Not sure</option>
          </select>

          <button
            type="submit"
            className="w-full mt-4 text-[15px] font-bold h-12 rounded-xl inline-flex items-center justify-center gap-1.5 bg-green hover:bg-greend text-white border-none cursor-pointer shadow-button hover:shadow-button-hover active:scale-[0.98] transition-all"
          >
            Check my layoff — free →
          </button>

          {submittedMessage && (
            <p className="text-xs font-bold text-center mt-2.5 text-greend">
              {submittedMessage}
            </p>
          )}

          {/* Freebar */}
          <div className="flex justify-between items-start mt-[18px] pt-4 border-t border-dashed border-line">
            <span className="flex flex-col items-center gap-1.5 text-center flex-1 text-slate">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 text-green stroke-green shrink-0"
                aria-hidden="true"
              >
                <path d="M20 12v9H4v-9"></path>
                <path d="M2 7h20v5H2z"></path>
                <path d="M12 22V7"></path>
                <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
                <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
              </svg>
              <b className="text-[11px] font-bold text-navy dark:text-white whitespace-nowrap">Free</b>
            </span>
            <span className="flex flex-col items-center gap-1.5 text-center flex-1 text-slate">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 text-green stroke-green shrink-0"
                aria-hidden="true"
              >
                <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                <path d="M2 10h20"></path>
                <path d="M4 4l16 16"></path>
              </svg>
              <b className="text-[11px] font-bold text-navy dark:text-white whitespace-nowrap">No card</b>
            </span>
            <span className="flex flex-col items-center gap-1.5 text-center flex-1 text-slate">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 text-green stroke-green shrink-0"
                aria-hidden="true"
              >
                <circle cx="12" cy="8" r="4"></circle>
                <path d="M4 21a8 8 0 0 1 16 0"></path>
                <path d="M3 3l18 18"></path>
              </svg>
              <b className="text-[11px] font-bold text-navy dark:text-white whitespace-nowrap">No signup</b>
            </span>
            <span className="flex flex-col items-center gap-1.5 text-center flex-1 text-slate">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 text-green stroke-green shrink-0"
                aria-hidden="true"
              >
                <path d="M17 2l4 4-4 4"></path>
                <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                <path d="M7 22l-4-4 4-4"></path>
                <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                <path d="M4 4l16 16"></path>
              </svg>
              <b className="text-[11px] font-bold text-navy dark:text-white whitespace-nowrap">No subscription</b>
            </span>
          </div>
        </form>
      )}
    </div>
  );
}
