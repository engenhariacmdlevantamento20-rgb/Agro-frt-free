import { pool } from "@/lib/db";
import { route, requireUser } from "@/lib/api";

// "Onde vou estar": o destino de cada transporte em andamento do motorista (para calcular o km até a próxima carga).
export const GET = route(async () => {
  const u = await requireUser();
  const { rows } = await pool.query(
    `SELECT t.id, r.origin_name, r.dest_name, ST_Y(r.dest::geometry) AS lat, ST_X(r.dest::geometry) AS lng
       FROM transports t JOIN transport_requests r ON r.id=t.request_id
      WHERE t.transporter_id=$1 AND t.status NOT IN ('completed','cancelled')
      ORDER BY r.pickup_date NULLS LAST`, [u.id]);
  return rows;
});
