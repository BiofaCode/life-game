"use client";

import { useTransition } from "react";
import { setQuestDue, setQuestStatus, type ActionResult } from "@/app/actions";
import { addDays, formatDate, relativeDue, zoneEmoji } from "@/lib/format";
import { QUEST_STATUS, type Quest } from "@/lib/notion-types";
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
}: {
  quest: Quest;
  today: string;
  done: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();

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
