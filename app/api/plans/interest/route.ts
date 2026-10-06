import { pool } from "@/lib/db";
import { route, requireUser, body, HttpError, audit } from "@/lib/api";
import { notify } from "@/lib/notify";
import { billingInfo } from "@/lib/billing";
import { brl } from "@/lib/client";

// "Quero este plano": registra o pedido, avisa os administradores no app e devolve a mensagem pronta para o WhatsApp.
export const POST = route(async (req: Request) => {
  const u = await requireUser();
  const b = await body(req);
  const plan = (await pool.query("SELECT id, name, price_cents, interval_days FROM plans WHERE id=$1 AND active", [Number(b.plan_id)])).rows[0];
  if (!plan) throw new HttpError(404, "Plano não encontrado.");

  const existing = await pool.query("SELECT id FROM plan_requests WHERE user_id=$1 AND plan_id=$2 AND status='pending'", [u.id, plan.id]);
  if (!existing.rowCount) {
    await pool.query("INSERT INTO plan_requests(user_id, plan_id) VALUES ($1,$2)", [u.id, plan.id]);
    await audit(u.id, "plan_interest", { plan: plan.id });
    const admins = await pool.query("SELECT user_id FROM user_roles r JOIN users us ON us.id=r.user_id WHERE r.role='admin' AND us.status='active'");
    for (const a of admins.rows)
      await notify(a.user_id, "plan_interest", "Novo interesse em plano", `${u.name} quer o plano ${plan.name}. WhatsApp ${u.phone || "não informado"}.`, "/painel/admin#pedidos");
  }

  const info = await billingInfo();
  const preco = plan.price_cents > 0 ? ` (${brl(plan.price_cents)} a cada ${plan.interval_days} dias)` : "";
  const message = `Olá! Sou ${u.name}${u.phone ? ` (WhatsApp ${u.phone})` : ""} e quero ativar o plano ${plan.name}${preco} no Agro Frete.`
    + (info.pix_key ? " Vou fazer o PIX e envio o comprovante por aqui." : " Como faço o pagamento?");
  return { ok: true, whatsapp: info.admin_whatsapp, message };
});
