export const metadata = { title: "Termos de Uso · Agro Frete" };

// MODELO: revise com um advogado antes de divulgar o app. Ao trocar o texto, atualize TERMS_VERSION em lib/auth.ts.
export default function Termos() {
  return (
    <main className="larga">
      <span className="marca">Agro Frete</span>
      <h1>Termos de Uso</h1>
      <div className="aviso">Versão 2026-10 (modelo, em revisão jurídica).</div>
      <h2>1. O que é o Agro Frete</h2>
      <p>Uma plataforma que conecta produtores rurais a transportadores de gado e outras cargas do campo. O Agro Frete não é transportador, não faz o frete e não é parte do contrato entre produtor e transportador.</p>
      <h2>2. Cadastro</h2>
      <p>Você precisa ter 18 anos ou mais e informar dados verdadeiros (nome, e-mail e WhatsApp). A conta é pessoal; guarde sua senha. Podemos bloquear contas com dados falsos, uso abusivo ou fraude.</p>
      <h2>3. Responsabilidades de quem usa</h2>
      <p>O produtor responde pelas informações da carga e pelos documentos exigidos (como GTA e nota fiscal). O transportador responde pelo veículo, pela habilitação, pelas licenças, pelo bem-estar animal e pela carga durante o transporte. Preço, prazo e condições são combinados entre as partes.</p>
      <h2>4. Rotas, mapas e avisos</h2>
      <p>Rotas, distâncias e o tipo de estrada vêm de serviços públicos (OpenStreetMap/OpenRouteService) e podem estar incompletos. Os avisos de estrada são enviados por outros usuários. Confira sempre as condições reais antes de viajar.</p>
      <h2>5. Planos e pagamentos</h2>
      <p>Contas novas têm um período gratuito. Depois dele, alguns recursos podem exigir um plano pago, com preços mostrados no app. O pagamento do frete é feito diretamente entre produtor e transportador.</p>
      <h2>6. Avaliações</h2>
      <p>Depois de cada transporte as partes podem se avaliar. As avaliações devem ser honestas e respeitosas; podemos remover conteúdo ofensivo ou falso.</p>
      <h2>7. Encerramento</h2>
      <p>Você pode excluir sua conta a qualquer momento em Conta e privacidade. Transportes já feitos ficam no histórico da outra parte, sem seus dados pessoais.</p>
      <h2>8. Contato</h2>
      <p>Dúvidas: fale com o suporte pelo WhatsApp informado na página inicial.</p>
      <a className="btn sec" href="/">Voltar</a>
    </main>
  );
}
