import { pool } from "@/lib/db";
import { route, requireUser, body, transportFor, HttpError, audit } from "@/lib/api";
import { FLOW, STATUS_LABEL } from "@/lib/flow";
import { notify } from "@/lib/notify";

export const PUT = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await requireUser();
  const { id } = await ctx.params;
  const t = await transportFor(u.id, id);
  const b = await body(req);
  const to = String(b.status ?? "");
  const isTransporter = t.transporter_id === u.id;

  if (to === "cancelled") {
    if (["completed", "cancelled"].includes(t.status)) throw new HttpError(409, "Este transporte já foi encerrado.");
    await pool.query("UPDATE transports SET status='cancelled', tracking_active=false, cancel_reason=$2 WHERE id=$1", [id, String(b.reason ?? "").slice(0, 300) || null]);
  } else {
    const step = FLOW[t.status];
    if (!step || step.to !== to) throw new HttpError(409, "Este passo não é permitido agora.");
    if (step.who === "transporter" && !isTransporter) throw new HttpError(403, "Só o transportador pode fazer este passo.");
    await pool.query(
      `UPDATE transports SET status=$2,
         started_at = CASE WHEN $2='in_transit' AND started_at IS NULL THEN now() ELSE started_at END,
         completed_at = CASE WHEN $2='completed' THEN now() ELSE completed_at END,
         tracking_active = CASE WHEN $2='completed' THEN false ELSE tracking_active END
       WHERE id=$1`, [id, to]);
  }
  await pool.query("INSERT INTO transport_events(transport_id,status,user_id) VALUES ($1,$2,$3)", [id, to, u.id]);
  await audit(u.id, "transport_status", { id, to });
  const rq = (await pool.query("SELECT origin_name, dest_name FROM transport_requests WHERE id=$1", [t.request_id])).rows[0];
  await notify(isTransporter ? t.producer_id : t.transporter_id, "status", `Transporte: ${STATUS_LABEL[to]}`, rq ? `${rq.origin_name} → ${rq.dest_name}` : undefined, `/painel/transportes/${id}`);
  return { ok: true };
});
