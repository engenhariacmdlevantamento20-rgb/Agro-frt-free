import { pool } from "@/lib/db";
import { route, requireUser } from "@/lib/api";
import { getOrsKey } from "@/lib/settings";

export const GET = route(async () => {
  await requireUser("admin");
  const q = async (sql: string) => Number((await pool.query(sql)).rows[0].n);
  const settings = (await pool.query("SELECT key, value FROM system_settings ORDER BY key")).rows;
  return {
    users: await q("SELECT count(*)::int n FROM users"),
    producers: await q("SELECT count(*)::int n FROM user_roles WHERE role='producer'"),
    transporters: await q("SELECT count(*)::int n FROM user_roles WHERE role='transporter'"),
    trucks: await q("SELECT count(*)::int n FROM trucks WHERE active"),
    farms: await q("SELECT count(*)::int n FROM farms"),
    requests_open: await q("SELECT count(*)::int n FROM transport_requests WHERE status='published'"),
    transports_active: await q("SELECT count(*)::int n FROM transports WHERE status NOT IN ('completed','cancelled')"),
    transports_done: await q("SELECT count(*)::int n FROM transports WHERE status='completed'"),
    transports_cancelled: await q("SELECT count(*)::int n FROM transports WHERE status='cancelled'"),
    ratings: await q("SELECT count(*)::int n FROM ratings"),
    in_trial: await q("SELECT count(*)::int n FROM subscriptions WHERE status='trial' AND trial_ends_at > now()"),
    new_users_30d: await q("SELECT count(*)::int n FROM users WHERE created_at > now() - interval '30 days'"),
    quotes_30d: await q("SELECT count(*)::int n FROM quotes WHERE created_at > now() - interval '30 days'"),
    active_subs: await q("SELECT count(*)::int n FROM subscriptions WHERE status='active' AND (current_period_end IS NULL OR current_period_end > now())"),
    revenue_cents: await q("SELECT COALESCE(sum(amount_cents),0)::int n FROM payments WHERE status='paid'"),
    municipalities: (await pool.query("SELECT o.state_code AS uf, count(*)::int AS n FROM farms o GROUP BY 1 ORDER BY 2 DESC")).rows,
    by_cargo: (await pool.query("SELECT ct.name, count(r.id)::int AS n FROM cargo_types ct LEFT JOIN transport_requests r ON r.cargo_type=ct.code GROUP BY ct.name, ct.sort ORDER BY ct.sort")).rows,
    ors_configured: !!(await getOrsKey()),
    settings: settings.filter((x: { key: string }) => x.key !== "ors_api_key"),
  };
});
