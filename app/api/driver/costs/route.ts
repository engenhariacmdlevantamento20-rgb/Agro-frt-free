/* eslint-disable @typescript-eslint/no-explicit-any */
import { pool } from "@/lib/db";
import { route, requireUser, body, num } from "@/lib/api";

// Valores que o motorista usa na calculadora de lucro (diesel, consumo, preço por km, impostos, despesas).
export const GET = route(async () => {
  const u = await requireUser();
  const r = await pool.query("SELECT data FROM driver_costs WHERE user_id=$1", [u.id]);
  return r.rows[0]?.data ?? {};
});

export const PUT = route(async (req: Request) => {
  const u = await requireUser();
  const b = await body(req);
  const opt = (v: unknown, max: number, msg: string) => (v === "" || v == null ? null : num(v, 0, max, msg));
  const data = {
    diesel_price: opt(b.diesel_price, 100, "Preço do diesel inválido."),
    km_per_liter: opt(b.km_per_liter, 50, "Consumo (km por litro) inválido."),
    rate_per_km: opt(b.rate_per_km, 1000, "Valor por km inválido."),
    tax_pct: opt(b.tax_pct, 100, "Impostos (%) inválido."),
    other_pct: opt(b.other_pct, 100, "Outros (%) inválido."),
    rate_basis: b.rate_basis === "loaded" ? "loaded" : "total",
    expenses: (Array.isArray(b.expenses) ? b.expenses : []).slice(0, 20).map((e: any) => ({
      name: String(e?.name ?? "").trim().slice(0, 40), value: num(e?.value ?? 0, 0, 10_000_000, "Valor de despesa inválido."),
    })),
  };
  await pool.query(
    `INSERT INTO driver_costs(user_id, data) VALUES ($1,$2) ON CONFLICT (user_id) DO UPDATE SET data=EXCLUDED.data, updated_at=now()`,
    [u.id, JSON.stringify(data)]);
  return { ok: true };
});
