import { Link } from "@tanstack/react-router";
import { Crown, Home, Globe, Users, User, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { JungleBackdrop } from "@/components/JungleBackdrop";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/online", label: "Online", icon: Globe },
  { to: "/friends", label: "Friends", icon: Users },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="relative min-h-dvh pb-20 lg:pb-0">
      <JungleBackdrop />
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <Crown className="h-6 w-6 text-gold" />
            <span className="font-display text-2xl font-bold text-gold-gradient">Royal Chess</span>
          </Link>
          <nav className="hidden gap-1 lg:flex" aria-label="Main">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground"
                activeProps={{ className: "rounded-lg px-3 py-2 text-sm text-gold bg-gold-soft" }}
                activeOptions={{ exact: n.to === "/" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className={wide ? "mx-auto max-w-6xl px-3 py-4 sm:px-4" : "mx-auto max-w-3xl px-4 py-6"}>{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 backdrop-blur-md lg:hidden" aria-label="Main">
        <div className="mx-auto grid max-w-md grid-cols-5 pb-[env(safe-area-inset-bottom)]">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground"
              activeProps={{ className: "flex flex-col items-center gap-0.5 py-2 text-[11px] text-gold" }}
              activeOptions={{ exact: n.to === "/" }}
            >
              <n.icon className="h-5 w-5" />
              {n.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
