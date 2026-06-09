import { CopyUrlButton } from "@/components/copy-url-button";
import { JobStatusBadge } from "@/components/job-status-badge";
import { RetryButton } from "@/components/retry-button";
import type { Doc } from "../../convex/_generated/dataModel";

export function ResultCard({
  job,
  result,
}: {
  job: Doc<"jobs">;
  result: Doc<"imageResults">;
}) {
  return (
    <article className="rounded-2xl border p-4">
      {result.imageUrl ? (
        <img
          alt={`Variant ${result.variantIndex + 1} for: ${job.prompt}`}
          className="aspect-square w-full rounded-xl object-cover"
          height={1024}
          src={result.imageUrl}
          width={1024}
        />
      ) : (
        <div className="grid aspect-square place-items-center rounded-xl bg-muted text-muted-foreground">
          <JobStatusBadge status={result.status} />
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {result.imageUrl ? (
          <>
            <a
              className="rounded-full border px-3 py-2 text-sm"
              download
              href={result.imageUrl}
            >
              Download
            </a>
            <CopyUrlButton imageUrl={result.imageUrl} />
          </>
        ) : null}
        {result.status === "failed" ? (
          <RetryButton kind="result" resultId={result._id} />
        ) : null}
      </div>
      {result.failureReason ? (
        <p className="mt-3 text-destructive text-sm">{result.failureReason}</p>
      ) : null}
    </article>
  );
}
