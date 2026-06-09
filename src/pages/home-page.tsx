import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { JobForm } from "@/components/job-form";
import { JobStatusBadge } from "@/components/job-status-badge";
import { api } from "../../convex/_generated/api";

export function HomePage() {
  const jobs = useQuery(api.jobs.list, { limit: 5 });

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <p className="font-medium text-muted-foreground text-sm uppercase tracking-[0.24em]">
          Ember
        </p>
        <h1 className="mt-3 font-semibold text-4xl tracking-tight">
          Create polished image sets in one quiet flow
        </h1>
        <p className="mt-3 text-muted-foreground">
          Shape a prompt, choose the output style, and let Ember prepare each
          result through a durable worker.
        </p>
        <JobForm />
      </section>
      <aside className="rounded-3xl border bg-card p-6">
        <h2 className="font-semibold text-xl">Recent work</h2>
        {jobs === undefined ? (
          <p className="mt-4 text-muted-foreground">Loading...</p>
        ) : null}
        {jobs?.length === 0 ? (
          <p className="mt-4 text-muted-foreground">Nothing here yet.</p>
        ) : null}
        <ol className="mt-4 grid gap-3">
          {jobs?.map((job) => (
            <li className="rounded-2xl border p-4" key={job._id}>
              <Link params={{ jobId: job._id }} to="/jobs/$jobId">
                <p className="line-clamp-2 font-medium">{job.prompt}</p>
                <p className="mt-2 text-muted-foreground text-sm">
                  {job.progress}% · {job.count} piece(s)
                </p>
                <div className="mt-3">
                  <JobStatusBadge status={job.status} />
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </aside>
    </main>
  );
}
