import { createFileRoute } from "@tanstack/react-router";
import { JobsPage } from "@/pages/jobs-page";

export const Route = createFileRoute("/jobs")({ component: JobsPage });
