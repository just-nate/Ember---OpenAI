import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import {
  FolderClock,
  Grid2X2,
  HelpCircle,
  ImagePlus,
  Settings,
  Sparkles,
} from "lucide-react";

const navItems = [
  { icon: Grid2X2, label: "Workspace", to: "/" },
  { icon: FolderClock, label: "History", to: "/jobs" },
  { icon: Settings, label: "Settings", to: "/settings" },
] as const;

export function AppShell() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  return (
    <div className="min-h-svh overflow-x-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_70%_10%,rgba(28,98,255,0.16),transparent_34%),radial-gradient(circle_at_20%_88%,rgba(255,255,255,0.05),transparent_30%)]" />
      <div className="relative min-h-svh lg:grid lg:grid-cols-[20rem_1fr]">
        <aside className="border-border/80 border-b bg-sidebar/95 px-5 py-5 backdrop-blur-xl lg:sticky lg:top-0 lg:h-svh lg:border-r lg:border-b-0 lg:px-6 lg:py-7">
          <div className="flex items-center justify-between gap-4 lg:block">
            <Link
              aria-label="Go to create workspace"
              className="group flex items-center gap-3"
              to="/"
            >
              <span className="grid size-10 place-items-center rounded-sm bg-primary text-primary-foreground shadow-[0_0_40px_rgba(21,112,239,0.45)] transition-transform duration-500 group-hover:scale-105">
                <Sparkles aria-hidden="true" className="size-5" />
              </span>
              <span>
                <span className="block font-black text-2xl leading-none tracking-[-0.06em]">
                  EMBER
                </span>
                <span className="mt-1 block font-medium text-muted-foreground text-xs tracking-[0.14em]">
                  Image operations
                </span>
              </span>
            </Link>
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-4 py-2 font-bold text-primary-foreground text-sm shadow-[0_0_30px_rgba(21,112,239,0.25)] transition duration-300 hover:scale-[1.02] hover:bg-primary/90 lg:mt-10 lg:flex lg:w-full lg:py-3"
              to="/"
            >
              <ImagePlus aria-hidden="true" className="size-4" />
              New Project
            </Link>
          </div>

          <nav
            aria-label="Main navigation"
            className="mt-5 flex gap-2 overflow-x-auto lg:mt-9 lg:grid lg:gap-3"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.to === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.to);

              return (
                <Link
                  aria-current={isActive ? "page" : undefined}
                  className={`group flex min-w-max items-center gap-3 rounded-sm px-3 py-3 font-semibold text-sm transition duration-300 lg:min-w-0 ${
                    isActive
                      ? "bg-white/18 text-foreground shadow-inner"
                      : "text-muted-foreground hover:bg-white/8 hover:text-foreground"
                  }`}
                  key={item.to}
                  to={item.to}
                >
                  <Icon
                    aria-hidden="true"
                    className="size-5 transition-transform duration-500 group-hover:scale-110"
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto hidden border-border border-t pt-7 lg:absolute lg:right-6 lg:bottom-7 lg:left-6 lg:block">
            <a
              className="flex items-center gap-3 rounded-sm px-3 py-3 text-muted-foreground transition hover:bg-white/8 hover:text-foreground"
              href="https://github.com/just-nate/Ember---OpenAI"
              rel="noreferrer"
              target="_blank"
            >
              <HelpCircle aria-hidden="true" className="size-5" />
              Docs
            </a>
          </div>
        </aside>

        <Outlet />
      </div>
      {import.meta.env.DEV ? (
        <TanStackRouterDevtools position="bottom-right" />
      ) : null}
    </div>
  );
}
