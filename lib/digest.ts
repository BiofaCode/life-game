import "server-only";
import { dayDiff } from "./format";
import { getHabits, getQuests, getXpStats, todayISO } from "./notion";
import { HABIT_STATUS } from "./notion-types";
import type { PushPayload } from "./push";

/** Rappel du soir : séries en danger, quêtes du jour restantes, XP à valider. */
export async function eveningDigest(): Promise<PushPayload> {
  const today = todayISO();
  const [quests, habits, xp] = await Promise.all([getQuests(), getHabits(), getXpStats()]);

  const atRisk = habits.filter((h) => h.atRisk && h.today !== HABIT_STATUS.done);
  const dueLeft = quests.filter((q) => !q.done && q.due !== null && dayDiff(today, q.due) <= 0);
  const earned =
    quests.filter((q) => q.done).reduce((s, q) => s + q.xp, 0) +
    habits.filter((h) => h.today === HABIT_STATUS.done).reduce((s, h) => s + h.xp, 0);
  const pending = Math.max(0, Math.round(earned - xp.today));

  const parts: string[] = [];
  if (atRisk.length) {
    parts.push(`🔥 Série en danger : ${atRisk.map((h) => `${h.name} (${h.streak} j)`).join(", ")}.`);
  }
  if (dueLeft.length) {
    parts.push(`⚔️ ${dueLeft.length} quête${dueLeft.length > 1 ? "s" : ""} du jour restante${dueLeft.length > 1 ? "s" : ""}.`);
  }
  if (pending > 0) parts.push(`✨ +${pending} XP à valider : clôture ta journée !`);

  if (!parts.length) {
    return { title: "🏆 Journée maîtrisée", body: "Rien en retard ce soir. Repose-toi, héros.", url: "/" };
  }
  return { title: "🎮 Life Game · rappel du soir", body: parts.join(" "), url: "/" };
}
