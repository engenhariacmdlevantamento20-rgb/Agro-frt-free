"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { api, post, gps, zap } from "@/lib/client";
import { parseCoords } from "@/lib/pure";
import { PLACE_KINDS, kindColor, kindName } from "@/lib/places";
const MapView = dynamic(() => import("@/components/Map"), { ssr: false });

const VAZIO = { id: "", name: "", kind: "frigorifico", state_code: "", municipality_ibge: "", address_reference: "", phone: "", notes: "", active: true };

export default function AdminLocais() {
  const [d, setD] = useState<any>(null);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [f, setF] = useState<any>(VAZIO);
  const [ponto, setPonto] = useState<{ lat: number; lng: number } | null>(null);
  const [coord, setCoord] = useState("");
  const [states, setStates] = useState<any[]>([]);
  const [munis, setMunis] = useState<any[]>([]);
  const [verClientes, setVerClientes] = useState(true);
  const [busca, setBusca] = useState("");
  const [foco, setFoco] = useState<{ lat: number; lng: number } | null>(null);

  const load = () => api("/api/admin/places").then((r) => (r.ok ? setD(r.data) : setErro(r.error ?? "Sem permissão.")));
  useEffect(() => { load(); api("/api/states").then((r) => r.ok && setStates(r.data)); }, []);
  useEffect(() => { setMunis([]); if (f.state_code) api(`/api/municipalities?state=${f.state_code}`).then((r) => r.ok && setMunis(r.data)); }, [f.state_code]);

  const mudar = (k: string, v: any) => setF((s: any) => ({ ...s, [k]: v }));
  function setLoc(lat: number, lng: number) { setPonto({ lat, lng }); setCoord(`${lat.toFixed(6)}, ${lng.toFixed(6)}`); }
  function editar(p: any) {
    setF({ id: p.id, name: p.name, kind: p.kind, state_code: p.state_code ?? "", municipality_ibge: p.municipality_ibge ?? "", address_reference: p.address_reference ?? "", phone: p.phone ?? "", notes: p.notes ?? "", active: p.active });
    setLoc(p.lat, p.lng); setFoco({ lat: p.lat, lng: p.lng }); setMsg(""); setErro(""); window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function limpar() { setF(VAZIO); setPonto(null); setCoord(""); }
  function digitar(v: string) { setCoord(v); const c = parseCoords(v); if (c) setPonto(c); }

  async function salvar(e: React.FormEvent) {
    e.preventDefault(); setErro(""); setMsg("");
    if (!ponto) return setErro("Marque o local no mapa (toque no mapa) ou cole as coordenadas.");
    const r = await post("/api/admin/places", { ...f, id: f.id || undefined, municipality_ibge: f.municipality_ibge || null, state_code: f.state_code || null, lat: ponto.lat, lng: ponto.lng });
    if (!r.ok) return setErro(r.error ?? "Erro ao salvar.");
    setMsg("Local salvo."); limpar(); load();
  }
  async function alternar(p: any) {
    const r = await post("/api/admin/places", { ...p, municipality_ibge: p.municipality_ibge || null, active: !p.active });
    if (!r.ok) setErro(r.error ?? "Erro"); else load();
  }

  const pts = useMemo(() => {
    if (!d) return [];
    const base = d.places.filter((p: any) => p.active && p.id !== f.id).map((p: any) => ({ lat: p.lat, lng: p.lng, color: kindColor(p.kind), title: `${p.name}\n${kindName(p.kind)}` }));
    const cl = verClientes ? d.clients.map((c: any) => ({ lat: c.lat, lng: c.lng, color: "#2F6B3F", title: `${c.farm}\nCliente: ${c.owner}${c.phone ? "\nWhatsApp " + c.phone : ""}` })) : [];
    // o ponto em edição fica por último (índice conhecido) e pode ser arrastado
    return [...base, ...cl, ...(ponto ? [{ lat: ponto.lat, lng: ponto.lng, color: "#F2B705", draggable: true, title: f.name || "Novo local" }] : [])];
  }, [d, verClientes, ponto, f.id, f.name]);
  const iPonto = pts.length - 1;

  const clientes = (d?.clients ?? []).filter((c: any) => !busca || `${c.farm} ${c.owner} ${c.phone}`.toLowerCase().includes(busca.toLowerCase()));

  if (!d) return <main>{erro ? <div className="aviso erro">{erro}</div> : <p>Carregando...</p>}</main>;
  return (
    <main className="larga">
      <h1>Locais e clientes</h1>
      <p className="pequeno">Cadastre frigoríficos, matadouros, leilões, confinamentos e outros pontos: eles aparecem para todos os usuários no mapa, na tela “Locais e mapa” e na escolha de origem e destino. As fazendas cadastradas pelos usuários ficam aqui como banco de clientes.</p>
      {erro && <div className="aviso erro" role="alert">{erro}</div>}
      {msg && <div className="aviso">{msg}</div>}

      <h2>{f.id ? "Editar local" : "Novo local"}</h2>
      <p className="pequeno">Toque no mapa para marcar o local (arraste o ponto amarelo para ajustar). Use o modo Híbrido para enxergar a estrada e a porteira.</p>
      <MapView points={pts} focus={foco} onMapClick={setLoc} onDrag={(i, lng, lat) => { if (i === iPonto) setLoc(lat, lng); }} height={380} />
      <form onSubmit={salvar}>
        <label htmlFor="n">Nome</label><input id="n" value={f.name} onChange={(e) => mudar("name", e.target.value)} required placeholder="ex.: Frigorífico Boi Forte — Unidade Goiânia" />
        <div className="linha2">
          <div><label htmlFor="t">Tipo</label><select id="t" value={f.kind} onChange={(e) => mudar("kind", e.target.value)}>{Object.entries(PLACE_KINDS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}</select></div>
          <div><label htmlFor="c">Coordenadas (lat, lng)</label><input id="c" value={coord} onChange={(e) => digitar(e.target.value)} placeholder="-16.6800, -49.2500" inputMode="text" /></div>
        </div>
        <button type="button" className="btn sec peq" style={{ marginTop: 10 }} onClick={async () => { try { const g = await gps(); setLoc(g.lat, g.lng); setFoco(g); } catch (e: any) { setErro(e.message); } }}>Usar minha posição</button>
        <div className="linha2">
          <div><label htmlFor="uf">Estado</label><select id="uf" value={f.state_code} onChange={(e) => { mudar("state_code", e.target.value); mudar("municipality_ibge", ""); }}><option value="">—</option>{states.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}</select></div>
          <div><label htmlFor="m">Município</label><select id="m" value={f.municipality_ibge} onChange={(e) => mudar("municipality_ibge", e.target.value)} disabled={!munis.length}><option value="">—</option>{munis.map((m) => <option key={m.ibge_code} value={m.ibge_code}>{m.name}</option>)}</select></div>
        </div>
        <label htmlFor="r">Referência / como chegar</label><input id="r" value={f.address_reference} onChange={(e) => mudar("address_reference", e.target.value)} placeholder="ex.: km 12 da BR-153, entrada à direita" />
        <label htmlFor="p">WhatsApp do local (opcional)</label><input id="p" value={f.phone} onChange={(e) => mudar("phone", e.target.value)} inputMode="tel" placeholder="5562999999999" />
        <label htmlFor="o">Observações (horário, exigências, balança...)</label><textarea id="o" value={f.notes} onChange={(e) => mudar("notes", e.target.value)} />
        <button className="btn sol" type="submit" style={{ marginTop: 14 }}>{f.id ? "Salvar alterações" : "Adicionar local"}</button>
        {f.id && <button type="button" className="btn sec" style={{ marginTop: 10 }} onClick={limpar}>Cancelar edição</button>}
      </form>

      <h2>Locais cadastrados ({d.places.length})</h2>
      {d.places.length === 0 && <p className="pequeno">Nenhum local ainda.</p>}
      {d.places.map((p: any) => (
        <div key={p.id} className="item">
          <b>{p.name} {!p.active && <span className="tag">desativado</span>}</b>
          <span className="tag">{kindName(p.kind)}</span>{p.state_code && <span className="tag">{p.state_code}</span>}<span className="tag">★ {p.favorites}</span>
          <p style={{ margin: "10px 0 0" }}>
            <button className="btn sec peq" onClick={() => editar(p)}>Editar / ajustar no mapa</button>
            <button className="btn sec peq" onClick={() => alternar(p)}>{p.active ? "Desativar" : "Ativar"}</button>
          </p>
        </div>
      ))}

      {d.suggestions.length > 0 && (
        <>
          <h2>Destinos usados nos transportes e ainda não salvos</h2>
          <p className="pequeno">Pontos que os produtores marcaram à mão. Toque em “Salvar como local” para conferir a posição e cadastrar.</p>
          {d.suggestions.map((s: any, i: number) => (
            <div key={i} className="item"><b>{s.name}</b><span className="tag">{kindName(s.kind)}</span><span className="tag">usado {s.uses}x</span>
              <p style={{ margin: "10px 0 0" }}><button className="btn sec peq" onClick={() => { setF({ ...VAZIO, name: s.name, kind: PLACE_KINDS[s.kind] ? s.kind : "outro" }); setLoc(s.lat, s.lng); setFoco({ lat: s.lat, lng: s.lng }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Salvar como local</button></p></div>
          ))}
        </>
      )}

      <h2>Banco de clientes ({d.clients.length} fazendas)</h2>
      <label className="check"><input type="checkbox" checked={verClientes} onChange={(e) => setVerClientes(e.target.checked)} /><span>Mostrar as fazendas dos clientes no mapa (verde)</span></label>
      <a className="btn sec peq" href="/api/admin/places?csv=clients">Baixar planilha (CSV)</a>
      <input aria-label="Buscar cliente" placeholder="Buscar por fazenda, nome ou telefone" value={busca} onChange={(e) => setBusca(e.target.value)} style={{ marginBottom: 12 }} />
      {clientes.map((c: any) => (
        <div key={c.id} className="item">
          <b>{c.farm}</b>
          <span className="pequeno">{c.owner}{c.state_code ? ` · ${[c.municipality, c.state_code].filter(Boolean).join(" - ")}` : ""} · {c.transports} transporte(s)</span>
          <p style={{ margin: "10px 0 0" }}>
            <button className="btn sec peq" onClick={() => { setFoco({ lat: c.lat, lng: c.lng }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Ver no mapa</button>
            {c.phone && <a className="btn sec peq" href={zap(c.phone)} target="_blank">WhatsApp</a>}
          </p>
        </div>
      ))}
    </main>
  );
}
