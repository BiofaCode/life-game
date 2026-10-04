"use server";

import { revalidatePath } from "next/cache";
import { markQuestDone } from "@/lib/notion";

const UUID = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

export async function completeQuest(pageId: string): Promise<{ ok: boolean; error?: string }> {
  if (!UUID.test(pageId)) return { ok: false, error: "ID invalide" };
  try {
    await markQuestDone(pageId);
  } catch (e) {
    console.error("completeQuest", e);
    return { ok: false, error: "Impossible de mettre à jour Notion." };
  }
  revalidatePath("/");
  return { ok: true };
}
