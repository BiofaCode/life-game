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
        <select name="category" defaultValue="Détente" className={field}>
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

export function ShopPanel({ shop, balance, pendingXp }: { shop: Shop; balance: number; pendingXp: number }) {
  const [confirm, setConfirm] = useState<Reward | null>(null);
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();

  function buy(r: Reward) {
    startTransition(async () => {
      const res = await purchase(r.id);
      setConfirm(null);
      if (res.ok) toast(`🎁 ${r.name} — profite bien !`);
      else toast(res.error ?? "Erreur", "error");
    });
  }

  return (
    <>
      <div className="mt-4 rounded-2xl border border-gold/40 bg-gradient-to-br from-panel to-hero p-4 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-dim">Ton trésor</p>
        <p className="mt-1 text-4xl font-black text-gold">🪙 {balance}</p>
        <p className="mt-1 text-xs text-dim">
          1 XP validé au Journal = 1 pièce
          {pendingXp > 0 && <span className="text-xp-soft"> · +{pendingXp} à valider (clôture ta journée)</span>}
        </p>
      </div>

      <div className="mt-6 mb-2 flex items-center justify-between px-1">
        <h2 className="text-xs font-bold uppercase tracking-widest text-dim">🛒 Récompenses</h2>
        <button type="button" onClick={() => setAdding(true)} className="text-xs font-bold text-xp-soft">
          + Ajouter
        </button>
      </div>
      {shop.rewards.length === 0 ? (
        <p className="px-1 text-sm text-dim">Aucune récompense : ajoutes-en une !</p>
      ) : (
        <ul className="space-y-2">
          {shop.rewards.map((r) => {
            const affordable = r.cost <= balance;
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => affordable && setConfirm(r)}
                  aria-disabled={!affordable}
                  className={`flex w-full items-center gap-3 rounded-2xl border bg-panel px-3 py-3 text-left ${
                    affordable ? "border-edge active:bg-edge/40" : "border-edge opacity-60"
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{r.name}</span>
                    <span className="text-xs text-dim">
                      {r.category ?? ""}
                      {!affordable && ` · encore ${r.cost - balance} pièces`}
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
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                <span className="ml-3 shrink-0 text-xs text-dim">
                  {p.date ? formatDate(p.date) : ""} · −{p.cost}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {confirm && (
        <Sheet title="🎁 Acheter cette récompense ?" onClose={() => setConfirm(null)}>
          <p className="mb-1 text-xl font-black">{confirm.name}</p>
          <p className="mb-5 text-sm text-dim">
            🪙 {confirm.cost} · il te restera {balance - confirm.cost} pièces
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => buy(confirm)}
            className="w-full rounded-xl bg-gold py-3.5 font-bold text-bg active:scale-[0.98] disabled:opacity-60"
          >
            {pending ? "Achat…" : `Acheter pour ${confirm.cost} pièces`}
          </button>
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
