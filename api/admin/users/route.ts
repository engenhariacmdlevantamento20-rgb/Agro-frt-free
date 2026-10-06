import { pool } from "@/lib/db";
import { route, requireUser, body, HttpError, audit } from "@/lib/api";

export const GET = route(async (req: Request) => {
  await requireUser("admin");
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.phone, u.status, u.verified, u.created_at,
            ARRAY(SELECT role FROM user_roles r WHERE r.user_id=u.id) AS roles,
            (SELECT status FROM subscriptions s WHERE s.user_id=u.id ORDER BY created_at DESC LIMIT 1) AS sub_status
       FROM users u WHERE ($1='' OR u.name ILIKE '%'||$1||'%' OR u.email::text ILIKE '%'||$1||'%' OR u.phone LIKE '%'||$1||'%')
      ORDER BY u.created_at DESC LIMIT 100`, [q]);
  return rows;
});

const ACTIONS: Record<string, string> = {
  block: "UPDATE users SET status='blocked' WHERE id=$1 AND status<>'deleted'",
  unblock: "UPDATE users SET status='active' WHERE id=$1 AND status='blocked'",
  verify: "UPDATE users SET verified=true WHERE id=$1",
  unverify: "UPDATE users SET verified=false WHERE id=$1",
};

export const PUT = route(async (req: Request) => {
  const a = await requireUser("admin");
  const b = await body(req);
  const sql = ACTIONS[String(b.action)];
  if (!sql) throw new HttpError(400, "Ação inválida.");
  if (b.id === a.id && b.action === "block") throw new HttpError(400, "Você não pode bloquear a si mesmo.");
  await pool.query(sql, [b.id]);
  await audit(a.id, `admin_${b.action}`, { user: b.id });
  return { ok: true };
});
