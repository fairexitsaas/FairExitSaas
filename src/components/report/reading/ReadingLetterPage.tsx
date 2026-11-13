"use client";

import React, { useState, useEffect } from "react";
import { getReportInputs, saveReportInputs, ReportInputs } from "@/lib/report-storage";
import { fairexit, FairExitApiError } from "@/lib/api/fairexit";
import { startPollLoop } from "@/lib/reportPolling";
import { useErrorModal } from "@/context/ErrorModalContext";
import { notifySuccess } from "@/lib/notifications";
import FullScreenLoadingExperience from "@/components/report/loading/FullScreenLoadingExperience";

interface ReadingLetterPageProps {
  caseId?: string | null;
  cs?: { id?: string; country?: string; jurisdiction?: { name?: string; code?: string }; [key: string]: unknown } | null;
  onDone?: () => void;
}

export default function ReadingLetterPage({
  caseId,
  cs,
  onDone,
}: ReadingLetterPageProps) {
  const { showErrorModal } = useErrorModal();
  const [data] = useState<ReportInputs>(() => getReportInputs());

  const isUS =
    data.country === "US" ||
    cs?.country === "US" ||
    (typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("country")?.toUpperCase() ===
        "US");

  const [readState, setReadState] = useState<{ done: boolean; failed: boolean; error?: string }>({
    done: false,
    failed: false,
  });
  const [pollVersion, setPollVersion] = useState(0);

  // Poll backend status using startPollLoop (single loop, non-overlapping, abortable)
  useEffect(() => {
    const activeCaseId = caseId || cs?.id;
    if (!activeCaseId) {
      showErrorModal({
        title: "Case Not Found",
        message: "No case identifier was found. Please return to the upload step and add your documents.",
        stage: "Document Reading",
      });
      setReadState({ done: false, failed: true, error: "Case identifier missing" });
      return;
    }

    const stopPolling = startPollLoop({
      poll: (signal) => fairexit.readStatus(activeCaseId, signal),
      intervalMs: 3000,
      maxRetries: 2,
      isTerminal: (res) => res.done || res.failed,
      onValue: (res) => {
        if (res.done) {
          setReadState({ done: true, failed: false });
          notifySuccess("Documents read and analyzed successfully!");

          // Change 23: Sync extracted facts to persistent storage
          fairexit
            .getExtractedFacts(activeCaseId)
            .then((factsRes) => {
              const facts = factsRes?.facts || [];
              const fOffer = facts.find((f: any) => f.key === "offer_amount");
              const fSignBy = facts.find((f: any) => f.key === "sign_by");
              const fDays = facts.find((f: any) => f.key === "days_to_decide");
              const fRelease = facts.find((f: any) => f.key === "release_required");
              const fName = facts.find((f: any) => f.key === "employee_name");
              const fEmployer = facts.find((f: any) => f.key === "employer_name");

              let extractedSignBy: string | undefined = undefined;
              if (fSignBy?.value) {
                extractedSignBy = String(fSignBy.value);
              } else if (fDays?.value) {
                extractedSignBy = `${fDays.value} days to decide`;
              }

              const updates: Partial<ReportInputs> = {
                documentsExtracted: true,
                extractionStatus: "success",
                documentOfferFound: Boolean(fOffer?.value),
                documentReleaseFound: Boolean(fRelease?.value),
                documentSignByFound: Boolean(extractedSignBy),
              };

              if (fOffer?.value) {
                const num =
                  typeof fOffer.value === "number"
                    ? fOffer.value
                    : parseFloat(String(fOffer.value).replace(/[^0-9.]/g, ""));
                if (num > 0) {
                  updates.offer = num;
                  updates.offerSource = "document";
                }
              }
              if (extractedSignBy) {
                updates.signByDays = extractedSignBy;
                updates.signBySource = "document";
              }
              if (fRelease?.value) {
                updates.releaseRequired = String(fRelease.value);
                updates.releaseRequiredSource = "document";
              }
              if (fDays?.value) {
                updates.daysToDecide = fDays.value as number | string;
              }
              if (fName?.value) updates.employee_name = String(fName.value);
              if (fEmployer?.value) updates.employer_name = String(fEmployer.value);

              saveReportInputs(updates);
            })
            .catch((err) => {
              console.warn("Could not sync extracted facts", err);
            })
            .finally(() => {
              if (onDone) onDone();
            });
        } else if (res.failed) {
          saveReportInputs({
            documentsExtracted: false,
            extractionStatus: "failed",
            documentOfferFound: false,
            documentReleaseFound: false,
            documentSignByFound: false,
            signByDays: undefined,
            releaseRequired: undefined,
            ...(data.offerSource === "document" ? { offer: undefined } : {}),
          });
          const msg = res.error || res.statusDetail || "Scanner could not read documents. Please ensure clear, readable pages.";
          setReadState({ done: false, failed: true, error: msg });
        }
      },
      onError: (error) => {
        const apiErr =
          error instanceof FairExitApiError
            ? error
            : new FairExitApiError(0, error instanceof Error ? error.message : "Document reading status check failed");
        setReadState({ done: false, failed: true, error: apiErr.message });
      },
    });

    return () => {
      stopPolling();
    };
  }, [caseId, cs?.id, onDone, pollVersion, showErrorModal, data.offerSource]);

  const handleRetry = async () => {
    const activeCaseId = caseId || cs?.id;
    if (!activeCaseId) return;
    setReadState({ done: false, failed: false });
    try {
      await fairexit.startRead(activeCaseId);
      setPollVersion((v) => v + 1);
    } catch (e: unknown) {
      const apiErr =
        e instanceof FairExitApiError
          ? e
          : new FairExitApiError(0, e instanceof Error ? e.message : "Retry failed");
      setReadState({ done: false, failed: true, error: apiErr.message });
    }
  };

  const hasContract = Boolean(
    data.hasContract ?? (
      ((cs?.documents as any)?.contractPages ? (cs?.documents as any).contractPages > 0 : false) ||
      (Array.isArray((cs?.documents as any)?.uploaded) &&
        (cs?.documents as any).uploaded.some((d: any) => d.kind === "contract")) ||
      (Array.isArray(cs?.documents) && cs.documents.some((d: any) => d.kind === "contract"))
    )
  );

  const regionName = cs?.jurisdiction?.name || (isUS ? data.state : data.provinceName);
  const regionCode =
    (cs as any)?.jurisdiction_code ||
    cs?.jurisdiction?.code ||
    (isUS
      ? data.state
        ? `US-${data.state}`
        : "US-*"
      : data.province
      ? `CA-${data.province}`
      : "CA-ON");

  return (
    <FullScreenLoadingExperience
      mode="reading"
      caseId={caseId || cs?.id}
      hasContract={hasContract}
      jurisdictionName={regionName}
      jurisdictionCode={regionCode}
      isUS={isUS}
      error={readState.failed ? readState.error || "We couldn't read your documents." : null}
      onRetry={handleRetry}
    />
  );
}
