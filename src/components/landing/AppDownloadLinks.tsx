"use client";

import React from "react";
import { triggerGetApp } from "@/context/GetAppContext";

export default function AppDownloadLinks() {
  const handleAppStoreClick = () => {
    triggerGetApp();
  };

  const handleGooglePlayClick = () => {
    triggerGetApp();
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Apple App Store */}
      <button
        type="button"
        onClick={handleAppStoreClick}
        aria-label="Download on the App Store"
        className="inline-flex items-center gap-2.5 px-3.5 py-1.5 bg-black hover:bg-zinc-800 text-white rounded-lg transition-transform active:scale-95 shadow-sm border border-black focus:outline-none focus:ring-2 focus:ring-[#00A36C] focus:ring-offset-1"
      >
        <svg
          viewBox="0 0 170 170"
          className="w-5 h-5 fill-current"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.81-11.96-14.32-6.3-9.59-11.07-20.2-14.33-31.84-3.25-11.64-4.89-22.61-4.89-32.92 0-14.71 3.8-26.79 11.41-36.24 7.6-9.45 17.15-14.3 28.64-14.54 4.8 0 10.15 1.25 16.06 3.75 5.91 2.5 9.87 3.86 11.88 4.09 1.45-.23 5.48-1.59 12.09-4.09 6.61-2.5 12.21-3.64 16.8-3.41 12.56.63 22.84 5.3 30.82 14.02-11.02 6.7-16.39 16.14-16.11 28.32.28 9.77 4.1 17.89 11.47 24.34 7.37 6.46 16.17 10.02 26.41 10.69-2.22 6.74-4.89 13.3-8.01 19.68zM119.22 33.64c0-7.23 2.65-14.07 7.96-20.52 5.31-6.45 11.75-10.74 19.33-12.87.23 1.84.34 3.5.34 4.97 0 7.15-2.67 14.06-8.02 20.73-5.35 6.67-11.87 10.72-19.57 12.16-.04-1.51-.04-3.01-.04-4.47z" />
        </svg>
        <div className="text-left leading-none">
          <span className="block text-[8px] tracking-wide text-zinc-300 uppercase">
            Download on the
          </span>
          <span className="block text-xs font-semibold text-white tracking-tight">
            App Store
          </span>
        </div>
      </button>

      {/* Google Play */}
      <button
        type="button"
        onClick={handleGooglePlayClick}
        aria-label="Get it on Google Play"
        className="inline-flex items-center gap-2.5 px-3.5 py-1.5 bg-black hover:bg-zinc-800 text-white rounded-lg transition-transform active:scale-95 shadow-sm border border-black focus:outline-none focus:ring-2 focus:ring-[#00A36C] focus:ring-offset-1"
      >
        <svg
          viewBox="0 0 24 24"
          className="w-5 h-5"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M3.6 1.8c-.3.3-.4.8-.4 1.4v17.6c0 .6.1 1.1.4 1.4l.1.1 9.9-9.9v-.2L3.7 2.3l-.1-.5z"
            fill="#00E676"
          />
          <path
            d="M16.9 15.5l-3.3-3.3v-.2l3.3-3.3.1.1 3.9 2.2c1.1.6 1.1 1.6 0 2.3l-3.9 2.2-.1-.3z"
            fill="#FFD600"
          />
          <path
            d="M13.6 12.1L3.6 22.1c.4.4 1 .4 1.8 0l11.5-6.6-3.3-3.4z"
            fill="#FF3D00"
          />
          <path
            d="M13.6 11.9l3.3-3.4L5.4 1.9c-.8-.5-1.4-.4-1.8 0l10 10z"
            fill="#00B0FF"
          />
        </svg>
        <div className="text-left leading-none">
          <span className="block text-[8px] tracking-wide text-zinc-300 uppercase">
            GET IT ON
          </span>
          <span className="block text-xs font-semibold text-white tracking-tight">
            Google Play
          </span>
        </div>
      </button>
    </div>
  );
}
