import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import {
  ArrowUpRight,
  ImageOff,
  LoaderCircle,
  Plus,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import { JobStatusBadge } from "@/components/job-status-badge";
import { imageDeliveryUrl } from "@/lib/image-url";
import { api } from "../../convex/_generated/api";

function formatCreatedAt(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(new Date(timestamp));
}

export function JobsPage() {
  const jobs = useQuery(api.jobs.listWithPreview, { limit: 50 });
  const [search, setSearch] = useState("");
  const filteredJobs = useMemo(() => {
    if (!jobs) {
      return jobs;
    }
    const query = search.trim().toLowerCase();
    if (!query) {
      return jobs;
    }
    return jobs.filter((job) => job.prompt.toLowerCase().includes(query));
  }, [jobs, search]);

  return (
    <main className="min-h-svh px-5 py-8 md:px-10 lg:px-12">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-black text-5xl tracking-[-0.08em] md:text-6xl">
            History
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            View and manage previous background image generation jobs.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative block" htmlFor="history-search">
            <span className="sr-only">Search prompts</span>
            <Search
              aria-hidden="true"
              className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
            />
            <input
              className="ember-field h-12 w-full rounded-sm pr-4 pl-12 md:w-80"
              id="history-search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search prompts..."
              type="search"
              value={search}
            />
          </label>
          <Link
            className="inline-flex h-12 items-center justify-center gap-2 rounded-sm bg-white px-5 font-black text-black transition hover:scale-[1.02] hover:bg-primary hover:text-primary-foreground"
            to="/"
          >
            <Plus aria-hidden="true" className="size-5" />
            New Job
          </Link>
        </div>
      </div>

      {jobs === undefined ? (
        <div className="mt-14 flex items-center gap-3 text-muted-foreground">
          <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
          Loading jobs...
        </div>
      ) : null}
      {filteredJobs?.length === 0 ? (
        <div className="mt-14 grid min-h-72 place-items-center border border-border bg-card/50 text-center">
          <div>
            <ImageOff
              aria-hidden="true"
              className="mx-auto size-10 text-muted-foreground"
            />
            <p className="mt-4 font-semibold text-muted-foreground">
              No matching jobs.
            </p>
          </div>
        </div>
      ) : null}
      <div className="mt-14 grid grid-flow-dense gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {filteredJobs?.map((job, index) => (
          <Link
            className="group ember-panel flex min-h-80 flex-col overflow-hidden rounded-sm transition duration-500 hover:-translate-y-1 hover:border-primary/70"
            key={job._id}
            params={{ jobId: job._id }}
            style={{ animationDelay: `${index * 45}ms` }}
            to="/jobs/$jobId"
          >
            <div className="relative grid h-44 place-items-center overflow-hidden border-border border-b bg-black">
              {job.previewResultId ? (
                <img
                  alt={`Preview for: ${job.prompt}`}
                  className="h-full w-full object-cover opacity-85 transition duration-700 group-hover:scale-105 group-hover:opacity-100"
                  height={320}
                  src={imageDeliveryUrl(job.previewResultId)}
                  width={480}
                />
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(21,112,239,0.28),transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent)] opacity-80 transition duration-700 group-hover:scale-105" />
              )}
              {job.status === "running" || job.status === "retrying" ? (
                <div className="relative z-10 grid place-items-center bg-black/60 p-4 text-center backdrop-blur-sm">
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-9 animate-spin text-muted-foreground"
                  />
                  <div className="mt-5 h-1 w-36 bg-white/10">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                  <p className="mt-3 font-black text-muted-foreground text-xs uppercase tracking-[0.16em]">
                    Processing {job.progress}%
                  </p>
                </div>
              ) : null}
              {job.previewResultId ? null : (
                <div className="relative z-10 h-20 w-20 border border-primary/60 bg-primary/10 shadow-[0_0_70px_rgba(21,112,239,0.4)] transition duration-700 group-hover:rotate-45" />
              )}
              <div className="absolute top-3 right-3 z-20">
                <JobStatusBadge status={job.status} />
              </div>
              {job.count > 1 ? (
                <div className="absolute bottom-3 left-3 z-20 rounded-full border border-border bg-black/70 px-3 py-1 font-black text-xs uppercase tracking-[0.12em] backdrop-blur-sm">
                  {job.completedResults}/{job.count} images
                </div>
              ) : null}
            </div>
            <div className="flex flex-1 flex-col p-5">
              <p className="line-clamp-3 min-h-18 text-lg text-muted-foreground leading-7 group-hover:text-foreground">
                {job.prompt}
              </p>
              <div className="mt-auto flex items-end justify-between gap-4 pt-8">
                <div>
                  <p className="font-black text-muted-foreground text-xs uppercase tracking-[0.14em]">
                    {formatCreatedAt(job.createdAt)}
                  </p>
                  <p className="mt-2 text-muted-foreground text-xs">
                    {job.count} · {job.size} · {job.format.toUpperCase()}
                  </p>
                </div>
                <ArrowUpRight
                  aria-hidden="true"
                  className="size-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-foreground"
                />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
