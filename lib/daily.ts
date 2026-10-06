import { pool } from "./db";
import { notify } from "./notify";

export async function runDailyMaintenance() {
  let sent = 0;
  const trial = await pool.query(
    `SELECT s.user_id FROM subscriptions s WHERE s.status='trial' AND s.trial_ends_at BETWEEN now() AND now()+interval '3 days'
     AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.user_id=s.user_id AND n.kind='trial_ending')`);
  for (const row of trial.rows) {
    await notify(row.user_id, "trial_ending", "Seu teste grátis está acabando", "Veja os planos em Conta > Plano.", "/painel/plano");
    sent++;
  }
  await pool.query("UPDATE subscriptions SET status='expired' WHERE status='trial' AND trial_ends_at<now()");
  const documents = await pool.query(
    `SELECT d.id,d.kind,d.uploader_id,d.transport_id FROM documents d JOIN transports t ON t.id=d.transport_id
     WHERE d.valid_until BETWEEN current_date AND current_date+7 AND t.status NOT IN ('completed','cancelled')
     AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.user_id=d.uploader_id AND n.kind='doc_expiring' AND n.url LIKE '%'||d.transport_id::text||'%' AND n.body=d.kind)`);
  for (const document of documents.rows) {
    await notify(document.uploader_id, "doc_expiring", "Documento perto de vencer", document.kind, `/painel/transportes/${document.transport_id}`);
    sent++;
  }
  await pool.query("UPDATE documents SET status='expired' WHERE valid_until<current_date AND status NOT IN ('expired','rejected')");
  const days = Number((await pool.query("SELECT value FROM system_settings WHERE key='tracking_retention_days'")).rows[0]?.value ?? 90);
  const deleted = await pool.query("DELETE FROM tracking_points WHERE recorded_at<now()-make_interval(days=>$1::int)", [days]);
  return { notifications: sent, tracking_points_deleted: deleted.rowCount };
}
