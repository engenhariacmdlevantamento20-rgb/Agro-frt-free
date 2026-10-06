"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { api, post } from "@/lib/client";

export default function AdminCargas() {
  const [list, setList] = useState<any[]>([]);
  const [erro, setErro] = useState("");
  const load = () => api("/api/admin/cargo-types").then((r) => (r.ok ? setList(r.data) : setErro(r.error ?? "Sem permissão.")));
  useEffect(() => { load(); }, []);

  async function salvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    const r = await post("/api/admin/cargo-types", { name: f.get("name"), unit: f.get("unit"), sort: Number(f.get("sort") || 100) });
    if (!r.ok) return setErro(r.error ?? "Erro"); (e.target as HTMLFormElement).reset(); setErro(""); load();
  }
  const alternar = async (c: any) => { await post("/api/admin/cargo-types", { ...c, active: !c.active }); load(); };

  return (
    <main>
      <h1>Tipos de carga</h1>
      <p className="pequeno">Desative um tipo para ele sumir do app. Bovinos é o núcleo e não pode ser desativado. Tipos novos usam descrição livre + quantidade na unidade escolhida.</p>
      {erro && <div className="aviso erro">{erro}</div>}
      {list.map((c) => (
        <div key={c.code} className="item"><b>{c.name} {!c.active && <span className="tag">desativado</span>}</b><span className="pequeno">unidade: {c.unit} · {c.has_animals ? "usa categorias de animais" : "descrição livre"}</span>
          {c.code !== "bovinos" && <p><button className="btn sec peq" onClick={() => alternar(c)}>{c.active ? "Desativar" : "Ativar"}</button></p>}</div>
      ))}
      <h2>Novo tipo de carga</h2>
      <form onSubmit={salvar}>
        <label>Nome</label><input name="name" required placeholder="ex.: Calcário" />
        <label>Unidade</label><input name="unit" required placeholder="ex.: toneladas" />
        <label>Ordem na lista</label><input name="sort" type="number" defaultValue={50} />
        <button className="btn sol" type="submit" style={{ marginTop: 14 }}>Adicionar</button>
      </form>
    </main>
  );
}
