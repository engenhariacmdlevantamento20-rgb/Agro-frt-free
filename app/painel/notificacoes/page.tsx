"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, put, post } from "@/lib/client";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
function b64(s: string) { const p = "=".repeat((4 - (s.length % 4)) % 4); const r = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from([...r].map((c) => c.charCodeAt(0))); }

export default function Notificacoes() {
  const [list, setList] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  useEffect(() => { api("/api/notifications").then((r) => r.ok && setList(r.data)); }, []);

  async function lerTudo() { await put("/api/notifications", {}); setList(list.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))); }
  async function ativarPush() {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return setMsg("Este navegador não suporta notificações. No iPhone, instale o app na tela inicial primeiro.");
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setMsg("Permissão negada.");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(VAPID!) });
      const r = await post("/api/push/subscribe", sub.toJSON());
      setMsg(r.ok ? "Notificações ativadas neste aparelho." : r.error ?? "Erro");
    } catch { setMsg("Não foi possível ativar as notificações."); }
  }

  return (
    <main>
      <h1>Avisos</h1>
      {VAPID && <button className="btn sec" onClick={ativarPush}>Ativar avisos no celular</button>}
      {msg && <div className="aviso">{msg}</div>}
      {list.some((n) => !n.read_at) && <button className="btn sec peq" onClick={lerTudo}>Marcar tudo como lido</button>}
      {list.length === 0 && <p>Nenhum aviso por enquanto.</p>}
      {list.map((n) => (
        <Link key={n.id} href={n.url || "/painel"} className="item" style={n.read_at ? { opacity: 0.7 } : { borderColor: "var(--sol)" }}>
          <b>{n.title}</b>{n.body && <span className="pequeno">{n.body}</span>}
          <span className="pequeno"> {new Date(n.created_at).toLocaleString("pt-BR")}</span>
        </Link>
      ))}
    </main>
  );
}
