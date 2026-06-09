import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const jobStatusValidator = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("retrying"),
  v.literal("failed"),
  v.literal("completed")
);

export const imageResultStatusValidator = jobStatusValidator;

export const activityTypeValidator = v.union(
  v.literal("prompt_received"),
  v.literal("queued"),
  v.literal("started"),
  v.literal("generating"),
  v.literal("retrying"),
  v.literal("storing"),
  v.literal("ready"),
  v.literal("failed"),
  v.literal("completed")
);

export const imageQualityValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("auto")
);

export const imageFormatValidator = v.union(
  v.literal("png"),
  v.literal("jpeg"),
  v.literal("webp")
);

export default defineSchema({
  jobs: defineTable({
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
  })
    .index("by_created_at", ["createdAt"])
    .index("by_status", ["status"])
    .index("by_trigger_run_id", ["triggerRunId"]),
  imageResults: defineTable({
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    failureReason: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    jobId: v.id("jobs"),
    mimeType: v.optional(v.string()),
    progress: v.number(),
    providerMetadata: v.optional(v.record(v.string(), v.string())),
    r2Key: v.optional(v.string()),
    status: imageResultStatusValidator,
    triggerRunId: v.optional(v.string()),
    updatedAt: v.number(),
    variantIndex: v.number(),
  })
    .index("by_job", ["jobId"])
    .index("by_job_and_status", ["jobId", "status"])
    .index("by_trigger_run_id", ["triggerRunId"]),
  activities: defineTable({
    createdAt: v.number(),
    dedupeKey: v.string(),
    jobId: v.id("jobs"),
    message: v.string(),
    resultId: v.optional(v.id("imageResults")),
    type: activityTypeValidator,
  })
    .index("by_job_and_created_at", ["jobId", "createdAt"])
    .index("by_dedupe_key", ["dedupeKey"]),
});
