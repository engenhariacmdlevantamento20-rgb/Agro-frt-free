import { pool } from "@/lib/db";
import { route, requireUser } from "@/lib/api";

export const GET = route(async () => {
  await requireUser("admin");
  return (await pool.query(
    `SELECT l.id, l.action, l.ip, l.meta, l.created_at, u.name AS user_name FROM audit_logs l LEFT JOIN users u ON u.id=l.user_id ORDER BY l.id DESC LIMIT 100`)).rows;
});
