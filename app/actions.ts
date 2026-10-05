"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { isAuthorized, SESSION_COOKIE } from "@/lib/auth";
import { levelFromXp } from "@/lib/config";
import { eveningDigest } from "@/lib/digest";
import { pushConfigured, pushToAll } from "@/lib/push";
import {
  buyReward,
  createJournalEntry,
  createReward,
  createSubQuest,
  InsufficientCoins,
  saveSubscription,
  createQuest,
  getXpStats,
  todayISO,
  setHabitDone,
  setProjectProgress,
  setProjectStatus,
  setQuestDone,
  updateQuest,
} from "@/lib/notion";
import { MOODS, QUEST_PRIORITIES, QUEST_STATUS, QUEST_ZONES, REWARD_CATEGORIES } from "@/lib/notion-types";

const UUID = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

export type ActionResult = { ok: boolean; error?: string };

async function authorized(): Promise<boolean> {
  return isAuthorized((await cookies()).get(SESSION_COOKIE)?.value);
}

async function run(pageId: string, fn: () => Promise<void>): Promise<ActionResult> {
  if (!(await authorized())) return { ok: false, error: "Session expirée, reconnecte-toi." };
  if (!UUID.test(pageId)) return { ok: false, error: "ID invalide" };
  try {
    await fn();
  } catch (e) {
    console.error("action", pageId, e);
    return { ok: false, error: "Impossible de mettre à jour Notion." };
  }
  revalidatePath("/");
  return { ok: true };
}

export async function toggleQuest(pageId: string, done: boolean): Promise<ActionResult> {
  return run(pageId, () => setQuestDone(pageId, done === true));
}

export async function updateProgress(pageId: string, progress: number): Promise<ActionResult> {
  if (!Number.isFinite(progress)) return { ok: false, error: "Valeur invalide" };
  return run(pageId, () => setProjectProgress(pageId, progress));
}

export async function toggleHabit(pageId: string, done: boolean): Promise<ActionResult> {
  return run(pageId, () => setHabitDone(pageId, done === true));
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function addQuest(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  if (!(await authorized())) return { ok: false, error: "Session expirée, reconnecte-toi." };

  const name = String(form.get("name") ?? "").trim().slice(0, 200);
  const priority = String(form.get("priority") ?? "");
  const zone = String(form.get("zone") ?? "");
  const xp = Math.round(Number(form.get("xp")));
  const due = String(form.get("due") ?? "");

  if (!name) return { ok: false, error: "Donne un nom à la quête." };
  if (!(QUEST_PRIORITIES as readonly string[]).includes(priority)) return { ok: false, error: "Priorité invalide." };
  if (zone && !(QUEST_ZONES as readonly string[]).includes(zone)) return { ok: false, error: "Zone invalide." };
  if (!Number.isFinite(xp) || xp < 0 || xp > 10_000) return { ok: false, error: "XP invalide." };
  if (due && !DATE.test(due)) return { ok: false, error: "Date invalide." };

  try {
    await createQuest({ name, priority, zone: zone || null, xp, due: due || null });
  } catch (e) {
    console.error("addQuest", e);
    return { ok: false, error: "Impossible de créer la quête dans Notion." };
  }
  revalidatePath("/");
  return { ok: true };
}

/** Passe une quête en 🔴 À faire ou 🟡 En cours. */
export async function setQuestStatus(pageId: string, status: string): Promise<ActionResult> {
  if (status !== QUEST_STATUS.todo && status !== QUEST_STATUS.doing) return { ok: false, error: "Statut invalide" };
  return run(pageId, () => updateQuest(pageId, { status }));
}

/** Change l'échéance d'une quête (null = sans date). */
export async function setQuestDue(pageId: string, due: string | null): Promise<ActionResult> {
  if (due !== null && !DATE.test(due)) return { ok: false, error: "Date invalide" };
  return run(pageId, () => updateQuest(pageId, { due }));
}

export async function changeProjectStatus(pageId: string, status: string): Promise<ActionResult> {
  return run(pageId, () => setProjectStatus(pageId, String(status)));
}

/** Clôture la journée : crée une entrée au Journal XP avec l'XP du jour. */
export async function closeDay(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  if (!(await authorized())) return { ok: false, error: "Session expirée, reconnecte-toi." };

  const title = String(form.get("title") ?? "").trim().slice(0, 200);
  const xp = Math.round(Number(form.get("xp")));
  const mood = String(form.get("mood") ?? "");
  const notes = String(form.get("notes") ?? "").trim();

  if (!title) return { ok: false, error: "Donne un titre à ta journée." };
  if (!Number.isFinite(xp) || xp < 0 || xp > 10_000) return { ok: false, error: "XP invalide." };
  if (mood && !(MOODS as readonly string[]).includes(mood)) return { ok: false, error: "Humeur invalide." };

  try {
    const stats = await getXpStats();
    await createJournalEntry({
      title,
      date: todayISO(),
      xp,
      level: levelFromXp(stats.total + xp).level,
      mood: mood || null,
      notes,
    });
  } catch (e) {
    console.error("closeDay", e);
    return { ok: false, error: "Impossible d'écrire dans le Journal." };
  }
  revalidatePath("/");
  return { ok: true };
}

export async function purchase(pageId: string, retro = false): Promise<ActionResult> {
  if (!(await authorized())) return { ok: false, error: "Session expirée, reconnecte-toi." };
  if (!UUID.test(pageId)) return { ok: false, error: "ID invalide" };
  try {
    await buyReward(pageId, retro === true);
  } catch (e) {
    if (e instanceof InsufficientCoins) return { ok: false, error: e.message };
    console.error("purchase", e);
    return { ok: false, error: "Achat impossible (Notion)." };
  }
  revalidatePath("/");
  return { ok: true };
}

export async function addReward(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  if (!(await authorized())) return { ok: false, error: "Session expirée, reconnecte-toi." };
  const name = String(form.get("name") ?? "").trim().slice(0, 200);
  const cost = Math.round(Number(form.get("cost")));
  const category = String(form.get("category") ?? "");
  if (!name) return { ok: false, error: "Donne un nom à la récompense." };
  if (!Number.isFinite(cost) || cost < 1 || cost > 100_000) return { ok: false, error: "Coût invalide." };
  if (category && !(REWARD_CATEGORIES as readonly string[]).includes(category)) return { ok: false, error: "Catégorie invalide." };
  try {
    await createReward({ name, cost, category: category || null });
  } catch (e) {
    console.error("addReward", e);
    return { ok: false, error: "Impossible de créer la récompense." };
  }
  revalidatePath("/");
  return { ok: true };
}

/** Enregistre l'abonnement push de cet appareil. */
export async function subscribePush(raw: string, device: string): Promise<ActionResult> {
  if (!(await authorized())) return { ok: false, error: "Session expirée, reconnecte-toi." };
  let sub: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  try {
    sub = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Abonnement invalide." };
  }
  const endpoint = typeof sub.endpoint === "string" ? sub.endpoint : "";
  const p256dh = typeof sub.keys?.p256dh === "string" ? sub.keys.p256dh : "";
  const auth = typeof sub.keys?.auth === "string" ? sub.keys.auth : "";
  if (!endpoint.startsWith("https://") || !p256dh || !auth || endpoint.length > 1000) {
    return { ok: false, error: "Abonnement invalide." };
  }
  try {
    await saveSubscription({ endpoint, keys: { p256dh, auth } }, String(device).slice(0, 100) || "Appareil");
  } catch (e) {
    console.error("subscribePush", e);
    return { ok: false, error: "Impossible d'enregistrer l'appareil (base « 🔔 Appareils » partagée ?)." };
  }
  return { ok: true };
}

/** Envoie tout de suite le rappel du soir (test). */
export async function sendTestPush(): Promise<ActionResult> {
  if (!(await authorized())) return { ok: false, error: "Session expirée, reconnecte-toi." };
  if (!pushConfigured()) return { ok: false, error: "Ajoute les clés VAPID dans Vercel." };
  try {
    const { sent } = await pushToAll(await eveningDigest());
    return sent > 0 ? { ok: true } : { ok: false, error: "Aucun appareil abonné." };
  } catch (e) {
    console.error("sendTestPush", e);
    return { ok: false, error: "Envoi impossible." };
  }
}

export async function addSubQuest(parentId: string, name: string, xp: number): Promise<ActionResult> {
  const clean = String(name).trim().slice(0, 200);
  if (!clean) return { ok: false, error: "Donne un nom à la sous-quête." };
  const x = Math.round(Number(xp));
  if (!Number.isFinite(x) || x < 0 || x > 10_000) return { ok: false, error: "XP invalide." };
  return run(parentId, () => createSubQuest(parentId, clean, x));
}
