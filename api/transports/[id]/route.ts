import { pool } from "@/lib/db";
import { route, requireUser, transportFor } from "@/lib/api";
import { pathLength, downsample } from "@/lib/pure";

export const GET = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await requireUser();
  const { id } = await ctx.params;
  const t = await transportFor(u.id, id);
  const isProducer = t.producer_id === u.id;
  const otherId = isProducer ? t.transporter_id : t.producer_id;

  const [head, other, events, docs, ratings, last, setting, animals, trailQ, fav] = await Promise.all([
    pool.query(
      `SELECT t.id, t.status, t.tracking_active, t.started_at, t.completed_at, q.price_cents,
              r.origin_name, r.dest_name, r.pickup_date, r.pickup_time, r.notes, r.cargo_type, (SELECT name FROM cargo_types WHERE code=r.cargo_type) AS cargo_name, (SELECT unit FROM cargo_types WHERE code=r.cargo_type) AS cargo_unit,
              ST_Y(r.origin::geometry) AS o_lat, ST_X(r.origin::geometry) AS o_lng, ST_Y(r.dest::geometry) AS d_lat, ST_X(r.dest::geometry) AS d_lng,
              rt.distance_m, rt.duration_s, rt.paved_m, rt.unpaved_m, rt.unknown_m, rt.coordinates, rt.is_custom,
              tr.plate, tr.model, tr.type AS truck_type
         FROM transports t JOIN transport_requests r ON r.id=t.request_id JOIN quotes q ON q.id=t.quote_id
         LEFT JOIN routes rt ON rt.id=r.route_id LEFT JOIN trucks tr ON tr.id=t.truck_id WHERE t.id=$1`, [id]),
    pool.query("SELECT id, name, verified, CASE WHEN share_phone THEN phone END AS phone FROM users WHERE id=$1", [otherId]),
    pool.query("SELECT status, created_at FROM transport_events WHERE transport_id=$1 ORDER BY id", [id]),
    pool.query("SELECT id, kind, number, valid_until, status, filename, uploaded_at, uploader_id FROM documents WHERE transport_id=$1 ORDER BY uploaded_at DESC", [id]),
    pool.query("SELECT rater_id, overall, comment FROM ratings WHERE transport_id=$1", [id]),
    pool.query("SELECT ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng, recorded_at FROM tracking_points WHERE transport_id=$1 ORDER BY recorded_at DESC LIMIT 1", [id]),
    pool.query("SELECT value FROM system_settings WHERE key='tracking_interval_seconds'"),
    pool.query("SELECT category_code AS category, quantity FROM transport_animals WHERE request_id=$1", [t.request_id]),
    pool.query("SELECT ST_X(location::geometry) AS x, ST_Y(location::geometry) AS y FROM tracking_points WHERE transport_id=$1 ORDER BY recorded_at", [id]),
    pool.query("SELECT 1 FROM favorites WHERE user_id=$1 AND favorite_id=$2", [u.id, otherId]),
  ]);
  const items = await pool.query("SELECT description, quantity, weight_kg FROM transport_cargo WHERE request_id=$1 ORDER BY id", [t.request_id]);
  const trail = trailQ.rows.map((p) => [p.x, p.y]);
  const travelled = Math.round(pathLength(trail));

  return {
    ...head.rows[0], my_role: isProducer ? "producer" : "transporter", my_id: u.id, other: other.rows[0],
    events: events.rows, documents: docs.rows, animals: animals.rows,
    my_rating: ratings.rows.find((x) => x.rater_id === u.id) ?? null,
    other_rating: ratings.rows.find((x) => x.rater_id !== u.id) ?? null,
    last_position: last.rows[0] ?? null,
    tracking_interval: Number(setting.rows[0]?.value ?? 60),
    items: items.rows, trail: downsample(trail, 400), travelled_m: travelled,
    remaining_m: Math.max(0, Number(head.rows[0].distance_m ?? 0) - travelled), is_favorite: fav.rowCount === 1,
  };
});
