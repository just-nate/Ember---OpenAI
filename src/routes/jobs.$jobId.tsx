/* eslint-disable react-refresh/only-export-components */

import { createFileRoute } from "@tanstack/react-router";
import { JobRouteView } from "@/pages/job-route-view";

export const Route = createFileRoute("/jobs/$jobId")({
  component: JobRoute,
});

function JobRoute() {
  const { jobId } = Route.useParams();

  return <JobRouteView jobId={jobId} />;
}
