import type { Doc } from "../../convex/_generated/dataModel";

export function ActivityTimeline({
  activities,
  isLoading,
}: {
  activities: Doc<"activities">[] | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return <p className="mt-5 text-muted-foreground">Loading activity...</p>;
  }

  if (!activities || activities.length === 0) {
    return <p className="mt-5 text-muted-foreground">No activity yet.</p>;
  }

  return (
    <ol className="mt-5 grid gap-0 border-border border-t">
      {activities.map((activity) => (
        <li
          className="grid gap-2 border-border border-b py-4"
          key={activity._id}
        >
          <div className="flex items-start justify-between gap-4">
            <p className="font-bold">{activity.message}</p>
            <span className="rounded-full border border-border px-2 py-1 font-black text-[0.65rem] text-muted-foreground uppercase tracking-[0.12em]">
              {activity.type.replaceAll("_", " ")}
            </span>
          </div>
          <p className="text-muted-foreground text-sm">
            {new Date(activity.createdAt).toLocaleString()}
          </p>
        </li>
      ))}
    </ol>
  );
}
