import { authEnabled } from "@/lib/auth";
import { levelFromXp } from "@/lib/config";
import { getHabits, getProjects, getQuests, getTotalXp, todayISO } from "@/lib/notion";
import { QuestList } from "@/components/QuestList";
import { Bar, Card, Empty, ErrorCard, Section } from "@/components/ui";

export const dynamic = "force-dynamic";

const ok = <T,>(r: PromiseSettledResult<T>) => (r.status === "fulfilled" ? r.value : null);

export default async function Home() {
  const [xpR, questsR, habitsR, projectsR] = await Promise.allSettled([
    getTotalXp(),
    getQuests(),
    getHabits(),
    getProjects(),
  ]);
  const xp = ok(xpR);
  const quests = ok(questsR);
  const habits = ok(habitsR);
  const projects = ok(projectsR);
  const lvl = xp === null ? null : levelFromXp(xp);
  const today = todayISO();

  return (
    <main className="mx-auto max-w-lg px-4 pb-12 pt-4">
      {!authEnabled() && (
        <p className="mb-3 rounded-xl border border-gold/50 bg-gold/10 px-3 py-2 text-xs text-gold">
          ⚠ App non protégée : ajoute APP_PASSWORD dans les variables Vercel.
        </p>
      )}
      <header>
        {lvl ? (
          <Card className="bg-gradient-to-br from-panel to-[#1b1840]">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-dim">Niveau</p>
                <p className="text-5xl font-black leading-none text-gold">{lvl.level}</p>
              </div>
              <p className="text-right text-sm text-dim">
                <span className="font-bold text-ink">{Math.round(lvl.totalXp)}</span> XP total
              </p>
            </div>
            <div className="mt-3">
              <Bar value={lvl.progress} />
              <p className="mt-1.5 text-right text-xs text-dim">
                {Math.round(lvl.xpIntoLevel)} / {lvl.xpForNext} XP vers le niveau {lvl.level + 1}
              </p>
            </div>
          </Card>
        ) : (
          <ErrorCard what="le Journal XP" />
        )}
      </header>

      <Section title="⚔️ Quêtes du jour">
        {quests ? <QuestList quests={quests} today={today} /> : <ErrorCard what="les quêtes" />}
      </Section>

      <Section title="🔥 Streaks">
        {habits ? (
          habits.length === 0 ? (
            <Empty>Aucune habitude.</Empty>
          ) : (
            <ul className="space-y-2">
              {habits.map((h) => (
                <li key={h.id} className="flex items-center justify-between rounded-2xl border border-edge bg-panel p-3">
                  <span className="min-w-0 flex-1 truncate font-medium">{h.name}</span>
                  <span className="ml-3 flex shrink-0 items-center gap-3 text-sm">
                    <span className="font-bold text-orange-400">🔥 {h.streak}</span>
                    <span className="text-dim">🏆 {h.best}</span>
                  </span>
                </li>
              ))}
            </ul>
          )
        ) : (
          <ErrorCard what="les habitudes" />
        )}
      </Section>

      <Section title="🚀 Projets en cours">
        {projects ? (
          projects.length === 0 ? (
            <Empty>Aucun projet en cours.</Empty>
          ) : (
            <ul className="space-y-2">
              {projects.map((p) => (
                <li key={p.id}>
                  <Card className={p.overdue ? "border-danger/70" : ""}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                      <span className="shrink-0 text-sm font-bold">{Math.round(p.progress)}%</span>
                    </div>
                    <div className="mt-2">
                      <Bar value={p.progress / 100} color={p.overdue ? "bg-danger" : "bg-ok"} />
                    </div>
                    {p.end && (
                      <p className={`mt-1.5 text-xs ${p.overdue ? "font-semibold text-danger" : "text-dim"}`}>
                        {p.overdue ? "⚠ En retard · " : "Fin : "}
                        {p.end.slice(0, 10).split("-").reverse().join("/")}
                      </p>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          )
        ) : (
          <ErrorCard what="les projets" />
        )}
      </Section>
    </main>
  );
}
