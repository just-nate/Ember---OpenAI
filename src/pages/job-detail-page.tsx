import { useQuery } from "convex/react";
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
    return <main className="mx-auto max-w-6xl px-6 py-10">Loading...</main>;
  }

  if (job === null) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">Creation not found.</main>
    );
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-3xl border bg-card p-6">
        <p className="font-medium text-muted-foreground text-sm uppercase tracking-[0.24em]">
          Ember
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-semibold text-3xl tracking-tight">Job detail</h1>
          <JobStatusBadge status={job.status} />
        </div>
        <p className="mt-4 text-muted-foreground">{job.prompt}</p>
        <div className="mt-6">
          <ProgressSteps job={job} />
        </div>
        {job.status === "failed" ? (
          <div className="mt-6">
            <RetryButton jobId={job._id} kind="job" />
          </div>
        ) : null}
        <h2 className="mt-8 font-semibold text-xl">Activity</h2>
        <ActivityTimeline
          activities={activities}
          isLoading={activities === undefined}
        />
      </section>
      <section className="rounded-3xl border bg-card p-6">
        <h2 className="font-semibold text-xl">Gallery</h2>
        <ResultGallery job={job} results={results} />
      </section>
    </main>
  );
}
