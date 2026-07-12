"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { navRoutes, CLUSTER_LABELS, CLUSTER_ORDER } from "@/lib/navigation";
import { useTheme } from "@/contexts/ThemeContext";

/** Global top navigation. Routes are clustered into four groups with labelled dividers. */
export function Navbar() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  const clusters = CLUSTER_ORDER.map(key => ({
    key,
    label: CLUSTER_LABELS[key],
    routes: navRoutes.filter(r => r.cluster === key),
  }));

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/80 bg-white/92 backdrop-blur-md">
      <nav className="mx-auto flex max-w-screen-2xl items-center justify-between px-6 py-2.5">

        {/* ── Far left: branding ─────────────────────────────────────────── */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <Logo />
          <span className="text-base font-bold text-intel-dark tracking-tight">Intel-AI</span>
        </Link>

        {/* ── Centre: clustered nav links ───────────────────────────────── */}
        <div className="flex items-center gap-0 mx-6">
          {clusters.map(({ key, label, routes }, ci) => (
            <div key={key} className="flex items-center flex-shrink-0">
              {ci > 0 && (
                <div className="mx-3 select-none" aria-hidden>
                  <div className="w-px h-5 bg-gray-200" />
                </div>
              )}

              <div className="flex items-center">
                <span className="mr-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-gray-400 select-none hidden xl:inline">
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
                    return (
                      <li key={route.slug}>
                        {route.external ? (
                          <a href={`/${route.slug}/`} className={cls}>{route.label}</a>
                        ) : (
                          <Link href={`/${route.slug}`} aria-current={active ? "page" : undefined} className={cls}>
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
        <button
          onClick={toggle}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-md text-gray-500 hover:bg-intel-haze/60 hover:text-intel-blue transition-colors"
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
      </nav>
    </header>
  );
}
