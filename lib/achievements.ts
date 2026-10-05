/** Succès à débloquer, calculés à partir des données existantes (aucune base dédiée). */

export interface AchievementInput {
  level: number;
  journalEntries: number;
  journalStreak: number;
  bestDayXp: number;
  questsDone: number;
  bestHabitStreak: number;
  purchases: number;
  balance: number;
  /** Nombre d'attributs RPG au niveau 2 ou plus. */
  attributesLv2: number;
}

export interface Achievement {
  id: string;
  icon: string;
  name: string;
  desc: string;
  current: number;
  target: number;
  unlocked: boolean;
}

type Def = Omit<Achievement, "current" | "unlocked"> & { value: (i: AchievementInput) => number };

const DEFS: Def[] = [
  { id: "first-step", icon: "🌱", name: "Premier pas", desc: "1re entrée au Journal", target: 1, value: (i) => i.journalEntries },
  { id: "chronicler", icon: "📔", name: "Chroniqueur", desc: "10 entrées au Journal", target: 10, value: (i) => i.journalEntries },
  { id: "assiduous", icon: "📅", name: "Assidu", desc: "7 jours d'affilée au Journal", target: 7, value: (i) => i.journalStreak },
  { id: "adventurer", icon: "⚔️", name: "Aventurier", desc: "10 quêtes terminées", target: 10, value: (i) => i.questsDone },
  { id: "veteran", icon: "🗡️", name: "Vétéran", desc: "50 quêtes terminées", target: 50, value: (i) => i.questsDone },
  { id: "legend", icon: "🏰", name: "Légende", desc: "150 quêtes terminées", target: 150, value: (i) => i.questsDone },
  { id: "lvl5", icon: "⭐", name: "Niveau 5", desc: "Atteindre le niveau 5", target: 5, value: (i) => i.level },
  { id: "lvl10", icon: "🌟", name: "Niveau 10", desc: "Atteindre le niveau 10", target: 10, value: (i) => i.level },
  { id: "lvl20", icon: "💫", name: "Niveau 20", desc: "Atteindre le niveau 20", target: 20, value: (i) => i.level },
  { id: "fire-day", icon: "💯", name: "Journée de feu", desc: "100 XP en une journée", target: 100, value: (i) => i.bestDayXp },
  { id: "flame", icon: "🔥", name: "Flamme", desc: "Série de 7 sur une habitude", target: 7, value: (i) => i.bestHabitStreak },
  { id: "unstoppable", icon: "☄️", name: "Inarrêtable", desc: "Série de 30 sur une habitude", target: 30, value: (i) => i.bestHabitStreak },
  { id: "first-buy", icon: "🛍️", name: "Bien mérité", desc: "1er achat en boutique", target: 1, value: (i) => i.purchases },
  { id: "treasurer", icon: "💰", name: "Trésorier", desc: "500 pièces en banque", target: 500, value: (i) => i.balance },
  { id: "versatile", icon: "🧙", name: "Polyvalent", desc: "4 attributs au niveau 2", target: 4, value: (i) => i.attributesLv2 },
];

export function computeAchievements(input: AchievementInput): Achievement[] {
  return DEFS.map(({ value, ...d }) => {
    const current = Math.max(0, Math.floor(value(input)));
    return { ...d, current: Math.min(current, d.target), unlocked: current >= d.target };
  });
}
