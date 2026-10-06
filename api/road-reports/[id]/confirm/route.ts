import { pool } from "@/lib/db";
import { route, requireUser, HttpError } from "@/lib/api";

// Cada usuário confirma um aviso uma vez; ao atingir o limite configurado, o aviso passa a "validated".
export const POST = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await requireUser();
  const { id } = await ctx.params;
  const r = await pool.query("SELECT user_id FROM road_reports WHERE id=$1 AND status<>'rejected'", [id]);
  if (!r.rows[0]) throw new HttpError(404, "Aviso não encontrado.");
  if (r.rows[0].user_id === u.id) throw new HttpError(400, "Você não pode confirmar o próprio aviso.");
  const v = await pool.query("INSERT INTO road_report_votes(report_id,user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [id, u.id]);
  if (!v.rowCount) throw new HttpError(409, "Você já confirmou este aviso.");
  const th = Number((await pool.query("SELECT value FROM system_settings WHERE key='report_validate_threshold'")).rows[0]?.value ?? 2);
  await pool.query(
    `UPDATE road_reports SET confirmations = confirmations + 1,
            status = CASE WHEN confirmations + 1 >= $2 THEN 'validated' ELSE status END WHERE id=$1`, [id, th]);
  return { ok: true };
});
