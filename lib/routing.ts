import { haversine } from "./pure";
import { getOrsKey } from "./settings";

export async function legDistance(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const key = await getOrsKey();
  if (key) {
    try {
      const response = await fetch("https://api.openrouteservice.org/v2/directions/driving-hgv/geojson", {
        method: "POST", headers: { Authorization: key, "Content-Type": "application/json" },
        body: JSON.stringify({ coordinates: [[from.lng, from.lat], [to.lng, to.lat]], instructions: false }), signal: AbortSignal.timeout(10000),
      });
      if (response.ok) {
        const result = await response.json();
        const summary = result.features?.[0]?.properties?.summary;
        if (summary && Number.isFinite(summary.distance)) return { distance_m: Math.round(summary.distance), duration_s: Math.round(summary.duration), estimate: false };
      }
    } catch {}
  }
  const distance = Math.round(haversine(from, to) * 1.3);
  return { distance_m: distance, duration_s: Math.round(distance / (50 / 3.6)), estimate: true };
}
