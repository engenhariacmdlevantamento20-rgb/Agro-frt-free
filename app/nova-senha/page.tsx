"use client";
import { useState } from "react";
import { updateUser, acceptInvite } from "@netlify/identity";

// Chega aqui pelo link de "esqueci a senha" (já logado) ou pelo convite do admin (?convite=token).
export default function NovaSenha() {
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    const password = String(new FormData(e.currentTarget).get("password"));
    if (password.length < 8) return setErro("A senha precisa ter pelo menos 8 caracteres.");
    setEnviando(true);
    try {
      const convite = new URLSearchParams(window.location.search).get("convite");
      if (convite) await acceptInvite(convite, password); else await updateUser({ password });
      window.location.href = "/painel";
    } catch { setErro("Não foi possível salvar a senha. Peça um novo link e tente de novo."); }
    setEnviando(false);
  }

  return (
    <main>
      <span className="marca">Agro Frete</span>
      <h1>Criar nova senha</h1>
      <form onSubmit={enviar}>
        <label htmlFor="password">Nova senha (mínimo 8 caracteres)</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        {erro && <div className="aviso erro" role="alert" style={{ marginTop: 16 }}>{erro}</div>}
        <button className="btn sol" type="submit" disabled={enviando} style={{ marginTop: 20 }}>{enviando ? "Salvando..." : "Salvar senha"}</button>
      </form>
    </main>
  );
}
