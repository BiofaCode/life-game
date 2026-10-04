"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/app/actions";
import { toast } from "./Toast";

/** Marque des éléments comme faits de façon optimiste, avec rollback si l'action échoue. */
export function useOptimisticDone(action: (id: string) => Promise<ActionResult>) {
  const [done, setDone] = useState<ReadonlySet<string>>(new Set());
  const [, startTransition] = useTransition();

  const add = (id: string) => setDone((s) => new Set(s).add(id));
  const remove = (id: string) =>
    setDone((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });

  function markDone(id: string, successText: string, undo?: () => Promise<ActionResult>) {
    if ("vibrate" in navigator) navigator.vibrate?.(15);
    add(id);
    startTransition(async () => {
      const res = await action(id);
      if (!res.ok) {
        remove(id);
        toast(res.error ?? "Erreur", "error");
        return;
      }
      toast(
        successText,
        "xp",
        undo && {
          label: "Annuler",
          onClick: () => {
            remove(id);
            startTransition(async () => {
              const r = await undo();
              if (!r.ok) {
                add(id);
                toast(r.error ?? "Erreur", "error");
              }
            });
          },
        },
      );
    });
  }

  return { done, markDone };
}
