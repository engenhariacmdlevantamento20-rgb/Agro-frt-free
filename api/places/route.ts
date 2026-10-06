import { pool } from "@/lib/db";
import { route, requireUser } from "@/lib/api";

// Locais para o mapa e para escolher origem/destino: locais do administrador (com favorito do usuário),
// as fazendas do próprio usuário e o histórico de destinos dele.
export const GET = route(async () => {
  const u = await requireUser();
  const places = (await pool.query(
    `SELECT p.id, p.name, p.kind, p.state_code, m.name AS municipality, p.address_reference, p.phone, p.notes,
            ST_Y(p.location::geometry) AS lat, ST_X(p.location::geometry) AS lng,
            (pf.user_id IS NOT NULL) AS favorite
       FROM places p
       LEFT JOIN place_favorites pf ON pf.place_id=p.id AND pf.user_id=$1
       LEFT JOIN municipalities m ON m.ibge_code=p.municipality_ibge
      WHERE p.active ORDER BY p.name`, [u.id])).rows;
  const farms = (await pool.query(
    `SELECT id, name, state_code, address_reference, access_notes AS notes,
            ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng
       FROM farms WHERE owner_id=$1 AND location IS NOT NULL ORDER BY name`, [u.id])).rows;
  const recent = (await pool.query(
    `SELECT name, kind, lat, lng, max(used_at) AS last_used, count(*)::int AS uses FROM (
       SELECT r.dest_name AS name, r.dest_kind AS kind, ST_Y(r.dest::geometry) AS lat, ST_X(r.dest::geometry) AS lng, r.created_at AS used_at
         FROM transport_requests r
        WHERE r.producer_id=$1 OR r.id IN (SELECT request_id FROM transports WHERE transporter_id=$1)
     ) x GROUP BY name, kind, lat, lng ORDER BY max(used_at) DESC LIMIT 10`, [u.id])).rows;
  return { places, farms, recent, can_produce: u.roles.includes("producer") };
});
