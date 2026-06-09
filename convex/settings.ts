import { v } from "convex/values";
import { query } from "./_generated/server";

const checkValidator = v.object({
  description: v.string(),
  name: v.string(),
  ok: v.boolean(),
  required: v.boolean(),
});

function hasEnv(name: string) {
  return Boolean(process.env[name]);
}

export const health = query({
  args: {},
  returns: v.object({ checks: v.array(checkValidator), ok: v.boolean() }),
  handler: () => {
    const checks = [
      {
        description:
          "Convex deployment URL is available for realtime app state.",
        name: "Convex realtime URL",
        ok: hasEnv("CONVEX_CLOUD_URL"),
        required: true,
      },
      {
        description:
          "Convex HTTP actions URL is configured for Trigger.dev callbacks.",
        name: "Convex site URL",
        ok: hasEnv("CONVEX_SITE_URL"),
        required: true,
      },
      {
        description:
          "Worker callbacks require a shared secret before they can write state.",
        name: "Worker callback secret",
        ok: hasEnv("CONVEX_WORKER_SECRET"),
        required: true,
      },
      {
        description: "Trigger.dev project reference is configured.",
        name: "Trigger project",
        ok: hasEnv("TRIGGER_PROJECT_REF"),
        required: true,
      },
      {
        description: "Trigger.dev secret key is configured for worker runs.",
        name: "Trigger secret",
        ok: hasEnv("TRIGGER_SECRET_KEY"),
        required: true,
      },
      {
        description: "OpenAI key is configured for GPT Image 2 generation.",
        name: "OpenAI provider",
        ok: hasEnv("OPENAI_API_KEY"),
        required: true,
      },
      {
        description: "R2 bucket, endpoint, API token, and access keys are set.",
        name: "Cloudflare R2 storage",
        ok: Boolean(
          process.env.R2_BUCKET &&
            process.env.R2_ENDPOINT &&
            process.env.R2_TOKEN &&
            process.env.R2_ACCESS_KEY_ID &&
            process.env.R2_SECRET_ACCESS_KEY
        ),
        required: true,
      },
      {
        description:
          "Optional public base URL is configured for stable copied image links.",
        name: "R2 public URL",
        ok: hasEnv("R2_PUBLIC_BASE_URL"),
        required: false,
      },
    ];

    // Optional checks can be incomplete without blocking readiness.
    return {
      checks,
      ok: checks.every((check) => !check.required || check.ok),
    };
  },
});
