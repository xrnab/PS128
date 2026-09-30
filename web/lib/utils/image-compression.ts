/**
 * High-performance client-side image compression and resizing utility for clinical livestock photos.
 * Reduces 5MB-12MB phone camera snapshots down to ~150-250KB in milliseconds,
 * drastically reducing upload latency, avoiding network timeouts, and keeping YOLO inference fast.
 */

export async function optimizeImageForInference(
  file: File,
  maxDimension = 1024,
  quality = 0.85
): Promise<File> {
  // If not running in browser (SSR) or file is not an image format supported by Canvas
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    !file.type ||
    !file.type.startsWith("image/") ||
    file.type.includes("svg")
  ) {
    return file;
  }

  // If the file is already small (under 300KB), return as is
  if (file.size <= 300 * 1024) {
    return file;
  }

  return new Promise<File>((resolve) => {
    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      const cleanup = () => {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {
          // ignore
        }
      };

      img.onload = () => {
        cleanup();
        try {
          let { width, height } = img;

          // Only downscale if dimensions exceed maxDimension
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);

          const ctx = canvas.getContext("2d", { alpha: false });
          if (!ctx) {
            return resolve(file);
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob || blob.size >= file.size) {
                // If compression didn't reduce size or failed, keep original file
                return resolve(file);
              }

              const cleanName = file.name.replace(/\.[^.]+$/, ".jpg");
              const optimizedFile = new File([blob], cleanName, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });

              resolve(optimizedFile);
            },
            "image/jpeg",
            quality
          );
        } catch (canvasErr) {
          console.warn("[optimizeImageForInference canvas warning]:", canvasErr);
          resolve(file);
        }
      };

      img.onerror = () => {
        cleanup();
        resolve(file);
      };

      img.src = objectUrl;
    } catch (err) {
      console.warn("[optimizeImageForInference error]:", err);
      resolve(file);
    }
  });
}
