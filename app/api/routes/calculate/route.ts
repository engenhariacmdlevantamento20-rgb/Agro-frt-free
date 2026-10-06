import { route, requireUser, body, HttpError, lat, lng } from "@/lib/api";
import { splitSurface } from "@/lib/pure";
import { getOrsKey } from "@/lib/settings";

async function ors(profile: string, coords: number[][], key: string) {
  return fetch(`https://api.openrouteservice.org/v2/directions/${profile}/geojson`, {
    method: "POST",
    headers: { Authorization: key, "Content-Type": "application/json" },
    body: JSON.stringify({ coordinates: coords, extra_info: ["surface"], instructions: false, radiuses: coords.map(() => -1) }),
    signal: AbortSignal.timeout(15000),
  });
}

export const POST = route(async (req: Request) => {
  await requireUser();
  const key = await getOrsKey();
  if (!key) throw new HttpError(503, "O cálculo de rota ainda não foi configurado. Peça ao administrador para colar a chave de rotas em Administração.");
  const b = await body(req);
  const pts: number[][] = (Array.isArray(b.points) ? b.points : []).map((p: number[]) => [lng(p[0]), lat(p[1])]);
  if (pts.length < 2 || pts.length > 20) throw new HttpError(400, "Informe origem, destino e até 18 pontos intermediários.");

  let profile = "driving-hgv";
  let res = await ors(profile, pts, key);
  if (!res.ok) { profile = "driving-car"; res = await ors(profile, pts, key); }
  if (!res.ok) throw new HttpError(502, "Não foi possível calcular a rota. Tente mover os pontos para perto de uma estrada.");

  const data = await res.json();
  const f = data.features?.[0];
  const coords: number[][] = f?.geometry?.coordinates ?? [];
  if (!coords.length) throw new HttpError(502, "Rota não encontrada.");
  const vals: number[][] = f.properties?.extras?.surface?.values ?? [];
  const sum = f.properties.summary;
  const surf = splitSurface(coords, vals, Math.round(sum.distance));
  return {
    distance_m: Math.round(sum.distance), duration_s: Math.round(sum.duration),
    ...surf,
    coordinates: coords.map((c) => [c[0], c[1]]), waypoints: pts, is_custom: pts.length > 2, profile,
  };
});
