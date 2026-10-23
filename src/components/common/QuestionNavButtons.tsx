import React from "react";

export interface QuestionBackButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
  type?: "button" | "submit" | "reset";
  id?: string;
}

export function QuestionBackButton({
  onClick,
  disabled = false,
  className = "",
  children = "‹ Back",
  type = "button",
  id,
}: QuestionBackButtonProps) {
  return (
    <button
      id={id}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 py-[9px] px-[12px] sm:py-[10px] sm:pl-[12px] sm:pr-[14px] rounded-[9px] border border-[#e7e4dd] bg-white text-[13px] font-bold text-[#5a6b78] hover:text-[#062c55] hover:border-[#c3ccd3] transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed leading-normal select-none ${className}`}
    >
      {children}
    </button>
  );
}

export interface QuestionNextButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
  type?: "button" | "submit" | "reset";
  id?: string;
}

export function QuestionNextButton({
  onClick,
  disabled = false,
  className = "",
  children,
  type = "button",
  id,
}: QuestionNextButtonProps) {
  return (
    <button
      id={id}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 py-[11px] px-[18px] sm:py-[13px] sm:pl-[22px] sm:pr-[20px] rounded-[9px] border-none text-white text-[14px] font-extrabold bg-gradient-to-br from-[#0eb28d] to-[#0c8f72] shadow-[0_10px_24px_-12px_rgba(12,143,114,0.7)] hover:-translate-y-px hover:shadow-[0_14px_28px_-12px_rgba(12,143,114,0.8)] active:translate-y-0 transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed leading-normal select-none ${className}`}
    >
      {children || (
        <>
          Next
          <svg
            className="w-4 h-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </>
      )}
    </button>
  );
}
