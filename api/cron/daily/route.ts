import { pool } from "@/lib/db";
import { route, HttpError } from "@/lib/api";
import { notify } from "@/lib/notify";

// Chamar 1x por dia: /api/cron/daily?secret=CRON_SECRET (ex.: cron-job.org, gratuito).
export const GET = route(async (req: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || new URL(req.url).searchParams.get("secret") !== secret) throw new HttpError(401, "Não autorizado.");
  let sent = 0;

  // Teste grátis: avisa quando faltam 3 dias (uma vez)
  const trial = await pool.query(
    `SELECT s.user_id FROM subscriptions s WHERE s.status='trial' AND s.trial_ends_at BETWEEN now() AND now() + interval '3 days'
       AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.user_id=s.user_id AND n.kind='trial_ending')`);
  for (const r of trial.rows) { await notify(r.user_id, "trial_ending", "Seu teste grátis está acabando", "Veja os planos em Conta > Plano.", "/painel/plano"); sent++; }
  await pool.query("UPDATE subscriptions SET status='expired' WHERE status='trial' AND trial_ends_at < now()");

  // Documentos que vencem em até 7 dias
  const docs = await pool.query(
    `SELECT d.id, d.kind, d.uploader_id, d.transport_id FROM documents d JOIN transports t ON t.id=d.transport_id
      WHERE d.valid_until BETWEEN current_date AND current_date + 7 AND t.status NOT IN ('completed','cancelled')
        AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.user_id=d.uploader_id AND n.kind='doc_expiring' AND n.url LIKE '%' || d.transport_id::text || '%' AND n.body=d.kind)`);
  for (const d of docs.rows) { await notify(d.uploader_id, "doc_expiring", "Documento perto de vencer", d.kind, `/painel/transportes/${d.transport_id}`); sent++; }
  await pool.query("UPDATE documents SET status='expired' WHERE valid_until < current_date AND status NOT IN ('expired','rejected')");

  // Retenção da localização (política configurável)
  const days = Number((await pool.query("SELECT value FROM system_settings WHERE key='tracking_retention_days'")).rows[0]?.value ?? 90);
  const del = await pool.query("DELETE FROM tracking_points WHERE recorded_at < now() - make_interval(days => $1::int)", [days]);
  return { notifications: sent, tracking_points_deleted: del.rowCount };
});
