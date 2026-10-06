"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { api, post, gps, km, hm } from "@/lib/client";
import { CATEGORIES } from "@/lib/flow";
import { PLACE_KINDS, kindColor, kindName } from "@/lib/places";
const MapView = dynamic(() => import("@/components/Map"), { ssr: false });

type P = { lat: number; lng: number };
type Mode = "origin" | "dest" | "via" | null;

export default function NovoTransporte() {
  const [farms, setFarms] = useState<any[]>([]);
  const [origin, setOrigin] = useState<(P & { name: string; farm_id?: string }) | null>(null);
  const [dest, setDest] = useState<(P & { name: string; kind: string }) | null>(null);
  const [destName, setDestName] = useState(""); const [destKind, setDestKind] = useState("frigorifico");
  const [vias, setVias] = useState<P[]>([]);
  const [mode, setMode] = useState<Mode>(null);
  const [rota, setRota] = useState<any>(null);
  const [calc, setCalc] = useState(false);
  const [animals, setAnimals] = useState([{ category: "boi", quantity: 10, weight: "" }]);
  const [cargoTypes, setCargoTypes] = useState<any[]>([]);
  const [cargo, setCargo] = useState("bovinos");
  const [items, setItems] = useState([{ description: "", quantity: "", weight_kg: "" }]);
  const [erro, setErro] = useState("");

  const [reports, setReports] = useState<any[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [lugares, setLugares] = useState<any>(null);
  const [verLugares, setVerLugares] = useState(true);
  const destParam = useRef(false);

  useEffect(() => {
    api("/api/farms").then((r) => r.ok && setFarms(r.data));
    api("/api/cargo-types").then((r) => r.ok && setCargoTypes(r.data));
    api("/api/road-reports").then((r) => r.ok && setReports(r.data));
    api("/api/places").then((r) => r.ok && setLugares(r.data));
    const from = new URLSearchParams(window.location.search).get("from");
    if (from) {
      // "Repetir transporte": carrega o transporte anterior para editar
      api(`/api/requests/${from}`).then((r) => {
        const d = r.data;
        if (r.ok && d.is_owner) {
          setOrigin({ name: d.origin_name, lat: d.o_lat, lng: d.o_lng, farm_id: d.origin_farm_id ?? undefined });
          setDest({ name: d.dest_name, kind: d.dest_kind, lat: d.d_lat, lng: d.d_lng });
          setDestName(d.dest_name); setDestKind(d.dest_kind);
          setVias((d.waypoints ?? []).slice(1, -1).map((p: number[]) => ({ lng: p[0], lat: p[1] })));
          setCargo(d.cargo_type ?? "bovinos");
          if (d.animals?.length) setAnimals(d.animals.map((a: any) => ({ category: a.category, quantity: a.quantity, weight: a.weight ?? "" })));
          if (d.items?.length) setItems(d.items.map((i: any) => ({ description: i.description, quantity: String(Number(i.quantity)), weight_kg: i.weight_kg ?? "" })));
        }
        setCarregado(true);
      });
    } else {
      // Rascunho guardado no aparelho (útil sem sinal / se fechar o app)
      try {
        const raw = localStorage.getItem("ubp_draft_novo");
        if (raw) { const d = JSON.parse(raw); setOrigin(d.origin ?? null); setDest(d.dest ?? null); setDestName(d.destName ?? ""); setDestKind(d.destKind ?? "frigorifico"); setVias(d.vias ?? []); if (d.animals?.length) setAnimals(d.animals); if (d.cargo) setCargo(d.cargo); if (d.items?.length) setItems(d.items); }
      } catch { /* rascunho inválido: ignora */ }
      setCarregado(true);
    }
  }, []);
  useEffect(() => {
    if (!carregado) return;
    try { localStorage.setItem("ubp_draft_novo", JSON.stringify({ origin, dest, destName, destKind, vias, animals, cargo, items })); } catch { /* sem espaço: ignora */ }
  }, [carregado, origin, dest, destName, destKind, vias, animals, cargo, items]);

  // Locais do administrador, fazendas do usuário e destinos já usados (histórico), para escolher e ver no mapa
  const lugaresItens = useMemo(() => {
    if (!lugares) return [] as any[];
    const a = lugares.places.map((p: any) => ({ key: `p${p.id}`, id: p.id, name: p.name, kind: p.kind, lat: p.lat, lng: p.lng, fav: !!p.favorite, tipo: "place", info: [p.municipality, p.state_code].filter(Boolean).join(" - "), ref: p.address_reference, phone: p.phone }));
    const f = lugares.farms.map((x: any) => ({ key: `f${x.id}`, farm_id: x.id, name: x.name, kind: "fazenda", lat: x.lat, lng: x.lng, tipo: "farm", info: x.state_code, ref: x.address_reference }));
    const base = [...a, ...f];
    const r = lugares.recent.filter((x: any) => !base.some((b: any) => Math.abs(b.lat - x.lat) < 0.001 && Math.abs(b.lng - x.lng) < 0.001))
      .map((x: any, i: number) => ({ key: `r${i}`, name: x.name, kind: x.kind, lat: x.lat, lng: x.lng, tipo: "recent", info: `Destino usado ${x.uses}x` }));
    return [...base, ...r] as any[];
  }, [lugares]);
  const lugaresVis = verLugares ? lugaresItens : [];
  const gruposLugares = useMemo(() => {
    const g: { label: string; itens: any[] }[] = [
      { label: "★ Favoritos", itens: lugaresItens.filter((x) => x.tipo === "place" && x.fav) },
      { label: "Usados recentemente", itens: lugaresItens.filter((x) => x.tipo === "recent") },
      { label: "Minhas fazendas", itens: lugaresItens.filter((x) => x.tipo === "farm") },
      ...Object.entries(PLACE_KINDS).map(([k, v]) => ({ label: v.plural, itens: lugaresItens.filter((x) => x.tipo === "place" && !x.fav && x.kind === k) })),
    ];
    return g.filter((x) => x.itens.length);
  }, [lugaresItens]);

  const opcoes = useMemo(() => [
    ...farms.flatMap((f) => [
      { label: `${f.name} — sede`, name: f.name, lat: f.lat, lng: f.lng, farm_id: f.id },
      ...f.points.map((p: any) => ({ label: `${f.name} — ${p.name}`, name: `${f.name} (${p.name})`, lat: p.lat, lng: p.lng, farm_id: f.id })),
    ]),
    ...lugaresItens.filter((x) => x.tipo === "place").map((x) => ({ label: `${x.name} — ${kindName(x.kind)}`, name: x.name, lat: x.lat, lng: x.lng, farm_id: undefined })),
  ], [farms, lugaresItens]);

  function usarLugar(x: any, como: "origin" | "dest") {
    setRota(null);
    if (como === "origin") setOrigin({ name: x.name, lat: x.lat, lng: x.lng, farm_id: x.farm_id });
    else { setDest({ name: x.name, kind: x.kind, lat: x.lat, lng: x.lng }); setDestName(x.name); setDestKind(PLACE_KINDS[x.kind] ? x.kind : "outro"); }
  }
  // Vindo da tela "Locais e mapa" (?dest=ID): já deixa o local escolhido como destino
  useEffect(() => {
    if (!carregado || !lugares || destParam.current) return;
    destParam.current = true;
    const id = new URLSearchParams(window.location.search).get("dest");
    const x = id ? lugaresItens.find((l) => l.id === id) : null;
    if (x) usarLugar(x, "dest");
  }, [carregado, lugares, lugaresItens]);

  const itens = useMemo(() => {
    const l: { key: string; i?: number; p: P; color: string }[] = [];
    if (origin) l.push({ key: "origin", p: origin, color: "#2F6B3F" });
    vias.forEach((v, i) => l.push({ key: "via", i, p: v, color: "#E07B00" }));
    if (dest) l.push({ key: "dest", p: dest, color: "#A32A1B" });
    return l;
  }, [origin, vias, dest]);
  const mapPts = useMemo(() => [
    ...itens.map((x) => ({ ...x.p, color: x.color, draggable: true })),
    ...reports.map((r) => ({ lat: r.lat, lng: r.lng, color: r.status === "validated" ? "#7A0F0F" : "#E0B000", title: `Aviso: ${r.kind.replace(/_/g, " ")}${r.note ? " — " + r.note : ""}` })),
    ...lugaresVis.map((x) => ({ lat: x.lat, lng: x.lng, color: x.fav ? "#F2B705" : x.tipo === "recent" ? "#6B7280" : kindColor(x.kind),
      title: [`${x.fav ? "★ " : ""}${x.name}`, `${kindName(x.kind)}${x.info ? " · " + x.info : ""}`, x.ref ?? "", x.phone ? `WhatsApp ${x.phone}` : ""].join("\n") })),
  ], [itens, reports, lugaresVis]);

  const invalida = () => setRota(null);
  function onClick(lng: number, lat: number) {
    invalida();
    if (mode === "origin") setOrigin({ lat, lng, name: "Local marcado no mapa" });
    else if (mode === "dest") setDest({ lat, lng, name: destName || "Destino", kind: destKind });
    else if (mode === "via") setVias((v) => [...v, { lat, lng }]);
    setMode(null);
  }
  // Toque num local salvo no mapa: escolhe como origem/destino se o modo "marcar no mapa" estiver ativo
  function onPointClick(idx: number) {
    const x = lugaresVis[idx - itens.length - reports.length];
    if (!x || !mode || mode === "via") return;
    usarLugar(x, mode); setMode(null);
  }
  function onDrag(idx: number, lng: number, lat: number) {
    invalida();
    const it = itens[idx];
    if (!it) return;
    if (it.key === "origin") setOrigin((o) => o && { ...o, lat, lng });
    else if (it.key === "dest") setDest((d) => d && { ...d, lat, lng });
    else setVias((v) => v.map((x, j) => (j === it.i ? { lat, lng } : x)));
  }

  const cur = cargoTypes.find((c) => c.code === cargo);
  const isAnimal = cargo === "bovinos" || !!cur?.has_animals;
  const unit = cur?.unit ?? "unidades";

  async function calcular() {
    setErro("");
    if (!origin || !dest) return setErro("Escolha a origem e o destino.");
    setCalc(true);
    const r = await post("/api/routes/calculate", { points: [origin, ...vias, dest].map((p) => [p.lng, p.lat]) });
    setCalc(false);
    if (!r.ok) return setErro(r.error ?? "Erro ao calcular a rota.");
    setRota(r.data);
  }

  async function publicar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErro("");
    if (!origin || !dest || !rota) return setErro("Calcule a rota antes de publicar.");
    const f = new FormData(e.currentTarget);
    const r = await post("/api/requests", {
      origin, dest: { ...dest, name: destName || dest.name, kind: destKind }, route: rota, cargo_type: cargo,
      items: items.map((i) => ({ description: i.description, quantity: Number(String(i.quantity).replace(",", ".")), weight_kg: i.weight_kg ? Number(i.weight_kg) : null })),
      animals: animals.map((a) => ({ category: a.category, quantity: Number(a.quantity), weight: a.weight ? Number(a.weight) : null })),
      date: f.get("date") || null, time: f.get("time") || null, urgent: f.get("urgent") === "on", flexible: f.get("flexible") === "on", notes: f.get("notes"),
    });
    if (!r.ok) return setErro(r.error ?? "Erro ao publicar.");
    try { localStorage.removeItem("ubp_draft_novo"); } catch { /* ok */ }
    window.location.href = `/painel/solicitacoes/${r.data.id}`;
  }

  return (
    <main className="larga">
      <h1>Novo transporte</h1>
      {cargoTypes.length > 1 && (
        <>
          <h2>O que vai ser transportado?</h2>
          <select aria-label="Tipo de carga" value={cargo} onChange={(e) => setCargo(e.target.value)}>
            {cargoTypes.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </>
      )}
      <h2>1. Origem</h2>
      <select aria-label="Origem" onChange={(e) => { invalida(); const o = opcoes[Number(e.target.value)]; if (o) setOrigin(o); }} defaultValue="">
        <option value="" disabled>Escolher fazenda ou ponto de embarque</option>
        {opcoes.map((o, i) => <option key={i} value={i}>{o.label}</option>)}
      </select>
      <div style={{ marginTop: 10 }}>
        <button type="button" className="btn sec peq" onClick={() => setMode("origin")}>Marcar no mapa</button>
        <button type="button" className="btn sec peq" onClick={async () => { try { const g = await gps(); invalida(); setOrigin({ ...g, name: "Minha posição" }); } catch (e: any) { setErro(e.message); } }}>Minha posição</button>
      </div>
      {origin && <p className="pequeno">Origem: {origin.name}</p>}

      <h2>2. Destino</h2>
      {gruposLugares.length > 0 && (
        <>
          <label htmlFor="ls">Escolher um local salvo</label>
          <select id="ls" value="" onChange={(e) => { const x = lugaresItens.find((l) => l.key === e.target.value); if (x) usarLugar(x, "dest"); }}>
            <option value="">Frigoríficos, leilões, confinamentos, favoritos...</option>
            {gruposLugares.map((g) => <optgroup key={g.label} label={g.label}>{g.itens.map((x) => <option key={x.key} value={x.key}>{x.name}{x.info && x.tipo !== "recent" ? ` — ${x.info}` : ""}</option>)}</optgroup>)}
          </select>
        </>
      )}
      <div className="linha2">
        <div><label htmlFor="dn">Nome do destino</label><input id="dn" value={destName} onChange={(e) => setDestName(e.target.value)} placeholder="ex.: Frigorífico X" /></div>
        <div><label htmlFor="dk">Tipo</label><select id="dk" value={destKind} onChange={(e) => setDestKind(e.target.value)}>{Object.entries(PLACE_KINDS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}</select></div>
      </div>
      <button type="button" className="btn sec peq" style={{ marginTop: 10 }} onClick={() => setMode("dest")}>Marcar destino no mapa</button>
      {dest && <p className="pequeno">Destino: {dest.name} ({kindName(dest.kind)})</p>}

      <h2>3. Rota</h2>
      <p className="pequeno">{mode ? `Toque no mapa para marcar: ${mode === "origin" ? "origem" : mode === "dest" ? "destino" : "ponto intermediário"}.` : "Arraste os pontos para ajustar. Adicione pontos intermediários para forçar a rota por outra estrada."}</p>
      <MapView points={mapPts} line={rota?.coordinates} onMapClick={onClick} onDrag={onDrag} onPointClick={onPointClick} height={380} />
      {lugaresItens.length > 0 && <label className="check"><input type="checkbox" checked={verLugares} onChange={(e) => setVerLugares(e.target.checked)} /><span>Mostrar no mapa os locais salvos (frigoríficos, leilões, minhas fazendas...). Toque num local para ver os dados; com “Marcar destino no mapa” ativo, o toque escolhe o local.</span></label>}
      <div style={{ marginTop: 10 }}>
        <button type="button" className="btn sec peq" onClick={() => setMode("via")}>+ Ponto intermediário</button>
        {vias.length > 0 && <button type="button" className="btn sec peq" onClick={() => { setVias([]); invalida(); }}>Limpar pontos</button>}
        <button type="button" className="btn peq" disabled={calc} onClick={calcular}>{calc ? "Calculando..." : rota ? "Recalcular rota" : "Calcular rota"}</button>
      </div>
      {rota && (
        <>
          <div className="resumo"><div><b>{km(rota.distance_m)}</b>total</div><div><b>{hm(rota.duration_s)}</b>tempo estimado</div><div><b>{rota.is_custom ? "Ajustada" : "Sugerida"}</b>rota</div></div>
          <div className="resumo"><div><b>{km(rota.paved_m)}</b>asfalto</div><div><b>{km(rota.unpaved_m)}</b>terra</div><div><b>{km(rota.unknown_m)}</b>sem informação</div></div>
          <p className="pequeno">Os pontos amarelos/vinho no mapa são avisos de estrada dos usuários (vinho = confirmado). Asfalto e terra vêm dos dados do OpenStreetMap, que no interior podem estar incompletos. “Sem informação” é o trecho sem dado de pavimento. Confira com quem conhece a estrada.</p>
        </>
      )}

      <form onSubmit={publicar}>
        <h2>4. {isAnimal ? "Animais" : "Carga"}</h2>
        {!isAnimal && (
          <>
            {items.map((it, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <input aria-label="O que é a carga" placeholder="ex.: Soja, trator, calcário" value={it.description} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} />
                <div className="linha2" style={{ marginTop: 8 }}>
                  <input aria-label={`Quantidade em ${unit}`} placeholder={`Quantidade (${unit})`} inputMode="decimal" value={it.quantity} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))} />
                  <input aria-label="Peso aproximado em kg" placeholder="Peso em kg (opcional)" inputMode="numeric" value={it.weight_kg} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, weight_kg: e.target.value } : x)))} />
                </div>
              </div>
            ))}
            <button type="button" className="btn sec peq" onClick={() => setItems([...items, { description: "", quantity: "", weight_kg: "" }])}>+ Outro item</button>
            {items.length > 1 && <button type="button" className="btn sec peq" onClick={() => setItems(items.slice(0, -1))}>Remover último</button>}
          </>
        )}
        {isAnimal && animals.map((a, i) => (
          <div key={i} className="linha2" style={{ marginBottom: 10 }}>
            <select aria-label="Categoria" value={a.category} onChange={(e) => setAnimals(animals.map((x, j) => (j === i ? { ...x, category: e.target.value } : x)))}>
              {Object.entries(CATEGORIES).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
            </select>
            <input aria-label="Quantidade" type="number" inputMode="numeric" min={1} value={a.quantity} onChange={(e) => setAnimals(animals.map((x, j) => (j === i ? { ...x, quantity: Number(e.target.value) } : x)))} />
          </div>
        ))}
        {isAnimal && <button type="button" className="btn sec peq" onClick={() => setAnimals([...animals, { category: "vaca", quantity: 1, weight: "" }])}>+ Outra categoria</button>}
        {isAnimal && animals.length > 1 && <button type="button" className="btn sec peq" onClick={() => setAnimals(animals.slice(0, -1))}>Remover última</button>}

        <h2>5. Data</h2>
        <div className="linha2"><div><label htmlFor="date">Data</label><input id="date" name="date" type="date" /></div><div><label htmlFor="time">Horário</label><input id="time" name="time" type="time" /></div></div>
        <label className="check"><input type="checkbox" name="urgent" /><span>É urgente</span></label>
        <label className="check"><input type="checkbox" name="flexible" /><span>Posso mudar a data se precisar</span></label>
        <label htmlFor="notes">Observações (curral, acesso, porteira...)</label><textarea id="notes" name="notes" />
        {erro && <div className="aviso erro" role="alert" style={{ marginTop: 14 }}>{erro}</div>}
        <button className="btn sol" type="submit" disabled={!rota} style={{ marginTop: 16 }}>Publicar transporte</button>
      </form>
    </main>
  );
}
