import { Link, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";

export function AppShell() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b bg-background/90 backdrop-blur">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4"
        >
          <Link className="font-semibold tracking-tight" to="/">
            Ember
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link className="rounded-full border px-3 py-1.5" to="/jobs">
              Jobs
            </Link>
            <Link className="rounded-full border px-3 py-1.5" to="/settings">
              Settings
            </Link>
          </div>
        </nav>
      </header>
      <Outlet />
      {import.meta.env.DEV ? (
        <TanStackRouterDevtools position="bottom-right" />
      ) : null}
    </div>
  );
}
