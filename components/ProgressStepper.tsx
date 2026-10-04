"use client";

import { useRef, useState, useTransition } from "react";
import { updateProgress } from "@/app/actions";
import { Bar } from "./ui";
import { toast } from "./Toast";

const STEP = 10;

/** Barre de progression avec −/+ 10 %, mise à jour optimiste dans Notion. */
export function ProgressStepper({
  id,
  progress,
  color,
}: {
  id: string;
  progress: number;
  color: string;
}) {
  const [value, setValue] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const inFlight = useRef(0);
  const shown = value ?? progress;

  function change(delta: number) {
    const next = Math.min(100, Math.max(0, Math.round(shown / STEP) * STEP + delta));
    if (next === shown) return;
    setValue(next);
    if ("vibrate" in navigator) navigator.vibrate?.(8);
    inFlight.current++;
    startTransition(async () => {
      const res = await updateProgress(id, next);
      // On ne rend la main aux données serveur qu'après la dernière requête (taps rapides).
      if (--inFlight.current === 0 || !res.ok) setValue(null);
      if (!res.ok) toast(res.error ?? "Erreur", "error");
      else if (next === 100) toast("🏆 Projet à 100 % !");
    });
  }

  const btn =
    "flex size-9 shrink-0 items-center justify-center rounded-full border border-edge text-lg text-dim active:scale-95 active:bg-edge/40 disabled:opacity-30";

  return (
    <div className="flex items-center gap-2">
      <button type="button" className={btn} onClick={() => change(-STEP)} disabled={shown <= 0} aria-label="−10 %">
        −
      </button>
      <div className="flex-1">
        <Bar value={shown / 100} color={color} />
      </div>
      <span className="w-11 shrink-0 text-right text-sm font-black">{Math.round(shown)}%</span>
      <button type="button" className={btn} onClick={() => change(STEP)} disabled={shown >= 100} aria-label="+10 %">
        +
      </button>
    </div>
  );
}
