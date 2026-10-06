import { NextResponse } from "next/server";
import { pool, hasDb, explainDbError } from "@/lib/db";
import { loadMunicipios } from "@/lib/setup";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function adminExists(): Promise<boolean> {
  try { return (await pool.query("SELECT 1 FROM user_roles WHERE role='admin' LIMIT 1")).rowCount === 1; }
  catch { return false; } // tabelas ainda não existem
}

// Situação da instalação (sem dados secretos). As tabelas são criadas pelo Netlify Database a cada deploy.
export async function GET() {
  const out = { database_set: hasDb(), db_connected: false, tables_ok: false, admin_exists: false, municipalities: 0, error: "" };
  if (!out.database_set) return NextResponse.json(out);
  try {
    await pool.query("SELECT 1");
    out.db_connected = true;
    out.tables_ok = (await pool.query("SELECT to_regclass('public.users') AS t")).rows[0].t !== null;
    out.admin_exists = await adminExists();
    out.municipalities = Number((await pool.query("SELECT count(*)::int n FROM municipalities").catch(() => ({ rows: [{ n: 0 }] }))).rows[0].n);
  } catch (e) { out.error = explainDbError(e).message; }
  return NextResponse.json(out);
}

// Recarrega os municípios dos estados ativos (IBGE). Só para administrador logado.
export async function POST(req: Request) {
  const u = await getSessionUser().catch(() => null);
  if (!u?.roles.includes("admin")) return NextResponse.json({ error: "Entre como administrador." }, { status: 403 });
  const step = String((await req.json().catch(() => ({}))).step ?? "municipios");
  try {
    if (step === "municipios") return NextResponse.json({ ok: true, total: await loadMunicipios() });
    return NextResponse.json({ error: "Passo inválido." }, { status: 400 });
  } catch (e) {
    console.error("setup", e);
    return NextResponse.json({ error: `${(e as Error).message}` }, { status: 500 });
  }
}
