"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { api, post, gps } from "@/lib/client";
const MapView = dynamic(() => import("@/components/Map"), { ssr: false });

const KINDS: Record<string, string> = {
  estrada_interditada: "Estrada interditada", ponte_interditada: "Ponte interditada", estrada_ruim: "Estrada ruim",
  intransitavel_caminhao: "Intransitável para caminhão", atoleiro: "Atoleiro", acesso_bloqueado: "Acesso bloqueado",
  nova_estrada: "Estrada nova", porteira: "Porteira", ponto_perigoso: "Ponto perigoso", outro: "Outro",
};

export default function Avisos() {
  const [list, setList] = useState<any[]>([]);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [erro, setErro] = useState("");
  const load = () => api("/api/road-reports").then((r) => r.ok && setList(r.data));
  useEffect(() => { load(); }, []);
  const pts = useMemo(() => [
    ...list.map((r) => ({ lat: r.lat, lng: r.lng, color: r.status === "validated" ? "#A32A1B" : "#E07B00", title: KINDS[r.kind] })),
    ...(pos ? [{ ...pos, color: "#1E6FD9", title: "Novo aviso" }] : []),
  ], [list, pos]);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErro("");
    if (!pos) return setErro("Toque no mapa (ou use o GPS) para marcar o local.");
    const f = new FormData(e.currentTarget);
    const r = await post("/api/road-reports", { kind: f.get("kind"), note: f.get("note"), ...pos });
    if (!r.ok) return setErro(r.error ?? "Erro"); setPos(null); load();
  }
  async function confirmar(id: string) { const r = await post(`/api/road-reports/${id}/confirm`, {}); if (!r.ok) setErro(r.error ?? "Erro"); else load(); }

  return (
    <main className="larga">
      <h1>Avisos de estrada</h1>
      <p className="pequeno">Vermelho: confirmado por outros usuários. Laranja: aguardando confirmação.</p>
      <MapView points={pts} onMapClick={(lng, lat) => setPos({ lat, lng })} height={340} />
      <button className="btn sec peq" style={{ marginTop: 10 }} onClick={async () => { try { setPos(await gps()); } catch (e: any) { setErro(e.message); } }}>Usar minha posição</button>
      <form onSubmit={enviar}>
        <label>O que aconteceu?</label>
        <select name="kind">{Object.entries(KINDS).map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select>
        <label>Detalhe (opcional)</label><input name="note" />
        {erro && <div className="aviso erro" role="alert" style={{ marginTop: 14 }}>{erro}</div>}
        <button className="btn sol" type="submit" style={{ marginTop: 14 }}>Enviar aviso</button>
      </form>
      <h2>Avisos recentes</h2>
      {list.slice(0, 30).map((r) => (
        <div key={r.id} className="item"><b>{KINDS[r.kind]}</b><span className="tag">{r.status === "validated" ? "Confirmado" : "Aguardando"}</span><span className="tag">{r.confirmations} confirmações</span>
          {r.note && <p className="pequeno">{r.note}</p>}<button className="btn sec peq" onClick={() => confirmar(r.id)}>Também vi isso</button></div>
      ))}
    </main>
  );
}
