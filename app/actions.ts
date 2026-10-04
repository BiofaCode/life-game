"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { isAuthorized, SESSION_COOKIE } from "@/lib/auth";
import { markHabitDone, markQuestDone } from "@/lib/notion";

const UUID = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

export type ActionResult = { ok: boolean; error?: string };

async function run(pageId: string, fn: (id: string) => Promise<void>): Promise<ActionResult> {
  if (!(await isAuthorized((await cookies()).get(SESSION_COOKIE)?.value))) {
    return { ok: false, error: "Session expirée, reconnecte-toi." };
  }
  if (!UUID.test(pageId)) return { ok: false, error: "ID invalide" };
  try {
    await fn(pageId);
  } catch (e) {
    console.error(fn.name, e);
    return { ok: false, error: "Impossible de mettre à jour Notion." };
  }
  revalidatePath("/");
  return { ok: true };
}

export async function completeQuest(pageId: string): Promise<ActionResult> {
  return run(pageId, markQuestDone);
}

export async function completeHabit(pageId: string): Promise<ActionResult> {
  return run(pageId, markHabitDone);
}
