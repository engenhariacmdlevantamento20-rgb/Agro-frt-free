"use client";
import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
type Sistema = "android" | "ios" | "outro";

const Baixar = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" />
  </svg>
);
// Ícone "Compartilhar" do Safari (quadrado com seta para cima)
const Compartilhar = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-label="Compartilhar" role="img" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-4px" }}>
    <path d="M12 3v12" /><path d="m8 7 4-4 4 4" /><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
  </svg>
);
const Mais = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-label="Adicionar" role="img" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ verticalAlign: "-4px" }}>
    <rect x="4" y="4" width="16" height="16" rx="3" /><path d="M12 8v8M8 12h8" />
  </svg>
);

/** Instalar o app: no Android abre a instalação com um toque; no iPhone/iPad mostra como "Adicionar à Tela de Início". */
export default function InstallButton() {
  const [ev, setEv] = useState<InstallEvent | null>(null);
  const [sistema, setSistema] = useState<Sistema>("outro");
  const [instalado, setInstalado] = useState(false);
  const [ajuda, setAjuda] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setSistema(ios ? "ios" : /Android/i.test(ua) ? "android" : "outro");
    setInstalado(window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true);
    const on = (e: Event) => { e.preventDefault(); setEv(e as InstallEvent); };
    const done = () => { setInstalado(true); setEv(null); };
    window.addEventListener("beforeinstallprompt", on);
    window.addEventListener("appinstalled", done);
    return () => { window.removeEventListener("beforeinstallprompt", on); window.removeEventListener("appinstalled", done); };
  }, []);

  if (instalado) return null;

  async function instalar() {
    if (!ev) { setAjuda(true); return; }
    await ev.prompt();
    const r = await ev.userChoice.catch(() => null);
    if (r?.outcome === "accepted") setInstalado(true);
    setEv(null);
  }

  if (sistema === "ios") {
    const safari = !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(navigator.userAgent);
    return (
      <div className="aviso" style={{ marginBottom: 16 }}>
        <b style={{ display: "flex", alignItems: "center", gap: 8 }}><Baixar /> Instalar no iPhone / iPad</b>
        {!safari && <p className="pequeno" style={{ margin: "8px 0 0" }}>Abra este site no <b>Safari</b> para instalar.</p>}
        <ol style={{ margin: "8px 0 0", paddingLeft: 22, lineHeight: 1.7 }}>
          <li>Toque em <b>Compartilhar</b> <Compartilhar /> na barra do Safari.</li>
          <li>Role e toque em <b>Adicionar à Tela de Início</b> <Mais />.</li>
          <li>Toque em <b>Adicionar</b>. O ícone do Agro Frete aparece na tela do celular.</li>
        </ol>
      </div>
    );
  }

  // Android (e computador com Chrome/Edge). Sem o convite do navegador, mostra o caminho pelo menu.
  if (sistema === "outro" && !ev) return null;
  return (
    <>
      <button className="btn sol" onClick={instalar}><Baixar /> Baixar e instalar o app</button>
      {ajuda && (
        <div className="aviso" style={{ marginBottom: 16 }}>
          <b>Instalar no Android</b>
          <ol style={{ margin: "8px 0 0", paddingLeft: 22, lineHeight: 1.7 }}>
            <li>Abra este site no <b>Chrome</b>.</li>
            <li>Toque no menu <b>⋮</b> (canto de cima, à direita).</li>
            <li>Toque em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</li>
          </ol>
        </div>
      )}
    </>
  );
}
