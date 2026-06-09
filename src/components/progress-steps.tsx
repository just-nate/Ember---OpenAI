import type { Doc } from "../../convex/_generated/dataModel";

const steps = [
  { at: 0, label: "Queued" },
  { at: 10, label: "Generating" },
  { at: 80, label: "Storing" },
  { at: 100, label: "Ready" },
];

export function ProgressSteps({ job }: { job: Doc<"jobs"> }) {
  return (
    <section aria-label="Generation progress" className="grid gap-5">
      <div>
        <div className="flex items-center justify-between gap-4">
          <p className="ember-kicker">Progress</p>
          <p className="font-black text-2xl tracking-[-0.06em]">
            {job.progress}%
          </p>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden bg-white/10">
          <div
            className="h-full bg-primary shadow-[0_0_24px_rgba(21,112,239,0.75)] transition-all duration-700"
            style={{ width: `${job.progress}%` }}
          />
        </div>
      </div>
      <ol className="grid gap-3 text-sm sm:grid-cols-4">
        {steps.map((step) => {
          const isReached =
            job.progress >= step.at || job.status === "completed";
          return (
            <li className="flex items-center gap-2" key={step.label}>
              <span
                aria-hidden="true"
                className={`size-2.5 rounded-full border ${isReached ? "border-primary bg-primary" : "border-border bg-black"}`}
              />
              <span
                className={
                  isReached ? "text-foreground" : "text-muted-foreground"
                }
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
