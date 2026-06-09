import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import {
  imageFormatValidator,
  imageQualityValidator,
  jobStatusValidator,
} from "./schema";

const MAX_PROMPT_LENGTH = 4000;
const MAX_IMAGE_COUNT = 4;
const MIN_TOTAL_PIXELS = 655_360;
const MAX_EDGE_PIXELS = 3840;
const MAX_TOTAL_PIXELS = 8_294_400;
const MAX_ASPECT_RATIO = 3;

const jobValidator = v.object({
  _creationTime: v.number(),
  _id: v.id("jobs"),
  completedResults: v.number(),
  count: v.number(),
  createdAt: v.number(),
  failedResults: v.number(),
  failureReason: v.optional(v.string()),
  format: imageFormatValidator,
  prompt: v.string(),
  progress: v.number(),
  quality: imageQualityValidator,
  retryOfJobId: v.optional(v.id("jobs")),
  size: v.string(),
  status: jobStatusValidator,
  triggerRunId: v.optional(v.string()),
  updatedAt: v.number(),
});

const triggerResultValidator = v.object({
  _id: v.id("imageResults"),
  variantIndex: v.number(),
});

const jobWithPreviewValidator = v.object({
  _creationTime: v.number(),
  _id: v.id("jobs"),
  completedResults: v.number(),
  count: v.number(),
  createdAt: v.number(),
  failedResults: v.number(),
  failureReason: v.optional(v.string()),
  firstResultStatus: v.optional(jobStatusValidator),
  format: imageFormatValidator,
  previewImageUrl: v.optional(v.string()),
  previewResultId: v.optional(v.id("imageResults")),
  prompt: v.string(),
  progress: v.number(),
  quality: imageQualityValidator,
  retryOfJobId: v.optional(v.id("jobs")),
  size: v.string(),
  status: jobStatusValidator,
  triggerRunId: v.optional(v.string()),
  updatedAt: v.number(),
});

const triggerJobPayloadValidator = v.object({
  count: v.number(),
  format: imageFormatValidator,
  jobId: v.id("jobs"),
  prompt: v.string(),
  quality: imageQualityValidator,
  results: v.array(triggerResultValidator),
  size: v.string(),
});

function validatePrompt(prompt: string) {
  const trimmed = prompt.trim();
  if (trimmed.length < 3) {
    throw new ConvexError("Prompt must be at least 3 characters.");
  }
  if (trimmed.length > MAX_PROMPT_LENGTH) {
    throw new ConvexError("Prompt is too long.");
  }
  return trimmed;
}

function validateCount(count: number) {
  if (!Number.isInteger(count) || count < 1 || count > MAX_IMAGE_COUNT) {
    throw new ConvexError(
      `Image count must be between 1 and ${MAX_IMAGE_COUNT}.`
    );
  }
}

function validateSize(size: string) {
  if (size === "auto") {
    return;
  }

  const [widthText, heightText] = size.split("x");
  const width = Number(widthText);
  const height = Number(heightText);

  if (!(Number.isInteger(width) && Number.isInteger(height))) {
    throw new ConvexError("Image size must use integer dimensions.");
  }
  if (width % 16 !== 0 || height % 16 !== 0) {
    throw new ConvexError("Image dimensions must be multiples of 16.");
  }
  if (Math.max(width, height) > MAX_EDGE_PIXELS) {
    throw new ConvexError("Image edge must not exceed 3840px.");
  }
  if (width * height < MIN_TOTAL_PIXELS) {
    throw new ConvexError("Image has too few pixels for GPT Image 2.");
  }
  if (width * height > MAX_TOTAL_PIXELS) {
    throw new ConvexError("Image has too many pixels for GPT Image 2.");
  }
  if (Math.max(width, height) / Math.min(width, height) > MAX_ASPECT_RATIO) {
    throw new ConvexError("Image aspect ratio must not be wider than 3:1.");
  }
}

export const create = mutation({
  args: {
    count: v.number(),
    format: imageFormatValidator,
    prompt: v.string(),
    quality: imageQualityValidator,
    size: v.string(),
  },
  returns: v.id("jobs"),
  handler: async (ctx, args) => {
    const prompt = validatePrompt(args.prompt);
    validateCount(args.count);
    validateSize(args.size);

    const now = Date.now();
    const jobId = await ctx.db.insert("jobs", {
      completedResults: 0,
      count: args.count,
      createdAt: now,
      failedResults: 0,
      format: args.format,
      progress: 0,
      prompt,
      quality: args.quality,
      size: args.size,
      status: "queued",
      updatedAt: now,
    });

    for (let variantIndex = 0; variantIndex < args.count; variantIndex += 1) {
      await ctx.db.insert("imageResults", {
        createdAt: now,
        jobId,
        progress: 0,
        status: "queued",
        updatedAt: now,
        variantIndex,
      });
    }

    await ctx.db.insert("activities", {
      createdAt: now,
      dedupeKey: `job:${jobId}:prompt-received`,
      jobId,
      message: "Prompt received",
      type: "prompt_received",
    });

    await ctx.scheduler.runAfter(0, internal.trigger.enqueueImageJob, {
      jobId,
    });

    return jobId;
  },
});

export const list = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(jobValidator),
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 25, 100);

    return await ctx.db
      .query("jobs")
      .withIndex("by_created_at")
      .order("desc")
      .take(limit);
  },
});

export const listWithPreview = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(jobWithPreviewValidator),
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 25, 100);
    const jobs = await ctx.db
      .query("jobs")
      .withIndex("by_created_at")
      .order("desc")
      .take(limit);

    return await Promise.all(
      jobs.map(async (job) => {
        const results = await ctx.db
          .query("imageResults")
          .withIndex("by_job", (q) => q.eq("jobId", job._id))
          .order("asc")
          .take(100);
        const firstCompleted = results.find((result) => result.imageUrl);
        const firstResult = results[0];

        return {
          ...job,
          firstResultStatus: firstResult?.status,
          previewImageUrl: firstCompleted?.imageUrl,
          previewResultId: firstCompleted?._id,
        };
      })
    );
  },
});

export const get = query({
  args: { jobId: v.id("jobs") },
  returns: v.union(jobValidator, v.null()),
  handler: async (ctx, args) => await ctx.db.get(args.jobId),
});

export const getForTrigger = internalQuery({
  args: { jobId: v.id("jobs") },
  returns: v.union(triggerJobPayloadValidator, v.null()),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      return null;
    }

    const results = await ctx.db
      .query("imageResults")
      .withIndex("by_job", (q) => q.eq("jobId", args.jobId))
      .order("asc")
      .take(100);

    return {
      count: job.count,
      format: job.format,
      jobId: job._id,
      prompt: job.prompt,
      quality: job.quality,
      results: results.map((result) => ({
        _id: result._id,
        variantIndex: result.variantIndex,
      })),
      size: job.size,
    };
  },
});

export const retry = mutation({
  args: { jobId: v.id("jobs") },
  returns: v.id("jobs"),
  handler: async (ctx, args) => {
    const failedJob = await ctx.db.get(args.jobId);
    if (!failedJob) {
      throw new ConvexError("Job not found.");
    }
    if (failedJob.status !== "failed") {
      throw new ConvexError("Only failed jobs can be retried.");
    }

    const now = Date.now();
    const retryJobId = await ctx.db.insert("jobs", {
      completedResults: 0,
      count: failedJob.count,
      createdAt: now,
      failedResults: 0,
      format: failedJob.format,
      progress: 0,
      prompt: failedJob.prompt,
      quality: failedJob.quality,
      retryOfJobId: failedJob._id,
      size: failedJob.size,
      status: "queued",
      updatedAt: now,
    });

    for (
      let variantIndex = 0;
      variantIndex < failedJob.count;
      variantIndex += 1
    ) {
      await ctx.db.insert("imageResults", {
        createdAt: now,
        jobId: retryJobId,
        progress: 0,
        status: "queued",
        updatedAt: now,
        variantIndex,
      });
    }

    await ctx.db.insert("activities", {
      createdAt: now,
      dedupeKey: `job:${retryJobId}:manual-retry`,
      jobId: retryJobId,
      message: "Manual retry queued",
      type: "queued",
    });

    await ctx.scheduler.runAfter(0, internal.trigger.enqueueImageJob, {
      jobId: retryJobId,
    });

    return retryJobId;
  },
});

export const markTriggerStarted = internalMutation({
  args: { jobId: v.id("jobs"), triggerRunId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.triggerRunId === args.triggerRunId) {
      return null;
    }

    await ctx.db.patch(args.jobId, {
      status: job.status === "queued" ? "queued" : job.status,
      triggerRunId: args.triggerRunId,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const markRunning = internalMutation({
  args: {
    jobId: v.id("jobs"),
    progress: v.optional(v.number()),
    triggerRunId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.status === "completed") {
      return null;
    }

    await ctx.db.patch(args.jobId, {
      progress: Math.max(job.progress, args.progress ?? 5),
      status: "running",
      triggerRunId: args.triggerRunId ?? job.triggerRunId,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const markCompletedIfDone = internalMutation({
  args: { jobId: v.id("jobs") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.status === "completed") {
      return false;
    }

    const results = await ctx.db
      .query("imageResults")
      .withIndex("by_job", (q) => q.eq("jobId", args.jobId))
      .take(100);
    const completedResults = results.filter(
      (result) => result.status === "completed"
    ).length;
    const failedResults = results.filter(
      (result) => result.status === "failed"
    ).length;
    const progress = Math.round((completedResults / job.count) * 100);
    const isCompleted = completedResults === job.count;
    const allResultsFinished = completedResults + failedResults === job.count;
    const hasAnyFailure = failedResults > 0;
    let nextStatus: "queued" | "running" | "retrying" | "failed" | "completed" =
      job.status;
    if (isCompleted) {
      nextStatus = "completed";
    } else if (allResultsFinished && hasAnyFailure) {
      // A mixed outcome is terminal so the UI stops spinning while successful images stay visible.
      nextStatus = "failed";
    }

    let failureReason = job.failureReason;
    if (allResultsFinished && hasAnyFailure) {
      failureReason =
        completedResults > 0
          ? "Some image results failed."
          : "All image results failed.";
    }

    await ctx.db.patch(args.jobId, {
      completedResults,
      failedResults,
      failureReason,
      progress,
      status: nextStatus,
      updatedAt: Date.now(),
    });

    return isCompleted;
  },
});

export const markFailed = internalMutation({
  args: {
    failureReason: v.string(),
    jobId: v.id("jobs"),
    triggerRunId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.status === "completed" || job.status === "failed") {
      return null;
    }

    await ctx.db.patch(args.jobId, {
      failureReason: args.failureReason,
      status: "failed",
      triggerRunId: args.triggerRunId ?? job.triggerRunId,
      updatedAt: Date.now(),
    });

    return null;
  },
});
