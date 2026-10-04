"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/app/actions";
import { toast } from "./Toast";

/**
 * État « fait » optimiste : l'UI bascule tout de suite, puis l'action Notion confirme.
 * En cas d'échec, on revient en arrière et on affiche l'erreur.
 */
export function useOptimisticToggle(action: (id: string, done: boolean) => Promise<ActionResult>) {
  const [overrides, setOverrides] = useState<ReadonlyMap<string, boolean>>(new Map());
  const [, startTransition] = useTransition();

  const set = (id: string, v: boolean | undefined) =>
    setOverrides((m) => {
      const n = new Map(m);
      if (v === undefined) n.delete(id);
      else n.set(id, v);
      return n;
    });

  function isDone(id: string, serverDone: boolean): boolean {
    return overrides.get(id) ?? serverDone;
  }

  function toggle(id: string, done: boolean, successText?: string) {
    if ("vibrate" in navigator) navigator.vibrate?.(done ? 15 : 8);
    set(id, done);
    startTransition(async () => {
      const res = await action(id, done);
      // Les données serveur rafraîchies (revalidatePath) font foi désormais.
      set(id, undefined);
      if (!res.ok) toast(res.error ?? "Erreur", "error");
      else if (successText) toast(successText);
    });
  }

  return { isDone, toggle };
}
