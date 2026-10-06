import InstallButton from "@/components/InstallButton";

export default function Home() {
  const zap = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP;
  return (
    <main>
      <span className="marca">Agro Frete</span>
      <h1>Frete rural, direto da fazenda ao destino.</h1>
      <p>Gado, grãos, madeira, máquinas e insumos. Produtor encontra transportador. Transportador encontra carga. Rota, documentos e histórico no mesmo lugar.</p>
      <div className="faixa"><b>30 dias grátis</b> para testar tudo. Sem cartão.</div>

      <InstallButton />
      <a className="btn" href="/cadastro">Criar minha conta</a>
      <a className="btn sec" href="/entrar">Já tenho conta</a>
      {zap && <a className="btn sec" href={`https://wa.me/${zap}`}>Falar com o suporte no WhatsApp</a>}
      <p className="pequeno">Atendemos todo o Brasil.</p>
    </main>
  );
}
