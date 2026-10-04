"use client";

import { useActionState, useEffect, useState } from "react";
import { closeDay } from "@/app/actions";
import { HABIT_STATUS, MOODS, type Habit, type Quest } from "@/lib/notion-types";
import { Sheet } from "./Sheet";
import { toast } from "./Toast";

/** Clôture de journée : propose une entrée Journal pré-remplie avec ce qui a été fait. */
export function CloseDay({
  quests,
  habits,
  journalToday,
  pendingXp,
}: {
  quests: Quest[];
  habits: Habit[];
  journalToday: number;
  /** XP gagné aujourd'hui pas encore inscrit au Journal. */
  pendingXp: number;
}) {
  const [open, setOpen] = useState(false);
  const [mood, setMood] = useState<string>("");
  const [state, action, pending] = useActionState(closeDay, null);

  const doneQuests = quests.filter((q) => q.done);
  const doneHabits = habits.filter((h) => h.today === HABIT_STATUS.done);
  const suggested = pendingXp;

  const notes = [
    doneQuests.length ? `Quêtes : ${doneQuests.map((q) => `${q.name} (+${q.xp})`).join(", ")}` : "",
    doneHabits.length ? `Habitudes : ${doneHabits.map((h) => `${h.name} (+${h.xp})`).join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  useEffect(() => {
    if (state?.ok) {
      toast("📔 Journée enregistrée au Journal !");
      setOpen(false);
    }
  }, [state]);

  const field = "w-full rounded-xl border border-edge bg-well px-4 py-3 text-base outline-none focus:border-xp";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-6 w-full rounded-2xl border border-dashed border-gold/60 bg-gold/5 py-4 font-bold text-gold active:scale-[0.99]"
      >
        📔 Clôturer la journée{suggested > 0 ? ` · +${suggested} XP` : ""}
      </button>

      {open && (
        <Sheet title="📔 Clôturer la journée" onClose={() => setOpen(false)}>
          <form action={action} className="space-y-4">
            {journalToday > 0 && (
              <p className="rounded-xl border border-gold/50 bg-gold/10 p-3 text-sm text-gold">
                Il y a déjà +{journalToday} XP au Journal aujourd&apos;hui. Vérifie que tu ne comptes pas deux fois.
              </p>
            )}

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-dim">Titre</span>
              <input name="title" required maxLength={200} defaultValue="" placeholder="Ex : Prospection et sport" className={field} />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-dim">
                XP gagné (suggestion : {suggested})
              </span>
              <input name="xp" type="number" inputMode="numeric" min={0} max={10000} defaultValue={suggested} className={field} />
            </label>

            <fieldset>
              <legend className="mb-1.5 text-xs font-bold uppercase tracking-wider text-dim">Humeur</legend>
              <div className="flex flex-wrap gap-2">
                {MOODS.map((m) => (
                  <label
                    key={m}
                    className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${
                      mood === m ? "border-gold bg-gold/15 text-gold" : "border-edge text-dim"
                    }`}
                  >
                    <input type="radio" name="mood" value={m} checked={mood === m} onChange={() => setMood(m)} className="sr-only" />
                    {m}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-dim">Notes</span>
              <textarea name="notes" rows={4} defaultValue={notes} className={`${field} text-sm`} />
            </label>

            {state && !state.ok && <p className="text-sm text-danger">{state.error}</p>}

            <button
              disabled={pending}
              className="w-full rounded-xl bg-gold py-3.5 font-bold text-bg active:scale-[0.98] disabled:opacity-60"
            >
              {pending ? "Enregistrement…" : "Enregistrer au Journal"}
            </button>
          </form>
        </Sheet>
      )}
    </>
  );
}
