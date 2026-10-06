import { CATEGORIES } from "./flow";

export type ApiResult = { ok: boolean; data?: any; error?: string; status: number };

export async function api(path: string, options: RequestInit = {}): Promise<ApiResult> {
  try {
    const response = await fetch(path, { ...options, credentials: "same-origin", cache: "no-store" });
    const data = await response.json().catch(() => null);
    return response.ok ? { ok: true, data, status: response.status } : { ok: false, error: data?.error ?? "Não foi possível concluir a operação.", status: response.status };
  } catch { return { ok: false, error: "Sem conexão. Confira sua internet e tente novamente.", status: 0 }; }
}

export const post = (path: string, data: unknown) => api(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
export const put = (path: string, data: unknown) => api(path, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
export const brl = (cents: number | string) => (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const km = (meters: number) => `${(Number(meters) / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
export function hm(seconds: number) {
  const minutes = Math.round(Number(seconds) / 60);
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;
}
export function dataBr(value: string | null) {
  if (!value) return "A combinar";
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString("pt-BR") : "A combinar";
}
export const zap = (phone: string, text = "") => `https://wa.me/${phone.replace(/\D/g, "")}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

export function cargoResumo(cargo: { animals?: { category: string; quantity: number }[]; items?: { description: string; quantity: number }[]; cargo_unit?: string }) {
  if (cargo.animals?.length) return cargo.animals.map((animal) => `${animal.quantity} ${CATEGORIES[animal.category] ?? animal.category}`).join(", ");
  return (cargo.items ?? []).map((item) => `${item.quantity} ${cargo.cargo_unit ?? "un."} de ${item.description}`).join(", ");
}

export function gps(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("GPS indisponível neste navegador."));
    navigator.geolocation.getCurrentPosition((position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => reject(new Error("Não foi possível obter sua posição. Autorize o GPS ou escolha no mapa.")), { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
  });
}
