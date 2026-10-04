/** Case à cocher visuelle (l'élément interactif est le bouton parent). */
export function Check({ done }: { done: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex size-7 shrink-0 items-center justify-center rounded-lg border-2 text-sm font-black transition-colors ${
        done ? "border-ok bg-ok text-black" : "border-dim/70"
      }`}
    >
      {done ? "✓" : ""}
    </span>
  );
}
