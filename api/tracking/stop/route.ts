import { pool } from "@/lib/db";
import { route, requireUser, body, transportFor, HttpError } from "@/lib/api";

export const POST = route(async (req: Request) => {
  const u = await requireUser();
  const b = await body(req);
  const t = await transportFor(u.id, String(b.transport_id));
  if (t.transporter_id !== u.id) throw new HttpError(403, "Sem permissão.");
  await pool.query("UPDATE transports SET tracking_active=false WHERE id=$1", [t.id]);
  return { ok: true };
});
