import { NextRequest, NextResponse } from "next/server";

/**
 * Direct PDF stream route for reports.
 * Accessible directly as /report/pdf?case=<caseId>&t=<token>[&download=0]
 * Returns the raw PDF binary file directly instead of rendering the web application.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const caseId = searchParams.get("case");
  const token = searchParams.get("t");
  const download = searchParams.get("download");

  if (!caseId || !token) {
    return new NextResponse("Missing required case or token parameter", { status: 400 });
  }

  const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  const apiUrl = rawApiUrl.endsWith("/api/v") ? `${rawApiUrl}1` : rawApiUrl;
  const downloadParam = download !== null ? `&download=${encodeURIComponent(download)}` : "";
  const targetUrl = `${apiUrl}/cases/${caseId}/report/pdf?t=${encodeURIComponent(token)}${downloadParam}`;

  try {
    const upstreamRes = await fetch(targetUrl, {
      cache: "no-store",
      headers: {
        "X-Case-Token": token,
      },
    });

    if (!upstreamRes.ok) {
      const errText = await upstreamRes.text().catch(() => "");
      return new NextResponse(errText || "Report PDF not ready or unauthorized", {
        status: upstreamRes.status,
      });
    }

    const contentType = upstreamRes.headers.get("content-type") || "application/pdf";
    const contentDisposition =
      upstreamRes.headers.get("content-disposition") ||
      `attachment; filename="FairExit-Severance-Report-${caseId}.pdf"`;

    const bodyBuffer = await upstreamRes.arrayBuffer();

    return new NextResponse(bodyBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": contentDisposition,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (err: unknown) {
    console.error("[FairExit PDF Route] Error proxying PDF request:", err);
    return new NextResponse("Could not fetch the generated PDF file", { status: 502 });
  }
}
