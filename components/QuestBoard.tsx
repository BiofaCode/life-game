"use client";

import { toggleQuest } from "@/app/actions";
import { dayDiff, priorityIcon, relativeDue, zoneEmoji } from "@/lib/format";
import { QUEST_STATUS, type Quest } from "@/lib/notion-types";
import { Check } from "./Check";
import { useOptimisticToggle } from "./useOptimisticToggle";

type Group = { key: string; title: string; quests: Quest[] };

function groupQuests(quests: Quest[], today: string): Group[] {
  const groups: Group[] = [
    { key: "late", title: "⚠️ En retard", quests: [] },
    { key: "today", title: "📅 Aujourd'hui", quests: [] },
    { key: "soon", title: "⏭️ À venir", quests: [] },
    { key: "none", title: "📋 Sans échéance", quests: [] },
  ];
  for (const q of quests) {
    const n = q.due ? dayDiff(today, q.due) : null;
    const g = n === null ? 3 : n < 0 ? 0 : n === 0 ? 1 : 2;
    groups[g]!.quests.push(q);
  }
  return groups.filter((g) => g.quests.length > 0);
}

export function QuestBoard({ quests, today }: { quests: Quest[]; today: string }) {
  const { isDone, toggle } = useOptimisticToggle(toggleQuest);

  const open = quests.filter((q) => !isDone(q.id, q.done));
  const done = quests.filter((q) => isDone(q.id, q.done));
  const xpDone = done.reduce((s, q) => s + q.xp, 0);

  const row = (q: Quest) => {
    const d = isDone(q.id, q.done);
    const late = !d && q.due !== null && dayDiff(today, q.due) < 0;
    return (
      <li key={q.id}>
        <button
          type="button"
          onClick={() => toggle(q.id, !d, d ? undefined : `⚔️ +${q.xp} XP`)}
          aria-pressed={d}
          className="flex w-full items-center gap-3 rounded-2xl border border-edge bg-panel px-3 py-3 text-left active:scale-[0.99] active:bg-edge/40"
        >
          <Check done={d} />
          <span className="min-w-0 flex-1">
            <span className={`line-clamp-2 font-medium leading-snug ${d ? "text-dim line-through" : ""}`}>
              {q.status === QUEST_STATUS.doing && !d && <span className="mr-1 text-gold">▶</span>}
              {q.name}
            </span>
            {!d && (
              <span className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-dim">
                {q.priority && <span title={q.priority}>{priorityIcon(q.priority)}</span>}
                {q.zone && (
                  <span>
                    {zoneEmoji(q.zone)} {q.zone}
                  </span>
                )}
                {q.due && <span className={late ? "font-semibold text-danger" : ""}>{relativeDue(q.due, today)}</span>}
              </span>
            )}
          </span>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
              d ? "bg-ok/15 text-ok" : "bg-xp/15 text-xp-soft"
            }`}
          >
            +{q.xp}
          </span>
        </button>
      </li>
    );
  };

  return (
    <div className="space-y-4">
      {open.length === 0 && <p className="px-1 text-sm text-dim">Toutes les quêtes sont faites. 🎉</p>}
      {groupQuests(open, today).map((g) => (
        <div key={g.key}>
          <h3 className="mb-1.5 px-1 text-xs font-semibold text-dim">
            {g.title} · {g.quests.length}
          </h3>
          <ul className="space-y-2">{g.quests.map(row)}</ul>
        </div>
      ))}
      {done.length > 0 && (
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl px-1 py-1 text-xs font-semibold text-ok">
            <span>
              ✅ Terminées aujourd&apos;hui · {done.length} · +{xpDone} XP
            </span>
            <span className="text-dim transition-transform group-open:rotate-180">▾</span>
          </summary>
          <p className="mb-2 px-1 text-xs text-dim">Touche une quête pour la décocher.</p>
          <ul className="space-y-2">{done.map(row)}</ul>
        </details>
      )}
    </div>
  );
}
