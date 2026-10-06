"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { api } from "@/lib/client";

export default function Instalar() {
  const [s, setS] = useState<any>(null);
  useEffect(() => { api("/api/setup").then((r) => setS(r.data)); }, []);

  if (!s) return <main><p>Verificando...</p></main>;
  const pronto = s.db_connected && s.tables_ok;

  return (
    <main>
      <span className="marca">Agro Frete</span>
      <h1>Instalação</h1>
      {!s.database_set && (
        <>
          <div className="aviso erro"><b>O Netlify Database ainda não está ligado a este site.</b></div>
          <ol className="passos">
            <li>No Netlify, abra o site e ative o <b>Database</b> (o banco é criado e conectado sozinho).</li>
            <li>Faça um novo deploy: as tabelas e os estados são criados automaticamente.</li>
            <li>Volte para esta página.</li>
          </ol>
        </>
      )}
      {s.database_set && !s.db_connected && <div className="aviso erro"><b>Não consegui conectar ao banco.</b> {s.error} Faça um novo deploy e tente de novo.</div>}

      {s.db_connected && (
        <>
          <p>1. Banco conectado (Netlify Database) ✓</p>
          <p>2. Tabelas criadas: {pronto ? "✓" : "ainda não — faça um novo deploy para aplicar as migrações"}</p>
          <p>3. Municípios carregados: {s.municipalities > 0 ? `✓ (${s.municipalities})` : "ainda não"}</p>
          <p>4. Administrador criado: {s.admin_exists ? "✓" : "ainda não"}</p>
          {pronto && !s.admin_exists && <><div className="aviso"><b>Agora crie a sua conta e entre no painel.</b> Se ADMIN_EMAIL estiver configurado, use esse e-mail e confirme o cadastro. Caso contrário, o primeiro perfil autenticado vira administrador: faça isso antes de divulgar o site.</div><a className="btn" href="/cadastro">Criar minha conta</a></>}
          {s.admin_exists && <><div className="aviso">Sistema instalado. Para configurar a chave de rotas, entre e abra Painel admin.</div><a className="btn" href="/entrar">Entrar</a></>}
        </>
      )}
    </main>
  );
}
