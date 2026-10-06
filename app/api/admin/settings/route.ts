import { pool } from "@/lib/db";
import { route, requireUser, body, HttpError, num, audit } from "@/lib/api";
import { normalizePhone } from "@/lib/pure";

const EDITABLE = ["trial_days", "tracking_interval_seconds", "report_validate_threshold", "tracking_retention_days"];
const BOOLS = ["enforce_paywall"];

export const PUT = route(async (req: Request) => {
  const u = await requireUser("admin");
  const b = await body(req);
  if (b.key === "ors_api_key") {
    const k = String(b.value ?? "").trim();
    if (k.length < 20 || /\s/.test(k)) throw new HttpError(400, "Chave inválida. Cole a chave inteira, sem espaços.");
    await pool.query("INSERT INTO system_settings(key,value) VALUES ('ors_api_key',$1::jsonb) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()", [JSON.stringify(k)]);
    await audit(u.id, "ors_key_saved");
    return { ok: true };
  }
  if (b.key === "pix_key" || b.key === "pix_name") {
    const v = String(b.value ?? "").trim().slice(0, 140);
    await pool.query("INSERT INTO system_settings(key,value) VALUES ($1,$2::jsonb) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()", [b.key, JSON.stringify(v)]);
    await audit(u.id, "setting_changed", { key: b.key });
    return { ok: true };
  }
  if (b.key === "admin_whatsapp") {
    const raw = String(b.value ?? "").trim();
    const v = raw ? normalizePhone(raw) : "";
    if (v === null) throw new HttpError(400, "WhatsApp inválido. Use o número com DDD.");
    await pool.query("INSERT INTO system_settings(key,value) VALUES ('admin_whatsapp',$1::jsonb) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()", [JSON.stringify(v)]);
    await audit(u.id, "setting_changed", { key: b.key });
    return { ok: true };
  }
  if (BOOLS.includes(b.key)) {
    await pool.query("UPDATE system_settings SET value=$2::jsonb, updated_at=now() WHERE key=$1", [b.key, JSON.stringify(b.value === true)]);
    await audit(u.id, "setting_changed", { key: b.key, value: b.value === true });
    return { ok: true };
  }
  if (!EDITABLE.includes(b.key)) throw new HttpError(400, "Configuração não editável.");
  const v = num(b.value, 1, 3650, "Valor inválido.");
  await pool.query("UPDATE system_settings SET value=$2::jsonb, updated_at=now() WHERE key=$1", [b.key, JSON.stringify(v)]);
  await audit(u.id, "setting_changed", { key: b.key, value: v });
  return { ok: true };
});
