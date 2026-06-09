/* eslint-disable react-refresh/only-export-components */

import { createFileRoute } from "@tanstack/react-router";
import { JobResultPage } from "@/pages/job-result-page";
import type { Id } from "../../convex/_generated/dataModel";

export const Route = createFileRoute("/jobs/$jobId/results/$resultId")({
  component: JobResultRoute,
});

function JobResultRoute() {
  const { jobId, resultId } = Route.useParams();

  return (
    <JobResultPage
      jobId={jobId as Id<"jobs">}
      resultId={resultId as Id<"imageResults">}
    />
  );
}
