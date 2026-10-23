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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  const handleUsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
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
    setIsSubmitting(true);

    const q: string[] = ["country=CA"];
    if (qsProvince) q.push("p=" + encodeURIComponent(qsProvince));
    if (qsAge) q.push("age=" + encodeURIComponent(qsAge));
    if (qsYears) q.push("y=" + encodeURIComponent(qsYears));
    const salClean = String(qsSalary).replace(/[^0-9.]/g, "");
    if (salClean) q.push("s=" + encodeURIComponent(salClean));

    router.push("/questions?" + q.join("&"));
  };

  const selectArrowStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1.5 1.75L6 6.25L10.5 1.75' stroke='%23062C55' stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 14px center",
    backgroundSize: "12px 8px",
  };

  return (
    <div
      id="heroForm"
      className="bg-white border border-[#e7e4dd] rounded-[18px] p-4 sm:p-[22px_22px_24px] shadow-[0_30px_70px_-44px_rgba(6,44,85,0.45)] static lg:sticky lg:top-[88px] transition-all duration-300 animate-fade"
    >
      {isCanada ? (
        /* ── CANADA FORM: 4 quick questions ── */
        <form onSubmit={handleCaSubmit} className="animate-fade">
          <div
            className="font-serif text-[20px] font-normal text-[#062c55] leading-[1.2]"
            style={{ fontWeight: 400 }}
          >
            Start here — 4 quick questions
          </div>
          <div className="text-[13px] text-[#5a6b78] mt-[3px] mb-[14px] leading-[1.4]">
            Takes 15 seconds. No signup. You won&apos;t be asked these again.
          </div>

          <label htmlFor="qsProvince" className="block text-[11.5px] font-extrabold tracking-[0.3px] uppercase text-[#5a6b78] mt-3 mb-[5px]">
            Where did you work?
          </label>
          <select
            id="qsProvince"
            value={qsProvince}
            onChange={(e) => setQsProvince(e.target.value)}
            style={selectArrowStyle}
            className="w-full px-3.5 py-[11px] pr-9 border-[1.5px] border-[#cdd3d8] rounded-[11px] text-[15px] text-[#17242f] bg-white font-inherit box-border outline-none transition-all duration-200 appearance-none cursor-pointer hover:border-[#9aa3ab] focus:border-[#0eb28d] focus:shadow-[inset_3px_0_0_#0eb28d]"
          >
            <option value="">Where did you work?</option>
            <option value="ON">Ontario</option>
            <option value="BC">British Columbia</option>
            <option value="AB">Alberta</option>
            <option value="OTHER">Another province / U.S. state</option>
          </select>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="qsAge" className="block text-[11.5px] font-extrabold tracking-[0.3px] uppercase text-[#5a6b78] mt-3 mb-[5px]">
                Your age
              </label>
              <input
                id="qsAge"
                type="number"
                inputMode="numeric"
                placeholder="52"
                value={qsAge}
                onChange={(e) => setQsAge(e.target.value)}
                className="ca-needs-input w-full rounded-[11px] p-[11px_13px] text-[15px] font-inherit box-border outline-none transition-all duration-200 hover:border-[#9aa3ab] placeholder:text-[#9aa3ab] text-[#17242f]"
              />
            </div>
            <div>
              <label htmlFor="qsYears" className="block text-[11.5px] font-extrabold tracking-[0.3px] uppercase text-[#5a6b78] mt-3 mb-[5px]">
                Years there
              </label>
              <input
                id="qsYears"
                type="number"
                inputMode="numeric"
                placeholder="14"
                value={qsYears}
                onChange={(e) => setQsYears(e.target.value)}
                className="ca-needs-input w-full rounded-[11px] p-[11px_13px] text-[15px] font-inherit box-border outline-none transition-all duration-200 hover:border-[#9aa3ab] placeholder:text-[#9aa3ab] text-[#17242f]"
              />
            </div>
          </div>

          <label htmlFor="qsSalary" className="block text-[11.5px] font-extrabold tracking-[0.3px] uppercase text-[#5a6b78] mt-3 mb-[5px]">
            Pay / year
          </label>
          <input
            id="qsSalary"
            type="text"
            inputMode="numeric"
            placeholder="$110,000"
            value={qsSalary}
            onChange={(e) => setQsSalary(e.target.value)}
            className="ca-needs-input w-full rounded-[11px] p-[11px_13px] text-[15px] font-inherit box-border outline-none transition-all duration-200 hover:border-[#9aa3ab] placeholder:text-[#9aa3ab] text-[#17242f]"
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="group w-full mt-4 font-bold text-[16.5px] px-[30px] py-4 rounded-[9px] text-white border-none cursor-pointer bg-gradient-to-b from-[#0eb28d] to-[#0c8f72] active:scale-[0.98] transition-all duration-200 shadow-[0_12px_22px_-12px_rgba(12,143,114,0.55)] hover:shadow-[0_14px_24px_-10px_rgba(12,143,114,0.65)] hover:-translate-y-0.5 flex items-center justify-center gap-1.5 disabled:opacity-85 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Loading questions…</span>
              </span>
            ) : (
              <>
                <span>See what kind of offer it is</span>
                <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">→</span>
              </>
            )}
          </button>

          {submittedMessage && (
            <p className="text-xs font-bold text-center mt-2.5 text-[#0c8f72] animate-fade">
              {submittedMessage}
            </p>
          )}

          {/* Freebar */}
          <div className="grid grid-cols-2 min-[480px]:grid-cols-4 gap-x-2 gap-y-2.5 min-[480px]:gap-1 mt-[14px] pt-3 border-t border-dashed border-[#e7e4dd]">
            <span className="group flex flex-col items-center gap-[5px] text-center cursor-default transition-all duration-200 hover:-translate-y-0.5">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-[20px] sm:w-[22px] h-[20px] sm:h-[22px] text-[#0c8f72] stroke-[#0c8f72] shrink-0 transition-transform duration-200 group-hover:scale-110"
                aria-hidden="true"
              >
                <path d="M20 12v9H4v-9"></path>
                <path d="M2 7h20v5H2z"></path>
                <path d="M12 22V7"></path>
                <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
                <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
              </svg>
              <b className="text-[11px] sm:text-[11.5px] font-bold text-[#062c55] text-center leading-tight transition-colors duration-200 group-hover:text-[#0c8f72]">Free</b>
            </span>
            <span className="group flex flex-col items-center gap-[5px] text-center cursor-default transition-all duration-200 hover:-translate-y-0.5">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-[20px] sm:w-[22px] h-[20px] sm:h-[22px] text-[#0c8f72] stroke-[#0c8f72] shrink-0 transition-transform duration-200 group-hover:scale-110"
                aria-hidden="true"
              >
                <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                <path d="M2 10h20"></path>
                <path d="M4 4l16 16"></path>
              </svg>
              <b className="text-[11px] sm:text-[11.5px] font-bold text-[#062c55] text-center leading-tight transition-colors duration-200 group-hover:text-[#0c8f72]">No card</b>
            </span>
            <span className="group flex flex-col items-center gap-[5px] text-center cursor-default transition-all duration-200 hover:-translate-y-0.5">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-[20px] sm:w-[22px] h-[20px] sm:h-[22px] text-[#0c8f72] stroke-[#0c8f72] shrink-0 transition-transform duration-200 group-hover:scale-110"
                aria-hidden="true"
              >
                <circle cx="12" cy="8" r="4"></circle>
                <path d="M4 21a8 8 0 0 1 16 0"></path>
                <path d="M3 3l18 18"></path>
              </svg>
              <b className="text-[11px] sm:text-[11.5px] font-bold text-[#062c55] text-center leading-tight transition-colors duration-200 group-hover:text-[#0c8f72]">No signup</b>
            </span>
            <span className="group flex flex-col items-center gap-[5px] text-center cursor-default transition-all duration-200 hover:-translate-y-0.5">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-[20px] sm:w-[22px] h-[20px] sm:h-[22px] text-[#0c8f72] stroke-[#0c8f72] shrink-0 transition-transform duration-200 group-hover:scale-110"
                aria-hidden="true"
              >
                <path d="M17 2l4 4-4 4"></path>
                <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                <path d="M7 22l-4-4 4-4"></path>
                <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                <path d="M4 4l16 16"></path>
              </svg>
              <b className="text-[11px] sm:text-[11.5px] font-bold text-[#062c55] text-center leading-tight transition-colors duration-200 group-hover:text-[#0c8f72]">No subscription</b>
            </span>
          </div>
        </form>
      ) : (
        /* ── US FORM: 3 quick questions ── */
        <form onSubmit={handleUsSubmit} className="animate-fade">
          <div
            className="font-serif text-[20px] font-normal text-[#062c55] leading-[1.2]"
            style={{ fontWeight: 400 }}
          >
            Start here — 3 quick questions
          </div>
          <div className="text-[13px] text-[#5a6b78] mt-[3px] mb-[14px] leading-[1.4]">
            Takes about 60 seconds. No signup.
          </div>

          <label htmlFor="state" className="block text-[11.5px] font-extrabold tracking-[0.3px] uppercase text-[#5a6b78] mt-3 mb-[5px]">
            Which state did you work in?
          </label>
          <select
            id="state"
            value={usState}
            onChange={(e) => setUsState(e.target.value)}
            style={selectArrowStyle}
            className="w-full px-3.5 py-[11px] pr-9 border-[1.5px] border-[#cdd3d8] rounded-[11px] text-[15px] text-[#17242f] bg-white font-inherit box-border outline-none transition-all duration-200 appearance-none cursor-pointer hover:border-[#9aa3ab] focus:border-[#0eb28d] focus:shadow-[inset_3px_0_0_#0eb28d]"
          >
            <option value="">Select your state</option>
            <option>California</option>
            <option>New York</option>
            <option>Texas</option>
            <option>Florida</option>
            <option>Illinois</option>
            <option>Other state</option>
          </select>

          <label htmlFor="age" className="block text-[11.5px] font-extrabold tracking-[0.3px] uppercase text-[#5a6b78] mt-3 mb-[5px]">
            Were you 40 or older?
          </label>
          <select
            id="age"
            value={usAge}
            onChange={(e) => setUsAge(e.target.value)}
            style={selectArrowStyle}
            className="w-full px-3.5 py-[11px] pr-9 border-[1.5px] border-[#cdd3d8] rounded-[11px] text-[15px] text-[#17242f] bg-white font-inherit box-border outline-none transition-all duration-200 appearance-none cursor-pointer hover:border-[#9aa3ab] focus:border-[#0eb28d] focus:shadow-[inset_3px_0_0_#0eb28d]"
          >
            <option value="">Select</option>
            <option>Yes, 40 or older</option>
            <option>No, under 40</option>
          </select>

          <label htmlFor="group" className="block text-[11.5px] font-extrabold tracking-[0.3px] uppercase text-[#5a6b78] mt-3 mb-[5px]">
            Was it part of a group layoff?
          </label>
          <select
            id="group"
            value={usGroup}
            onChange={(e) => setUsGroup(e.target.value)}
            style={selectArrowStyle}
            className="w-full px-3.5 py-[11px] pr-9 border-[1.5px] border-[#cdd3d8] rounded-[11px] text-[15px] text-[#17242f] bg-white font-inherit box-border outline-none transition-all duration-200 appearance-none cursor-pointer hover:border-[#9aa3ab] focus:border-[#0eb28d] focus:shadow-[inset_3px_0_0_#0eb28d]"
          >
            <option value="">Select</option>
            <option>Yes — several people let go</option>
            <option>No — just me</option>
            <option>Not sure</option>
          </select>

          <button
            type="submit"
            disabled={isSubmitting}
            className="group w-full mt-4 font-bold text-[16.5px] px-[30px] py-4 rounded-[9px] text-white border-none cursor-pointer bg-gradient-to-b from-[#0eb28d] to-[#0c8f72] active:scale-[0.98] transition-all duration-200 shadow-[0_12px_22px_-12px_rgba(12,143,114,0.55)] hover:shadow-[0_14px_24px_-10px_rgba(12,143,114,0.65)] hover:-translate-y-0.5 flex items-center justify-center gap-1.5 disabled:opacity-85 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Loading questions…</span>
              </span>
            ) : (
              <>
                <span>Check my layoff — free</span>
                <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">→</span>
              </>
            )}
          </button>

          {submittedMessage && (
            <p className="text-xs font-bold text-center mt-2.5 text-[#0c8f72] animate-fade">
              {submittedMessage}
            </p>
          )}

          {/* Freebar */}
          <div className="grid grid-cols-2 min-[480px]:grid-cols-4 gap-x-2 gap-y-2.5 min-[480px]:gap-1 mt-[14px] pt-3 border-t border-dashed border-[#e7e4dd]">
            <span className="group flex flex-col items-center gap-[5px] text-center cursor-default transition-all duration-200 hover:-translate-y-0.5">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-[20px] sm:w-[22px] h-[20px] sm:h-[22px] text-[#0c8f72] stroke-[#0c8f72] shrink-0 transition-transform duration-200 group-hover:scale-110"
                aria-hidden="true"
              >
                <path d="M20 12v9H4v-9"></path>
                <path d="M2 7h20v5H2z"></path>
                <path d="M12 22V7"></path>
                <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
                <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
              </svg>
              <b className="text-[11px] sm:text-[11.5px] font-bold text-[#062c55] text-center leading-tight transition-colors duration-200 group-hover:text-[#0c8f72]">Free</b>
            </span>
            <span className="group flex flex-col items-center gap-[5px] text-center cursor-default transition-all duration-200 hover:-translate-y-0.5">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-[20px] sm:w-[22px] h-[20px] sm:h-[22px] text-[#0c8f72] stroke-[#0c8f72] shrink-0 transition-transform duration-200 group-hover:scale-110"
                aria-hidden="true"
              >
                <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                <path d="M2 10h20"></path>
                <path d="M4 4l16 16"></path>
              </svg>
              <b className="text-[11px] sm:text-[11.5px] font-bold text-[#062c55] text-center leading-tight transition-colors duration-200 group-hover:text-[#0c8f72]">No card</b>
            </span>
            <span className="group flex flex-col items-center gap-[5px] text-center cursor-default transition-all duration-200 hover:-translate-y-0.5">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-[20px] sm:w-[22px] h-[20px] sm:h-[22px] text-[#0c8f72] stroke-[#0c8f72] shrink-0 transition-transform duration-200 group-hover:scale-110"
                aria-hidden="true"
              >
                <circle cx="12" cy="8" r="4"></circle>
                <path d="M4 21a8 8 0 0 1 16 0"></path>
                <path d="M3 3l18 18"></path>
              </svg>
              <b className="text-[11px] sm:text-[11.5px] font-bold text-[#062c55] text-center leading-tight transition-colors duration-200 group-hover:text-[#0c8f72]">No signup</b>
            </span>
            <span className="group flex flex-col items-center gap-[5px] text-center cursor-default transition-all duration-200 hover:-translate-y-0.5">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-[20px] sm:w-[22px] h-[20px] sm:h-[22px] text-[#0c8f72] stroke-[#0c8f72] shrink-0 transition-transform duration-200 group-hover:scale-110"
                aria-hidden="true"
              >
                <path d="M17 2l4 4-4 4"></path>
                <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                <path d="M7 22l-4-4 4-4"></path>
                <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                <path d="M4 4l16 16"></path>
              </svg>
              <b className="text-[11px] sm:text-[11.5px] font-bold text-[#062c55] text-center leading-tight transition-colors duration-200 group-hover:text-[#0c8f72]">No subscription</b>
            </span>
          </div>
        </form>
      )}
    </div>
  );
}
