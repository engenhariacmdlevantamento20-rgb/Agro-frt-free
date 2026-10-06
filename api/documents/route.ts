import { pool } from "@/lib/db";
import { route, requireUser, transportFor, HttpError, audit } from "@/lib/api";
import { notify } from "@/lib/notify";

const MAX = 5 * 1024 * 1024;
const MIMES = ["application/pdf", "image/jpeg", "image/png"];

export const POST = route(async (req: Request) => {
  const u = await requireUser();
  const f = await req.formData();
  const t = await transportFor(u.id, String(f.get("transport_id")));
  const file = f.get("file");
  if (!(file instanceof File) || !file.size) throw new HttpError(400, "Escolha um arquivo.");
  if (file.size > MAX) throw new HttpError(400, "Arquivo maior que 5 MB.");
  if (!MIMES.includes(file.type)) throw new HttpError(400, "Envie PDF, JPG ou PNG.");
  const kind = String(f.get("kind") ?? "").trim();
  if (!kind) throw new HttpError(400, "Informe o tipo do documento (ex.: GTA, Nota Fiscal).");
  const r = await pool.query(
    `INSERT INTO documents(transport_id,uploader_id,kind,number,issued_on,valid_until,note,filename,mime,size,content)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [t.id, u.id, kind.slice(0, 60), f.get("number") || null, f.get("issued_on") || null, f.get("valid_until") || null,
     f.get("note") || null, file.name.slice(0, 120), file.type, file.size, Buffer.from(await file.arrayBuffer())]);
  await audit(u.id, "document_uploaded", { transport: t.id, kind });
  await notify(t.producer_id === u.id ? t.transporter_id : t.producer_id, "document", "Novo documento enviado", kind, `/painel/transportes/${t.id}`);
  return { id: r.rows[0].id };
});
