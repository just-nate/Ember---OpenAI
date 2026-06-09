import { metadata, schemaTask, tasks } from "@trigger.dev/sdk";
import type { generateImageOutput } from "./generate-image-output";
import {
  markImageFailed,
  markJobComplete,
  markJobFailed,
  markJobStarted,
} from "./lib/convex-callbacks";
import {
  type ImageOutputPayload,
  imageJobPayloadSchema,
} from "./lib/image-options";

function childPayloads(
  payload: ReturnType<typeof imageJobPayloadSchema.parse>
): ImageOutputPayload[] {
  return payload.results.map((result) => ({
    format: payload.format,
    jobId: payload.jobId,
    prompt: payload.prompt,
    quality: payload.quality,
    resultId: result._id,
    size: payload.size,
    variantIndex: result.variantIndex,
  }));
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Image output task failed.";
}

export const generateImageJob = schemaTask({
  id: "generate-image-job",
  schema: imageJobPayloadSchema,
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30_000,
    factor: 2,
  },
  run: async (payload, { ctx }) => {
    const parsed = imageJobPayloadSchema.parse(payload);
    const children = childPayloads(parsed);

    await markJobStarted(parsed.jobId, ctx.run.id);
    metadata.set("progress", 10);

    if (children.length === 0) {
      await markJobFailed(
        parsed.jobId,
        ctx.run.id,
        "Job has no image results to process."
      );
      return { completed: 0, failed: 0, status: "failed" as const };
    }

    let completed = 0;
    let failed = 0;

    if (children.length === 1) {
      const child = children[0];
      const result = await tasks.triggerAndWait<typeof generateImageOutput>(
        "generate-image-output",
        child,
        { idempotencyKey: `ember-result:${child.resultId}` }
      );

      if (result.ok) {
        completed += 1;
      } else {
        failed += 1;
        await markImageFailed(
          child.jobId,
          child.resultId,
          ctx.run.id,
          errorMessage(result.error)
        );
      }
    } else {
      const batch = await tasks.batchTriggerAndWait<typeof generateImageOutput>(
        "generate-image-output",
        children.map((child) => ({
          payload: child,
          options: { idempotencyKey: `ember-result:${child.resultId}` },
        }))
      );

      for (const [index, run] of batch.runs.entries()) {
        const child = children[index];
        if (run.ok) {
          completed += 1;
        } else {
          failed += 1;
          await markImageFailed(
            child.jobId,
            child.resultId,
            ctx.run.id,
            errorMessage(run.error)
          );
        }
      }
    }

    metadata.set("progress", Math.round((completed / children.length) * 100));

    if (completed > 0) {
      await markJobComplete(parsed.jobId, ctx.run.id);
      return {
        completed,
        failed,
        status: failed > 0 ? ("partial" as const) : ("completed" as const),
      };
    }

    await markJobFailed(parsed.jobId, ctx.run.id, "All image outputs failed.");
    return { completed, failed, status: "failed" as const };
  },
});
