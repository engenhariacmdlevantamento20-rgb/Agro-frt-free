import { pool } from "@/lib/db";
import { route, requireUser, body, HttpError, lat, lng } from "@/lib/api";
import { legDistance } from "@/lib/routing";

// Quilometragem de um transporte do ponto de vista do motorista: de onde ele está (ou vai estar) até o embarque,
// do embarque ao desembarque (rota que o produtor publicou) e, se pedido, a volta até o ponto de partida.
export const POST = route(async (req: Request) => {
  const u = await requireUser("transporter");
  const b = await body(req);
  const id = String(b.request_id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(400, "Solicitação inválida.");
  const from = { lat: lat(b.from?.lat), lng: lng(b.from?.lng) };
  const r = (await pool.query(
    `SELECT r.status, r.producer_id,
            ST_Y(r.origin::geometry) AS o_lat, ST_X(r.origin::geometry) AS o_lng, ST_Y(r.dest::geometry) AS d_lat, ST_X(r.dest::geometry) AS d_lng,
            rt.distance_m, rt.duration_s, rt.paved_m, rt.unpaved_m,
            (EXISTS(SELECT 1 FROM quotes q WHERE q.request_id=r.id AND q.transporter_id=$2)
              OR EXISTS(SELECT 1 FROM transports t WHERE t.request_id=r.id AND t.transporter_id=$2)) AS mine
       FROM transport_requests r LEFT JOIN routes rt ON rt.id=r.route_id WHERE r.id=$1`, [id, u.id])).rows[0];
  if (!r || (r.status !== "published" && !r.mine) || r.producer_id === u.id) throw new HttpError(404, "Solicitação não encontrada.");
  const o = { lat: r.o_lat, lng: r.o_lng }, d = { lat: r.d_lat, lng: r.d_lng };
  const [toPickup, back, loadedFallback] = await Promise.all([
    legDistance(from, o),
    b.include_back ? legDistance(d, from) : Promise.resolve(null),
    r.distance_m ? Promise.resolve(null) : legDistance(o, d),
  ]);
  const loaded = r.distance_m
    ? { distance_m: r.distance_m, duration_s: r.duration_s, estimate: false, paved_m: r.paved_m, unpaved_m: r.unpaved_m }
    : loadedFallback!;
  const total_m = toPickup.distance_m + loaded.distance_m + (back?.distance_m ?? 0);
  return { to_pickup: toPickup, loaded, back, total_m, any_estimate: toPickup.estimate || !!back?.estimate || loaded.estimate };
});
