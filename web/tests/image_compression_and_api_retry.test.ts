import { describe, it, expect, vi, beforeEach } from "vitest";
import { optimizeImageForInference } from "@/lib/utils/image-compression";
import { predictYoloImage, prewarmBackend } from "@/lib/api/livestock";

describe("Image Compression & Livestock Vision Resilience", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("1. optimizeImageForInference returns small files untouched without overhead", async () => {
    const smallBlob = new Blob(["small image data"], { type: "image/jpeg" });
    const smallFile = new File([smallBlob], "cow.jpg", { type: "image/jpeg" });

    const result = await optimizeImageForInference(smallFile);
    expect(result).toBe(smallFile);
    expect(result.name).toBe("cow.jpg");
  });

  it("2. optimizeImageForInference safely skips non-image or SVG files", async () => {
    const svgFile = new File(["<svg></svg>"], "icon.svg", { type: "image/svg+xml" });
    const result = await optimizeImageForInference(svgFile);
    expect(result).toBe(svgFile);
  });

  it("3. prewarmBackend triggers non-blocking health check ping", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("OK"));
    prewarmBackend();
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/api/health"),
      expect.objectContaining({ method: "GET", mode: "no-cors" })
    );
  });

  it("4. predictYoloImage successfully recovers when server wakes up after cold start retry", async () => {
    let callCount = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      callCount++;
      if (callCount === 1) {
        // First attempt: Server cold starting (503 Service Unavailable / Hibernate Wake)
        return new Response(JSON.stringify({ message: "Server waking up" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      }
      // Second attempt: Server ready, returns prediction
      return new Response(
        JSON.stringify({
          success: true,
          primary_prediction: "Lumpy Skin Disease",
          confidence: 96.5,
          visual_anomaly_detected: true,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    });

    const file = new File(["mock-image-data"], "lesion.jpg", { type: "image/jpeg" });
    const result = await predictYoloImage(file, "cow");

    expect(callCount).toBe(2);
    expect(result).not.toBeNull();
    expect(result?.primary_prediction).toBe("Lumpy Skin Disease");
    expect(result?.confidence).toBe(96.5);
  });
});
