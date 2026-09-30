import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "@/lib/api/backend-client";

export const maxDuration = 60;

/**
 * Same-origin API route proxy for YOLO animal lesion prediction.
 * Eliminates all cross-origin browser CORS blocks and Cloudflare 503 HTML net::ERR_FAILED errors.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const category = formData.get("category") || "cow";

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { success: false, error: "Valid image file is required." },
        { status: 400 }
      );
    }

    const backendUrl = `${getBackendBaseUrl()}/api/predict`;

    const forwardData = new FormData();
    forwardData.append("file", file, "image.jpg");
    forwardData.append("category", String(category));

    try {
      const backendRes = await fetch(backendUrl, {
        method: "POST",
        body: forwardData,
        cache: "no-store",
      });

      if (!backendRes.ok) {
        const errorText = await backendRes.text().catch(() => "");
        const isWarmingUp = backendRes.status === 502 || backendRes.status === 503;
        return NextResponse.json(
          {
            success: false,
            warming_up: isWarmingUp,
            message: isWarmingUp
              ? "AI engine is warming up from idle. Please wait a moment and retry."
              : `AI backend returned HTTP ${backendRes.status}: ${errorText.slice(0, 100)}`,
          },
          { status: backendRes.status }
        );
      }

      const data = await backendRes.json();
      return NextResponse.json(data);
    } catch (fetchErr: unknown) {
      const errMessage = fetchErr instanceof Error ? fetchErr.message : "Service unreachable";
      return NextResponse.json(
        {
          success: false,
          warming_up: true,
          message: "AI engine is currently waking up from idle. Please retry in a few seconds.",
          detail: errMessage,
        },
        { status: 503 }
      );
    }
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
