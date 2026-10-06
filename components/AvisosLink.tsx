"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";

const KEY_VISTO = "fr_last_notif", KEY_SOM = "fr_som";
type Aviso = { id: number; title: string; body?: string | null; url?: string | null };

/** Link "Avisos" do topo com alerta ao vivo: contador, faixa na tela, som e vibração quando chega aviso novo. */
export default function AvisosLink({ inicial }: { inicial: number }) {
  const [count, setCount] = useState(inicial);
  const [faixa, setFaixa] = useState<{ titulo: string; texto: string; url: string } | null>(null);
  const [som, setSom] = useState(true);
  const ctx = useRef<AudioContext | null>(null);
  const somRef = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const audio = useCallback(() => {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      if (!ctx.current) ctx.current = new AC();
      if (ctx.current.state === "suspended") void ctx.current.resume();
      return ctx.current;
    } catch { return null; }
  }, []);

  const apitar = useCallback(() => {
    const c = audio(); if (!c) return;
    const t = c.currentTime;
    [880, 1175, 880].forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain(), ini = t + i * 0.2;
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ini); g.gain.exponentialRampToValueAtTime(0.4, ini + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ini + 0.18);
      o.connect(g); g.connect(c.destination); o.start(ini); o.stop(ini + 0.2);
    });
  }, [audio]);

  const alertar = useCallback((novos: Aviso[]) => {
    const a = novos[0];
    setFaixa({ titulo: novos.length > 1 ? `${novos.length} avisos novos` : a.title, texto: novos.length > 1 ? a.title : a.body ?? "", url: novos.length > 1 ? "/painel/notificacoes" : a.url || "/painel/notificacoes" });
    if (somRef.current) apitar();
    try { navigator.vibrate?.([200, 100, 200]); } catch { /* aparelho sem vibração */ }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setFaixa(null), 10000);
  }, [apitar]);

  const consultar = useCallback(async () => {
    const r = await api("/api/notifications/unread");
    if (!r.ok) return;
    const { count: n, latest } = r.data as { count: number; latest: Aviso[] };
    setCount(n);
    const maior = latest.length ? Math.max(...latest.map((x) => x.id)) : 0;
    let visto: number | null = null;
    try { const v = localStorage.getItem(KEY_VISTO); visto = v == null ? null : Number(v); } catch { /* sem armazenamento */ }
    if (visto == null) { try { localStorage.setItem(KEY_VISTO, String(maior)); } catch { /* ok */ } return; } // primeira vez: só marca o ponto de partida
    if (maior > visto) {
      alertar(latest.filter((x) => x.id > visto!));
      try { localStorage.setItem(KEY_VISTO, String(maior)); } catch { /* ok */ }
    }
  }, [alertar]);

  // selo no ícone do app instalado e contador no título da aba
  useEffect(() => {
    document.title = document.title.replace(/^\(\d+\) /, "");
    if (count > 0) document.title = `(${count}) ${document.title}`;
    try { if (count > 0) (navigator as any).setAppBadge?.(count); else (navigator as any).clearAppBadge?.(); } catch { /* sem suporte */ }
  }, [count]);

  useEffect(() => {
    try { const s = localStorage.getItem(KEY_SOM) !== "0"; setSom(s); somRef.current = s; } catch { /* padrão: som ligado */ }
    const liberar = () => { audio(); }; // o navegador só libera o som depois do primeiro toque do usuário
    window.addEventListener("pointerdown", liberar, { once: true });
    window.addEventListener("keydown", liberar, { once: true });
    consultar();
    const iv = setInterval(() => { if (document.visibilityState === "visible") consultar(); }, 30000);
    const vis = () => { if (document.visibilityState === "visible") consultar(); };
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("focus", vis);
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", vis); window.removeEventListener("focus", vis); if (timer.current) clearTimeout(timer.current); };
  }, [audio, consultar]);

  function alternarSom() {
    const n = !som; setSom(n); somRef.current = n;
    try { localStorage.setItem(KEY_SOM, n ? "1" : "0"); } catch { /* ok */ }
    if (n) apitar(); // toca uma vez para o usuário ouvir como é
  }

  return (
    <>
      <span style={{ display: "inline-flex", gap: 14, alignItems: "center" }}>
        <button type="button" onClick={alternarSom} aria-pressed={som} aria-label={som ? "Som dos avisos ligado. Toque para desligar." : "Som dos avisos desligado. Toque para ligar."}
          style={{ background: "none", border: 0, color: "#fff", fontSize: "1.2rem", cursor: "pointer", minWidth: 40, minHeight: 40 }}>{som ? "🔔" : "🔕"}</button>
        <Link href="/painel/notificacoes">Avisos{count > 0 ? ` (${count})` : ""}</Link>
      </span>
      {faixa && (
        <div className="faixa-aviso" role="status" aria-live="polite">
          <Link href={faixa.url} onClick={() => setFaixa(null)}><b>{faixa.titulo}</b>{faixa.texto && <span>{faixa.texto}</span>}<small>Toque para abrir</small></Link>
          <button type="button" aria-label="Fechar aviso" onClick={() => setFaixa(null)}>×</button>
        </div>
      )}
    </>
  );
}
