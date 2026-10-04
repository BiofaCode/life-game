import { authEnabled } from "@/lib/auth";
import { levelFromXp } from "@/lib/config";
import { dayDiff, formatDate } from "@/lib/format";
import { getHabits, getProjects, getQuests, getXpStats, getZoneXp, todayISO } from "@/lib/notion";
import { HABIT_STATUS, PROJECT_STATUS } from "@/lib/notion-types";
import { AddQuest } from "@/components/AddQuest";
import { Attributes } from "@/components/Attributes";
import { CloseDay } from "@/components/CloseDay";
import { DailyGoal } from "@/components/DailyGoal";
import { HabitList } from "@/components/HabitList";
import { ProjectsPanel } from "@/components/ProjectsPanel";
import { QuestBoard } from "@/components/QuestBoard";
import { RefreshButton } from "@/components/RefreshButton";
import { Tabs } from "@/components/Tabs";
import { ThemePicker } from "@/components/ThemePicker";
import { XpChart } from "@/components/XpChart";
import { XpHeader } from "@/components/XpHeader";
import { Card, ErrorCard, Section } from "@/components/ui";

export const dynamic = "force-dynamic";

const ok = <T,>(r: PromiseSettledResult<T>) => (r.status === "fulfilled" ? r.value : null);

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-edge bg-panel p-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-dim">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
      {sub && <p className="text-xs text-dim">{sub}</p>}
    </div>
  );
}

export default async function Home() {
  const [xpR, questsR, habitsR, projectsR, zoneR] = await Promise.allSettled([
    getXpStats(),
    getQuests(),
    getHabits(),
    getProjects(),
    getZoneXp(),
  ]);
  for (const r of [xpR, questsR, habitsR, projectsR, zoneR]) {
    if (r.status === "rejected") console.error(r.reason);
  }
  const xp = ok(xpR);
  const quests = ok(questsR);
  const habits = ok(habitsR);
  const projects = ok(projectsR);
  const zoneXp = ok(zoneR);
  const lvl = xp ? levelFromXp(xp.total) : null;
  const today = todayISO();

  const lateCount = quests?.filter((q) => !q.done && q.due && dayDiff(today, q.due) < 0).length ?? 0;
  const overdueProjects = projects?.filter((p) => p.overdue).length ?? 0;
  const questsDone = quests?.filter((q) => q.done).length ?? 0;
  const habitsDone = habits?.filter((h) => h.today === HABIT_STATUS.done).length ?? 0;
  // XP gagné aujourd'hui dans l'app, pas encore inscrit au Journal.
  const earnedToday =
    (quests?.filter((q) => q.done).reduce((s, q) => s + q.xp, 0) ?? 0) +
    (habits?.filter((h) => h.today === HABIT_STATUS.done).reduce((s, h) => s + h.xp, 0) ?? 0);
  const pendingXp = Math.max(0, Math.round(earnedToday - (xp?.today ?? 0)));
  const bestHabit = habits?.reduce<(typeof habits)[number] | null>((b, h) => (!b || h.best > b.best ? h : b), null);

  const todayTab = (
    <>
      {quests && habits && <DailyGoal quests={quests} habits={habits} today={today} />}
      <Section title={`⚔️ Quêtes${quests ? ` · ${questsDone} faite${questsDone > 1 ? "s" : ""}` : ""}`}>
        {quests ? <QuestBoard quests={quests} today={today} /> : <ErrorCard what="les quêtes" />}
      </Section>
      <Section title={`🔥 Habitudes${habits ? ` · ${habitsDone}/${habits.length}` : ""}`}>
        {habits ? <HabitList habits={habits} /> : <ErrorCard what="les habitudes" />}
      </Section>
      {quests && habits && xp && <CloseDay quests={quests} habits={habits} journalToday={xp.today} pendingXp={pendingXp} />}
      <AddQuest today={today} />
    </>
  );

  const activeProjects = projects?.filter((p) => p.status === PROJECT_STATUS.active).length ?? 0;
  const projectsTab = (
    <Section title={`🚀 Projets en cours${projects ? ` · ${activeProjects}` : ""}`}>
      {projects ? <ProjectsPanel projects={projects} /> : <ErrorCard what="les projets" />}
    </Section>
  );

  const statsTab = (
    <>
      {zoneXp && (
        <Section title="🧙 Personnage">
          <Attributes zoneXp={zoneXp} />
        </Section>
      )}
      <Section title="📊 XP des 7 derniers jours">
        {xp ? (
          <Card>
            <XpChart days={xp.last7} />
          </Card>
        ) : (
          <ErrorCard what="le Journal XP" />
        )}
      </Section>
      {xp && lvl && (
        <Section title="🏆 Records">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="XP total" value={String(Math.round(xp.total))} sub={`Niveau ${lvl.level}`} />
            <Stat
              label="Série Journal"
              value={`${xp.activeStreak} j`}
              sub={xp.activeStreak > 0 ? "jours d'affilée" : "écris dans ton Journal !"}
            />
            <Stat
              label="Meilleur jour"
              value={xp.bestDay ? `${xp.bestDay.xp} XP` : "—"}
              sub={xp.bestDay ? formatDate(xp.bestDay.date) : undefined}
            />
            <Stat
              label="Meilleur streak"
              value={bestHabit ? `${bestHabit.best} j` : "—"}
              sub={bestHabit?.name}
            />
          </div>
        </Section>
      )}
      {xp && xp.recent.length > 0 && (
        <Section title="📔 Journal récent">
          <ul className="space-y-2">
            {xp.recent.map((e) => (
              <li key={e.id} className="flex items-center gap-3 rounded-2xl border border-edge bg-panel px-3 py-2.5">
                <span className="text-xl">{e.mood ? e.mood.split(" ")[0] : (e.type?.split(" ")[0] ?? "📔")}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{e.title}</span>
                  <span className="text-xs text-dim">{formatDate(e.date)}</span>
                </span>
                <span className="shrink-0 text-sm font-bold text-xp-soft">+{e.xp}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
      <Section title="🎨 Thème">
        <ThemePicker />
      </Section>
    </>
  );

  return (
    <main className="mx-auto max-w-lg px-4 pb-40 pt-4">
      {!authEnabled() && (
        <p className="mb-3 rounded-xl border border-gold/50 bg-gold/10 px-3 py-2 text-xs text-gold">
          ⚠ App non protégée : ajoute APP_PASSWORD dans les variables Vercel.
        </p>
      )}

      <header>
        {lvl && xp ? (
          <XpHeader total={xp.total} today={xp.today} pending={pendingXp} />
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <ErrorCard what="le Journal XP" />
            </div>
            <RefreshButton />
          </div>
        )}
      </header>

      <Tabs
        tabs={[
          { id: "today", label: "Aujourd'hui", icon: "⚔️", badge: lateCount, content: todayTab },
          { id: "projects", label: "Projets", icon: "🚀", badge: overdueProjects, content: projectsTab },
          { id: "stats", label: "Profil", icon: "📊", content: statsTab },
        ]}
      />
    </main>
  );
}
