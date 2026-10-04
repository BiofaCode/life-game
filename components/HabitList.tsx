"use client";

import { toggleHabit } from "@/app/actions";
import { HABIT_STATUS, type Habit } from "@/lib/notion-types";
import { Check } from "./Check";
import { useOptimisticToggle } from "./useOptimisticToggle";

export function HabitList({ habits }: { habits: Habit[] }) {
  const { isDone, toggle } = useOptimisticToggle(toggleHabit);

  if (habits.length === 0) return <p className="px-1 py-3 text-sm text-dim">Aucune habitude.</p>;

  return (
    <ul className="grid grid-cols-1 gap-2">
      {habits.map((h) => {
        const d = isDone(h.id, h.today === HABIT_STATUS.done);
        const missed = !d && h.today === HABIT_STATUS.missed;
        const risk = !d && h.atRisk;
        return (
          <li key={h.id}>
            <button
              type="button"
              onClick={() => toggle(h.id, !d, d ? undefined : `🔥 ${h.name} · série ${h.streak + 1}`)}
              aria-pressed={d}
              className={`flex w-full items-center gap-3 rounded-2xl border bg-panel px-3 py-3 text-left active:scale-[0.99] active:bg-edge/40 ${
                d ? "border-ok/40" : missed || risk ? "border-danger/40" : "border-edge"
              }`}
            >
              <Check done={d} />
              <span className="min-w-0 flex-1">
                <span className={`block truncate font-medium ${d ? "text-dim" : ""}`}>{h.name}</span>
                <span className="flex gap-1.5 text-xs text-dim">
                  {[
                    missed && <span key="m" className="text-danger">Raté</span>,
                    risk && <span key="r" className="font-semibold text-danger">⚠️ Série en danger</span>,
                    h.frequency && <span key="f">{h.frequency}</span>,
                    h.xp > 0 && <span key="x">+{h.xp} XP</span>,
                  ]
                    .filter(Boolean)
                    .flatMap((el, i) => (i ? [<span key={`s${i}`}>·</span>, el] : [el]))}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end text-xs leading-tight">
                <span className="text-base font-black text-streak">🔥 {h.streak}</span>
                <span className="text-dim">record {h.best}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
