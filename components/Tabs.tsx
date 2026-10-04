"use client";

import { useEffect, useState, type ReactNode } from "react";

export interface Tab {
  id: string;
  label: string;
  icon: string;
  badge?: number;
  content: ReactNode;
}

const STORAGE_KEY = "lg-tab";

/** Onglets avec barre de navigation fixe en bas (pouce-friendly). */
export function Tabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && tabs.some((t) => t.id === saved)) setActive(saved);
    } catch {
      /* stockage indisponible : onglet par défaut */
    }
  }, [tabs]);

  function select(id: string) {
    setActive(id);
    window.scrollTo({ top: 0 });
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      {tabs.map((t) => (
        <div key={t.id} hidden={t.id !== active}>
          {t.content}
        </div>
      ))}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-edge bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur"
        aria-label="Navigation"
      >
        <ul className="mx-auto flex max-w-lg">
          {tabs.map((t) => {
            const on = t.id === active;
            return (
              <li key={t.id} className="flex-1">
                <button
                  type="button"
                  onClick={() => select(t.id)}
                  aria-current={on ? "page" : undefined}
                  className={`relative flex w-full flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${
                    on ? "text-gold" : "text-dim"
                  }`}
                >
                  <span className={`text-xl ${on ? "" : "opacity-60 grayscale"}`}>{t.icon}</span>
                  {t.label}
                  {!!t.badge && (
                    <span className="absolute right-[calc(50%-1.6rem)] top-1.5 min-w-5 rounded-full bg-danger px-1 text-[10px] leading-5 text-white">
                      {t.badge}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
