/**
 * Calcul automatique des streaks d'habitudes.
 * « Dernière réalisation » (date Notion) mémorise le dernier jour coché ;
 * la série continue si l'écart avec aujourd'hui respecte la fréquence.
 */
import { addDays, dayDiff } from "./format";

/** Écart maximal (en jours) entre deux réalisations pour garder la série. */
export function allowedGap(frequency: string | null): number {
  switch (frequency) {
    case "3x/semaine":
      return 3;
    case "2x/semaine":
      return 4;
    case "Hebdo":
      return 8;
    default:
      return 1; // Quotidien
  }
}

/** Série affichée : 0 si la dernière réalisation est trop ancienne. */
export function currentStreak(streak: number, lastDone: string | null, today: string, frequency: string | null): number {
  if (!lastDone) return streak; // valeur saisie à la main avant l'app : on la respecte
  return dayDiff(lastDone, today) > allowedGap(frequency) ? 0 : streak;
}

export interface StreakState {
  streak: number;
  best: number;
  lastDone: string | null;
}

/** Nouvel état quand on coche l'habitude aujourd'hui. */
export function onCheck(s: StreakState, today: string, frequency: string | null): StreakState {
  if (s.lastDone === today) return s; // déjà compté aujourd'hui
  const continues = s.lastDone === null || dayDiff(s.lastDone, today) <= allowedGap(frequency);
  const streak = continues ? s.streak + 1 : 1;
  return { streak, best: Math.max(s.best, streak), lastDone: today };
}

/** Nouvel état quand on décoche une habitude cochée aujourd'hui. */
export function onUncheck(s: StreakState, today: string): StreakState {
  if (s.lastDone !== today) return s;
  const streak = Math.max(0, s.streak - 1);
  // Si la série cochée aujourd'hui avait établi le record, on le retire aussi.
  const best = s.best === s.streak && s.best > streak ? streak : s.best;
  return { streak, best, lastDone: streak > 0 ? addDays(today, -1) : null };
}

/** Série en danger : elle casse si l'habitude n'est pas faite aujourd'hui. */
export function streakAtRisk(streak: number, lastDone: string | null, today: string, frequency: string | null): boolean {
  return streak > 0 && lastDone !== null && lastDone !== today && dayDiff(lastDone, today) >= allowedGap(frequency);
}
