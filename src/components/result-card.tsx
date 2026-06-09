import { Download } from "lucide-react";
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
    <article className="group overflow-hidden border border-border bg-black/50 transition duration-500 hover:-translate-y-1 hover:border-primary/70">
      {result.imageUrl ? (
        <div className="overflow-hidden border-border border-b bg-black">
          <img
            alt={`Variant ${result.variantIndex + 1} for: ${job.prompt}`}
            className="aspect-square w-full object-cover transition duration-700 group-hover:scale-105"
            height={1024}
            src={result.imageUrl}
            width={1024}
          />
        </div>
      ) : (
        <div className="grid aspect-square place-items-center border-border border-b bg-[radial-gradient(circle_at_50%_45%,rgba(21,112,239,0.2),transparent_35%),#030303] text-muted-foreground">
          <JobStatusBadge status={result.status} />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="font-black text-sm uppercase tracking-[0.14em]">
            Variant {result.variantIndex + 1}
          </p>
          <JobStatusBadge status={result.status} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {result.imageUrl ? (
            <>
              <a
                className="inline-flex items-center gap-2 rounded-sm border border-border px-3 py-2 font-bold text-sm transition hover:border-primary hover:text-primary"
                download
                href={result.imageUrl}
              >
                <Download aria-hidden="true" className="size-4" />
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
          <p className="mt-4 text-destructive text-sm leading-6">
            {result.failureReason}
          </p>
        ) : null}
      </div>
    </article>
  );
}
