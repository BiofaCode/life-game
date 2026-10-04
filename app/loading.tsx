function Block({ h }: { h: string }) {
  return <div className={`${h} animate-pulse rounded-2xl border border-edge bg-panel`} />;
}

export default function Loading() {
  return (
    <main className="mx-auto max-w-lg space-y-2 px-4 pt-4" aria-busy="true">
      <div className="mb-3 h-10" />
      <Block h="h-32" />
      <div className="h-6" />
      {[0, 1, 2, 3].map((i) => (
        <Block key={i} h="h-14" />
      ))}
      <div className="h-6" />
      {[0, 1, 2].map((i) => (
        <Block key={i} h="h-14" />
      ))}
    </main>
  );
}
