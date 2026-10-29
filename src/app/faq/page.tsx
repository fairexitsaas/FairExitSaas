"use client";

import React, { useState, useMemo, useContext, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import FloatingActions from "@/components/landing/FloatingActions";
import { CountryContext, CountryCode } from "@/context/CountryContext";

interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const CA_FAQS: FaqItem[] = [
  // Severance basics
  {
    id: "what-is-severance-pay-in-canada",
    category: "Severance basics",
    question: "What is severance pay in Canada?",
    answer:
      "It's money an employer pays when your job ends without cause. It usually has up to three parts: the notice (or pay instead of notice) that your province's employment standards require, statutory severance pay in some provinces such as Ontario, and a larger amount that courts often award under common law. Many offers sit somewhere between the legal minimum and what courts award.",
  },
  {
    id: "how-much-severance-should-i-get",
    category: "Severance basics",
    question: "How much severance should I get?",
    answer:
      "It depends mostly on your province, your age, how long you worked there, your role and your pay. The legal minimum is set by provincial rules (for example, Ontario requires up to 8 weeks' notice, plus up to 26 weeks' severance pay at larger employers). Courts often award more based on those personal factors. The free check shows where your offer sits between the two.",
  },
  {
    id: "what-s-the-difference-between-notice-severance-pay-and-common",
    category: "Severance basics",
    question: "What's the difference between notice, severance pay and common-law notice?",
    answer:
      "Notice (or pay in lieu) is the minimum warning period in your province's employment standards. Severance pay is a separate statutory payment in Ontario and federally regulated jobs. Common-law notice is what a court may decide is reasonable, and it's often much higher than the minimums unless a valid contract clause limits you to the minimum.",
  },
  {
    id: "can-my-contract-limit-me-to-the-minimum",
    category: "Severance basics",
    question: "Can my contract limit me to the minimum?",
    answer:
      "Sometimes. A termination clause can limit you to the employment standards minimum, but courts often find these clauses unenforceable if the wording is flawed. Whether yours holds is one of the first things a lawyer checks.",
  },
  {
    id: "can-i-get-severance-if-i-was-laid-off",
    category: "Severance basics",
    question: "Can I get severance if I was laid off?",
    answer:
      "Usually, yes, if the layoff ends your job and it wasn't for cause. Temporary layoffs have their own rules and time limits by province.",
  },

  // Deadlines and signing
  {
    id: "do-i-have-to-sign-by-the-date-on-the-letter",
    category: "Deadlines and signing",
    question: "Do I have to sign by the date on the letter?",
    answer:
      "That date is set by your employer, not by law. Asking for more time to review is common and reasonable. Get any extension in writing.",
  },
  {
    id: "should-i-sign-my-severance-agreement-right-away",
    category: "Deadlines and signing",
    question: "Should I sign my severance agreement right away?",
    answer:
      "It's usually worth taking a few days. Once you sign a release you normally give up the right to ask for more. Check the numbers, the release, and your benefits and bonus terms first.",
  },
  {
    id: "what-is-a-release-or-waiver",
    category: "Deadlines and signing",
    question: "What is a release or waiver?",
    answer:
      "It's the part of the agreement where you promise not to make further claims against the employer in exchange for the package. It's often the most important paragraph to read before signing.",
  },
  {
    id: "can-i-negotiate-my-severance",
    category: "Deadlines and signing",
    question: "Can I negotiate my severance?",
    answer:
      "Yes. Many people negotiate, especially when the offer is close to the legal minimum. Common asks include more weeks of pay, continued benefits, bonus or commission owed, a reference letter, and more time to decide.",
  },

  // Money after you leave
  {
    id: "is-severance-taxed",
    category: "Money after you leave",
    question: "Is severance taxed?",
    answer:
      "Yes. Severance is taxable income. Employers usually withhold tax at a lump-sum rate, so the final tax owed can differ when you file.",
  },
  {
    id: "will-severance-affect-ei",
    category: "Money after you leave",
    question: "Will severance affect EI?",
    answer:
      "Normally it can delay when EI starts, because severance and pay in lieu are allocated to the weeks after your job ends. Right now a temporary federal measure pauses that: for claims starting between March 30, 2025 and October 9, 2027, separation pay is not deducted from EI and the one-week waiting period is waived. Apply for EI as soon as you stop working.",
  },
  {
    id: "what-happens-to-my-benefits",
    category: "Money after you leave",
    question: "What happens to my benefits?",
    answer:
      "Under employment standards, benefits generally continue through the minimum notice period. After that it depends on your agreement. Ask in writing when each benefit ends.",
  },

  // Using FairExit
  {
    id: "what-s-free",
    category: "Using FairExit",
    question: "What's free?",
    answer:
      "The check is free: a few questions, no account, about 2 minutes. You see where your offer sits under your province's rules. No AI is used for the free check.",
  },
  {
    id: "what-s-in-the-59-severance-report",
    category: "Using FairExit",
    question: "What's in the $59 Severance Report?",
    answer:
      "A one-time $59 CAD report built from your answers, and your letter and contract if you add them. It covers your offer in plain English, your estimated range, what lifts your number, the terms to understand, questions to ask, a ready-to-send email, and your deadlines. It's yours to keep, print or share with a lawyer.",
  },
  {
    id: "do-i-need-an-account",
    category: "Using FairExit",
    question: "Do I need an account?",
    answer:
      "No. You can check, buy the report, and get connected with a lawyer without an account. An account is optional if you want your offer saved across devices.",
  },
  {
    id: "can-i-get-a-refund",
    category: "Using FairExit",
    question: "Can I get a refund?",
    answer:
      "On the web, contact us within 14 days if you haven't opened the report or it was materially wrong, and we'll review it. In the app, refunds are handled by Apple or Google under their rules.",
  },
  {
    id: "which-provinces-do-you-cover",
    category: "Using FairExit",
    question: "Which provinces do you cover?",
    answer:
      "The free check covers all nine common-law provinces (British Columbia, Alberta, Saskatchewan, Manitoba, Ontario, New Brunswick, Nova Scotia, Prince Edward Island, and Newfoundland and Labrador) and federally regulated jobs. FairExit doesn't cover Quebec or the territories.",
  },
  {
    id: "do-you-use-ai",
    category: "Using FairExit",
    question: "Do you use AI?",
    answer:
      "Only in the paid report, to read your letter and contract. You check everything we read before the report is built, and we flag anything we weren't sure about.",
  },
  {
    id: "is-there-an-app",
    category: "Using FairExit",
    question: "Is there an app?",
    answer:
      "Yes, for iPhone and Android. If you bought the report on the website, choose \"I already have a report\" in the app and it opens unlocked, with nothing to pay again.",
  },

  // Lawyers
  {
    id: "do-i-need-a-lawyer-for-my-severance",
    category: "Lawyers",
    question: "Do I need a lawyer for my severance?",
    answer:
      "Not always. Many people sign as-is or negotiate on their own. A lawyer is most useful when the offer looks well below what courts award, when a contract clause may limit you to the minimum, or when there's a lot of money involved.",
  },
  {
    id: "how-does-connecting-with-a-lawyer-work",
    category: "Lawyers",
    question: "How does connecting with a lawyer work?",
    answer:
      "Tell us you'd like to talk to one and agree to share your name, contact details and basic facts. We find an employment lawyer licensed in your province, usually within 2 business days, and you pick a time for a free first call.",
  },
  {
    id: "does-it-cost-me-anything",
    category: "Lawyers",
    question: "Does it cost me anything?",
    answer:
      "No. Connecting with a lawyer and the first call are free for you. Lawyers pay FairExit a flat advertising fee that never depends on whether they're hired or on the result of your case.",
  },
  {
    id: "do-you-recommend-a-lawyer",
    category: "Lawyers",
    question: "Do you recommend a lawyer?",
    answer:
      "No. We don't rate or rank lawyers. We introduce you to one licensed in your region, and you decide whether to go further.",
  },

  // Privacy and trust
  {
    id: "do-you-give-legal-advice",
    category: "Privacy and trust",
    question: "Do you give legal advice?",
    answer:
      "No. FairExit gives legal information to help you understand your offer and decide. Only a licensed lawyer can advise you on your situation.",
  },
  {
    id: "will-my-employer-know-i-used-fairexit",
    category: "Privacy and trust",
    question: "Will my employer know I used FairExit?",
    answer: "No. Nothing is shared with your employer.",
  },
  {
    id: "what-happens-to-my-documents",
    category: "Privacy and trust",
    question: "What happens to my documents?",
    answer:
      "Uploaded documents are deleted 30 days after your report is ready. Your report is kept for 12 months so you can download it again for free, then deleted. You can delete it sooner any time: in the app, go to Settings → Delete my data; on the website, email us at hello@fairexit.io.",
  },
];

const US_FAQS: FaqItem[] = [
  // Severance basics
  {
    id: "does-us-law-require-severance-pay",
    category: "Severance basics",
    question: "Does US law require severance pay?",
    answer:
      "Generally, no. Federal law doesn't require severance. It usually comes from company policy, your employment contract, or a separation agreement, often in exchange for a release of claims. Some states and situations have extra rules.",
  },
  {
    id: "how-much-severance-is-typical",
    category: "Severance basics",
    question: "How much severance is typical?",
    answer:
      "It varies widely by employer, role and tenure. Common formulas are one or two weeks of pay per year of service, but there's no legal standard. The free check shows what federal and state rules say about your agreement.",
  },
  {
    id: "can-i-still-negotiate-a-us-severance-offer",
    category: "Severance basics",
    question: "Can I still negotiate a US severance offer?",
    answer:
      "Often, yes. Common asks include more weeks of pay, paid COBRA premiums, bonus or commission owed, equity treatment, a neutral reference, and more time to decide.",
  },

  // Deadlines and signing
  {
    id: "what-is-the-owbpa-21-45-day-rule",
    category: "Deadlines and signing",
    question: "What is the OWBPA 21/45-day rule?",
    answer:
      "If you're 40 or older and asked to sign a release that waives age-discrimination claims, federal law (the Older Workers Benefit Protection Act) generally requires at least 21 days to consider it, or 45 days in a group layoff program, plus 7 days to revoke after signing.",
  },
  {
    id: "what-is-the-7-day-revocation-period",
    category: "Deadlines and signing",
    question: "What is the 7-day revocation period?",
    answer:
      "For workers 40 and over waiving age claims, you usually have 7 days after signing to change your mind. The agreement doesn't take effect until that period ends.",
  },
  {
    id: "what-must-a-group-layoff-release-include",
    category: "Deadlines and signing",
    question: "What must a group layoff release include?",
    answer:
      "In a group program, the employer generally has to give workers 40 and over written information about who was selected and who wasn't, with job titles and ages. If it's missing, ask for it.",
  },
  {
    id: "do-i-have-to-sign-by-the-date-on-the-letter-us",
    category: "Deadlines and signing",
    question: "Do I have to sign by the date on the letter?",
    answer:
      "The date is set by your employer. If you're 40 or over and waiving age claims, federal law generally requires at least 21 or 45 days to consider it. Otherwise, asking for more time is common. Get any extension in writing.",
  },
  {
    id: "what-is-a-release-of-claims",
    category: "Deadlines and signing",
    question: "What is a release of claims?",
    answer:
      "It's where you give up the right to sue the employer over the job ending, in exchange for the severance. It's usually the most important part of the agreement.",
  },

  // Layoff rules
  {
    id: "what-is-the-warn-act",
    category: "Layoff rules",
    question: "What is the WARN Act?",
    answer:
      "The federal WARN Act generally requires employers with 100 or more employees to give 60 days' notice before a mass layoff or plant closing. Some states, such as California, New York and Illinois, have their own mini-WARN laws with different thresholds or longer notice.",
  },
  {
    id: "what-if-i-didn-t-get-enough-notice",
    category: "Layoff rules",
    question: "What if I didn't get enough notice?",
    answer:
      "If a covered layoff happened without the required notice, back pay and benefits for the missing days may be owed. An attorney can check whether WARN applies to your situation.",
  },

  // Money after you leave
  {
    id: "is-severance-taxed-us",
    category: "Money after you leave",
    question: "Is severance taxed?",
    answer:
      "Yes. Severance is taxed as wages, and employers often withhold at the supplemental rate.",
  },
  {
    id: "what-happens-to-my-health-insurance",
    category: "Money after you leave",
    question: "What happens to my health insurance?",
    answer:
      "You may be able to keep your group coverage through COBRA, usually for up to 18 months, but you pay the premium. Some packages include paid COBRA months, which is worth asking about.",
  },
  {
    id: "can-i-get-unemployment-with-severance",
    category: "Money after you leave",
    question: "Can I get unemployment with severance?",
    answer:
      "It depends on your state. Some states delay or reduce benefits while you receive severance, others don't. Apply promptly and report the severance as your state asks.",
  },

  // Using FairExit
  {
    id: "what-s-free-us",
    category: "Using FairExit",
    question: "What's free?",
    answer:
      "The check is free: a few questions, no account, about 2 minutes. You see what federal and state rules say about your agreement. No AI is used for the free check.",
  },
  {
    id: "what-s-in-the-59-severance-report-us",
    category: "Using FairExit",
    question: "What's in the $59 Severance Report?",
    answer:
      "A one-time $59 USD report built from your answers, and your agreement if you add it. It covers the rules that apply, the conditions worth a closer look, questions to ask, a ready-to-send email, and every date that matters. It's yours to keep or share with an attorney.",
  },
  {
    id: "do-i-need-an-account-us",
    category: "Using FairExit",
    question: "Do I need an account?",
    answer:
      "No. You can check, buy the report, and get connected with an attorney without an account. An account is optional to save across devices.",
  },
  {
    id: "can-i-get-a-refund-us",
    category: "Using FairExit",
    question: "Can I get a refund?",
    answer:
      "On the web, contact us within 14 days if you haven't opened the report or it was materially wrong, and we'll review it. In the app, refunds are handled by Apple or Google under their rules.",
  },
  {
    id: "do-you-use-ai-us",
    category: "Using FairExit",
    question: "Do you use AI?",
    answer:
      "Only in the paid report, to read your agreement. You check everything we read before the report is built, and we flag anything we weren't sure about.",
  },
  {
    id: "is-there-an-app-us",
    category: "Using FairExit",
    question: "Is there an app?",
    answer:
      "Yes, for iPhone and Android. If you bought the report on the website, choose \"I already have a report\" in the app and it opens unlocked, with nothing to pay again.",
  },

  // Attorneys
  {
    id: "do-i-need-an-attorney",
    category: "Attorneys",
    question: "Do I need an attorney?",
    answer:
      "Not always. An attorney is most useful when a release doesn't meet the rules, when WARN may apply, or when there's a lot of money or equity involved.",
  },
  {
    id: "how-does-connecting-with-an-attorney-work",
    category: "Attorneys",
    question: "How does connecting with an attorney work?",
    answer:
      "Tell us you'd like to talk to one and agree to share your name, contact details and basic facts. Where attorneys are live, we connect you with one licensed in your state and you pick a time for a free first call. Where they aren't yet, we'll let you know when they are.",
  },
  {
    id: "does-it-cost-me-anything-us",
    category: "Attorneys",
    question: "Does it cost me anything?",
    answer:
      "No. Connecting and the first call are free for you. Attorneys pay FairExit a flat advertising fee that never depends on whether they're hired or on the outcome.",
  },

  // Privacy and trust
  {
    id: "do-you-give-legal-advice-us",
    category: "Privacy and trust",
    question: "Do you give legal advice?",
    answer:
      "No. FairExit gives legal information to help you understand your agreement and decide. Only a licensed attorney can advise you on your situation.",
  },
  {
    id: "will-my-employer-know-i-used-fairexit-us",
    category: "Privacy and trust",
    question: "Will my employer know I used FairExit?",
    answer: "No. Nothing is shared with your employer.",
  },
  {
    id: "what-happens-to-my-documents-us",
    category: "Privacy and trust",
    question: "What happens to my documents?",
    answer:
      "Uploaded documents are deleted 30 days after your report is ready. Your report is kept for 12 months so you can download it again for free, then deleted. You can delete it sooner any time: in the app, go to Settings → Delete my data; on the website, email us at hello@fairexit.io.",
  },
];

function FaqContent() {
  const context = useContext(CountryContext);
  const searchParams = useSearchParams();
  const urlCountry = searchParams?.get("country")?.toUpperCase();

  const currentCountry: CountryCode =
    urlCountry === "US" || urlCountry === "CA"
      ? (urlCountry as CountryCode)
      : context?.Country || "CA";

  const isCanada = currentCountry === "CA";

  const [searchQuery, setSearchQuery] = useState("");
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const handleCountrySwitch = (nextCountry: CountryCode) => {
    if (context) context.setCountry(nextCountry);
  };

  const faqList = isCanada ? CA_FAQS : US_FAQS;

  const categories = useMemo(() => {
    return Array.from(new Set(faqList.map((item) => item.category)));
  }, [faqList]);

  const filteredFaqs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return faqList;
    return faqList.filter(
      (item) =>
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q)
    );
  }, [faqList, searchQuery]);

  const groupedFaqs = useMemo(() => {
    const map = new Map<string, FaqItem[]>();
    for (const item of filteredFaqs) {
      const list = map.get(item.category) || [];
      list.push(item);
      map.set(item.category, list);
    }
    return map;
  }, [filteredFaqs]);

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const scrollToCategory = (cat: string) => {
    const id = `cat-${cat.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f4ef] dark:bg-[#062c55] text-[#17242f] dark:text-[#eaf2f8] transition-colors">
      <Navbar country={currentCountry} onCountrySwitch={handleCountrySwitch} />

      <main className="flex-1 max-w-[820px] w-full mx-auto px-4 sm:px-6 py-9 pb-20">
        {/* Kick */}
        <div className="flex items-center gap-2 text-xs font-extrabold tracking-[1.3px] uppercase text-[#0c8f72] dark:text-[#0eb28d] mb-2">
          <Image
            src={isCanada ? "/flag-ca.svg" : "/flag-us.svg"}
            alt=""
            width={20}
            height={14}
            className="w-5 h-3.5 object-cover rounded-[2px] shrink-0"
            priority
          />
          <span>{isCanada ? "Canada" : "United States"} · Frequently asked questions</span>
        </div>

        {/* Title */}
        <h1 className="font-serif font-semibold text-3xl sm:text-[40px] text-[#062c55] dark:text-white leading-[1.1] tracking-[-0.5px] mb-2.5">
          {isCanada ? "Severance FAQ for Canada" : "Severance FAQ for the US"}
        </h1>

        <p className="text-base sm:text-[17px] text-[#5a6b78] dark:text-[#9ab1c6] max-w-[62ch] leading-relaxed mb-6">
          Short, plain answers. Legal information, not legal advice. For your exact situation, talk to a licensed{" "}
          {isCanada ? "employment lawyer." : "attorney."}
        </p>

        {/* Search */}
        <div className="relative mb-4">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#5a6b78] dark:text-[#9ab1c6]"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions, e.g. deadline, taxes, refund"
            aria-label="Search the FAQ"
            className="w-full bg-white dark:bg-[#0d2238] border border-[#cdd3d8] dark:border-[#1e3b5c] rounded-xl py-3 px-3.5 pl-11 text-[15.5px] text-[#17242f] dark:text-[#f0f6fc] placeholder-[#5a6b78] dark:placeholder-[#627d98] focus:outline-none focus:ring-2 focus:ring-[#0eb28d] transition-all shadow-xs"
          />
        </div>

        {/* Category Jump Chips */}
        <div className="flex gap-2 flex-wrap mb-7">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => scrollToCategory(cat)}
              className="text-xs sm:text-[13px] font-bold rounded-full px-3.5 py-1.5 transition-all border cursor-pointer bg-white dark:bg-[#0d2238] text-[#062c55] dark:text-[#9ab1c6] border-[#e7e4dd] dark:border-[#1e3b5c] hover:border-[#0eb28d] hover:text-[#0eb28d]"
            >
              {cat}
            </button>
          ))}
        </div>

        {/* FAQ Groups */}
        {groupedFaqs.size === 0 ? (
          <div className="text-center py-12 text-[#5a6b78] dark:text-[#9ab1c6]">
            <p className="text-base mb-2">No questions match &ldquo;{searchQuery}&rdquo;</p>
            <button
              onClick={() => setSearchQuery("")}
              className="text-sm font-bold text-[#0c8f72] hover:underline cursor-pointer"
            >
              Clear search query
            </button>
          </div>
        ) : (
          Array.from(groupedFaqs.entries()).map(([cat, items]) => (
            <section
              key={cat}
              id={`cat-${cat.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              className="mb-8 scroll-mt-24"
            >
              <h2 className="font-serif font-semibold text-2xl text-[#062c55] dark:text-white mb-3">
                {cat}
              </h2>
              <div className="space-y-2">
                {items.map((item) => {
                  const isOpen =
                    openItems[item.id] !== undefined
                      ? openItems[item.id]
                      : searchQuery.trim().length > 0;

                  return (
                    <div
                      key={item.id}
                      id={item.id}
                      className="bg-white dark:bg-[#0d2238] border border-[#e7e4dd] dark:border-[#1e3b5c] rounded-xl overflow-hidden transition-all shadow-xs"
                    >
                      <button
                        type="button"
                        onClick={() => toggleItem(item.id)}
                        className="w-full text-left p-4 sm:p-4.5 pr-12 font-bold text-[15.5px] sm:text-base text-[#062c55] dark:text-white relative cursor-pointer flex items-center justify-between"
                        aria-expanded={isOpen}
                      >
                        <span>{item.question}</span>
                        <span
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl font-light text-[#0c8f72] dark:text-[#0eb28d] leading-none select-none transition-transform"
                          aria-hidden="true"
                        >
                          {isOpen ? "–" : "+"}
                        </span>
                      </button>
                      {isOpen && (
                        <div className="px-4 sm:px-4.5 pb-4 text-[15px] sm:text-[15.5px] text-[#17242f] dark:text-[#c7ddee] leading-relaxed border-t border-[#f0ede6] dark:border-[#163350] pt-3">
                          {item.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}

        {/* CTA Bar */}
        <div className="bg-[#062c55] dark:bg-[#071d34] text-white rounded-2xl p-5 sm:p-6 my-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border border-[#1a3b5c]">
          <div>
            <h3 className="font-serif font-semibold text-xl sm:text-[22px] leading-tight mb-1">
              {isCanada ? "See where your own offer sits" : "Check your own agreement"}
            </h3>
            <p className="text-sm text-[#c9d6e5]">
              Free, about 3 minutes. No account, no sales call.
            </p>
          </div>
          <Link
            href={isCanada ? "/questions" : "/questions?country=US"}
            className="w-full sm:w-auto text-center font-extrabold text-[15px] px-5 py-3 rounded-lg bg-gradient-to-b from-[#0eb28d] to-[#0c8f72] text-white shadow-md hover:brightness-105 active:scale-95 transition-all whitespace-nowrap"
          >
            {isCanada ? "Check my offer →" : "Check my layoff →"}
          </Link>
        </div>

        {/* Disclaimer / Switcher */}
        <p className="text-xs sm:text-[13px] text-[#5a6b78] dark:text-[#8ea5b8] mt-6 leading-relaxed">
          Legal information, not legal advice. Rules change and every situation is different. Last updated September 2026. Looking for the{" "}
          <button
            type="button"
            onClick={() => handleCountrySwitch(isCanada ? "US" : "CA")}
            className="text-[#0c8f72] dark:text-[#0eb28d] font-semibold underline cursor-pointer inline-flex items-center gap-1.5 align-baseline"
          >
            <Image
              src={isCanada ? "/flag-us.svg" : "/flag-ca.svg"}
              alt=""
              width={16}
              height={11}
              className="w-4 h-[11px] object-cover rounded-[2px] shrink-0 inline-block"
            />
            <span>{isCanada ? "US FAQ" : "Canada FAQ"}?</span>
          </button>
        </p>
      </main>
      <FloatingActions />
    </div>
  );
}

export default function FaqPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f6f4ef] dark:bg-[#062c55]" />}>
      <FaqContent />
    </Suspense>
  );
}
