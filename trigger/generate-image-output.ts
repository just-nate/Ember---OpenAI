import { metadata, queue, schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";
import {
  completeImage,
  markImageFailed,
  markImageRetrying,
  markImageStarted,
} from "./lib/convex-callbacks";
import { abortNonRetryable, normalizeImageError } from "./lib/errors";
import { generateImageWithGptImage2 } from "./lib/gpt-image-2";
import {
  imageOutputPayloadSchema,
  mimeTypeForFormat,
} from "./lib/image-options";

const openAiImageQueue = queue({
  name: "openai-image-generation",
  concurrencyLimit: 2,
});

export const generateImageOutput = schemaTask({
  id: "generate-image-output",
  queue: openAiImageQueue,
  schema: imageOutputPayloadSchema,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 60_000,
    factor: 2,
  },
  run: async (payload, { ctx }) => {
    const parsed = imageOutputPayloadSchema.parse(payload);
    await markImageStarted(parsed.jobId, parsed.resultId, ctx.run.id);
    metadata.set("progress", 20);

    try {
      const generated = await generateImageWithGptImage2(parsed);
      metadata.set("progress", 80);

      const fileName = `ember-${parsed.jobId}-${parsed.variantIndex + 1}.${parsed.format}`;
      const stored = await completeImage({
        fileName,
        imageBase64: generated.b64Json,
        jobId: parsed.jobId,
        mimeType: mimeTypeForFormat(parsed.format),
        providerMetadata: { model: generated.model },
        resultId: parsed.resultId,
        triggerRunId: ctx.run.id,
        variantIndex: parsed.variantIndex,
      });
      metadata.set("progress", 100);

      return {
        jobId: parsed.jobId,
        resultId: parsed.resultId,
        r2Key: z.string().optional().parse(stored.r2Key),
        status: "completed" as const,
      };
    } catch (error) {
      const normalized = normalizeImageError(error);
      if (!normalized.retryable) {
        await markImageFailed(
          parsed.jobId,
          parsed.resultId,
          ctx.run.id,
          normalized.message
        );
        abortNonRetryable(normalized);
      }

      // Use Trigger's real attempt number so the timeline reflects each retry accurately.
      await markImageRetrying(
        parsed.jobId,
        parsed.resultId,
        ctx.run.id,
        ctx.attempt.number
      );
      throw normalized;
    }
  },
});
