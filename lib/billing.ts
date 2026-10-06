import { pool } from "./db";
import { HttpError } from "./api";

export async function billingInfo() {
  const result = await pool.query("SELECT key,value FROM system_settings WHERE key IN ('pix_key','pix_name','admin_whatsapp')");
  const settings = Object.fromEntries(result.rows.map((row) => [row.key, row.value]));
  return { pix_key: String(settings.pix_key ?? ""), pix_name: String(settings.pix_name ?? ""), admin_whatsapp: String(settings.admin_whatsapp ?? process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "") };
}

export async function isBlocked(userId: string, roles?: string[]) {
  const userRoles = roles ?? (await pool.query("SELECT role FROM user_roles WHERE user_id=$1", [userId])).rows.map((row) => String(row.role));
  if (userRoles.includes("admin")) return false;
  const enabled = (await pool.query("SELECT value FROM system_settings WHERE key='enforce_paywall'")).rows[0]?.value;
  if (enabled !== true) return false;
  const result = await pool.query(
    "SELECT 1 FROM subscriptions WHERE user_id=$1 AND ((status='trial' AND trial_ends_at>now()) OR (status='active' AND (current_period_end IS NULL OR current_period_end>now())))", [userId]);
  return !result.rowCount;
}

export async function requireAccess(userId: string) {
  if (await isBlocked(userId)) throw new HttpError(402, "Seu período de teste terminou. Ative um plano para continuar.");
}

export async function activatePlan(userId: string, planId: number, requestedDays?: number) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const user = await client.query("SELECT id FROM users WHERE id=$1 AND status='active' FOR UPDATE", [userId]);
    if (!user.rowCount) throw new HttpError(404, "Usuário não encontrado.");
    const plan = (await client.query("SELECT * FROM plans WHERE id=$1 AND active", [planId])).rows[0];
    if (!plan) throw new HttpError(404, "Plano não encontrado.");
    const days = requestedDays ?? Number(plan.interval_days);
    const subscription = await client.query(
      `INSERT INTO subscriptions(user_id,plan_id,status,current_period_end) VALUES ($1,$2,'active',now()+make_interval(days=>$3::int))
       ON CONFLICT (user_id) DO UPDATE SET plan_id=EXCLUDED.plan_id,status='active',current_period_end=GREATEST(now(),subscriptions.current_period_end)+make_interval(days=>$3::int) RETURNING id`, [userId, planId, days]);
    await client.query("INSERT INTO payments(user_id,subscription_id,amount_cents,status,provider) VALUES ($1,$2,$3,'paid','manual')", [userId, subscription.rows[0].id, plan.price_cents]);
    await client.query("COMMIT");
    return { plan, days };
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}
