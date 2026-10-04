"use client";

import { completeHabit } from "@/app/actions";
import { HABIT_DONE, type Habit } from "@/lib/notion-types";
import { useOptimisticDone } from "./useOptimisticDone";

const STATUS_STYLE: Record<string, string> = {
  "✅ Fait": "border-ok/50",
  "❌ Raté": "border-danger/40",
};

export function HabitList({ habits }: { habits: Habit[] }) {
  const { done, markDone } = useOptimisticDone(completeHabit);

  if (habits.length === 0) return <p className="px-1 py-3 text-sm text-dim">Aucune habitude.</p>;

  return (
    <ul className="space-y-2">
      {habits.map((h) => {
        const isDone = h.today === HABIT_DONE || done.has(h.id);
        return (
          <li key={h.id}>
            <button
              type="button"
              disabled={isDone}
              onClick={() => markDone(h.id, `🔥 ${h.name} · fait !`)}
              aria-label={isDone ? `${h.name} : fait` : `Marquer fait : ${h.name}`}
              className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border bg-panel p-3 text-left active:bg-edge/40 disabled:active:bg-panel ${
                isDone ? STATUS_STYLE[HABIT_DONE] : (h.today && STATUS_STYLE[h.today]) || "border-edge"
              }`}
            >
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-md border-2 text-sm ${
                  isDone ? "border-ok bg-ok text-black" : "border-dim"
                }`}
              >
                {isDone ? "✓" : ""}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block truncate font-medium ${isDone ? "text-dim" : ""}`}>{h.name}</span>
                {!isDone && h.today === "❌ Raté" && <span className="text-xs text-danger">Raté</span>}
              </span>
              <span className="flex shrink-0 items-center gap-3 text-sm">
                <span className="font-bold text-orange-400">🔥 {h.streak}</span>
                <span className="text-dim">🏆 {h.best}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
