import webpush from "web-push";
import { getDb } from "@/db";
import { notifications } from "@/db/schema";
import { pool } from "./db";
import { sendWhatsApp, whatsappConfigured } from "./whatsapp";

export async function notify(userId: string, kind: string, title: string, body?: string, url = "/painel") {
  await getDb().insert(notifications).values({ userId, kind, title, body: body ?? null, url });
  if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT) {
    const subscriptions = (await pool.query("SELECT endpoint,p256dh,auth FROM push_subscriptions WHERE user_id=$1", [userId])).rows;
    await Promise.allSettled(subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ title, body, url }), {
          TTL: 3600, timeout: 5000, vapidDetails: { subject: process.env.VAPID_SUBJECT!, publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, privateKey: process.env.VAPID_PRIVATE_KEY! },
        });
      } catch (error) {
        if ([404, 410].includes((error as { statusCode: number }).statusCode)) await pool.query("DELETE FROM push_subscriptions WHERE endpoint=$1", [subscription.endpoint]);
      }
    }));
  }
  if (whatsappConfigured()) {
    const user = (await pool.query("SELECT phone FROM users WHERE id=$1 AND status='active' AND whatsapp_alerts", [userId])).rows[0];
    if (user?.phone) await sendWhatsApp(user.phone, title, body, url);
  }
}
