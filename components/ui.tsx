export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-widest text-dim">{title}</h2>
      {children}
    </section>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-edge bg-panel p-4 ${className}`}>{children}</div>;
}

export function Bar({ value, color = "bg-xp" }: { value: number; color?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-3 w-full overflow-hidden rounded-full bg-well"
    >
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-1 py-3 text-sm text-dim">{children}</p>;
}

export function ErrorCard({ what }: { what: string }) {
  return (
    <Card className="border-danger/60 text-sm text-danger">
      Impossible de charger {what}. Vérifie NOTION_API_KEY et le partage de la base avec l&apos;intégration.
    </Card>
  );
}
