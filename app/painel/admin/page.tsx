"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { api, put, post, brl, dataBr, zap } from "@/lib/client";

const L: Record<string, string> = {
  users: "Usuários", producers: "Produtores", transporters: "Transportadores", trucks: "Caminhões", farms: "Fazendas",
  requests_open: "Solicitações abertas", transports_active: "Transportes ativos", transports_done: "Concluídos",
  transports_cancelled: "Cancelados", ratings: "Avaliações", in_trial: "Em período grátis",
  new_users_30d: "Novos (30 dias)", quotes_30d: "Propostas (30 dias)", active_subs: "Assinaturas ativas",
};
const SET: Record<string, string> = { trial_days: "Dias de teste grátis", tracking_interval_seconds: "Intervalo do rastreamento (segundos)", report_validate_threshold: "Confirmações para validar um aviso de estrada", tracking_retention_days: "Dias guardando a localização" };

export default function Admin() {
  const [s, setS] = useState<any>(null);
  const [erro, setErro] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [msgCob, setMsgCob] = useState("");
  const [zapCfg, setZapCfg] = useState<any>(null);
  const [msgZap, setMsgZap] = useState("");
  const loadPedidos = () => api("/api/admin/plan-requests").then((r) => r.ok && setPedidos(r.data));
  const load = () => api("/api/admin/stats").then((r) => (r.ok ? setS(r.data) : setErro(r.error ?? "Sem permissão.")));
  useEffect(() => { load(); loadPedidos(); api("/api/admin/logs").then((r) => r.ok && setLogs(r.data)); api("/api/admin/whatsapp").then((r) => r.ok && setZapCfg(r.data)); }, []);
  const conf = (k: string) => { const v = s?.settings.find((x: any) => x.key === k)?.value; return typeof v === "string" ? v : ""; };
  async function salvarCobranca(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMsgCob("");
    const f = new FormData(e.currentTarget);
    for (const key of ["admin_whatsapp", "pix_key", "pix_name"]) {
      const r = await put("/api/admin/settings", { key, value: f.get(key) });
      if (!r.ok) return setMsgCob(r.error ?? "Erro ao salvar.");
    }
    setMsgCob("Dados de cobrança salvos."); load();
  }
  async function decidir(p: any, action: "confirm" | "cancel") {
    if (action === "confirm" && !confirm(`Confirmar o pagamento de ${p.user_name} e ativar o plano ${p.plan_name}?`)) return;
    if (action === "cancel" && !confirm("Descartar este pedido?")) return;
    const r = await put("/api/admin/plan-requests", { id: p.id, action });
    if (!r.ok) setErro(r.error ?? "Erro"); else { setErro(""); loadPedidos(); load(); }
  }
  async function salvar(e: React.FormEvent<HTMLFormElement>, key: string) {
    e.preventDefault(); const v = new FormData(e.currentTarget).get("v");
    const r = await put("/api/admin/settings", { key, value: Number(v) }); if (!r.ok) setErro(r.error ?? "Erro"); else load();
  }
  if (!s) return <main>{erro ? <div className="aviso erro">{erro}</div> : <p>Carregando...</p>}</main>;
  return (
    <main className="larga">
      <h1>Administração</h1>
      <div className="grade">{Object.keys(L).map((k) => <div key={k} className="tile"><span><b style={{ fontSize: "1.6rem" }}>{s[k]}</b><small>{L[k]}</small></span></div>)}</div>
      <p>Receita registrada: <b>{(s.revenue_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b></p>
      <a className="btn sec peq" href="/painel/admin/usuarios">Usuários</a><a className="btn sec peq" href="/painel/admin/planos">Planos</a><a className="btn sec peq" href="/painel/admin/cargas">Tipos de carga</a><a className="btn sec peq" href="/painel/admin/locais">Locais e clientes</a>
      <p className="pequeno">Solicitações por carga: {(s.by_cargo ?? []).map((c: any) => `${c.name} ${c.n}`).join(" · ")}</p>
      <h2>Chave de rotas (HeiGIT / OpenRouteService)</h2>
      <p className="pequeno">{s.ors_configured ? "Configurada ✓" : "Ainda não configurada: sem ela o cálculo de rota não funciona."}</p>
      <form onSubmit={async (e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const r = await put("/api/admin/settings", { key: "ors_api_key", value: f.get("k") }); if (!r.ok) setErro(r.error ?? "Erro"); else { setErro(""); (e.target as HTMLFormElement).reset(); load(); } }}>
        <input name="k" type="password" autoComplete="off" placeholder="Cole a chave aqui" /><button className="btn" type="submit" style={{ marginTop: 10 }}>Salvar chave</button>
      </form>
      <h2>WhatsApp automático</h2>
      <p className="pequeno">{zapCfg?.configured ? `Configurado (modelo “${zapCfg.template}”). Os usuários ligam o recebimento em Conta e privacidade.` : "Ainda não configurado: faltam as variáveis WHATSAPP_TOKEN e WHATSAPP_PHONE_NUMBER_ID no Netlify (veja o README)."}</p>
      {zapCfg?.configured && <button className="btn sec peq" onClick={async () => { setMsgZap("Enviando..."); const r = await post("/api/admin/whatsapp", {}); setMsgZap(r.ok ? `Mensagem de teste enviada para ${r.data.to}.` : r.error ?? "Erro"); }}>Enviar mensagem de teste para mim</button>}
      {msgZap && <p className="pequeno" role="status">{msgZap}</p>}
      <h2 id="pedidos">Pedidos de plano {pedidos.length > 0 && <span className="tag sol">{pedidos.length}</span>}</h2>
      {pedidos.length === 0 && <p className="pequeno">Nenhum pedido aguardando pagamento.</p>}
      {pedidos.map((p) => (
        <div key={p.id} className="item">
          <b>{p.user_name} — {p.plan_name}</b>
          <span className="pequeno">{p.price_cents > 0 ? `${brl(p.price_cents)} · ${p.interval_days} dias` : "Preço a combinar"} · pedido em {dataBr(p.created_at)}</span>
          <p>
            <button className="btn peq" onClick={() => decidir(p, "confirm")}>Confirmar pagamento</button>
            {p.phone && <a className="btn sec peq" href={zap(p.phone, `Olá, ${p.user_name.split(" ")[0]}! Sobre o plano ${p.plan_name} do Agro Frete.`)} target="_blank">WhatsApp</a>}
            <button className="btn sec peq" onClick={() => decidir(p, "cancel")}>Descartar</button>
          </p>
        </div>
      ))}
      <h2>Dados de cobrança</h2>
      <form onSubmit={salvarCobranca}>
        <label htmlFor="admin_whatsapp">WhatsApp que recebe os pedidos de plano (com DDD)</label>
        <input id="admin_whatsapp" name="admin_whatsapp" type="tel" inputMode="tel" defaultValue={conf("admin_whatsapp")} placeholder="(62) 99999-9999" />
        <label htmlFor="pix_key">Chave PIX (aparece na página Meu plano)</label>
        <input id="pix_key" name="pix_key" defaultValue={conf("pix_key")} placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória" />
        <label htmlFor="pix_name">Nome do recebedor (opcional)</label>
        <input id="pix_name" name="pix_name" defaultValue={conf("pix_name")} />
        {msgCob && <div className="aviso" role="status" style={{ marginTop: 12 }}>{msgCob}</div>}
        <button className="btn" type="submit" style={{ marginTop: 12 }}>Salvar dados de cobrança</button>
      </form>
      <h2>Cobrança</h2>
      {(() => { const on = s.settings.find((x: any) => x.key === "enforce_paywall")?.value === true; return (
        <button className="btn sec" onClick={async () => { await put("/api/admin/settings", { key: "enforce_paywall", value: !on }); load(); }}>
          {on ? "Bloqueio após o teste: LIGADO (tocar para desligar)" : "Bloqueio após o teste: desligado (tocar para ligar)"}
        </button>); })()}
      <h2>Configurações</h2>
      {erro && <div className="aviso erro">{erro}</div>}
      {s.settings.filter((x: any) => SET[x.key]).map((x: any) => (
        <form key={x.key} onSubmit={(e) => salvar(e, x.key)}>
          <label>{SET[x.key]}</label><div className="linha2"><input name="v" type="number" defaultValue={Number(x.value)} /><button className="btn" type="submit">Salvar</button></div>
        </form>
      ))}
      <h2>Registro de atividades</h2>
      {logs.map((l) => <p key={l.id} className="pequeno">{new Date(l.created_at).toLocaleString("pt-BR")} — {l.action} {l.user_name ? `(${l.user_name})` : ""} {l.ip ?? ""}</p>)}
    </main>
  );
}
