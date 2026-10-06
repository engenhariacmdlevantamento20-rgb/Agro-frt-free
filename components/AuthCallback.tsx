"use client";
import { useEffect } from "react";
import { handleAuthCallback, hydrateSession, refreshSession } from "@netlify/identity";

/** Trata os links do Netlify Identity (confirmação de e-mail, nova senha, convite) e mantém a sessão viva. */
export default function AuthCallback() {
  useEffect(() => {
    (async () => {
      if (/(confirmation|recovery|invite|email_change)_token=|access_token=/.test(window.location.hash)) {
        try {
          const r = await handleAuthCallback();
          if (r?.type === "recovery") { window.location.href = "/nova-senha"; return; }
          if (r?.type === "invite" && r.token) { window.location.href = `/nova-senha?convite=${encodeURIComponent(r.token)}`; return; }
          if (r) { window.location.href = "/painel"; return; }
        } catch { window.location.href = "/entrar"; return; }
      }
      // Login feito no servidor (e-mail ou WhatsApp) deixa só o cookie; aqui a sessão do navegador é montada a partir dele.
      await hydrateSession().catch(() => null);
      await refreshSession().catch(() => null);
    })();
  }, []);
  return null;
}
