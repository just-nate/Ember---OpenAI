import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type RetryButtonProps =
  | { jobId: Id<"jobs">; kind: "job"; resultId?: never }
  | { jobId?: never; kind: "result"; resultId: Id<"imageResults"> };

export function RetryButton(props: RetryButtonProps) {
  const retryJob = useMutation(api.jobs.retry);
  const retryResult = useMutation(api.imageResults.retry);

  async function handleRetry() {
    if (props.kind === "job") {
      await retryJob({ jobId: props.jobId });
      return;
    }
    await retryResult({ resultId: props.resultId });
  }

  return (
    <button
      className="rounded-full bg-primary px-5 py-3 font-medium text-primary-foreground"
      onClick={handleRetry}
      type="button"
    >
      Try again
    </button>
  );
}
