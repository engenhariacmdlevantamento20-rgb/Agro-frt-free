"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { hydrateSession, logout, updateUser } from "@netlify/identity";
import { api, put } from "@/lib/client";

type Msg = { tipo: "ok" | "erro"; texto: string } | null;
const Aviso = ({ m }: { m: Msg }) => m && <div className={m.tipo === "erro" ? "aviso erro" : "aviso"} role={m.tipo === "erro" ? "alert" : "status"}>{m.texto}</div>;

export default function Conta() {
  const [me, setMe] = useState<any>(null);
  const [erro, setErro] = useState("");
  const [mDados, setMDados] = useState<Msg>(null);
  const [mEmail, setMEmail] = useState<Msg>(null);
  const [mSenha, setMSenha] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);
  const load = () => api("/api/me").then((r) => r.ok && setMe(r.data));
  useEffect(() => { load(); }, []);
  if (!me) return <main><p>Carregando...</p></main>;

  async function salvarDados(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMDados(null); setBusy(true);
    const f = new FormData(e.currentTarget);
    const r = await put("/api/me", { name: f.get("name"), phone: f.get("phone") });
    setBusy(false);
    if (!r.ok) return setMDados({ tipo: "erro", texto: r.error ?? "Erro ao salvar." });
    setMDados({ tipo: "ok", texto: "Dados atualizados." }); load();
  }

  async function trocarEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMEmail(null); setBusy(true);
    const email = String(new FormData(e.currentTarget).get("email")).trim().toLowerCase();
    try {
      await hydrateSession();
      await updateUser({ email });
      setMEmail({ tipo: "ok", texto: `Enviamos um link para ${email}. Abra o e-mail e clique no link (com o app logado) para confirmar a troca.` });
    } catch (x) { setMEmail({ tipo: "erro", texto: (x as Error).message || "Não foi possível trocar o e-mail." }); }
    setBusy(false);
  }

  async function trocarSenha(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMSenha(null);
    const form = e.currentTarget;
    const f = new FormData(form);
    const password = String(f.get("password"));
    if (password.length < 8) return setMSenha({ tipo: "erro", texto: "A senha precisa ter pelo menos 8 caracteres." });
    if (password !== String(f.get("password2"))) return setMSenha({ tipo: "erro", texto: "As duas senhas não são iguais." });
    setBusy(true);
    try { await hydrateSession(); await updateUser({ password }); form.reset(); setMSenha({ tipo: "ok", texto: "Senha alterada." }); }
    catch { setMSenha({ tipo: "erro", texto: "Não foi possível trocar a senha. Saia, entre de novo e tente outra vez." }); }
    setBusy(false);
  }

  async function excluir() {
    if (!confirm("Excluir sua conta? Seus dados pessoais serão apagados e isso não pode ser desfeito.")) return;
    const r = await api("/api/me", { method: "DELETE" });
    if (r.ok) { await hydrateSession().catch(() => null); await logout().catch(() => {}); window.location.href = "/"; } else setErro(r.error ?? "Erro");
  }

  return (
    <main>
      <h1>Conta e privacidade</h1>

      <h2>Dados pessoais</h2>
      <form onSubmit={salvarDados}>
        <label htmlFor="name">Nome completo</label>
        <input id="name" name="name" defaultValue={me.name} autoComplete="name" required minLength={3} />
        <label htmlFor="phone">WhatsApp (com DDD)</label>
        <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" defaultValue={me.phone} required />
        {!me.has_email && <p className="pequeno">Você entra com este número. Se trocar, use o número novo no próximo login.</p>}
        <Aviso m={mDados} />
        <button className="btn" type="submit" disabled={busy} style={{ marginTop: 12 }}>Salvar dados</button>
      </form>
      <label className="check">
        <input type="checkbox" checked={me.share_phone} onChange={async (e) => { setMe({ ...me, share_phone: e.target.checked }); await put("/api/me", { share_phone: e.target.checked }); }} />
        <span>Mostrar meu WhatsApp para quem negocia comigo (propostas, perfil e transporte).</span>
      </label>

      {me.whatsapp_available && (
        <label className="check">
          <input type="checkbox" checked={me.whatsapp_alerts} onChange={async (e) => { setMe({ ...me, whatsapp_alerts: e.target.checked }); await put("/api/me", { whatsapp_alerts: e.target.checked }); }} />
          <span>Receber avisos automáticos por WhatsApp (nova proposta, proposta aceita, mudança de etapa do transporte e documentos), no número {me.phone}. Você pode desligar quando quiser.</span>
        </label>
      )}

      <h2>E-mail</h2>
      <p className="pequeno">{me.has_email ? `Atual: ${me.email}` : "Sua conta ainda não tem e-mail. Cadastre um para poder entrar com ele e recuperar a senha sozinho."}</p>
      <form onSubmit={trocarEmail}>
        <label htmlFor="email">{me.has_email ? "Novo e-mail" : "E-mail"}</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
        <Aviso m={mEmail} />
        <button className="btn sec" type="submit" disabled={busy} style={{ marginTop: 12 }}>{me.has_email ? "Trocar e-mail" : "Cadastrar e-mail"}</button>
      </form>

      <h2>Senha</h2>
      <form onSubmit={trocarSenha}>
        <label htmlFor="password">Nova senha (mínimo 8 caracteres)</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        <label htmlFor="password2">Repita a nova senha</label>
        <input id="password2" name="password2" type="password" autoComplete="new-password" minLength={8} required />
        <Aviso m={mSenha} />
        <button className="btn sec" type="submit" disabled={busy} style={{ marginTop: 12 }}>Trocar senha</button>
      </form>

      <h2>Mais</h2>
      <a className="btn sec" href={`/painel/perfil/${me.id}`}>Ver meu perfil público</a>
      <a className="btn sec" href="/painel/plano">Meu plano</a>
      <a className="btn sec" href="/api/me/export">Baixar meus dados (LGPD)</a>
      <a className="btn sec" href="/privacidade">Política de privacidade</a>
      <a className="btn sec" href="/termos">Termos de uso</a>
      {erro && <div className="aviso erro">{erro}</div>}
      <button className="btn sec" style={{ borderColor: "var(--erro)", color: "var(--erro)" }} onClick={excluir}>Excluir minha conta</button>
    </main>
  );
}
