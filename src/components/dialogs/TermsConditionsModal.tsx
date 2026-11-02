"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

export interface TermsConditionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAllAccepted: () => void;
  country?: string;
}

export interface TermDocument {
  id: string;
  title: string;
  effectiveDate: string;
  sections: {
    heading?: string;
    paragraphs: (string | { bullet: string })[];
  }[];
}

export const TC_DOCUMENTS: TermDocument[] = [
  {
    id: "terms",
    title: "Terms of Service",
    effectiveDate: "Effective date: September 2026 · working draft",
    sections: [
      {
        paragraphs: [
          "These terms govern your use of FairExit. By using the tool you agree to them. FairExit is an educational and organizational service, not a law firm, and using it does not create a lawyer–client relationship.",
        ],
      },
      {
        heading: "What FairExit does",
        paragraphs: [
          "FairExit helps you organize a severance or termination offer and understand general, public information about the rules that may apply. It gives plain-language explanations, official government links, and questions you may choose to ask.",
        ],
      },
      {
        heading: "What FairExit does not do",
        paragraphs: [
          "It does not tell you whether your offer is fair, decide whether a clause is enforceable, or guarantee any amount. Any estimate is an estimate only. You are responsible for checking everything before you act.",
        ],
      },
      {
        heading: "Payments",
        paragraphs: [
          "Some features are paid, one-time. Purchases are for the organizational document only and do not buy legal advice. Refunds are handled case by case.",
        ],
      },
      {
        heading: "Your responsibilities",
        paragraphs: [
          "You agree to provide accurate information and to use the tool for your own situation. Deadlines to act can be short — you are responsible for confirming them with a lawyer promptly.",
        ],
      },
      {
        heading: "Governing law",
        paragraphs: [
          "These terms are governed by applicable provincial/state and federal employment laws. Any dispute is subject to the courts of the governing jurisdiction.",
        ],
      },
    ],
  },
  {
    id: "disclaimer",
    title: "Accuracy, AI & “Not Legal Advice”",
    effectiveDate: "Please read this in full · working draft, pending legal review",
    sections: [
      {
        paragraphs: [
          "FairExit does not provide legal advice. Everything it shows is general information and organization to help you prepare and understand your options. It does not create a lawyer–client relationship.",
        ],
      },
      {
        heading: "How FairExit reads your documents",
        paragraphs: [
          "FairExit uses artificial intelligence to pull the key terms out of the documents you upload and compare them with public employment rules for your province or state. We check its output against official government sources and our own rules, and we show you what we read so you can correct it before anything is built.",
        ],
      },
      {
        heading: "AI can make mistakes",
        paragraphs: [
          "Even with those checks, AI can misread a document, miss a clause, or apply a rule that doesn’t fit your situation. Laws also change. Always check the details yourself before relying on them, and speak to a lawyer before you sign anything.",
        ],
      },
      {
        heading: "Estimates are estimates",
        paragraphs: [
          "Any number or range is an estimate built from public rules (the legal minimum) and general factors (the what courts award). It is not a promise, quote or guarantee of what you are owed.",
        ],
      },
      {
        heading: "Limits on our responsibility",
        paragraphs: [
          "To the extent the law allows, FairExit is not responsible for decisions you make or deadlines you miss based on its information, and our total responsibility for any error is limited to the amount you paid us. Nothing here removes rights you have under consumer protection law.",
        ],
      },
      {
        heading: "Talk to a lawyer",
        paragraphs: [
          "Only a licensed employment lawyer or attorney can tell you what applies to you. If anything feels urgent — especially before you sign — speak to one first.",
        ],
      },
    ],
  },
  {
    id: "privacy",
    title: "Privacy & Your Information",
    effectiveDate: "Working draft · retention periods to be confirmed before launch",
    sections: [
      {
        paragraphs: [
          "Employment documents are personal. Here’s exactly what we do with yours, in plain language.",
        ],
      },
      {
        heading: "What we collect",
        paragraphs: [
          "Your answers, the documents you upload, your email address, and a payment record. We never see or store your card number; the payment processor handles cards. Only if you ask for a lawyer and agree, we also collect your name, email, phone and a short summary of your answers.",
        ],
      },
      {
        heading: "How long we keep it",
        paragraphs: [
          { bullet: "Uploaded documents: deleted 30 days after your report is ready." },
          { bullet: "Your report: kept 12 months so you can download it again for free, then deleted. Delete it sooner any time. After that, a new report is a new purchase." },
          { bullet: "Lawyer request details: deleted 12 months after the request closes." },
          { bullet: "Payment records: kept 7 years, as tax law requires." },
          { bullet: "Email consent records: kept while we email you, plus 3 years, so we can prove what you agreed to." },
        ],
      },
      {
        heading: "Getting your report back",
        paragraphs: [
          "Use the link in your receipt email. Or, on the website or app, enter the email you paid with or your order number and we send you a 6-digit code. This works for 12 months.",
        ],
      },
      {
        heading: "Deleting your data",
        paragraphs: [
          "You can delete your documents and report sooner at any time. In the app, go to Settings → Delete my data. On the website, email us.",
        ],
      },
      {
        heading: "Who sees it",
        paragraphs: [
          "We never sell your information. We only share your summary with an attorney or lawyer if you ask us to connect you, and we show you exactly what they will receive before anything is sent. We use trusted service providers for payments, email and document processing. They may only use your information to run FairExit.",
        ],
      },
      {
        heading: "Where it’s stored",
        paragraphs: [
          "Some of our providers, including our payment and AI processors, store or process data outside your state or province. Your information may be accessed there under local law.",
        ],
      },
      {
        heading: "Emails we send",
        paragraphs: [
          { bullet: "Your report, receipt and private link: sent because you asked for them." },
          { bullet: "If you start checkout but don’t finish: at most two short reminders, then we stop." },
          { bullet: "Tips and news: only if you tick the box." },
          "Every email identifies FairExit and has a one-click unsubscribe, which we honour within 10 business days.",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: [
          "You can ask to see, correct or delete your information, under applicable privacy law (including PIPEDA or CCPA/CPRA). Contact: privacy@fairexit.com.",
        ],
      },
    ],
  },
];

export default function TermsConditionsModal({
  isOpen,
  onClose,
  onAllAccepted,
  country = "CA",
}: TermsConditionsModalProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [acceptedMap, setAcceptedMap] = useState<Record<string, boolean>>({});
  const [reachedBottomMap, setReachedBottomMap] = useState<Record<string, boolean>>({});
  const [isDeclined, setIsDeclined] = useState(false);

  const docContainerRef = useRef<HTMLDivElement>(null);

  const currentDoc = TC_DOCUMENTS[activeTab];
  const acceptedCount = TC_DOCUMENTS.filter((d) => acceptedMap[d.id]).length;
  const isCurrentAccepted = Boolean(acceptedMap[currentDoc.id]);
  const isCurrentScrolled = Boolean(reachedBottomMap[currentDoc.id]);

  // Check scroll position
  const handleScroll = useCallback(() => {
    if (!docContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = docContainerRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 20) {
      setReachedBottomMap((prev) => ({ ...prev, [currentDoc.id]: true }));
    }
  }, [currentDoc.id]);

  // Switch tab
  const handleSelectTab = (idx: number) => {
    setActiveTab(idx);
    if (docContainerRef.current) {
      docContainerRef.current.scrollTop = 0;
    }
  };

  // Re-check scroll height on doc load
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      if (docContainerRef.current) {
        const { scrollHeight, clientHeight } = docContainerRef.current;
        if (scrollHeight <= clientHeight + 30) {
          setReachedBottomMap((prev) => ({ ...prev, [currentDoc.id]: true }));
        }
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [activeTab, isOpen, currentDoc.id]);

  // Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAcceptCurrent = () => {
    const updated = { ...acceptedMap, [currentDoc.id]: true };
    setAcceptedMap(updated);

    // Find next unaccepted
    const nextUnaccepted = TC_DOCUMENTS.findIndex((d) => !updated[d.id]);
    if (nextUnaccepted === -1) {
      // All accepted!
      onAllAccepted();
    } else {
      handleSelectTab(nextUnaccepted);
    }
  };

  // Download document as text
  const handleDownload = () => {
    const doc = currentDoc;
    let text = `${doc.title.toUpperCase()}\n${doc.effectiveDate}\n\n`;
    doc.sections.forEach((sec) => {
      if (sec.heading) {
        text += `\n--- ${sec.heading.toUpperCase()} ---\n`;
      }
      sec.paragraphs.forEach((p) => {
        if (typeof p === "string") {
          text += `${p}\n\n`;
        } else {
          text += `• ${p.bullet}\n`;
        }
      });
    });

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `FairExit-${doc.id}-terms.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Terms and Conditions"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#062C55]/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className={`relative w-full max-w-[920px] max-h-[90vh] bg-white rounded-[16px] shadow-[0_50px_90px_-30px_rgba(6,44,85,0.6)] border border-[#E7E4DD] flex flex-col overflow-hidden z-10 animate-dlgup ${
          isDeclined ? "max-w-[520px]" : "h-[680px]"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 sm:py-5 border-b border-[#E7E4DD] shrink-0 bg-white">
          <div>
            <h2 className="font-serif text-[20px] sm:text-[22px] font-[600] text-[#062C55] leading-tight">
              Terms &amp; Conditions
            </h2>
            <div className="font-sans font-[600] text-[12px] sm:text-[12.5px] text-[#5A6B78] mt-0.5">
              {isDeclined
                ? "You can accept or decline — no pressure."
                : `${acceptedCount} of ${TC_DOCUMENTS.length} accepted`}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-[34px] h-[34px] rounded-full border border-[#E7E4DD] bg-white hover:bg-[#F6F4EF] text-[#5A6B78] flex items-center justify-center text-[15px] font-bold transition shrink-0"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Declined State */}
        {isDeclined ? (
          <div className="p-6 sm:p-8 overflow-y-auto text-center">
            <h3 className="font-serif text-[24px] font-[600] text-[#062C55] mb-3">
              That&apos;s completely fine.
            </h3>
            <p className="font-sans text-[14px] text-[#3F4B58] leading-relaxed mb-4 max-w-[460px] mx-auto">
              You don&apos;t have to agree to anything you&apos;re not comfortable with, and{" "}
              <b className="text-[#062C55]">you won&apos;t be charged</b> — nothing has been submitted.
              Your free check stays yours.
            </p>
            <p className="font-sans text-[14px] text-[#3F4B58] leading-relaxed mb-3">
              You can still use these free, official resources on your own:
            </p>
            <ul className="text-left max-w-[400px] mx-auto space-y-2 mb-6 text-[13.5px] text-[#26313C] list-disc pl-5">
              {country === "US" ? (
                <>
                  <li>
                    <a
                      href="https://www.eeoc.gov/laws/guidance/understanding-waivers-discrimination-claims-employee-severance-agreements"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0C8F72] font-bold hover:underline"
                    >
                      EEOC — waivers in severance agreements (eeoc.gov) →
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.dol.gov/agencies/eta/layoffs/warn"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0C8F72] font-bold hover:underline"
                    >
                      U.S. DOL — WARN Act (dol.gov) →
                    </a>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <a
                      href="https://www.ontario.ca/document/your-guide-employment-standards-act-0/severance-pay"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0C8F72] font-bold hover:underline"
                    >
                      Ontario ESA — Severance &amp; Notice Rights (ontario.ca) →
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.canlii.org"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0C8F72] font-bold hover:underline"
                    >
                      CanLII — Canadian Employment Law Decisions →
                    </a>
                  </li>
                </>
              )}
              <li>A licensed employment lawyer / attorney — many offer a free first call</li>
            </ul>

            <div className="flex flex-wrap gap-2.5 justify-center">
              <button
                type="button"
                onClick={() => setIsDeclined(false)}
                className="px-5 py-2.5 rounded-[9px] border border-[#D8D3C8] bg-white font-sans font-[700] text-[14px] text-[#062C55] hover:bg-[#F6F4EF] transition"
              >
                ← Review the terms again
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-[9px] bg-[#062C55] hover:bg-[#041D38] text-white font-sans font-[800] text-[14px] transition"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Modal Body: Left sidebar + Right document */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-[230px_1fr] min-h-0 overflow-hidden">
              {/* Sidebar */}
              <div className="border-b md:border-b-0 md:border-r border-[#E7E4DD] p-3 overflow-x-auto md:overflow-y-auto bg-[#FAFCFB] flex md:flex-col gap-1.5 shrink-0">
                {TC_DOCUMENTS.map((doc, idx) => {
                  const isAccepted = Boolean(acceptedMap[doc.id]);
                  const isActive = idx === activeTab;
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => handleSelectTab(idx)}
                      className={`flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-[9px] text-[13px] font-sans leading-tight transition select-none ${
                        isActive
                          ? "bg-[#E7F2EC] text-[#062C55] font-[700]"
                          : "text-[#17242F] hover:bg-[#EEF4F0] font-normal"
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 border ${
                          isAccepted
                            ? "bg-[#0EB28D] border-[#0EB28D] text-white"
                            : "border-[#C3CCD3] text-[#5A6B78] bg-white"
                        }`}
                      >
                        {isAccepted ? "✓" : idx + 1}
                      </span>
                      <span className="truncate">{doc.title}</span>
                    </button>
                  );
                })}
              </div>

              {/* Document Pane */}
              <div
                ref={docContainerRef}
                onScroll={handleScroll}
                className="p-5 sm:p-7 overflow-y-auto font-sans text-[13.5px] leading-[1.6] text-[#17242F] min-h-0"
              >
                <h4 className="font-serif font-[600] text-[18px] text-[#062C55] mb-1">
                  {currentDoc.title}
                </h4>
                <div className="font-sans text-[12px] text-[#5A6B78] mb-4">
                  {currentDoc.effectiveDate}
                </div>

                <div className="space-y-4">
                  {currentDoc.sections.map((sec, sIdx) => (
                    <div key={sIdx}>
                      {sec.heading && (
                        <h5 className="font-sans font-[700] text-[13.5px] text-[#062C55] mb-1.5 mt-3">
                          {sec.heading}
                        </h5>
                      )}
                      {sec.paragraphs.map((p, pIdx) => {
                        if (typeof p === "string") {
                          return (
                            <p key={pIdx} className="mb-2 text-[#17242F]">
                              {p}
                            </p>
                          );
                        }
                        return (
                          <div key={pIdx} className="flex items-start gap-2 mb-1.5 pl-2 text-[#17242F]">
                            <span className="text-[#0EB28D] font-bold">•</span>
                            <span>{p.bullet}</span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Endmark */}
                <div className="mt-6 pt-3 border-t border-[#E7E4DD] font-sans italic text-[12px] text-[#5A6B78]">
                  You&apos;ve reached the end of this document. You can now accept it.
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-[#E7E4DD] bg-white shrink-0">
              {/* Hint */}
              <div className="text-[12px] text-[#5A6B78] text-center sm:text-left">
                {isCurrentAccepted ? (
                  <span className="text-[#0C8F72] font-semibold">
                    Already accepted — pick another document or continue.
                  </span>
                ) : isCurrentScrolled ? (
                  <span className="text-[#0C8F72] font-bold">
                    Ready — tap I Accept to continue.
                  </span>
                ) : (
                  <span>
                    <b className="text-[#B07A00]">Scroll to the bottom</b> to accept.
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsDeclined(true)}
                  className="px-4 py-2.5 rounded-[9px] border border-[#D8D3C8] bg-white hover:border-[#C3CCD3] hover:text-[#062C55] text-[#5A6B78] font-sans font-[700] text-[13.5px] transition"
                >
                  Decline
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2.5 rounded-[9px] border border-[#D8D3C8] bg-white hover:border-[#0EB28D] text-[#062C55] font-sans font-[700] text-[13.5px] transition flex items-center gap-1.5"
                  title="Download a copy of this document"
                >
                  <span>↓</span> Download
                </button>

                <button
                  type="button"
                  disabled={!isCurrentScrolled && !isCurrentAccepted}
                  onClick={handleAcceptCurrent}
                  className={`px-5 py-2.5 rounded-[9px] font-sans font-[800] text-[13.5px] transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    isCurrentAccepted
                      ? "bg-gradient-to-b from-[#0EB28D] to-[#0C8F72] text-white"
                      : "bg-[#062C55] hover:bg-[#041D38] text-white"
                  }`}
                >
                  {isCurrentAccepted ? "Accepted ✓" : "I Accept"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

