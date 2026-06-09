import { z } from "zod";

const MAX_PROMPT_LENGTH = 4000;
const MIN_TOTAL_PIXELS = 655_360;
const MAX_EDGE_PIXELS = 3840;
const MAX_TOTAL_PIXELS = 8_294_400;
const MAX_ASPECT_RATIO = 3;

export const imageQualitySchema = z.enum(["low", "medium", "high", "auto"]);
export const imageFormatSchema = z.enum(["png", "jpeg", "webp"]);
export const imageSizeSchema = z.union([
  z.literal("auto"),
  z.string().regex(/^\d+x\d+$/u),
]);

export const imageOutputPayloadSchema = z.object({
  format: imageFormatSchema,
  jobId: z.string().min(1),
  prompt: z.string().trim().min(3).max(MAX_PROMPT_LENGTH),
  quality: imageQualitySchema,
  resultId: z.string().min(1),
  size: imageSizeSchema,
  variantIndex: z.number().int().min(0),
});

export const imageJobPayloadSchema = z.object({
  count: z.number().int().min(1).max(4),
  format: imageFormatSchema,
  jobId: z.string().min(1),
  prompt: z.string().trim().min(3).max(MAX_PROMPT_LENGTH),
  quality: imageQualitySchema,
  results: z.array(
    z.object({
      _id: z.string().min(1),
      variantIndex: z.number().int().min(0),
    })
  ),
  size: imageSizeSchema,
});

export type ImageJobPayload = z.infer<typeof imageJobPayloadSchema>;
export type ImageOutputPayload = z.infer<typeof imageOutputPayloadSchema>;

export function validateImageSize(size: string) {
  if (size === "auto") {
    return { height: 0, size, width: 0 };
  }

  const [widthText, heightText] = size.split("x");
  const width = Number(widthText);
  const height = Number(heightText);

  if (!(Number.isInteger(width) && Number.isInteger(height))) {
    throw new Error("Image size must use integer dimensions.");
  }
  if (width % 16 !== 0 || height % 16 !== 0) {
    throw new Error("Image dimensions must be multiples of 16.");
  }
  if (Math.max(width, height) > MAX_EDGE_PIXELS) {
    throw new Error("Image edge must not exceed 3840px.");
  }
  if (width * height < MIN_TOTAL_PIXELS) {
    throw new Error("Image has too few pixels for GPT Image 2.");
  }
  if (width * height > MAX_TOTAL_PIXELS) {
    throw new Error("Image has too many pixels for GPT Image 2.");
  }
  if (Math.max(width, height) / Math.min(width, height) > MAX_ASPECT_RATIO) {
    throw new Error("Image aspect ratio must not be wider than 3:1.");
  }

  return { height, size, width };
}

export function mimeTypeForFormat(format: z.infer<typeof imageFormatSchema>) {
  if (format === "jpeg") {
    return "image/jpeg";
  }
  if (format === "webp") {
    return "image/webp";
  }
  return "image/png";
}
