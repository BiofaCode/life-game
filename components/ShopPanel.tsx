"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { addReward, purchase } from "@/app/actions";
import { formatDate } from "@/lib/format";
import { REWARD_CATEGORIES, type Reward, type Shop } from "@/lib/notion-types";
import { Sheet } from "./Sheet";
import { toast } from "./Toast";

function AddReward({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState(addReward, null);
  useEffect(() => {
    if (state?.ok) {
      toast("🎁 Récompense ajoutée");
      onDone();
    }
  }, [state, onDone]);
  const field = "w-full rounded-xl border border-edge bg-well px-4 py-3 text-base outline-none focus:border-xp";
  return (
    <form action={action} className="space-y-4">
      <input name="name" required autoFocus maxLength={200} placeholder="Ex : 🍦 Glace" className={field} />
      <label className="block">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-dim">Coût (pièces)</span>
        <input name="cost" type="number" inputMode="numeric" min={1} required defaultValue={50} className={field} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-dim">Catégorie</span>
        <select name="category" defaultValue="Soirée" className={field}>
          {REWARD_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <p className="text-xs text-dim">Repère : une journée bien remplie rapporte ~50 à 100 pièces.</p>
      {state && !state.ok && <p className="text-sm text-danger">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-xl bg-xp py-3.5 font-bold text-xp-ink disabled:opacity-60">
        {pending ? "Ajout…" : "Ajouter à la boutique"}
      </button>
    </form>
  );
}

const CATEGORY_ICON: Record<string, string> = {
  Soirée: "🪩",
  Food: "🍕",
  Sortie: "🎟️",
  Détente: "🛋️",
  Achat: "🛍️",
  Autre: "✨",
};

export function ShopPanel({ shop, balance, pendingXp }: { shop: Shop; balance: number; pendingXp: number }) {
  const [selected, setSelected] = useState<Reward | null>(null);
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<string>("Tout");
  const [pending, startTransition] = useTransition();

  const inDebt = balance < 0;
  // Prochain objectif : la récompense la moins chère pas encore abordable.
  const goal = shop.rewards.find((r) => r.cost > balance) ?? null;
  const categories = REWARD_CATEGORIES.filter((c) => shop.rewards.some((r) => r.category === c));
  const visible = filter === "Tout" ? shop.rewards : shop.rewards.filter((r) => r.category === filter);

  function buy(r: Reward, retro: boolean) {
    startTransition(async () => {
      const res = await purchase(r.id, retro);
      setSelected(null);
      if (!res.ok) toast(res.error ?? "Erreur", "error");
      else if (retro) toast(r.cost > balance ? `📝 Noté — dette de ${r.cost - balance} pièces` : `📝 ${r.name} noté`);
      else toast(`🎁 ${r.name} — profite bien !`);
    });
  }

  return (
    <>
      <div
        className={`mt-4 rounded-2xl border bg-gradient-to-br from-panel to-hero p-4 text-center ${
          inDebt ? "border-danger/60" : "border-gold/40"
        }`}
      >
        <p className="text-xs font-bold uppercase tracking-widest text-dim">{inDebt ? "Dette" : "Ton trésor"}</p>
        <p className={`mt-1 text-4xl font-black ${inDebt ? "text-danger" : "text-gold"}`}>🪙 {balance}</p>
        {inDebt ? (
          <p className="mt-1 text-xs text-danger">
            Rembourse {-balance} pièces avec tes quêtes avant le prochain achat.
          </p>
        ) : (
          <p className="mt-1 text-xs text-dim">
            1 XP validé au Journal = 1 pièce
            {pendingXp > 0 && <span className="text-xp-soft"> · +{pendingXp} à valider</span>}
          </p>
        )}
        {goal && !inDebt && (
          <div className="mt-3 text-left">
            <div className="mb-1 flex justify-between text-xs">
              <span className="truncate text-dim">🎯 Prochain objectif : {goal.name}</span>
              <span className="ml-2 shrink-0 font-bold">
                {balance}/{goal.cost}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-well">
              <div className="h-full rounded-full bg-gold" style={{ width: `${(Math.max(0, balance) / goal.cost) * 100}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 mb-2 flex items-center justify-between px-1">
        <h2 className="text-xs font-bold uppercase tracking-widest text-dim">🛒 Récompenses · {shop.rewards.length}</h2>
        <button type="button" onClick={() => setAdding(true)} className="text-xs font-bold text-xp-soft">
          + Ajouter
        </button>
      </div>

      {categories.length > 1 && (
        <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {["Tout", ...categories].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFilter(c)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
                filter === c ? "border-gold bg-gold/15 text-gold" : "border-edge text-dim"
              }`}
            >
              {c === "Tout" ? "Tout" : `${CATEGORY_ICON[c] ?? ""} ${c}`}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="px-1 text-sm text-dim">Aucune récompense : ajoutes-en une !</p>
      ) : (
        <ul className="space-y-2">
          {visible.map((r) => {
            const affordable = !inDebt && r.cost <= balance;
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setSelected(r)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-edge bg-panel px-3 py-3 text-left active:bg-edge/40"
                >
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate font-medium ${affordable ? "" : "text-dim"}`}>{r.name}</span>
                    <span className="text-xs text-dim">
                      {r.category ?? ""}
                      {!affordable && !inDebt && ` · encore ${r.cost - balance}`}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-black ${
                      affordable ? "bg-gold text-bg" : "bg-well text-dim"
                    }`}
                  >
                    🪙 {r.cost}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {shop.recent.length > 0 && (
        <>
          <h2 className="mt-6 mb-2 px-1 text-xs font-bold uppercase tracking-widest text-dim">🧾 Derniers achats</h2>
          <ul className="space-y-1.5">
            {shop.recent.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-xl bg-panel px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate">
                  {p.name}
                  {p.retro && <span className="ml-1 text-xs text-dim">(après coup)</span>}
                </span>
                <span className="ml-3 shrink-0 text-xs text-dim">
                  {p.date ? formatDate(p.date) : ""} · −{p.cost}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {selected && (
        <Sheet title={selected.name} onClose={() => setSelected(null)}>
          {(() => {
            const affordable = !inDebt && selected.cost <= balance;
            return (
              <>
                <p className="mb-5 text-sm text-dim">
                  🪙 {selected.cost} ·{" "}
                  {affordable
                    ? `il te restera ${balance - selected.cost} pièces`
                    : inDebt
                      ? "rembourse d'abord ta dette"
                      : `il te manque ${selected.cost - balance} pièces`}
                </p>
                {affordable && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => buy(selected, false)}
                    className="mb-2 w-full rounded-xl bg-gold py-3.5 font-bold text-bg active:scale-[0.98] disabled:opacity-60"
                  >
                    {pending ? "Achat…" : `🎁 Acheter pour ${selected.cost} pièces`}
                  </button>
                )}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => buy(selected, true)}
                  className="w-full rounded-xl border border-edge bg-well py-3.5 text-sm font-semibold active:scale-[0.98] disabled:opacity-60"
                >
                  📝 J&apos;en ai déjà profité (noter après coup)
                </button>
                {!affordable && (
                  <p className="mt-2 text-center text-xs text-dim">
                    Le coût sera déduit : ton solde passera à {balance - selected.cost}.
                  </p>
                )}
              </>
            );
          })()}
        </Sheet>
      )}
      {adding && (
        <Sheet title="🎁 Nouvelle récompense" onClose={() => setAdding(false)}>
          <AddReward onDone={() => setAdding(false)} />
        </Sheet>
      )}
    </>
  );
}
