import { pool } from "@/lib/db";
import { route, requireUser, body, HttpError } from "@/lib/api";

// Uma conta pode ter os dois papéis (ex.: produtor que também tem caminhão).
export const POST = route(async (req: Request) => {
  const u = await requireUser();
  const b = await body(req);
  if (!["producer", "transporter"].includes(b.role)) throw new HttpError(400, "Papel inválido.");
  await pool.query("INSERT INTO user_roles(user_id, role) VALUES ($1,$2) ON CONFLICT DO NOTHING", [u.id, b.role]);
  return { ok: true };
});
