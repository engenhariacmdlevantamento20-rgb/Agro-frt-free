"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { api, post, gps } from "@/lib/client";
const MapView = dynamic(() => import("@/components/Map"), { ssr: false });

const KINDS: Record<string, string> = { sede: "Sede", porteira: "Porteira", curral: "Curral", embarque: "Embarque de gado", estrada_interna: "Estrada interna", encontro: "Ponto de encontro" };
const COLORS: Record<string, string> = { sede: "#1E3B2A", porteira: "#8A5A3B", curral: "#8A5A3B", embarque: "#F2B705", estrada_interna: "#6B7280", encontro: "#6B7280" };

export default function Fazendas() {
  const [farms, setFarms] = useState<any[]>([]);
  const [novo, setNovo] = useState(false);
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [points, setPoints] = useState<any[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [uf, setUf] = useState("");
  const [states, setStates] = useState<any[]>([]);
  useEffect(() => { api("/api/states").then((r) => r.ok && setStates(r.data)); }, []);
  const [munis, setMunis] = useState<any[]>([]);
  useEffect(() => { setMunis([]); if (uf) api(`/api/municipalities?state=${uf}`).then((r) => r.ok && setMunis(r.data)); }, [uf]);

  const load = async () => { const r = await api("/api/farms"); if (r.ok) setFarms(r.data); };
  useEffect(() => { load(); }, []);

  function onClick(lng: number, lat: number) {
    if (pending) { setPoints((p) => [...p, { kind: pending, name: KINDS[pending], lat, lng }]); setPending(null); }
    else setLoc({ lat, lng });
  }
  async function useGps() { try { setLoc(await gps()); } catch (e: any) { setErro(e.message); } }

  async function salvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErro("");
    if (!loc) return setErro("Marque a localização da fazenda no mapa ou use o GPS.");
    const f = new FormData(e.currentTarget);
    const r = await post("/api/farms", { name: f.get("name"), state_code: f.get("state"), municipality_ibge: f.get("muni") || null, address_reference: f.get("ref"), road_type: f.get("road"), access_notes: f.get("notes"), lat: loc.lat, lng: loc.lng, points });
    if (!r.ok) return setErro(r.error ?? "Erro ao salvar.");
    setNovo(false); setLoc(null); setPoints([]); load();
  }

  const pts = useMemo(() => [...(loc ? [{ ...loc, color: "#1E3B2A", title: "Fazenda" }] : []), ...points.map((p) => ({ lat: p.lat, lng: p.lng, color: COLORS[p.kind], title: p.name }))], [loc, points]);

  return (
    <main className="larga">
      <h1>Minhas fazendas</h1>
      {!novo && <button className="btn sol" onClick={() => setNovo(true)}>Cadastrar fazenda</button>}
      {novo && (
        <form onSubmit={salvar}>
          <label htmlFor="name">Nome da fazenda</label><input id="name" name="name" required />
          <div className="linha2">
            <div><label htmlFor="state">Estado</label><select id="state" name="state" value={uf} onChange={(e) => setUf(e.target.value)} required><option value="">Escolher</option>{states.map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}</select></div>
            <div><label htmlFor="road">Estrada de acesso</label><select id="road" name="road"><option value="">Não sei</option><option value="asfalto">Asfalto</option><option value="terra_boa">Terra boa</option><option value="terra_ruim">Terra ruim</option></select></div>
          </div>
          {munis.length > 0 && <><label htmlFor="muni">Município</label><select id="muni" name="muni"><option value="">Escolher</option>{munis.map((m) => <option key={m.ibge_code} value={m.ibge_code}>{m.name}</option>)}</select></>}
          <label htmlFor="ref">Referência (ex.: km 12 da BR-153)</label><input id="ref" name="ref" />
          <label htmlFor="notes">Como chegar / condições para caminhão</label><textarea id="notes" name="notes" />
          <h2>Localização no mapa</h2>
          <div className="aviso">As coordenadas da fazenda ficam visíveis para os usuários do app. Marque só o que você aceita mostrar.</div>
          <button type="button" className="btn sec" onClick={useGps}>Usar minha posição (GPS)</button>
          <p className="pequeno">{pending ? `Toque no mapa para marcar: ${KINDS[pending]}` : "Toque no mapa para marcar a fazenda."}</p>
          <MapView points={pts} onMapClick={onClick} height={340} />
          <h2>Pontos dentro da fazenda</h2>
          {Object.entries(KINDS).filter(([k]) => k !== "sede").map(([k, n]) => (
            <button key={k} type="button" className="btn sec peq" onClick={() => setPending(k)}>+ {n}</button>
          ))}
          {points.map((p, i) => <div key={i} className="item">{KINDS[p.kind]} <button type="button" className="btn sec peq" onClick={() => setPoints(points.filter((_, j) => j !== i))}>Remover</button></div>)}
          {erro && <div className="aviso erro" role="alert">{erro}</div>}
          <button className="btn" type="submit">Salvar fazenda</button>
          <button className="btn sec" type="button" onClick={() => setNovo(false)}>Cancelar</button>
        </form>
      )}
      {!novo && farms.length === 0 && <p>Nenhuma fazenda ainda. Cadastre a primeira para criar transportes mais rápido.</p>}
      {!novo && farms.map((f) => (
        <div key={f.id} className="item"><b>{f.name}</b>{f.state_code} · {f.points.length} pontos{f.access_notes && <p className="pequeno">{f.access_notes}</p>}</div>
      ))}
    </main>
  );
}
