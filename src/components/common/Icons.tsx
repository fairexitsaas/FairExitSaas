import React from "react";

export function CanadaFlagIcon({ className = "w-5 h-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 640 320"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Canada Flag"
      role="img"
    >
      <rect width="160" height="320" fill="#D80027" />
      <rect x="160" width="320" height="320" fill="#FFFFFF" />
      <rect x="480" width="160" height="320" fill="#D80027" />
      <path
        d="M320 60l14 42 36-12-16 36 34 16-28 24 16 32-38-10-8 32-10-32-38 10 16-32-28-24 34-16-16-36 36 12z"
        fill="#D80027"
      />
      <path d="M316 230h8v42h-8z" fill="#D80027" />
    </svg>
  );
}

export function USFlagIcon({ className = "w-5 h-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 640 336"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="United States Flag"
      role="img"
    >
      <rect width="640" height="336" fill="#B22234" />
      <path
        d="M0 26h640v26H0zm0 52h640v26H0zm0 52h640v26H0zm0 52h640v26H0zm0 52h640v26H0zm0 52h640v26H0z"
        fill="#FFFFFF"
      />
      <rect width="256" height="182" fill="#3C3B6E" />
      <g fill="#FFFFFF">
        <circle cx="28" cy="20" r="5" />
        <circle cx="68" cy="20" r="5" />
        <circle cx="108" cy="20" r="5" />
        <circle cx="148" cy="20" r="5" />
        <circle cx="188" cy="20" r="5" />
        <circle cx="228" cy="20" r="5" />
        <circle cx="48" cy="40" r="5" />
        <circle cx="88" cy="40" r="5" />
        <circle cx="128" cy="40" r="5" />
        <circle cx="168" cy="40" r="5" />
        <circle cx="208" cy="40" r="5" />
        <circle cx="28" cy="60" r="5" />
        <circle cx="68" cy="60" r="5" />
        <circle cx="108" cy="60" r="5" />
        <circle cx="148" cy="60" r="5" />
        <circle cx="188" cy="60" r="5" />
        <circle cx="228" cy="60" r="5" />
        <circle cx="48" cy="80" r="5" />
        <circle cx="88" cy="80" r="5" />
        <circle cx="128" cy="80" r="5" />
        <circle cx="168" cy="80" r="5" />
        <circle cx="208" cy="80" r="5" />
        <circle cx="28" cy="100" r="5" />
        <circle cx="68" cy="100" r="5" />
        <circle cx="108" cy="100" r="5" />
        <circle cx="148" cy="100" r="5" />
        <circle cx="188" cy="100" r="5" />
        <circle cx="228" cy="100" r="5" />
        <circle cx="48" cy="120" r="5" />
        <circle cx="88" cy="120" r="5" />
        <circle cx="128" cy="120" r="5" />
        <circle cx="168" cy="120" r="5" />
        <circle cx="208" cy="120" r="5" />
        <circle cx="28" cy="140" r="5" />
        <circle cx="68" cy="140" r="5" />
        <circle cx="108" cy="140" r="5" />
        <circle cx="148" cy="140" r="5" />
        <circle cx="188" cy="140" r="5" />
        <circle cx="228" cy="140" r="5" />
        <circle cx="48" cy="160" r="5" />
        <circle cx="88" cy="160" r="5" />
        <circle cx="128" cy="160" r="5" />
        <circle cx="168" cy="160" r="5" />
        <circle cx="208" cy="160" r="5" />
      </g>
    </svg>
  );
}

export function AccessibilitySymbol({
  className = "w-5 h-5",
  fill = "currentColor",
}: {
  className?: string;
  fill?: string;
}) {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 26 26"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M13 6.06576C14.1967 6.06576 15.1667 5.09571 15.1667 3.89909C15.1667 2.70247 14.1967 1.73242 13 1.73242C11.8034 1.73242 10.8334 2.70247 10.8334 3.89909C10.8334 5.09571 11.8034 6.06576 13 6.06576Z"
        fill={fill}
      />
      <path
        d="M21.6667 8.88281C19.175 9.64115 16.25 9.96615 13 9.96615C9.75002 9.96615 6.82502 9.64115 4.33335 8.88281L3.68335 10.8328C5.74168 11.4828 8.01668 11.8078 10.075 11.9161V15.2745L8.12502 22.3161L10.1833 22.9661L11.9167 17.3328H14.0834L15.8167 22.9661L17.875 22.3161L15.925 15.2745V11.9161C17.9833 11.8078 20.2584 11.4828 22.3167 10.8328L21.6667 8.88281Z"
        fill={fill}
      />
    </svg>
  );
}

export function FairExitLogoGraphic({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/fairexitlogo.png"
        alt="FairExit"
        className={`object-contain dark:hidden ${className}`}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/fairexitlogo-dark.png"
        alt="FairExit"
        className={`object-contain hidden dark:block ${className}`}
      />
    </>
  );
}

export function GiftIcon({ className = "w-5 h-5 text-[#0C8F72]" }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      stroke="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M18.3333 11V19.25H3.66663V11" strokeWidth="1.83333" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1.83337 6.41602H20.1667V10.9993H1.83337V6.41602Z" strokeWidth="1.83333" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 20.166V6.41602" strokeWidth="1.83333" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 6.41732H6.87504C6.26725 6.41732 5.68436 6.17588 5.25459 5.7461C4.82482 5.31633 4.58337 4.73344 4.58337 4.12565C4.58337 3.51786 4.82482 2.93497 5.25459 2.5052C5.68436 2.07543 6.26725 1.83398 6.87504 1.83398C10.0834 1.83398 11 6.41732 11 6.41732Z" strokeWidth="1.83333" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 6.41732H15.125C15.7328 6.41732 16.3157 6.17588 16.7455 5.7461C17.1752 5.31633 17.4167 4.73344 17.4167 4.12565C17.4167 3.51786 17.1752 2.93497 16.7455 2.5052C16.3157 2.07543 15.7328 1.83398 15.125 1.83398C11.9167 1.83398 11 6.41732 11 6.41732Z" strokeWidth="1.83333" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CardSlashIcon({ className = "w-5 h-5 text-[#0C8F72]" }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      stroke="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M18.3334 4.58398H3.66671C2.65419 4.58398 1.83337 5.4048 1.83337 6.41732V15.584C1.83337 16.5965 2.65419 17.4173 3.66671 17.4173H18.3334C19.3459 17.4173 20.1667 16.5965 20.1667 15.584V6.41732C20.1667 5.4048 19.3459 4.58398 18.3334 4.58398Z" strokeWidth="1.83333" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1.83337 9.16602H20.1667" strokeWidth="1.83333" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.66663 3.66602L18.3333 18.3327" strokeWidth="1.83333" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function UserSlashIcon({ className = "w-5 h-5 text-[#0C8F72]" }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      stroke="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M11 10.9993C13.0251 10.9993 14.6667 9.35773 14.6667 7.33268C14.6667 5.30764 13.0251 3.66602 11 3.66602C8.975 3.66602 7.33337 5.30764 7.33337 7.33268C7.33337 9.35773 8.975 10.9993 11 10.9993Z" strokeWidth="1.83333" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.66663 19.2493C3.66663 17.3044 4.43924 15.4392 5.81451 14.0639C7.18978 12.6886 9.05504 11.916 11 11.916C12.9449 11.916 14.8101 12.6886 16.1854 14.0639C17.5607 15.4392 18.3333 17.3044 18.3333 19.2493" strokeWidth="1.83333" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.75 2.75L19.25 19.25" strokeWidth="1.83333" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function RepeatIcon({ className = "w-5 h-5 text-[#0C8F72]" }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      stroke="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M15.5834 1.83398L19.25 5.50065L15.5834 9.16732" strokeWidth="1.83333" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.75 10.084V8.25065C2.75 7.27819 3.13631 6.34556 3.82394 5.65793C4.51158 4.97029 5.44421 4.58398 6.41667 4.58398H19.25" strokeWidth="1.83333" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.41667 20.1673L2.75 16.5007L6.41667 12.834" strokeWidth="1.83333" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19.25 11.916V13.7493C19.25 14.7218 18.8637 15.6544 18.1761 16.3421C17.4884 17.0297 16.5558 17.416 15.5833 17.416H2.75" strokeWidth="1.83333" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.66663 3.66602L18.3333 18.3327" strokeWidth="1.83333" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LegalScaleIcon({ className = "w-4 h-4 text-[#00A36C]" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="M7 21h10" />
      <path d="M12 3v18" />
      <path d="M3 7h18" />
    </svg>
  );
}

export function PhoneDeviceIcon({ className = "w-5 h-5 text-[#0F2236]" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
      <path d="M12 18h.01" />
    </svg>
  );
}
