import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { ArrowUpRight, ImageIcon } from "lucide-react";
import { JobForm } from "@/components/job-form";
import { JobStatusBadge } from "@/components/job-status-badge";
import { api } from "../../convex/_generated/api";

const previewImages = [
  "https://picsum.photos/seed/ember-black-mountain/600/420",
  "https://picsum.photos/seed/ember-control-panel/600/420",
  "https://picsum.photos/seed/ember-terminal-room/900/520",
];

export function HomePage() {
  const jobs = useQuery(api.jobs.list, { limit: 5 });

  return (
    <main className="grid min-h-svh grid-cols-1 lg:grid-cols-[1fr_27rem]">
      <section className="px-5 py-8 md:px-10 lg:px-12">
        <div className="ember-reveal max-w-3xl">
          <h1 className="font-black text-5xl tracking-[-0.08em] md:text-6xl">
            Create
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
            Generate durable image jobs through Convex realtime state,
            Trigger.dev workers, GPT Image 2, and R2 storage.
          </p>
        </div>
        <div className="ember-reveal" style={{ animationDelay: "90ms" }}>
          <JobForm />
        </div>
      </section>

      <aside className="border-border border-t bg-card/60 p-5 backdrop-blur-xl lg:min-h-svh lg:border-t-0 lg:border-l lg:p-7">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-black text-3xl tracking-[-0.06em]">Recent</h2>
          <Link
            className="font-black text-muted-foreground text-xs uppercase tracking-[0.18em] transition hover:text-foreground"
            to="/jobs"
          >
            View all
          </Link>
        </div>

        <div className="mt-7 grid grid-flow-dense grid-cols-2 gap-3">
          {previewImages.map((src, index) => (
            <div
              className={`group overflow-hidden border border-border bg-black ${index === 2 ? "col-span-2 aspect-[1.65]" : "aspect-square"}`}
              key={src}
            >
              <img
                alt="Dark generated artwork preview"
                className="h-full w-full object-cover opacity-75 grayscale transition duration-700 group-hover:scale-105 group-hover:opacity-95 group-hover:grayscale-0"
                height={420}
                src={src}
                width={600}
              />
            </div>
          ))}
        </div>

        {jobs === undefined ? (
          <p className="mt-7 text-muted-foreground">Loading recent jobs...</p>
        ) : null}
        {jobs?.length === 0 ? (
          <div className="mt-7 grid aspect-square place-items-center border border-border bg-black/50 text-center">
            <div>
              <ImageIcon
                aria-hidden="true"
                className="mx-auto size-8 text-muted-foreground"
              />
              <p className="mt-3 text-muted-foreground">No jobs yet.</p>
            </div>
          </div>
        ) : null}
        <ol className="mt-7 grid gap-3">
          {jobs?.map((job) => (
            <li
              className="group border border-border bg-black/40 transition duration-300 hover:border-primary/70"
              key={job._id}
            >
              <Link
                className="block p-4"
                params={{ jobId: job._id }}
                to="/jobs/$jobId"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="line-clamp-2 font-semibold text-muted-foreground text-sm leading-6 group-hover:text-foreground">
                    {job.prompt}
                  </p>
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
                  />
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="font-black text-muted-foreground text-xs uppercase tracking-[0.12em]">
                    {job.progress}% · {job.count} output
                    {job.count === 1 ? "" : "s"}
                  </span>
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
