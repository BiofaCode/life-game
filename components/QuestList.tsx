"use client";

import { useState, useTransition } from "react";
import { completeQuest } from "@/app/actions";
import type { Quest } from "@/lib/notion";

const PRIORITY_STYLE: Record<string, string> = {
  "🔥 Urgent": "text-danger",
  "⚡ Haute": "text-orange-400",
  "📌 Normale": "text-sky-400",
  "💤 Basse": "text-dim",
};

export function QuestList({ quests, today }: { quests: Quest[]; today: string }) {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function complete(id: string) {
    setError(null);
    setDone((s) => new Set(s).add(id)); // optimiste
    startTransition(async () => {
      const res = await completeQuest(id);
      if (!res.ok) {
        setDone((s) => {
          const n = new Set(s);
          n.delete(id);
          return n;
        });
        setError(res.error ?? "Erreur");
      }
    });
  }

  const visible = quests.filter((q) => !done.has(q.id));
  if (visible.length === 0) return <p className="px-1 py-3 text-sm text-dim">Aucune quête en cours. 🎉</p>;

  return (
    <>
      {error && <p className="mb-2 px-1 text-sm text-danger">{error}</p>}
      <ul className="space-y-2">
        {visible.map((q) => {
          const late = q.due !== null && q.due.slice(0, 10) < today;
          return (
            <li key={q.id}>
              <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-edge bg-panel p-3 active:bg-edge/40">
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => complete(q.id)}
                  aria-label={`Terminer : ${q.name}`}
                  className="size-6 shrink-0 accent-emerald-400"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{q.name}</span>
                  <span className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-dim">
                    {q.priority && <span className={PRIORITY_STYLE[q.priority]}>{q.priority}</span>}
                    {q.zone && <span>{q.zone}</span>}
                    {q.due && (
                      <span className={late ? "font-semibold text-danger" : ""}>
                        {late ? "⚠ " : ""}
                        {formatDate(q.due)}
                      </span>
                    )}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-xp/20 px-2.5 py-1 text-xs font-bold text-violet-300">
                  +{q.xp} XP
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
