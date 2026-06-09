import { useQuery } from "convex/react";
import { SetupHealth } from "@/components/setup-health";
import { api } from "../../convex/_generated/api";

export function SettingsPage() {
  const health = useQuery(api.settings.health);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <p className="font-medium text-muted-foreground text-sm uppercase tracking-[0.24em]">
        Ember
      </p>
      <h1 className="mt-3 font-semibold text-3xl tracking-tight">Readiness</h1>
      <p className="mt-3 text-muted-foreground">
        Check the environment pieces needed before running durable image
        generation.
      </p>
      <SetupHealth checks={health?.checks} />
    </main>
  );
}
