import "server-only";

import { del } from "@vercel/blob";

export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Store id is part of the read-write token: vercel_blob_rw_<storeId>_<secret>. */
function storeHost(): string | null {
  const token = process.env.BLOB_READ_WRITE_TOKEN ?? "";
  const storeId = token.split("_")[3];
  return storeId ? `${storeId.toLowerCase()}.public.blob.vercel-storage.com` : null;
}

export function isBlobConfigured() {
  return storeHost() !== null;
}

/** True only for public URLs of our own Blob store. */
export function isOwnBlobUrl(value: string): boolean {
  const host = storeHost();
  if (!host) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === host;
  } catch {
    return false;
  }
}

/** Checks the real file signature (magic bytes), not the extension or declared type. */
export async function hasImageSignature(url: string): Promise<boolean> {
  const response = await fetch(url, { headers: { Range: "bytes=0-15" }, cache: "no-store" });
  if (!response.ok) return false;
  const bytes = new Uint8Array(await response.arrayBuffer()).slice(0, 16);
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes[0] === 0x89 && ascii(1, 4) === "PNG";
  const webp = ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  return jpeg || png || webp;
}

/** Best-effort removal of an old photo; a failure must not break the admin action. */
export async function deleteBlobQuietly(url: string | null) {
  if (!url || !isOwnBlobUrl(url)) return;
  try {
    await del(url);
  } catch (error) {
    console.error("Failed to delete blob", error);
  }
}
