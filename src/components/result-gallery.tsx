import { ResultCard } from "@/components/result-card";
import type { Doc } from "../../convex/_generated/dataModel";

export function ResultGallery({
  job,
  results,
}: {
  job: Doc<"jobs">;
  results: Doc<"imageResults">[] | undefined;
}) {
  if (results === undefined) {
    return <p className="mt-5 text-muted-foreground">Loading gallery...</p>;
  }

  if (results.length === 0) {
    return <p className="mt-5 text-muted-foreground">No result rows yet.</p>;
  }

  return (
    <div className="mt-5 grid grid-flow-dense gap-4 sm:grid-cols-2">
      {results.map((result) => (
        <ResultCard job={job} key={result._id} result={result} />
      ))}
    </div>
  );
}
