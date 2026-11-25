import { Suspense } from "react";
import { redirect, notFound } from "next/navigation";

export const instant = false;

type Props = { params: Promise<{ id: string }> };

async function resolveQrReport(
  id: string
): Promise<null | { id: string; country?: "CA" | "US" }> {
  const apiBase = (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.API_URL ||
    "http://127.0.0.1:4000/api/v1"
  ).replace(/\/$/, "");
  try {
    const res = await fetch(
      `${apiBase}/reports/${encodeURIComponent(id)}/qr-check`,
      { cache: "no-store", signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const data = json?.data;
    if (!data?.valid || !data?.reportId) return null;
    return {
      id: String(data.reportId),
      country: data.country === "CA" || data.country === "US" ? data.country : undefined,
    };
  } catch {
    return null;
  }
}

async function ReportQrRedirectInner({ params }: Props): Promise<React.ReactNode> {
  const { id } = await params;
  const cleanId = String(id ?? "").trim();
  if (!/^[A-Za-z0-9_-]{3,64}$/.test(cleanId)) notFound();

  const report = await resolveQrReport(cleanId);
  if (!report) {
    // Missing, expired, or unverified report: open empty form without exposing any data.
    redirect("/lawyer-request?from=qr");
  }

  // Never put PII in the URL — only the report reference and country.
  const qs = new URLSearchParams({ report: report.id, from: "qr" });
  if (report.country) qs.set("country", report.country);
  redirect(`/lawyer-request?${qs.toString()}`);
  return null;
}

export default function ReportQrPage(props: Props) {
  return (
    <Suspense fallback={null}>
      <ReportQrRedirectInner {...props} />
    </Suspense>
  );
}
