export const SITE_ORIGIN =
  (process.env.NEXT_PUBLIC_SITE_URL || "https://fairexit.io").replace(/\/$/, "");

export function reportLawyerUrl(reportId: string): string {
  const id = String(reportId ?? "").trim();
  if (!/^[A-Za-z0-9_-]{3,64}$/.test(id)) {
    throw new Error(`Bad report id: "${reportId}"`);
  }
  return `${SITE_ORIGIN}/r/${encodeURIComponent(id)}`;
}
