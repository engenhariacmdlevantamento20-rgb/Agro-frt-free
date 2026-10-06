import { pool } from "@/lib/db";
import { route, requireUser, body, transportFor, HttpError, lat, lng, pt } from "@/lib/api";

export const POST = route(async (req: Request) => {
  const u = await requireUser();
  const b = await body(req);
  const t = await transportFor(u.id, String(b.transport_id));
  if (t.transporter_id !== u.id || !t.tracking_active) throw new HttpError(409, "Rastreamento não está ativo.");
  const speed = Number.isFinite(Number(b.speed_kmh)) ? Number(b.speed_kmh) : null;
  // recorded_at vem do aparelho quando a posição ficou na fila sem sinal; aceita só as últimas 24 h
  const at = new Date(String(b.recorded_at ?? ""));
  const when = Number.isFinite(at.getTime()) && Date.now() - at.getTime() < 86400_000 && at.getTime() <= Date.now() + 60_000 ? at : new Date();
  await pool.query(`INSERT INTO tracking_points(transport_id, location, speed_kmh, recorded_at) VALUES ($1, ${pt(2, 3)}, $4, $5)`, [t.id, lng(b.lng), lat(b.lat), speed, when]);
  return { ok: true };
});
