import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { ArrowLeft } from "lucide-react";
import { ActivityTimeline } from "@/components/activity-timeline";
import { JobStatusBadge } from "@/components/job-status-badge";
import { ProgressSteps } from "@/components/progress-steps";
import { ResultGallery } from "@/components/result-gallery";
import { RetryButton } from "@/components/retry-button";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function JobDetailPage({ jobId }: { jobId: Id<"jobs"> }) {
  const job = useQuery(api.jobs.get, { jobId });
  const results = useQuery(api.imageResults.listByJob, { jobId });
  const activities = useQuery(api.activities.listByJob, { jobId, limit: 100 });

  if (job === undefined) {
    return (
      <main className="min-h-svh px-5 py-8 md:px-10 lg:px-12">Loading...</main>
    );
  }

  if (job === null) {
    return (
      <main className="min-h-svh px-5 py-8 md:px-10 lg:px-12">
        Creation not found.
      </main>
    );
  }

  return (
    <main className="min-h-svh px-5 py-8 md:px-10 lg:px-12">
      <Link
        className="inline-flex items-center gap-2 text-muted-foreground text-sm transition hover:text-foreground"
        to="/jobs"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to history
      </Link>
      <div className="mt-7 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="ember-panel rounded-sm p-6 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="ember-kicker">Job detail</p>
              <h1 className="mt-3 font-black text-4xl tracking-[-0.07em] md:text-5xl">
                Generation Run
              </h1>
            </div>
            <JobStatusBadge status={job.status} />
          </div>
          <p className="mt-6 border-border border-y py-5 text-lg text-muted-foreground leading-8">
            {job.prompt}
          </p>
          <div className="mt-6">
            <ProgressSteps job={job} />
          </div>
          {job.status === "failed" ? (
            <div className="mt-6">
              <RetryButton jobId={job._id} kind="job" />
            </div>
          ) : null}
          <h2 className="mt-10 font-black text-2xl tracking-[-0.05em]">
            Activity
          </h2>
          <ActivityTimeline
            activities={activities}
            isLoading={activities === undefined}
          />
        </section>
        <section className="ember-panel rounded-sm p-6 md:p-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="ember-kicker">Outputs</p>
              <h2 className="mt-3 font-black text-4xl tracking-[-0.07em]">
                Gallery
              </h2>
            </div>
            <p className="font-black text-muted-foreground text-xs uppercase tracking-[0.16em]">
              {job.completedResults}/{job.count} ready
            </p>
          </div>
          <ResultGallery job={job} results={results} />
        </section>
      </div>
    </main>
  );
}
