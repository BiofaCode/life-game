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
  /** Complétée (aujourd'hui). */
  done: boolean;
  difficulty: string | null;
  notes: string;
  url: string;
}

export interface DayXp {
  date: string;
  xp: number;
}

export interface XpStats {
  total: number;
  today: number;
  /** 7 derniers jours, du plus ancien à aujourd'hui. */
  last7: DayXp[];
  /** Jours consécutifs avec au moins une entrée au Journal (jusqu'à aujourd'hui ou hier). */
  activeStreak: number;
  bestDay: DayXp | null;
  entries: number;
}

export const HABIT_STATUS = {
  done: "✅ Fait",
  todo: "⏳ À faire",
  missed: "❌ Raté",
} as const;

export interface Habit {
  id: string;
  name: string;
  streak: number;
  best: number;
  xp: number;
  frequency: string | null;
  /** Statut posé aujourd'hui, sinon null. */
  today: string | null;
}

export interface Project {
  id: string;
  name: string;
  progress: number;
  priority: string | null;
  zone: string | null;
  description: string;
  xp: number;
  start: string | null;
  end: string | null;
  /** Jours avant la date de fin (négatif = en retard). */
  daysLeft: number | null;
  overdue: boolean;
}

/** Options de la base Quêtes (doivent correspondre exactement aux options Notion). */
export const QUEST_PRIORITIES = ["🔥 Urgent", "⚡ Haute", "📌 Normale", "💤 Basse"] as const;
export const QUEST_ZONES = [
  "Sport & Corps",
  "Études & Savoir",
  "Travail & Carrière",
  "Agence Marketing",
  "Projets Perso",
  "Social & Relations",
  "Mental & Bien-être",
] as const;

export interface NewQuest {
  name: string;
  priority: string;
  zone: string | null;
  xp: number;
  due: string | null;
}
