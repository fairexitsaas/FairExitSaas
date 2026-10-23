"use client";

import React from "react";

export default function HowItWorks() {
  return (
    <section className="py-16 bg-card dark:bg-[#071524] border-t border-b border-line transition-colors" id="how">
      <div className="wrap max-w-[1040px] mx-auto px-6 w-full box-border">
        <span className="inline-flex items-center text-xs font-extrabold uppercase tracking-[1.4px] text-greend">
          How it works
        </span>
        <h2 className="font-serif text-2xl sm:text-[32px] text-navy dark:text-white font-semibold leading-[1.1] tracking-[-0.5px] mt-1.5">
          A clear read, then the right lawyer.
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
          <div className="bg-card border border-line rounded-2xl p-[26px] relative shadow-xs">
            <div className="w-[34px] h-[34px] rounded-full bg-navy dark:bg-white text-white font-extrabold flex items-center justify-center mb-3.5 text-base shadow-xs">
              1
            </div>
            <h3 className="font-serif text-xl text-navy dark:text-white mb-2 font-semibold">
              Answer 6 quick questions
            </h3>
            <p className="text-sm text-slate leading-[1.6] m-0">
              Age, tenure, pay, and whether your offer mentions capping you at the &quot;minimum.&quot; 60 seconds, no signup.
            </p>
          </div>
          <div className="bg-card border border-line rounded-2xl p-[26px] relative shadow-xs">
            <div className="w-[34px] h-[34px] rounded-full bg-navy dark:bg-white text-white font-extrabold flex items-center justify-center mb-3.5 text-base shadow-xs">
              2
            </div>
            <h3 className="font-serif text-xl text-navy dark:text-white mb-2 font-semibold">
              Get a straight read
            </h3>
            <p className="text-sm text-slate leading-[1.6] m-0">
              A plain-language read of what kind of offer this is — &quot;worth a closer look,&quot; &quot;borderline,&quot; or &quot;may already be reasonable.&quot; Not a verdict on your case; a starting point.
            </p>
          </div>
          <div className="bg-card border border-line rounded-2xl p-[26px] relative shadow-xs">
            <div className="w-[34px] h-[34px] rounded-full bg-navy dark:bg-white text-white font-extrabold flex items-center justify-center mb-3.5 text-base shadow-xs">
              3
            </div>
            <h3 className="font-serif text-xl text-navy dark:text-white mb-2 font-semibold">
              Connect with a lawyer
            </h3>
            <p className="text-sm text-slate leading-[1.6] m-0">
              If it looks worth a closer look, we pass a clean summary to an employment lawyer in your province. They decide whether to offer a consultation.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
