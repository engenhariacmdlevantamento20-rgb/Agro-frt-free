/* eslint-disable @typescript-eslint/no-explicit-any */
import { pool } from "@/lib/db";
import { route, requireUser, HttpError } from "@/lib/api";

export const GET = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await requireUser();
  const { id } = await ctx.params;
  const r = await pool.query(
    `SELECT r.id, r.producer_id, r.origin_name, r.dest_name, r.dest_kind, r.pickup_date, r.pickup_time, r.urgent, r.flexible, r.notes, r.status, r.cargo_type, (SELECT name FROM cargo_types WHERE code=r.cargo_type) AS cargo_name, (SELECT unit FROM cargo_types WHERE code=r.cargo_type) AS cargo_unit,
            (SELECT json_agg(json_build_object('description',c.description,'quantity',c.quantity,'weight_kg',c.weight_kg)) FROM transport_cargo c WHERE c.request_id=r.id) AS items,
            ST_Y(r.origin::geometry) AS o_lat, ST_X(r.origin::geometry) AS o_lng, ST_Y(r.dest::geometry) AS d_lat, ST_X(r.dest::geometry) AS d_lng,
            rt.distance_m, rt.duration_s, rt.paved_m, rt.unpaved_m, rt.unknown_m, rt.coordinates, rt.waypoints, rt.is_custom, r.origin_farm_id,
            (SELECT json_agg(json_build_object('category',a.category_code,'quantity',a.quantity,'weight',a.approx_weight_kg)) FROM transport_animals a WHERE a.request_id=r.id) AS animals,
            (SELECT id FROM transports t WHERE t.request_id=r.id) AS transport_id
       FROM transport_requests r LEFT JOIN routes rt ON rt.id=r.route_id WHERE r.id=$1`, [id]);
  const req = r.rows[0];
  if (!req) throw new HttpError(404, "Solicitação não encontrada.");
  const isOwner = req.producer_id === u.id;
  const q = await pool.query(
    `SELECT q.id, q.price_cents, q.eta_note, q.note, q.status, q.transporter_id, tu.name AS transporter_name,
            CASE WHEN tu.share_phone THEN tu.phone END AS transporter_phone,
            (SELECT avg(overall)::numeric(3,2) FROM ratings x WHERE x.ratee_id=tu.id) AS rating,
            (SELECT count(*)::int FROM ratings x WHERE x.ratee_id=tu.id) AS rating_count,
            (SELECT count(*)::int FROM transports tt WHERE tt.transporter_id=tu.id AND tt.status='completed') AS done_count,
            EXISTS(SELECT 1 FROM favorites fv WHERE fv.user_id=${isOwner ? "$2" : "$3"} AND fv.favorite_id=q.transporter_id) AS is_favorite,
            tr.plate, tr.model, tr.type AS truck_type, tr.capacity_heads
       FROM quotes q JOIN users tu ON tu.id=q.transporter_id LEFT JOIN trucks tr ON tr.id=q.truck_id
      WHERE q.request_id=$1 ${isOwner ? "" : "AND q.transporter_id=$2"} ORDER BY is_favorite DESC, q.price_cents`,
    isOwner ? [id, u.id] : [id, u.id, u.id]);
  return { ...req, is_owner: isOwner, quotes: q.rows };
});
