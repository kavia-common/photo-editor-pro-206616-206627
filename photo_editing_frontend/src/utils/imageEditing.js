/**
 * Utility functions to perform client-side edits using <canvas>.
 * These are used in mock mode and as a preview even when backend exists.
 */

// PUBLIC_INTERFACE
export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Load an image from a URL/data URL into an HTMLImageElement.
 */
// PUBLIC_INTERFACE
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Allow CORS images to be drawn if server sends proper headers.
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

/**
 * Apply crop + filters and return a data URL (png).
 *
 * crop is in image pixel coordinates:
 *  { x, y, width, height }
 *
 * filter:
 *  - preset: "none" | "grayscale" | "sepia" | "invert" | "vintage"
 *  - brightness: 0..200 (100 = normal)
 *  - contrast: 0..200 (100 = normal)
 */
// PUBLIC_INTERFACE
export async function renderEditedDataUrl({
  src,
  crop,
  preset,
  brightness,
  contrast,
  outputMaxSide = 1400,
}) {
  const img = await loadImage(src);

  const safeCrop = crop && crop.width > 0 && crop.height > 0
    ? crop
    : { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight };

  // Scale down large images to keep data URL size reasonable for demo.
  const scale = Math.min(
    1,
    outputMaxSide / Math.max(safeCrop.width, safeCrop.height)
  );

  const outW = Math.max(1, Math.round(safeCrop.width * scale));
  const outH = Math.max(1, Math.round(safeCrop.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  const b = clamp(brightness ?? 100, 0, 200);
  const c = clamp(contrast ?? 100, 0, 200);

  const cssFilters = [
    `brightness(${b}%)`,
    `contrast(${c}%)`,
    preset === "grayscale" ? "grayscale(100%)" : "",
    preset === "sepia" ? "sepia(100%)" : "",
    preset === "invert" ? "invert(100%)" : "",
    preset === "vintage" ? "sepia(40%) saturate(130%) hue-rotate(-10deg)" : "",
  ]
    .filter(Boolean)
    .join(" ");

  ctx.filter = cssFilters;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(
    img,
    safeCrop.x,
    safeCrop.y,
    safeCrop.width,
    safeCrop.height,
    0,
    0,
    outW,
    outH
  );

  return canvas.toDataURL("image/png");
}
