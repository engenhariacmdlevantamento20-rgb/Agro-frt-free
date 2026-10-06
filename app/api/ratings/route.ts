import { pool } from "@/lib/db";
import { route, requireUser, body, transportFor, HttpError, num } from "@/lib/api";
import { notify } from "@/lib/notify";

export const POST = route(async (req: Request) => {
  const u = await requireUser();
  const b = await body(req);
  const t = await transportFor(u.id, String(b.transport_id));
  if (t.status !== "completed") throw new HttpError(409, "Só é possível avaliar depois de concluir o transporte.");
  const overall = num(b.overall, 1, 5, "A nota deve ser de 1 a 5.");
  const scores: Record<string, number> = {};
  for (const [k, v] of Object.entries((b.scores ?? {}) as Record<string, unknown>)) scores[k.slice(0, 40)] = num(v, 1, 5, "Nota inválida.");
  const ratee = t.producer_id === u.id ? t.transporter_id : t.producer_id;
  try {
    await pool.query("INSERT INTO ratings(transport_id,rater_id,ratee_id,overall,scores,comment) VALUES ($1,$2,$3,$4,$5,$6)",
      [t.id, u.id, ratee, Math.round(overall), JSON.stringify(scores), String(b.comment ?? "").slice(0, 600) || null]);
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "23505") throw new HttpError(409, "Você já avaliou este transporte.");
    throw e;
  }
  await notify(ratee, "rating", "Você recebeu uma avaliação", `${Math.round(overall)} estrelas`, `/painel/perfil/${ratee}`);
  return { ok: true };
});
