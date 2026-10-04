"use client";

import { useEffect, useState, useTransition } from "react";
import { sendTestPush, subscribePush } from "@/app/actions";
import { toast } from "./Toast";

type State = "loading" | "unsupported" | "needs-install" | "denied" | "off" | "on";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Activer les notifications push (rappel du soir) sur cet appareil. */
export function PushSettings({ publicKey }: { publicKey: string | null }) {
  const [state, setState] = useState<State>("loading");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    const ios = /iphone|ipad/i.test(navigator.userAgent);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (ios && !standalone) return setState("needs-install");
    if (!supported) return setState("unsupported");
    if (Notification.permission === "denied") return setState("denied");
    navigator.serviceWorker
      .getRegistration("/sw.js")
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => setState(sub ? "on" : "off"))
      .catch(() => setState("off"));
  }, []);

  function enable() {
    if (!publicKey) return toast("Clés VAPID manquantes dans Vercel.", "error");
    startTransition(async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setState(permission === "denied" ? "denied" : "off");
          return;
        }
        const reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          }));
        const device = /iphone/i.test(navigator.userAgent) ? "iPhone" : navigator.platform || "Appareil";
        const res = await subscribePush(JSON.stringify(sub), device);
        if (res.ok) {
          setState("on");
          toast("🔔 Notifications activées");
        } else toast(res.error ?? "Erreur", "error");
      } catch (e) {
        console.error(e);
        toast("Activation impossible sur cet appareil.", "error");
      }
    });
  }

  function test() {
    startTransition(async () => {
      const res = await sendTestPush();
      if (res.ok) toast("📨 Notification envoyée");
      else toast(res.error ?? "Erreur", "error");
    });
  }

  const box = "rounded-2xl border border-edge bg-panel p-4 text-sm";
  const btn = "mt-3 w-full rounded-xl py-3 font-bold active:scale-[0.98] disabled:opacity-60";

  if (state === "loading") return <div className={box}>…</div>;
  if (state === "needs-install")
    return (
      <div className={box}>
        Sur iPhone, les notifications marchent seulement depuis l&apos;app installée : Safari → Partager → « Sur
        l&apos;écran d&apos;accueil », puis ouvre Life Game depuis l&apos;icône.
      </div>
    );
  if (state === "unsupported")
    return <div className={box}>Ce navigateur ne gère pas les notifications push (iOS 16.4 minimum).</div>;
  if (state === "denied")
    return (
      <div className={box}>
        Notifications refusées. Réactive-les dans Réglages iPhone → Notifications → Life Game.
      </div>
    );

  return (
    <div className={box}>
      <p>
        {state === "on" ? "✅ Activées sur cet appareil." : "Reçois un rappel le soir (~19 h) :"}{" "}
        <span className="text-dim">séries en danger, quêtes du jour restantes, XP à valider.</span>
      </p>
      {state === "off" ? (
        <button type="button" disabled={pending} onClick={enable} className={`${btn} bg-xp text-xp-ink`}>
          {pending ? "Activation…" : "🔔 Activer les notifications"}
        </button>
      ) : (
        <button type="button" disabled={pending} onClick={test} className={`${btn} border border-edge bg-well`}>
          {pending ? "Envoi…" : "📨 Envoyer un test maintenant"}
        </button>
      )}
    </div>
  );
}
