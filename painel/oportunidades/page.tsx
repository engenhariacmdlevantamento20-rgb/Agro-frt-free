"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { api, post, brl, km, hm, zap, dataBr, gps, cargoResumo } from "@/lib/client";
import { CATEGORIES } from "@/lib/flow";
import { haversine } from "@/lib/pure";
import StartPicker, { type Start } from "@/components/StartPicker";
import ProfitCalculator from "@/components/ProfitCalculator";

export default function Oportunidades() {
  const [list, setList] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [raio, setRaio] = useState("");
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  // Km do motorista: de onde ele está (ou vai estar) até o embarque, e do embarque ao desembarque
  const [start, setStart] = useState<Start | null>(null);
  const [calcOpen, setCalcOpen] = useState<string | null>(null);
  const [volta, setVolta] = useState(false);
  const [legs, setLegs] = useState<any>(null);
  const [legsErro, setLegsErro] = useState("");
  const [calculando, setCalculando] = useState(false);
  const [preco, setPreco] = useState<Record<string, string>>({});

  const [cargoTypes, setCargoTypes] = useState<any[]>([]);
  const [cargo, setCargo] = useState("");
  async function load(extra = "") {
    const p = new URLSearchParams(extra.replace(/^\?/, ""));
    if (cargo) p.set("cargo", cargo);
    const r = await api(`/api/requests?${p}`); if (r.ok) setList(r.data);
  }
  useEffect(() => { api("/api/trucks").then((r) => r.ok && setTrucks(r.data)); api("/api/cargo-types").then((r) => r.ok && setCargoTypes(r.data)); }, []);
  useEffect(() => { load(); }, [cargo]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!calcOpen || !start) { setLegs(null); return; }
    let vivo = true;
    setLegs(null); setCalculando(true); setLegsErro("");
    post("/api/driver/legs", { request_id: calcOpen, from: { lat: start.lat, lng: start.lng }, include_back: volta }).then((r) => {
      if (!vivo) return;
      setCalculando(false);
      if (r.ok) setLegs(r.data); else { setLegs(null); setLegsErro(r.error ?? "Não foi possível calcular os km."); }
    });
    return () => { vivo = false; };
  }, [calcOpen, start, volta]);
  const kmReta = (r: any) => (start && r.o_lat != null ? Math.round(haversine([start.lng, start.lat], [r.o_lng, r.o_lat]) / 1000) : null);

  async function filtrar() {
    setErro("");
    if (!raio) return load();
    try { const g = await gps(); load(`?lat=${g.lat}&lng=${g.lng}&km=${raio}`); } catch (e: any) { setErro(e.message); }
  }
  async function enviar(e: React.FormEvent<HTMLFormElement>, rid: string) {
    e.preventDefault(); setErro(""); setMsg("");
    const f = new FormData(e.currentTarget);
    const r = await post("/api/quotes", { request_id: rid, truck_id: f.get("truck") || null, price: Number(String(f.get("price")).replace(",", ".")), eta_note: f.get("eta"), note: f.get("note") });
    if (!r.ok) return setErro(r.error ?? "Erro ao enviar.");
    setMsg("Proposta enviada."); setOpen(null); load();
  }

  return (
    <main className="larga">
      <h1>Oportunidades</h1>
      {cargoTypes.length > 1 && (
        <select aria-label="Tipo de carga" value={cargo} onChange={(e) => setCargo(e.target.value)} style={{ marginBottom: 10 }}>
          <option value="">Todas as cargas</option>{cargoTypes.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
      )}
      <StartPicker value={start} onChange={(s) => { setStart(s); setLegs(null); }} />
      <div className="linha2" style={{ marginTop: 16 }}>
        <select aria-label="Distância da minha posição" value={raio} onChange={(e) => setRaio(e.target.value)}>
          <option value="">Todas as regiões</option><option value="50">Até 50 km de mim</option><option value="100">Até 100 km de mim</option><option value="200">Até 200 km de mim</option>
        </select>
        <button className="btn sec" onClick={filtrar}>Filtrar</button>
      </div>
      {msg && <div className="aviso">{msg}</div>}{erro && <div className="aviso erro" role="alert">{erro}</div>}
      {list.length === 0 && <p>Nenhuma carga publicada no momento.</p>}
      {list.map((r) => (
        <div key={r.id} className="item">
          <b>{r.origin_name} → {r.dest_name}</b>
          {r.urgent && <span className="tag sol">Urgente</span>}<span className="tag">{dataBr(r.pickup_date)}</span>
          <p style={{ margin: "8px 0" }}><span className="tag">{r.cargo_name}</span> {cargoResumo(r)}</p>
          {kmReta(r) != null && <p className="pequeno">Você está a cerca de {kmReta(r)} km do embarque (em linha reta).</p>}
          {r.distance_m && <p className="pequeno">{km(r.distance_m)} ({km(r.paved_m)} asfalto, {km(r.unpaved_m)} terra) · {hm(r.duration_s)}</p>}
          <p className="pequeno">{r.producer_name}{r.producer_rating ? ` · ★ ${r.producer_rating}` : ""}</p>
          {r.notes && <p className="pequeno">{r.notes}</p>}
          {r.producer_phone && <a className="btn sec peq" href={zap(r.producer_phone, "Olá! Vi sua carga no Agro Frete.")}>WhatsApp</a>}
          <button className="btn sec peq" onClick={() => setCalcOpen(calcOpen === r.id ? null : r.id)}>{calcOpen === r.id ? "Fechar cálculo" : "Calcular km e lucro"}</button>
          <button className="btn peq" onClick={() => setOpen(open === r.id ? null : r.id)}>{r.my_quote_cents ? `Minha proposta: ${brl(r.my_quote_cents)}` : "Enviar proposta"}</button>
          {calcOpen === r.id && (
            <div>
              <h2 style={{ marginTop: 14 }}>Km deste transporte</h2>
              {!start && <div className="aviso">Escolha acima de onde você sai (ou onde vai estar) para somar o km até o embarque. Sem isso, só entra o km do embarque ao desembarque.</div>}
              {start && (
                <>
                  <label className="check" style={{ margin: "8px 0" }}><input type="checkbox" checked={volta} onChange={(e) => setVolta(e.target.checked)} /><span>Contar também a volta, vazio, até {start.label}</span></label>
                  {calculando && <p className="pequeno">Calculando os km...</p>}
                  {legsErro && <div className="aviso erro" role="alert">{legsErro}</div>}
                  {legs && !calculando && (
                    <>
                      <div className="resumo">
                        <div><b>{km(legs.to_pickup.distance_m)}</b>até o embarque</div>
                        <div><b>{km(legs.loaded.distance_m)}</b>carregado</div>
                        <div><b>{km(legs.total_m)}</b>{legs.back ? "total com volta" : "total"}</div>
                      </div>
                      <p className="pequeno">Saindo de {start.label}: {km(legs.to_pickup.distance_m)} ({hm(legs.to_pickup.duration_s)}) até {r.origin_name}, depois {km(legs.loaded.distance_m)} até {r.dest_name}{legs.back ? `, e ${km(legs.back.distance_m)} de volta` : ""}.</p>
                      {legs.any_estimate && <p className="pequeno">Parte da distância é estimada em linha reta (o cálculo por estrada não respondeu ou ainda não foi configurado pelo administrador). Confira antes de fechar.</p>}
                    </>
                  )}
                </>
              )}
              <ProfitCalculator
                legs={legs ? { empty: legs.to_pickup.distance_m / 1000, loaded: legs.loaded.distance_m / 1000, back: (legs.back?.distance_m ?? 0) / 1000 } : { empty: 0, loaded: (r.distance_m ?? 0) / 1000, back: 0 }}
                onUsePrice={(v) => { setPreco((p) => ({ ...p, [r.id]: String(v).replace(".", ",") })); setOpen(r.id); }} />
            </div>
          )}
          {open === r.id && (
            <form onSubmit={(e) => enviar(e, r.id)}>
              <label>Valor do frete (R$)</label><input name="price" inputMode="decimal" required value={preco[r.id] ?? ""} onChange={(e) => setPreco((p) => ({ ...p, [r.id]: e.target.value }))} />
              <label>Caminhão</label>
              <select name="truck"><option value="">Escolher depois</option>{trucks.filter((t) => (t.cargo_types ?? ["bovinos"]).includes(r.cargo_type)).map((t) => <option key={t.id} value={t.id}>{t.plate} · {[t.capacity_heads && `${t.capacity_heads} cabeças`, t.capacity_tons && `${Number(t.capacity_tons)} t`].filter(Boolean).join(" · ")}</option>)}</select>
              <label>Quando posso ir</label><input name="eta" placeholder="ex.: sexta de manhã" />
              <label>Observação</label><input name="note" />
              <button className="btn sol" type="submit" style={{ marginTop: 14 }}>Enviar proposta</button>
            </form>
          )}
        </div>
      ))}
    </main>
  );
}
