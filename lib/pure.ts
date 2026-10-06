export function normalizePhone(value: string): string | null {
  let phone = value.replace(/\D/g, "");
  if (phone.length === 10 || phone.length === 11) phone = `55${phone}`;
  return /^55[1-9]\d\d{8,9}$/.test(phone) ? phone : null;
}

export const phoneEmail = (phone: string) => `whatsapp-${phone}@phone.agrofrete.invalid`;
export const isPhoneEmail = (email: string) => /^whatsapp-\d+@phone\.agrofrete\.invalid$/i.test(email);
export const csvCell = (value: unknown) => `"${String(value ?? "").replace(/^[=+@-]/, "'$&").replace(/"/g, '""')}"`;

export function parseCoords(value: string) {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = Number(match[1]), lng = Number(match[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

export function haversine(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitude = radians(to.lat - from.lat), longitude = radians(to.lng - from.lng);
  const arc = Math.sin(latitude / 2) ** 2 + Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(longitude / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(Math.min(1, arc)), Math.sqrt(Math.max(0, 1 - arc)));
}

export function pathLength(points: number[][]) {
  return points.slice(1).reduce((distance, point, offset) => distance + haversine(
    { lng: points[offset][0], lat: points[offset][1] }, { lng: point[0], lat: point[1] }), 0);
}

export function downsample(points: number[][], limit: number): number[][] {
  if (points.length <= limit) return points;
  return Array.from({ length: Math.max(2, limit) }, (_, offset) => points[Math.round(offset * (points.length - 1) / (Math.max(2, limit) - 1))]);
}

export function splitSurface(coordinates: number[][], values: number[][], total: number) {
  let paved = 0, unpaved = 0, unknown = 0;
  for (const [start, end, surface] of values) {
    const distance = pathLength(coordinates.slice(start, end + 1));
    if ([1, 3, 4, 5, 6, 7, 14, 18].includes(surface)) paved += distance;
    else if ([2, 8, 9, 10, 11, 12, 13, 15, 16, 17].includes(surface)) unpaved += distance;
    else unknown += distance;
  }
  const measured = Math.max(pathLength(coordinates), paved + unpaved + unknown);
  if (!measured) return { paved_m: 0, unpaved_m: 0, unknown_m: total };
  const pavedM = Math.min(total, Math.round(paved / measured * total)), unpavedM = Math.min(total - pavedM, Math.round(unpaved / measured * total));
  return { paved_m: pavedM, unpaved_m: unpavedM, unknown_m: Math.max(0, total - pavedM - unpavedM) };
}
