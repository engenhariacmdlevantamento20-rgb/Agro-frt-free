import { route, HttpError } from "@/lib/api";
import { runDailyMaintenance } from "@/lib/daily";
import { timingSafeEqual } from "node:crypto";

export const GET = route(async (req: Request) => {
  const secret = process.env.CRON_SECRET;
  const supplied = req.headers.get("authorization") ?? "";
  const expected = secret ? `Bearer ${secret}` : "";
  if (!secret || supplied.length !== expected.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) throw new HttpError(401, "Não autorizado.");
  return runDailyMaintenance();
});
