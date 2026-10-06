import { route, requireUser, body, num, audit } from "@/lib/api";
import { activatePlan } from "@/lib/billing";

// Ativação manual (sem gateway de pagamento): registra o pagamento recebido por fora e libera o plano.
export const POST = route(async (req: Request) => {
  const a = await requireUser("admin");
  const b = await body(req);
  const days = b.days ? num(b.days, 1, 3650, "Dias inválidos.") : undefined;
  const r = await activatePlan(String(b.user_id), Number(b.plan_id), days);
  await audit(a.id, "subscription_activated", { user: b.user_id, plan: r.plan.id, days: r.days });
  return { ok: true };
});
