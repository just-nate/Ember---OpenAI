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

export function SetupHealth({ checks }: { checks: HealthCheck[] | undefined }) {
  if (checks === undefined) {
    return <p className="mt-8 text-muted-foreground">Loading readiness...</p>;
  }

  return (
    <div className="mt-8 grid gap-4">
      {checks.map((check) => (
        <article className="rounded-3xl border bg-card p-5" key={check.name}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold">{check.name}</h2>
              <p className="mt-2 text-muted-foreground text-sm">
                {check.description}
              </p>
            </div>
            <span className="rounded-full border px-3 py-1 text-sm">
              {statusLabel(check)}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}
