import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { PHOTO_MAX_BYTES, PHOTO_TYPES } from "@/lib/blob";

/**
 * Issues a one-time client token so the browser uploads the photo straight to Vercel Blob
 * (server functions on Vercel accept at most 4.5 MB per request; photos may be up to 5 MB).
 * The URL is saved afterwards by a Server Action that re-checks the file.
 */
export async function POST(request: Request) {
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session) throw new Error("Unauthorized");
        if (!pathname.startsWith("masters/")) throw new Error("Invalid path");
        return {
          allowedContentTypes: PHOTO_TYPES,
          maximumSizeInBytes: PHOTO_MAX_BYTES,
          addRandomSuffix: true,
        };
      },
      // The photo URL is stored by savePhotoAction; nothing to do on the webhook.
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
