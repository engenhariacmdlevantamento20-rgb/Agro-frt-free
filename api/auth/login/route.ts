import { NextResponse } from "next/server";
import { login, verifyRequestOrigin, AuthError } from "@netlify/identity";
import { pool } from "@/lib/db";
import { clientIp, normalizePhone } from "@/lib/auth";
import { phoneEmail } from "@/lib/pure";

const FAIL = "E-mail/WhatsApp ou senha incorretos (ou e-mail ainda não confirmado).";

// Entrar com e-mail OU WhatsApp. O login é feito no Netlify Identity, aqui no servidor (que grava o cookie).
export async function POST(req: Request) {
  try { verifyRequestOrigin(req); } catch { return NextResponse.json({ error: "Origem não permitida." }, { status: 403 }); }
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Dados inválidos." }, { status: 400 }); }
  const id = String(b.identifier ?? "").trim();
  const password = String(b.password ?? "");
  if (!id || !password) return NextResponse.json({ error: "Informe e-mail ou WhatsApp e a senha." }, { status: 400 });
  const ip = clientIp(req);

  // Limite simples contra tentativa em massa: 8 falhas em 15 min por login ou IP
  const f = await pool.query(
    `SELECT count(*)::int AS n FROM audit_logs WHERE action='login_failed' AND created_at > now() - interval '15 minutes'
        AND (meta->>'login'=$1 OR ip=$2)`, [id.toLowerCase(), ip]);
  if (f.rows[0].n >= 8) return NextResponse.json({ error: "Muitas tentativas. Aguarde 15 minutos." }, { status: 429 });

  let email = id.toLowerCase();
  if (!id.includes("@")) {
    const phone = normalizePhone(id);
    if (!phone) return NextResponse.json({ error: "WhatsApp inválido. Use o número com DDD." }, { status: 400 });
    const r = await pool.query("SELECT email FROM users WHERE phone=$1 AND status='active' ORDER BY created_at LIMIT 2", [phone]);
    if (r.rowCount! > 1) return NextResponse.json({ error: "Este WhatsApp está em mais de uma conta. Entre com o e-mail." }, { status: 409 });
    email = r.rows[0]?.email ?? phoneEmail(phone);
  }

  try {
    await login(email, password);
  } catch (e) {
    await pool.query("INSERT INTO audit_logs(action, ip, meta) VALUES ('login_failed',$1,$2)", [ip, JSON.stringify({ login: id.toLowerCase() })]);
    if (!(e instanceof AuthError)) console.error("login", e);
    return NextResponse.json({ error: FAIL }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
