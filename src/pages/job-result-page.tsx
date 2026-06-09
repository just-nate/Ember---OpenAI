import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { ArrowLeft, Download, Images } from "lucide-react";
import { CopyUrlButton } from "@/components/copy-url-button";
import { JobStatusBadge } from "@/components/job-status-badge";
import { RetryButton } from "@/components/retry-button";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function JobResultPage({
  jobId,
  resultId,
}: {
  jobId: Id<"jobs">;
  resultId: Id<"imageResults">;
}) {
  const job = useQuery(api.jobs.get, { jobId });
  const result = useQuery(api.imageResults.get, { resultId });
  const siblingResults = useQuery(api.imageResults.listByJob, { jobId });

  if (job === undefined || result === undefined) {
    return (
      <main className="min-h-svh px-5 py-8 md:px-10 lg:px-12">Loading...</main>
    );
  }

  if (job === null || result === null || result.jobId !== jobId) {
    return (
      <main className="min-h-svh px-5 py-8 md:px-10 lg:px-12">
        Result not found.
      </main>
    );
  }

  return (
    <main className="min-h-svh px-5 py-8 md:px-10 lg:px-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          className="inline-flex items-center gap-2 text-muted-foreground text-sm transition hover:text-foreground"
          params={{ jobId }}
          to="/jobs/$jobId"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to job
        </Link>
        <JobStatusBadge status={result.status} />
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="ember-panel overflow-hidden rounded-sm">
          {result.imageUrl ? (
            <a
              className="group block bg-black"
              href={result.imageUrl}
              rel="noreferrer"
              target="_blank"
            >
              <img
                alt={`Variant ${result.variantIndex + 1} for: ${job.prompt}`}
                className="max-h-[calc(100svh-10rem)] w-full object-contain transition duration-700 group-hover:scale-[1.01]"
                height={1536}
                src={result.imageUrl}
                width={1536}
              />
            </a>
          ) : (
            <div className="grid min-h-[32rem] place-items-center bg-[radial-gradient(circle_at_50%_45%,rgba(21,112,239,0.22),transparent_35%),#030303] p-8 text-center">
              <div>
                <Images
                  aria-hidden="true"
                  className="mx-auto size-12 text-muted-foreground"
                />
                <p className="mt-4 font-black text-2xl tracking-[-0.05em]">
                  Image not ready yet
                </p>
                <p className="mt-2 text-muted-foreground">
                  This output is still queued, running, retrying, or failed.
                </p>
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <section className="ember-panel rounded-sm p-6">
            <p className="ember-kicker">Output</p>
            <h1 className="mt-3 font-black text-4xl tracking-[-0.07em]">
              Variant {result.variantIndex + 1}
            </h1>
            <p className="mt-5 border-border border-y py-5 text-muted-foreground leading-7">
              {job.prompt}
            </p>
            <dl className="mt-5 grid gap-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Job status</dt>
                <dd className="font-bold">{job.status}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Output status</dt>
                <dd className="font-bold">{result.status}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Format</dt>
                <dd className="font-bold">{job.format.toUpperCase()}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Size</dt>
                <dd className="font-bold">{job.size}</dd>
              </div>
            </dl>
            <div className="mt-6 flex flex-wrap gap-2">
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
              <p className="mt-5 text-destructive text-sm leading-6">
                {result.failureReason}
              </p>
            ) : null}
          </section>

          <section className="ember-panel rounded-sm p-4">
            <p className="ember-kicker px-2">All outputs</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {siblingResults?.map((sibling) => (
                <Link
                  aria-label={`Open variant ${sibling.variantIndex + 1}`}
                  className={`group grid aspect-square place-items-center overflow-hidden border transition hover:border-primary ${
                    sibling._id === resultId
                      ? "border-primary"
                      : "border-border"
                  }`}
                  key={sibling._id}
                  params={{ jobId, resultId: sibling._id }}
                  to="/jobs/$jobId/results/$resultId"
                >
                  {sibling.imageUrl ? (
                    <img
                      alt={`Variant ${sibling.variantIndex + 1}`}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      height={256}
                      src={sibling.imageUrl}
                      width={256}
                    />
                  ) : (
                    <span className="font-black text-muted-foreground text-xs">
                      {sibling.variantIndex + 1}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
