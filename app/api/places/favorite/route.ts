import { pool } from "@/lib/db";
import { route, requireUser, body, HttpError } from "@/lib/api";

// Liga/desliga o favorito de um local.
export const POST = route(async (req: Request) => {
  const u = await requireUser();
  const id = String((await body(req)).place_id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(400, "Local inválido.");
  const del = await pool.query("DELETE FROM place_favorites WHERE user_id=$1 AND place_id=$2", [u.id, id]);
  if (del.rowCount) return { favorite: false };
  const ins = await pool.query("INSERT INTO place_favorites(user_id, place_id) SELECT $1, id FROM places WHERE id=$2 AND active", [u.id, id]);
  if (!ins.rowCount) throw new HttpError(404, "Local não encontrado.");
  return { favorite: true };
});
