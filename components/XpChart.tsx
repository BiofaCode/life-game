"use client";

import { useState } from "react";
import { weekdayShort } from "@/lib/format";
import type { DayXp } from "@/lib/notion-types";

/** Barres XP des 7 derniers jours. Une seule série : pas de légende, le titre la nomme. */
export function XpChart({ days }: { days: DayXp[] }) {
  const [sel, setSel] = useState(days.length - 1);
  const max = Math.max(1, ...days.map((d) => d.xp));
  const total = days.reduce((s, d) => s + d.xp, 0);
  const current = days[sel];

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-sm text-dim">
          <span className="text-2xl font-black text-ink">{total}</span> XP sur 7 jours
        </p>
        {current && (
          <p className="text-sm text-dim" aria-live="polite">
            {weekdayShort(current.date)} {current.date.slice(8, 10)}/{current.date.slice(5, 7)} :{" "}
            <span className="font-bold text-ink">{current.xp} XP</span>
          </p>
        )}
      </div>
      <div className="flex h-32 items-end gap-[2px] border-b border-edge" role="list">
        {days.map((d, i) => (
          <button
            key={d.date}
            type="button"
            role="listitem"
            onClick={() => setSel(i)}
            aria-label={`${d.date} : ${d.xp} XP`}
            className="group flex h-full flex-1 items-end justify-center px-1"
          >
            <span
              className={`w-full max-w-9 rounded-t-[4px] transition-colors ${
                i === sel ? "bg-xp" : "bg-xp/45 group-active:bg-xp/70"
              }`}
              style={{ height: d.xp > 0 ? `${Math.max(4, (d.xp / max) * 100)}%` : "2px" }}
            />
          </button>
        ))}
      </div>
      <div className="mt-1 flex gap-[2px]">
        {days.map((d, i) => (
          <span key={d.date} className={`flex-1 text-center text-[11px] ${i === sel ? "font-bold text-ink" : "text-dim"}`}>
            {weekdayShort(d.date)}
          </span>
        ))}
      </div>
    </div>
  );
}
