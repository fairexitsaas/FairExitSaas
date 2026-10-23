"use client";

import React from "react";

export default function OurStory() {
  return (
    <section className="py-16 bg-card dark:bg-[#071524] border-t border-b border-line transition-colors" id="about">
      <div className="wrap max-w-[1040px] mx-auto px-6 w-full box-border">
        <div className="text-center">
          <span className="inline-flex items-center text-xs font-extrabold uppercase tracking-[1.4px] text-greend">
            Our story
          </span>
          <h2 className="font-serif text-2xl sm:text-[32px] text-navy dark:text-white font-semibold leading-[1.1] tracking-[-0.5px] mt-1.5">
            We built this because we&apos;ve <em className="italic text-greend font-semibold">been there.</em>
          </h2>
        </div>
        <p className="font-serif text-[22px] text-navy dark:text-[#eef4fa] leading-[1.4] tracking-[-0.5px] max-w-[720px] mx-auto mt-[18px] text-center">
          A short meeting, a folder of papers slid across the table, and a pen. &quot;Sign here.&quot; What nobody tells you is that in the US there&apos;s no law setting your number — so it&apos;s easy to sign away rights you didn&apos;t know you had, on a deadline that isn&apos;t even real.
        </p>
        <p className="text-base leading-[1.6] text-slate max-w-[640px] mt-[18px] mx-auto text-center">
          FairExit was built by someone who&apos;s been laid off more than once. We can&apos;t give you legal advice — but we can help you understand the federal rules that may apply, in plain English, and connect you to an attorney if you want. We give you the resources; you make the call.
        </p>
        <div className="grid gap-4 mt-7 max-w-[460px] mx-auto">
          <div className="bg-transparent border border-line rounded-[18px] p-6 text-center transition-colors shadow-xs">
            <div className="w-[52px] h-[52px] rounded-full bg-navy text-white text-[22px] font-extrabold flex items-center justify-center mx-auto mb-3 shadow-xs">
              S
            </div>
            <h3 className="font-serif text-[19px] text-navy dark:text-white m-0 font-semibold tracking-[-0.5px]">
              Sundeep
            </h3>
            <div className="text-xs font-bold uppercase tracking-[0.8px] text-greend my-1 mb-2.5">
              Founder
            </div>
            <p className="text-[13.5px] text-slate leading-[1.6] m-0">
              Been laid off more than once, and handed the papers every time. Built FairExit so the next person walks in knowing their options — not just where to sign.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
