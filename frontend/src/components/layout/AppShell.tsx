import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Shield, User, PhoneCall, Menu, X, Radio, Settings as SettingsIcon } from "lucide-react";
import { useIdentity } from "../../state/identity";
import { PanicButton } from "../PanicButton";
import { ThemeToggle } from "../ThemeToggle";
import { CyberBackground } from "../cyber/CyberBackground";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { identity } = useIdentity();
  const location = useLocation();

  const links: { to: string; label: string }[] = [];
  if (identity?.role === "requester") {
    links.push({ to: "/requester", label: "New Request" });
    links.push({ to: "/requester/history", label: "My Requests" });
  }
  if (identity?.role === "contact") {
    links.push({ to: "/contact", label: "Verification Inbox" });
  }
  const dashboardTarget =
    identity?.role === "requester"
      ? `/dashboard/${identity.id}`
      : identity?.role === "contact" && identity.requester_id
      ? `/dashboard/${identity.requester_id}`
      : "/dashboard/user_102";

  links.push({ to: dashboardTarget, label: "Family Defense" });
  links.push({ to: "/settings", label: "Settings & DB" });
  links.push({ to: "/", label: "Switch Persona" });

  return (
    <>
      {links.map((l) => {
        const isActive = location.pathname === l.to;
        return (
          <Link
            key={l.to}
            to={l.to}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={`relative rounded-lg px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all duration-150 ${
              isActive
                ? "bg-[var(--color-surface-raised)] text-[var(--color-brand)] shadow-sm border border-[var(--color-brand)]/30 font-bold"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text)]"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { identity } = useIdentity();
  const location = useLocation();
  const navigate = useNavigate();

  const liveDashboardPath =
    identity?.role === "requester"
      ? `/dashboard/${identity.id}`
      : identity?.role === "contact" && identity.requester_id
      ? `/dashboard/${identity.requester_id}`
      : "/dashboard/user_102";

  const isLiveDashboardActive = location.pathname.startsWith("/dashboard");

  return (
    <div className="relative flex min-h-screen flex-col bg-[var(--color-bg)]">
      {/* Living animated cybersecurity environment (canvas with network nodes, pulses, parallax & deepfake hologram) */}
      <CyberBackground />

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-[var(--color-brand)] focus:px-3 focus:py-2 focus:text-xs focus:font-bold focus:text-white"
      >
        Skip to content
      </a>

      {/* Cyber ambient top line with subtle brand hue */}
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[var(--color-brand)] to-transparent opacity-75" />

      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--header-bg)] backdrop-blur-md transition-colors">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          {/* Logo & Brand */}
          <Link to="/" className="group flex min-w-0 items-center gap-2.5">
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand-subtle)] border border-[var(--color-brand)]/40 text-[var(--color-brand)] shadow-sm transition-transform group-hover:scale-105">
              <Shield className="h-4 w-4" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-brand)]" />
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-extrabold tracking-tight text-[var(--color-text)] flex items-center gap-1.5">
                SafeSignal
                <span className="hidden sm:inline-block rounded border border-[var(--color-brand)]/30 bg-[var(--color-brand-subtle)] px-1.5 py-0.2 text-[9px] font-mono uppercase tracking-widest text-[var(--color-brand)] font-bold">
                  SHIELD ACTIVE
                </span>
              </span>
              <span className="hidden sm:block text-[10px] text-[var(--color-text-faint)] font-mono">
                DEEPFAKE EMERGENCY DEFENSE
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            <NavLinks />
          </nav>

          {/* Prominent LIVE DASHBOARD Button + Settings + Persona + Theme Switcher */}
          <div className="flex items-center gap-2">
            {/* LIVE DASHBOARD ACTION BUTTON */}
            <button
              type="button"
              onClick={() => navigate(liveDashboardPath)}
              aria-label="Go to Live Defense Dashboard"
              className={`group relative flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition-all shadow-sm cursor-pointer ${
                isLiveDashboardActive
                  ? "bg-[var(--color-brand)] text-slate-950 ring-2 ring-[var(--color-brand)]/40 shadow-cyan-500/20"
                  : "border border-[var(--color-brand)]/50 bg-[var(--color-brand-subtle)] text-[var(--color-brand-strong)] hover:border-[var(--color-brand)] hover:shadow-md hover:bg-[var(--color-brand)]/15"
              }`}
            >
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-80" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-500" />
              </span>
              <span className="tracking-tight flex items-center gap-1 font-mono uppercase text-[11px]">
                <Radio className="h-3 w-3" />
                <span>Live Dashboard</span>
              </span>
            </button>

            {/* Settings Link */}
            <Link
              to="/settings"
              title="Security & Database Settings"
              className={`hidden sm:inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                location.pathname === "/settings"
                  ? "border-[var(--color-brand)] bg-[var(--color-surface-raised)] text-[var(--color-brand)]"
                  : "border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-border)]"
              }`}
            >
              <SettingsIcon className="h-3.5 w-3.5" />
            </Link>

            {/* Theme Toggle Button */}
            <ThemeToggle />

            {/* Persona Badge */}
            {identity ? (
              <div className="hidden lg:flex items-center gap-2 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2.5 py-1">
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                    identity.role === "requester"
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      : "bg-teal-500/15 text-teal-600 dark:text-teal-400"
                  }`}
                >
                  <User className="h-3 w-3" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[9px] uppercase font-mono tracking-wider text-[var(--color-text-faint)]">
                    {identity.role === "requester" ? "Requester" : "Contact"}
                  </span>
                  <span className="text-xs font-semibold text-[var(--color-text)] truncate max-w-[100px]">
                    {identity.name}
                  </span>
                </div>
              </div>
            ) : null}

            {/* Mobile menu toggle */}
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] md:hidden transition-colors cursor-pointer"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
              {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav
            id="mobile-menu"
            aria-label="Mobile"
            className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 md:hidden shadow-xl"
          >
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  navigate(liveDashboardPath);
                }}
                className="flex items-center justify-between rounded-lg bg-[var(--color-brand-subtle)] border border-[var(--color-brand)]/40 p-2 text-xs font-bold text-[var(--color-brand-strong)]"
              >
                <div className="flex items-center gap-2">
                  <Radio className="h-3.5 w-3.5 text-[var(--color-brand)] animate-pulse" />
                  <span>VIEW LIVE DASHBOARD</span>
                </div>
                <span className="rounded bg-[var(--color-brand)] px-1.5 py-0.5 text-[9px] text-slate-950 font-mono">
                  LIVE
                </span>
              </button>

              <NavLinks onNavigate={() => setMenuOpen(false)} />
            </div>
          </nav>
        )}
      </header>

      <main id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>

      <footer className="mt-auto border-t border-[var(--color-border)] bg-[var(--color-surface)]/60 px-4 py-6 text-xs text-[var(--color-text-muted)] sm:px-6 transition-colors">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>SafeSignal Emergency Defense Protocol · Simulated wallet for security testing</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <a
              className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400 hover:underline transition-colors"
              href="tel:1930"
            >
              <PhoneCall className="h-3 w-3" />
              Cyber Helpline: 1930
            </a>
            <span className="text-[var(--color-border-strong)]">·</span>
            <a
              className="hover:text-[var(--color-text)] transition-colors"
              href="mailto:support@safesignal.example"
            >
              support@safesignal.example
            </a>
            <span className="text-[var(--color-border-strong)]">·</span>
            <a
              className="hover:text-[var(--color-text)] transition-colors"
              href="tel:+18005550199"
            >
              +1 (800) 555-0199
            </a>
          </div>
        </div>
      </footer>

      <PanicButton />
    </div>
  );
}
