import { pool } from "@/lib/db";
import { route, requireUser, body, audit, HttpError } from "@/lib/api";
import { deleteIdentityUser, normalizePhone } from "@/lib/auth";
import { isPhoneEmail } from "@/lib/pure";
import { whatsappConfigured } from "@/lib/whatsapp";

export const GET = route(async () => {
  const u = await requireUser();
  const r = await pool.query("SELECT share_phone, whatsapp_alerts FROM users WHERE id=$1", [u.id]);
  const semEmail = isPhoneEmail(u.email);
  return { id: u.id, name: u.name, email: semEmail ? "" : u.email, has_email: !semEmail, phone: u.phone, roles: u.roles, share_phone: r.rows[0].share_phone, whatsapp_alerts: r.rows[0].whatsapp_alerts, whatsapp_available: whatsappConfigured() };
});

// Editar dados pessoais (nome, WhatsApp) e a privacidade do WhatsApp. E-mail e senha são trocados no Netlify Identity.
export const PUT = route(async (req: Request) => {
  const u = await requireUser();
  const b = await body(req);
  const sets: string[] = [];
  const vals: unknown[] = [u.id];
  if (b.name !== undefined) {
    const name = String(b.name).trim();
    if (name.length < 3 || name.length > 120) throw new HttpError(400, "Informe seu nome completo.");
    vals.push(name); sets.push(`name=$${vals.length}`);
  }
  if (b.phone !== undefined) {
    const phone = normalizePhone(String(b.phone));
    if (!phone) throw new HttpError(400, "WhatsApp inválido. Use o número com DDD.");
    if (phone !== u.phone) {
      const dup = await pool.query("SELECT 1 FROM users WHERE phone=$1 AND id<>$2 AND status<>'deleted'", [phone, u.id]);
      if (dup.rowCount) throw new HttpError(409, "Este WhatsApp já está em outra conta.");
      // Conta só com WhatsApp entra pelo número: o login acha o e-mail interno pelo telefone salvo aqui.
      vals.push(phone); sets.push(`phone=$${vals.length}`);
    }
  }
  if (b.share_phone !== undefined) { vals.push(b.share_phone === true); sets.push(`share_phone=$${vals.length}`); }
  if (b.whatsapp_alerts !== undefined) { vals.push(b.whatsapp_alerts === true); sets.push(`whatsapp_alerts=$${vals.length}`); await audit(u.id, "whatsapp_alerts", { on: b.whatsapp_alerts === true }); }
  if (!sets.length) return { ok: true };
  await pool.query(`UPDATE users SET ${sets.join(", ")} WHERE id=$1`, vals);
  if (b.name !== undefined || b.phone !== undefined) await audit(u.id, "profile_updated", { fields: Object.keys(b).filter((k) => k !== "share_phone" && k !== "whatsapp_alerts") });
  return { ok: true };
});

// LGPD: exclusão da conta. Dados pessoais são apagados; transportes concluídos ficam, anonimizados, para o histórico da outra parte.
export const DELETE = route(async () => {
  const u = await requireUser();
  await audit(u.id, "account_deleted");
  await pool.query(
    "UPDATE users SET status='deleted', name='Usuário removido', email=('removido-' || id || '@invalid')::citext, phone='' WHERE id=$1", [u.id]);
  await pool.query("DELETE FROM push_subscriptions WHERE user_id=$1", [u.id]);
  await pool.query("DELETE FROM favorites WHERE user_id=$1 OR favorite_id=$1", [u.id]);
  await deleteIdentityUser(u.id); // o navegador encerra a sessão em seguida
  return { ok: true };
});
