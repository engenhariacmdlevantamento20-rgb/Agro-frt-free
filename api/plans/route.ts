import { pool } from "@/lib/db";
import { route, requireUser } from "@/lib/api";
import { billingInfo, isBlocked } from "@/lib/billing";

export const GET = route(async () => {
  const u = await requireUser();
  const [plans, sub, pay, reqs, info, blocked] = await Promise.all([
    pool.query("SELECT id, code, name, price_cents, interval_days, features, limits FROM plans WHERE active ORDER BY price_cents, id"),
    pool.query("SELECT s.status, s.trial_ends_at, s.current_period_end, p.name AS plan_name FROM subscriptions s LEFT JOIN plans p ON p.id=s.plan_id WHERE s.user_id=$1 ORDER BY s.created_at DESC LIMIT 1", [u.id]),
    pool.query("SELECT amount_cents, status, provider, created_at FROM payments WHERE user_id=$1 ORDER BY created_at DESC LIMIT 10", [u.id]),
    pool.query("SELECT plan_id, created_at FROM plan_requests WHERE user_id=$1 AND status='pending' ORDER BY created_at DESC", [u.id]),
    billingInfo(),
    isBlocked(u.id, u.roles),
  ]);
  return { plans: plans.rows, subscription: sub.rows[0] ?? null, payments: pay.rows, pending: reqs.rows, ...info, blocked };
});
