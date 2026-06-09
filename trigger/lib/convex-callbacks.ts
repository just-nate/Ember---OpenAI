import { isRetryableHttpStatus } from "./errors";

type JsonValue =
  | boolean
  | number
  | string
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type CallbackPayload = Record<string, JsonValue>;

const WORKER_SECRET_HEADER = "X-Ember-Worker-Secret";
const MAX_CALLBACK_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 500;
const TRAILING_SLASH_PATTERN = /\/$/u;

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function convexSiteUrl() {
  const url = requiredEnv("CONVEX_SITE_URL").replace(
    TRAILING_SLASH_PATTERN,
    ""
  );
  if (!url.endsWith(".convex.site")) {
    throw new Error(
      "CONVEX_SITE_URL must be the Convex .convex.site HTTP action URL."
    );
  }
  return url;
}

class CallbackError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "CallbackError";
    this.status = status;
  }
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function postJson(path: string, payload: CallbackPayload) {
  const response = await fetch(`${convexSiteUrl()}${path}`, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
      [WORKER_SECRET_HEADER]: requiredEnv("CONVEX_WORKER_SECRET"),
    },
    method: "POST",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new CallbackError(
      `Convex callback ${path} failed with ${response.status}: ${body}`,
      response.status
    );
  }

  return (await response.json()) as CallbackPayload;
}

export async function postWorkerCallback(
  path: string,
  payload: CallbackPayload
) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_CALLBACK_ATTEMPTS; attempt += 1) {
    try {
      return await postJson(path, payload);
    } catch (error) {
      lastError = error;
      const status = error instanceof CallbackError ? error.status : 0;
      const canRetry = status === 0 || isRetryableHttpStatus(status);
      if (!canRetry || attempt === MAX_CALLBACK_ATTEMPTS) {
        throw error;
      }

      // Callback writes are idempotent; retrying only transient failures prevents duplicate rows.
      await sleep(BASE_RETRY_DELAY_MS * 2 ** (attempt - 1));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Convex callback failed.");
}

export async function markJobStarted(jobId: string, triggerRunId: string) {
  await postWorkerCallback("/worker/jobs/started", { jobId, triggerRunId });
}

export async function markJobComplete(jobId: string, triggerRunId: string) {
  await postWorkerCallback("/worker/jobs/complete", { jobId, triggerRunId });
}

export async function markJobFailed(
  jobId: string,
  triggerRunId: string,
  failureReason: string
) {
  await postWorkerCallback("/worker/jobs/failed", {
    failureReason,
    jobId,
    triggerRunId,
  });
}

export async function markImageStarted(
  jobId: string,
  resultId: string,
  triggerRunId: string
) {
  await postWorkerCallback("/worker/images/started", {
    jobId,
    resultId,
    triggerRunId,
  });
}

export async function markImageRetrying(
  jobId: string,
  resultId: string,
  triggerRunId: string,
  attempt: number
) {
  await postWorkerCallback("/worker/images/retrying", {
    attempt,
    jobId,
    resultId,
    triggerRunId,
  });
}

export async function completeImage(payload: CallbackPayload) {
  return await postWorkerCallback("/worker/images/complete", payload);
}

export async function markImageFailed(
  jobId: string,
  resultId: string,
  triggerRunId: string,
  failureReason: string
) {
  await postWorkerCallback("/worker/images/failed", {
    failureReason,
    jobId,
    resultId,
    triggerRunId,
  });
}
