export const metadata = { title: "Política de Privacidade · Agro Frete" };

// MODELO: revise com um advogado antes de divulgar o app. Ao trocar o texto, atualize TERMS_VERSION em lib/auth.ts.
export default function Privacidade() {
  return (
    <main className="larga">
      <span className="marca">Agro Frete</span>
      <h1>Política de Privacidade (LGPD)</h1>
      <div className="aviso">Versão 2026-10 (modelo, em revisão jurídica).</div>
      <h2>Quais dados coletamos</h2>
      <p>Nome, e-mail, WhatsApp, fazendas e pontos que você marca no mapa, caminhões, transportes, propostas, documentos enviados, avaliações e, quando o transportador liga o rastreamento, a localização do aparelho durante o transporte.</p>
      <h2>Para que usamos</h2>
      <p>Para criar sua conta, conectar produtores e transportadores, calcular rotas, mostrar o andamento do transporte, enviar avisos e evitar fraudes. Não vendemos seus dados.</p>
      <h2>Com quem compartilhamos</h2>
      <p>Com a outra parte do transporte (nome, avaliações e, se você permitir, o WhatsApp). Com os serviços que mantêm o app no ar: hospedagem, banco de dados e login (Netlify) e cálculo de rotas (OpenRouteService), só no que for necessário. Se você ligar os avisos por WhatsApp, o seu número e o texto do aviso passam pela WhatsApp Business Platform (Meta) para a mensagem ser entregue.</p>
      <h2>Localização</h2>
      <p>O rastreamento só funciona quando o transportador liga, com o app aberto, e só durante o transporte. As posições são apagadas depois do prazo definido pelo administrador.</p>
      <h2>Seus direitos</h2>
      <p>Você pode ver e baixar seus dados e excluir sua conta em Conta e privacidade. Também pode escolher se o seu WhatsApp aparece para outros usuários. Para outros pedidos, fale com o suporte.</p>
      <h2>Segurança</h2>
      <p>O acesso é protegido por login, e os documentos só podem ser vistos pelos dois participantes do transporte.</p>
      <a className="btn sec" href="/">Voltar</a>
    </main>
  );
}
