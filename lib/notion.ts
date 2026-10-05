import "server-only";
import { Client } from "@notionhq/client";
import { COINS_PER_XP, DATA_SOURCES, TIMEZONE } from "./config";
import { currentStreak, onCheck, onUncheck, streakAtRisk } from "./streaks";
import {
  HABIT_STATUS,
  PROJECT_STATUS,
  QUEST_STATUS,
  type DayXp,
  type JournalEntry,
  type NewQuest,
  type Habit,
  type Project,
  type Quest,
  type Reward,
  type Shop,
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
  url: string;
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
          url: "url" in r ? r.url : "",
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
function text(p?: Props[string]): string {
  const arr = p?.type === "rich_text" ? (p.rich_text as { plain_text: string }[]) : [];
  return arr.map((t) => t.plain_text).join("");
}
function relation(p?: Props[string]): string[] {
  return p?.type === "relation" ? ((p.relation as { id: string }[]) ?? []).map((r) => r.id) : [];
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

/** Décale une date YYYY-MM-DD de n jours. */
function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to.slice(0, 10)}T12:00:00Z`) - Date.parse(`${from.slice(0, 10)}T12:00:00Z`)) / 86_400_000,
  );
}

const editedToday = (r: Row, today: string) =>
  r.lastEdited !== "" && toLocalISODate(new Date(r.lastEdited)) === today;

/* ---------- Domaine ---------- */

const PRIORITY_ORDER = ["🔥", "⚡", "📌", "💤"];
/** Rang de priorité par emoji (marche pour Quêtes « Urgent » et Projets « Critique »). */
function priorityRank(p: string | null): number {
  const i = p ? PRIORITY_ORDER.findIndex((e) => p.startsWith(e)) : -1;
  return i === -1 ? PRIORITY_ORDER.length : i;
}

export async function getXpStats(): Promise<XpStats> {
  const today = todayISO();
  const rows = await queryAll(DATA_SOURCES.journal);
  const byDay = new Map<string, number>();
  let total = 0;
  for (const r of rows) {
    const xp = num(r.props["XP gagné"]) ?? 0;
    total += xp;
    const d = date(r.props["Date"])?.slice(0, 10);
    if (d) byDay.set(d, (byDay.get(d) ?? 0) + xp);
  }

  const last7: DayXp[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(today, -i);
    last7.push({ date: d, xp: byDay.get(d) ?? 0 });
  }

  // Série en cours : on tolère qu'aujourd'hui ne soit pas encore saisi.
  let activeStreak = 0;
  let cursor = byDay.has(today) ? today : addDays(today, -1);
  while (byDay.has(cursor)) {
    activeStreak++;
    cursor = addDays(cursor, -1);
  }

  let bestDay: DayXp | null = null;
  for (const [d, xp] of byDay) if (!bestDay || xp > bestDay.xp) bestDay = { date: d, xp };

  const recent = rows
    .map((r) => ({
      id: r.id,
      title: title(r.props["Entrée"]),
      date: date(r.props["Date"])?.slice(0, 10) ?? "",
      xp: num(r.props["XP gagné"]) ?? 0,
      mood: select(r.props["Humeur"]),
      type: select(r.props["Type"]),
    }))
    .filter((e) => e.date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  // Semaine du lundi au dimanche.
  const weekday = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7; // 0 = lundi
  const monday = addDays(today, -weekday);
  let week = 0;
  let lastWeek = 0;
  for (const [d, xp] of byDay) {
    if (d >= monday && d <= today) week += xp;
    else if (d >= addDays(monday, -7) && d < monday) lastWeek += xp;
  }
  const dailyAvg = last7.reduce((s, d) => s + d.xp, 0) / 7;

  return {
    total,
    today: byDay.get(today) ?? 0,
    last7,
    activeStreak,
    bestDay,
    entries: rows.length,
    recent,
    week,
    lastWeek,
    dailyAvg,
  };
}

/** Quêtes À faire / En cours, plus celles complétées aujourd'hui (pour pouvoir les décocher). */
export async function getQuests(): Promise<Quest[]> {
  const today = todayISO();
  const rows = await queryAll(DATA_SOURCES.quests, {
    or: [
      { property: "Statut", select: { equals: QUEST_STATUS.todo } },
      { property: "Statut", select: { equals: QUEST_STATUS.doing } },
      {
        and: [
          { property: "Statut", select: { equals: QUEST_STATUS.done } },
          // Marge d'un jour pour le décalage UTC ; le filtre fin se fait ci-dessous.
          { timestamp: "last_edited_time", last_edited_time: { on_or_after: addDays(today, -1) } },
        ],
      },
    ],
  });
  return rows
    .map((r) => {
      const status = select(r.props["Statut"]);
      return {
        row: r,
        quest: {
          id: r.id,
          name: title(r.props["Quête"]),
          status,
          priority: select(r.props["Priorité"]),
          xp: num(r.props["XP"]) ?? 0,
          zone: select(r.props["Zone"]),
          due: date(r.props["Échéance"]),
          done: status === QUEST_STATUS.done,
          difficulty: select(r.props["Difficulté"]),
          notes: text(r.props["Notes"]),
          url: r.url,
          parentId: relation(r.props["Quête parente"])[0] ?? null,
          subCount: relation(r.props["Sous-quêtes"]).length,
        },
      };
    })
    .filter(({ row, quest }) => !quest.done || editedToday(row, today))
    .map(({ quest }) => quest)
    .sort(
      (a, b) =>
        priorityRank(a.priority) - priorityRank(b.priority) ||
        (a.due ?? "9999").localeCompare(b.due ?? "9999"),
    );
}

const HABIT_STATUS_PREFIX = "Statut aujourd";
/** Propriété date tenue à jour par l'app pour calculer les streaks. */
const LAST_DONE = "Dernière réalisation";

export async function getHabits(): Promise<Habit[]> {
  const today = todayISO();
  const rows = await queryAll(DATA_SOURCES.habits);
  return rows
    .map((r) => {
      const frequency = select(r.props["Fréquence"]);
      const lastDone = date(r.props[LAST_DONE])?.slice(0, 10) ?? null;
      const streak = currentStreak(num(r.props["Streak actuel"]) ?? 0, lastDone, today, frequency);
      return {
        id: r.id,
        name: title(r.props["Habitude"]),
        streak,
        atRisk: streakAtRisk(streak, lastDone, today, frequency),
        best: num(r.props["Meilleur streak"]) ?? 0,
        xp: num(r.props["XP par réalisation"]) ?? 0,
        frequency,
        lastDone,
        // Un statut posé un jour précédent ne vaut pas pour aujourd'hui.
        today: editedToday(r, today) ? select(propByPrefix(r.props, HABIT_STATUS_PREFIX)) : null,
      };
    })
    .sort((a, b) => Number(b.atRisk) - Number(a.atRisk) || b.streak - a.streak || b.best - a.best);
}

/** Projets en cours, en pause et idées (les terminés/abandonnés sont exclus). */
export async function getProjects(): Promise<Project[]> {
  const today = todayISO();
  const rows = await queryAll(DATA_SOURCES.projects, {
    or: [PROJECT_STATUS.active, PROJECT_STATUS.paused, PROJECT_STATUS.idea].map((s) => ({
      property: "Statut",
      select: { equals: s },
    })),
  });
  return rows
    .map((r) => {
      const end = date(r.props["Date fin"]);
      const progress = Math.min(100, Math.max(0, num(r.props["Progression"]) ?? 0));
      const daysLeft = end ? daysBetween(today, end) : null;
      return {
        id: r.id,
        name: title(r.props["Projet"]),
        status: select(r.props["Statut"]),
        url: r.url,
        progress,
        priority: select(r.props["Priorité"]),
        zone: select(r.props["Zone"]),
        description: text(r.props["Description"]),
        xp: num(r.props["XP total"]) ?? 0,
        start: date(r.props["Date début"]),
        end,
        daysLeft,
        // Seul un projet en cours peut être « en retard ».
        overdue:
          select(r.props["Statut"]) === PROJECT_STATUS.active &&
          daysLeft !== null &&
          daysLeft < 0 &&
          progress < 100,
      };
    })
    .sort(
      (a, b) =>
        Number(b.overdue) - Number(a.overdue) ||
        priorityRank(a.priority) - priorityRank(b.priority) ||
        (a.end ?? "9999").localeCompare(b.end ?? "9999"),
    );
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

/** Coche (🟢 Complété) ou décoche (🔴 À faire) une quête. Refuse toute page hors de la base Quêtes. */
export async function setQuestDone(pageId: string, done: boolean): Promise<void> {
  await retrieveIn(pageId, DATA_SOURCES.quests);
  await notion().pages.update({
    page_id: pageId,
    properties: { Statut: { select: { name: done ? QUEST_STATUS.done : QUEST_STATUS.todo } } },
  });
}

/** Change le statut (À faire / En cours) et/ou l'échéance d'une quête. */
export async function updateQuest(
  pageId: string,
  patch: { status?: string; due?: string | null },
): Promise<void> {
  await retrieveIn(pageId, DATA_SOURCES.quests);
  await notion().pages.update({
    page_id: pageId,
    properties: {
      ...(patch.status ? { Statut: { select: { name: patch.status } } } : {}),
      ...(patch.due !== undefined ? { "Échéance": { date: patch.due ? { start: patch.due } : null } } : {}),
    },
  });
}

/**
 * Coche/décoche une habitude : « Statut aujourd'hui », et met à jour automatiquement
 * Streak actuel, Meilleur streak et Dernière réalisation.
 */
export async function setHabitDone(pageId: string, done: boolean): Promise<void> {
  const props = await retrieveIn(pageId, DATA_SOURCES.habits);
  const status = propByPrefix(props, HABIT_STATUS_PREFIX);
  if (!status) throw new Error("Propriété « Statut aujourd'hui » introuvable.");

  const today = todayISO();
  const frequency = select(props["Fréquence"]);
  const before = {
    streak: num(props["Streak actuel"]) ?? 0,
    best: num(props["Meilleur streak"]) ?? 0,
    lastDone: date(props[LAST_DONE])?.slice(0, 10) ?? null,
  };
  const after = done ? onCheck(before, today, frequency) : onUncheck(before, today);

  await notion().pages.update({
    page_id: pageId,
    properties: {
      [status.id]: { select: { name: done ? HABIT_STATUS.done : HABIT_STATUS.todo } },
      "Streak actuel": { number: after.streak },
      "Meilleur streak": { number: after.best },
      // Si la colonne n'existe pas, Notion refuserait la mise à jour : on ne l'envoie que si elle est là.
      ...(props[LAST_DONE] ? { [LAST_DONE]: { date: after.lastDone ? { start: after.lastDone } : null } } : {}),
    },
  });
}

/** Crée une quête 🔴 À faire. Les valeurs sont validées contre les options connues. */
export async function createQuest(q: NewQuest & { parentId?: string }): Promise<void> {
  await notion().pages.create({
    parent: { type: "data_source_id", data_source_id: DATA_SOURCES.quests },
    properties: {
      "Quête": { title: [{ text: { content: q.name } }] },
      Statut: { select: { name: QUEST_STATUS.todo } },
      "Priorité": { select: { name: q.priority } },
      XP: { number: q.xp },
      ...(q.zone ? { Zone: { select: { name: q.zone } } } : {}),
      ...(q.due ? { "Échéance": { date: { start: q.due } } } : {}),
      ...(q.parentId ? { "Quête parente": { relation: [{ id: q.parentId }] } } : {}),
    },
  });
}

/** Ajoute une sous-quête : hérite de la zone et de la priorité de la quête parente. */
export async function createSubQuest(parentId: string, name: string, xp: number): Promise<void> {
  const parent = await retrieveIn(parentId, DATA_SOURCES.quests);
  await createQuest({
    name,
    xp,
    priority: select(parent["Priorité"]) ?? "📌 Normale",
    zone: select(parent["Zone"]),
    due: null,
    parentId,
  });
}

/** Met à jour la progression (0–100) d'un projet. */
export async function setProjectProgress(pageId: string, progress: number): Promise<void> {
  await retrieveIn(pageId, DATA_SOURCES.projects);
  await notion().pages.update({
    page_id: pageId,
    properties: { Progression: { number: Math.min(100, Math.max(0, Math.round(progress))) } },
  });
}

const SETTABLE_PROJECT_STATUS: readonly string[] = [
  PROJECT_STATUS.idea,
  PROJECT_STATUS.active,
  PROJECT_STATUS.paused,
  PROJECT_STATUS.done,
];

/** Change le statut d'un projet (Idée / En cours / Pause / Terminé). */
export async function setProjectStatus(pageId: string, status: string): Promise<void> {
  if (!SETTABLE_PROJECT_STATUS.includes(status)) throw new Error("Statut invalide.");
  await retrieveIn(pageId, DATA_SOURCES.projects);
  await notion().pages.update({
    page_id: pageId,
    properties: {
      Statut: { select: { name: status } },
      ...(status === PROJECT_STATUS.done ? { Progression: { number: 100 } } : {}),
    },
  });
}

/** Ajoute une entrée « 🏆 Victoire » au Journal XP. */
export async function createJournalEntry(e: JournalEntry): Promise<void> {
  await notion().pages.create({
    parent: { type: "data_source_id", data_source_id: DATA_SOURCES.journal },
    properties: {
      "Entrée": { title: [{ text: { content: e.title } }] },
      Date: { date: { start: e.date } },
      "XP gagné": { number: e.xp },
      "Niveau atteint": { number: e.level },
      Type: { select: { name: "🏆 Victoire" } },
      ...(e.mood ? { Humeur: { select: { name: e.mood } } } : {}),
      ...(e.notes ? { Notes: { rich_text: [{ text: { content: e.notes.slice(0, 2000) } }] } } : {}),
    },
  });
}

/** XP total des quêtes terminées, par zone (base des attributs RPG). */
export async function getZoneXp(): Promise<Record<string, number>> {
  const rows = await queryAll(DATA_SOURCES.quests, {
    property: "Statut",
    select: { equals: QUEST_STATUS.done },
  });
  const out: Record<string, number> = {};
  for (const r of rows) {
    const zone = select(r.props["Zone"]);
    if (zone) out[zone] = (out[zone] ?? 0) + (num(r.props["XP"]) ?? 0);
  }
  return out;
}

/* ---------- Boutique ---------- */

function checkbox(p?: Props[string]): boolean {
  return p?.type === "checkbox" ? p.checkbox === true : false;
}

export async function getShop(): Promise<Shop> {
  const [rewardRows, purchaseRows] = await Promise.all([
    queryAll(DATA_SOURCES.rewards),
    queryAll(DATA_SOURCES.purchases),
  ]);
  const rewards: Reward[] = rewardRows
    .filter((r) => checkbox(r.props["Active"]))
    .map((r) => ({
      id: r.id,
      name: title(r.props["Récompense"]),
      cost: Math.max(0, num(r.props["Coût"]) ?? 0),
      category: select(r.props["Catégorie"]),
    }))
    .sort((a, b) => a.cost - b.cost);
  const purchases = purchaseRows.map((r) => ({
    id: r.id,
    name: title(r.props["Achat"]),
    cost: num(r.props["Coût"]) ?? 0,
    date: date(r.props["Date"])?.slice(0, 10) ?? "",
    retro: checkbox(r.props["Après coup"]),
  }));
  return {
    rewards,
    spent: purchases.reduce((s, p) => s + p.cost, 0),
    recent: purchases.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
  };
}

/** Solde de pièces : XP validé au Journal × COINS_PER_XP − achats. */
export function coinBalance(totalXp: number, spent: number): number {
  return Math.floor(totalXp * COINS_PER_XP) - spent;
}

/**
 * Achète une récompense si le solde suffit ; renvoie le nouveau solde.
 * `retro` (« j'en ai déjà profité ») l'enregistre même sans assez de pièces : le solde peut
 * passer en négatif (dette), ce qui bloque les achats normaux jusqu'au remboursement.
 */
export async function buyReward(pageId: string, retro = false): Promise<number> {
  const props = await retrieveIn(pageId, DATA_SOURCES.rewards);
  const name = title(props["Récompense"]);
  const cost = Math.max(0, num(props["Coût"]) ?? 0);
  const [stats, shop] = await Promise.all([getXpStats(), getShop()]);
  const balance = coinBalance(stats.total, shop.spent);
  if (!retro && cost > balance) throw new InsufficientCoins(cost - balance);
  await notion().pages.create({
    parent: { type: "data_source_id", data_source_id: DATA_SOURCES.purchases },
    properties: {
      Achat: { title: [{ text: { content: name } }] },
      "Coût": { number: cost },
      Date: { date: { start: todayISO() } },
      ...(retro ? { "Après coup": { checkbox: true } } : {}),
    },
  });
  return balance - cost;
}

export class InsufficientCoins extends Error {
  constructor(public missing: number) {
    super(`Il te manque ${missing} pièces.`);
  }
}

export async function createReward(r: { name: string; cost: number; category: string | null }): Promise<void> {
  await notion().pages.create({
    parent: { type: "data_source_id", data_source_id: DATA_SOURCES.rewards },
    properties: {
      "Récompense": { title: [{ text: { content: r.name } }] },
      "Coût": { number: r.cost },
      Active: { checkbox: true },
      ...(r.category ? { "Catégorie": { select: { name: r.category } } } : {}),
    },
  });
}

/* ---------- Abonnements push ---------- */

export interface StoredSubscription {
  pageId: string;
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
}

export async function listSubscriptions(): Promise<StoredSubscription[]> {
  const rows = await queryAll(DATA_SOURCES.devices);
  const out: StoredSubscription[] = [];
  for (const r of rows) {
    try {
      out.push({ pageId: r.id, subscription: JSON.parse(text(r.props["Abonnement"])) });
    } catch {
      /* ligne illisible : ignorée */
    }
  }
  return out;
}

/** Enregistre (ou remplace) l'abonnement push d'un appareil. */
export async function saveSubscription(
  sub: StoredSubscription["subscription"],
  device: string,
): Promise<void> {
  const existing = await queryAll(DATA_SOURCES.devices, { property: "Endpoint", url: { equals: sub.endpoint } });
  await Promise.all(existing.map((r) => notion().pages.update({ page_id: r.id, in_trash: true })));
  await notion().pages.create({
    parent: { type: "data_source_id", data_source_id: DATA_SOURCES.devices },
    properties: {
      Appareil: { title: [{ text: { content: device.slice(0, 100) } }] },
      Endpoint: { url: sub.endpoint },
      Abonnement: { rich_text: [{ text: { content: JSON.stringify(sub) } }] },
    },
  });
}

export async function deleteSubscription(pageId: string): Promise<void> {
  await notion().pages.update({ page_id: pageId, in_trash: true });
}
