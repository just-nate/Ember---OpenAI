import { JobDetailPage } from "@/pages/job-detail-page";
import type { Id } from "../../convex/_generated/dataModel";

export function JobRouteView({ jobId }: { jobId: string }) {
  return <JobDetailPage jobId={jobId as Id<"jobs">} />;
}
