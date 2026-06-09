import { defineConfig } from "@trigger.dev/sdk";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is required. Add it to .env.local or your Trigger.dev environment.`
    );
  }
  return value;
}

export default defineConfig({
  project: requiredEnv("TRIGGER_PROJECT_REF"),
  dirs: ["./trigger"],
  runtime: "node",
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 30_000,
      factor: 2,
    },
  },
  maxDuration: 600,
});
