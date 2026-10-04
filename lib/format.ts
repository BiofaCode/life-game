/** "2026-10-04" ou datetime ISO → "04/10/2026". */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** Nombre de jours entre deux dates YYYY-MM-DD (b − a). */
export function dayDiff(a: string, b: string): number {
  return Math.round(
    (Date.parse(`${b.slice(0, 10)}T12:00:00Z`) - Date.parse(`${a.slice(0, 10)}T12:00:00Z`)) / 86_400_000,
  );
}

/** Échéance relative courte : « Aujourd'hui », « Demain », « Dans 3 j », « Retard 2 j ». */
export function relativeDue(iso: string, today: string): string {
  const n = dayDiff(today, iso);
  if (n === 0) return "Aujourd'hui";
  if (n === 1) return "Demain";
  if (n === -1) return "Hier";
  if (n < 0) return `Retard ${-n} j`;
  if (n <= 14) return `Dans ${n} j`;
  return formatDate(iso);
}

const ZONE_EMOJI: Record<string, string> = {
  "Sport & Corps": "💪",
  "Études & Savoir": "📚",
  "Travail & Carrière": "💼",
  "Agence Marketing": "📣",
  "Projets Perso": "🎨",
  "Social & Relations": "🤝",
  "Mental & Bien-être": "🧘",
};

export function zoneEmoji(zone: string | null): string {
  return (zone && ZONE_EMOJI[zone]) ?? "✨";
}

/** « 🔥 Urgent » → « 🔥 » ; garde le texte si pas d'emoji. */
export function priorityIcon(p: string | null): string {
  return p ? (p.split(" ")[0] ?? p) : "";
}

const WEEKDAYS = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];
export function weekdayShort(iso: string): string {
  return WEEKDAYS[new Date(`${iso}T12:00:00Z`).getUTCDay()] ?? "";
}

/** Décale une date YYYY-MM-DD de n jours. */
export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
