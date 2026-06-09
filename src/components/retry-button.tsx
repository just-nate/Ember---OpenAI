import { useMutation } from "convex/react";
import { RotateCcw } from "lucide-react";
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
      className="inline-flex items-center gap-2 rounded-sm bg-white px-4 py-2 font-black text-black transition hover:bg-primary hover:text-primary-foreground"
      onClick={handleRetry}
      type="button"
    >
      <RotateCcw aria-hidden="true" className="size-4" />
      Retry
    </button>
  );
}
