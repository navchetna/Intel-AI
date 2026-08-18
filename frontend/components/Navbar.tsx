"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navRoutes, CLUSTER_LABELS, CLUSTER_ORDER } from "@/lib/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { useNavSettings, type HideableCluster } from "@/contexts/NavSettingsContext";
import { useDismiss } from "@/hooks/useDismiss";
import { ProjectSelector } from "./ProjectSelector";
import { fetchAppSettings, updateAppSettings } from "@/modules/settings/settings-api";
import { useExportRegistry } from "@/contexts/ExportContext";

const HIDEABLE_CLUSTERS: { key: HideableCluster; label: string }[] = [
  { key: "manufacturing", label: "Manufacturing" },
  { key: "tools",         label: "Tools" },
];

/** GROQ API key field — used server-side by the Agents tab's AI-Suggested-Flow generator. The
 *  key is write-only from the browser's perspective: the backend only ever reports whether one
 *  is configured, never the value, so a previously-saved key never round-trips back here. */
function GroqApiKeySettings() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAppSettings()
      .then(s => { if (!cancelled) setConfigured(s.groq_api_key_configured); })
      .catch(() => { if (!cancelled) setConfigured(null); });
    return () => { cancelled = true; };
  }, []);

  async function handleSave() {
    if (!draft.trim()) return;
    setSaving(true); setError(null); setSaved(false);
    try {
      const s = await updateAppSettings({ groq_api_key: draft.trim() });
      setConfigured(s.groq_api_key_configured);
      setDraft("");
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setSaving(true); setError(null); setSaved(false);
    try {
      const s = await updateAppSettings({ groq_api_key: "" });
      setConfigured(s.groq_api_key_configured);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-3 pt-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--dm-txt-muted)" }}>
          GROQ API key
        </p>
        {configured != null && (
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
            style={{
              color: configured ? "#34d399" : "var(--dm-txt-faint)",
              background: configured ? "rgba(52,211,153,0.12)" : "transparent",
            }}
          >
            {configured ? "Configured" : "Not set"}
          </span>
        )}
      </div>
      <p className="text-[10px] leading-snug mb-2" style={{ color: "var(--dm-txt-faint)" }}>
        Used by the Agents tab&rsquo;s AI-Suggested-Flow generator. Stored server-side only.
      </p>
      <div className="flex gap-1.5">
        <input
          type="password"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
          placeholder={configured ? "•••••••••••• (set)" : "gsk_…"}
          className="flex-1 min-w-0 rounded-md border px-2 py-1.5 text-xs focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
          style={{ borderColor: "var(--dm-input-border)", background: "var(--dm-input-bg)", color: "var(--dm-input-color)" }}
        />
        <button
          type="button" onClick={handleSave} disabled={saving || !draft.trim()}
          className="flex-shrink-0 rounded-md bg-intel-blue px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-40 transition-opacity"
        >
          Save
        </button>
      </div>
      <div className="flex items-center justify-between mt-1.5">
        {configured && (
          <button
            type="button" onClick={handleClear} disabled={saving}
            className="text-[10px] font-semibold hover:underline disabled:opacity-40"
            style={{ color: "var(--dm-txt-faint)" }}
          >
            Clear key
          </button>
        )}
        {saved && <span className="text-[10px] font-semibold" style={{ color: "#34d399" }}>Saved ✓</span>}
      </div>
      {error && <p className="text-[10px] text-danger mt-1">{error}</p>}
    </div>
  );
}

/** Small Excel-green spreadsheet glyph — deliberately not currentColor, so it always reads as
 *  "Excel" regardless of theme/hover, the same way a brand logo would. */
function ExcelIcon({ dimmed }: { dimmed?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ opacity: dimmed ? 0.5 : 1 }}>
      <rect x="2" y="2" width="20" height="20" rx="3" fill="#1D6F42" />
      <path d="M8 8h8M8 12h8M8 16h8M12 8v8" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/** Export-to-Excel icon button — only rendered when the current page has registered an export
 *  action (see contexts/ExportContext.tsx). Owns its own loading/error UI so pages just provide a
 *  handler and don't each need to reimplement the button. */
function ExportButton() {
  const { registration } = useExportRegistry();
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!registration) return null;

  async function handleClick() {
    setExporting(true); setError(null);
    try {
      await registration!.handler();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="relative flex-shrink-0">
      <button
        type="button" onClick={handleClick} disabled={exporting}
        title={exporting ? "Exporting…" : registration.label}
        aria-label={registration.label}
        className="nav-icon-btn flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-md transition-colors disabled:opacity-60"
      >
        <ExcelIcon dimmed={exporting} />
      </button>
      {error && (
        <div
          className="absolute right-0 top-full mt-2 w-64 rounded-lg border p-3 z-50 text-xs"
          style={{ background: "var(--dm-card-bg)", borderColor: "var(--dm-card-border)", boxShadow: "var(--dm-card-depth)", color: "#f87171" }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

/** Gear button + dropdown for navbar preferences and integration settings. */
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
          className="absolute right-0 top-full mt-2 w-72 rounded-lg border py-2 z-50"
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

          <div className="mt-1.5 pt-2 border-t" style={{ borderColor: "var(--dm-card-border)" }}>
            <GroqApiKeySettings />
          </div>
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
      <nav className="mx-auto flex max-w-screen-2xl items-center justify-between pl-3 pr-6 py-2.5">

        {/* ── Far left: branding ─────────────────────────────────────────── */}
        <Link href="/" className="flex items-center flex-shrink-0">
          <span className="text-base font-bold tracking-tight" style={{ color: "var(--dm-nav-brand-text)" }}>Agents as a Service</span>
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
                    const cls = `nav-link rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors whitespace-nowrap ${
                      active ? "nav-link-active" : ""
                    }`;
                    // External routes need the full path including basePath prefix; internal
                    // routes may override the slug-derived path (e.g. Agents -> /agentic-ai/agentic-stack).
                    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/intel-ai";
                    const href = route.external ? `${basePath}/${route.slug}/` : (route.href ?? `/${route.slug}`);
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
          <ExportButton />
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
                    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/intel-ai";
                    const href = route.external ? `${basePath}/${route.slug}/` : (route.href ?? `/${route.slug}`);
                    const cls = `nav-link block rounded-md px-3 py-2 text-sm font-medium transition-colors ${active ? "nav-link-active" : ""}`;
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
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
