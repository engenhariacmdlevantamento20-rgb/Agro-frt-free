"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { api, post, brl, dataBr, zap } from "@/lib/client";
import SairButton from "../SairButton";

export default function Plano() {
  const [d, setD] = useState<any>(null);
  const [erro, setErro] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [enviando, setEnviando] = useState<number | null>(null);
  const load = () => api("/api/plans").then((r) => r.ok && setD(r.data));
  useEffect(() => { load(); }, []);
  if (!d) return <main><p>Carregando...</p></main>;
  const s = d.subscription;
  const pendente = (id: number) => d.pending.some((p: any) => p.plan_id === id);

  async function quero(p: any) {
    setErro(""); setEnviando(p.id);
    // Abre a aba já no clique (o navegador do celular bloqueia janelas abertas depois de uma espera)
    const w = window.open("", "_blank");
    const r = await post("/api/plans/interest", { plan_id: p.id });
    setEnviando(null);
    if (!r.ok) { w?.close(); return setErro(r.error ?? "Erro ao registrar o pedido."); }
    if (r.data.whatsapp) {
      const url = zap(r.data.whatsapp, r.data.message);
      if (w) w.location.href = url; else window.location.href = url;
    } else {
      w?.close();
      setErro("Pedido registrado! O administrador foi avisado e vai entrar em contato.");
    }
    load();
  }

  async function copiar() {
    try { await navigator.clipboard.writeText(d.pix_key); setCopiado(true); setTimeout(() => setCopiado(false), 2500); } catch { /* sem permissão */ }
  }

  return (
    <main>
      <h1>Meu plano</h1>
      {d.blocked && (
        <div className="aviso erro" role="alert">
          <b>Seu período de teste expirou.</b> Escolha um plano abaixo para continuar usando o Agro Frete. Assim que o pagamento for confirmado, o acesso é liberado.
        </div>
      )}
      <div className="faixa">
        {!s && <b>Sem plano ativo.</b>}
        {s?.status === "trial" && <><b>Teste grátis</b> até {dataBr(s.trial_ends_at)}.</>}
        {s?.status === "active" && <><b>{s.plan_name ?? "Plano ativo"}</b>{s.current_period_end ? ` até ${dataBr(s.current_period_end)}` : ""}.</>}
        {s?.status === "expired" && <b>Seu período grátis terminou.</b>}
      </div>

      <h2>Planos disponíveis</h2>
      {d.plans.map((p: any) => (
        <div key={p.id} className="item">
          <b>{p.name}</b>
          <span>{p.price_cents > 0 ? `${brl(p.price_cents)} a cada ${p.interval_days} dias` : "Preço a combinar"}</span>
          {pendente(p.id) && <p className="pequeno" style={{ margin: "6px 0 0" }}>✓ Pedido enviado. Aguardando a confirmação do pagamento.</p>}
          <button className="btn sol" style={{ marginTop: 10 }} disabled={enviando === p.id} onClick={() => quero(p)}>
            {enviando === p.id ? "Abrindo WhatsApp..." : pendente(p.id) ? "Falar de novo no WhatsApp" : "Quero este plano"}
          </button>
        </div>
      ))}
      {erro && <div className="aviso" role="status">{erro}</div>}

      {d.pix_key && (
        <>
          <h2>Pagar com PIX</h2>
          <div className="item">
            <span className="pequeno">Chave PIX{d.pix_name ? ` · ${d.pix_name}` : ""}</span>
            <b style={{ fontSize: "1.15rem", wordBreak: "break-all", margin: "4px 0 8px" }}>{d.pix_key}</b>
            <button className="btn sec peq" onClick={copiar}>{copiado ? "Copiada ✓" : "Copiar chave"}</button>
          </div>
          <p className="pequeno">Faça o PIX no valor do plano e envie o comprovante pelo WhatsApp. O acesso é liberado assim que o administrador confirmar o pagamento.</p>
        </>
      )}
      {!d.pix_key && <p className="pequeno">Toque em "Quero este plano" para combinar o pagamento com a nossa equipe pelo WhatsApp.</p>}

      {d.payments.length > 0 && <><h2>Pagamentos</h2>{d.payments.map((p: any, i: number) => <p key={i} className="pequeno">{dataBr(p.created_at)} — {brl(p.amount_cents)} ({p.status === "paid" ? "pago" : p.status})</p>)}</>}
      {d.blocked && <SairButton />}
    </main>
  );
}
