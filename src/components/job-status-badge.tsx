import type { Doc } from "../../convex/_generated/dataModel";

type Status = Doc<"jobs">["status"] | Doc<"imageResults">["status"];

const statusLabels: Record<Status, string> = {
  completed: "Done",
  failed: "Failed",
  queued: "Queued",
  retrying: "Retrying",
  running: "Active",
};

const statusClasses: Record<Status, string> = {
  completed: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  failed: "border-red-400/35 bg-red-400/10 text-red-300",
  queued: "border-white/15 bg-white/8 text-muted-foreground",
  retrying: "border-amber-400/35 bg-amber-400/10 text-amber-300",
  running: "border-primary/40 bg-primary/15 text-primary",
};

export function JobStatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-black text-xs uppercase tracking-[0.1em] ${statusClasses[status]}`}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      <span>{statusLabels[status]}</span>
    </span>
  );
}
