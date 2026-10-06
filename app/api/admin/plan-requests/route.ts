import { pool } from "@/lib/db";
import { route, requireUser, body, num, HttpError, audit } from "@/lib/api";
import { activatePlan } from "@/lib/billing";
import { notify } from "@/lib/notify";

// Pedidos de plano aguardando confirmação do pagamento
export const GET = route(async () => {
  await requireUser("admin");
  const { rows } = await pool.query(
    `SELECT pr.id, pr.created_at, pr.user_id, us.name AS user_name, us.phone, p.id AS plan_id, p.name AS plan_name, p.price_cents, p.interval_days
       FROM plan_requests pr JOIN users us ON us.id=pr.user_id JOIN plans p ON p.id=pr.plan_id
      WHERE pr.status='pending' ORDER BY pr.created_at`);
  return rows;
});

// Confirmar pagamento (ativa o plano) ou descartar o pedido
export const PUT = route(async (req: Request) => {
  const a = await requireUser("admin");
  const b = await body(req);
  const pr = (await pool.query("SELECT * FROM plan_requests WHERE id=$1 AND status='pending'", [String(b.id)])).rows[0];
  if (!pr) throw new HttpError(404, "Pedido não encontrado ou já resolvido.");
  if (b.action === "cancel") {
    await pool.query("UPDATE plan_requests SET status='cancelled', decided_at=now(), decided_by=$2 WHERE id=$1", [pr.id, a.id]);
    await audit(a.id, "plan_request_cancelled", { id: pr.id });
    return { ok: true };
  }
  if (b.action !== "confirm") throw new HttpError(400, "Ação inválida.");
  const days = b.days ? num(b.days, 1, 3650, "Dias inválidos.") : undefined;
  const r = await activatePlan(pr.user_id, pr.plan_id, days);
  await pool.query("UPDATE plan_requests SET status='confirmed', decided_at=now(), decided_by=$2 WHERE id=$1", [pr.id, a.id]);
  // Outros pedidos pendentes do mesmo usuário ficam resolvidos junto
  await pool.query("UPDATE plan_requests SET status='cancelled', decided_at=now(), decided_by=$2 WHERE user_id=$1 AND status='pending'", [pr.user_id, a.id]);
  await audit(a.id, "subscription_activated", { user: pr.user_id, plan: pr.plan_id, days: r.days, request: pr.id });
  await notify(pr.user_id, "plan_active", "Pagamento confirmado!", `Seu plano está ativo por ${r.days} dias.`, "/painel");
  return { ok: true };
});
