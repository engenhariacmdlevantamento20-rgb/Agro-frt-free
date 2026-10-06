"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { api, post, brl } from "@/lib/client";

export default function AdminPlanos() {
  const [plans, setPlans] = useState<any[]>([]);
  const [edit, setEdit] = useState<any | null>(null);
  const [erro, setErro] = useState("");
  const load = () => api("/api/admin/plans").then((r) => (r.ok ? setPlans(r.data) : setErro(r.error ?? "Sem permissão.")));
  useEffect(() => { load(); }, []);

  async function salvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget));
    const r = await post("/api/admin/plans", { ...f, id: edit?.id, active: f.active === "on" });
    if (!r.ok) return setErro(r.error ?? "Erro"); setEdit(null); setErro(""); load();
  }
  return (
    <main>
      <h1>Planos</h1>
      <p className="pequeno">Preços, período e limites ficam no banco: edite aqui, sem mexer no código. “Recursos” e “Limites” são JSON livre (ex.: {`{"veiculos": 5}`}).</p>
      {erro && <div className="aviso erro">{erro}</div>}
      {!edit && <button className="btn sol" onClick={() => setEdit({})}>Novo plano</button>}
      {edit && (
        <form onSubmit={salvar} key={edit.id ?? "novo"}>
          <label>Nome</label><input name="name" defaultValue={edit.name} required />
          <div className="linha2"><div><label>Preço (R$)</label><input name="price" inputMode="decimal" defaultValue={edit.price_cents ? edit.price_cents / 100 : 0} /></div>
          <div><label>Período (dias)</label><input name="interval_days" type="number" defaultValue={edit.interval_days ?? 30} /></div></div>
          <label>Recursos (JSON)</label><textarea name="features" defaultValue={JSON.stringify(edit.features ?? {})} />
          <label>Limites (JSON)</label><textarea name="limits" defaultValue={JSON.stringify(edit.limits ?? {})} />
          <label className="check"><input type="checkbox" name="active" defaultChecked={edit.active !== false} /><span>Plano ativo (visível para os usuários)</span></label>
          <button className="btn" type="submit">Salvar</button><button className="btn sec" type="button" onClick={() => setEdit(null)}>Cancelar</button>
        </form>
      )}
      {!edit && plans.map((p) => (
        <div key={p.id} className="item"><b>#{p.id} {p.name} {!p.active && <span className="tag">inativo</span>}</b>{brl(p.price_cents)} / {p.interval_days} dias
          <p><button className="btn sec peq" onClick={() => setEdit(p)}>Editar</button></p></div>
      ))}
    </main>
  );
}
