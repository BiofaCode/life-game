/** Thèmes de couleur. Les valeurs CSS sont dans app/globals.css ([data-theme=…]). */
export const THEMES = [
  { id: "abysse", name: "Abysse", swatch: ["#070b14", "#22d3ee", "#fbbf24"], bg: "#070b14" },
  { id: "neon", name: "Néon", swatch: ["#0b0d17", "#8b5cf6", "#fbbf24"], bg: "#0b0d17" },
  { id: "foret", name: "Forêt", swatch: ["#0a110d", "#a3e635", "#facc15"], bg: "#0a110d" },
  { id: "braise", name: "Braise", swatch: ["#120c0a", "#f97316", "#fde047"], bg: "#120c0a" },
  { id: "sakura", name: "Sakura", swatch: ["#110a10", "#f472b6", "#fcd34d"], bg: "#110a10" },
  { id: "jour", name: "Jour", swatch: ["#f4f5f8", "#6366f1", "#b45309"], bg: "#f4f5f8" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
export const DEFAULT_THEME: ThemeId = "abysse";
export const THEME_COOKIE = "lg-theme";

export function resolveTheme(value: string | undefined): (typeof THEMES)[number] {
  return THEMES.find((t) => t.id === value) ?? THEMES[0];
}
