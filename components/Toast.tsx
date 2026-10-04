"use client";

import { useEffect, useState } from "react";

const EVENT = "lg-toast";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastDetail {
  text: string;
  tone: "xp" | "error";
  action?: ToastAction;
}

/** Affiche un toast depuis n'importe quel composant client. */
export function toast(text: string, tone: ToastDetail["tone"] = "xp", action?: ToastAction) {
  window.dispatchEvent(new CustomEvent<ToastDetail>(EVENT, { detail: { text, tone, action } }));
}

export function Toaster() {
  const [msg, setMsg] = useState<(ToastDetail & { key: number }) | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<ToastDetail>).detail;
      setMsg({ ...detail, key: Date.now() });
      clearTimeout(timer);
      timer = setTimeout(() => setMsg(null), detail.action ? 4000 : 2200);
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
      style={{ animationDuration: msg.action ? "4s" : undefined }}
      className={`toast-pop fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] z-50 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-3 rounded-full py-2.5 pl-5 text-sm font-bold shadow-lg ${
        msg.action ? "pr-2" : "pointer-events-none pr-5"
      } ${msg.tone === "error" ? "bg-danger text-white" : "bg-gold text-black"}`}
    >
      <span className="truncate">{msg.text}</span>
      {msg.action && (
        <button
          type="button"
          onClick={() => {
            msg.action?.onClick();
            setMsg(null);
          }}
          className="shrink-0 rounded-full bg-black/80 px-3 py-1.5 text-xs text-gold active:scale-95"
        >
          {msg.action.label}
        </button>
      )}
    </div>
  );
}
