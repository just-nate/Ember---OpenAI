import { httpRouter } from "convex/server";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { httpAction } from "./_generated/server";

const http = httpRouter();

const MAX_BASE64_IMAGE_BYTES = 14 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const ALLOWED_STATUS_VALUES = new Set([
  "queued",
  "running",
  "retrying",
  "failed",
  "completed",
]);

type JsonRecord = Record<string, unknown>;

type AuthResult = { ok: true } | { ok: false; response: Response };

function getWorkerSecret() {
  const secret = process.env.CONVEX_WORKER_SECRET;
  if (!secret) {
    throw new ConvexError("CONVEX_WORKER_SECRET is not configured.");
  }
  return secret;
}

function authenticateWorker(request: Request): AuthResult {
  const expectedSecret = getWorkerSecret();
  const bearer = request.headers.get("Authorization");
  const headerSecret = request.headers.get("X-Ember-Worker-Secret");
  const providedSecret = bearer?.startsWith("Bearer ")
    ? bearer.slice("Bearer ".length)
    : headerSecret;

  if (!providedSecret) {
    return {
      ok: false,
      response: new Response("Missing worker auth", { status: 401 }),
    };
  }

  if (providedSecret !== expectedSecret) {
    return {
      ok: false,
      response: new Response("Invalid worker auth", { status: 403 }),
    };
  }

  return { ok: true };
}

async function parseJson(request: Request) {
  try {
    const payload: unknown = await request.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return null;
    }
    return payload as JsonRecord;
  } catch {
    return null;
  }
}

function requiredString(payload: JsonRecord, key: string) {
  const value = payload[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} is required.`);
  }
  return value;
}

function optionalString(payload: JsonRecord, key: string) {
  const value = payload[key];
  if (value === undefined) {
    return;
  }
  if (typeof value !== "string") {
    throw new Error(`${key} must be a string.`);
  }
  return value;
}

function optionalNumber(payload: JsonRecord, key: string, max?: number) {
  const value = payload[key];
  if (value === undefined) {
    return;
  }
  const isNumber = typeof value === "number";
  const isFiniteNumber = isNumber && Number.isFinite(value);
  const isInsideMinimum = isFiniteNumber && value >= 0;
  const isInsideMaximum = max === undefined || (isNumber && value <= max);

  if (!(isNumber && isFiniteNumber && isInsideMinimum && isInsideMaximum)) {
    throw new Error(`${key} is outside the allowed numeric bounds.`);
  }
  return value;
}

function optionalStatus(payload: JsonRecord) {
  const status = payload.status;
  if (status === undefined) {
    return;
  }
  if (typeof status !== "string" || !ALLOWED_STATUS_VALUES.has(status)) {
    throw new Error("status is not an allowed value.");
  }
}

function providerMetadata(payload: JsonRecord) {
  const value = payload.providerMetadata;
  if (value === undefined) {
    return;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("providerMetadata must be an object.");
  }

  return Object.fromEntries(
    Object.entries(value).map(([metadataKey, metadataValue]) => [
      metadataKey,
      String(metadataValue),
    ])
  );
}

function decodeBase64Image(imageBase64: string) {
  const estimatedBytes = Math.ceil((imageBase64.length * 3) / 4);
  if (estimatedBytes > MAX_BASE64_IMAGE_BYTES) {
    throw new Error("Image payload is too large for Convex HTTP actions.");
  }

  const binary = atob(imageBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function badRequest(message: string) {
  return Response.json({ error: message, ok: false }, { status: 400 });
}

async function requirePayload(request: Request) {
  const auth = authenticateWorker(request);
  if (!auth.ok) {
    return { payload: null, response: auth.response };
  }

  const payload = await parseJson(request);
  if (!payload) {
    return { payload: null, response: badRequest("Invalid JSON body.") };
  }

  try {
    optionalStatus(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid status value.";
    return { payload: null, response: badRequest(message) };
  }

  return { payload, response: null };
}

async function handleWorkerPayload(
  request: Request,
  handler: (payload: JsonRecord) => Promise<Response>
) {
  const { payload, response } = await requirePayload(request);
  if (!payload) {
    return response ?? badRequest("Invalid worker request.");
  }

  try {
    // Keep validation failures as 400s so malformed worker callbacks cannot become noisy 500s.
    return await handler(payload);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Invalid worker callback payload.";
    return badRequest(message);
  }
}

http.route({
  path: "/worker/health",
  method: "GET",
  handler: httpAction(async () => Response.json({ ok: true })),
});

http.route({
  path: "/worker/jobs/started",
  method: "POST",
  handler: httpAction(async (ctx, request) =>
    handleWorkerPayload(request, async (payload) => {
      const jobId = requiredString(payload, "jobId") as Id<"jobs">;
      const triggerRunId = optionalString(payload, "triggerRunId");
      await ctx.runMutation(internal.jobs.markRunning, { jobId, triggerRunId });
      await ctx.runMutation(internal.activities.appendOnce, {
        dedupeKey: `job:${jobId}:started`,
        jobId,
        message: "Generating image",
        type: "generating",
      });

      return Response.json({ ok: true });
    })
  ),
});

http.route({
  path: "/worker/jobs/progress",
  method: "POST",
  handler: httpAction(async (ctx, request) =>
    handleWorkerPayload(request, async (payload) => {
      const jobId = requiredString(payload, "jobId") as Id<"jobs">;
      const progress = optionalNumber(payload, "progress", 100);
      await ctx.runMutation(internal.jobs.markRunning, {
        jobId,
        progress,
        triggerRunId: optionalString(payload, "triggerRunId"),
      });

      return Response.json({ ok: true });
    })
  ),
});

http.route({
  path: "/worker/jobs/complete",
  method: "POST",
  handler: httpAction(async (ctx, request) =>
    handleWorkerPayload(request, async (payload) => {
      const jobId = requiredString(payload, "jobId") as Id<"jobs">;
      const completed = await ctx.runMutation(
        internal.jobs.markCompletedIfDone,
        { jobId }
      );
      if (completed) {
        await ctx.runMutation(internal.activities.appendOnce, {
          dedupeKey: `job:${jobId}:completed`,
          jobId,
          message: "Job completed",
          type: "completed",
        });
      }

      return Response.json({ completed, ok: true });
    })
  ),
});

http.route({
  path: "/worker/jobs/failed",
  method: "POST",
  handler: httpAction(async (ctx, request) =>
    handleWorkerPayload(request, async (payload) => {
      const jobId = requiredString(payload, "jobId") as Id<"jobs">;
      const failureReason = requiredString(payload, "failureReason");
      await ctx.runMutation(internal.jobs.markFailed, {
        failureReason,
        jobId,
        triggerRunId: optionalString(payload, "triggerRunId"),
      });
      await ctx.runMutation(internal.activities.appendOnce, {
        dedupeKey: `job:${jobId}:failed:${failureReason}`,
        jobId,
        message: failureReason,
        type: "failed",
      });

      return Response.json({ ok: true });
    })
  ),
});

http.route({
  path: "/worker/images/started",
  method: "POST",
  handler: httpAction(async (ctx, request) =>
    handleWorkerPayload(request, async (payload) => {
      const jobId = requiredString(payload, "jobId") as Id<"jobs">;
      const resultId = requiredString(
        payload,
        "resultId"
      ) as Id<"imageResults">;
      await ctx.runMutation(internal.imageResults.markRunning, {
        resultId,
        triggerRunId: optionalString(payload, "triggerRunId"),
      });
      await ctx.runMutation(internal.activities.appendOnce, {
        dedupeKey: `result:${resultId}:started`,
        jobId,
        message: "Image generation started",
        resultId,
        type: "started",
      });

      return Response.json({ ok: true });
    })
  ),
});

http.route({
  path: "/worker/images/retrying",
  method: "POST",
  handler: httpAction(async (ctx, request) =>
    handleWorkerPayload(request, async (payload) => {
      const jobId = requiredString(payload, "jobId") as Id<"jobs">;
      const resultId = requiredString(
        payload,
        "resultId"
      ) as Id<"imageResults">;
      const attempt = optionalNumber(payload, "attempt", 10) ?? 1;
      await ctx.runMutation(internal.imageResults.markRetrying, {
        attempt,
        resultId,
        triggerRunId: optionalString(payload, "triggerRunId"),
      });
      await ctx.runMutation(internal.activities.appendOnce, {
        dedupeKey: `result:${resultId}:retry:${attempt}`,
        jobId,
        message: `Retrying attempt ${attempt}`,
        resultId,
        type: "retrying",
      });

      return Response.json({ ok: true });
    })
  ),
});

http.route({
  path: "/worker/images/complete",
  method: "POST",
  handler: httpAction(async (ctx, request) =>
    handleWorkerPayload(request, async (payload) => {
      const jobId = requiredString(payload, "jobId") as Id<"jobs">;
      const resultId = requiredString(
        payload,
        "resultId"
      ) as Id<"imageResults">;
      const mimeType = requiredString(payload, "mimeType");
      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        return badRequest("Unsupported MIME type.");
      }

      optionalNumber(payload, "variantIndex", 1000);
      const existingResult = await ctx.runQuery(
        internal.imageResults.getCompletionState,
        { resultId }
      );
      if (existingResult?.status === "completed" && existingResult.r2Key) {
        return Response.json({ ok: true, r2Key: existingResult.r2Key });
      }

      const imageBase64 = requiredString(payload, "imageBase64");
      const bytes = decodeBase64Image(imageBase64);
      const fileName = requiredString(payload, "fileName");
      const triggerRunId = optionalString(payload, "triggerRunId");
      const stored = await ctx.runAction(internal.storage.storeGeneratedImage, {
        bytes,
        fileName,
        mimeType,
      });

      await ctx.runMutation(internal.imageResults.markCompleted, {
        imageUrl: stored.imageUrl,
        mimeType,
        providerMetadata: providerMetadata(payload),
        r2Key: stored.r2Key,
        resultId,
        triggerRunId,
      });
      const completed = await ctx.runMutation(
        internal.jobs.markCompletedIfDone,
        { jobId }
      );
      await ctx.runMutation(internal.activities.appendOnce, {
        dedupeKey: `result:${resultId}:ready:${stored.r2Key}`,
        jobId,
        message: "Image ready",
        resultId,
        type: "ready",
      });
      if (completed) {
        await ctx.runMutation(internal.activities.appendOnce, {
          dedupeKey: `job:${jobId}:completed`,
          jobId,
          message: "Job completed",
          type: "completed",
        });
      }

      return Response.json({ ok: true, r2Key: stored.r2Key });
    })
  ),
});

http.route({
  path: "/worker/images/failed",
  method: "POST",
  handler: httpAction(async (ctx, request) =>
    handleWorkerPayload(request, async (payload) => {
      const jobId = requiredString(payload, "jobId") as Id<"jobs">;
      const resultId = requiredString(
        payload,
        "resultId"
      ) as Id<"imageResults">;
      const failureReason = requiredString(payload, "failureReason");
      await ctx.runMutation(internal.imageResults.markFailed, {
        failureReason,
        resultId,
        triggerRunId: optionalString(payload, "triggerRunId"),
      });
      await ctx.runMutation(internal.jobs.markCompletedIfDone, { jobId });
      await ctx.runMutation(internal.activities.appendOnce, {
        dedupeKey: `result:${resultId}:failed:${failureReason}`,
        jobId,
        message: failureReason,
        resultId,
        type: "failed",
      });

      return Response.json({ ok: true });
    })
  ),
});

export default http;
