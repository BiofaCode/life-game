"use client";

import { useEffect, useState } from "react";

const EVENT = "lg-toast";

/** Affiche un toast depuis n'importe quel composant client. */
export function toast(text: string, tone: "xp" | "error" = "xp") {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { text, tone } }));
}

export function Toaster() {
  const [msg, setMsg] = useState<{ text: string; tone: string; key: number } | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onToast = (e: Event) => {
      const { text, tone } = (e as CustomEvent<{ text: string; tone: string }>).detail;
      setMsg({ text, tone, key: Date.now() });
      clearTimeout(timer);
      timer = setTimeout(() => setMsg(null), 2200);
    };
    window.addEventListener(EVENT, onToast);
    return () => {
      window.removeEventListener(EVENT, onToast);
      clearTimeout(timer);
    };
  }, []);

  if (!msg) return null;
  return (
    <div
      key={msg.key}
      role="status"
      className={`toast-pop pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] z-50 mx-auto w-fit rounded-full px-5 py-2.5 text-sm font-bold shadow-lg ${
        msg.tone === "error" ? "bg-danger text-white" : "bg-gold text-black"
      }`}
    >
      {msg.text}
    </div>
  );
}
