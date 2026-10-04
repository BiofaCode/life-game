import "server-only";
import webpush from "web-push";
import { deleteSubscription, listSubscriptions } from "./notion";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export function pushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function configure() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:life-game@example.com",
    process.env.VAPID_PUBLIC_KEY ?? "",
    process.env.VAPID_PRIVATE_KEY ?? "",
  );
}

/** Envoie une notification à tous les appareils abonnés ; nettoie les abonnements expirés. */
export async function pushToAll(payload: PushPayload): Promise<{ sent: number; removed: number }> {
  if (!pushConfigured()) throw new Error("VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY manquantes.");
  configure();
  const subs = await listSubscriptions();
  let sent = 0;
  let removed = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(s.subscription, JSON.stringify(payload), { TTL: 60 * 60 * 6 });
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await deleteSubscription(s.pageId);
          removed++;
        } else {
          console.error("push", status, e);
        }
      }
    }),
  );
  return { sent, removed };
}
