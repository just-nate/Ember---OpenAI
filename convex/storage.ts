"use node";

import { R2 } from "@convex-dev/r2";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { internalAction } from "./_generated/server";

const r2 = new R2(components.r2);

const MAX_FILE_NAME_LENGTH = 160;
const DEFAULT_SIGNED_URL_SECONDS = 15 * 60;
const TRAILING_SLASH_PATTERN = /\/$/;

function sanitizeFileName(fileName: string) {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .slice(0, MAX_FILE_NAME_LENGTH);
}

function cdnUrlForKey(r2Key: string) {
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;
  return publicBaseUrl
    ? `${publicBaseUrl.replace(TRAILING_SLASH_PATTERN, "")}/${r2Key}`
    : undefined;
}

export const getSignedImageUrl = internalAction({
  args: { expiresIn: v.optional(v.number()), r2Key: v.string() },
  returns: v.string(),
  handler: async (_ctx, args) =>
    await r2.getUrl(args.r2Key, {
      expiresIn: args.expiresIn ?? DEFAULT_SIGNED_URL_SECONDS,
    }),
});

export const storeGeneratedImage = internalAction({
  args: {
    bytes: v.bytes(),
    fileName: v.string(),
    mimeType: v.string(),
  },
  returns: v.object({ imageUrl: v.optional(v.string()), r2Key: v.string() }),
  handler: async (ctx, args) => {
    const key = `generated/${crypto.randomUUID()}-${sanitizeFileName(args.fileName)}`;
    const bytes = new Uint8Array(args.bytes);

    // Store generated files in R2 so Convex remains the metadata and realtime state layer.
    const r2Key = await r2.store(ctx, bytes, {
      cacheControl: "public, max-age=31536000, immutable",
      disposition: `attachment; filename="${sanitizeFileName(args.fileName)}"`,
      key,
      type: args.mimeType,
    });

    const imageUrl = cdnUrlForKey(r2Key) ?? (await r2.getUrl(r2Key));

    return { imageUrl, r2Key };
  },
});
