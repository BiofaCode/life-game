"use client";

import { useState, useTransition } from "react";
import { addSubQuest, setQuestDue, setQuestStatus, type ActionResult } from "@/app/actions";
import { addDays, formatDate, relativeDue, zoneEmoji } from "@/lib/format";
import { QUEST_STATUS, type Quest } from "@/lib/notion-types";
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

export function QuestDetails({
  quest: q,
  today,
  done,
  onToggle,
  onClose,
  subQuests,
  onToggleSub,
  onOpenParent,
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
}) {
  const [pending, startTransition] = useTransition();
  const [subName, setSubName] = useState("");
  const [subXp, setSubXp] = useState(5);
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
    <Sheet title={q.name} onClose={onClose}>
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
        <Row label="Récompense">
          <span className="text-xp-soft">+{q.xp} XP</span>
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
          {done ? "↩︎ Décocher" : `✓ Terminer · +${q.xp} XP`}
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
    </Sheet>
  );
}
