"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  addSubQuest,
  editQuest,
  linkQuestProject,
  setQuestDue,
  setQuestStatus,
  toggleBoss,
  type ActionResult,
} from "@/app/actions";
import { addDays, formatDate, relativeDue, zoneEmoji } from "@/lib/format";
import { QUEST_PRIORITIES, QUEST_STATUS, QUEST_ZONES, questXp, type Quest } from "@/lib/notion-types";
import { Check } from "./Check";
import { Sheet } from "./Sheet";
import { toast } from "./Toast";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-edge py-2 text-sm last:border-0">
      <span className="text-dim">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

/** Formulaire de modification (nom, XP, priorité, zone, notes). */
function EditQuestForm({ q, onDone }: { q: Quest; onDone: () => void }) {
  const [state, action, pending] = useActionState(editQuest, null);
  useEffect(() => {
    if (state?.ok) {
      toast("✏️ Quête modifiée");
      onDone();
    }
  }, [state, onDone]);
  const field = "w-full rounded-xl border border-edge bg-well px-3 py-2.5 text-base outline-none focus:border-xp";
  const label = "mb-1 block text-xs font-bold uppercase tracking-wider text-dim";
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={q.id} />
      <label className="block">
        <span className={label}>Nom</span>
        <input name="name" required maxLength={200} defaultValue={q.name} className={field} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className={label}>XP</span>
          <input name="xp" type="number" inputMode="numeric" min={0} max={10000} defaultValue={q.xp} className={field} />
        </label>
        <label className="block">
          <span className={label}>Priorité</span>
          <select name="priority" defaultValue={q.priority ?? "📌 Normale"} className={field}>
            {QUEST_PRIORITIES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className={label}>Zone</span>
        <select name="zone" defaultValue={q.zone ?? ""} className={field}>
          <option value="">— Aucune —</option>
          {QUEST_ZONES.map((z) => (
            <option key={z} value={z}>
              {zoneEmoji(z)} {z}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className={label}>Notes</span>
        <textarea name="notes" rows={3} defaultValue={q.notes} maxLength={2000} className={`${field} text-sm`} />
      </label>
      {state && !state.ok && <p className="text-sm text-danger">{state.error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onDone} className="flex-1 rounded-xl border border-edge bg-well py-3 font-semibold">
          Annuler
        </button>
        <button disabled={pending} className="flex-1 rounded-xl bg-xp py-3 font-bold text-xp-ink disabled:opacity-60">
          {pending ? "…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}

export function QuestDetails({
  quest: q,
  today,
  done,
  onToggle,
  onClose,
  subQuests,
  onToggleSub,
  onOpenParent,
  projects = [],
}: {
  quest: Quest;
  today: string;
  done: boolean;
  onToggle: () => void;
  onClose: () => void;
  /** Sous-quêtes ouvertes ou terminées aujourd'hui (les plus anciennes ne sont pas chargées). */
  subQuests: { quest: Quest; done: boolean }[];
  onToggleSub: (q: Quest) => void;
  onOpenParent?: () => void;
  projects?: { id: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [subName, setSubName] = useState("");
  const [subXp, setSubXp] = useState(5);
  const [editing, setEditing] = useState(false);
  const olderDone = Math.max(0, q.subCount - subQuests.length);

  function createSub(e: React.FormEvent) {
    e.preventDefault();
    const name = subName.trim();
    if (!name) return;
    startTransition(async () => {
      const res = await addSubQuest(q.id, name, subXp);
      if (res.ok) {
        setSubName("");
        toast("🧩 Sous-quête ajoutée");
      } else toast(res.error ?? "Erreur", "error");
    });
  }

  function act(fn: () => Promise<ActionResult>, ok: string) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        toast(ok);
        onClose();
      } else toast(res.error ?? "Erreur", "error");
    });
  }

  const postpone = (days: number, label: string) =>
    act(() => setQuestDue(q.id, addDays(today, days)), `📅 Reportée à ${label.toLowerCase()}`);

  const btn =
    "rounded-xl border border-edge bg-well px-3 py-3 text-sm font-semibold active:scale-[0.98] disabled:opacity-50";

  return (
    <Sheet title={`${q.boss ? "👑 " : ""}${q.name}`} onClose={onClose}>
      {editing ? (
        <EditQuestForm q={q} onDone={() => setEditing(false)} />
      ) : (
      <>
      <div className="mb-4">
        <Row label="Statut">{done ? QUEST_STATUS.done : (q.status ?? "—")}</Row>
        {q.priority && <Row label="Priorité">{q.priority}</Row>}
        {q.difficulty && <Row label="Difficulté">{q.difficulty}</Row>}
        {q.zone && (
          <Row label="Zone">
            {zoneEmoji(q.zone)} {q.zone}
          </Row>
        )}
        <Row label="Échéance">{q.due ? `${relativeDue(q.due, today)} · ${formatDate(q.due)}` : "Aucune"}</Row>
        {projects.length > 0 && (
          <Row label="Projet">
            <select
              value={q.projectId ?? ""}
              disabled={pending}
              onChange={(e) => {
                const v = e.target.value || null;
                startTransition(async () => {
                  const res = await linkQuestProject(q.id, v);
                  if (!res.ok) toast(res.error ?? "Erreur", "error");
                  else toast(v ? "🚀 Quête rattachée au projet" : "Quête détachée du projet");
                });
              }}
              className="max-w-[12rem] rounded-lg border border-edge bg-well px-2 py-1 text-right text-sm"
            >
              <option value="">— Aucun —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Row>
        )}
        <Row label="Récompense">
          <span className="text-xp-soft">
            +{questXp(q)} XP{q.boss && <span className="ml-1 text-gold">(boss ×2)</span>}
          </span>
        </Row>
      </div>

      {onOpenParent && (
        <button type="button" onClick={onOpenParent} className="mb-4 text-sm text-xp-soft underline underline-offset-4">
          ↖︎ Voir la quête parente
        </button>
      )}

      {!q.parentId && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-dim">
            🧩 Sous-quêtes{q.subCount > 0 ? ` · ${q.subCount - subQuests.filter((s) => !s.done).length}/${q.subCount}` : ""}
          </p>
          {subQuests.length > 0 && (
            <ul className="mb-2 space-y-1.5">
              {subQuests.map(({ quest: k, done: kd }) => (
                <li key={k.id}>
                  <button
                    type="button"
                    onClick={() => onToggleSub(k)}
                    aria-pressed={kd}
                    className="flex w-full items-center gap-3 rounded-xl bg-well px-3 py-2.5 text-left text-sm active:scale-[0.99]"
                  >
                    <Check done={kd} />
                    <span className={`min-w-0 flex-1 ${kd ? "text-dim line-through" : ""}`}>{k.name}</span>
                    <span className="text-xs font-bold text-xp-soft">+{k.xp}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {olderDone > 0 && <p className="mb-2 text-xs text-dim">+ {olderDone} déjà terminée{olderDone > 1 ? "s" : ""} avant aujourd&apos;hui</p>}
          <form onSubmit={createSub} className="flex gap-2">
            <input
              value={subName}
              onChange={(e) => setSubName(e.target.value)}
              maxLength={200}
              placeholder="Ajouter une sous-quête…"
              className="min-w-0 flex-1 rounded-xl border border-edge bg-well px-3 py-2.5 text-base outline-none focus:border-xp"
            />
            <select
              value={subXp}
              onChange={(e) => setSubXp(Number(e.target.value))}
              aria-label="XP de la sous-quête"
              className="rounded-xl border border-edge bg-well px-2 text-sm"
            >
              {[5, 10, 15, 25].map((v) => (
                <option key={v} value={v}>
                  +{v}
                </option>
              ))}
            </select>
            <button
              disabled={pending || !subName.trim()}
              className="rounded-xl bg-xp px-4 font-bold text-xp-ink disabled:opacity-40"
              aria-label="Ajouter la sous-quête"
            >
              +
            </button>
          </form>
        </div>
      )}

      {q.notes && (
        <p className="mb-4 whitespace-pre-line rounded-xl bg-well p-3 text-sm text-dim">{q.notes}</p>
      )}

      <div className="space-y-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            onToggle();
            onClose();
          }}
          className={`w-full rounded-xl py-3.5 font-bold active:scale-[0.98] ${
            done ? "border border-edge bg-well text-ink" : "bg-ok text-panel"
          }`}
        >
          {done ? "↩︎ Décocher" : `✓ Terminer · +${questXp(q)} XP`}
        </button>

        {!done && (
          <>
            {q.status === QUEST_STATUS.doing ? (
              <button
                type="button"
                disabled={pending}
                className={`${btn} w-full`}
                onClick={() => act(() => setQuestStatus(q.id, QUEST_STATUS.todo), "Remise à faire")}
              >
                ⏸ Remettre à faire
              </button>
            ) : (
              <button
                type="button"
                disabled={pending}
                className={`${btn} w-full`}
                onClick={() => act(() => setQuestStatus(q.id, QUEST_STATUS.doing), "▶ Quête commencée")}
              >
                ▶ Commencer (En cours)
              </button>
            )}
            <p className="pt-2 text-xs font-bold uppercase tracking-wider text-dim">Reporter</p>
            <div className="grid grid-cols-3 gap-2">
              <button type="button" disabled={pending} className={btn} onClick={() => postpone(1, "Demain")}>
                Demain
              </button>
              <button type="button" disabled={pending} className={btn} onClick={() => postpone(3, "Dans 3 jours")}>
                +3 j
              </button>
              <button type="button" disabled={pending} className={btn} onClick={() => postpone(7, "Dans 1 semaine")}>
                +1 sem.
              </button>
            </div>
          </>
        )}

        {!done && !q.parentId && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              act(
                () => toggleBoss(q.id, !q.boss),
                q.boss ? "Boss retiré" : "👑 Nouveau boss de la semaine : double XP !",
              )
            }
            className={`${btn} w-full ${q.boss ? "" : "border-gold/50 text-gold"}`}
          >
            {q.boss ? "Retirer le statut de boss" : "👑 Définir comme boss de la semaine (×2 XP)"}
          </button>
        )}

        <button type="button" onClick={() => setEditing(true)} className={`${btn} w-full`}>
          ✏️ Modifier la quête
        </button>

        {q.url && (
          <a
            href={q.url}
            target="_blank"
            rel="noreferrer"
            className="block pt-2 text-center text-sm text-dim underline underline-offset-4"
          >
            Ouvrir dans Notion ↗
          </a>
        )}
      </div>
      </>
      )}
    </Sheet>
  );
}
