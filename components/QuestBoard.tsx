"use client";

import { useEffect, useState } from "react";
import { toggleQuest } from "@/app/actions";
import { dayDiff, priorityIcon, relativeDue, zoneEmoji } from "@/lib/format";
import { QUEST_STATUS, type Quest } from "@/lib/notion-types";
import { Check } from "./Check";
import { QuestDetails } from "./QuestDetails";
import { useOptimisticToggle } from "./useOptimisticToggle";

type View = "today" | "all";
type Sort = "priority" | "due" | "xp";
type Group = { key: string; title: string; quests: Quest[] };

const PRIORITY_ORDER = ["🔥", "⚡", "📌", "💤"];
const prank = (p: string | null) => {
  const i = p ? PRIORITY_ORDER.findIndex((e) => p.startsWith(e)) : -1;
  return i === -1 ? PRIORITY_ORDER.length : i;
};
const byDue = (a: Quest, b: Quest) => (a.due ?? "9999").localeCompare(b.due ?? "9999");
const SORTS: Record<Sort, { label: string; fn: (a: Quest, b: Quest) => number }> = {
  priority: { label: "Priorité", fn: (a, b) => prank(a.priority) - prank(b.priority) || byDue(a, b) },
  due: { label: "Échéance", fn: (a, b) => byDue(a, b) || prank(a.priority) - prank(b.priority) },
  xp: { label: "XP", fn: (a, b) => b.xp - a.xp || prank(a.priority) - prank(b.priority) },
};

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

/** Préférence d'affichage mémorisée sur l'appareil. */
function usePref<T extends string>(key: string, initial: T, allowed: readonly T[]): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key) as T | null;
      if (saved && allowed.includes(saved)) setValue(saved);
    } catch {
      /* stockage indisponible */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const set = (v: T) => {
    setValue(v);
    try {
      localStorage.setItem(key, v);
    } catch {
      /* ignore */
    }
  };
  return [value, set];
}

export interface ProjectRef {
  id: string;
  name: string;
}

export function QuestBoard({
  quests,
  today,
  projects = [],
}: {
  quests: Quest[];
  today: string;
  projects?: ProjectRef[];
}) {
  const { isDone, toggle } = useOptimisticToggle(toggleQuest);
  const [openId, setOpenId] = useState<string | null>(null);
  const [view, setView] = usePref<View>("lg-q-view", "today", ["today", "all"]);
  const [sort, setSort] = usePref<Sort>("lg-q-sort", "priority", ["priority", "due", "xp"]);
  // "all", "z:<zone>" ou "p:<projectId>"
  const [filter, setFilter] = useState<string>("all");

  const ids = new Set(quests.map((q) => q.id));
  const childrenOf = (id: string) => quests.filter((q) => q.parentId === id);
  // Les sous-quêtes s'affichent dans la fiche de leur parente (si elle est chargée).
  const topLevel = quests.filter((q) => !q.parentId || !ids.has(q.parentId));

  const zones = [...new Set(topLevel.map((q) => q.zone).filter((z): z is string => !!z))];
  const linkedProjects = projects.filter((p) => topLevel.some((q) => q.projectId === p.id));
  const inZone = (q: Quest) =>
    filter === "all" ||
    (filter.startsWith("z:") && q.zone === filter.slice(2)) ||
    (filter.startsWith("p:") && q.projectId === filter.slice(2));

  const opened = quests.find((q) => q.id === openId) ?? null;
  const toggleQ = (q: Quest, d: boolean) => toggle(q.id, !d, d ? undefined : `⚔️ +${q.xp} XP`);

  const isToday = (q: Quest) =>
    q.status === QUEST_STATUS.doing || (q.due !== null && dayDiff(today, q.due) <= 0);

  const open = topLevel
    .filter((q) => !isDone(q.id, q.done) && inZone(q))
    .filter((q) => view === "all" || isToday(q))
    .sort(SORTS[sort].fn);
  const done = quests.filter((q) => isDone(q.id, q.done) && inZone(q));
  const xpDone = done.reduce((s, q) => s + q.xp, 0);
  const hiddenCount =
    view === "today" ? topLevel.filter((q) => !isDone(q.id, q.done) && inZone(q) && !isToday(q)).length : 0;

  const row = (q: Quest) => {
    const d = isDone(q.id, q.done);
    const late = !d && q.due !== null && dayDiff(today, q.due) < 0;
    const kids = childrenOf(q.id);
    const openKids = kids.filter((k) => !isDone(k.id, k.done)).length;
    const subDone = q.subCount - openKids;
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
                {q.subCount > 0 && (
                  <span className={subDone === q.subCount ? "font-semibold text-ok" : "font-semibold text-xp-soft"}>
                    🧩 {subDone}/{q.subCount}
                  </span>
                )}
                {q.projectId && projects.find((p) => p.id === q.projectId) && (
                  <span className="max-w-[9rem] truncate">🚀 {projects.find((p) => p.id === q.projectId)!.name}</span>
                )}
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

  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-3 py-1.5 text-sm ${
      active ? "border-gold bg-gold/15 text-gold" : "border-edge text-dim"
    }`;

  return (
    <div className="space-y-4">
      {/* Barre d'outils : vue, tri, zones */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 rounded-xl border border-edge bg-well p-1 text-sm font-semibold">
            {(
              [
                ["today", "📅 Du jour"],
                ["all", "📋 Toutes"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={`flex-1 rounded-lg py-1.5 ${view === v ? "bg-panel text-ink shadow" : "text-dim"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1 rounded-xl border border-edge bg-well px-2 py-1.5 text-xs text-dim">
            ⇅
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              aria-label="Trier par"
              className="bg-transparent text-sm font-semibold text-ink outline-none"
            >
              {(Object.keys(SORTS) as Sort[]).map((k) => (
                <option key={k} value={k}>
                  {SORTS[k].label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {zones.length + linkedProjects.length > 1 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            <button type="button" className={chip(filter === "all")} onClick={() => setFilter("all")}>
              Tout
            </button>
            {linkedProjects.map((p) => (
              <button key={p.id} type="button" className={chip(filter === `p:${p.id}`)} onClick={() => setFilter(`p:${p.id}`)}>
                🚀 {p.name}
              </button>
            ))}
            {zones.map((z) => (
              <button key={z} type="button" className={chip(filter === `z:${z}`)} onClick={() => setFilter(`z:${z}`)}>
                {zoneEmoji(z)} {z}
              </button>
            ))}
          </div>
        )}
      </div>

      {open.length === 0 && (
        <p className="px-1 text-sm text-dim">
          {view === "today" ? "Rien d'urgent aujourd'hui. 🎉" : "Toutes les quêtes sont faites. 🎉"}
        </p>
      )}

      {view === "today" ? (
        open.length > 0 && <ul className="space-y-2">{open.map(row)}</ul>
      ) : (
        groupQuests(open, today).map((g) => (
          <div key={g.key}>
            <h3 className="mb-1.5 px-1 text-xs font-semibold text-dim">
              {g.title} · {g.quests.length}
            </h3>
            <ul className="space-y-2">{g.quests.map(row)}</ul>
          </div>
        ))
      )}

      {hiddenCount > 0 && (
        <button type="button" onClick={() => setView("all")} className="w-full text-center text-xs text-dim underline underline-offset-4">
          + {hiddenCount} quête{hiddenCount > 1 ? "s" : ""} à venir ou sans date → voir toutes
        </button>
      )}

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
          subQuests={childrenOf(opened.id).map((k) => ({ quest: k, done: isDone(k.id, k.done) }))}
          onToggleSub={(k) => toggleQ(k, isDone(k.id, k.done))}
          onOpenParent={opened.parentId && ids.has(opened.parentId) ? () => setOpenId(opened.parentId) : undefined}
          projects={projects}
        />
      )}
    </div>
  );
}
