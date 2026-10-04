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
  /** 5 dernières entrées du Journal. */
  recent: { id: string; title: string; date: string; xp: number; mood: string | null; type: string | null }[];
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
  lastDone: string | null;
  /** La série casse si l'habitude n'est pas faite aujourd'hui. */
  atRisk: boolean;
  /** Statut posé aujourd'hui, sinon null. */
  today: string | null;
}

export const PROJECT_STATUS = {
  idea: "🌱 Idée",
  active: "🚀 En cours",
  paused: "⏸️ Pause",
  done: "✅ Terminé",
} as const;

export interface Project {
  id: string;
  name: string;
  status: string | null;
  url: string;
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

export const MOODS = ["🔥 En feu", "😊 Bien", "😐 Normal", "😴 Fatigué", "😤 Frustré"] as const;

export interface JournalEntry {
  title: string;
  date: string;
  xp: number;
  level: number;
  mood: string | null;
  notes: string;
}

export const REWARD_CATEGORIES = ["Détente", "Food", "Sortie", "Achat", "Autre"] as const;

export interface Reward {
  id: string;
  name: string;
  cost: number;
  category: string | null;
}

export interface Shop {
  rewards: Reward[];
  /** Pièces dépensées au total. */
  spent: number;
  recent: { id: string; name: string; cost: number; date: string }[];
}
