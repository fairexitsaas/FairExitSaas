"use client";

import React, { useState } from "react";
import Image from "next/image";

interface GetAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GetAppModal({ isOpen, onClose }: GetAppModalProps) {
  const [copied, setCopied] = useState(false);
  const appUrl = "https://sevapp-opal.vercel.app/resource-hub-v2/index-v3.html#app";

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#062c55]/45 backdrop-blur-[2px] animate-scrimin"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-[18px] p-6 max-w-[420px] w-full max-h-[92vh] overflow-y-auto shadow-[0_40px_80px_-30px_rgba(6,44,85,0.55)] border border-[#e7e4dd] text-center animate-dlgup"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button ✕ */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-[#f4f6f8] dark:bg-[#133863] text-[#5a6b78] dark:text-white hover:text-[#062c55] hover:bg-[#e6ebf0] dark:hover:bg-[#184878] flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="font-sans font-[800] text-[11px] uppercase tracking-[0.6px] text-[#0c8f72] mb-1.5">
          FairExit on your phone
        </div>

        <h3 className="font-serif font-[600] text-[22px] sm:text-[24px] text-[#062c55] leading-[1.1] mb-1.5">
          Scan to get the app
        </h3>

        <p className="font-sans font-normal text-[13px] leading-[19px] text-[#5a6b78] max-w-[320px] mx-auto mb-4">
          Point your phone&apos;s camera at the code. It opens the download page
          for your phone.
        </p>

        {/* QR Code Container - Must stay crisp white in dark & high-contrast so phone cameras scan it */}
        <div className="inline-block p-2.5 rounded-[12px] border border-[#eef1f4] bg-white shadow-xs mb-2 qr-code-surface">
          <Image
            src="/assets/brand/store/app-qr.svg"
            alt="Scan QR code to download the FairExit app"
            width={160}
            height={160}
            className="w-[150px] sm:w-[165px] h-[150px] sm:h-[165px] object-contain rounded-[8px]"
            priority
          />
        </div>

        <div className="font-sans font-normal text-[11.5px] text-[#8a98a4] mb-2.5">
          or open this link on your phone
        </div>

        {/* Link Row */}
        <div className="flex items-center border border-[#cdd3d8] rounded-[9px] overflow-hidden mb-4 bg-white dark:bg-[#071422] dark:border-[#1E3B5C]">
          <input
            type="text"
            readOnly
            value={appUrl}
            className="flex-1 px-3 py-2 text-[12px] text-[#5a6b78] dark:text-[#9AB1C6] bg-transparent outline-none truncate"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="bg-[#062c55] dark:bg-[#0EB28D] hover:bg-[#041D38] dark:hover:bg-[#0C8F72] text-white dark:text-[#062C55] px-3.5 py-2 text-[12px] font-bold transition-colors cursor-pointer"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        {/* App Store & Google Play Badges */}
        <div className="flex items-center justify-center gap-3 mb-3">
          <a
            href={appUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block hover:opacity-90 transition-opacity"
            aria-label="Download on the App Store"
          >
            <Image
              src="/assets/brand/store/app-store-badge.svg"
              alt="Download on the App Store"
              width={128}
              height={38}
              className="h-[38px] w-auto"
            />
          </a>
          <a
            href={appUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block hover:opacity-90 transition-opacity"
            aria-label="Get it on Google Play"
          >
            <Image
              src="/assets/brand/store/google-play-badge.png"
              alt="Get it on Google Play"
              width={128}
              height={38}
              className="h-[38px] w-auto"
            />
          </a>
        </div>

        <p className="font-sans font-normal text-[11.5px] leading-[16px] text-[#8a98a4] max-w-[320px] mx-auto">
          Snap a photo of your letter, get your results on the spot, and get a
          reminder before your signing deadline.
        </p>
      </div>
    </div>
  );
}
