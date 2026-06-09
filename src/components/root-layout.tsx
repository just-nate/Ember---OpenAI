import { Link, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";

const navItems = [
  { label: "Create", to: "/" },
  { label: "Jobs", to: "/jobs" },
  { label: "Settings", to: "/settings" },
] as const;

export function RootLayout() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b bg-card/80 backdrop-blur">
        <nav
          aria-label="Primary navigation"
          className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4"
        >
          <Link className="font-semibold tracking-tight" to="/">
            Ember
          </Link>
          <div className="flex items-center gap-2">
            {navItems.map((item) => (
              <Link
                activeProps={{
                  className: "bg-primary text-primary-foreground",
                }}
                className="rounded-full px-3 py-2 text-muted-foreground text-sm transition hover:bg-accent hover:text-accent-foreground"
                key={item.to}
                to={item.to}
              >
                {item.label}
              </Link>
            ))}
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
