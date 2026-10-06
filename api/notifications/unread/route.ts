import { pool } from "@/lib/db";
import { route, requireUser } from "@/lib/api";

// Consulta leve para o alerta ao vivo: quantos avisos não lidos e os mais recentes.
export const GET = route(async () => {
  const u = await requireUser();
  const [c, l] = await Promise.all([
    pool.query("SELECT count(*)::int AS n FROM notifications WHERE user_id=$1 AND read_at IS NULL", [u.id]),
    pool.query("SELECT id::int AS id, kind, title, body, url FROM notifications WHERE user_id=$1 AND read_at IS NULL ORDER BY id DESC LIMIT 5", [u.id]),
  ]);
  return { count: c.rows[0].n as number, latest: l.rows };
});
