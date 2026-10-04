"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addQuest } from "@/app/actions";
import { QUEST_PRIORITIES, QUEST_ZONES } from "@/lib/notion-types";
import { addDays, zoneEmoji } from "@/lib/format";
import { Sheet } from "./Sheet";
import { toast } from "./Toast";

const XP_CHOICES = [5, 10, 15, 25, 50];

function Chip({
  name,
  value,
  checked,
  onChange,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange?: () => void;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${
        checked ? "border-gold bg-gold/15 text-gold" : "border-edge text-dim"
      }`}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
      {children}
    </label>
  );
}

export function AddQuest({ today }: { today: string }) {
  const [open, setOpen] = useState(false);
  const [priority, setPriority] = useState<string>("📌 Normale");
  const [xp, setXp] = useState(15);
  const [due, setDue] = useState(today);
  const [state, action, pending] = useActionState(addQuest, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      toast("✨ Quête ajoutée");
      formRef.current?.reset();
      setDue(today);
      setOpen(false);
    }
  }, [state, today]);

  const dueChoices = [
    { label: "Aujourd'hui", value: today },
    { label: "Demain", value: addDays(today, 1) },
    { label: "Sans date", value: "" },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Nouvelle quête"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] right-4 z-30 flex size-14 items-center justify-center rounded-full bg-xp text-3xl font-light text-xp-ink shadow-lg shadow-xp/30 active:scale-95"
      >
        +
      </button>

      {open && (
        <Sheet title="⚔️ Nouvelle quête" onClose={() => setOpen(false)}>
          <form ref={formRef} action={action} className="space-y-4">
            <input
              name="name"
              required
              autoFocus
              maxLength={200}
              placeholder="Ex : Appeler 2 prospects"
              className="w-full rounded-xl border border-edge bg-well px-4 py-3 text-base outline-none focus:border-xp"
            />

            <fieldset>
              <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-dim">Priorité</legend>
              <div className="flex flex-wrap gap-2">
                {QUEST_PRIORITIES.map((p) => (
                  <Chip key={p} name="priority" value={p} checked={priority === p} onChange={() => setPriority(p)}>
                    {p}
                  </Chip>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-dim">XP</legend>
              <div className="flex flex-wrap gap-2">
                {XP_CHOICES.map((v) => (
                  <Chip key={v} name="xp" value={String(v)} checked={xp === v} onChange={() => setXp(v)}>
                    +{v}
                  </Chip>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-dim">Échéance</legend>
              <div className="flex flex-wrap items-center gap-2">
                {dueChoices.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => setDue(c.value)}
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      due === c.value ? "border-gold bg-gold/15 text-gold" : "border-edge text-dim"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
                <input
                  type="date"
                  name="due"
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                  className="rounded-full border border-edge bg-well px-3 py-1.5 text-sm text-ink"
                />
              </div>
            </fieldset>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-dim">Zone</span>
              <select
                name="zone"
                defaultValue=""
                className="w-full rounded-xl border border-edge bg-well px-4 py-3 text-base"
              >
                <option value="">— Aucune —</option>
                {QUEST_ZONES.map((z) => (
                  <option key={z} value={z}>
                    {zoneEmoji(z)} {z}
                  </option>
                ))}
              </select>
            </label>

            {state && !state.ok && <p className="text-sm text-danger">{state.error}</p>}

            <button
              disabled={pending}
              className="w-full rounded-xl bg-xp py-3.5 font-bold text-xp-ink active:scale-[0.98] disabled:opacity-60"
            >
              {pending ? "Création…" : "Ajouter la quête"}
            </button>
          </form>
        </Sheet>
      )}
    </>
  );
}
