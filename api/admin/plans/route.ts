import { pool } from "@/lib/db";
import { route, requireUser, body, HttpError, num, audit } from "@/lib/api";

export const GET = route(async () => {
  await requireUser("admin");
  return (await pool.query("SELECT id, code, name, price_cents, interval_days, features, limits, active FROM plans ORDER BY id")).rows;
});

// Cria (sem id) ou edita (com id). Preço em reais no corpo; guardado em centavos.
export const POST = route(async (req: Request) => {
  const a = await requireUser("admin");
  const b = await body(req);
  const name = String(b.name ?? "").trim();
  if (!name) throw new HttpError(400, "Informe o nome do plano.");
  const cents = Math.round(num(b.price, 0, 1_000_000, "Preço inválido.") * 100);
  const days = num(b.interval_days, 1, 3650, "Período inválido.");
  let features: unknown = {}, limits: unknown = {};
  try { features = JSON.parse(String(b.features || "{}")); limits = JSON.parse(String(b.limits || "{}")); } catch { throw new HttpError(400, "Recursos e limites precisam ser JSON válido."); }
  if (b.id) {
    await pool.query("UPDATE plans SET name=$2, price_cents=$3, interval_days=$4, features=$5, limits=$6, active=$7 WHERE id=$1",
      [b.id, name, cents, days, JSON.stringify(features), JSON.stringify(limits), b.active !== false]);
  } else {
    const code = String(b.code || name).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    await pool.query("INSERT INTO plans(code,name,price_cents,interval_days,features,limits) VALUES ($1,$2,$3,$4,$5,$6)",
      [code, name, cents, days, JSON.stringify(features), JSON.stringify(limits)]);
  }
  await audit(a.id, "plan_saved", { name });
  return { ok: true };
});
