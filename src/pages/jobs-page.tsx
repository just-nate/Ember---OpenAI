import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function JobsPage() {
  const jobs = useQuery(api.jobs.list, { limit: 50 });

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-medium text-muted-foreground text-sm uppercase tracking-[0.24em]">
            Ember
          </p>
          <h1 className="mt-3 font-semibold text-3xl tracking-tight">
            Workspace
          </h1>
        </div>
        <Link className="rounded-full border px-4 py-2 text-sm" to="/">
          New creation
        </Link>
      </div>
      {jobs === undefined ? (
        <p className="mt-8 text-muted-foreground">Loading...</p>
      ) : null}
      {jobs?.length === 0 ? (
        <p className="mt-8 text-muted-foreground">No creations yet.</p>
      ) : null}
      <div className="mt-8 grid gap-4">
        {jobs?.map((job) => (
          <Link
            className="rounded-3xl border bg-card p-5 transition hover:border-primary"
            key={job._id}
            params={{ jobId: job._id }}
            to="/jobs/$jobId"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="line-clamp-2 font-medium">{job.prompt}</p>
                <p className="mt-2 text-muted-foreground text-sm">
                  {job.count} piece(s) · {job.size} · {job.quality}
                </p>
              </div>
              <span className="rounded-full border px-3 py-1 text-sm">
                {job.status}
              </span>
            </div>
            <progress
              className="mt-4 h-2 w-full"
              max={100}
              value={job.progress}
            >
              {job.progress}%
            </progress>
          </Link>
        ))}
      </div>
    </main>
  );
}
