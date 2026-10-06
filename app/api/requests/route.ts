/* eslint-disable @typescript-eslint/no-explicit-any */
import { pool } from "@/lib/db";
import { route, requireUser, body, HttpError, lat, lng, num, pt, audit } from "@/lib/api";
import { CATEGORIES } from "@/lib/flow";
import { requireAccess } from "@/lib/billing";
import { notify } from "@/lib/notify";


export const GET = route(async (req: Request) => {
  const u = await requireUser();
  const sp = new URL(req.url).searchParams;

  if (sp.get("scope") === "mine") {
    const { rows } = await pool.query(
      `SELECT r.id, r.origin_name, r.dest_name, r.pickup_date, r.status, r.created_at, r.cargo_type, (SELECT name FROM cargo_types WHERE code=r.cargo_type) AS cargo_name, (SELECT unit FROM cargo_types WHERE code=r.cargo_type) AS cargo_unit,
              rt.distance_m, t.id AS transport_id, t.status AS transport_status,
              (SELECT count(*)::int FROM quotes q WHERE q.request_id=r.id AND q.status='pending') AS quotes_count,
              (SELECT COALESCE(sum(quantity),0)::int FROM transport_animals a WHERE a.request_id=r.id) AS heads,
              (SELECT COALESCE(sum(quantity),0) FROM transport_cargo c WHERE c.request_id=r.id) AS items_qty
         FROM transport_requests r LEFT JOIN routes rt ON rt.id=r.route_id LEFT JOIN transports t ON t.request_id=r.id
        WHERE r.producer_id=$1 ORDER BY r.created_at DESC LIMIT 100`, [u.id]);
    return rows;
  }

  // Oportunidades para transportadores (opcional: filtro por raio em km a partir de lat/lng)
  const params: unknown[] = [u.id];
  let where = "r.status='published' AND r.producer_id<>$1";
  if (sp.get("lat") && sp.get("lng") && sp.get("km")) {
    params.push(lng(sp.get("lng")), lat(sp.get("lat")), num(sp.get("km"), 1, 3000, "Raio inválido.") * 1000);
    where += ` AND ST_DWithin(r.origin, ST_SetSRID(ST_MakePoint($2,$3),4326)::geography, $4)`;
  }
  const cargo = sp.get("cargo");
  if (cargo) { params.push(cargo); where += ` AND r.cargo_type=$${params.length}`; }
  const { rows } = await pool.query(
    `SELECT r.id, r.cargo_type, (SELECT name FROM cargo_types WHERE code=r.cargo_type) AS cargo_name, (SELECT unit FROM cargo_types WHERE code=r.cargo_type) AS cargo_unit, r.origin_name, r.dest_name, r.dest_kind, r.pickup_date, r.pickup_time, r.urgent, r.flexible, r.notes,
            ST_Y(r.origin::geometry) AS o_lat, ST_X(r.origin::geometry) AS o_lng,
            pu.name AS producer_name, CASE WHEN pu.share_phone THEN pu.phone END AS producer_phone,
            (SELECT avg(overall)::numeric(3,2) FROM ratings x WHERE x.ratee_id=pu.id) AS producer_rating,
            (SELECT json_agg(json_build_object('category',a.category_code,'quantity',a.quantity)) FROM transport_animals a WHERE a.request_id=r.id) AS animals,
            (SELECT json_agg(json_build_object('description',c.description,'quantity',c.quantity,'weight_kg',c.weight_kg)) FROM transport_cargo c WHERE c.request_id=r.id) AS items,
            rt.distance_m, rt.duration_s, rt.paved_m, rt.unpaved_m,
            (SELECT price_cents FROM quotes q WHERE q.request_id=r.id AND q.transporter_id=$1) AS my_quote_cents,
            EXISTS(SELECT 1 FROM favorites fv WHERE fv.user_id=$1 AND fv.favorite_id=r.producer_id) AS is_favorite, pu.id AS producer_id
       FROM transport_requests r JOIN users pu ON pu.id=r.producer_id LEFT JOIN routes rt ON rt.id=r.route_id
      WHERE ${where} ORDER BY is_favorite DESC, r.urgent DESC, r.pickup_date NULLS LAST, r.created_at DESC LIMIT 100`, params);
  return rows;
});

export const POST = route(async (req: Request) => {
  const u = await requireUser("producer");
  await requireAccess(u.id);
  const b = await body(req);
  const o = b.origin ?? {}, d = b.dest ?? {};
  const oName = String(o.name ?? "").trim(), dName = String(d.name ?? "").trim();
  if (!oName || !dName) throw new HttpError(400, "Informe origem e destino.");
  const cargoCode = String(b.cargo_type || "bovinos");
  const ct = (await pool.query("SELECT has_animals FROM cargo_types WHERE code=$1 AND active", [cargoCode])).rows[0];
  if (!ct) throw new HttpError(400, "Tipo de carga inválido.");
  const animals: any[] = ct.has_animals && Array.isArray(b.animals) ? b.animals : [];
  const items: any[] = !ct.has_animals && Array.isArray(b.items) ? b.items.slice(0, 20) : [];
  if (ct.has_animals) {
    if (!animals.length) throw new HttpError(400, "Informe pelo menos uma categoria de animal.");
    for (const a of animals) {
      if (!CATEGORIES[a.category]) throw new HttpError(400, "Categoria inválida.");
      num(a.quantity, 1, 1000, "Quantidade inválida.");
    }
  } else {
    if (!items.length) throw new HttpError(400, "Descreva a carga (o que e quanto).");
    for (const i of items) {
      if (!String(i.description ?? "").trim()) throw new HttpError(400, "Descreva cada item da carga.");
      num(i.quantity, 0.01, 1e7, "Quantidade inválida.");
    }
  }
  const r = b.route;
  if (!r || !Array.isArray(r.coordinates)) throw new HttpError(400, "Calcule a rota antes de publicar.");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const rt = await client.query(
      `INSERT INTO routes(distance_m,duration_s,paved_m,unpaved_m,unknown_m,coordinates,waypoints,is_custom,profile)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [num(r.distance_m, 0, 1e7, "Rota inválida."), num(r.duration_s, 0, 1e6, "Rota inválida."), Math.round(Number(r.paved_m) || 0),
       Math.round(Number(r.unpaved_m) || 0), Math.round(Number(r.unknown_m) || 0), JSON.stringify(r.coordinates),
       JSON.stringify(r.waypoints ?? []), !!r.is_custom, r.profile ?? null]);
    // $1..$9 acima; abaixo: origem e destino como pontos
    const q = await client.query(
      `INSERT INTO transport_requests(producer_id,origin_farm_id,origin_name,origin,dest_name,dest_kind,dest,
         pickup_date,pickup_time,tolerance_minutes,urgent,flexible,notes,route_id,cargo_type)
       VALUES ($1,$2,$3,${pt(4, 5)},$6,$7,${pt(8, 9)},$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id`,
      [u.id, o.farm_id || null, oName, lng(o.lng), lat(o.lat), dName, d.kind || "outro", lng(d.lng), lat(d.lat),
       b.date || null, b.time || null, b.tolerance_minutes ? Number(b.tolerance_minutes) : null,
       !!b.urgent, !!b.flexible, b.notes || null, rt.rows[0].id, cargoCode]);
    for (const a of animals) {
      await client.query("INSERT INTO transport_animals(request_id,category_code,quantity,approx_weight_kg) VALUES ($1,$2,$3,$4)",
        [q.rows[0].id, a.category, Number(a.quantity), a.weight ? Number(a.weight) : null]);
    }
    for (const i of items) {
      await client.query("INSERT INTO transport_cargo(request_id,description,quantity,weight_kg) VALUES ($1,$2,$3,$4)",
        [q.rows[0].id, String(i.description).trim().slice(0, 120), Number(i.quantity), i.weight_kg ? Number(i.weight_kg) : null]);
    }
    await client.query("COMMIT");
    await audit(u.id, "request_created", { id: q.rows[0].id });
    // Transportadores que marcaram este produtor como "de confiança" são avisados primeiro
    const favs = await pool.query("SELECT user_id FROM favorites WHERE favorite_id=$1", [u.id]);
    for (const f of favs.rows) await notify(f.user_id, "new_request", "Nova carga de um produtor de confiança", `${oName} → ${dName}`, "/painel/oportunidades");
    return { id: q.rows[0].id };
  } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
});
