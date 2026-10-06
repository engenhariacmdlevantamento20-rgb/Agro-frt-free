import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import SairButton from "./SairButton";
import AddRole from "./AddRole";
import { isPhoneEmail } from "@/lib/pure";

export const dynamic = "force-dynamic";

const PRODUTOR: [string, string][] = [
  ["Novo transporte", "/painel/transportes/novo"], ["Locais e mapa", "/painel/locais"], ["Meus transportes", "/painel/transportes"],
  ["Minhas fazendas", "/painel/fazendas"], ["Histórico e documentos", "/painel/transportes"],
  ["Meus transportadores", "/painel/favoritos"],
];
const TRANSPORTADOR: [string, string][] = [
  ["Oportunidades", "/painel/oportunidades"], ["Locais e mapa", "/painel/locais"], ["Calculadora de lucro", "/painel/calculadora"], ["Meus transportes", "/painel/transportes"],
  ["Meus caminhões", "/painel/caminhoes"], ["Rastrear e documentos", "/painel/transportes"],
  ["Meus produtores", "/painel/favoritos"],
];
const GERAL: [string, string][] = [["Avisos de estrada", "/painel/avisos"], ["Meu plano", "/painel/plano"], ["Conta e privacidade", "/painel/conta"], ["Meu perfil", "/painel/perfil/ME"]];

export default async function Painel() {
  const user = (await getSessionUser())!;
  const isP = user.roles.includes("producer"), isT = user.roles.includes("transporter");
  let faixa = "";
  if (user.subStatus === "trial" && user.trialEndsAt) {
    const dias = Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / 86400_000);
    faixa = dias > 0 ? `Seu teste grátis termina em ${dias} ${dias === 1 ? "dia" : "dias"}.` : "Seu teste grátis terminou.";
  }
  const grade = (t: [string, string][]) => (
    <div className="grade">{t.map(([n, h]) => <Link key={n} href={h} className="tile">{n}</Link>)}</div>
  );
  return (
    <main>
      <h1>Olá, {user.name.split(" ")[0]}</h1>
      {faixa && <div className="faixa"><b>{faixa}</b></div>}
      {isP && <><h2>Produtor</h2>{grade(PRODUTOR)}</>}
      {isT && <><h2>Transportador</h2>{grade(TRANSPORTADOR)}</>}
      {user.roles.includes("admin") && <><h2>Administração</h2>{grade([["Painel admin", "/painel/admin"]])}</>}
      <h2>Mais</h2>{grade(GERAL.map(([n, h]) => [n, h.replace("ME", user.id)] as [string, string]))}
      <p className="pequeno">{isPhoneEmail(user.email) ? `WhatsApp ${user.phone}` : user.email}</p>
      {(!isP || !isT) && <AddRole role={isP ? "transporter" : "producer"} />}
      <SairButton />
    </main>
  );
}
