import { AlertTriangle, Check, CircleDashed } from "lucide-react";

interface HealthCheck {
  description: string;
  name: string;
  ok: boolean;
  required: boolean;
}

function statusLabel(check: HealthCheck) {
  if (check.ok) {
    return "Ready";
  }
  return check.required ? "Required" : "Optional";
}

function statusTone(check: HealthCheck) {
  if (check.ok) {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
  }
  if (check.required) {
    return "border-amber-400/40 bg-amber-400/10 text-amber-300";
  }
  return "border-white/15 bg-white/8 text-muted-foreground";
}

function statusIcon(check: HealthCheck) {
  if (check.ok) {
    return Check;
  }
  if (check.required) {
    return AlertTriangle;
  }
  return CircleDashed;
}

export function SetupHealth({ checks }: { checks: HealthCheck[] | undefined }) {
  if (checks === undefined) {
    return <p className="mt-8 text-muted-foreground">Loading readiness...</p>;
  }

  return (
    <div className="mt-10 grid gap-5">
      {checks.map((check, index) => {
        const Icon = statusIcon(check);

        return (
          <article
            className="ember-panel ember-reveal rounded-sm p-5 transition duration-500 hover:border-primary/60"
            key={check.name}
            style={{ animationDelay: `${index * 55}ms` }}
          >
            <div className="flex items-start justify-between gap-5">
              <div className="flex gap-4">
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-sm border ${statusTone(check)}`}
                >
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <h2 className="font-black text-xl tracking-[-0.04em]">
                    {check.name}
                  </h2>
                  <p className="mt-2 max-w-2xl text-muted-foreground text-sm leading-6">
                    {check.description}
                  </p>
                </div>
              </div>
              <span
                className={`rounded-full border px-3 py-1 font-black text-xs uppercase tracking-[0.12em] ${statusTone(check)}`}
              >
                {statusLabel(check)}
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
}
