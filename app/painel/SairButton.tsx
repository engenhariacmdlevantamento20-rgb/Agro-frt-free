"use client";
import { hydrateSession, logout } from "@netlify/identity";

export default function SairButton() {
  return (
    <button className="btn sec" onClick={async () => { await hydrateSession().catch(() => null); await logout().catch(() => {}); window.location.href = "/"; }}>
      Sair
    </button>
  );
}
