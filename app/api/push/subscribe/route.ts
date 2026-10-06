import { pool } from "@/lib/db";
import { route, requireUser, body, HttpError } from "@/lib/api";

export const POST = route(async (req: Request) => {
  const u = await requireUser();
  const b = await body(req);
  const k = b.keys ?? {};
  if (!b.endpoint || !k.p256dh || !k.auth) throw new HttpError(400, "Inscrição inválida.");
  let endpoint: URL;
  try { endpoint = new URL(String(b.endpoint)); } catch { throw new HttpError(400, "Inscrição inválida."); }
  if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password || endpoint.port ||
      !["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com", "wns.windows.com", "notify.windows.com"].some((host) => endpoint.hostname === host || endpoint.hostname.endsWith(`.${host}`))) throw new HttpError(400, "Provedor de notificações não permitido.");
  await pool.query(
    `INSERT INTO push_subscriptions(user_id,endpoint,p256dh,auth) VALUES ($1,$2,$3,$4)
     ON CONFLICT (endpoint) DO UPDATE SET user_id=EXCLUDED.user_id, p256dh=EXCLUDED.p256dh, auth=EXCLUDED.auth`,
    [u.id, String(b.endpoint), String(k.p256dh), String(k.auth)]);
  return { ok: true };
});
