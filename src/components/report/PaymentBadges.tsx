import React from "react";

export function ApplePayBadge() {
  return (
    <div
      className="h-[26px] px-2.5 bg-white rounded-[6px] flex items-center justify-center border border-[#D0D7DE] shrink-0 select-none"
      title="Apple Pay"
    >
      <svg className="h-[13px] w-auto" viewBox="0 0 50 21" fill="#17242F">
        {/* Apple icon */}
        <path d="M9.16 8.52c-.67.82-1.74 1.37-2.67 1.31-.13-.93.3-1.95.89-2.61.64-.75 1.77-1.3 2.62-1.34.11.97-.24 1.94-.84 2.64zm.84 1.34c-1.47-.09-2.73.86-3.44.86-.71 0-1.76-.8-2.92-.78-1.51.02-2.9 .89-3.68 2.27-1.57 2.76-.41 6.83 1.13 9.04.75 1.09 1.64 2.3 2.82 2.26 1.14-.05 1.58-.74 2.96-.74 1.37 0 1.77.74 2.96.71 1.22-.02 1.99-1.1 2.74-2.19.86-1.27 1.22-2.5 1.24-2.56-.03-.01-2.4-.93-2.43-3.66-.02-2.29 1.84-3.39 1.93-3.45-1.06-1.57-2.7-1.75-3.31-1.76z" />
        {/* Pay text */}
        <path d="M21.24 4.5h3.69c2.61 0 4.19 1.55 4.19 3.89 0 2.37-1.61 3.91-4.24 3.91h-1.89v5.2H21.24V4.5zm3.56 6.07c1.55 0 2.45-.88 2.45-2.18s-.9-2.16-2.45-2.16h-1.81v4.34h1.81zm9.84 7.06c-1.87 0-3.32-1.18-3.4-2.75h1.75c.14.82.88 1.34 1.73 1.34 1.01 0 1.63-.52 1.63-1.27 0-.74-.52-1.12-1.69-1.43l-1.07-.29c-1.81-.48-2.61-1.39-2.61-2.75 0-1.83 1.53-3.08 3.55-3.08 1.91 0 3.26 1.18 3.32 2.66h-1.75c-.1-.73-.78-1.22-1.63-1.22-.97 0-1.55.51-1.55 1.2 0 .67.54 1.05 1.61 1.34l.95.26c1.97.52 2.82 1.38 2.82 2.85 0 1.84-1.48 3.14-3.71 3.14zm10.74-.13v-1.42c-.63.99-1.69 1.55-2.98 1.55-2.2 0-3.62-1.61-3.62-3.86 0-2.29 1.45-3.87 3.62-3.87 1.25 0 2.29.53 2.92 1.5v-1.39h1.75v7.49h-1.69zm-2.88-1.42c1.39 0 2.36-1.07 2.36-2.44 0-1.39-.97-2.44-2.36-2.44-1.36 0-2.33 1.05-2.33 2.44 0 1.37.97 2.44 2.33 2.44z" />
      </svg>
    </div>
  );
}

export function GooglePayBadge() {
  return (
    <div
      className="h-[26px] px-2.5 bg-white rounded-[6px] flex items-center gap-1 justify-center border border-[#D0D7DE] shrink-0 select-none"
      title="Google Pay"
    >
      <svg className="h-[12px] w-[12px]" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
        />
        <path
          fill="#FBBC05"
          d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
        />
      </svg>
      <span className="font-sans font-[700] text-[11.5px] leading-none text-[#5F6368]">
        Pay
      </span>
    </div>
  );
}

export function VisaBadge() {
  return (
    <div
      className="h-[26px] px-2.5 bg-white rounded-[6px] flex items-center justify-center border border-[#D0D7DE] shrink-0 select-none"
      title="Visa"
    >
      <span className="font-sans font-[700] text-[12px] leading-none text-[#2D3748]">
        Visa
      </span>
    </div>
  );
}

export function MastercardBadge() {
  return (
    <div
      className="h-[26px] px-2.5 bg-white rounded-[6px] flex items-center justify-center border border-[#D0D7DE] shrink-0 select-none"
      title="Mastercard"
    >
      <span className="font-sans font-[700] text-[11.5px] leading-none text-[#2D3748]">
        Mastercard
      </span>
    </div>
  );
}

export function AmexBadge() {
  return (
    <div
      className="h-[26px] px-2.5 bg-white rounded-[6px] flex items-center justify-center border border-[#D0D7DE] shrink-0 select-none"
      title="American Express"
    >
      <span className="font-sans font-[700] text-[11px] leading-none text-[#2D3748]">
        American Express
      </span>
    </div>
  );
}

export function InteracBadge() {
  return (
    <div
      className="h-[26px] px-2.5 bg-white rounded-[6px] flex items-center justify-center border border-[#D0D7DE] shrink-0 select-none"
      title="Interac"
    >
      <span className="font-sans font-[700] text-[11.5px] leading-none text-[#2D3748]">
        Interac
      </span>
    </div>
  );
}
