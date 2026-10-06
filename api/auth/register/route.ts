import { NextResponse } from "next/server";
import { pool, explainDbError } from "@/lib/db";
import { clientIp, normalizePhone } from "@/lib/auth";

// Conferência antes do cadastro no Netlify Identity: valida os dados e aplica os limites contra abuso.
// A conta em si é criada pelo Identity no navegador; o perfil no banco nasce no primeiro acesso.
export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Dados inválidos." }, { status: 400 }); }

  const name = String(b.name ?? "").trim();
  const email = String(b.email ?? "").trim().toLowerCase();
  const phone = normalizePhone(String(b.phone ?? ""));
  const role = b.role === "transporter" ? "transporter" : b.role === "producer" ? "producer" : null;

  if (name.length < 3) return NextResponse.json({ error: "Informe seu nome completo." }, { status: 400 });
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
  if (!phone) return NextResponse.json({ error: "Informe o WhatsApp com DDD." }, { status: 400 });
  if (!role) return NextResponse.json({ error: "Escolha se você é produtor ou transportador." }, { status: 400 });
  if (b.consent !== true) return NextResponse.json({ error: "É preciso aceitar os termos e a política de privacidade." }, { status: 400 });

  const ip = clientIp(req);
  try {
    const lim = await pool.query(
      `SELECT (SELECT count(*)::int FROM users WHERE phone=$1 AND status<>'deleted') AS same_phone,
              (SELECT count(*)::int FROM users WHERE $3<>'' AND email=$3) AS same_email,
              (SELECT count(*)::int FROM audit_logs WHERE action='register' AND ip=$2 AND created_at > now() - interval '1 hour') AS by_ip`, [phone, ip, email]);
    const l = lim.rows[0];
    if (l.same_email) return NextResponse.json({ error: "Este e-mail já tem cadastro. Use Entrar." }, { status: 409 });
    // WhatsApp único por conta, para que ele possa ser usado no login
    if (l.same_phone) return NextResponse.json({ error: "Este WhatsApp já tem cadastro. Use Entrar." }, { status: 409 });
    if (ip && l.by_ip >= 5) return NextResponse.json({ error: "Muitos cadastros deste aparelho/rede. Tente mais tarde." }, { status: 429 });
  } catch (e) {
    const x = explainDbError(e); console.error("register precheck", e);
    return NextResponse.json({ error: `${x.message} (código: ${x.code})` }, { status: 500 });
  }
  return NextResponse.json({ ok: true, phone });
}
