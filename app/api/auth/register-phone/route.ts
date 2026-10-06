import { NextResponse } from "next/server";
import { admin, login, verifyRequestOrigin } from "@netlify/identity";
import { pool } from "@/lib/db";
import { clientIp, normalizePhone, TERMS_VERSION } from "@/lib/auth";
import { phoneEmail } from "@/lib/pure";

// Cadastro só com WhatsApp (sem e-mail). A conta é criada já confirmada no Netlify Identity e a pessoa entra na hora.
// As validações e limites vêm de /api/auth/register, chamado antes pelo navegador; aqui elas são repetidas.
export async function POST(req: Request) {
  try { verifyRequestOrigin(req); } catch { return NextResponse.json({ error: "Origem não permitida." }, { status: 403 }); }
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Dados inválidos." }, { status: 400 }); }
  const name = String(b.name ?? "").trim();
  const phone = normalizePhone(String(b.phone ?? ""));
  const password = String(b.password ?? "");
  const role = b.role === "transporter" ? "transporter" : b.role === "producer" ? "producer" : null;
  if (name.length < 3 || !phone || !role || b.consent !== true) return NextResponse.json({ error: "Preencha todos os campos." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "A senha precisa ter pelo menos 8 caracteres." }, { status: 400 });

  const ip = clientIp(req);
  const lim = await pool.query(
    `SELECT (SELECT count(*)::int FROM users WHERE phone=$1 AND status<>'deleted') AS same_phone,
            (SELECT count(*)::int FROM audit_logs WHERE action='register' AND ip=$2 AND created_at > now() - interval '1 hour') AS by_ip`, [phone, ip]);
  if (lim.rows[0].same_phone) return NextResponse.json({ error: "Este WhatsApp já tem cadastro. Use Entrar." }, { status: 409 });
  if (ip && lim.rows[0].by_ip >= 5) return NextResponse.json({ error: "Muitos cadastros deste aparelho/rede. Tente mais tarde." }, { status: 429 });

  const email = phoneEmail(phone);
  try {
    await admin.createUser({ email, password, data: { user_metadata: { full_name: name, phone, role, consent_version: TERMS_VERSION } } });
  } catch (e) {
    console.error("Phone registration failed.");
    return NextResponse.json({ error: "Não foi possível criar a conta. Este WhatsApp pode já estar cadastrado; tente Entrar." }, { status: 409 });
  }
  try { await login(email, password); } catch (e) {
    console.error("Login after registration failed.");
    return NextResponse.json({ ok: true, login: false });
  }
  return NextResponse.json({ ok: true, login: true });
}
