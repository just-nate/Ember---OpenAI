import type { Doc } from "../../convex/_generated/dataModel";

const steps = [
  { at: 0, label: "Queued" },
  { at: 10, label: "Generating" },
  { at: 80, label: "Storing" },
  { at: 100, label: "Ready" },
];

export function ProgressSteps({ job }: { job: Doc<"jobs"> }) {
  return (
    <section aria-label="Generation progress" className="grid gap-3">
      <progress className="h-3 w-full" max={100} value={job.progress}>
        {job.progress}%
      </progress>
      <ol className="grid gap-2 text-sm sm:grid-cols-4">
        {steps.map((step) => {
          const isReached =
            job.progress >= step.at || job.status === "completed";
          return (
            <li className="flex items-center gap-2" key={step.label}>
              <span
                aria-hidden="true"
                className={`h-2.5 w-2.5 rounded-full border ${isReached ? "bg-primary" : "bg-background"}`}
              />
              <span>{step.label}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
