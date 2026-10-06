"use client";
import { useState } from "react";
import { requestPasswordRecovery } from "@netlify/identity";
import { post } from "@/lib/client";

export default function Entrar() {
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState("");

  async function esqueci() {
    const id = (document.getElementById("identifier") as HTMLInputElement).value.trim();
    setErro(""); setMsg("");
    if (!id.includes("@")) return setErro("Para receber o link de nova senha, digite acima o e-mail da conta. Se você entra só com WhatsApp, fale com o suporte.");
    try { await requestPasswordRecovery(id); setMsg("Se o e-mail tiver cadastro, enviamos um link para criar uma nova senha."); }
    catch { setErro("Não foi possível enviar o link agora. Tente de novo."); }
  }

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    const f = new FormData(e.currentTarget);
    setEnviando(true);
    const r = await post("/api/auth/login", { identifier: f.get("identifier"), password: f.get("password") });
    setEnviando(false);
    if (r.ok) window.location.href = "/painel"; else setErro(r.error ?? "Erro ao entrar.");
  }

  return (
    <main>
      <span className="marca">Agro Frete</span>
      <h1>Entrar</h1>
      <form onSubmit={enviar}>
        <label htmlFor="identifier">E-mail ou WhatsApp (com DDD)</label>
        <input id="identifier" name="identifier" autoComplete="username" placeholder="voce@email.com ou (62) 99999-9999" required />
        <label htmlFor="password">Senha</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
        {erro && <div className="aviso erro" role="alert" style={{ marginTop: 16 }}>{erro}</div>}
        <button className="btn sol" type="submit" disabled={enviando} style={{ marginTop: 20 }}>{enviando ? "Entrando..." : "Entrar"}</button>
      </form>
      {msg && <div className="aviso" role="status">{msg}</div>}
      <button type="button" className="btn sec" onClick={esqueci}>Esqueci a senha</button>
      <a href="/cadastro">Criar conta</a>
    </main>
  );
}
