import { dayDiff } from "@/lib/format";
import { HABIT_STATUS, QUEST_STATUS, type Habit, type Quest } from "@/lib/notion-types";
import { TIMEZONE } from "@/lib/config";
import { Bar } from "./ui";

/** Quêtes du jour/en retard/en cours + habitudes quotidiennes : ce qu'il faut boucler aujourd'hui. */
export function dailyGoal(quests: Quest[], habits: Habit[], today: string) {
  const q = quests.filter(
    (x) => x.done || x.status === QUEST_STATUS.doing || (x.due !== null && dayDiff(today, x.due) <= 0),
  );
  const h = habits.filter((x) => x.frequency === "Quotidien" || x.today === HABIT_STATUS.done);
  const done = q.filter((x) => x.done).length + h.filter((x) => x.today === HABIT_STATUS.done).length;
  return { done, total: q.length + h.length };
}

export function DailyGoal({ quests, habits, today }: { quests: Quest[]; habits: Habit[]; today: string }) {
  const { done, total } = dailyGoal(quests, habits, today);
  const label = new Intl.DateTimeFormat("fr-FR", {
    timeZone: TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${today}T12:00:00Z`));
  const perfect = total > 0 && done >= total;

  return (
    <div className="mt-4 rounded-2xl border border-edge bg-panel p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-sm font-bold first-letter:uppercase">{label}</p>
        <p className="text-xs text-dim">
          Objectif du jour{" "}
          <span className={`font-black ${perfect ? "text-gold" : "text-ink"}`}>
            {done}/{total}
          </span>
        </p>
      </div>
      <Bar value={total ? done / total : 0} color={perfect ? "bg-gold" : "bg-ok"} />
      {perfect && <p className="mt-2 text-center text-sm font-bold text-gold">🏆 Journée parfaite !</p>}
    </div>
  );
}
