// biome-ignore-all lint/style/useFilenamingConvention: Convex function names follow the implementation plan's public API.
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { imageResultStatusValidator } from "./schema";

const metadataValidator = v.record(v.string(), v.string());

const imageResultValidator = v.object({
  _creationTime: v.number(),
  _id: v.id("imageResults"),
  completedAt: v.optional(v.number()),
  createdAt: v.number(),
  failureReason: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  jobId: v.id("jobs"),
  mimeType: v.optional(v.string()),
  progress: v.number(),
  providerMetadata: v.optional(metadataValidator),
  r2Key: v.optional(v.string()),
  status: imageResultStatusValidator,
  triggerRunId: v.optional(v.string()),
  updatedAt: v.number(),
  variantIndex: v.number(),
});

export const listByJob = query({
  args: { jobId: v.id("jobs") },
  returns: v.array(imageResultValidator),
  handler: async (ctx, args) =>
    await ctx.db
      .query("imageResults")
      .withIndex("by_job", (q) => q.eq("jobId", args.jobId))
      .order("asc")
      .take(100),
});

export const retry = mutation({
  args: { resultId: v.id("imageResults") },
  returns: v.id("imageResults"),
  handler: async (ctx, args) => {
    const result = await ctx.db.get(args.resultId);
    if (!result) {
      throw new ConvexError("Image result not found.");
    }
    if (result.status !== "failed") {
      throw new ConvexError("Only failed image results can be retried.");
    }

    const job = await ctx.db.get(result.jobId);
    if (!job) {
      throw new ConvexError("Parent job not found.");
    }

    const now = Date.now();
    await ctx.db.patch(args.resultId, {
      failureReason: undefined,
      progress: 0,
      status: "queued",
      updatedAt: now,
    });
    await ctx.db.patch(result.jobId, {
      failureReason: undefined,
      status: "running",
      updatedAt: now,
    });
    await ctx.db.insert("activities", {
      createdAt: now,
      dedupeKey: `result:${args.resultId}:manual-retry:${now}`,
      jobId: result.jobId,
      message: "Manual result retry queued",
      resultId: args.resultId,
      type: "queued",
    });

    await ctx.scheduler.runAfter(0, internal.trigger.enqueueImageResult, {
      resultId: args.resultId,
    });

    return args.resultId;
  },
});

export const getCompletionState = internalQuery({
  args: { resultId: v.id("imageResults") },
  returns: v.union(
    v.object({
      imageUrl: v.optional(v.string()),
      r2Key: v.optional(v.string()),
      status: imageResultStatusValidator,
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const result = await ctx.db.get(args.resultId);
    if (!result) {
      return null;
    }

    return {
      imageUrl: result.imageUrl,
      r2Key: result.r2Key,
      status: result.status,
    };
  },
});

export const getForTrigger = internalQuery({
  args: { resultId: v.id("imageResults") },
  returns: v.union(
    v.object({
      format: v.union(v.literal("png"), v.literal("jpeg"), v.literal("webp")),
      jobId: v.id("jobs"),
      prompt: v.string(),
      quality: v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("auto")
      ),
      resultId: v.id("imageResults"),
      size: v.string(),
      variantIndex: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const result = await ctx.db.get(args.resultId);
    if (result?.status !== "queued") {
      return null;
    }
    const job = await ctx.db.get(result.jobId);
    if (!job) {
      return null;
    }

    return {
      format: job.format,
      jobId: job._id,
      prompt: job.prompt,
      quality: job.quality,
      resultId: result._id,
      size: job.size,
      variantIndex: result.variantIndex,
    };
  },
});

export const markRunning = internalMutation({
  args: {
    resultId: v.id("imageResults"),
    triggerRunId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const result = await ctx.db.get(args.resultId);
    if (!result || result.status === "completed") {
      return null;
    }

    await ctx.db.patch(args.resultId, {
      progress: Math.max(result.progress, 10),
      status: "running",
      triggerRunId: args.triggerRunId ?? result.triggerRunId,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const markRetrying = internalMutation({
  args: {
    attempt: v.number(),
    resultId: v.id("imageResults"),
    triggerRunId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const result = await ctx.db.get(args.resultId);
    if (!result || result.status === "completed") {
      return null;
    }

    await ctx.db.patch(args.resultId, {
      progress: Math.max(result.progress, 20),
      status: "retrying",
      triggerRunId: args.triggerRunId ?? result.triggerRunId,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const markCompleted = internalMutation({
  args: {
    imageUrl: v.optional(v.string()),
    mimeType: v.string(),
    providerMetadata: v.optional(metadataValidator),
    r2Key: v.string(),
    resultId: v.id("imageResults"),
    triggerRunId: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const result = await ctx.db.get(args.resultId);
    if (!result) {
      return false;
    }

    if (result.status === "completed" && result.r2Key) {
      return false;
    }

    await ctx.db.patch(args.resultId, {
      completedAt: Date.now(),
      imageUrl: args.imageUrl,
      mimeType: args.mimeType,
      progress: 100,
      providerMetadata: args.providerMetadata,
      r2Key: args.r2Key,
      status: "completed",
      triggerRunId: args.triggerRunId ?? result.triggerRunId,
      updatedAt: Date.now(),
    });

    return true;
  },
});

export const markFailed = internalMutation({
  args: {
    failureReason: v.string(),
    resultId: v.id("imageResults"),
    triggerRunId: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const result = await ctx.db.get(args.resultId);
    if (
      !result ||
      result.status === "completed" ||
      result.status === "failed"
    ) {
      return false;
    }

    await ctx.db.patch(args.resultId, {
      failureReason: args.failureReason,
      status: "failed",
      triggerRunId: args.triggerRunId ?? result.triggerRunId,
      updatedAt: Date.now(),
    });

    return true;
  },
});
