import { pool } from "@/lib/db";
import { route, requireUser } from "@/lib/api";

export const GET = route(async () => {
  const u = await requireUser();
  const { rows } = await pool.query("SELECT id, kind, title, body, url, read_at, created_at FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 60", [u.id]);
  return rows;
});

// Marca tudo como lido
export const PUT = route(async () => {
  const u = await requireUser();
  await pool.query("UPDATE notifications SET read_at=now() WHERE user_id=$1 AND read_at IS NULL", [u.id]);
  return { ok: true };
});
