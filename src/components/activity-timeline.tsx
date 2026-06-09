import type { Doc } from "../../convex/_generated/dataModel";

export function ActivityTimeline({
  activities,
  isLoading,
}: {
  activities: Doc<"activities">[] | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return <p className="mt-4 text-muted-foreground">Loading activity...</p>;
  }

  if (!activities || activities.length === 0) {
    return <p className="mt-4 text-muted-foreground">No activity yet.</p>;
  }

  return (
    <ol className="mt-4 grid gap-3">
      {activities.map((activity) => (
        <li className="rounded-2xl border p-4" key={activity._id}>
          <p className="font-medium">{activity.message}</p>
          <p className="mt-1 text-muted-foreground text-sm">
            {activity.type} · {new Date(activity.createdAt).toLocaleString()}
          </p>
        </li>
      ))}
    </ol>
  );
}
