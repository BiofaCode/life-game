/** Types et constantes partagés serveur/client (aucun accès Notion ici). */

export const QUEST_STATUS = {
  todo: "🔴 À faire",
  doing: "🟡 En cours",
  done: "🟢 Complété",
} as const;

export interface Quest {
  id: string;
  name: string;
  status: string | null;
  priority: string | null;
  xp: number;
  zone: string | null;
  due: string | null;
}

export interface XpStats {
  total: number;
  today: number;
}

export const HABIT_DONE = "✅ Fait";

export interface Habit {
  id: string;
  name: string;
  streak: number;
  best: number;
  xp: number;
  /** « ✅ Fait », « ⏳ À faire », « ❌ Raté » ou null. */
  today: string | null;
}

export interface Project {
  id: string;
  name: string;
  progress: number;
  end: string | null;
  overdue: boolean;
}
