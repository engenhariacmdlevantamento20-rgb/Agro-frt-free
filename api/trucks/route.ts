/* eslint-disable @typescript-eslint/no-explicit-any */
import { pool } from "@/lib/db";
import { route, requireUser, body, HttpError, num } from "@/lib/api";

export const GET = route(async () => {
  const u = await requireUser();
  const { rows } = await pool.query(
    "SELECT id, plate, brand, model, year, type, body_type, capacity_heads, capacity_tons, km_per_liter, cargo_types, compartments, notes FROM trucks WHERE owner_id=$1 AND active ORDER BY plate", [u.id]);
  return rows;
});

export const POST = route(async (req: Request) => {
  const u = await requireUser("transporter");
  const b = await body(req);
  const plate = String(b.plate ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (plate.length < 7) throw new HttpError(400, "Placa inválida.");
  const valid = (await pool.query("SELECT code FROM cargo_types WHERE active")).rows.map((r) => r.code as string);
  const cargos: string[] = (Array.isArray(b.cargo_types) && b.cargo_types.length ? b.cargo_types : ["bovinos"]).filter((c: string) => valid.includes(c));
  if (!cargos.length) throw new HttpError(400, "Escolha pelo menos um tipo de carga.");
  const carriesCattle = cargos.includes("bovinos");
  const cap = carriesCattle ? num(b.capacity_heads, 1, 500, "Informe a capacidade em cabeças.") : (b.capacity_heads ? num(b.capacity_heads, 1, 500, "Capacidade inválida.") : null);
  const tons = b.capacity_tons ? num(b.capacity_tons, 0.1, 200, "Capacidade em toneladas inválida.") : null;
  if (!carriesCattle && !tons) throw new HttpError(400, "Informe a capacidade em toneladas.");
  const kml = b.km_per_liter ? num(String(b.km_per_liter).replace(",", "."), 0.5, 20, "Consumo inválido (use km por litro, ex.: 2,5).") : null;
  try {
    const r = await pool.query(
      `INSERT INTO trucks(owner_id,plate,brand,model,year,type,body_type,capacity_heads,compartments,notes,cargo_types,capacity_tons,km_per_liter)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [u.id, plate, b.brand || null, b.model || null, b.year ? num(b.year, 1960, 2100, "Ano inválido.") : null,
       String(b.type || "truck"), b.body_type || null, cap, b.compartments ? num(b.compartments, 1, 10, "Compartimentos inválido.") : null, b.notes || null, cargos, tons, kml]);
    return { id: r.rows[0].id };
  } catch (e: any) {
    if (e.code === "23505") throw new HttpError(409, "Esta placa já está cadastrada.");
    throw e;
  }
});
