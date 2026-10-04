"use client";

import { useEffect, useState } from "react";
import { DEFAULT_THEME, THEME_COOKIE, THEMES, type ThemeId } from "@/lib/themes";

/** Choix du thème : appliqué tout de suite, mémorisé dans un cookie (lu au rendu serveur). */
export function ThemePicker() {
  const [current, setCurrent] = useState<string>(DEFAULT_THEME);

  useEffect(() => {
    setCurrent(document.documentElement.dataset.theme ?? DEFAULT_THEME);
  }, []);

  function choose(id: ThemeId, bg: string) {
    setCurrent(id);
    document.documentElement.dataset.theme = id;
    document.cookie = `${THEME_COOKIE}=${id}; path=/; max-age=31536000; samesite=lax`;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", bg);
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => choose(t.id, t.bg)}
          aria-pressed={current === t.id}
          className={`rounded-2xl border p-2.5 text-left text-xs font-semibold active:scale-95 ${
            current === t.id ? "border-xp bg-xp/10 text-ink" : "border-edge bg-panel text-dim"
          }`}
        >
          <span className="mb-2 flex overflow-hidden rounded-lg border border-edge">
            {t.swatch.map((c) => (
              <span key={c} className="h-7 flex-1" style={{ background: c }} />
            ))}
          </span>
          {t.name}
        </button>
      ))}
    </div>
  );
}
