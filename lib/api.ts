/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getSessionUser, type SessionUser } from "./auth";
import { pool } from "./db";
import { verifyRequestOrigin } from "@netlify/identity";

export class HttpError extends Error { constructor(public status: number, msg: string) { super(msg); } }

export async function requireUser(role?: string): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) throw new HttpError(401, "Faça login para continuar.");
  if (role && !u.roles.includes(role)) throw new HttpError(403, "Seu perfil não tem permissão para isso.");
  return u;
}

export function route<A extends unknown[]>(fn: (...a: A) => Promise<unknown>) {
  return async (...a: A): Promise<Response> => {
    try {
      const request = a[0];
      if (request instanceof Request && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
        try { verifyRequestOrigin(request); } catch { throw new HttpError(403, "Origem não permitida."); }
      }
      const r = await fn(...a);
      return r instanceof Response ? r : NextResponse.json(r);
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      console.error("API request failed", { name: e instanceof Error ? e.name : "UnknownError", code: (e as { code?: string })?.code });
      return NextResponse.json({ error: "Erro interno. Tente de novo." }, { status: 500 });
    }
  };
}

export async function body(req: Request): Promise<Record<string, any>> {
  try {
    const data = await req.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error();
    return data;
  } catch { throw new HttpError(400, "Dados inválidos."); }
}

export function num(v: unknown, min: number, max: number, msg: string) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw new HttpError(400, msg);
  return n;
}
export const lat = (v: unknown) => num(v, -90, 90, "Latitude inválida.");
export const lng = (v: unknown) => num(v, -180, 180, "Longitude inválida.");

export const pt = (a: number, b: number) => `ST_SetSRID(ST_MakePoint($${a},$${b}),4326)::geography`;

/** Transporte em que o usuário é produtor ou transportador, senão 404. */
export async function transportFor(userId: string, id: string) {
  const { rows } = await pool.query("SELECT * FROM transports WHERE id=$1 AND (producer_id=$2 OR transporter_id=$2)", [id, userId]);
  if (!rows[0]) throw new HttpError(404, "Transporte não encontrado.");
  return rows[0] as { id: string; status: string; producer_id: string; transporter_id: string; tracking_active: boolean; request_id: string; started_at: string | null };
}

export async function audit(userId: string | null, action: string, meta: object = {}) {
  await pool.query("INSERT INTO audit_logs(user_id, action, meta) VALUES ($1,$2,$3)", [userId, action, JSON.stringify(meta)]);
}
