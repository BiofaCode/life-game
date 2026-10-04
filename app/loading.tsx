function Block({ h }: { h: string }) {
  return <div className={`${h} animate-pulse rounded-2xl border border-edge bg-panel`} />;
}

export default function Loading() {
  return (
    <main className="mx-auto max-w-lg space-y-2 px-4 pb-28 pt-4" aria-busy="true" aria-label="Chargement">
      <Block h="h-20" />
      <div className="h-6" />
      {[0, 1, 2, 3, 4].map((i) => (
        <Block key={i} h="h-16" />
      ))}
      <nav className="fixed inset-x-0 bottom-0 h-[calc(env(safe-area-inset-bottom)+4rem)] border-t border-edge bg-bg/90" />
    </main>
  );
}
