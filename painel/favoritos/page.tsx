"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";

export default function Favoritos() {
  const [list, setList] = useState<any[] | null>(null);
  useEffect(() => { api("/api/favorites").then((r) => r.ok && setList(r.data)); }, []);
  return (
    <main>
      <h1>De confiança</h1>
      <p className="pequeno">Pessoas que você marcou. Quando um produtor de confiança publica uma carga, o transportador que o marcou é avisado primeiro.</p>
      {list?.length === 0 && <p>Você ainda não marcou ninguém. Abra o perfil de alguém e toque em “Marcar como de confiança”.</p>}
      {list?.map((u) => (
        <Link key={u.id} href={`/painel/perfil/${u.id}`} className="item">
          <b>{u.name} {u.verified && <span className="tag sol">Verificado</span>}</b>
          <span className="tag">{u.roles.includes("transporter") ? "Transportador" : "Produtor"}</span>{u.rating && <span className="tag">★ {u.rating}</span>}
        </Link>
      ))}
    </main>
  );
}
