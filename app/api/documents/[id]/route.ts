import { pool } from "@/lib/db";
import { route, requireUser, body, HttpError, audit } from "@/lib/api";
import { notify } from "@/lib/notify";
import { getStore } from "@netlify/blobs";

async function load(userId: string, id: string) {
  const { rows } = await pool.query(
    `SELECT d.*, t.producer_id, t.transporter_id FROM documents d JOIN transports t ON t.id=d.transport_id
      WHERE d.id=$1 AND (t.producer_id=$2 OR t.transporter_id=$2)`, [id, userId]);
  if (!rows[0]) throw new HttpError(404, "Documento não encontrado.");
  return rows[0];
}

// Download protegido: só os dois participantes do transporte.
export const GET = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await requireUser();
  const d = await load(u.id, (await ctx.params).id);
  const content = await getStore({ name: "transport-documents", consistency: "strong" }).get(d.blob_key, { type: "arrayBuffer" });
  if (!content) throw new HttpError(404, "Arquivo não encontrado.");
  return new Response(content, {
    headers: { "Content-Type": d.mime, "Content-Disposition": `inline; filename="${encodeURIComponent(d.filename)}"`, "Cache-Control": "private, no-store" },
  });
});

// Quem NÃO enviou o documento pode aprová-lo ou rejeitá-lo.
export const PUT = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await requireUser();
  const d = await load(u.id, (await ctx.params).id);
  const b = await body(req);
  if (d.uploader_id === u.id) throw new HttpError(403, "Quem enviou não pode aprovar o próprio documento.");
  if (!["in_review", "approved", "rejected"].includes(b.status)) throw new HttpError(400, "Status inválido.");
  await pool.query("UPDATE documents SET status=$2 WHERE id=$1", [d.id, b.status]);
  await audit(u.id, "document_status", { id: d.id, status: b.status });
  await notify(d.uploader_id, "document", b.status === "rejected" ? "Documento rejeitado" : "Documento atualizado", d.kind, `/painel/transportes/${d.transport_id}`);
  return { ok: true };
});
