import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { activityTypeValidator } from "./schema";

const activityValidator = v.object({
  _creationTime: v.number(),
  _id: v.id("activities"),
  createdAt: v.number(),
  dedupeKey: v.string(),
  jobId: v.id("jobs"),
  message: v.string(),
  resultId: v.optional(v.id("imageResults")),
  type: activityTypeValidator,
});

export const listByJob = query({
  args: { jobId: v.id("jobs"), limit: v.optional(v.number()) },
  returns: v.array(activityValidator),
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 100, 200);

    return await ctx.db
      .query("activities")
      .withIndex("by_job_and_created_at", (q) => q.eq("jobId", args.jobId))
      .order("asc")
      .take(limit);
  },
});

export const appendOnce = internalMutation({
  args: {
    dedupeKey: v.string(),
    jobId: v.id("jobs"),
    message: v.string(),
    resultId: v.optional(v.id("imageResults")),
    type: activityTypeValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("activities")
      .withIndex("by_dedupe_key", (q) => q.eq("dedupeKey", args.dedupeKey))
      .unique();

    if (existing) {
      return null;
    }

    await ctx.db.insert("activities", {
      createdAt: Date.now(),
      dedupeKey: args.dedupeKey,
      jobId: args.jobId,
      message: args.message,
      resultId: args.resultId,
      type: args.type,
    });

    return null;
  },
});
