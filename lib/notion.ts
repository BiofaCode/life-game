import "server-only";
import { Client } from "@notionhq/client";
import { DATA_SOURCES, TIMEZONE } from "./config";
import {
  HABIT_DONE,
  QUEST_STATUS,
  type Habit,
  type Project,
  type Quest,
  type XpStats,
} from "./notion-types";

export * from "./notion-types";

let client: Client | null = null;

export function notion(): Client {
  const auth = process.env.NOTION_API_KEY;
  if (!auth) throw new Error("NOTION_API_KEY manquante (voir .env.example).");
  // NOTION_BASE_URL : uniquement pour pointer vers un faux serveur en test local.
  return (client ??= new Client({ auth, baseUrl: process.env.NOTION_BASE_URL || undefined }));
}

/* ---------- Lecture typée des propriétés ---------- */

type Props = Record<string, { id: string; type: string } & Record<string, unknown>>;

/** Trouve une propriété par préfixe de nom (tolère apostrophes typographiques/échappées). */
function propByPrefix(props: Props, prefix: string): Props[string] | undefined {
  const key = Object.keys(props).find((k) => k.startsWith(prefix));
  return key ? props[key] : undefined;
}

interface Row {
  id: string;
  props: Props;
  lastEdited: string;
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
        rows.push({
          id: r.id,
          props: r.properties as unknown as Props,
          lastEdited: "last_edited_time" in r ? r.last_edited_time : "",
        });
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
  return toLocalISODate(new Date());
}

function toLocalISODate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(d);
}

/* ---------- Domaine ---------- */

const QUEST_PRIORITY_ORDER = ["🔥 Urgent", "⚡ Haute", "📌 Normale", "💤 Basse"];

export async function getXpStats(): Promise<XpStats> {
  const today = todayISO();
  const rows = await queryAll(DATA_SOURCES.journal);
  return rows.reduce<XpStats>(
    (acc, r) => {
      const xp = num(r.props["XP gagné"]) ?? 0;
      acc.total += xp;
      if (date(r.props["Date"])?.slice(0, 10) === today) acc.today += xp;
      return acc;
    },
    { total: 0, today: 0 },
  );
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

const HABIT_STATUS_PREFIX = "Statut aujourd";

export async function getHabits(): Promise<Habit[]> {
  const today = todayISO();
  const rows = await queryAll(DATA_SOURCES.habits);
  return rows
    .map((r) => ({
      id: r.id,
      name: title(r.props["Habitude"]),
      streak: num(r.props["Streak actuel"]) ?? 0,
      best: num(r.props["Meilleur streak"]) ?? 0,
      xp: num(r.props["XP par réalisation"]) ?? 0,
      // Un statut posé un jour précédent ne vaut pas pour aujourd'hui.
      today:
        r.lastEdited && toLocalISODate(new Date(r.lastEdited)) === today
          ? select(propByPrefix(r.props, HABIT_STATUS_PREFIX))
          : null,
    }))
    .sort((a, b) => b.streak - a.streak || b.best - a.best);
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

/** Récupère une page en vérifiant qu'elle appartient bien à la base attendue. */
async function retrieveIn(pageId: string, dataSourceId: string): Promise<Props> {
  const page = await notion().pages.retrieve({ page_id: pageId });
  const parent = "parent" in page ? page.parent : null;
  if (
    parent?.type !== "data_source_id" ||
    parent.data_source_id !== dataSourceId ||
    !("properties" in page)
  ) {
    throw new Error("Page hors de la base attendue.");
  }
  return page.properties as unknown as Props;
}

/** Passe une quête en « Complété ». Refuse toute page hors de la base Quêtes. */
export async function markQuestDone(pageId: string): Promise<void> {
  await retrieveIn(pageId, DATA_SOURCES.quests);
  await notion().pages.update({
    page_id: pageId,
    properties: { Statut: { select: { name: QUEST_STATUS.done } } },
  });
}

/** Annule une complétion : remet la quête dans son statut précédent (À faire / En cours). */
export async function reopenQuest(pageId: string, status: string): Promise<void> {
  if (status !== QUEST_STATUS.todo && status !== QUEST_STATUS.doing) {
    throw new Error("Statut invalide.");
  }
  await retrieveIn(pageId, DATA_SOURCES.quests);
  await notion().pages.update({
    page_id: pageId,
    properties: { Statut: { select: { name: status } } },
  });
}

/** Passe le « Statut aujourd'hui » d'une habitude à « ✅ Fait ». */
export async function markHabitDone(pageId: string): Promise<void> {
  const props = await retrieveIn(pageId, DATA_SOURCES.habits);
  const status = propByPrefix(props, HABIT_STATUS_PREFIX);
  if (!status) throw new Error("Propriété « Statut aujourd'hui » introuvable.");
  await notion().pages.update({
    page_id: pageId,
    properties: { [status.id]: { select: { name: HABIT_DONE } } },
  });
}
