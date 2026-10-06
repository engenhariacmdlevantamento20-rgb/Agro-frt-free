import { pool } from "@/lib/db";
import { route, requireUser, body, HttpError } from "@/lib/api";

export const POST = route(async (req: Request) => {
  const u = await requireUser();
  const b = await body(req);
  const k = b.keys ?? {};
  if (!b.endpoint || !k.p256dh || !k.auth) throw new HttpError(400, "Inscrição inválida.");
  await pool.query(
    `INSERT INTO push_subscriptions(user_id,endpoint,p256dh,auth) VALUES ($1,$2,$3,$4)
     ON CONFLICT (endpoint) DO UPDATE SET user_id=EXCLUDED.user_id, p256dh=EXCLUDED.p256dh, auth=EXCLUDED.auth`,
    [u.id, String(b.endpoint), String(k.p256dh), String(k.auth)]);
  return { ok: true };
});
