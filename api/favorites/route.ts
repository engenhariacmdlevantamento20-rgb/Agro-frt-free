import { pool } from "@/lib/db";
import { route, requireUser, body, HttpError } from "@/lib/api";

export const GET = route(async () => {
  const u = await requireUser();
  const { rows } = await pool.query(
    `SELECT us.id, us.name, us.verified,
            (SELECT avg(overall)::numeric(3,2) FROM ratings r WHERE r.ratee_id=us.id) AS rating,
            ARRAY(SELECT role FROM user_roles ur WHERE ur.user_id=us.id AND ur.role IN ('producer','transporter')) AS roles
       FROM favorites f JOIN users us ON us.id=f.favorite_id WHERE f.user_id=$1 AND us.status='active' ORDER BY us.name`, [u.id]);
  return rows;
});

// Liga/desliga "de confiança"
export const POST = route(async (req: Request) => {
  const u = await requireUser();
  const b = await body(req);
  const id = String(b.user_id ?? "");
  if (id === u.id) throw new HttpError(400, "Não é possível favoritar a si mesmo.");
  const ex = await pool.query("DELETE FROM favorites WHERE user_id=$1 AND favorite_id=$2", [u.id, id]);
  if (ex.rowCount) return { favorite: false };
  await pool.query("INSERT INTO favorites(user_id, favorite_id) SELECT $1, id FROM users WHERE id=$2 AND status='active'", [u.id, id]);
  return { favorite: true };
});
