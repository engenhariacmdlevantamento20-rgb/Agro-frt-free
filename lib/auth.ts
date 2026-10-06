import { cache } from "react";
import { headers } from "next/headers";
import { admin, getUser } from "@netlify/identity";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { pool } from "./db";
import { normalizePhone } from "./pure";

export { normalizePhone } from "./pure";
export const TERMS_VERSION = "2026-10-draft";
export type SessionUser = { id: string; name: string; email: string; phone: string; roles: string[]; subStatus: string | null; trialEndsAt: string | null };

export function clientIp(request: Request) {
  return request.headers.get("x-nf-client-connection-ip") ?? null;
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const identity = await getUser();
  if (!identity) return null;
  let profile = (await getDb().select().from(users).where(eq(users.id, identity.id)).limit(1))[0];
  if (!profile) {
    const metadata = identity.userMetadata ?? {};
    const role = metadata.role === "transporter" ? "transporter" : "producer";
    const phone = normalizePhone(String(metadata.phone ?? "")) ?? "";
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(19370815)");
      const inserted = await client.query(
        "INSERT INTO users(id,name,email,phone) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING RETURNING id",
        [identity.id, String(metadata.full_name ?? identity.name ?? "Usuário").slice(0, 120), String(identity.email ?? `${identity.id}@invalid`).toLowerCase(), phone]);
      if (inserted.rowCount) {
        await client.query("INSERT INTO user_roles(user_id,role) VALUES ($1,$2)", [identity.id, role]);
        const first = await client.query("SELECT 1 FROM user_roles WHERE role='admin' LIMIT 1");
        const configuredAdmin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
        const allowedAdmin = configuredAdmin ? identity.email?.toLowerCase() === configuredAdmin && Boolean(identity.confirmedAt) : !first.rowCount;
        if (allowedAdmin || identity.roles?.includes("admin")) await client.query("INSERT INTO user_roles(user_id,role) VALUES ($1,'admin') ON CONFLICT DO NOTHING", [identity.id]);
        const setting = await client.query("SELECT value FROM system_settings WHERE key='trial_days'");
        const days = Math.min(365, Math.max(1, Number(setting.rows[0]?.value ?? 30)));
        await client.query("INSERT INTO subscriptions(user_id,trial_ends_at) VALUES ($1,now()+make_interval(days => $2::int))", [identity.id, days]);
        if (metadata.consent_version) await client.query("INSERT INTO consents(user_id,type,version) VALUES ($1,'terms_and_privacy',$2)", [identity.id, String(metadata.consent_version)]);
        await client.query("INSERT INTO audit_logs(user_id,action,ip) VALUES ($1,'register',$2)", [identity.id, (await headers()).get("x-nf-client-connection-ip")]);
      }
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
    profile = (await getDb().select().from(users).where(eq(users.id, identity.id)).limit(1))[0];
  }
  if (!profile || profile.status !== "active") return null;
  const roles = (await pool.query("SELECT role FROM user_roles WHERE user_id=$1", [identity.id])).rows.map((row) => String(row.role));
  const subscription = (await pool.query("SELECT status,trial_ends_at FROM subscriptions WHERE user_id=$1", [identity.id])).rows[0];
  return { id: profile.id, name: profile.name, email: profile.email, phone: profile.phone, roles, subStatus: subscription?.status ?? null, trialEndsAt: subscription?.trial_ends_at ? new Date(subscription.trial_ends_at).toISOString() : null };
});

export const deleteIdentityUser = (userId: string) => admin.deleteUser(userId);
