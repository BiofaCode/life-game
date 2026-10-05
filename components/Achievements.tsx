"use client";

import { useState } from "react";
import type { Achievement } from "@/lib/achievements";

/** Grille de succès ; toucher un succès affiche sa description et sa progression. */
export function Achievements({ list }: { list: Achievement[] }) {
  const [sel, setSel] = useState<Achievement | null>(null);
  const unlocked = list.filter((a) => a.unlocked).length;
  return (
    <div className="rounded-2xl border border-edge bg-panel p-4">
      <p className="mb-3 text-sm text-dim">
        <span className="font-black text-gold">{unlocked}</span> / {list.length} débloqués
      </p>
      <ul className="grid grid-cols-5 gap-2">
        {list.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => setSel(sel?.id === a.id ? null : a)}
              aria-label={`${a.name} : ${a.unlocked ? "débloqué" : `${a.current}/${a.target}`}`}
              className={`flex aspect-square w-full items-center justify-center rounded-xl border text-2xl ${
                a.unlocked ? "border-gold/60 bg-gold/10" : "border-edge bg-well opacity-40 grayscale"
              } ${sel?.id === a.id ? "ring-2 ring-xp" : ""}`}
            >
              {a.icon}
            </button>
          </li>
        ))}
      </ul>
      {sel && (
        <div className="mt-3 rounded-xl bg-well p-3 text-sm">
          <p className="font-bold">
            {sel.icon} {sel.name} {sel.unlocked && <span className="text-gold">· débloqué</span>}
          </p>
          <p className="text-dim">{sel.desc}</p>
          {!sel.unlocked && (
            <div className="mt-2">
              <div className="h-2 overflow-hidden rounded-full bg-panel">
                <div className="h-full rounded-full bg-xp" style={{ width: `${(sel.current / sel.target) * 100}%` }} />
              </div>
              <p className="mt-1 text-right text-xs text-dim">
                {sel.current} / {sel.target}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
