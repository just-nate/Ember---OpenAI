"use node";

import { tasks } from "@trigger.dev/sdk";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

export const enqueueImageJob = internalAction({
  args: { jobId: v.id("jobs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.runQuery(internal.jobs.getForTrigger, {
      jobId: args.jobId,
    });
    if (!job) {
      throw new ConvexError("Job not found for Trigger enqueue.");
    }

    const handle = await tasks.trigger("generate-image-job", job, {
      idempotencyKey: `ember-job:${args.jobId}`,
    });

    await ctx.runMutation(internal.jobs.markTriggerStarted, {
      jobId: args.jobId,
      triggerRunId: handle.id,
    });
    await ctx.runMutation(internal.activities.appendOnce, {
      dedupeKey: `job:${args.jobId}:trigger-enqueued`,
      jobId: args.jobId,
      message: "Queued background worker",
      type: "queued",
    });

    return null;
  },
});

export const enqueueImageResult = internalAction({
  args: { resultId: v.id("imageResults") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const result = await ctx.runQuery(internal.imageResults.getForTrigger, {
      resultId: args.resultId,
    });
    if (!result) {
      // Duplicate retry schedules can arrive after the result already moved out of queued.
      return null;
    }

    const handle = await tasks.trigger("generate-image-output", result, {
      idempotencyKey: `ember-result:${args.resultId}:retry:${Date.now()}`,
    });

    await ctx.runMutation(internal.imageResults.markRunning, {
      resultId: args.resultId,
      triggerRunId: handle.id,
    });
    await ctx.runMutation(internal.activities.appendOnce, {
      dedupeKey: `result:${args.resultId}:trigger-enqueued:${handle.id}`,
      jobId: result.jobId,
      message: "Queued result retry worker",
      resultId: args.resultId,
      type: "queued",
    });

    return null;
  },
});
