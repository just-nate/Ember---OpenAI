import type { Doc } from "../../convex/_generated/dataModel";

type Status = Doc<"jobs">["status"] | Doc<"imageResults">["status"];

const statusLabels: Record<Status, string> = {
  completed: "Completed",
  failed: "Failed",
  queued: "Queued",
  retrying: "Retrying",
  running: "Running",
};

export function JobStatusBadge({ status }: { status: Status }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-medium text-sm">
      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-current" />
      <span>{statusLabels[status]}</span>
    </span>
  );
}
