import { pool } from "@/lib/db";
import { route, requireUser, HttpError, audit } from "@/lib/api";
import { notify } from "@/lib/notify";

export const POST = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await requireUser("producer");
  const { id } = await ctx.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const q = await client.query(
      `SELECT q.*, r.producer_id, r.status AS req_status FROM quotes q JOIN transport_requests r ON r.id=q.request_id
        WHERE q.id=$1 FOR UPDATE OF r`, [id]);
    const x = q.rows[0];
    if (!x || x.producer_id !== u.id) throw new HttpError(404, "Proposta não encontrada.");
    if (x.req_status !== "published" || x.status !== "pending") throw new HttpError(409, "Esta proposta não pode mais ser aceita.");
    await client.query("UPDATE quotes SET status = CASE WHEN id=$1 THEN 'accepted' ELSE 'rejected' END WHERE request_id=$2 AND status='pending'", [id, x.request_id]);
    await client.query("UPDATE transport_requests SET status='awarded' WHERE id=$1", [x.request_id]);
    const t = await client.query(
      "INSERT INTO transports(request_id,quote_id,producer_id,transporter_id,truck_id) VALUES ($1,$2,$3,$4,$5) RETURNING id",
      [x.request_id, id, u.id, x.transporter_id, x.truck_id]);
    await client.query("INSERT INTO transport_events(transport_id,status,user_id) VALUES ($1,'documentation',$2)", [t.rows[0].id, u.id]);
    await client.query("COMMIT");
    await audit(u.id, "quote_accepted", { quote: id });
    await notify(x.transporter_id, "quote_accepted", "Sua proposta foi aceita", "Veja os detalhes e combine o embarque.", `/painel/transportes/${t.rows[0].id}`);
    return { transport_id: t.rows[0].id };
  } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
});
