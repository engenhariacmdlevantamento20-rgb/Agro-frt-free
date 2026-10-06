import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { pool } from "@/lib/db";
import { isBlocked } from "@/lib/billing";
import AvisosLink from "@/components/AvisosLink";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/entrar");
  // Teste vencido com bloqueio ligado: só a página de ativação do plano fica disponível
  const path = (await headers()).get("x-pathname") ?? "";
  const blocked = await isBlocked(user.id, user.roles).catch(() => false);
  if (blocked && !path.startsWith("/painel/plano")) redirect("/painel/plano?expirado=1");
  const n = await pool.query("SELECT count(*)::int AS n FROM notifications WHERE user_id=$1 AND read_at IS NULL", [user.id]).then((r) => r.rows[0].n as number).catch(() => 0);
  return (
    <>
      <nav className="topo" style={{ display: "flex", justifyContent: "space-between" }}>
        {blocked ? <span>Agro Frete</span> : <Link href="/painel">Agro Frete · Início</Link>}
        {!blocked && <AvisosLink inicial={n} />}
      </nav>
      {children}
    </>
  );
}
