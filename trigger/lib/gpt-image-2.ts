import OpenAI from "openai";
import type { ImageGenerateParamsNonStreaming } from "openai/resources/images";
import { normalizeImageError } from "./errors";
import { imageQualitySchema, validateImageSize } from "./image-options";

const DEFAULT_MODEL = "gpt-image-2";

interface GenerateImageArgs {
  format: "png" | "jpeg" | "webp";
  prompt: string;
  quality: "low" | "medium" | "high" | "auto";
  size: string;
}

interface GeneratedImage {
  b64Json: string;
  model: string;
}

function openAiClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for image generation.");
  }
  return new OpenAI({ apiKey });
}

export async function generateImageWithGptImage2(
  args: GenerateImageArgs
): Promise<GeneratedImage> {
  try {
    const prompt = args.prompt.trim();
    if (prompt.length < 3) {
      throw new Error("Prompt must be at least 3 characters.");
    }

    validateImageSize(args.size);
    const quality = imageQualitySchema.parse(args.quality);
    const client = openAiClient();

    const params: ImageGenerateParamsNonStreaming = {
      model: DEFAULT_MODEL,
      n: 1,
      output_format: args.format,
      prompt,
      quality,
      size: args.size,
      stream: false,
    };
    const response = await client.images.generate(params);

    const b64Json = response.data?.[0]?.b64_json;
    if (!b64Json) {
      throw new Error("OpenAI did not return base64 image data.");
    }

    return { b64Json, model: DEFAULT_MODEL };
  } catch (error) {
    throw normalizeImageError(error);
  }
}
