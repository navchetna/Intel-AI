import type { Category } from "./data";

/** Shared category accent palette — used by the Catalog and Benchmarks tabs so
 *  the category chip filter looks identical in both places. */
export const CATEGORY_STYLE: Record<Category, { accent: string; row: string; rowAlt: string; badge: string; badgeText: string }> = {
  "OCR & Document":         { accent: "#22d3ee", row: "rgba(34,211,238,0.04)",  rowAlt: "rgba(34,211,238,0.07)",  badge: "rgba(34,211,238,0.15)",  badgeText: "#67e8f9" },
  "Vision & Multimodal":    { accent: "#a78bfa", row: "rgba(167,139,250,0.04)", rowAlt: "rgba(167,139,250,0.07)", badge: "rgba(167,139,250,0.15)", badgeText: "#c4b5fd" },
  "Speech & Audio":         { accent: "#34d399", row: "rgba(52,211,153,0.04)",  rowAlt: "rgba(52,211,153,0.07)",  badge: "rgba(52,211,153,0.15)",  badgeText: "#6ee7b7" },
  "Translation":            { accent: "#fbbf24", row: "rgba(251,191,36,0.04)",  rowAlt: "rgba(251,191,36,0.07)",  badge: "rgba(251,191,36,0.15)",  badgeText: "#fcd34d" },
  "Embeddings & Retrieval": { accent: "#60a5fa", row: "rgba(96,165,250,0.04)",  rowAlt: "rgba(96,165,250,0.07)",  badge: "rgba(96,165,250,0.15)",  badgeText: "#93c5fd" },
  "Safety & Guardrails":    { accent: "#f87171", row: "rgba(248,113,113,0.04)", rowAlt: "rgba(248,113,113,0.07)", badge: "rgba(248,113,113,0.15)", badgeText: "#fca5a5" },
  "LLM":                    { accent: "#818cf8", row: "rgba(129,140,248,0.04)", rowAlt: "rgba(129,140,248,0.07)", badge: "rgba(129,140,248,0.15)", badgeText: "#a5b4fc" },
};

/** Category-accent badge text needs to stay legible against its low-opacity accent
 *  background: pale accent-on-pale-accent (fine on the dark canvas) collapses to
 *  near-invisible in light mode, so light mode always uses a dark neutral instead. */
export function badgeTextColor(isDark: boolean, darkColor: string): string {
  return isDark ? darkColor : "#1e293b";
}
