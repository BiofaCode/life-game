import { formatDate, priorityIcon, zoneEmoji } from "@/lib/format";
import type { Project } from "@/lib/notion-types";
import { Bar } from "./ui";

function deadline(p: Project): { text: string; tone: string } | null {
  if (p.daysLeft === null) return null;
  if (p.overdue) return { text: `En retard de ${-p.daysLeft} j`, tone: "text-danger font-semibold" };
  if (p.daysLeft === 0) return { text: "Fin aujourd'hui", tone: "text-gold font-semibold" };
  if (p.daysLeft <= 7) return { text: `J-${p.daysLeft}`, tone: "text-gold font-semibold" };
  return { text: `J-${p.daysLeft}`, tone: "text-dim" };
}

export function ProjectCard({ p }: { p: Project }) {
  const dl = deadline(p);
  return (
    <article className={`rounded-2xl border bg-panel p-4 ${p.overdue ? "border-danger/70" : "border-edge"}`}>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-black/30 text-xl">
          {zoneEmoji(p.zone)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold leading-snug">
            {p.priority && (
              <span className="mr-1" title={p.priority}>
                {priorityIcon(p.priority)}
              </span>
            )}
            {p.name}
          </h3>
          {p.zone && <p className="text-xs text-dim">{p.zone}</p>}
        </div>
        <span className="shrink-0 text-xl font-black">{Math.round(p.progress)}%</span>
      </div>

      {p.description && <p className="mt-3 line-clamp-3 text-sm text-dim">{p.description}</p>}

      <div className="mt-3">
        <Bar value={p.progress / 100} color={p.overdue ? "bg-danger" : p.progress >= 100 ? "bg-gold" : "bg-ok"} />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        <span className={dl?.tone ?? "text-dim"}>
          {p.overdue && "⚠ "}
          {dl?.text ?? "Pas de date de fin"}
          {p.end && <span className="font-normal text-dim"> · {formatDate(p.end)}</span>}
        </span>
        {p.xp > 0 && <span className="font-bold text-violet-300">{p.xp} XP</span>}
      </div>
    </article>
  );
}
