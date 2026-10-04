import { ATTRIBUTES, attributeLevel } from "@/lib/config";

/** Fiche de personnage : un attribut par zone de vie, nourri par les quêtes terminées. */
export function Attributes({ zoneXp }: { zoneXp: Record<string, number> }) {
  const rows = ATTRIBUTES.map((a) => {
    const xp = zoneXp[a.zone] ?? 0;
    return { ...a, xp, ...attributeLevel(xp) };
  });
  const maxLevel = Math.max(...rows.map((r) => r.level));
  const top = rows.reduce((b, r) => (r.xp > b.xp ? r : b), rows[0]!);

  return (
    <div className="rounded-2xl border border-edge bg-panel p-4">
      {top.xp > 0 && (
        <p className="mb-3 text-sm text-dim">
          Point fort : <span className="font-bold text-ink">{top.icon} {top.name}</span>
        </p>
      )}
      <ul className="space-y-2.5">
        {rows.map((r) => (
          <li key={r.zone} className="flex items-center gap-3">
            <span className="w-6 text-center text-lg" aria-hidden>
              {r.icon}
            </span>
            <span className="w-24 shrink-0 text-sm font-semibold">{r.name}</span>
            <span className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-well">
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-xp"
                // Longueur = niveau (relatif au meilleur attribut) + avancée dans le niveau.
                style={{ width: `${((r.level - 1 + r.progress) / Math.max(1, maxLevel)) * 100}%` }}
              />
            </span>
            <span className="w-12 shrink-0 text-right text-xs text-dim">
              Niv <span className="font-black text-ink">{r.level}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-dim">Chaque quête terminée fait monter l&apos;attribut de sa zone.</p>
    </div>
  );
}
