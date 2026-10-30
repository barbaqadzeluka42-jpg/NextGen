import "server-only";

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export type ImageKind = { ext: "jpg" | "png" | "webp"; mime: "image/jpeg" | "image/png" | "image/webp" };

/**
 * Detects the real image type from magic bytes. The client-supplied file name and
 * Content-Type are NEVER trusted (they decide neither extension nor stored mime type).
 */
export function sniffImage(bytes: Uint8Array): ImageKind | null {
  if (bytes.length > 12 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (bytes.length > 12 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return { ext: "png", mime: "image/png" };
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (bytes.length > 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { ext: "webp", mime: "image/webp" };
  return null;
}
