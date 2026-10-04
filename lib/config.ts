/**
 * Configuration centrale du Life Game : IDs Notion, fuseau horaire et
 * formule de niveau. Pour changer la courbe de progression, ne modifie
 * que ce fichier.
 */

export const DATA_SOURCES = {
  quests: "5a0fbebe-af75-4917-a730-70b979032846",
  habits: "7ed0d3d3-301f-448d-9b75-f3cec74f08ba",
  projects: "ef6ecc38-3007-4f14-9ab3-5843adb753c5",
  journal: "d1861d2c-aced-4687-bd76-a9b0872af293",
  rewards: "73958824-011c-4b29-b6c2-7f687c34003b",
  purchases: "e6fb9a07-676a-4caa-b188-297516deeff4",
  devices: "1147ea40-b33b-47b4-ab3d-882da535707a",
} as const;

/** Pièces gagnées par point d'XP validé au Journal (monnaie de la boutique). */
export const COINS_PER_XP = 1;

/** Fuseau utilisé pour savoir ce qu'est « aujourd'hui » (dates en retard). */
export const TIMEZONE = "Europe/Paris";

/* -------------------------------------------------------------------------
 * Formule de niveau (proposition : courbe quadratique douce)
 *
 *   XP cumulé requis pour ATTEINDRE le niveau n = LEVEL_BASE_XP × n(n−1) / 2
 *
 *   Niveau 1 : 0 XP      Niveau 5 : 1 000 XP     Niveau 20 : 19 000 XP
 *   Niveau 2 : 100 XP    Niveau 10 : 4 500 XP    Niveau 50 : 122 500 XP
 *   Niveau 3 : 300 XP
 *
 * Chaque niveau coûte LEVEL_BASE_XP de plus que le précédent (100, 200, 300…).
 * Monte LEVEL_BASE_XP pour une progression plus lente.
 * ---------------------------------------------------------------------- */
export const LEVEL_BASE_XP = 100;

/** XP cumulé nécessaire pour atteindre le niveau `level` (≥ 1). */
export function xpForLevel(level: number): number {
  return (LEVEL_BASE_XP * level * (level - 1)) / 2;
}

export interface LevelInfo {
  level: number;
  totalXp: number;
  /** XP gagné dans le niveau courant. */
  xpIntoLevel: number;
  /** XP total à gagner pour passer au niveau suivant. */
  xpForNext: number;
  /** 0–1 */
  progress: number;
}

export function levelFromXp(totalXp: number): LevelInfo {
  const xp = Math.max(0, totalXp);
  let level = Math.floor((1 + Math.sqrt(1 + (8 * xp) / LEVEL_BASE_XP)) / 2);
  // Garde-fou contre les erreurs d'arrondi flottant.
  while (xpForLevel(level + 1) <= xp) level++;
  while (level > 1 && xpForLevel(level) > xp) level--;

  const start = xpForLevel(level);
  const xpForNext = xpForLevel(level + 1) - start;
  const xpIntoLevel = xp - start;
  return { level, totalXp: xp, xpIntoLevel, xpForNext, progress: xpIntoLevel / xpForNext };
}

/* -------------------------------------------------------------------------
 * Attributs RPG : chaque zone de vie nourrit un attribut avec l'XP des
 * quêtes terminées. Courbe plus courte que le niveau global.
 * ---------------------------------------------------------------------- */
export const ATTRIBUTES = [
  { zone: "Sport & Corps", name: "Force", icon: "💪" },
  { zone: "Études & Savoir", name: "Intellect", icon: "🧠" },
  { zone: "Travail & Carrière", name: "Ambition", icon: "💼" },
  { zone: "Agence Marketing", name: "Commerce", icon: "📣" },
  { zone: "Projets Perso", name: "Créativité", icon: "🎨" },
  { zone: "Social & Relations", name: "Charisme", icon: "🤝" },
  { zone: "Mental & Bien-être", name: "Sagesse", icon: "🧘" },
] as const;

export const ATTRIBUTE_BASE_XP = 25;

/** Niveau d'attribut : même forme que le niveau global, avec ATTRIBUTE_BASE_XP. */
export function attributeLevel(xp: number): { level: number; progress: number } {
  const x = Math.max(0, xp);
  let level = Math.floor((1 + Math.sqrt(1 + (8 * x) / ATTRIBUTE_BASE_XP)) / 2);
  const at = (n: number) => (ATTRIBUTE_BASE_XP * n * (n - 1)) / 2;
  while (at(level + 1) <= x) level++;
  while (level > 1 && at(level) > x) level--;
  return { level, progress: (x - at(level)) / (at(level + 1) - at(level)) };
}
