import { pool } from "@/lib/db";
import { route, requireUser } from "@/lib/api";
import { loadMunicipiosUF } from "@/lib/setup";

const SQL = "SELECT ibge_code, name FROM municipalities WHERE state_code=$1 AND active ORDER BY name";

export const GET = route(async (req: Request) => {
  await requireUser();
  const uf = (new URL(req.url).searchParams.get("state") ?? "").toUpperCase();
  let { rows } = await pool.query(SQL, [uf]);
  // Estado ainda sem municípios (todo o Brasil): busca no IBGE na primeira vez.
  if (rows.length === 0 && /^[A-Z]{2}$/.test(uf)) {
    try {
      if (await loadMunicipiosUF(uf)) rows = (await pool.query(SQL, [uf])).rows;
    } catch { console.error("Municipality lookup failed."); }
  }
  return rows;
});
