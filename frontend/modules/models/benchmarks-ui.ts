/** Shared style helpers for the Model → Benchmarks filter bar and Analyze modal. */

export function selectStyle(isDark: boolean): React.CSSProperties {
  return isDark
    ? { background: "#0e1d38", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.85)", colorScheme: "dark" }
    : { background: "#e2e8f0", border: "1px solid rgba(15,23,42,0.15)", color: "#1e293b", colorScheme: "light" };
}

export function panelStyle(isDark: boolean): React.CSSProperties {
  return isDark
    ? { background: "#0e1d38", border: "1px solid rgba(255,255,255,0.12)" }
    : { background: "#ffffff", border: "1px solid rgba(15,23,42,0.15)" };
}
