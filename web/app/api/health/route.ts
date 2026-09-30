import { NextResponse } from "next/server";
import { getBackendBaseUrl } from "@/lib/api/backend-client";

/**
 * Dedicated Next.js Reachability & Frontend Health Endpoint
 * Also silently pre-warms the upstream Render AI backend if hibernating.
 */
export async function GET() {
  try {
    const backendUrl = `${getBackendBaseUrl()}/api/health`;
    fetch(backendUrl, { method: "GET", cache: "no-store" }).catch(() => {
      // Ignored: silent server-to-server pre-warm ping
    });
  } catch {
    // Ignored
  }

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "Maitri Next.js App Server",
  });
}

