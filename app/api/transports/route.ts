import { pool } from "@/lib/db";
import { route, requireUser } from "@/lib/api";

export const GET = route(async () => {
  const u = await requireUser();
  const { rows } = await pool.query(
    `SELECT t.id, t.request_id, t.status, (SELECT name FROM cargo_types WHERE code=r.cargo_type) AS cargo_name, t.created_at, t.completed_at, r.origin_name, r.dest_name, r.pickup_date, rt.distance_m, q.price_cents,
            CASE WHEN t.producer_id=$1 THEN 'producer' ELSE 'transporter' END AS my_role,
            CASE WHEN t.producer_id=$1 THEN tu.name ELSE pu.name END AS other_name
       FROM transports t JOIN transport_requests r ON r.id=t.request_id LEFT JOIN routes rt ON rt.id=r.route_id
       JOIN quotes q ON q.id=t.quote_id JOIN users pu ON pu.id=t.producer_id JOIN users tu ON tu.id=t.transporter_id
      WHERE t.producer_id=$1 OR t.transporter_id=$1 ORDER BY t.created_at DESC LIMIT 100`, [u.id]);
  return rows;
});
