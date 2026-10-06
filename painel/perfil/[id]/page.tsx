"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, use } from "react";
import { api, post, zap } from "@/lib/client";

export default function Perfil({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [u, setU] = useState<any>(null);
  const [erro, setErro] = useState("");
  const load = () => api(`/api/users/${id}`).then((r) => (r.ok ? setU(r.data) : setErro(r.error ?? "Erro")));
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!u) return <main>{erro ? <div className="aviso erro">{erro}</div> : <p>Carregando...</p>}</main>;
  return (
    <main>
      <h1>{u.name}</h1>
      <p>{u.verified && <span className="tag sol">Verificado</span>}<span className="tag">{u.roles.includes("transporter") ? "Transportador" : "Produtor"}</span></p>
      <div className="resumo"><div><b>{u.rating ? `★ ${u.rating}` : "—"}</b>{u.rating_count} avaliações</div><div><b>{u.done_count}</b>transportes</div><div><b>{new Date(u.created_at).getFullYear()}</b>no app desde</div></div>
      {!u.is_me && <button className="btn sec" onClick={async () => { await post("/api/favorites", { user_id: id }); load(); }}>{u.is_favorite ? "★ De confiança (remover)" : "☆ Marcar como de confiança"}</button>}
      {!u.is_me && u.phone && <a className="btn" href={zap(u.phone)}>Chamar no WhatsApp</a>}
      {u.is_me && <a className="btn sec" href="/painel/conta">Privacidade e conta</a>}
      <h2>Avaliações</h2>
      {u.reviews.length === 0 && <p className="pequeno">Ainda sem avaliações.</p>}
      {u.reviews.map((r: any, i: number) => <div key={i} className="item"><b>{"★".repeat(r.overall)}</b>{r.comment && <span>{r.comment}</span>}<span className="pequeno">{r.rater_name} · {new Date(r.created_at).toLocaleDateString("pt-BR")}</span></div>)}
    </main>
  );
}
