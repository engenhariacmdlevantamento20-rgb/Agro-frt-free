/* eslint-disable @typescript-eslint/no-explicit-any */
import { pool } from "@/lib/db";
import { route, requireUser, body, HttpError, lat, lng, pt } from "@/lib/api";

const KINDS = ["sede", "porteira", "curral", "embarque", "estrada_interna", "encontro", "outro"];

export const GET = route(async () => {
  const u = await requireUser();
  const { rows } = await pool.query(
    `SELECT f.id, f.name, f.state_code, f.address_reference, f.road_type, f.access_notes, f.visibility,
            ST_Y(f.location::geometry) AS lat, ST_X(f.location::geometry) AS lng,
            COALESCE((SELECT json_agg(json_build_object('id',p.id,'kind',p.kind,'name',p.name,
                      'lat',ST_Y(p.location::geometry),'lng',ST_X(p.location::geometry)) ORDER BY p.name)
                      FROM farm_points p WHERE p.farm_id=f.id), '[]') AS points
       FROM farms f WHERE f.owner_id=$1 ORDER BY f.name`, [u.id]);
  return rows;
});

export const POST = route(async (req: Request) => {
  const u = await requireUser("producer");
  const b = await body(req);
  const name = String(b.name ?? "").trim();
  if (name.length < 2) throw new HttpError(400, "Informe o nome da fazenda.");
  const st = await pool.query("SELECT 1 FROM states WHERE code=$1 AND active", [String(b.state_code ?? "")]);
  if (!st.rowCount) throw new HttpError(400, "Estado inválido.");
  const la = lat(b.lat), lo = lng(b.lng);
  const points: any[] = Array.isArray(b.points) ? b.points.slice(0, 30) : [];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const f = await client.query(
      `INSERT INTO farms(owner_id,name,state_code,address_reference,road_type,access_notes,location,municipality_ibge)
       VALUES ($1,$2,$3,$4,$5,$6,${pt(7, 8)},$9) RETURNING id`,
      [u.id, name, b.state_code, b.address_reference || null, b.road_type || null, b.access_notes || null, lo, la, b.municipality_ibge ? Number(b.municipality_ibge) : null]);
    for (const p of points) {
      if (!KINDS.includes(p.kind)) throw new HttpError(400, "Tipo de ponto inválido.");
      await client.query(
        `INSERT INTO farm_points(farm_id,kind,name,notes,location) VALUES ($1,$2,$3,$4,${pt(5, 6)})`,
        [f.rows[0].id, p.kind, String(p.name || p.kind).slice(0, 80), p.notes || null, lng(p.lng), lat(p.lat)]);
    }
    await client.query("COMMIT");
    return { id: f.rows[0].id };
  } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
});
