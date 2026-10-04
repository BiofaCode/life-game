"use client";

import { useState, useTransition } from "react";
import { changeProjectStatus } from "@/app/actions";
import { formatDate, priorityIcon, zoneEmoji } from "@/lib/format";
import { PROJECT_STATUS, type Project } from "@/lib/notion-types";
import { ProjectCard } from "./ProjectCard";
import { Sheet } from "./Sheet";
import { toast } from "./Toast";

const STATUS_ACTIONS = [
  { status: PROJECT_STATUS.active, label: "🚀 En cours", toast: "🚀 Projet lancé !" },
  { status: PROJECT_STATUS.paused, label: "⏸️ En pause", toast: "⏸️ Projet en pause" },
  { status: PROJECT_STATUS.idea, label: "🌱 Idée", toast: "🌱 Rangé dans les idées" },
  { status: PROJECT_STATUS.done, label: "✅ Terminé", toast: "🏆 Projet terminé !" },
];

function ProjectSheet({ p, onClose }: { p: Project; onClose: () => void }) {
  const [pending, startTransition] = useTransition();

  function setStatus(status: string, okText: string) {
    startTransition(async () => {
      const res = await changeProjectStatus(p.id, status);
      if (res.ok) {
        toast(okText);
        onClose();
      } else toast(res.error ?? "Erreur", "error");
    });
  }

  return (
    <Sheet title={`${zoneEmoji(p.zone)} ${p.name}`} onClose={onClose}>
      <dl className="mb-4 grid grid-cols-2 gap-2 text-sm">
        {[
          ["Statut", p.status ?? "—"],
          ["Priorité", p.priority ?? "—"],
          ["Début", p.start ? formatDate(p.start) : "—"],
          ["Fin", p.end ? formatDate(p.end) : "—"],
          ["Progression", `${Math.round(p.progress)} %`],
          ["XP total", String(p.xp)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-well p-2.5">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-dim">{k}</dt>
            <dd className="mt-0.5 font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      {p.description && <p className="mb-4 whitespace-pre-line text-sm text-dim">{p.description}</p>}

      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-dim">Changer le statut</p>
      <div className="grid grid-cols-2 gap-2">
        {STATUS_ACTIONS.filter((a) => a.status !== p.status).map((a) => (
          <button
            key={a.status}
            type="button"
            disabled={pending}
            onClick={() => setStatus(a.status, a.toast)}
            className={`rounded-xl border px-3 py-3 text-sm font-semibold active:scale-[0.98] disabled:opacity-50 ${
              a.status === PROJECT_STATUS.done ? "border-ok/50 bg-ok/10 text-ok" : "border-edge bg-well"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>
      {p.url && (
        <a href={p.url} target="_blank" rel="noreferrer" className="mt-4 block text-center text-sm text-dim underline underline-offset-4">
          Ouvrir dans Notion ↗
        </a>
      )}
    </Sheet>
  );
}

function CompactList({ title, projects, onOpen }: { title: string; projects: Project[]; onOpen: (id: string) => void }) {
  if (projects.length === 0) return null;
  return (
    <details className="group mt-5">
      <summary className="flex cursor-pointer list-none items-center justify-between px-1 py-1 text-xs font-bold uppercase tracking-widest text-dim">
        <span>
          {title} · {projects.length}
        </span>
        <span className="transition-transform group-open:rotate-180">▾</span>
      </summary>
      <ul className="mt-2 space-y-2">
        {projects.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onOpen(p.id)}
              className="flex w-full items-center gap-3 rounded-2xl border border-edge bg-panel px-3 py-3 text-left active:bg-edge/40"
            >
              <span className="text-lg">{zoneEmoji(p.zone)}</span>
              <span className="min-w-0 flex-1 truncate font-medium">
                {p.priority && <span className="mr-1">{priorityIcon(p.priority)}</span>}
                {p.name}
              </span>
              {p.progress > 0 && <span className="text-xs text-dim">{Math.round(p.progress)} %</span>}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function ProjectsPanel({ projects }: { projects: Project[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const opened = projects.find((p) => p.id === openId) ?? null;
  const active = projects.filter((p) => p.status === PROJECT_STATUS.active);

  return (
    <>
      {active.length === 0 ? (
        <p className="px-1 py-3 text-sm text-dim">Aucun projet en cours.</p>
      ) : (
        <ul className="space-y-3">
          {active.map((p) => (
            <li key={p.id}>
              <ProjectCard p={p} onOpen={() => setOpenId(p.id)} />
            </li>
          ))}
        </ul>
      )}
      <CompactList
        title="⏸️ En pause"
        projects={projects.filter((p) => p.status === PROJECT_STATUS.paused)}
        onOpen={setOpenId}
      />
      <CompactList
        title="🌱 Idées"
        projects={projects.filter((p) => p.status === PROJECT_STATUS.idea)}
        onOpen={setOpenId}
      />
      {opened && <ProjectSheet p={opened} onClose={() => setOpenId(null)} />}
    </>
  );
}
