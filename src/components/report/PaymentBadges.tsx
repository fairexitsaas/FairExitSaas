import React from "react";
import Image from "next/image";

export function ApplePayBadge() {
  return (
    <div
      className="h-[26px] flex items-center justify-center shrink-0 select-none"
      title="Apple Pay"
    >
      <Image
        src="/apple-pay.svg"
        alt="Apple Pay"
        width={41}
        height={26}
        className="h-[26px] w-auto rounded-[6px]"
      />
    </div>
  );
}

export function GooglePayBadge() {
  return (
    <div
      className="h-[26px] flex items-center justify-center shrink-0 select-none"
      title="Google Pay"
    >
      <Image
        src="/google-pay.png"
        alt="Google Pay"
        width={49}
        height={26}
        className="h-[26px] w-auto rounded-[6px]"
      />
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
