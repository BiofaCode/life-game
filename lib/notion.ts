import "server-only";
import { Client } from "@notionhq/client";
import { DATA_SOURCES, TIMEZONE } from "./config";

let client: Client | null = null;

export function notion(): Client {
  const auth = process.env.NOTION_API_KEY;
  if (!auth) throw new Error("NOTION_API_KEY manquante (voir .env.example).");
  return (client ??= new Client({ auth }));
}

/* ---------- Lecture typée des propriétés ---------- */

type Props = Record<string, { type: string } & Record<string, unknown>>;

interface Row {
  id: string;
  props: Props;
}

async function queryAll(
  dataSourceId: string,
  filter?: Parameters<Client["dataSources"]["query"]>[0]["filter"],
): Promise<Row[]> {
  const rows: Row[] = [];
  let cursor: string | undefined;
  do {
    const res = await notion().dataSources.query({
      data_source_id: dataSourceId,
      filter,
      start_cursor: cursor,
      page_size: 100,
    });
    for (const r of res.results) {
      if (r.object === "page" && "properties" in r) {
        rows.push({ id: r.id, props: r.properties as unknown as Props });
      }
    }
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return rows;
}

function title(p?: Props[string]): string {
  const arr = p?.type === "title" ? (p.title as { plain_text: string }[]) : [];
  return arr.map((t) => t.plain_text).join("") || "Sans titre";
}
function num(p?: Props[string]): number | null {
  return p?.type === "number" ? ((p.number as number | null) ?? null) : null;
}
function select(p?: Props[string]): string | null {
  return p?.type === "select" ? ((p.select as { name: string } | null)?.name ?? null) : null;
}
function date(p?: Props[string]): string | null {
  return p?.type === "date" ? ((p.date as { start: string } | null)?.start ?? null) : null;
}

/** Date du jour (YYYY-MM-DD) dans le fuseau configuré. */
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date());
}

/* ---------- Domaine ---------- */

export const QUEST_STATUS = {
  todo: "🔴 À faire",
  doing: "🟡 En cours",
  done: "🟢 Complété",
} as const;

const QUEST_PRIORITY_ORDER = ["🔥 Urgent", "⚡ Haute", "📌 Normale", "💤 Basse"];

export interface Quest {
  id: string;
  name: string;
  status: string | null;
  priority: string | null;
  xp: number;
  zone: string | null;
  due: string | null;
}

export async function getTotalXp(): Promise<number> {
  const rows = await queryAll(DATA_SOURCES.journal);
  return rows.reduce((sum, r) => sum + (num(r.props["XP gagné"]) ?? 0), 0);
}

export async function getQuests(): Promise<Quest[]> {
  const rows = await queryAll(DATA_SOURCES.quests, {
    or: [
      { property: "Statut", select: { equals: QUEST_STATUS.todo } },
      { property: "Statut", select: { equals: QUEST_STATUS.doing } },
    ],
  });
  const rank = (p: string | null) => {
    const i = p ? QUEST_PRIORITY_ORDER.indexOf(p) : -1;
    return i === -1 ? QUEST_PRIORITY_ORDER.length : i;
  };
  return rows
    .map((r) => ({
      id: r.id,
      name: title(r.props["Quête"]),
      status: select(r.props["Statut"]),
      priority: select(r.props["Priorité"]),
      xp: num(r.props["XP"]) ?? 0,
      zone: select(r.props["Zone"]),
      due: date(r.props["Échéance"]),
    }))
    .sort(
      (a, b) =>
        rank(a.priority) - rank(b.priority) ||
        (a.due ?? "9999").localeCompare(b.due ?? "9999"),
    );
}

export interface Habit {
  id: string;
  name: string;
  streak: number;
  best: number;
}

export async function getHabits(): Promise<Habit[]> {
  const rows = await queryAll(DATA_SOURCES.habits);
  return rows
    .map((r) => ({
      id: r.id,
      name: title(r.props["Habitude"]),
      streak: num(r.props["Streak actuel"]) ?? 0,
      best: num(r.props["Meilleur streak"]) ?? 0,
    }))
    .sort((a, b) => b.streak - a.streak || b.best - a.best);
}

export interface Project {
  id: string;
  name: string;
  progress: number;
  end: string | null;
  overdue: boolean;
}

export async function getProjects(): Promise<Project[]> {
  const today = todayISO();
  const rows = await queryAll(DATA_SOURCES.projects, {
    property: "Statut",
    select: { equals: "🚀 En cours" },
  });
  return rows
    .map((r) => {
      const end = date(r.props["Date fin"]);
      const progress = Math.min(100, Math.max(0, num(r.props["Progression"]) ?? 0));
      return {
        id: r.id,
        name: title(r.props["Projet"]),
        progress,
        end,
        overdue: end !== null && end.slice(0, 10) < today && progress < 100,
      };
    })
    .sort((a, b) => (a.end ?? "9999").localeCompare(b.end ?? "9999"));
}

/** Passe une quête en « Complété ». Refuse toute page hors de la base Quêtes. */
export async function markQuestDone(pageId: string): Promise<void> {
  const page = await notion().pages.retrieve({ page_id: pageId });
  const parent = "parent" in page ? page.parent : null;
  if (parent?.type !== "data_source_id" || parent.data_source_id !== DATA_SOURCES.quests) {
    throw new Error("Cette page n'est pas une quête.");
  }
  await notion().pages.update({
    page_id: pageId,
    properties: { Statut: { select: { name: QUEST_STATUS.done } } },
  });
}
