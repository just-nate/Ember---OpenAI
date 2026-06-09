import { useQuery } from "convex/react";
import { AlertTriangle, ServerCog } from "lucide-react";
import { SetupHealth } from "@/components/setup-health";
import { api } from "../../convex/_generated/api";

export function SettingsPage() {
  const health = useQuery(api.settings.health);
  const failedRequired = health?.checks.filter(
    (check) => check.required && !check.ok
  ).length;

  return (
    <main className="min-h-svh overflow-y-auto px-5 py-8 md:px-10 lg:h-svh lg:px-12">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section>
          <h1 className="max-w-4xl font-black text-5xl tracking-[-0.08em] md:text-6xl">
            Environment Readiness
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-muted-foreground leading-8">
            Review required services and integrations before running durable GPT
            Image 2 generation through Convex, Trigger.dev, and Cloudflare R2.
          </p>
          <SetupHealth checks={health?.checks} />
        </section>

        <aside className="space-y-5 xl:sticky xl:top-8 xl:self-start xl:pt-36">
          <section className="ember-panel rounded-sm p-7 text-center">
            <div className="mx-auto grid size-20 place-items-center rounded-sm border border-amber-400/40 bg-amber-400/10 text-amber-300">
              {health?.ok ? (
                <ServerCog aria-hidden="true" className="size-9" />
              ) : (
                <AlertTriangle aria-hidden="true" className="size-9" />
              )}
            </div>
            <h2 className="mt-6 font-black text-3xl tracking-[-0.06em]">
              {health?.ok ? "Ready" : "Action Required"}
            </h2>
            <p className="mt-3 text-muted-foreground leading-7">
              {health?.ok
                ? "All required dependencies are configured."
                : `${failedRequired ?? 0} required configuration item${failedRequired === 1 ? "" : "s"} need review.`}
            </p>
            <a
              className="mt-6 inline-flex w-full items-center justify-center rounded-sm bg-white px-5 py-3 font-black text-black transition hover:bg-primary hover:text-primary-foreground"
              href="https://github.com/just-nate/Ember---OpenAI#environment-variables"
              rel="noreferrer"
              target="_blank"
            >
              Resolve Issues
            </a>
          </section>

          <section className="ember-panel rounded-sm p-6">
            <h2 className="font-black text-muted-foreground text-sm uppercase tracking-[0.16em]">
              Environment Info
            </h2>
            <dl className="mt-5 grid gap-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Version</dt>
                <dd className="font-bold">v0.0.1</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Runtime</dt>
                <dd className="font-bold">Convex + Trigger</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Storage</dt>
                <dd className="font-bold">Cloudflare R2</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Provider</dt>
                <dd className="font-bold">GPT Image 2</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </main>
  );
}
