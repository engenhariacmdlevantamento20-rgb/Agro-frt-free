import { pool } from "@/lib/db";
import { route, requireUser } from "@/lib/api";

export const GET = route(async () => {
  await requireUser();
  return (await pool.query("SELECT code, name, unit, has_animals FROM cargo_types WHERE active ORDER BY sort, name")).rows;
});
