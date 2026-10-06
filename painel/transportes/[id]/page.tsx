"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { api, post, put, brl, km, hm, dataBr, zap, cargoResumo } from "@/lib/client";
import { STATUS_LABEL, FLOW } from "@/lib/flow";
const MapView = dynamic(() => import("@/components/Map"), { ssr: false });

const DOC_STATUS: Record<string, string> = { pending: "Pendente", sent: "Enviado", in_review: "Em análise", approved: "Aprovado", rejected: "Rejeitado", expired: "Vencido" };
const ATIVOS = ["scheduled", "arrived_origin", "loading", "in_transit", "arrived_dest"];
const FILA = "ubp_fila_posicoes";

export default function Transporte({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [t, setT] = useState<any>(null);
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);
  const watch = useRef<number | null>(null);
  const lastSent = useRef(0);

  const load = useCallback(() => api(`/api/transports/${id}`).then((r) => r.ok ? setT(r.data) : setErro(r.error ?? "Erro ao carregar.")), [id]);
  useEffect(() => { load(); }, [load]);

  // Rastreamento: envia a posição no intervalo configurado; sem sinal, guarda na fila do aparelho e envia depois.
  const enviarPosicao = useCallback(async (p: { lat: number; lng: number; speed_kmh: number | null; recorded_at: string }) => {
    const fila: any[] = JSON.parse(localStorage.getItem(FILA) || "[]");
    fila.push({ transport_id: id, ...p });
    const resto: any[] = [];
    for (const x of fila) { const r = await post("/api/tracking/position", x); if (!r.ok && /conexão/i.test(r.error ?? "")) resto.push(x); }
    localStorage.setItem(FILA, JSON.stringify(resto.slice(-500)));
  }, [id]);

  useEffect(() => {
    if (!t || t.my_role !== "transporter" || !t.tracking_active || !navigator.geolocation) return;
    watch.current = navigator.geolocation.watchPosition((pos) => {
      if (Date.now() - lastSent.current < (t.tracking_interval ?? 60) * 1000) return;
      lastSent.current = Date.now();
      enviarPosicao({ lat: pos.coords.latitude, lng: pos.coords.longitude, speed_kmh: pos.coords.speed != null ? pos.coords.speed * 3.6 : null, recorded_at: new Date().toISOString() });
    }, () => setErro("Permita o acesso à localização para compartilhar o rastreamento."), { enableHighAccuracy: true });
    return () => { if (watch.current != null) navigator.geolocation.clearWatch(watch.current); };
  }, [t, enviarPosicao]);

  const pts = useMemo(() => !t ? [] : [
    { lat: t.o_lat, lng: t.o_lng, color: "#1E3B2A", title: `Origem: ${t.origin_name}` },
    { lat: t.d_lat, lng: t.d_lng, color: "#A32A1B", title: `Destino: ${t.dest_name}` },
    ...(t.last_position ? [{ lat: t.last_position.lat, lng: t.last_position.lng, color: "#1E6FD9", title: `Caminhão (${new Date(t.last_position.recorded_at).toLocaleTimeString("pt-BR")})` }] : []),
  ], [t]);

  async function acao(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true); setErro("");
    const r = await fn();
    if (!r.ok) setErro(r.error ?? "Erro"); else await load();
    setBusy(false);
  }

  async function enviarDoc(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form); fd.set("transport_id", id);
    await acao(async () => { const r = await api("/api/documents", { method: "POST", body: fd }); if (r.ok) form.reset(); return r; });
  }

  async function avaliar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await acao(() => post("/api/ratings", { transport_id: id, overall: Number(f.get("overall")), comment: f.get("comment") }));
  }

  if (!t) return <main className="larga">{erro ? <div className="aviso erro">{erro}</div> : <p>Carregando...</p>}</main>;
  const step = FLOW[t.status];
  const podePassar = step && (step.who === "both" || t.my_role === "transporter");
  const encerrado = ["completed", "cancelled"].includes(t.status);

  return (
    <main className="larga">
      <Link href="/painel/transportes" className="pequeno">← Meus transportes</Link>
      <h1>{t.origin_name} → {t.dest_name}</h1>
      <span className="tag sol">{STATUS_LABEL[t.status]}</span><span className="tag">{t.cargo_name}</span><span className="tag">{brl(t.price_cents)}</span>
      <p>{cargoResumo(t)}</p>
      <p className="pequeno">
        Embarque: {dataBr(t.pickup_date)}{t.pickup_time ? ` às ${String(t.pickup_time).slice(0, 5)}` : ""}
        {t.distance_m ? ` · ${km(t.distance_m)} · ${hm(t.duration_s)}` : ""}
        {t.distance_m ? ` · asfalto ${km(t.paved_m)}, terra ${km(t.unpaved_m)}` : ""}
        {t.plate ? ` · Caminhão ${t.plate}${t.model ? " " + t.model : ""}` : ""}
      </p>
      {t.notes && <p className="pequeno">{t.notes}</p>}

      <MapView points={pts} line={t.trail?.length > 1 ? t.trail : t.coordinates} height={300} />
      {t.started_at && t.distance_m ? <p className="pequeno">Percorrido: {km(t.travelled_m)} · Falta cerca de {km(t.remaining_m)}</p> : null}

      <h2>{t.my_role === "producer" ? "Transportador" : "Produtor"}</h2>
      <div className="item">
        <b>{t.other?.name}{t.other?.verified ? " ✓ Verificado" : ""}</b>
        {t.other?.phone && <a className="btn sec peq" href={zap(t.other.phone, `Olá! Sobre o transporte ${t.origin_name} → ${t.dest_name}.`)}>WhatsApp</a>}
        <Link className="btn sec peq" href={`/painel/perfil/${t.other?.id}`}>Ver perfil</Link>
        <button className="btn sec peq" onClick={() => acao(() => post("/api/favorites", { user_id: t.other?.id }))}>{t.is_favorite ? "Remover de confiança" : "Marcar como de confiança"}</button>
      </div>

      {erro && <div className="aviso erro" role="alert">{erro}</div>}
      {podePassar && <button className="btn sol" disabled={busy} onClick={() => acao(() => put(`/api/transports/${id}/status`, { status: step.to }))}>{step.label}</button>}

      {t.my_role === "transporter" && ATIVOS.includes(t.status) && (
        t.tracking_active
          ? <><div className="aviso">Compartilhando sua localização. Mantenha o app aberto e a tela ligada.</div>
              <button className="btn sec" disabled={busy} onClick={() => acao(() => post("/api/tracking/stop", { transport_id: id }))}>Parar de compartilhar localização</button></>
          : <button className="btn" disabled={busy} onClick={() => acao(() => post("/api/tracking/start", { transport_id: id }))}>Compartilhar minha localização</button>
      )}
      {t.my_role === "producer" && t.tracking_active && <div className="aviso">Rastreamento ligado. {t.last_position ? `Última posição às ${new Date(t.last_position.recorded_at).toLocaleTimeString("pt-BR")}.` : "Aguardando a primeira posição."} <button className="btn sec peq" onClick={load}>Atualizar</button></div>}

      <h2>Documentos</h2>
      {t.documents.length === 0 && <p className="pequeno">Nenhum documento ainda.</p>}
      {t.documents.map((d: any) => (
        <div key={d.id} className="item">
          <b>{d.kind}{d.number ? ` nº ${d.number}` : ""}</b>
          <span className="tag">{DOC_STATUS[d.status] ?? d.status}</span>{d.valid_until && <span className="tag">Validade {dataBr(d.valid_until)}</span>}
          <div><a className="btn sec peq" href={`/api/documents/${d.id}`} target="_blank">Abrir {d.filename}</a>
            {d.uploader_id !== t.my_id && !["approved", "rejected"].includes(d.status) && <>
              <button className="btn sec peq" onClick={() => acao(() => put(`/api/documents/${d.id}`, { status: "approved" }))}>Aprovar</button>
              <button className="btn sec peq" onClick={() => acao(() => put(`/api/documents/${d.id}`, { status: "rejected" }))}>Rejeitar</button></>}
          </div>
        </div>
      ))}
      {!encerrado && (
        <form onSubmit={enviarDoc}>
          <div className="linha2">
            <div><label htmlFor="kind">Tipo (ex.: GTA, Nota Fiscal)</label><input id="kind" name="kind" required /></div>
            <div><label htmlFor="number">Número</label><input id="number" name="number" /></div>
          </div>
          <label htmlFor="valid_until">Validade</label><input id="valid_until" name="valid_until" type="date" />
          <label htmlFor="file">Arquivo (PDF, JPG ou PNG, até 5 MB)</label><input id="file" name="file" type="file" accept="application/pdf,image/jpeg,image/png" required />
          <button className="btn sec" type="submit" disabled={busy} style={{ marginTop: 12 }}>Enviar documento</button>
        </form>
      )}

      <h2>Andamento</h2>
      {t.events.map((ev: any, i: number) => <p key={i} className="pequeno">{new Date(ev.created_at).toLocaleString("pt-BR")} · {STATUS_LABEL[ev.status] ?? ev.status}</p>)}
      {t.events.length === 0 && <p className="pequeno">Transportador escolhido. Próximo passo: documentação e agendamento.</p>}

      {t.status === "completed" && (
        <>
          <h2>Avaliação</h2>
          {t.other_rating && <p className="pequeno">Você recebeu {t.other_rating.overall} estrelas{t.other_rating.comment ? `: “${t.other_rating.comment}”` : "."}</p>}
          {t.my_rating ? <p>Você deu {t.my_rating.overall} estrelas. Obrigado!</p> : (
            <form onSubmit={avaliar}>
              <label htmlFor="overall">Nota</label>
              <select id="overall" name="overall" defaultValue="5">{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)} ({n})</option>)}</select>
              <label htmlFor="comment">Comentário (opcional)</label><textarea id="comment" name="comment" />
              <button className="btn sol" type="submit" disabled={busy} style={{ marginTop: 12 }}>Enviar avaliação</button>
            </form>
          )}
        </>
      )}

      {!encerrado && <button className="btn sec" disabled={busy} style={{ marginTop: 24 }} onClick={() => { const reason = prompt("Motivo do cancelamento:"); if (reason !== null) acao(() => put(`/api/transports/${id}/status`, { status: "cancelled", reason })); }}>Cancelar transporte</button>}
    </main>
  );
}
