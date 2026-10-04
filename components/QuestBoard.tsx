"use client";

import { useState } from "react";
import { toggleQuest } from "@/app/actions";
import { dayDiff, priorityIcon, relativeDue, zoneEmoji } from "@/lib/format";
import { QUEST_STATUS, type Quest } from "@/lib/notion-types";
import { Check } from "./Check";
import { QuestDetails } from "./QuestDetails";
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
  const [openId, setOpenId] = useState<string | null>(null);
  const opened = quests.find((q) => q.id === openId) ?? null;
  const toggleQ = (q: Quest, d: boolean) => toggle(q.id, !d, d ? undefined : `⚔️ +${q.xp} XP`);

  const open = quests.filter((q) => !isDone(q.id, q.done));
  const done = quests.filter((q) => isDone(q.id, q.done));
  const xpDone = done.reduce((s, q) => s + q.xp, 0);

  const row = (q: Quest) => {
    const d = isDone(q.id, q.done);
    const late = !d && q.due !== null && dayDiff(today, q.due) < 0;
    return (
      <li key={q.id} className="flex items-stretch rounded-2xl border border-edge bg-panel">
        <button
          type="button"
          onClick={() => toggleQ(q, d)}
          aria-pressed={d}
          aria-label={d ? `Décocher : ${q.name}` : `Terminer : ${q.name}`}
          className="flex shrink-0 items-center rounded-l-2xl pl-3 pr-2 active:bg-edge/40"
        >
          <Check done={d} />
        </button>
        <button
          type="button"
          onClick={() => setOpenId(q.id)}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-r-2xl py-3 pr-3 text-left active:bg-edge/40"
        >
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
                {q.notes && <span title="Notes">📝</span>}
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
          <p className="mb-2 px-1 text-xs text-dim">Touche la case pour décocher.</p>
          <ul className="space-y-2">{done.map(row)}</ul>
        </details>
      )}
      {opened && (
        <QuestDetails
          quest={opened}
          today={today}
          done={isDone(opened.id, opened.done)}
          onToggle={() => toggleQ(opened, isDone(opened.id, opened.done))}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}
