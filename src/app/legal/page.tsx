"use client";

import React, { useContext, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import FloatingActions from "@/components/landing/FloatingActions";
import { CountryContext, CountryCode } from "@/context/CountryContext";

function LegalContent() {
  const context = useContext(CountryContext);
  const searchParams = useSearchParams();
  const urlCountry = searchParams?.get("country")?.toUpperCase();

  const currentCountry: CountryCode =
    urlCountry === "US" || urlCountry === "CA"
      ? (urlCountry as CountryCode)
      : context?.Country || "CA";

  const isCanada = currentCountry === "CA";

  const handleCountrySwitch = (nextCountry: CountryCode) => {
    if (context) context.setCountry(nextCountry);
  };

  return (
    <div className="min-h-screen bg-[#F6F4EF] dark:bg-[#062C55] text-[#12202E] dark:text-[#EAF2F8] transition-colors font-sans antialiased">
      <main className="max-w-[760px] w-full mx-auto px-4 sm:px-6 pt-8 pb-16">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <Link
            href="/"
            className="text-[13px] font-bold text-[#0C8F72] dark:text-[#0EB28D] underline hover:opacity-80 transition-opacity"
          >
            ← FairExit {isCanada ? "Canada" : "US"}
          </Link>
          <span className="text-[12px] text-[#5A6B7D] dark:text-[#8EA5B8]">
            Last updated: {isCanada ? "2026-09-03" : "2026-09-01"}
          </span>
        </div>

        {/* Title & Subtitle */}
        <h1 className="font-serif font-semibold text-[32px] leading-[37px] text-[#062C55] dark:text-white mt-3.5 mb-1 tracking-tight">
          {isCanada ? "Terms & Disclaimer" : "Legal, Terms & Privacy"}
        </h1>
        <div className="text-[12px] text-[#5A6B7D] dark:text-[#9AB1C6] mb-5">
          Please read this before using FairExit{isCanada ? "" : " US"}.
        </div>

        {/* Lead Alert Banner */}
        <div className="bg-white dark:bg-[#0D2238] border border-[#DFE3E8] dark:border-[#1E3B5C] border-l-4 border-l-[#0EB28D] rounded-[12px] p-4 sm:p-5 mb-7 shadow-xs text-[14.5px] leading-[1.6]">
          <b className="font-bold text-[#062C55] dark:text-white">
            FairExit is an educational and organizational tool — not a law firm.
          </b>{" "}
          {isCanada ? (
            <>
              It does not provide legal advice, assess whether your severance offer is fair,
              decide whether a termination clause is valid, calculate what you may be owed, or
              recommend what you should do. Using FairExit does not create a lawyer-client
              relationship or any privilege. Only a lawyer licensed in your province can advise
              you on your situation.
            </>
          ) : (
            <>
              It does not provide legal advice, assess whether a layoff was lawful, evaluate
              legal compliance, calculate what you may be owed, or recommend what you should do.
              Using FairExit does not create an attorney-client relationship or legal privilege.
              Only a licensed attorney in your state can advise you on your situation.
            </>
          )}
        </div>

        {/* Content Body */}
        {isCanada ? (
          <div className="space-y-7 text-[14px] text-[#12202E] dark:text-[#D3E2EF] leading-[1.6]">
            {/* 1. What FairExit does — and doesn't */}
            <section>
              <h2 className="font-serif font-semibold text-[21px] text-[#062C55] dark:text-white mb-2">
                1. What FairExit does — and doesn&apos;t
              </h2>
              <p className="mb-3">
                FairExit helps you <b>organize</b> a severance or termination offer and understand{" "}
                <b>general public information</b> about the rules that may be relevant — for
                example, the minimum notice and severance amounts set out in provincial
                employment-standards legislation (such as Ontario&apos;s{" "}
                <i className="italic">Employment Standards Act, 2000</i>). It gives you
                plain-language explanations, points you to official government resources, and
                suggests questions you might choose to ask.
              </p>
              <p className="mb-2">
                FairExit does <b>not</b>:
              </p>
              <ul className="list-disc pl-5 space-y-1 my-3">
                <li>tell you whether your offer is fair, or what you are legally entitled to;</li>
                <li>decide whether a termination clause in your contract is valid or enforceable;</li>
                <li>calculate your common-law &quot;reasonable notice&quot; entitlement;</li>
                <li>determine whether your employer complied with any law;</li>
                <li>recommend whether you should sign, negotiate, wait, or take any other action.</li>
              </ul>
              <p className="mb-3.5">
                Any read or general information FairExit shows can be incomplete or wrong, and the
                law changes frequently. Do your own research and consult a qualified employment lawyer.
              </p>
              <div className="bg-[#FFF8E8] dark:bg-[#2A2415] border border-[#ECDCA6] dark:border-[#524419] border-l-4 border-l-[#C9A227] rounded-[10px] p-3 sm:p-3.5 text-[13px] text-[#6B5A1E] dark:text-[#EDD98A] leading-[1.6]">
                <b>The statutory minimum is a floor, not a ceiling.</b> Where FairExit shows an
                employment-standards minimum, that is the least the law requires — the low end. If your
                contract has no valid termination clause, you may be entitled to considerably more under
                the common law. Only a lawyer can tell you whether that applies to you.
              </div>
            </section>

            {/* 2. Deadlines are your responsibility */}
            <section>
              <h2 className="font-serif font-semibold text-[21px] text-[#062C55] dark:text-white mb-2">
                2. Deadlines are your responsibility
              </h2>
              <p>
                Deadlines to act can be <b>short</b>. Employers often give a limited window to accept
                an offer, and legal claims have limitation periods (generally two years in Ontario,
                and shorter for some employment-standards complaints). FairExit does not track or
                calculate your deadlines.{" "}
                <b>Confirm any deadline that applies to you with a lawyer promptly — before you sign anything.</b>
              </p>
            </section>

            {/* 3. Union members */}
            <section>
              <h2 className="font-serif font-semibold text-[21px] text-[#062C55] dark:text-white mb-2">
                3. Union members
              </h2>
              <p>
                If you are (or were) a member of a union, your severance and termination rights are
                generally governed by your <b>collective agreement</b> and pursued through the{" "}
                <b>grievance process</b>, not the individual rules FairExit is built around. Contact your
                union representative — FairExit&apos;s read will not reflect your collective agreement.
              </p>
            </section>

            {/* 4. Jurisdiction and scope */}
            <section>
              <h2 className="font-serif font-semibold text-[21px] text-[#062C55] dark:text-white mb-2">
                4. Jurisdiction and scope
              </h2>
              <p>
                FairExit focuses on selected provinces (currently Ontario, British Columbia, and
                Alberta). Rules differ by province and by situation, and federally regulated employers
                (banks, airlines, telecom, inter-provincial transport) are governed by the{" "}
                <i className="italic">Canada Labour Code</i>, which FairExit does not cover. Where
                reviewed, province-specific resources aren&apos;t available, you&apos;ll be told so.
              </p>
            </section>

            {/* 5. How we make money */}
            <section>
              <h2 className="font-serif font-semibold text-[21px] text-[#062C55] dark:text-white mb-2">
                5. How we make money
              </h2>
              <p className="mb-3.5">
                FairExit is free for people reviewing an offer. When you choose to be connected with an
                employment lawyer, participating lawyers may pay FairExit a{" "}
                <b>flat advertising / lead-generation fee</b> — never a percentage of any recovery and
                never a cut of your outcome. FairExit is not a lawyer and does not recommend a specific
                lawyer based on the merits of your matter; you always choose whether and with whom to
                speak. Lawyers remain responsible for their own compliance with the advertising and
                referral rules of their law society (in Ontario, the Law Society of Ontario&apos;s{" "}
                <i className="italic">Rules of Professional Conduct</i>).
              </p>
              <div className="bg-[#FFF8E8] dark:bg-[#2A2415] border border-[#ECDCA6] dark:border-[#524419] border-l-4 border-l-[#C9A227] rounded-[10px] p-3 sm:p-3.5 text-[13px] text-[#6B5A1E] dark:text-[#EDD98A] leading-[1.6]">
                <b>Under review with counsel:</b> the exact structure of the advertising /
                lead-generation fee is being confirmed against Law Society of Ontario rules before any
                paid lawyer connection goes live.
              </div>
            </section>

            {/* 6. No lawyer network yet */}
            <section>
              <h2 className="font-serif font-semibold text-[21px] text-[#062C55] dark:text-white mb-2">
                6. No lawyer network yet
              </h2>
              <p>
                FairExit is a pre-launch concept. We are still building our lawyer network, and
                features such as document upload, automated extraction, payments, and connecting you
                with a lawyer are <b>not yet live</b>. Where a feature isn&apos;t active, the product
                will say so.
              </p>
            </section>

            {/* 7. Privacy & your information */}
            <section>
              <h2 className="font-serif font-semibold text-[21px] text-[#062C55] dark:text-white mb-2">
                7. Privacy &amp; your information
              </h2>
              <p className="mb-3">
                In this preview, <b>no documents are uploaded or processed</b> — the flow uses sample
                data to demonstrate the experience.
              </p>
              <p className="mb-4">
                When features go live, we intend to: collect only what&apos;s needed; obtain your
                explicit consent before sharing anything with a third party (such as a lawyer); tell
                you what is retained and for how long; and honour applicable privacy rights under
                Canadian law (PIPEDA and any applicable provincial privacy legislation), including
                access and correction. We will publish the specific data-processing, retention, and
                third-party details before those features are enabled. Employment documents can be
                sensitive — only share what you&apos;re authorized to share.
              </p>

              {/* Callout box: Your documents and privacy, in plain words */}
              <div className="bg-white dark:bg-[#0D2238] border border-[#E2DDD2] dark:border-[#1E3B5C] border-l-4 border-l-[#10B48F] rounded-[12px] p-4 sm:p-5 my-4">
                <h3 className="font-bold text-[#062C55] dark:text-white text-base sm:text-[18px] mb-1">
                  Your documents and privacy, in plain words
                </h3>
                <p className="text-[12.5px] text-[#8A5A00] dark:text-[#D4A849] mb-3">
                  Draft wording for legal review before launch.
                </p>
                <ol className="list-decimal pl-5 space-y-2 text-[14px] text-[#12202E] dark:text-[#D3E2EF] leading-[1.55]">
                  <li>
                    <b>We don&apos;t keep your documents.</b> Your severance letter and employment
                    contract are used only to build your report. They are deleted automatically{" "}
                    <b>30 days after your report is ready</b>. You can delete them sooner at any time.
                  </li>
                  <li>
                    <b>We don&apos;t sell your information,</b> and we don&apos;t use your documents to
                    train AI models.
                  </li>
                  <li>
                    <b>What we keep:</b> your answers to the free check (no name needed), the email
                    you give us for your receipt and report, and a record that you paid. Card or
                    app-store payment details stay with the payment provider; we never see them.
                  </li>
                  <li>
                    <b>No account needed.</b> If you save your offer to an account in the app, you can
                    delete it and everything in it from Settings.
                  </li>
                  <li>
                    <b>Lawyer requests are opt-in.</b> Nothing goes to a lawyer unless you ask us to
                    connect you and tick the consent box.
                  </li>
                  <li>
                    <b>What a lawyer receives if you ask:</b> your name, email and phone; your province;
                    and a short summary of your answers: your role level, years with the employer, your
                    age range, how the job ended, the amount offered, the deadline to sign, and anything
                    the free check flagged.
                  </li>
                  <li>
                    <b>A lawyer never receives your documents or your report from us.</b> If you want
                    them to see either, you share it yourself.
                  </li>
                  <li>
                    <b>Lawyer request details are deleted 12 months after the request closes.</b>
                  </li>
                  <li>
                    <b>How we&apos;re paid:</b> Lawyers pay FairExit a flat advertising fee. It never
                    depends on your case or its outcome.
                  </li>
                </ol>
              </div>

              <div className="bg-[#FFF8E8] dark:bg-[#2A2415] border border-[#ECDCA6] dark:border-[#524419] border-l-4 border-l-[#C9A227] rounded-[10px] p-3 sm:p-3.5 text-[13px] text-[#6B5A1E] dark:text-[#EDD98A] leading-[1.6]">
                <b>Still to confirm before launch:</b> the specific retention periods, processors,
                encryption, consent logging, and privacy-request process. This page will be updated
                with those details before uploads, payments, or sharing are turned on.
              </div>
            </section>

            {/* 8. Limitation of liability */}
            <section>
              <h2 className="font-serif font-semibold text-[21px] text-[#062C55] dark:text-white mb-2">
                8. Limitation of liability
              </h2>
              <p>
                FairExit is provided &quot;as is,&quot; without warranties of any kind. To the fullest
                extent permitted by law, FairExit and its founders are not liable for any decision you
                make, any action you take or don&apos;t take, any missed deadline, or any loss arising
                from your use of the tool or reliance on any information it provides. FairExit is not
                responsible for the services, advice, or conduct of any lawyer you choose to contact.
              </p>
            </section>

            {/* 9. Governing law */}
            <section>
              <h2 className="font-serif font-semibold text-[21px] text-[#062C55] dark:text-white mb-2">
                9. Governing law
              </h2>
              <p>
                These terms are governed by the laws of the Province of Ontario and the federal laws of
                Canada applicable there, without regard to conflict-of-laws rules.
              </p>
            </section>

            {/* 10. Contact */}
            <section>
              <h2 className="font-serif font-semibold text-[21px] text-[#062C55] dark:text-white mb-2">
                10. Contact
              </h2>
              <p>
                Questions about this page? Reach us through the site. We&apos;ll update this document
                as the product develops.
              </p>
            </section>
          </div>
        ) : (
          /* US Version */
          <div className="space-y-7 text-[14px] text-[#12202E] dark:text-[#D3E2EF] leading-[1.6]">
            {/* 1. What FairExit does — and doesn't */}
            <section>
              <h2 className="font-serif font-semibold text-[21px] text-[#062C55] dark:text-white mb-2">
                1. What FairExit does — and doesn&apos;t
              </h2>
              <p className="mb-3">
                FairExit US helps you <b>organize</b> a separation or severance offer and understand{" "}
                <b>general public information</b> about federal rules that may be relevant (for
                example, the ADEA/OWBPA and the WARN Act). It gives you plain-language explanations
                and questions you might choose to ask.
              </p>
              <p className="mb-2">FairExit does <b>not</b>:</p>
              <ul className="list-disc pl-5 space-y-1.5 my-3">
                <li>tell you whether your offer is fair, or what you are legally owed;</li>
                <li>determine whether your employer complied with any law;</li>
                <li>decide whether any term or release is valid or enforceable;</li>
                <li>calculate WARN back-pay or any legal entitlement;</li>
                <li>recommend whether you should sign, negotiate, wait, or take any other action.</li>
              </ul>
              <p>
                Any read or general information FairExit shows can be incomplete or wrong, and the law
                changes. Do your own research and consult a qualified attorney.
              </p>
            </section>

            {/* 2. Deadlines are your responsibility */}
            <section>
              <h2 className="font-serif font-semibold text-[21px] text-[#062C55] dark:text-white mb-2">
                2. Deadlines are your responsibility
              </h2>
              <p>
                Legal deadlines to act can be <b>short</b> — for example, deadlines to file a charge
                with the EEOC (generally 180 or 300 days depending on your state) and other federal,
                state, or contractual windows. FairExit does not track or calculate your deadlines.{" "}
                <b>Confirm any deadline that applies to you with an attorney promptly.</b>
              </p>
            </section>

            {/* 3. Jurisdiction and scope */}
            <section>
              <h2 className="font-serif font-semibold text-[21px] text-[#062C55] dark:text-white mb-2">
                3. Jurisdiction and scope
              </h2>
              <p>
                Any general information refers to <b>US federal rules only</b>; your state and local
                laws may add requirements FairExit does not cover, and rules differ by situation.
                FairExit does not currently provide reviewed, state-specific public resources — where
                those aren&apos;t available, you&apos;ll be told so.
              </p>
            </section>

            {/* 4. How we make money */}
            <section>
              <h2 className="font-serif font-semibold text-[21px] text-[#062C55] dark:text-white mb-2">
                4. How we make money
              </h2>
              <p>
                FairExit is free for people reviewing an offer. When you choose to be connected with
                an employment attorney, participating attorneys may pay FairExit a{" "}
                <b>flat advertising / lead-generation fee</b> — never a percentage of any recovery and
                never a cut of your outcome. FairExit is not a lawyer referral service in the sense of
                recommending a specific attorney based on the merits of your matter; you always choose
                whether and with whom to speak. Attorneys are responsible for their own compliance with
                their state bar&apos;s advertising rules.
              </p>
            </section>

            {/* 5. No attorney network yet */}
            <section>
              <h2 className="font-serif font-semibold text-[21px] text-[#062C55] dark:text-white mb-2">
                5. No attorney network yet
              </h2>
              <p>
                FairExit is a pre-launch concept. We are still building our attorney network, and
                features such as document upload, automated extraction, payments, and connecting you
                with an attorney are <b>not yet live</b>. Where a feature isn&apos;t active, the product
                will say so.
              </p>
            </section>

            {/* 6. Privacy & your information */}
            <section>
              <h2 className="font-serif font-semibold text-[21px] text-[#062C55] dark:text-white mb-2">
                6. Privacy &amp; your information
              </h2>
              <p className="mb-3">
                In this preview, <b>no documents are uploaded or processed</b> — the flow uses sample
                data to demonstrate the experience.
              </p>
              <p className="mb-4">
                When features go live, we intend to: collect only what&apos;s needed; obtain your
                explicit consent before sharing anything with a third party (such as an attorney); tell
                you what is retained and for how long; and honor applicable privacy rights, including
                for California residents under the CCPA/CPRA (access, deletion, and opt-out). We will
                publish the specific data-processing, retention, and third-party details before those
                features are enabled. Employment documents can be sensitive — only share what
                you&apos;re authorized to share.
              </p>

              <div className="bg-white dark:bg-[#0D2238] border border-[#E2DDD2] dark:border-[#1E3B5C] border-l-4 border-l-[#10B48F] rounded-[12px] p-4 sm:p-5 my-4">
                <h3 className="font-bold text-[#062C55] dark:text-white text-base sm:text-[18px] mb-1">
                  Your documents and privacy, in plain words
                </h3>
                <p className="text-[12.5px] text-[#8A5A00] dark:text-[#D4A849] mb-3">
                  Draft wording for legal review before launch.
                </p>
                <ol className="list-decimal pl-5 space-y-2 text-[14px] text-[#12202E] dark:text-[#D3E2EF] leading-[1.55]">
                  <li>
                    <b>We don&apos;t keep your documents.</b> Your severance letter and employment
                    contract are used only to build your report. They are deleted automatically{" "}
                    <b>30 days after your report is ready</b>. You can delete them sooner at any time.
                  </li>
                  <li>
                    <b>We don&apos;t sell your information,</b> and we don&apos;t use your documents to
                    train AI models.
                  </li>
                  <li>
                    <b>What we keep:</b> your answers to the free check (no name needed), the email
                    you give us for your receipt and report, and a record that you paid. Card or
                    app-store payment details stay with the payment provider; we never see them.
                  </li>
                  <li>
                    <b>No account needed.</b> If you save your offer to an account in the app, you can
                    delete it and everything in it from Settings.
                  </li>
                  <li>
                    <b>Lawyer requests are opt-in.</b> Nothing goes to an attorney unless you ask us to
                    connect you and tick the consent box.
                  </li>
                  <li>
                    <b>What an attorney receives if you ask:</b> your name, email and phone; your
                    state; and a short summary of your answers: your role level, years with the
                    employer, your age range, how the job ended, the amount offered, the deadline to
                    sign, and anything the free check flagged.
                  </li>
                  <li>
                    <b>An attorney never receives your documents or your report from us.</b> If you want
                    them to see either, you share it yourself.
                  </li>
                  <li>
                    <b>Lawyer request details are deleted 12 months after the request closes.</b>
                  </li>
                  <li>
                    <b>How we&apos;re paid:</b> Attorneys pay FairExit a flat advertising fee. It never
                    depends on your case or its outcome.
                  </li>
                </ol>
              </div>

              <div className="bg-[#FFF8E8] dark:bg-[#2A2415] border border-[#ECDCA6] dark:border-[#524419] border-l-4 border-l-[#C9A227] rounded-[10px] p-3 sm:p-3.5 text-[13px] text-[#6B5A1E] dark:text-[#EDD98A] leading-[1.6]">
                <b>Still to confirm before launch:</b> the specific retention periods, processors,
                encryption, consent logging, and the full CCPA request process. This page will be
                updated with those details before uploads, payments, or sharing are turned on.
              </div>
            </section>

            {/* 7. Limitation of liability */}
            <section>
              <h2 className="font-serif font-semibold text-[21px] text-[#062C55] dark:text-white mb-2">
                7. Limitation of liability
              </h2>
              <p>
                FairExit is provided &quot;as is,&quot; without warranties of any kind. To the fullest
                extent permitted by law, FairExit and its founders are not liable for any decision you
                make, any action you take or don&apos;t take, any missed deadline, or any loss arising
                from your use of the tool or reliance on any information it provides. FairExit is not
                responsible for the services, advice, or conduct of any attorney you choose to contact.
              </p>
            </section>

            {/* 8. Governing law */}
            <section>
              <h2 className="font-serif font-semibold text-[21px] text-[#062C55] dark:text-white mb-2">
                8. Governing law
              </h2>
              <p>
                These terms are governed by the laws of the Province of Ontario, Canada, where
                FairExit&apos;s founders operate, without regard to conflict-of-laws rules.{" "}
                <span className="text-[#5A6B7D] dark:text-[#8EA5B8]">
                  [To be confirmed with counsel for US operation.]
                </span>
              </p>
            </section>

            {/* 9. Contact */}
            <section>
              <h2 className="font-serif font-semibold text-[21px] text-[#062C55] dark:text-white mb-2">
                9. Contact
              </h2>
              <p>
                Questions about this page? Reach us through the site. We&apos;ll update this document
                as the product develops.
              </p>
            </section>
          </div>
        )}

        {/* Bottom Legal Footer */}
        <footer className="border-t border-[#DFE3E8] dark:border-[#1E3B5C] pt-4 mt-10 text-[12px] text-[#5A6B7D] dark:text-[#8EA5B8] leading-relaxed flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>
            FairExit {isCanada ? "Canada" : "US"} · Educational and organizational information only,
            not legal advice. Not a law firm; {isCanada ? "no lawyer-client relationship." : "no attorney-client relationship."} ·
          </span>
          <Link
            href="/"
            className="text-[#0C8F72] dark:text-[#0EB28D] underline hover:opacity-80 transition-opacity"
          >
            Home
          </Link>
          <span>·</span>
          {isCanada ? (
            <button
              type="button"
              onClick={() => handleCountrySwitch("US")}
              className="text-[#0C8F72] dark:text-[#0EB28D] underline hover:opacity-80 transition-opacity inline-flex items-center gap-1 cursor-pointer"
            >
              🇺🇸 United States
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleCountrySwitch("CA")}
              className="text-[#0C8F72] dark:text-[#0EB28D] underline hover:opacity-80 transition-opacity inline-flex items-center gap-1 cursor-pointer"
            >
              🇨🇦 Canada
            </button>
          )}
        </footer>
      </main>

      <FloatingActions />
    </div>
  );
}

export default function LegalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F6F4EF] dark:bg-[#062C55] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#0C8F72] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LegalContent />
    </Suspense>
  );
}
