"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { api, gps } from "@/lib/client";
import { kindName } from "@/lib/places";
const MapView = dynamic(() => import("@/components/Map"), { ssr: false });

export type Start = { lat: number; lng: number; label: string };
const KEY = "fr_start";

/** Escolha de onde o motorista está ou vai estar: GPS, fim do transporte em andamento, local salvo ou ponto no mapa. */
export default function StartPicker({ value, onChange }: { value: Start | null; onChange: (s: Start | null) => void }) {
  const [where, setWhere] = useState<any[]>([]);
  const [lugares, setLugares] = useState<any>(null);
  const [mapa, setMapa] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    api("/api/driver/where").then((r) => r.ok && setWhere(r.data));
    api("/api/places").then((r) => r.ok && setLugares(r.data));
    try { const s = JSON.parse(localStorage.getItem(KEY) ?? "null"); if (s && Number.isFinite(s.lat) && Number.isFinite(s.lng)) onChange(s); } catch { /* sem valor salvo */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const opcoes = useMemo(() => {
    const l: { key: string; group: string; s: Start }[] = [];
    where.forEach((w) => l.push({ key: `w${w.id}`, group: "Onde vou estar (fim do transporte em andamento)", s: { lat: w.lat, lng: w.lng, label: `Após entregar em ${w.dest_name}` } }));
    (lugares?.farms ?? []).forEach((f: any) => l.push({ key: `f${f.id}`, group: "Minhas fazendas", s: { lat: f.lat, lng: f.lng, label: f.name } }));
    (lugares?.places ?? []).forEach((p: any) => l.push({ key: `p${p.id}`, group: "Locais salvos", s: { lat: p.lat, lng: p.lng, label: `${p.name} (${kindName(p.kind)})` } }));
    return l;
  }, [where, lugares]);
  const grupos = [...new Set(opcoes.map((o) => o.group))];

  function definir(s: Start | null, salvar = true) {
    onChange(s);
    if (!salvar) return;
    try { if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY); } catch { /* ok */ }
  }
  async function escolher(k: string) {
    setErro("");
    if (k === "gps") {
      try { const g = await gps(); setMapa(false); definir({ ...g, label: "Minha posição agora" }, false); } catch (e: any) { setErro(e.message); }
    } else if (k === "map") { setMapa(true); }
    else { const o = opcoes.find((x) => x.key === k); if (o) { setMapa(false); definir(o.s); } }
  }

  return (
    <div>
      <label htmlFor="start">De onde você sai? (ou onde vai estar)</label>
      <select id="start" value="" onChange={(e) => escolher(e.target.value)}>
        <option value="">{value ? `Saindo de: ${value.label}` : "Escolher o ponto de partida"}</option>
        <option value="gps">📍 Minha posição agora (GPS)</option>
        {grupos.map((g) => <optgroup key={g} label={g}>{opcoes.filter((o) => o.group === g).map((o) => <option key={o.key} value={o.key}>{o.s.label}</option>)}</optgroup>)}
        <option value="map">🗺️ Marcar no mapa</option>
      </select>
      {erro && <div className="aviso erro" role="alert" style={{ marginTop: 10 }}>{erro}</div>}
      {value && <p className="pequeno" style={{ margin: "8px 0 0" }}>Os km até o embarque são calculados a partir daqui. <button type="button" className="btn sec peq" onClick={() => definir(null)}>Limpar</button></p>}
      {mapa && (
        <div style={{ marginTop: 10 }}>
          <p className="pequeno">Toque no mapa onde o caminhão está ou vai estar. Arraste o ponto para ajustar.</p>
          <MapView height={280} points={value ? [{ lat: value.lat, lng: value.lng, color: "#F2B705", draggable: true }] : []}
            onMapClick={(lng, lat) => definir({ lat, lng, label: "Ponto marcado no mapa" })}
            onDrag={(_i, lng, lat) => definir({ lat, lng, label: "Ponto marcado no mapa" })} />
        </div>
      )}
    </div>
  );
}
