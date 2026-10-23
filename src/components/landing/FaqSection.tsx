"use client";

import React from "react";
import { CountryCode } from "@/context/CountryContext";

interface FaqSectionProps {
  country: CountryCode;
}

export default function FaqSection({ country }: FaqSectionProps) {
  const isCanada = country === "CA";

  const handleStartRead = (e: React.MouseEvent) => {
    e.preventDefault();
    const el =
      document.getElementById("qsProvince") ||
      document.getElementById("state") ||
      document.getElementById("hero");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus();
    }
  };

  if (isCanada) {
    return (
      <section className="py-16 bg-card dark:bg-[#071524] border-t border-b border-line transition-colors" id="faq">
        <div className="wrap max-w-[1040px] mx-auto px-6 w-full box-border">
          <div className="text-center">
            <span className="inline-flex items-start text-xs font-extrabold uppercase tracking-[1.4px] text-greend">
              Severance questions, answered
            </span>
            <h2 className="font-serif text-2xl sm:text-[32px] text-navy dark:text-white font-semibold leading-[1.1] tracking-[-0.5px] mt-1.5">
              The questions people ask right after a layoff.
            </h2>
            <p className="text-base leading-[1.6] text-slate max-w-[640px] mt-2.5 mx-auto">
              Plain-English answers to what people search most about severance. General information — not legal advice.
            </p>
          </div>

          <div className="max-w-[760px] mx-auto mt-7 flex flex-col gap-2.5">
            <details open className="group bg-card border border-line open:border-green rounded-xl p-4 sm:p-[16px_20px] cursor-pointer transition-colors shadow-xs">
              <summary className="text-base font-bold text-navy dark:text-white list-none flex items-center justify-between [&::-webkit-details-marker]:hidden select-none">
                <span>What is severance pay?</span>
                <span className="text-xl text-greend font-normal leading-none group-open:hidden" aria-hidden="true">+</span>
                <span className="text-xl text-greend font-normal leading-none hidden group-open:inline" aria-hidden="true">−</span>
              </summary>
              <div className="text-[14.5px] text-slate leading-[1.65] mt-3 pt-3 border-t border-line">
                Severance is money — and sometimes benefits — an employer gives you when your job ends through no fault of your own. It can be a lump sum, continued salary for a period, benefits, or a mix. <b>The first amount you&apos;re offered often isn&apos;t all you can get.</b>
              </div>
            </details>

            <details className="group bg-card border border-line open:border-green rounded-xl p-4 sm:p-[16px_20px] cursor-pointer transition-colors shadow-xs">
              <summary className="text-base font-bold text-navy dark:text-white list-none flex items-center justify-between [&::-webkit-details-marker]:hidden select-none">
                <span>Can I negotiate my severance?</span>
                <span className="text-xl text-greend font-normal leading-none group-open:hidden" aria-hidden="true">+</span>
                <span className="text-xl text-greend font-normal leading-none hidden group-open:inline" aria-hidden="true">−</span>
              </summary>
              <div className="text-[14.5px] text-slate leading-[1.65] mt-3 pt-3 border-t border-line">
                Usually, yes. A severance offer is normally a <b>starting point, not a final number</b>. Plenty of people ask for more — calmly, in writing — and improve the deal. You&apos;re allowed to say &quot;let me review this&quot; before you agree to anything.
              </div>
            </details>

            <details className="group bg-card border border-line open:border-green rounded-xl p-4 sm:p-[16px_20px] cursor-pointer transition-colors shadow-xs">
              <summary className="text-base font-bold text-navy dark:text-white list-none flex items-center justify-between [&::-webkit-details-marker]:hidden select-none">
                <span>Should I sign my severance agreement right away?</span>
                <span className="text-xl text-greend font-normal leading-none group-open:hidden" aria-hidden="true">+</span>
                <span className="text-xl text-greend font-normal leading-none hidden group-open:inline" aria-hidden="true">−</span>
              </summary>
              <div className="text-[14.5px] text-slate leading-[1.65] mt-3 pt-3 border-t border-line">
                There&apos;s usually no need to rush. Signing often means <b>giving up your right to ask for more later</b>, and it&apos;s hard to undo. It&apos;s completely normal to ask for time to read it carefully — so take it.
              </div>
            </details>

            <details className="group bg-card border border-line open:border-green rounded-xl p-4 sm:p-[16px_20px] cursor-pointer transition-colors shadow-xs">
              <summary className="text-base font-bold text-navy dark:text-white list-none flex items-center justify-between [&::-webkit-details-marker]:hidden select-none">
                <span>How much severance should I get?</span>
                <span className="text-xl text-greend font-normal leading-none group-open:hidden" aria-hidden="true">+</span>
                <span className="text-xl text-greend font-normal leading-none hidden group-open:inline" aria-hidden="true">−</span>
              </summary>
              <div className="text-[14.5px] text-slate leading-[1.65] mt-3 pt-3 border-t border-line">
                It depends on things like <b>how long you worked there, your age, your role, your pay, and the wording of your contract</b>. There&apos;s no single formula that fits everyone or every place — which is exactly why it&apos;s worth understanding the offer and your options before you accept.
              </div>
            </details>

            <details className="group bg-card border border-line open:border-green rounded-xl p-4 sm:p-[16px_20px] cursor-pointer transition-colors shadow-xs">
              <summary className="text-base font-bold text-navy dark:text-white list-none flex items-center justify-between [&::-webkit-details-marker]:hidden select-none">
                <span>Do I need a lawyer for my severance?</span>
                <span className="text-xl text-greend font-normal leading-none group-open:hidden" aria-hidden="true">+</span>
                <span className="text-xl text-greend font-normal leading-none hidden group-open:inline" aria-hidden="true">−</span>
              </summary>
              <div className="text-[14.5px] text-slate leading-[1.65] mt-3 pt-3 border-t border-line">
                Not always. For smaller, straightforward cases you may be fine handling it yourself. But for bigger ones — long tenure, a senior role, a lot of money, or anything that felt unfair — a lawyer is often the <b>biggest return</b>, and the first call is usually free. It&apos;s worth finding out which camp you&apos;re in before you decide.
              </div>
            </details>

            <details className="group bg-card border border-line open:border-green rounded-xl p-4 sm:p-[16px_20px] cursor-pointer transition-colors shadow-xs">
              <summary className="text-base font-bold text-navy dark:text-white list-none flex items-center justify-between [&::-webkit-details-marker]:hidden select-none">
                <span>Do you give legal advice or tell me what to do?</span>
                <span className="text-xl text-greend font-normal leading-none group-open:hidden" aria-hidden="true">+</span>
                <span className="text-xl text-greend font-normal leading-none hidden group-open:inline" aria-hidden="true">−</span>
              </summary>
              <div className="text-[14.5px] text-slate leading-[1.65] mt-3 pt-3 border-t border-line">
                No. FairExit isn&apos;t a law firm and doesn&apos;t give legal advice. <b>We don&apos;t hold your hand or make the decision for you.</b> We give you the resources to understand your options — sign, negotiate yourself with some help, or talk to a lawyer — and what each could mean, then you choose the path that&apos;s right for you. Only a licensed employment lawyer can confirm what applies to you.
              </div>
            </details>
          </div>

          <p className="text-[13px] text-slate text-center max-w-[680px] mx-auto mt-5 leading-[1.5]">
            These answers are general information to help you get oriented — <b>not legal advice</b>, and every situation is different. For your exact situation, a licensed employment lawyer is the only one who can confirm it.
          </p>

          <div className="text-center mt-5">
            <a
              className="inline-flex items-center justify-center gap-1.5 bg-green hover:bg-greend text-white px-5 py-[9px] rounded-xl font-bold text-sm no-underline border-none cursor-pointer shadow-button hover:shadow-button-hover active:scale-[0.98] transition-all whitespace-nowrap"
              href="#hero"
              onClick={handleStartRead}
            >
              Start my 60-second read — free →
            </a>
            <a href="#faq" className="font-bold text-greend ml-[18px] whitespace-nowrap no-underline hover:underline">
              See all 26 questions&nbsp;→
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 mx-auto" id="faq">
      <div className="wrap max-w-[1040px] mx-auto px-6 w-full box-border">
        <div className="text-center">
          <span className="inline-flex items-center text-xs font-extrabold uppercase tracking-[1.4px] text-greend">
            US severance questions, answered
          </span>
          <h2 className="font-serif text-2xl sm:text-[32px] text-navy dark:text-white font-semibold leading-[1.1] tracking-[-0.5px] mt-1.5">
            The questions people ask after a US layoff.
          </h2>
          <p className="text-base leading-[1.6] text-slate max-w-[640px] mt-2.5 mx-auto">
            Plain-English answers about US layoffs. General information — not legal advice.
          </p>
        </div>

        <div className="max-w-[760px] mx-auto mt-7 flex flex-col gap-2.5">
          <details open className="group bg-card border border-line open:border-green rounded-xl p-4 sm:p-[16px_20px] cursor-pointer transition-colors shadow-xs">
            <summary className="text-base font-bold text-navy dark:text-white list-none flex items-center justify-between [&::-webkit-details-marker]:hidden select-none">
              <span>Does US law require severance pay?</span>
              <span className="text-xl text-greend font-normal leading-none group-open:hidden" aria-hidden="true">+</span>
              <span className="text-xl text-greend font-normal leading-none hidden group-open:inline" aria-hidden="true">−</span>
            </summary>
            <div className="text-[14.5px] text-slate leading-[1.65] mt-3 pt-3 border-t border-line">
              Usually <b>not by law</b> — no federal law requires employers to pay severance. You may still be owed it if your <b>contract, offer letter, or company policy</b> promises it, or if it&apos;s offered in exchange for signing a release. That&apos;s why we check what you were promised, and whether the layoff followed the rules that <b>do</b> apply.
            </div>
          </details>

          <details className="group bg-card border border-line open:border-green rounded-xl p-4 sm:p-[16px_20px] cursor-pointer transition-colors shadow-xs">
            <summary className="text-base font-bold text-navy dark:text-white list-none flex items-center justify-between [&::-webkit-details-marker]:hidden select-none">
              <span>What is the OWBPA &quot;45-day rule&quot;?</span>
              <span className="text-xl text-greend font-normal leading-none group-open:hidden" aria-hidden="true">+</span>
              <span className="text-xl text-greend font-normal leading-none hidden group-open:inline" aria-hidden="true">−</span>
            </summary>
            <div className="text-[14.5px] text-slate leading-[1.65] mt-3 pt-3 border-t border-line">
              If you&apos;re <b>40 or older</b> and asked to sign a release of age-discrimination claims as part of an <b>age-40+ group termination program</b>, the law sets a <b>45-day</b> minimum to consider it (21 days for an individual), plus a <b>7-day</b> window to revoke after signing — you can still choose to sign earlier. The employer also generally has to disclose the job titles and ages of who was and wasn&apos;t selected. Whether these apply to you, and what they mean, is a question for an attorney.
            </div>
          </details>

          <details className="group bg-card border border-line open:border-green rounded-xl p-4 sm:p-[16px_20px] cursor-pointer transition-colors shadow-xs">
            <summary className="text-base font-bold text-navy dark:text-white list-none flex items-center justify-between [&::-webkit-details-marker]:hidden select-none">
              <span>What is the WARN Act?</span>
              <span className="text-xl text-greend font-normal leading-none group-open:hidden" aria-hidden="true">+</span>
              <span className="text-xl text-greend font-normal leading-none hidden group-open:inline" aria-hidden="true">−</span>
            </summary>
            <div className="text-[14.5px] text-slate leading-[1.65] mt-3 pt-3 border-t border-line">
              The federal <b>WARN Act</b> generally requires a <b>100+-employee</b> employer to give <b>60 days&apos; written notice</b> of a covered mass layoff or closing at a single site. (Federal WARN doesn&apos;t recognize &quot;pay in lieu of notice&quot; — paying instead can still be a violation that only offsets damages.) Some states have their own stricter &quot;mini-WARN&quot; laws. It&apos;s about <b>notice</b>, not a severance amount.
            </div>
          </details>

          <details className="group bg-card border border-line open:border-green rounded-xl p-4 sm:p-[16px_20px] cursor-pointer transition-colors shadow-xs">
            <summary className="text-base font-bold text-navy dark:text-white list-none flex items-center justify-between [&::-webkit-details-marker]:hidden select-none">
              <span>Can I still negotiate a US severance offer?</span>
              <span className="text-xl text-greend font-normal leading-none group-open:hidden" aria-hidden="true">+</span>
              <span className="text-xl text-greend font-normal leading-none hidden group-open:inline" aria-hidden="true">−</span>
            </summary>
            <div className="text-[14.5px] text-slate leading-[1.65] mt-3 pt-3 border-t border-line">
              Often, yes. If they&apos;ve offered you a severance package in exchange for a release, that number is usually a <b>starting point</b>. Understanding the offer and the rules that may apply can help you decide what to ask — and an attorney can tell you where you actually stand. Don&apos;t sign under pressure.
            </div>
          </details>

          <details className="group bg-card border border-line open:border-green rounded-xl p-4 sm:p-[16px_20px] cursor-pointer transition-colors shadow-xs">
            <summary className="text-base font-bold text-navy dark:text-white list-none flex items-center justify-between [&::-webkit-details-marker]:hidden select-none">
              <span>Do I need a lawyer?</span>
              <span className="text-xl text-greend font-normal leading-none group-open:hidden" aria-hidden="true">+</span>
              <span className="text-xl text-greend font-normal leading-none hidden group-open:inline" aria-hidden="true">−</span>
            </summary>
            <div className="text-[14.5px] text-slate leading-[1.65] mt-3 pt-3 border-t border-line">
              Not always — but if the rules above weren&apos;t followed, or you were let go in a way that felt discriminatory or retaliatory, an <b>employment attorney</b> is often the biggest help, and the first call is usually free. We can connect you.
            </div>
          </details>

          <details className="group bg-card border border-line open:border-green rounded-xl p-4 sm:p-[16px_20px] cursor-pointer transition-colors shadow-xs">
            <summary className="text-base font-bold text-navy dark:text-white list-none flex items-center justify-between [&::-webkit-details-marker]:hidden select-none">
              <span>Do you give legal advice?</span>
              <span className="text-xl text-greend font-normal leading-none group-open:hidden" aria-hidden="true">+</span>
              <span className="text-xl text-greend font-normal leading-none hidden group-open:inline" aria-hidden="true">−</span>
            </summary>
            <div className="text-[14.5px] text-slate leading-[1.65] mt-3 pt-3 border-t border-line">
              No. FairExit isn&apos;t a law firm and doesn&apos;t give legal advice. We give you a plain-English read of the federal rules that may apply, and help you organize your questions — then you decide. Only a licensed attorney can advise you on your specific situation.
            </div>
          </details>
        </div>

        <p className="text-[13px] text-slate text-center max-w-[680px] mx-auto mt-5 leading-[1.5]">
          General information to help you get oriented — <b>not legal advice</b>, and not a substitute for an attorney. All rules referenced are US federal law (ADEA/OWBPA, WARN Act); your state may add more.
        </p>

        <div className="text-center mt-[22px]">
          <a href="#faq" className="font-bold text-greend whitespace-nowrap no-underline hover:underline">
            See all 25 questions&nbsp;→
          </a>
        </div>
      </div>
    </section>
  );
}
