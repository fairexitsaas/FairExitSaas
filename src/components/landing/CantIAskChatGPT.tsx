"use client";

import React from "react";

export default function CantIAskChatGPT() {
  const handleStartCheck = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById("qsProvince") || document.getElementById("hero");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus();
    }
  };

  return (
    <section className="py-16 lg:pt-[72px] lg:pb-16 bg-card dark:bg-[#071524] border-t border-b border-line transition-colors" id="why" data-ab="chatgpt">
      <div className="max-w-[1200px] mx-auto px-6 w-full box-border">
        <div className="text-center">
          <span className="inline-flex items-center text-xs font-extrabold uppercase tracking-[1.5px] text-greend">
            The honest question
          </span>
          <h2 className="font-serif text-[26px] sm:text-[clamp(24px,3vw,28px)] text-navy dark:text-white font-bold leading-[1.15] mt-1.5">
            &ldquo;Can&apos;t I just ask ChatGPT?&rdquo;
          </h2>
          <p className="text-base leading-[1.6] text-slate max-w-[640px] mt-2 mx-auto">
            You can — and it&apos;s a fine place to start reading. But a general chatbot gives a slightly different answer every time and isn&apos;t built to <b>organize a severance offer</b> the way a purpose-made tool is. We built something for exactly this job.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[22px] my-9 mb-6">
          <div className="rounded-2xl p-[30px_32px] box-border bg-[#FBFBFA] dark:bg-[#0d2238] border border-[#E6E7E9] dark:border-[#183654] transition-colors">
            <h3 className="font-serif text-[19px] text-navy dark:text-white mb-4 font-bold">
              A general chatbot
            </h3>
            <ul className="m-0 p-0 list-none text-[14.5px] text-[#334155] dark:text-[#E1E7ED] leading-[1.6] flex flex-col gap-3.5">
              <li className="relative pl-6 leading-[1.55] block">
                <span className="absolute left-0 top-[1px] text-[#D9776A] text-xs font-bold leading-[1.4]" aria-hidden="true">✕</span>
                Gives a different answer every time you ask
              </li>
              <li className="relative pl-6 leading-[1.55] block">
                <span className="absolute left-0 top-[1px] text-[#D9776A] text-xs font-bold leading-[1.4]" aria-hidden="true">✕</span>
                A generalist — not built for severance
              </li>
              <li className="relative pl-6 leading-[1.55] block">
                <span className="absolute left-0 top-[1px] text-[#D9776A] text-xs font-bold leading-[1.4]" aria-hidden="true">✕</span>
                Guesses from memory, not the rules for your region
              </li>
              <li className="relative pl-6 leading-[1.55] block">
                <span className="absolute left-0 top-[1px] text-[#D9776A] text-xs font-bold leading-[1.4]" aria-hidden="true">✕</span>
                Leaves you with a wall of text and no one to take it forward
              </li>
            </ul>
          </div>

          <div className="rounded-2xl p-[30px_32px] box-border bg-card dark:bg-[#0B1E32] border border-[#9DE0CE] dark:border-[#12D29E] transition-colors shadow-xs">
            <h3 className="font-serif text-[19px] text-navy dark:text-white mb-4 font-bold">
              FairExit&apos;s severance engine
            </h3>
            <ul className="m-0 p-0 list-none text-[14.5px] text-[#334155] dark:text-[#E1E7ED] leading-[1.6] flex flex-col gap-3.5">
              <li className="relative pl-6 leading-[1.55] block">
                <span className="absolute left-0 top-0 text-green text-sm font-bold leading-[1.4]" aria-hidden="true">✓</span>
                Purpose-built for one job: organizing a severance offer
              </li>
              <li className="relative pl-6 leading-[1.55] block">
                <span className="absolute left-0 top-0 text-green text-sm font-bold leading-[1.4]" aria-hidden="true">✓</span>
                Organizes your offer alongside <b className="font-bold text-navy dark:text-white">general, plain-language information</b> for where you worked
              </li>
              <li className="relative pl-6 leading-[1.55] block">
                <span className="absolute left-0 top-0 text-green text-sm font-bold leading-[1.4]" aria-hidden="true">✓</span>
                The <b className="font-bold text-navy dark:text-white">same structured summary every time</b> — consistent and repeatable, not a one-off guess
              </li>
              <li className="relative pl-6 leading-[1.55] block">
                <span className="absolute left-0 top-0 text-green text-sm font-bold leading-[1.4]" aria-hidden="true">✓</span>
                You can choose to connect with an employment lawyer at the end — never a dead end
              </li>
            </ul>
          </div>
        </div>

        {/* how we do it */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-[22px]">
          <div className="bg-card dark:bg-[#0D2238] border border-[#EAECEF] dark:border-[#183654] rounded-[14px] p-[22px_20px] flex flex-col shadow-xs transition-colors">
            <div className="text-xl text-green mb-3 leading-none flex items-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="4" />
              </svg>
            </div>
            <h4 className="text-[14.5px] font-bold text-navy dark:text-[#F0F6FC] mb-2 font-sans leading-[1.35]">
              Purpose-built, not general
            </h4>
            <p className="text-[12.5px] text-slate leading-[1.5] m-0">
              One focus — severance — instead of a model that does everything and specializes in nothing.
            </p>
          </div>

          <div className="bg-card dark:bg-[#0D2238] border border-[#EAECEF] dark:border-[#183654] rounded-[14px] p-[22px_20px] flex flex-col shadow-xs transition-colors">
            <div className="text-xl text-green mb-3 leading-none flex items-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v17" />
                <path d="M6 20h12" />
                <path d="M3 7h18" />
                <path d="M6 7 3 14h6L6 7z" />
                <path d="M18 7l-3 7h6l-3-7z" />
              </svg>
            </div>
            <h4 className="text-[14.5px] font-bold text-navy dark:text-[#F0F6FC] mb-2 font-sans leading-[1.35]">
              Jurisdiction-specific framework
            </h4>
            <p className="text-[12.5px] text-slate leading-[1.5] m-0">
              We map your offer to the actual rules for your region — a custom framework, not a generic answer.
            </p>
          </div>

          <div className="bg-card dark:bg-[#0D2238] border border-[#EAECEF] dark:border-[#183654] rounded-[14px] p-[22px_20px] flex flex-col shadow-xs transition-colors">
            <div className="text-xl text-green mb-3 leading-none flex items-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
            </div>
            <h4 className="text-[14.5px] font-bold text-navy dark:text-[#F0F6FC] mb-2 font-sans leading-[1.35]">
              Structured &amp; consistent
            </h4>
            <p className="text-[12.5px] text-slate leading-[1.5] m-0">
              The same rigorous steps every time, grounded in real rules — so it doesn&apos;t change each time you ask.
            </p>
          </div>

          <div className="bg-card dark:bg-[#0D2238] border border-[#EAECEF] dark:border-[#183654] rounded-[14px] p-[22px_20px] flex flex-col shadow-xs transition-colors">
            <div className="text-xl text-green mb-3 leading-none flex items-center">
              <span className="text-[21px] font-bold leading-none">§</span>
            </div>
            <h4 className="text-[14.5px] font-bold text-navy dark:text-[#F0F6FC] mb-2 font-sans leading-[1.35]">
              A human finishes it
            </h4>
            <p className="text-[12.5px] text-slate leading-[1.5] m-0">
              Software gets you most of the way; a licensed lawyer confirms what software can&apos;t.
            </p>
          </div>
        </div>

        <p className="text-[13px] text-slate text-center mt-6 not-italic leading-[1.5]">
          Built like a system, not a chat. It&apos;s still information, not legal advice — and a licensed employment lawyer confirms your exact number.
        </p>

        <div className="text-center mt-[22px]">
          <a
            className="inline-flex items-center justify-center gap-1.5 bg-green hover:bg-greend text-white px-7 py-3 rounded-[10px] font-bold text-[14.5px] no-underline border-none cursor-pointer shadow-[0_4px_14px_rgba(14,178,141,0.28)] hover:shadow-button-hover active:scale-[0.98] transition-all"
            href="#hero"
            onClick={handleStartCheck}
          >
            Start with a free check →
          </a>
        </div>
      </div>
    </section>
  );
}
