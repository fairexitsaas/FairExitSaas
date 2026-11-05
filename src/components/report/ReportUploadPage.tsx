"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { triggerGetApp } from "@/context/GetAppContext";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  getReportInputs,
  ReportInputs,
} from "@/lib/report-storage";
import { fairexit, FairExitApiError } from "@/lib/api/fairexit";
import { useErrorModal } from "@/context/ErrorModalContext";
import { notifySuccess } from "@/lib/notifications";
import NoContractModal from "@/components/dialogs/NoContractModal";

export interface UploadedFileItem {
  id: string;
  name: string;
  size?: number;
  type: "contract" | "letter" | "other";
  file?: File;
  serverDocId?: string;
  status: "uploading" | "uploaded" | "error";
  error?: string;
}

interface ReportUploadPageProps {
  caseId?: string | null;
  cs?: { id?: string; [key: string]: unknown } | null;
  onContinue?: () => void;
}

function formatDollars(val: number | string | undefined, defaultVal = 0): string {
  const num = typeof val === "number" ? val : parseFloat(String(val || defaultVal).replace(/[^0-9.-]/g, "")) || defaultVal;
  if (num >= 1000) {
    const k = Math.round(num / 1000);
    return `$${k}k`;
  }
  return `$${num.toLocaleString()}`;
}

export default function ReportUploadPage({
  caseId,
  cs,
  onContinue,
}: ReportUploadPageProps) {
  const { showErrorModal } = useErrorModal();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [data] = useState<ReportInputs>(() => getReportInputs());
  const [explainEach, setExplainEach] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dataPrivacyOpen, setDataPrivacyOpen] = useState(false);
  const [noContractModalOpen, setNoContractModalOpen] = useState(false);
  const [contractStatus, setContractStatus] = useState<"none" | "never" | "missing" | "later">("none");
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Upload and flow loading states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingStatusText, setUploadingStatusText] = useState("");
  const [, setUploadingProgress] = useState<{ current: number; total: number } | null>(null);
  const [isLoadingExistingDocs, setIsLoadingExistingDocs] = useState(true);
  const [updatingDocId, setUpdatingDocId] = useState<string | null>(null);
  const [removingDocId, setRemovingDocId] = useState<string | null>(null);

  const autoProceedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Uploaded files list starts empty initially
  const [files, setFiles] = useState<UploadedFileItem[]>([]);

  // Refs to avoid stale closures in timeouts and async handlers
  const filesRef = useRef<UploadedFileItem[]>(files);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const contractStatusRef = useRef(contractStatus);
  useEffect(() => {
    contractStatusRef.current = contractStatus;
  }, [contractStatus]);

  // Cleanup auto-proceed timer on unmount
  useEffect(() => {
    return () => {
      if (autoProceedTimeoutRef.current) {
        clearTimeout(autoProceedTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const activeCaseId = caseId || cs?.id;
    if (activeCaseId) {
      setIsLoadingExistingDocs(true);
      fairexit.documents(activeCaseId)
        .then((res) => {
          interface ServerDoc {
            id: string;
            status?: string;
            fileName?: string;
            kind?: string;
          }
          if (res?.documents && Array.isArray(res.documents) && res.documents.length > 0) {
            const loaded: UploadedFileItem[] = (res.documents as ServerDoc[])
              .filter((d) => d.status === "uploaded")
              .map((d) => ({
                id: d.id,
                name: d.fileName || (d.kind === "contract" ? "Employment-Contract.pdf" : "Severance-Offer.pdf"),
                type: d.kind === "contract" ? "contract" : "letter",
                serverDocId: d.id,
                status: "uploaded",
              }));
            if (loaded.length > 0) {
              setFiles(loaded);
            }
          }
          if (res?.contractStatus && ["never", "missing"].includes(res.contractStatus)) {
            setContractStatus(res.contractStatus);
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsLoadingExistingDocs(false);
        });
    } else {
      setIsLoadingExistingDocs(false);
    }
  }, [caseId, cs]);

  const isUS = data.country === "US";
  const country = (isUS ? "US" : "CA") as "CA" | "US";

  // Compute status for the 2 checklist boxes
  const hasContract = files.some((f) => f.type === "contract" && f.status === "uploaded");
  const hasLetter = files.some((f) => f.type === "letter" && f.status === "uploaded");
  const isContractUploading = files.some((f) => f.type === "contract" && f.status === "uploading");
  const isLetterUploading = files.some((f) => f.type === "letter" && f.status === "uploading");
  const bothAdded = hasContract && hasLetter;
  const isContractSatisfied = hasContract || contractStatus !== "none";

  // Formatted sidebar values
  const payFormatted = data.salary
    ? typeof data.salary === "number"
      ? `$${Math.round(data.salary / 1000)}k/yr`
      : String(data.salary)
    : "$110k/yr";

  const offerFormatted = formatDollars(data.offer, 24000);
  const minFormatted = formatDollars(data.statutoryMin, 17000);
  const courtHighFormatted = formatDollars(data.courtAwardHigh, 193000);

  // Stepper labels based on country
  const stepLabels = isUS
    ? ["Situation", "The layoff", "The papers", "Key question", "Details"]
    : ["Eligible", "Basics", "Money", "Key questions", "Details"];

  // Handle file uploads
  const handleFilesAdded = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    if (isUploading || isSubmitting) return;

    setErrorMessage("");

    const validFiles: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (/heic|heif/i.test(file.type) || /\.heic$/i.test(file.name)) {
        setErrorMessage("iPhone HEIC photos are not supported. Please export as JPEG or PDF.");
      } else {
        validFiles.push(file);
      }
    }
    if (validFiles.length === 0) return;

    // Cancel any pending auto-proceed if adding new files
    if (autoProceedTimeoutRef.current) {
      clearTimeout(autoProceedTimeoutRef.current);
      autoProceedTimeoutRef.current = null;
    }
    setIsUploading(true);

    const activeCaseId = caseId || cs?.id;

    // Track current state including previously uploaded files and items in this batch
    let currentHasContract = files.some(
      (f) => f.type === "contract" && (f.status === "uploaded" || f.status === "uploading")
    );
    let currentHasLetter = files.some(
      (f) => f.type === "letter" && (f.status === "uploaded" || f.status === "uploading")
    );

    const pendingItems: UploadedFileItem[] = validFiles.map((file, i) => {
      const lower = file.name.toLowerCase();
      let detectedType: "contract" | "letter" | "other" = "other";

      if (
        lower.includes("severance") ||
        lower.includes("separation") ||
        lower.includes("termination") ||
        lower.includes("release") ||
        lower.includes("exit") ||
        lower.includes("layoff")
      ) {
        detectedType = "letter";
      } else if (
        lower.includes("contract") ||
        lower.includes("offer") ||
        lower.includes("appointment") ||
        lower.includes("agreement") ||
        lower.includes("handbook") ||
        lower.includes("employment")
      ) {
        detectedType = "contract";
      } else {
        if (!currentHasContract) {
          detectedType = "contract";
        } else if (!currentHasLetter) {
          detectedType = "letter";
        } else {
          detectedType = "letter";
        }
      }

      if (detectedType === "contract") currentHasContract = true;
      if (detectedType === "letter") currentHasLetter = true;

      return {
        id: `upload-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        name: file.name,
        size: file.size,
        type: detectedType,
        file,
        status: "uploading",
      };
    });

    // Immediately display the files in the list with loading indicators
    setFiles((prev) => [...prev, ...pendingItems]);

    let anyUploaded = false;

    // Upload each pending file
    for (let i = 0; i < pendingItems.length; i++) {
      const item = pendingItems[i];
      setUploadingStatusText(`Uploading ${item.name} (${i + 1} of ${pendingItems.length})…`);
      setUploadingProgress({ current: i + 1, total: pendingItems.length });

      if (activeCaseId && item.file) {
        try {
          const kind = item.type === "contract" ? "contract" : "letter";
          const res = await fairexit.uploadFile(activeCaseId, kind, item.file);
          const serverDocId = res?.document?.id;

          setFiles((prev) =>
            prev.map((f) =>
              f.id === item.id
                ? { ...f, status: "uploaded", serverDocId }
                : f
            )
          );
          anyUploaded = true;
          notifySuccess(`Uploaded ${item.name}`);
        } catch (e: unknown) {
          const apiErr =
            e instanceof FairExitApiError
              ? e
              : new FairExitApiError(0, e instanceof Error ? e.message : "Upload failed");
          const msg = `Could not upload ${item.name}: ${apiErr.message}`;
          setErrorMessage(msg);

          setFiles((prev) =>
            prev.map((f) =>
              f.id === item.id
                ? { ...f, status: "error", error: apiErr.message }
                : f
            )
          );

          showErrorModal({
            title: "Document Upload Failed",
            message: msg,
            stage: "Document Upload",
            statusCode: apiErr.status,
            requestId: apiErr.requestId,
          });
        }
      } else {
        // Fallback for demo mode
        setFiles((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, status: "uploaded" } : f))
        );
        anyUploaded = true;
      }
    }

    setIsUploading(false);
    setUploadingStatusText("");
    setUploadingProgress(null);

    // Reset file input so select files is ready again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    // Check if both documents are uploaded and trigger the proceed flow
    if (anyUploaded) {
      setTimeout(() => {
        const currentFiles = filesRef.current;
        const currentContractStatus = contractStatusRef.current;
        const contractOk = currentFiles.some(
          (f) => f.type === "contract" && f.status === "uploaded"
        );
        const letterOk = currentFiles.some(
          (f) => f.type === "letter" && f.status === "uploaded"
        );
        const satisfied = (contractOk || currentContractStatus !== "none") && letterOk;

        if (satisfied) {
          if (autoProceedTimeoutRef.current) clearTimeout(autoProceedTimeoutRef.current);
          autoProceedTimeoutRef.current = setTimeout(() => {
            handleContinueRef.current();
          }, 1200);
        }
      }, 50);
    }
  };

  const handleTypeChange = async (id: string, newType: "contract" | "letter" | "other") => {
    if (isUploading || isSubmitting) return;
    if (autoProceedTimeoutRef.current) {
      clearTimeout(autoProceedTimeoutRef.current);
      autoProceedTimeoutRef.current = null;
    }
    setUpdatingDocId(id);

    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, type: newType } : f))
    );
    const activeCaseId = caseId || cs?.id;
    const targetFile = files.find((f) => f.id === id);
    if (activeCaseId && targetFile?.serverDocId && (newType === "contract" || newType === "letter")) {
      try {
        await fairexit.updateDocumentKind(activeCaseId, targetFile.serverDocId, newType);
      } catch (e) {
        console.warn("Failed to update document type on server:", e);
      }
    }
    setUpdatingDocId(null);
  };

  const handleRemoveFile = async (id: string) => {
    if (isUploading || isSubmitting) return;
    if (autoProceedTimeoutRef.current) {
      clearTimeout(autoProceedTimeoutRef.current);
      autoProceedTimeoutRef.current = null;
    }
    setRemovingDocId(id);

    const targetFile = files.find((f) => f.id === id);
    setFiles((prev) => prev.filter((f) => f.id !== id));
    const activeCaseId = caseId || cs?.id;
    if (activeCaseId && targetFile?.serverDocId) {
      try {
        await fairexit.removeDocument(activeCaseId, targetFile.serverDocId);
      } catch (e) {
        console.warn("Failed to remove document on server:", e);
      }
    }
    setRemovingDocId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isUploading || isSubmitting) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isUploading || isSubmitting) return;
    if (e.dataTransfer.files) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  // No Contract Modal Handlers
  const handleSelectNeverSigned = async () => {
    setContractStatus("never");
    const activeCaseId = caseId || cs?.id;
    if (activeCaseId) {
      try {
        await fairexit.setContractStatus(activeCaseId, "never");
      } catch (e) {
        console.warn("setContractStatus error:", e);
      }
    }
  };

  const handleSelectMissingOrLater = async (status: "missing" | "later") => {
    setContractStatus(status);
    const activeCaseId = caseId || cs?.id;
    if (activeCaseId) {
      try {
        await fairexit.setContractStatus(activeCaseId, "missing");
      } catch (e) {
        console.warn("setContractStatus error:", e);
      }
    }
  };

  const handleAddLater = async () => {
    setContractStatus("later");
    const activeCaseId = caseId || cs?.id;
    if (activeCaseId) {
      try {
        await fairexit.setContractStatus(activeCaseId, "missing");
      } catch (e) {
        console.warn("setContractStatus error:", e);
      }
    }
  };

  const handleContinue = async () => {
    if (isSubmitting) return;

    if (autoProceedTimeoutRef.current) {
      clearTimeout(autoProceedTimeoutRef.current);
      autoProceedTimeoutRef.current = null;
    }

    const currentFiles = filesRef.current;
    const currentContractStatus = contractStatusRef.current;
    const currentHasContract = currentFiles.some(
      (f) => f.type === "contract" && f.status === "uploaded"
    );
    const currentHasLetter = currentFiles.some(
      (f) => f.type === "letter" && f.status === "uploaded"
    );
    const currentSatisfied =
      (currentHasContract || currentContractStatus !== "none") && currentHasLetter;

    if (!currentSatisfied && currentFiles.length === 0) return;

    setIsSubmitting(true);
    setErrorMessage("");

    const activeCaseId = caseId || cs?.id;
    if (activeCaseId) {
      try {
        // Sync document kinds with the server first if any kinds changed
        const serverDocData = await fairexit.documents(activeCaseId).catch(() => null);
        if (serverDocData?.documents) {
          for (const f of currentFiles) {
            if (f.serverDocId && (f.type === "contract" || f.type === "letter")) {
              const matched = (serverDocData.documents as Array<{ id: string; kind: string }>).find(
                (d) => d.id === f.serverDocId
              );
              if (matched && matched.kind !== f.type) {
                await fairexit.updateDocumentKind(activeCaseId, f.serverDocId, f.type).catch(() => {});
              }
            }
          }
        }

        // If no contract document is uploaded, ensure contract_status is set on the server
        if (!currentHasContract) {
          if (currentContractStatus === "never") {
            await fairexit.setContractStatus(activeCaseId, "never");
          } else if (currentContractStatus === "missing" || currentContractStatus === "later") {
            await fairexit.setContractStatus(activeCaseId, "missing");
          }
        }

        await fairexit.startRead(activeCaseId);

        setIsSubmitting(false);
        if (onContinue) {
          onContinue();
        } else {
          router.push(`/report?case=${activeCaseId || "demo"}&step=reading`);
        }
      } catch (err: unknown) {
        setIsSubmitting(false);
        const apiErr =
          err instanceof FairExitApiError
            ? err
            : new FairExitApiError(
                0,
                err instanceof Error
                  ? err.message
                  : "Failed to start reading documents. Please check your files."
              );
        setErrorMessage(apiErr.message);
        showErrorModal({
          title: "Document Reading Failed",
          message: apiErr.message,
          stage: "Document Reading",
          statusCode: apiErr.status,
          requestId: apiErr.requestId,
          onRetry: () => handleContinue(),
          retryLabel: "Retry",
        });
        return;
      }
    } else {
      setIsSubmitting(false);
      if (onContinue) {
        onContinue();
      } else {
        router.push(`/report?case=demo&step=reading`);
      }
    }
  };

  const handleContinueRef = useRef(handleContinue);
  useEffect(() => {
    handleContinueRef.current = handleContinue;
  });

  return (
    <div className="min-h-screen bg-[#F6F4EF] text-[#17242F] font-sans antialiased selection:bg-[#0EB28D]/20">
      {/* ── Top Header Navigation ── */}
      <header className="w-full bg-[#F6F4EF]/92 backdrop-blur-md border-b border-[#E7E4DD] px-4 lg:px-[40px] h-[51px] flex items-center">
        <div className="w-full max-w-[1200px] mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center group">
            <Image
              src="/fairexitlogo.png"
              alt="FairExit"
              width={103}
              height={26}
              className="h-[25.97px] w-auto object-contain"
              priority
            />
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-[22px] text-[13.5px] font-[600] text-[#5A6B78]">
            <Link href="/#how" className="hover:text-[#062C55] transition">
              How it works
            </Link>
            <Link href="/#paths" className="hover:text-[#062C55] transition">
              Pricing
            </Link>
            <Link href="/faq" className="hover:text-[#062C55] transition">
              FAQ
            </Link>
            <Link href="/blog" className="hover:text-[#062C55] transition">
              Blog
            </Link>
            <Link href="/about" className="hover:text-[#062C55] transition">
              About
            </Link>
            <button
              type="button"
              onClick={() => triggerGetApp()}
              className="text-[#0C8F72] font-[700] text-[12.5px] hover:underline"
            >
              Get the app
            </button>
            <Link
              href="/"
              className="text-[#5A6B78] hover:text-[#062C55] transition underline text-[13px] font-[600]"
            >
              Exit ✕
            </Link>
          </nav>

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-[36px] h-[36px] flex items-center justify-center rounded-[10px] border border-[#E7E4DD] bg-white text-[#062C55]"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={
                  mobileMenuOpen
                    ? "M6 18L18 6M6 6l12 12"
                    : "M4 6h16M4 12h16M4 18h16"
                }
              />
            </svg>
          </button>
        </div>
      </header>

      {/* ── Stepper Header ── */}
      <section className="w-full max-w-[1200px] mx-auto px-4 lg:px-[80px] pt-[26px]">
        {/* Desktop Stepper (aligned over the 714px left card) */}
        <div className="hidden lg:block w-[714px]">
          {/* Stepper Steps (6 steps: 5 checks + 1 active) */}
          <div className="relative w-full max-w-[694px] mx-auto flex items-start justify-between px-2">
            {stepLabels.map((lbl) => (
              <div key={lbl} className="flex flex-col items-center">
                <div className="w-[18px] h-[18px] rounded-full bg-[#0EB28D] border border-[#0EB28D] flex items-center justify-center text-white text-[10px] font-[800]">
                  ✓
                </div>
                <span className="font-sans font-[600] text-[11px] leading-[17px] text-[#0C8F72] mt-[5.5px]">
                  {lbl}
                </span>
              </div>
            ))}

            {/* Step 6: Your results (Active) */}
            <div className="flex flex-col items-center relative -mt-[2px]">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-[29.5px] h-[29.5px] rounded-full border-[4px] border-[#062C55]/10" />
                <div className="w-[21.5px] h-[21.5px] rounded-full bg-[#062C55] border border-[#062C55] flex items-center justify-center text-white text-[10px] font-[800] z-10">
                  ★
                </div>
              </div>
              <span className="font-sans font-[800] text-[11px] leading-[17px] text-[#062C55] mt-[4px]">
                Your results
              </span>
            </div>
          </div>

          {/* Stepper Progress Line */}
          <div className="relative mt-[10px] w-full max-w-[694px] mx-auto">
            <div className="w-full h-[6px] rounded-[3px] bg-gradient-to-r from-[#0C8F72] to-[#0EB28D] relative overflow-visible">
              <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                <div className="w-[14px] h-[14px] rounded-full bg-[#0EB28D] shadow-[0_0_0_4px_rgba(14,178,141,0.18),0_0_0_8px_rgba(14,178,141,0.08)]" />
              </div>
            </div>
          </div>

          {/* Subheader info line with toggle */}
          <div className="w-full flex items-center justify-between pt-[15.5px] pb-[16px]">
            <span className="font-sans font-[700] text-[12px] leading-[18px] text-[#5A6B78]">
              Your report · Step 1 of 3 · Add your documents
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={explainEach}
              onClick={() => setExplainEach(!explainEach)}
              className="flex items-center gap-2 cursor-pointer focus:outline-none select-none"
            >
              <span
                className={`relative inline-block w-9 h-5 shrink-0 rounded-full transition-colors duration-200 ease-in-out ${
                  explainEach ? "bg-[#0EB28D]" : "bg-[#CFD8DF]"
                }`}
              >
                <span
                  className={`pointer-events-none absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-xs transition-transform duration-200 ease-in-out ${
                    explainEach ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </span>
              <span className="font-sans font-[700] text-[12px] leading-[18px] text-[#0C8F72]">
                Explain each question
              </span>
            </button>
          </div>
        </div>

        {/* Mobile / Tablet Stepper (under lg / 1024px) */}
        <div className="lg:hidden max-w-[500px] mx-auto px-2 pb-2">
          <div className="flex items-center justify-between px-2 mb-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-full bg-[#0EB28D] border border-[#0EB28D] flex items-center justify-center text-white text-[9px] font-extrabold"
              >
                ✓
              </div>
            ))}
            <div className="relative flex items-center justify-center">
              <div className="absolute w-[27px] h-[27px] rounded-full border-[4px] border-[#062C55]/10" />
              <div className="w-[19px] h-[19px] rounded-full bg-[#062C55] border border-[#062C55] flex items-center justify-center text-white text-[9px] font-extrabold z-10">
                ★
              </div>
            </div>
          </div>
          <div className="w-full h-[6px] rounded-[3px] bg-gradient-to-r from-[#0C8F72] to-[#0EB28D] relative">
            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
              <div className="w-[14px] h-[14px] rounded-full bg-[#0EB28D] shadow-[0_0_0_4px_rgba(14,178,141,0.18),0_0_0_8px_rgba(14,178,141,0.08)]" />
            </div>
          </div>
          <div className="text-right mt-1 pr-1">
            <span className="font-sans font-[800] text-[10.5px] text-[#062C55]">
              Your results
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 pb-2 text-[12px] text-[#5A6B78]">
            <span className="font-sans font-[700] text-[12px] leading-[18px] text-[#5A6B78]">
              Your report · Step 1 of 3 · Add your documents
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={explainEach}
              onClick={() => setExplainEach(!explainEach)}
              className="flex items-center gap-2 cursor-pointer focus:outline-none select-none"
            >
              <span
                className={`relative inline-block w-9 h-5 shrink-0 rounded-full transition-colors duration-200 ease-in-out ${
                  explainEach ? "bg-[#0EB28D]" : "bg-[#CFD8DF]"
                }`}
              >
                <span
                  className={`pointer-events-none absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-xs transition-transform duration-200 ease-in-out ${
                    explainEach ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </span>
              <span className="font-sans font-[700] text-[12px] leading-[18px] text-[#0C8F72]">
                Explain each question
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Main Layout: Left Column & Right Sidebar ── */}
      <main className="w-full max-w-[1200px] mx-auto px-4 lg:px-[80px] pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-[714px_300px] gap-[26px] items-start">
          {/* ════════ Left Column: Document Upload Workflow ════════ */}
          <div className="w-full lg:w-[714px] bg-white border border-[#E7E4DD] rounded-[12px] shadow-[0px_18px_40px_-18px_rgba(5,43,84,0.12)] p-5 sm:p-[28px]">
            {/* Pill: Your Severance Report */}
            <div className="w-[161.5px] h-[30.5px] rounded-[6px] border border-[#E7E4DD] bg-white flex items-center justify-center font-sans font-[700] text-[12px] leading-[18px] text-[#062C55] mb-[13.5px]">
              Your Severance Report
            </div>

            {/* Headline */}
            <h1 className="font-serif font-[500] text-[22px] sm:text-[24px] leading-[27px] tracking-[-0.5px] text-[#062C55] mb-[8.5px]">
              Two documents make your report real.
            </h1>

            {/* Explanation paragraph */}
            {isUS ? (
              <p className="font-sans font-normal text-[15px] leading-[24px] text-[#5A6B78] mb-[15px]">
                An attorney reads them <strong className="font-[700] text-[#5A6B78]">together</strong>: your{" "}
                <strong className="font-[700] text-[#5A6B78]">separation agreement</strong> shows the release they want you to
                sign, and your <strong className="font-[700] text-[#5A6B78]">offer letter or contract</strong> shows what was promised
                when you started and whether a non-compete lives. Your free check used your answers; the report uses the paper.
              </p>
            ) : (
              <p className="font-sans font-normal text-[15px] leading-[24px] text-[#5A6B78] mb-[15px]">
                A lawyer reads them <strong className="font-[700] text-[#5A6B78]">together</strong>: your{" "}
                <strong className="font-[700] text-[#5A6B78]">employment contract</strong> decides whether the clause that
                caps you is valid <em className="italic font-normal text-[#5A6B78]">for the job you had</em>, and your{" "}
                <strong className="font-[700] text-[#5A6B78]">severance letter</strong> shows what they&apos;re offering. Your free
                check used your answers; the report uses the paper.
              </p>
            )}

            {/* Amber warning callout */}
            <div className="w-full bg-[#FFF8E8] border-y border-r border-[#ECDCA6] border-l-4 border-l-[#C9A227] rounded-[10px] p-[16px_19px] mb-[16px]">
              <h3 className="font-sans font-[700] text-[13.5px] leading-[20px] text-[#3D3100] mb-[3px]">
                {isUS
                  ? "Your offer letter or contract is the document that decides the most."
                  : "Your employment contract is the document that decides the most."}
              </h3>
              <p className="font-sans font-normal text-[13.5px] leading-[20px] text-[#5A4A12]">
                {isUS ? (
                  <>US law sets no severance amount, so a written contract is what sets your terms: a severance plan, a policy, an offer-letter clause, or a handbook promise. Even when employers say at-will, whether that&apos;s enforceable depends on what you signed.</>
                ) : (
                  <>If it has a termination clause, whether that clause is <em className="italic">valid</em> is what sets your range: a valid one can hold you at the minimum; an invalid one (and many are, under recent case law) reopens the full range. Upload it first.</>
                )}
              </p>
            </div>

            {/* Checklist Box 1: Employment contract / Offer letter */}
            <div
              className={`rounded-[10px] p-[12px_16px] sm:p-[14px_18px] transition-all flex items-center justify-between gap-3 border mb-[12px] ${
                hasContract || contractStatus !== "none"
                  ? "bg-[#F3FAF6] border-[#0EB28D]"
                  : isContractUploading
                  ? "bg-[#F0F8FF] border-[#BDE0FE]"
                  : "bg-white border-[#E7E4DD]"
              }`}
            >
              <div className="flex items-center gap-[12px]">
                <div
                  className={`w-[26px] h-[26px] rounded-[7px] text-white font-sans font-[800] text-[12px] leading-[18px] flex items-center justify-center shrink-0 ${
                    hasContract || contractStatus !== "none"
                      ? "bg-[#0EB28D]"
                      : isContractUploading
                      ? "bg-[#0284C7]"
                      : "bg-[#062C55]"
                  }`}
                >
                  {isContractUploading ? (
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    1
                  )}
                </div>
                <div>
                  <h4 className="font-sans font-[700] text-[14px] leading-[22px] text-[#062C55]">
                    {isUS ? "Offer letter / employment contract" : "Employment contract"}
                  </h4>
                  <p className="font-sans font-normal text-[12px] leading-[17px] text-[#5A6B78]">
                    {isUS
                      ? "Whatever you signed when you started — the handbook section on severance too, if you have it"
                      : "The one for the job you had when you were let go — offer letter counts if that's all you signed"}
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                {isLoadingExistingDocs ? (
                  <div className="w-[69.5px] h-[25px] rounded-[6px] bg-[#F1F3F5] border border-[#E2E6E9] flex items-center justify-center">
                    <span className="w-3 h-3 rounded-full border-2 border-[#8E9CA8] border-t-transparent animate-spin" />
                  </div>
                ) : hasContract || contractStatus !== "none" ? (
                  <div className="w-[69.5px] h-[25px] rounded-[6px] bg-[#E5F5EE] border border-[#C7E6D6] flex items-center justify-center">
                    <span className="font-sans font-[800] text-[11px] leading-[17px] tracking-[0.5px] text-[#0C8F72]">
                      ✓ ADDED
                    </span>
                  </div>
                ) : isContractUploading ? (
                  <div className="min-w-[85px] h-[25px] px-2 rounded-[6px] bg-[#E0F2FE] border border-[#BAE6FD] flex items-center justify-center gap-1.5">
                    <span className="w-3 h-3 rounded-full border-2 border-[#0284C7] border-t-transparent animate-spin shrink-0" />
                    <span className="font-sans font-[800] text-[10px] leading-[17px] tracking-[0.5px] text-[#0284C7]">
                      UPLOADING
                    </span>
                  </div>
                ) : (
                  <div className="w-[69.5px] h-[25px] rounded-[6px] bg-[#FFF8E8] border border-[#EEDDB0] flex items-center justify-center">
                    <span className="font-sans font-[800] text-[11px] leading-[17px] tracking-[0.5px] text-[#8A6400]">
                      NEEDED
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Checklist Box 2: Severance letter / offer (or Separation agreement in US) */}
            <div
              className={`rounded-[10px] p-[12px_16px] sm:p-[14px_18px] transition-all flex items-center justify-between gap-3 border mb-[14px] ${
                hasLetter
                  ? "bg-[#F3FAF6] border-[#0EB28D]"
                  : isLetterUploading
                  ? "bg-[#F0F8FF] border-[#BDE0FE]"
                  : "bg-white border-[#E7E4DD]"
              }`}
            >
              <div className="flex items-center gap-[12px]">
                <div
                  className={`w-[26px] h-[26px] rounded-[7px] text-white font-sans font-[800] text-[12px] leading-[18px] flex items-center justify-center shrink-0 ${
                    hasLetter
                      ? "bg-[#0EB28D]"
                      : isLetterUploading
                      ? "bg-[#0284C7]"
                      : "bg-[#062C55]"
                  }`}
                >
                  {isLetterUploading ? (
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    2
                  )}
                </div>
                <div>
                  <h4 className="font-sans font-[700] text-[14px] leading-[22px] text-[#062C55]">
                    {isUS ? "Separation agreement" : "Severance letter / offer"}
                  </h4>
                  <p className="font-sans font-normal text-[12px] leading-[17px] text-[#5A6B78]">
                    {isUS
                      ? "The release they want you to sign, with the numbers and terms"
                      : "What they handed you — the termination letter if it's the same document"}
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                {isLoadingExistingDocs ? (
                  <div className="w-[69.5px] h-[25px] rounded-[6px] bg-[#F1F3F5] border border-[#E2E6E9] flex items-center justify-center">
                    <span className="w-3 h-3 rounded-full border-2 border-[#8E9CA8] border-t-transparent animate-spin" />
                  </div>
                ) : hasLetter ? (
                  <div className="w-[69.5px] h-[25px] rounded-[6px] bg-[#E5F5EE] border border-[#C7E6D6] flex items-center justify-center">
                    <span className="font-sans font-[800] text-[11px] leading-[17px] tracking-[0.5px] text-[#0C8F72]">
                      ✓ ADDED
                    </span>
                  </div>
                ) : isLetterUploading ? (
                  <div className="min-w-[85px] h-[25px] px-2 rounded-[6px] bg-[#E0F2FE] border border-[#BAE6FD] flex items-center justify-center gap-1.5">
                    <span className="w-3 h-3 rounded-full border-2 border-[#0284C7] border-t-transparent animate-spin shrink-0" />
                    <span className="font-sans font-[800] text-[10px] leading-[17px] tracking-[0.5px] text-[#0284C7]">
                      UPLOADING
                    </span>
                  </div>
                ) : (
                  <div className="w-[69.5px] h-[25px] rounded-[6px] bg-[#FFF8E8] border border-[#EEDDB0] flex items-center justify-center">
                    <span className="font-sans font-[800] text-[11px] leading-[17px] tracking-[0.5px] text-[#8A6400]">
                      NEEDED
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Dropzone / Select Files */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => {
                if (isUploading || isSubmitting) return;
                fileInputRef.current?.click();
              }}
              className={`w-full min-h-[110px] rounded-[9px] transition-all border-2 border-dashed flex flex-col items-center justify-center p-4 mb-[12px] ${
                isUploading || isSubmitting
                  ? "bg-[#F7FAF8] border-[#B8DDD0] cursor-not-allowed opacity-85"
                  : isDragging
                  ? "bg-[#EBF7F2] border-[#0EB28D] scale-[1.01] cursor-pointer"
                  : "bg-[#FAFCFB] border-[#C7E6D6] hover:bg-[#F2F9F5] hover:border-[#0EB28D] cursor-pointer"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                disabled={isUploading || isSubmitting}
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt"
                className="hidden"
                onChange={(e) => handleFilesAdded(e.target.files)}
              />
              {isUploading ? (
                <div className="flex flex-col items-center justify-center text-center py-2 animate-fadeIn">
                  <div className="w-6 h-6 border-2 border-[#0EB28D] border-t-transparent rounded-full animate-spin mb-2" />
                  <h4 className="font-sans font-[700] text-[14.5px] text-[#062C55]">
                    {uploadingStatusText || "Uploading documents…"}
                  </h4>
                  <p className="font-sans text-[12px] text-[#5A6B78] mt-1">
                    Please wait while your files are uploaded. Selecting files is temporarily disabled.
                  </p>
                </div>
              ) : isSubmitting ? (
                <div className="flex flex-col items-center justify-center text-center py-2 animate-fadeIn">
                  <div className="w-6 h-6 border-2 border-[#0EB28D] border-t-transparent rounded-full animate-spin mb-2" />
                  <h4 className="font-sans font-[700] text-[14.5px] text-[#062C55]">
                    Reading your documents…
                  </h4>
                  <p className="font-sans text-[12px] text-[#0C8F72] mt-1">
                    Analyzing clauses and preparing your report
                  </p>
                </div>
              ) : (
                <>
                  <h4 className="font-sans font-[700] text-[15.5px] leading-[24px] text-[#062C55] text-center">
                    {bothAdded
                      ? "Add another document or replacement file"
                      : files.length === 1
                      ? files[0].type === "contract"
                        ? isUS
                          ? "Now add your separation agreement, or tap to select"
                          : "Now add your severance letter, or tap to select"
                        : isUS
                        ? "Now add your offer letter or contract, or tap to select"
                        : "Now add your employment contract, or tap to select"
                      : isUS
                      ? "Drop your two documents here, or tap to add"
                      : "Drop files here, or tap to add"}
                  </h4>
                  <p className="font-sans font-normal text-[12.5px] leading-[20px] text-[#5A6B78] mt-[2px]">
                    PDF, Word or photos
                  </p>
                </>
              )}
            </div>

            {/* AI Reading Explanation Box */}
            <div className="w-full min-h-[80.5px] bg-[#F7F9FB] border border-[#D9E2EA] rounded-[10px] p-[13px_15px] flex items-start gap-[12px] mb-[14px]">
              <div className="w-[18px] h-[18px] shrink-0 mt-[2px] text-[#0C8F72]">
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
              </div>
              <div className="font-sans font-normal text-[12.5px] leading-[19px] text-[#3B4B59]">
                <strong className="font-[700] text-[#062C55]">How we read these:</strong> AI pulls out the key terms and
                we check them against official {isUS ? "federal and state" : "provincial"} rules. It can misread things, so you&apos;ll review
                everything we found on the next screen. Documents are deleted 30 days after your report is ready.{" "}
                <button
                  type="button"
                  onClick={() => setDataPrivacyOpen(true)}
                  className="font-normal text-[#0C8F72] underline hover:text-[#062C55] transition ml-1 cursor-pointer"
                >
                  How we handle your data
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="bg-[#FBECEB] text-[#A3231F] text-[13px] p-3 rounded-[9px] border border-[#F5C2C0] mb-[12px]">
                {errorMessage}
              </div>
            )}

            {/* ── Uploaded File Cards (Tracks and Classifies Each Document) ── */}
            {files.length > 0 && (
              <div className="space-y-[12px] mb-[14px]">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className={`w-full rounded-[10px] p-[12px_16px] transition-all border ${
                      file.status === "uploading"
                        ? "bg-[#F7FAFD] border-[#BDE0FE]"
                        : file.status === "error"
                        ? "bg-[#FDF3F2] border-[#F5C2C0]"
                        : "bg-[#EEF8F3] border-[#C7E6D6]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-[8px]">
                      <div className="flex items-center gap-[10px] overflow-hidden">
                        {file.status === "uploading" ? (
                          <span className="w-4 h-4 rounded-full border-2 border-[#0284C7] border-t-transparent animate-spin shrink-0" />
                        ) : file.status === "error" ? (
                          <span className="text-[13.5px] text-[#A3231F]" aria-hidden>
                            ⚠️
                          </span>
                        ) : (
                          <span className="text-[13.5px] text-[#17242F]" aria-hidden>
                            ✅
                          </span>
                        )}
                        <span className="font-sans font-[600] text-[13.5px] leading-[21px] text-[#062C55] truncate">
                          {file.name}
                        </span>
                        {file.status === "uploading" && (
                          <span className="font-sans font-[700] text-[11px] leading-[16px] text-[#0284C7] bg-[#E0F2FE] px-2 py-0.5 rounded-[5px] shrink-0">
                            Uploading…
                          </span>
                        )}
                        {file.status === "error" && (
                          <span className="font-sans font-[700] text-[11px] leading-[16px] text-[#A3231F] bg-[#FBECEB] px-2 py-0.5 rounded-[5px] shrink-0">
                            Failed
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove ${file.name}`}
                        disabled={isUploading || isSubmitting || removingDocId === file.id}
                        onClick={() => handleRemoveFile(file.id)}
                        className="text-[#9AA7B2] hover:text-[#D42E2B] disabled:opacity-40 disabled:cursor-not-allowed p-1 rounded-md transition text-[13px] font-bold cursor-pointer"
                      >
                        {removingDocId === file.id ? (
                          <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-[#9AA7B2] border-t-transparent animate-spin" />
                        ) : (
                          "✕"
                        )}
                      </button>
                    </div>

                    {file.status === "error" && file.error && (
                      <p className="text-[12px] text-[#A3231F] mb-2">{file.error}</p>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-[6px]">
                        <label
                          htmlFor={`select-${file.id}`}
                          className="block font-sans font-[600] text-[12px] leading-[18px] text-[#5A6B78]"
                        >
                          Document type
                        </label>
                        {updatingDocId === file.id && (
                          <span className="flex items-center gap-1 text-[11px] text-[#0C8F72] font-[600]">
                            <span className="w-2.5 h-2.5 rounded-full border-2 border-[#0C8F72] border-t-transparent animate-spin" />
                            Updating…
                          </span>
                        )}
                      </div>
                      <select
                        id={`select-${file.id}`}
                        value={file.type}
                        disabled={file.status === "uploading" || isUploading || isSubmitting || updatingDocId === file.id}
                        onChange={(e) =>
                          handleTypeChange(
                            file.id,
                            e.target.value as "contract" | "letter" | "other"
                          )
                        }
                        className="w-full h-[32px] bg-white border border-[#CDD3D8] disabled:bg-[#F2F4F7] disabled:text-[#8896A0] disabled:cursor-not-allowed rounded-[9px] px-[10px] font-sans font-[600] text-[12.5px] leading-[18px] text-[#062C55] focus:outline-none focus:border-[#0EB28D] transition"
                      >
                        <option value="contract">
                          {isUS ? "Offer letter / employment agreement" : "Employment contract"}
                        </option>
                        <option value="letter">
                          {isUS ? "Separation agreement / release" : "Severance offer / agreement"}
                        </option>
                        <option value="other">Other / supporting document</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Success Card When Both Documents Are Uploaded ── */}
            {(bothAdded || (hasLetter && contractStatus !== "none")) && (
              <div className="w-full bg-[#E5F5EE] border border-[#0EB28D] rounded-[10px] p-[14px_18px] flex items-center justify-between gap-3 mb-[14px] animate-fadeIn shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#0EB28D] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    ✓
                  </div>
                  <div>
                    <h4 className="font-sans font-[700] text-[14px] text-[#062C55]">
                      Both documents uploaded successfully!
                    </h4>
                    <p className="font-sans text-[12.5px] text-[#0C8F72]">
                      Your documents are ready. Click below to get your report.
                    </p>
                  </div>
                </div>
                <span className="text-[12px] font-[700] text-[#0C8F72] bg-white px-2.5 py-1 rounded-md border border-[#C7E6D6] shrink-0">
                  Ready ✓
                </span>
              </div>
            )}

            {/* Continue CTA Button & Centered Footnote */}
            <div>
              <button
                type="button"
                onClick={() => handleContinue()}
                disabled={
                  isSubmitting ||
                  isUploading ||
                  (!bothAdded && contractStatus === "none")
                }
                className={`w-full h-[48px] rounded-[9px] font-sans font-[700] text-[16px] leading-[22px] transition duration-150 flex items-center justify-center gap-2 ${
                  isSubmitting
                    ? "bg-[#0EB28D] text-white cursor-wait opacity-95 shadow-[0px_18px_40px_-18px_rgba(5,43,84,0.12)]"
                    : isUploading
                    ? "bg-[#96DAC9] text-white cursor-not-allowed opacity-90 shadow-none"
                    : bothAdded || contractStatus !== "none"
                    ? "bg-[#0EB28D] hover:bg-[#0C8F72] text-white shadow-[0px_18px_40px_-18px_rgba(5,43,84,0.12)] cursor-pointer"
                    : "bg-[#96DAC9] text-white cursor-not-allowed opacity-90 shadow-none"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <span className="inline-block w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Reading your documents…
                  </>
                ) : isUploading ? (
                  <>
                    <span className="inline-block w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Uploading documents…
                  </>
                ) : bothAdded ? (
                  "Get my report →"
                ) : hasLetter && contractStatus === "never" ? (
                  "Get my report without a contract →"
                ) : hasLetter && (contractStatus === "missing" || contractStatus === "later") ? (
                  "Get my report without it →"
                ) : (
                  "Get my report →"
                )}
              </button>

              {/* Centered Footnote Matching Photo 10 */}
              <div className="mt-[12px] text-center">
                <p className="font-sans font-normal text-[13px] leading-[20px] text-[#5A6B78]">
                  {isUS
                    ? "Both documents are required. Can't find your offer letter or contract? Ask HR for a copy."
                    : "Both documents are required. Can't find your employment contract? Ask HR for a copy."}
                </p>
                <button
                  type="button"
                  onClick={() => setNoContractModalOpen(true)}
                  className="mt-[4px] font-sans font-[700] text-[13px] leading-[20px] text-[#0C8F72] hover:text-[#062C55] hover:underline cursor-pointer inline-block"
                >
                  I don&apos;t have one
                </button>
              </div>
            </div>
          </div>

          {/* ════════ Right Column: YOUR DETAILS SO FAR (Summary Sidebar) ════════ */}
          <aside className="w-full lg:w-[300px] shrink-0 bg-[#EEF1F4] border border-[#DDE3E9] rounded-[12px] p-[19px]">
            <div className="font-sans font-[800] text-[11px] leading-[17px] tracking-[0.5px] text-[#5A6B78] uppercase mb-[4px]">
              YOUR DETAILS SO FAR
            </div>
            <h2 className="font-serif font-normal text-[16px] leading-[25px] text-[#062C55] mb-[12px]">
              FairExit summary
            </h2>

            {/* Key-Value Summary List */}
            <div className="text-[13px] divide-y divide-[#D3DAE1]">
              <div className="flex items-center justify-between py-[7px]">
                <span className="font-sans font-normal text-[13px] leading-[20px] text-[#5A6B78]">Union member</span>
                <span className="font-sans font-[700] text-[13px] leading-[20px] text-[#062C55]">{data.union || "No"}</span>
              </div>

              <div className="flex items-center justify-between py-[7px]">
                <span className="font-sans font-normal text-[13px] leading-[20px] text-[#5A6B78]">Employment</span>
                <span className="font-sans font-[700] text-[13px] leading-[20px] text-[#062C55]">{data.employment || "Regular employee"}</span>
              </div>

              <div className="flex items-center justify-between py-[7px]">
                <span className="font-sans font-normal text-[13px] leading-[20px] text-[#5A6B78]">{isUS ? "State" : "Province"}</span>
                <span className="font-sans font-[700] text-[13px] leading-[20px] text-[#062C55]">
                  {isUS ? data.state || "California" : data.provinceName || "Ontario"}
                </span>
              </div>

              <div className="flex items-center justify-between py-[7px]">
                <span className="font-sans font-normal text-[13px] leading-[20px] text-[#5A6B78]">Age</span>
                <span className="font-sans font-[700] text-[13px] leading-[20px] text-[#062C55]">{data.age || "52"}</span>
              </div>

              <div className="flex items-center justify-between py-[7px]">
                <span className="font-sans font-normal text-[13px] leading-[20px] text-[#5A6B78]">Years of service</span>
                <span className="font-sans font-[700] text-[13px] leading-[20px] text-[#062C55]">{data.years || (isUS ? 9 : 14)} yrs</span>
              </div>

              <div className="flex items-center justify-between py-[7px]">
                <span className="font-sans font-normal text-[13px] leading-[20px] text-[#5A6B78]">Pay</span>
                <span className="font-sans font-[700] text-[13px] leading-[20px] text-[#062C55]">{payFormatted}</span>
              </div>

              <div className="flex items-start justify-between py-[7px]">
                <span className="font-sans font-normal text-[13px] leading-[20px] text-[#5A6B78]">Occupation</span>
                <span className="font-sans font-[700] text-[13px] leading-[20px] text-[#062C55] text-right max-w-[150px]">
                  {data.role || "Middle management / Senior / Director"}
                </span>
              </div>

              <div className="flex items-center justify-between py-[7px]">
                <span className="font-sans font-normal text-[13px] leading-[20px] text-[#5A6B78]">Employer payroll ≥ $2.5M</span>
                <span className="font-sans font-[700] text-[13px] leading-[20px] text-[#062C55]">{data.payroll || "Not sure"}</span>
              </div>

              <div className="flex items-center justify-between py-[7px]">
                <span className="font-sans font-normal text-[13px] leading-[20px] text-[#5A6B78]">Other pay</span>
                <span className="font-sans font-[700] text-[13px] leading-[20px] text-[#062C55]">{data.otherPay || "None"}</span>
              </div>

              <div className="flex items-center justify-between py-[7px]">
                <span className="font-sans font-normal text-[13px] leading-[20px] text-[#5A6B78]">New job yet?</span>
                <span className="font-sans font-[700] text-[13px] leading-[20px] text-[#062C55]">{data.newJob || "Not yet"}</span>
              </div>

              <div className="flex items-center justify-between py-[7px]">
                <span className="font-sans font-normal text-[13px] leading-[20px] text-[#5A6B78]">Min-only clause</span>
                <span className="font-sans font-[700] text-[13px] leading-[20px] text-[#062C55]">{data.minClause || "No"}</span>
              </div>

              <div className="flex items-center justify-between py-[7px]">
                <span className="font-sans font-normal text-[13px] leading-[20px] text-[#5A6B78]">Contract</span>
                <span className="font-sans font-[700] text-[13px] leading-[20px] text-[#062C55]">{data.contract || "Signed · role changed"}</span>
              </div>

              <div className="flex items-center justify-between py-[7px]">
                <span className="font-sans font-normal text-[13px] leading-[20px] text-[#5A6B78]">How it ended</span>
                <span className="font-sans font-[700] text-[13px] leading-[20px] text-[#062C55]">{data.howEnded || "Laid off"}</span>
              </div>

              <div className="flex items-center justify-between py-[7px]">
                <span className="font-sans font-normal text-[13px] leading-[20px] text-[#5A6B78]">Similar jobs nearby</span>
                <span className="font-sans font-[700] text-[13px] leading-[20px] text-[#062C55]">{data.market || "Some"}</span>
              </div>

              <div className="flex items-center justify-between py-[7px]">
                <span className="font-sans font-normal text-[13px] leading-[20px] text-[#5A6B78]">Anything flagged</span>
                <span className="font-sans font-[700] text-[13px] leading-[20px] text-[#062C55]">{data.flagged || "Nothing unusual"}</span>
              </div>

              <div className="flex items-center justify-between py-[7px]">
                <span className="font-sans font-normal text-[13px] leading-[20px] text-[#5A6B78]">Offer</span>
                <span className="font-sans font-[700] text-[13px] leading-[20px] text-[#062C55]">{offerFormatted}</span>
              </div>
            </div>

            {/* Bottom LIVE ESTIMATE Box */}
            <div className="mt-[16px] pt-[12px] border-t border-[#D3DAE1]">
              <div className="font-sans font-[800] text-[10.5px] leading-[16px] tracking-[0.5px] text-[#5A6B78] uppercase mb-[2px]">
                LIVE ESTIMATE · NOT WHAT YOU&apos;RE OWED
              </div>
              <div className="font-serif font-[600] text-[20px] leading-[23px] text-[#0C8F72] mb-[3px]">
                {minFormatted} – {courtHighFormatted}
              </div>
              <div className="font-sans font-normal text-[11.5px] leading-[16px] text-[#5A6B78] mb-[2px]">
                {data.noticeWeeks || 8} wks notice · court-awarded {data.courtMonths || "15–21 mo"}
              </div>
              <div className="font-sans text-[11.5px] leading-[16px] text-[#5A6B78] mb-[12px]">
                <span className="font-[700]">Your offer {offerFormatted}</span> — near the floor
              </div>

              {/* Status pill */}
              <div className="w-full h-[36.5px] rounded-[9px] bg-[#E5F5EE] border border-[#C7E6D6] flex items-center justify-center text-[#0C8F72] font-sans font-[700] text-[12px] leading-[18px]">
                ✓ Enough to show your results
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* ── No Contract Modal ("No employment contract?" / "No offer letter or agreement?") ── */}
      <NoContractModal
        isOpen={noContractModalOpen}
        onClose={() => setNoContractModalOpen(false)}
        country={country}
        onSelectNeverSigned={handleSelectNeverSigned}
        onSelectMissingOrLater={handleSelectMissingOrLater}
        onAddLater={handleAddLater}
      />

      {/* ── Data Privacy Modal ── */}
      {dataPrivacyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#062C55]/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E7E4DD] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[18px] font-bold text-[#062C55]">
                How we handle your data
              </h3>
              <button
                type="button"
                onClick={() => setDataPrivacyOpen(false)}
                className="text-[#9AA7B2] hover:text-[#062C55] text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="text-[13.5px] leading-relaxed text-[#5A6B78] space-y-3">
              <p>
                <strong>Encrypted in transit and at rest:</strong> All documents you upload are encrypted using industry-standard AES-256 encryption.
              </p>
              <p>
                <strong>Automated 30-day deletion:</strong> Your files are stored strictly to generate and display your report. Exactly 30 days after your report is ready, all uploaded documents are permanently deleted from our servers.
              </p>
              <p>
                <strong>Never used for model training:</strong> Your documents and personal information are never used to train public AI models or sold to any third party.
              </p>
              <p>
                <strong>Confidential legal collaboration:</strong> If you choose to share your report with a lawyer through FairExit, only the verified lawyer receives access with your explicit consent.
              </p>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setDataPrivacyOpen(false)}
                className="bg-[#0EB28D] hover:bg-[#0C8F72] text-white font-bold text-[13.5px] px-5 py-2.5 rounded-xl transition cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
