import { pool } from "@/lib/db";
import { route, requireUser, HttpError, audit } from "@/lib/api";
import { sendWhatsApp, whatsappConfigured } from "@/lib/whatsapp";

export const GET = route(async () => {
  await requireUser("admin");
  return { configured: whatsappConfigured(), template: process.env.WHATSAPP_TEMPLATE || "atualizacao_agro_frete" };
});

// Envia uma mensagem de teste para o WhatsApp do próprio administrador (mostra o erro da Meta, se houver).
export const POST = route(async () => {
  const a = await requireUser("admin");
  if (!whatsappConfigured()) throw new HttpError(400, "Faltam WHATSAPP_TOKEN e WHATSAPP_PHONE_NUMBER_ID no Netlify.");
  const phone = (await pool.query("SELECT phone FROM users WHERE id=$1", [a.id])).rows[0]?.phone;
  if (!phone) throw new HttpError(400, "Sua conta não tem WhatsApp cadastrado.");
  const r = await sendWhatsApp(phone, "Teste do Agro Frete", "Se você recebeu esta mensagem, o envio automático está funcionando.", "/painel");
  await audit(a.id, "whatsapp_test", { ok: r.ok });
  if (!r.ok) throw new HttpError(502, `A Meta recusou o envio. ${r.error}`);
  return { ok: true, to: phone };
});
