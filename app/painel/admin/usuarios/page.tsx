"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { api, put, post, dataBr } from "@/lib/client";
import { isPhoneEmail } from "@/lib/pure";

export default function AdminUsuarios() {
  const [list, setList] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const load = (s = q) => api(`/api/admin/users?q=${encodeURIComponent(s)}`).then((r) => (r.ok ? setList(r.data) : setMsg(r.error ?? "Sem permissão.")));
  useEffect(() => { load(""); api("/api/admin/plans").then((r) => r.ok && setPlans(r.data)); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (id: string, action: string) => { await put("/api/admin/users", { id, action }); load(); };
  async function ativar(id: string) {
    const plan_id = prompt("ID do plano (veja em Planos):", String(plans[1]?.id ?? "")); if (!plan_id) return;
    const days = prompt("Dias de acesso (vazio = período padrão do plano):", "");
    const r = await post("/api/admin/subscriptions", { user_id: id, plan_id: Number(plan_id), days: days ? Number(days) : undefined });
    setMsg(r.ok ? "Plano ativado." : r.error ?? "Erro");
  }
  return (
    <main className="larga">
      <h1>Usuários</h1>
      <div className="linha2"><input aria-label="Buscar" placeholder="Nome, e-mail ou telefone" value={q} onChange={(e) => setQ(e.target.value)} /><button className="btn" onClick={() => load()}>Buscar</button></div>
      {msg && <div className="aviso">{msg}</div>}
      {list.map((u) => (
        <div key={u.id} className="item">
          <b>{u.name} {u.verified && <span className="tag sol">Verificado</span>}{u.status !== "active" && <span className="tag">{u.status}</span>}</b>
          <span className="pequeno">{isPhoneEmail(u.email) ? "sem e-mail (entra pelo WhatsApp)" : u.email} · {u.phone} · {u.roles.join(", ")} · desde {dataBr(u.created_at)} · {u.sub_status ?? "sem assinatura"}</span>
          <p>
            <button className="btn sec peq" onClick={() => act(u.id, u.verified ? "unverify" : "verify")}>{u.verified ? "Tirar selo" : "Verificar"}</button>
            <button className="btn sec peq" onClick={() => act(u.id, u.status === "blocked" ? "unblock" : "block")}>{u.status === "blocked" ? "Desbloquear" : "Bloquear"}</button>
            <button className="btn peq" onClick={() => ativar(u.id)}>Ativar plano</button>
          </p>
        </div>
      ))}
    </main>
  );
}
