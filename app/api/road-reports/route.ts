import { pool } from "@/lib/db";
import { route, requireUser, body, HttpError, lat, lng, pt } from "@/lib/api";

const KINDS = ["estrada_interditada", "ponte_interditada", "estrada_ruim", "intransitavel_caminhao", "atoleiro", "acesso_bloqueado", "nova_estrada", "porteira", "ponto_perigoso", "outro"];

export const GET = route(async () => {
  await requireUser();
  const { rows } = await pool.query(
    `SELECT id, kind, note, confirmations, status, created_at, ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng
       FROM road_reports WHERE status<>'rejected' AND created_at > now() - interval '180 days' ORDER BY created_at DESC LIMIT 300`);
  return rows;
});

export const POST = route(async (req: Request) => {
  const u = await requireUser();
  const b = await body(req);
  if (!KINDS.includes(b.kind)) throw new HttpError(400, "Tipo de aviso inválido.");
  const r = await pool.query(`INSERT INTO road_reports(user_id,kind,note,location) VALUES ($1,$2,$3,${pt(4, 5)}) RETURNING id`,
    [u.id, b.kind, String(b.note ?? "").slice(0, 300) || null, lng(b.lng), lat(b.lat)]);
  return { id: r.rows[0].id };
});
