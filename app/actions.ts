"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { isAuthorized, SESSION_COOKIE } from "@/lib/auth";
import {
  createQuest,
  setHabitDone,
  setProjectProgress,
  setProjectStatus,
  setQuestDone,
  updateQuest,
} from "@/lib/notion";
import { QUEST_PRIORITIES, QUEST_STATUS, QUEST_ZONES } from "@/lib/notion-types";

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
