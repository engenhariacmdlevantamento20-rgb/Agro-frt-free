import { pool } from "@/lib/db";
import { route, requireUser, HttpError } from "@/lib/api";

// Perfil público: só o que o usuário permite (telefone só se share_phone).
export const GET = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const me = await requireUser();
  const { id } = await ctx.params;
  const u = await pool.query(
    `SELECT id, name, verified, created_at, CASE WHEN share_phone THEN phone END AS phone,
            ARRAY(SELECT role FROM user_roles r WHERE r.user_id=users.id AND r.role IN ('producer','transporter')) AS roles,
            (SELECT count(*)::int FROM transports t WHERE (t.producer_id=users.id OR t.transporter_id=users.id) AND t.status='completed') AS done_count,
            (SELECT avg(overall)::numeric(3,2) FROM ratings r WHERE r.ratee_id=users.id) AS rating,
            (SELECT count(*)::int FROM ratings r WHERE r.ratee_id=users.id) AS rating_count,
            EXISTS(SELECT 1 FROM favorites f WHERE f.user_id=$2 AND f.favorite_id=users.id) AS is_favorite
       FROM users WHERE id=$1 AND status='active'`, [id, me.id]);
  if (!u.rows[0]) throw new HttpError(404, "Perfil não encontrado.");
  const reviews = await pool.query(
    `SELECT r.overall, r.comment, r.created_at, ra.name AS rater_name FROM ratings r JOIN users ra ON ra.id=r.rater_id
      WHERE r.ratee_id=$1 ORDER BY r.created_at DESC LIMIT 20`, [id]);
  return { ...u.rows[0], is_me: id === me.id, reviews: reviews.rows };
});
