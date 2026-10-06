import { pool } from "@/lib/db";
import { route, requireUser } from "@/lib/api";

export const GET = route(async () => {
  await requireUser();
  const { rows } = await pool.query("SELECT code, name FROM states WHERE active ORDER BY name");
  return rows;
});
