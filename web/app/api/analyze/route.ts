import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "@/lib/api/backend-client";

export const maxDuration = 60;

/**
 * Same-origin API route proxy for multimodal livestock analysis.
 * Eliminates browser CORS blocks and Cloudflare 503 HTML net::ERR_FAILED errors.
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const backendUrl = `${getBackendBaseUrl()}/api/analyze`;

    try {
      const backendRes = await fetch(backendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      });

      if (!backendRes.ok) {
        const errorText = await backendRes.text().catch(() => "");
        const isWarmingUp = backendRes.status === 502 || backendRes.status === 503;
        return NextResponse.json(
          {
            detail: isWarmingUp
              ? "AI analysis service is warming up from idle. Please wait a moment and retry."
              : `Analysis backend HTTP ${backendRes.status}: ${errorText.slice(0, 100)}`,
          },
          { status: backendRes.status }
        );
      }

      const data = await backendRes.json();
      return NextResponse.json(data);
    } catch (fetchErr: unknown) {
      return NextResponse.json(
        {
          detail: "AI analysis service is waking up from idle. Please retry in a few seconds.",
        },
        { status: 503 }
      );
    }
  } catch (err: unknown) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
