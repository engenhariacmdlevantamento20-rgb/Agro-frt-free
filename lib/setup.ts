import { pool } from "./db";

export async function loadMunicipiosUF(state: string) {
  const valid = await pool.query("SELECT 1 FROM states WHERE code=$1 AND active", [state]);
  if (!valid.rowCount) return 0;
  const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${encodeURIComponent(state)}/municipios`, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("Não foi possível consultar os municípios no IBGE.");
  const records: { id: number; nome: string }[] = await response.json();
  if (!Array.isArray(records)) throw new Error("Resposta inválida do IBGE.");
  await pool.query(
    `INSERT INTO municipalities(ibge_code,name,state_code)
     SELECT id,nome,$2 FROM jsonb_to_recordset($1::jsonb) AS municipality(id integer,nome text)
     ON CONFLICT (ibge_code) DO UPDATE SET name=EXCLUDED.name,state_code=EXCLUDED.state_code`, [JSON.stringify(records), state]);
  return records.length;
}

export async function loadMunicipios() {
  const response = await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome", { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error("Não foi possível consultar os municípios no IBGE.");
  const records: { id: number; nome: string; microrregiao?: { mesorregiao?: { UF?: { sigla?: string } } }; "regiao-imediata"?: { "regiao-intermediaria"?: { UF?: { sigla?: string } } } }[] = await response.json();
  const states = new Set((await pool.query("SELECT code FROM states WHERE active")).rows.map((row) => String(row.code)));
  const values = records.map((record) => ({ id: record.id, name: record.nome, state: record.microrregiao?.mesorregiao?.UF?.sigla ?? record["regiao-imediata"]?.["regiao-intermediaria"]?.UF?.sigla })).filter((record) => record.state && states.has(record.state));
  await pool.query(
    `INSERT INTO municipalities(ibge_code,name,state_code)
     SELECT id,name,state FROM jsonb_to_recordset($1::jsonb) AS municipality(id integer,name text,state text)
     ON CONFLICT (ibge_code) DO UPDATE SET name=EXCLUDED.name,state_code=EXCLUDED.state_code`, [JSON.stringify(values)]);
  return values.length;
}
