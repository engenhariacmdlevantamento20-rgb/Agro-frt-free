import { getConnectionString, getDatabase } from "@netlify/database";
import type { Pool, QueryResultRow } from "pg";

export const pool = {
  query: <Row extends QueryResultRow = any>(text: string, values?: unknown[]) => (getDatabase().pool as Pool).query<Row>(text, values),
  connect: () => (getDatabase().pool as Pool).connect(),
};

export function hasDb() {
  try { return Boolean(getConnectionString()); } catch { return false; }
}

export function explainDbError(error: unknown) {
  const code = (error as { code?: string })?.code;
  if (code === "42P01" || code === "42704") return { code: "schema_pending", message: "As migrações do banco ainda não foram aplicadas. Confira o deploy no Netlify." };
  return { code: "database_unavailable", message: "Não foi possível conectar ao Netlify Database. Confira o estado do deploy." };
}
