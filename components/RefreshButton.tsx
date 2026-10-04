"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

/** En PWA iOS il n'y a pas de pull-to-refresh : ce bouton recharge les données. */
export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      aria-label="Rafraîchir"
      className="flex size-10 items-center justify-center rounded-full border border-edge bg-panel text-lg text-dim active:scale-95"
    >
      <span className={pending ? "animate-spin" : ""}>↻</span>
    </button>
  );
}
