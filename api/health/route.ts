import { NextResponse } from "next/server";
import { getSettings } from "@netlify/identity";
import { pool, explainDbError, hasDb } from "@/lib/db";
import { getOrsKey } from "@/lib/settings";

export const dynamic = "force-dynamic";

// Diagnóstico: abra /api/health no navegador. Mostra só sim/não, nunca valores secretos.
export async function GET() {
  const out: Record<string, unknown> = {
    database_set: hasDb(),
    ors_api_key_set: !!process.env.ORS_API_KEY,
    app_url_set: !!process.env.NEXT_PUBLIC_APP_URL,
    db_connected: false, postgis: false, tables_ok: false, identity_ok: false,
  };
  try {
    await pool.query("SELECT 1");
    out.db_connected = true;
    out.ors_api_key_set = !!(await getOrsKey());
    out.postgis = (await pool.query("SELECT 1 FROM pg_extension WHERE extname='postgis'")).rowCount === 1;
    out.tables_ok = (await pool.query("SELECT to_regclass('public.users') AS t")).rows[0].t !== null;
  } catch (e) { out.db_error = explainDbError(e); }
  out.identity_ok = await getSettings().then(() => true, () => false);
  const ok = out.db_connected && out.tables_ok && out.identity_ok;
  return NextResponse.json(out, { status: ok ? 200 : 503 });
}
