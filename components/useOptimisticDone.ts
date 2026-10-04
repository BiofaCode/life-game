"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/app/actions";
import { toast } from "./Toast";

/** Marque des éléments comme faits de façon optimiste, avec rollback si l'action échoue. */
export function useOptimisticDone(action: (id: string) => Promise<ActionResult>) {
  const [done, setDone] = useState<ReadonlySet<string>>(new Set());
  const [, startTransition] = useTransition();

  function markDone(id: string, successText: string) {
    if ("vibrate" in navigator) navigator.vibrate?.(15);
    setDone((s) => new Set(s).add(id));
    startTransition(async () => {
      const res = await action(id);
      if (res.ok) {
        toast(successText);
      } else {
        setDone((s) => {
          const n = new Set(s);
          n.delete(id);
          return n;
        });
        toast(res.error ?? "Erreur", "error");
      }
    });
  }

  return { done, markDone };
}
