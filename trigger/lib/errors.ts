import { AbortTaskRunError } from "@trigger.dev/sdk";

export class ImageProviderError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = "ImageProviderError";
    this.retryable = retryable;
  }
}

export function isRetryableHttpStatus(status: number) {
  return status === 429 || status >= 500;
}

export function normalizeImageError(error: unknown): ImageProviderError {
  if (error instanceof ImageProviderError) {
    return error;
  }

  const maybeStatus =
    typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status?: unknown }).status)
      : undefined;
  const message =
    error instanceof Error ? error.message : "Image generation failed.";
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("moderation") ||
    lowerMessage.includes("policy") ||
    lowerMessage.includes("invalid")
  ) {
    return new ImageProviderError(message, false);
  }

  if (maybeStatus !== undefined && Number.isFinite(maybeStatus)) {
    return new ImageProviderError(message, isRetryableHttpStatus(maybeStatus));
  }

  return new ImageProviderError(message, true);
}

export function abortNonRetryable(error: ImageProviderError): never {
  throw new AbortTaskRunError(error.message);
}
