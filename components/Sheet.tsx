"use client";

import { useEffect, type ReactNode } from "react";

/** Panneau qui monte du bas de l'écran. Fermeture : fond, bouton ×, touche Échap. */
export function Sheet({ title, onClose, children }: { title: ReactNode; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={onClose} role="dialog" aria-modal="true">
      <div
        onClick={(e) => e.stopPropagation()}
        className="sheet-up mx-auto max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border-t border-edge bg-panel p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-black leading-snug">{title}</h2>
          <button type="button" onClick={onClose} className="-mt-1 px-2 text-2xl text-dim" aria-label="Fermer">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
