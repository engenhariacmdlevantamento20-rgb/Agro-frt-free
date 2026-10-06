"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { api, post, zap } from "@/lib/client";
import { PLACE_KINDS, kindColor, kindName } from "@/lib/places";
const MapView = dynamic(() => import("@/components/Map"), { ssr: false });

type Item = { key: string; id?: string; source: "place" | "farm" | "recent"; name: string; kind: string; lat: number; lng: number; uf?: string; muni?: string; ref?: string; phone?: string; notes?: string; favorite?: boolean; uses?: number };
const perto = (a: Item, b: Item) => Math.abs(a.lat - b.lat) < 0.001 && Math.abs(a.lng - b.lng) < 0.001;

export default function Locais() {
  const [d, setD] = useState<any>(null);
  const [erro, setErro] = useState("");
  const [kind, setKind] = useState("");
  const [soFav, setSoFav] = useState(false);
  const [q, setQ] = useState("");
  const [foco, setFoco] = useState<{ lat: number; lng: number } | null>(null);
  const load = () => api("/api/places").then((r) => (r.ok ? setD(r.data) : setErro(r.error ?? "Erro ao carregar.")));
  useEffect(() => { load(); }, []);

  const todos = useMemo<Item[]>(() => {
    if (!d) return [];
    const a: Item[] = d.places.map((p: any) => ({ key: `p${p.id}`, id: p.id, source: "place", name: p.name, kind: p.kind, lat: p.lat, lng: p.lng, uf: p.state_code, muni: p.municipality, ref: p.address_reference, phone: p.phone, notes: p.notes, favorite: p.favorite }));
    const f: Item[] = d.farms.map((x: any) => ({ key: `f${x.id}`, source: "farm", name: x.name, kind: "fazenda", lat: x.lat, lng: x.lng, uf: x.state_code, ref: x.address_reference, notes: x.notes }));
    const base = [...a, ...f];
    const r: Item[] = d.recent.map((x: any, i: number) => ({ key: `r${i}`, source: "recent", name: x.name, kind: x.kind, lat: x.lat, lng: x.lng, uses: x.uses }));
    return [...base, ...r.filter((x) => !base.some((b) => perto(b, x)))];
  }, [d]);

  const vis = useMemo(() => todos.filter((x) =>
    (!kind || x.kind === kind) && (!soFav || x.favorite) && (!q || x.name.toLowerCase().includes(q.toLowerCase()))), [todos, kind, soFav, q]);
  const pts = useMemo(() => vis.map((x) => ({
    lat: x.lat, lng: x.lng, color: x.favorite ? "#F2B705" : x.source === "recent" ? "#6B7280" : kindColor(x.kind),
    title: [`${x.favorite ? "★ " : ""}${x.name}`, `${kindName(x.kind)}${x.uf ? " · " + x.uf : ""}${x.muni ? " · " + x.muni : ""}`, x.source === "farm" ? "Sua fazenda" : x.source === "recent" ? `Destino que você já usou (${x.uses}x)` : "", x.ref ?? "", x.phone ? `WhatsApp ${x.phone}` : "", x.notes ?? ""].join("\n"),
  })), [vis]);

  async function favoritar(x: Item) {
    const r = await post("/api/places/favorite", { place_id: x.id });
    if (!r.ok) return setErro(r.error ?? "Erro");
    setErro(""); setD((s: any) => ({ ...s, places: s.places.map((p: any) => (p.id === x.id ? { ...p, favorite: r.data.favorite } : p)) }));
  }
  const grupos = [...new Set(vis.map((x) => x.kind))];

  return (
    <main className="larga">
      <h1>Locais e mapa</h1>
      <p className="pequeno">Frigoríficos, matadouros, leilões, confinamentos e outros pontos cadastrados, mais as suas fazendas e os destinos que você já usou. Troque entre mapa, satélite e híbrido (satélite com estradas e nomes) no canto do mapa. Marque ★ nos que você mais usa.</p>
      {erro && <div className="aviso erro">{erro}</div>}
      <div className="linha2">
        <div><label htmlFor="k">Tipo</label><select id="k" value={kind} onChange={(e) => setKind(e.target.value)}><option value="">Todos</option>{Object.entries(PLACE_KINDS).map(([k, v]) => <option key={k} value={k}>{v.plural}</option>)}</select></div>
        <div><label htmlFor="q">Buscar pelo nome</label><input id="q" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      <label className="check"><input type="checkbox" checked={soFav} onChange={(e) => setSoFav(e.target.checked)} /><span>Só os meus favoritos (★, em amarelo no mapa)</span></label>
      <MapView points={pts} focus={foco} height={400} />
      <p className="pequeno" style={{ marginTop: 8 }}>{Object.entries(PLACE_KINDS).map(([k, v]) => <span key={k} style={{ marginRight: 12, whiteSpace: "nowrap" }}><span style={{ color: v.color }}>●</span> {v.name}</span>)}<span style={{ whiteSpace: "nowrap" }}><span style={{ color: "#6B7280" }}>●</span> Usado antes</span></p>

      {d && vis.length === 0 && <p>Nenhum local encontrado{todos.length === 0 ? ". O administrador ainda não cadastrou locais." : " com esse filtro."}</p>}
      {grupos.map((g) => (
        <div key={g}>
          <h2>{PLACE_KINDS[g]?.plural ?? "Outros"}</h2>
          {vis.filter((x) => x.kind === g).map((x) => (
            <div key={x.key} className="item">
              <b>{x.favorite && "★ "}{x.name}</b>
              <span className="tag">{kindName(x.kind)}</span>
              {x.source === "farm" && <span className="tag sol">Minha fazenda</span>}
              {x.source === "recent" && <span className="tag">Usado {x.uses}x</span>}
              {(x.uf || x.muni) && <span className="pequeno">{[x.muni, x.uf].filter(Boolean).join(" - ")}</span>}
              {x.ref && <p className="pequeno" style={{ margin: "6px 0 0" }}>{x.ref}</p>}
              {x.notes && <p className="pequeno" style={{ margin: "6px 0 0" }}>{x.notes}</p>}
              <p style={{ margin: "10px 0 0" }}>
                <button className="btn sec peq" onClick={() => { setFoco({ lat: x.lat, lng: x.lng }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Ver no mapa</button>
                {x.source === "place" && <button className="btn sec peq" onClick={() => favoritar(x)}>{x.favorite ? "★ Tirar dos favoritos" : "☆ Favoritar"}</button>}
                {x.phone && <a className="btn sec peq" href={zap(x.phone)} target="_blank">WhatsApp</a>}
                {d?.can_produce && x.source !== "farm" && x.id && <Link className="btn peq" href={`/painel/transportes/novo?dest=${x.id}`}>Usar como destino</Link>}
              </p>
            </div>
          ))}
        </div>
      ))}
    </main>
  );
}
