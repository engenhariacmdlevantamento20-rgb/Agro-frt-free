import { pool } from "./db";

export async function getOrsKey(): Promise<string | null> {
  if (process.env.ORS_API_KEY) return process.env.ORS_API_KEY;
  const result = await pool.query("SELECT value FROM system_settings WHERE key='ors_api_key'");
  return typeof result.rows[0]?.value === "string" ? result.rows[0].value : null;
}
