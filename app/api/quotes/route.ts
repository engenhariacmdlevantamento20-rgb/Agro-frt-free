/* eslint-disable @typescript-eslint/no-explicit-any */
import { pool } from "@/lib/db";
import { requireAccess } from "@/lib/billing";
import { notify } from "@/lib/notify";
import { route, requireUser, body, HttpError, num, audit } from "@/lib/api";

export const POST = route(async (req: Request) => {
  const u = await requireUser("transporter");
  await requireAccess(u.id);
  const b = await body(req);
  const price = Math.round(num(b.price, 1, 10_000_000, "Informe um valor válido.") * 100);
  const r = await pool.query("SELECT producer_id, status FROM transport_requests WHERE id=$1", [b.request_id]);
  if (!r.rows[0] || r.rows[0].status !== "published") throw new HttpError(409, "Esta solicitação não recebe mais propostas.");
  if (r.rows[0].producer_id === u.id) throw new HttpError(400, "Você não pode enviar proposta para a própria solicitação.");
  if (b.truck_id) {
    const t = await pool.query("SELECT 1 FROM trucks WHERE id=$1 AND owner_id=$2", [b.truck_id, u.id]);
    if (!t.rowCount) throw new HttpError(400, "Caminhão inválido.");
  }
  const q = await pool.query(
    `INSERT INTO quotes(request_id,transporter_id,truck_id,price_cents,eta_note,note) VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (request_id, transporter_id) DO UPDATE
       SET truck_id=EXCLUDED.truck_id, price_cents=EXCLUDED.price_cents, eta_note=EXCLUDED.eta_note, note=EXCLUDED.note, status='pending'
     RETURNING id`, [b.request_id, u.id, b.truck_id || null, price, b.eta_note || null, b.note || null]);
  await audit(u.id, "quote_sent", { request: b.request_id });
  await notify(r.rows[0].producer_id, "new_quote", "Nova proposta recebida", `${u.name} enviou uma proposta`, `/painel/solicitacoes/${b.request_id}`);
  return { id: q.rows[0].id };
});
