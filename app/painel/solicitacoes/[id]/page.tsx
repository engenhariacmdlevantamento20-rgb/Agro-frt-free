"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState, use } from "react";
import dynamic from "next/dynamic";
import { api, post, brl, km, hm, zap, dataBr, cargoResumo } from "@/lib/client";
import { CATEGORIES } from "@/lib/flow";
const MapView = dynamic(() => import("@/components/Map"), { ssr: false });

export default function Solicitacao({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [r, setR] = useState<any>(null);
  const [erro, setErro] = useState("");
  const load = () => api(`/api/requests/${id}`).then((x) => (x.ok ? setR(x.data) : setErro(x.error ?? "Erro")));
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const pts = useMemo(() => r ? [{ lat: r.o_lat, lng: r.o_lng, color: "#2F6B3F" }, { lat: r.d_lat, lng: r.d_lng, color: "#A32A1B" }] : [], [r]);
  if (!r) return <main>{erro ? <div className="aviso erro">{erro}</div> : <p>Carregando...</p>}</main>;

  async function aceitar(qid: string) {
    if (!confirm("Escolher esta proposta? As outras serão recusadas.")) return;
    const x = await post(`/api/quotes/${qid}/accept`, {});
    if (x.ok) window.location.href = `/painel/transportes/${x.data.transport_id}`; else setErro(x.error ?? "Erro");
  }

  return (
    <main className="larga">
      <h1>{r.origin_name} → {r.dest_name}</h1>
      <p><span className="tag">{r.cargo_name}</span> {cargoResumo(r)} · {dataBr(r.pickup_date)} {r.urgent && <span className="tag sol">Urgente</span>}</p>
      <MapView points={pts} line={r.coordinates} height={280} />
      <div className="resumo"><div><b>{km(r.distance_m)}</b>total</div><div><b>{km(r.paved_m)}</b>asfalto</div><div><b>{km(r.unpaved_m)}</b>terra</div></div>
      <p className="pequeno">Tempo estimado {hm(r.duration_s)}{r.is_custom ? " · rota ajustada pelo produtor" : ""}</p>
      {erro && <div className="aviso erro" role="alert">{erro}</div>}
      {r.transport_id && <a className="btn" href={`/painel/transportes/${r.transport_id}`}>Abrir transporte</a>}

      <h2>Propostas</h2>
      {r.quotes.length === 0 && <p>Ainda sem propostas. Avisaremos quando chegar uma.</p>}
      {r.quotes.map((q: any) => (
        <div key={q.id} className="item">
          <b>{brl(q.price_cents)} — {q.transporter_name}</b>
          <span className="tag">{q.rating ? `★ ${q.rating} (${q.rating_count})` : "Sem avaliações"}</span><span className="tag">{q.done_count} transportes</span>
          {q.plate && <p className="pequeno">{q.truck_type} {q.model} · {q.plate} · {q.capacity_heads} cabeças</p>}
          {q.eta_note && <p className="pequeno">Disponibilidade: {q.eta_note}</p>}{q.note && <p className="pequeno">{q.note}</p>}
          {q.transporter_phone && <a className="btn sec peq" href={zap(q.transporter_phone, "Olá! Vi sua proposta no Agro Frete.")}>Chamar no WhatsApp</a>}
          {r.status === "published" && q.status === "pending" && <button className="btn peq" onClick={() => aceitar(q.id)}>Escolher este</button>}
          {q.status === "accepted" && <span className="tag sol">Escolhida</span>}
        </div>
      ))}
    </main>
  );
}
