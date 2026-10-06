"use client";
import { useState } from "react";
import { signup } from "@netlify/identity";
import { post } from "@/lib/client";

const TERMS_VERSION = "2026-10-draft"; // igual a lib/auth.ts

export default function Cadastro() {
  const [role, setRole] = useState<"producer" | "transporter" | null>(null);
  const [via, setVia] = useState<"whatsapp" | "email">("whatsapp");
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(""); setOk("");
    const f = new FormData(e.currentTarget);
    const dados = {
      name: f.get("name"), phone: f.get("phone"), email: via === "email" ? f.get("email") : "",
      password: f.get("password"), role, consent: f.get("consent") === "on",
    };
    setEnviando(true);
    const pre = await post("/api/auth/register", dados);
    if (!pre.ok) { setEnviando(false); return setErro(pre.error ?? "Erro ao cadastrar."); }

    if (via === "whatsapp") {
      const r = await post("/api/auth/register-phone", dados);
      setEnviando(false);
      if (!r.ok) return setErro(r.error ?? "Erro ao cadastrar.");
      window.location.href = r.data.login ? "/painel" : "/entrar";
      return;
    }
    try {
      const u = await signup(String(f.get("email")), String(f.get("password")),
        { full_name: f.get("name"), phone: pre.data.phone, role, consent_version: TERMS_VERSION });
      if (u.confirmedAt) window.location.href = "/painel";
      else setOk("Conta criada! Confira seu e-mail e clique no link para confirmar.");
    } catch (e) { setErro((e as Error).message || "Erro ao cadastrar."); }
    setEnviando(false);
  }

  return (
    <main>
      <span className="marca">Agro Frete</span>
      <h1>Criar conta</h1>
      <form onSubmit={enviar}>
        <label>Você é</label>
        <div className="papeis">
          <button type="button" className="papel" aria-pressed={role === "producer"} onClick={() => setRole("producer")}>Produtor</button>
          <button type="button" className="papel" aria-pressed={role === "transporter"} onClick={() => setRole("transporter")}>Transportador</button>
        </div>
        <label>Criar conta com</label>
        <div className="papeis">
          <button type="button" className="papel" aria-pressed={via === "whatsapp"} onClick={() => setVia("whatsapp")}>WhatsApp</button>
          <button type="button" className="papel" aria-pressed={via === "email"} onClick={() => setVia("email")}>E-mail</button>
        </div>
        <label htmlFor="name">Nome completo</label>
        <input id="name" name="name" autoComplete="name" required />
        <label htmlFor="phone">WhatsApp (com DDD)</label>
        <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(62) 99999-9999" required />
        {via === "email" && <>
          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
        </>}
        {via === "whatsapp" && <p className="pequeno">Você vai entrar com o número do WhatsApp e a senha. Sem e-mail, a troca de senha esquecida é feita pelo suporte — você pode cadastrar um e-mail depois, em Conta.</p>}
        <label htmlFor="password">Senha (mínimo 8 caracteres)</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        <label className="check">
          <input type="checkbox" name="consent" required />
          <span>Li e aceito os <a href="/termos" target="_blank">Termos de Uso</a> e a <a href="/privacidade" target="_blank">Política de Privacidade</a> (LGPD).</span>
        </label>
        {erro && <div className="aviso erro" role="alert">{erro}</div>}
        {ok && <div className="aviso" role="status">{ok}</div>}
        <button className="btn sol" type="submit" disabled={enviando || !role}>{enviando ? "Criando..." : "Criar conta e começar"}</button>
      </form>
      <a href="/entrar">Já tenho conta</a>
    </main>
  );
}
