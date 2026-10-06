import { pool } from "@/lib/db";
import { route, requireUser, body, HttpError, lat, lng, pt, audit } from "@/lib/api";
import { PLACE_KINDS } from "@/lib/places";
import { csvCell } from "@/lib/pure";

const CLIENTS_SQL = `
  SELECT f.id, f.name AS farm, f.state_code, m.name AS municipality, f.address_reference,
         ST_Y(f.location::geometry) AS lat, ST_X(f.location::geometry) AS lng, f.created_at,
         u.id AS owner_id, u.name AS owner, u.phone, u.email,
         (SELECT count(*)::int FROM transport_requests r WHERE r.origin_farm_id=f.id) AS transports
    FROM farms f JOIN users u ON u.id=f.owner_id LEFT JOIN municipalities m ON m.ibge_code=f.municipality_ibge
   WHERE f.location IS NOT NULL AND u.status<>'deleted' ORDER BY u.name, f.name`;

export const GET = route(async (req: Request) => {
  const a = await requireUser("admin");
  // Banco de clientes (fazendas e donos) em CSV, para abrir no Excel.
  if (new URL(req.url).searchParams.get("csv") === "clients") {
    const rows = (await pool.query(CLIENTS_SQL)).rows;
    await audit(a.id, "clients_exported", { rows: rows.length });
    const head = ["Fazenda", "Proprietário", "WhatsApp", "E-mail", "UF", "Município", "Referência", "Latitude", "Longitude", "Transportes", "Cadastro"];
    const lines = rows.map((r) => [r.farm, r.owner, r.phone, /@whatsapp\.uberboipgt\.local$/i.test(r.email) ? "" : r.email, r.state_code, r.municipality, r.address_reference, r.lat, r.lng, r.transports, new Date(r.created_at).toISOString().slice(0, 10)].map(csvCell).join(";"));
    return new Response("\uFEFF" + [head.join(";"), ...lines].join("\r\n"), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="clientes-agro-frete.csv"' },
    });
  }
  const places = (await pool.query(
    `SELECT p.id, p.name, p.kind, p.state_code, p.municipality_ibge, p.address_reference, p.phone, p.notes, p.active,
            ST_Y(p.location::geometry) AS lat, ST_X(p.location::geometry) AS lng,
            (SELECT count(*)::int FROM place_favorites f WHERE f.place_id=p.id) AS favorites
       FROM places p ORDER BY p.active DESC, p.name`)).rows;
  const clients = (await pool.query(CLIENTS_SQL)).rows;
  // Destinos usados em transportes que ainda não estão salvos como local (para o admin promover com um toque).
  const suggestions = (await pool.query(
    `SELECT name, kind, lat, lng, count(*)::int AS uses FROM (
       SELECT dest_name AS name, dest_kind AS kind, ST_Y(dest::geometry) AS lat, ST_X(dest::geometry) AS lng FROM transport_requests
     ) x
     WHERE NOT EXISTS (SELECT 1 FROM places p WHERE lower(p.name)=lower(x.name))
     GROUP BY name, kind, lat, lng ORDER BY count(*) DESC, name LIMIT 20`)).rows;
  return { places, clients, suggestions };
});

// Cria ou edita um local. Para "remover", desative (os favoritos e o histórico ficam preservados).
export const POST = route(async (req: Request) => {
  const a = await requireUser("admin");
  const b = await body(req);
  const name = String(b.name ?? "").trim();
  if (name.length < 2 || name.length > 120) throw new HttpError(400, "Informe o nome do local.");
  const kind = String(b.kind ?? "outro");
  if (!PLACE_KINDS[kind]) throw new HttpError(400, "Tipo de local inválido.");
  const la = lat(b.lat), lo = lng(b.lng);
  const uf = b.state_code ? String(b.state_code).toUpperCase() : null;
  if (uf && !(await pool.query("SELECT 1 FROM states WHERE code=$1", [uf])).rowCount) throw new HttpError(400, "Estado inválido.");
  const muni = b.municipality_ibge ? Number(b.municipality_ibge) : null;
  if (muni && !(await pool.query("SELECT 1 FROM municipalities WHERE ibge_code=$1", [muni])).rowCount) throw new HttpError(400, "Município inválido.");
  const phone = b.phone ? String(b.phone).replace(/\D/g, "").slice(0, 15) || null : null;
  const f = [name, kind, uf, muni, String(b.address_reference ?? "").trim().slice(0, 200) || null, phone, String(b.notes ?? "").trim().slice(0, 600) || null, b.active !== false];
  if (b.id) {
    if (!/^[0-9a-f-]{36}$/i.test(String(b.id))) throw new HttpError(400, "Local inválido.");
    const r = await pool.query(
      `UPDATE places SET name=$2, kind=$3, state_code=$4, municipality_ibge=$5, address_reference=$6, phone=$7, notes=$8, active=$9,
              location=${pt(10, 11)}, updated_at=now() WHERE id=$1 RETURNING id`, [String(b.id), ...f, lo, la]);
    if (!r.rowCount) throw new HttpError(404, "Local não encontrado.");
    await audit(a.id, "place_saved", { id: r.rows[0].id, name });
    return { id: r.rows[0].id };
  }
  const r = await pool.query(
    `INSERT INTO places(name,kind,state_code,municipality_ibge,address_reference,phone,notes,active,location,created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,${pt(9, 10)},$11) RETURNING id`, [...f, lo, la, a.id]);
  await audit(a.id, "place_saved", { id: r.rows[0].id, name });
  return { id: r.rows[0].id };
});
