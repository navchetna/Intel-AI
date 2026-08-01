"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { navRoutes, CLUSTER_LABELS, CLUSTER_ORDER } from "@/lib/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { useNavSettings, type HideableCluster } from "@/contexts/NavSettingsContext";
import { useDismiss } from "@/hooks/useDismiss";
import { ProjectSelector } from "./ProjectSelector";

const HIDEABLE_CLUSTERS: { key: HideableCluster; label: string }[] = [
  { key: "manufacturing", label: "Manufacturing" },
  { key: "tools",         label: "Tools" },
];

/** Gear button + dropdown for toggling which navbar clusters are visible. */
function NavSettingsMenu() {
  const { visibility, setVisible } = useNavSettings();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const ref = useDismiss<HTMLDivElement>(open, () => { setOpen(false); triggerRef.current?.focus(); });

  return (
    <div className="relative" ref={ref}>
      <button
        ref={triggerRef}
        onClick={() => setOpen(v => !v)}
        title="Navbar settings"
        aria-label="Navbar settings"
        aria-expanded={open}
        className="nav-icon-btn flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-md transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-64 rounded-lg border py-2 z-50"
          style={{ background: "var(--dm-card-bg)", borderColor: "var(--dm-card-border)", boxShadow: "var(--dm-card-depth)" }}
        >
          <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--dm-txt-muted)" }}>
            Navbar categories
          </p>
          {HIDEABLE_CLUSTERS.map(({ key, label }) => (
            <label
              key={key}
              className="nav-menu-item flex items-center justify-between gap-3 px-3 py-2 text-sm cursor-pointer"
              style={{ color: "var(--dm-txt-secondary)" }}
            >
              <span>{label}</span>
              <span
                role="switch"
                aria-checked={visibility[key]}
                onClick={() => setVisible(key, !visibility[key])}
                className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0"
                style={{ background: visibility[key] ? "#0068B5" : "rgba(100,116,139,0.5)" }}
              >
                <span
                  className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
                  style={{ transform: visibility[key] ? "translateX(18px)" : "translateX(3px)" }}
                />
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/** Global top navigation. Routes are clustered into four groups with labelled dividers. */
export function Navbar() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const { visibility } = useNavSettings();
  const isDark = theme === "dark";
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const headerRef = useDismiss<HTMLElement>(mobileOpen, () => { setMobileOpen(false); mobileTriggerRef.current?.focus(); });

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const isHideable = (key: typeof CLUSTER_ORDER[number]): key is HideableCluster =>
    key === "manufacturing" || key === "tools";

  const clusters = CLUSTER_ORDER
    .filter(key => !isHideable(key) || visibility[key])
    .map(key => ({
      key,
      label: CLUSTER_LABELS[key],
      routes: navRoutes.filter(r => r.cluster === key),
    }));

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 border-b backdrop-blur-md"
      style={{ background: "var(--dm-nav-bg)", borderColor: "var(--dm-nav-border)" }}
    >
      <nav className="mx-auto flex max-w-screen-2xl items-center justify-between px-6 py-2.5">

        {/* ── Far left: branding ─────────────────────────────────────────── */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <Logo />
          <span className="text-base font-bold tracking-tight" style={{ color: "var(--dm-nav-brand-text)" }}>Intel-AI</span>
        </Link>

        {/* ── Centre: clustered nav links (collapses to a menu below lg) ─── */}
        <div className="hidden lg:flex items-center gap-0 mx-6">
          {clusters.map(({ key, label, routes }, ci) => (
            <div key={key} className="flex items-center flex-shrink-0">
              {ci > 0 && (
                <div className="mx-3 select-none" aria-hidden>
                  <div className="w-px h-5" style={{ background: "var(--dm-nav-border)" }} />
                </div>
              )}

              <div className="flex items-center">
                <span
                  className="mr-1.5 text-[9px] font-bold uppercase tracking-[0.15em] select-none hidden xl:inline"
                  style={{ color: "var(--dm-nav-text-dim)" }}
                >
                  {label}
                </span>

                <ul className="flex items-center gap-0.5">
                  {routes.map(route => {
                    const active = pathname === `/${route.slug}` || pathname.startsWith(`/${route.slug}/`);
                    const cls = `rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors whitespace-nowrap ${
                      active
                        ? "bg-intel-haze text-intel-blue"
                        : "text-gray-600 hover:bg-intel-haze/60 hover:text-intel-blue"
                    }`;
                    // External routes need the full path including basePath prefix
                    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/intel-ai";
                    const href = route.external ? `${basePath}/${route.slug}/` : `/${route.slug}`;
                    return (
                      <li key={route.slug}>
                        {route.external ? (
                          <a href={href} className={cls}>{route.label}</a>
                        ) : (
                          <Link href={href} aria-current={active ? "page" : undefined} className={cls}>
                            {route.label}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* ── Far right: settings ───────────────────────────────────────── */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            ref={mobileTriggerRef}
            onClick={() => setMobileOpen(v => !v)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-panel"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            className="nav-icon-btn lg:hidden flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-md transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {mobileOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
            </svg>
          </button>
          <ProjectSelector />
          <NavSettingsMenu />
          <button
            onClick={toggle}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="nav-icon-btn flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-md transition-colors"
          >
            {isDark ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* ── Mobile menu: same routes, stacked, below lg ─────────────────── */}
      {mobileOpen && (
        <div
          id="mobile-nav-panel"
          className="lg:hidden border-t"
          style={{ borderColor: "var(--dm-nav-border)", background: "var(--dm-nav-bg)" }}
        >
          <div className="mx-auto max-w-screen-2xl px-6 py-3 max-h-[70vh] overflow-y-auto">
            {clusters.map(({ key, label, routes }) => (
              <div key={key} className="mb-4 last:mb-0">
                <p className="px-1 mb-1 text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: "var(--dm-nav-text-dim)" }}>
                  {label}
                </p>
                <ul className="flex flex-col gap-0.5">
                  {routes.map(route => {
                    const active = pathname === `/${route.slug}` || pathname.startsWith(`/${route.slug}/`);
                    const href = route.href ?? `/${route.slug}`;
                    const cls = `nav-link block rounded-md px-3 py-2 text-sm font-medium transition-colors ${active ? "nav-link-active" : ""}`;
                    return (
                      <li key={route.slug}>
                        {route.external ? (
                          <a href={`/${route.slug}/`} className={cls}>{route.label}</a>
                        ) : (
                          <Link href={href} aria-current={active ? "page" : undefined} className={cls}>
                            {route.label}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
