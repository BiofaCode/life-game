import { levelFromXp } from "@/lib/config";
import { RefreshButton } from "./RefreshButton";

/**
 * En-tête niveau/XP. L'XP « en attente » (quêtes et habitudes cochées aujourd'hui, pas encore
 * inscrites au Journal) est affichée tout de suite, en plus clair, pour un retour immédiat.
 */
export function XpHeader({ total, today, pending }: { total: number; today: number; pending: number }) {
  const confirmed = levelFromXp(total);
  const projected = levelFromXp(total + pending);
  const levelUp = projected.level > confirmed.level;

  // Dans le niveau projeté : part confirmée (pleine) et part en attente (claire).
  const start = total + pending - projected.xpIntoLevel;
  const solid = Math.max(0, Math.min(1, (total - start) / projected.xpForNext));
  const all = Math.min(1, projected.progress);

  return (
    <div className="rounded-2xl border border-edge bg-gradient-to-br from-panel to-hero p-3">
      <div className="flex items-center gap-3">
        <div
          className={`flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl border-2 bg-well ${
            levelUp ? "border-gold shadow-[0_0_16px] shadow-gold/50" : "border-gold/60"
          }`}
        >
          <span className="text-[9px] font-bold uppercase tracking-widest text-dim">Niv</span>
          <span className="text-2xl font-black leading-none text-gold">{projected.level}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs text-dim">
            <span>
              {Math.round(projected.xpIntoLevel)} / {projected.xpForNext} XP
            </span>
            {pending > 0 ? (
              <span className="font-bold text-xp-soft">+{pending} en attente</span>
            ) : today > 0 ? (
              <span className="font-bold text-ok">+{Math.round(today)} aujourd&apos;hui</span>
            ) : (
              <span>{Math.round(total)} XP total</span>
            )}
          </div>
          <div
            role="progressbar"
            aria-valuenow={Math.round(all * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="relative h-3 w-full overflow-hidden rounded-full bg-well"
          >
            <div className="absolute inset-y-0 left-0 rounded-full bg-xp/35" style={{ width: `${all * 100}%` }} />
            <div className="absolute inset-y-0 left-0 rounded-full bg-xp" style={{ width: `${solid * 100}%` }} />
          </div>
          {pending > 0 && (
            <p className="mt-1.5 text-[11px] text-dim">
              {levelUp ? "🎉 Niveau supérieur en vue — " : ""}clôture ta journée pour valider l&apos;XP
            </p>
          )}
        </div>
        <RefreshButton />
      </div>
    </div>
  );
}
