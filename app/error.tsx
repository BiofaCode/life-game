"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-5xl">💀</p>
      <p className="font-bold">Game over… temporaire.</p>
      <p className="text-sm text-dim">Une erreur est survenue en chargeant le dashboard.</p>
      <button onClick={reset} className="rounded-xl bg-xp px-6 py-3 font-bold text-white active:scale-95">
        Réessayer
      </button>
    </main>
  );
}
