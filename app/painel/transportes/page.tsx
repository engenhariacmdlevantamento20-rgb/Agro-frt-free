"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, brl, dataBr, km } from "@/lib/client";
import { STATUS_LABEL } from "@/lib/flow";

export default function Transportes() {
  const [reqs, setReqs] = useState<any[]>([]);
  const [trs, setTrs] = useState<any[]>([]);
  const [hist, setHist] = useState(false);
  useEffect(() => {
    api("/api/requests?scope=mine").then((r) => r.ok && setReqs(r.data));
    api("/api/transports").then((r) => r.ok && setTrs(r.data));
  }, []);
  const done = (s: string) => ["completed", "cancelled"].includes(s);
  const trList = trs.filter((t) => done(t.status) === hist);
  const reqList = hist ? [] : reqs.filter((r) => !r.transport_id && r.status === "published");

  return (
    <main className="larga">
      <h1>{hist ? "Histórico" : "Meus transportes"}</h1>
      <button className="btn sec peq" onClick={() => setHist(!hist)}>{hist ? "Ver ativos" : "Ver histórico"}</button>
      {reqList.map((r) => (
        <Link key={r.id} href={`/painel/solicitacoes/${r.id}`} className="item">
          <b>{r.origin_name} → {r.dest_name}</b>
          <span className="tag sol">Recebendo propostas</span><span className="tag">{r.quotes_count} propostas</span><span className="tag">{r.cargo_name}: {r.heads ? `${r.heads} cabeças` : `${Number(r.items_qty)} ${r.cargo_unit}`}</span>
          <span className="pequeno"> {r.distance_m ? km(r.distance_m) : ""} {dataBr(r.pickup_date)}</span>
        </Link>
      ))}
      {trList.map((t) => (
        <Link key={t.id} href={`/painel/transportes/${t.id}`} className="item">
          <b>{t.origin_name} → {t.dest_name}</b>
          <span className="tag sol">{STATUS_LABEL[t.status]}</span><span className="tag">{t.cargo_name}</span><span className="tag">{t.my_role === "producer" ? "Transportador" : "Produtor"}: {t.other_name}</span>
          <span className="pequeno"> {brl(t.price_cents)} {t.distance_m ? "· " + km(t.distance_m) : ""}</span>
          {t.my_role === "producer" && done(t.status) && <span className="btn sec peq" role="link" style={{ marginTop: 8 }} onClick={(e) => { e.preventDefault(); window.location.href = `/painel/transportes/novo?from=${t.request_id}`; }}>Repetir transporte</span>}
        </Link>
      ))}
      {!reqList.length && !trList.length && <p>Nada por aqui ainda.</p>}
    </main>
  );
}
