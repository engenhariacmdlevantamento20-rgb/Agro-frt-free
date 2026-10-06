import type { Config } from "@netlify/functions";
import { runDailyMaintenance } from "../../lib/daily.js";

export default async () => Response.json(await runDailyMaintenance());

export const config: Config = { schedule: "0 8 * * *" };
