import { pool } from "@/lib/db";
import { route, requireUser, body, HttpError, num, audit } from "@/lib/api";

export const GET = route(async () => {
  await requireUser("admin");
  return (await pool.query("SELECT code, name, unit, has_animals, sort, active FROM cargo_types ORDER BY sort, name")).rows;
});

// Cria ou edita um tipo de carga. Bovinos não pode ser desativado (é o núcleo do produto).
export const POST = route(async (req: Request) => {
  const a = await requireUser("admin");
  const b = await body(req);
  const name = String(b.name ?? "").trim(), unit = String(b.unit ?? "").trim();
  if (!name || !unit) throw new HttpError(400, "Informe nome e unidade.");
  const code = String(b.code || name).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  if (!code) throw new HttpError(400, "Nome inválido.");
  const sort = num(b.sort ?? 100, 1, 999, "Ordem inválida.");
  const active = code === "bovinos" ? true : b.active !== false;
  await pool.query(
    `INSERT INTO cargo_types(code,name,unit,sort,active) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, unit=EXCLUDED.unit, sort=EXCLUDED.sort, active=EXCLUDED.active`,
    [code, name, unit, sort, active]);
  await audit(a.id, "cargo_type_saved", { code });
  return { ok: true, code };
});
