# Agro Frete — MVP completo (Fases 1 a 4)

Atende todo o Brasil.

Projeto Next.js com App Router, preparado para implantação no Netlify usando Node.js 22. Os dados são persistidos no Netlify Database, com esquema Drizzle em `db/schema.ts`; arquivos enviados são armazenados no Netlify Blobs. Use `/instalar` e `/api/health` para diagnosticar a instalação após o deploy.

## Validação e implantação automática

O `netlify.toml` define o comando de produção e a pasta de publicação. Faça o deploy pelo repositório conectado ao site **agrofretebr**; o Netlify instala as dependências, executa o build e aplica as migrações automaticamente. Não publique a pasta do código por arrastar e soltar.

Para conferir a estrutura sem gerar arquivos de produção, execute `npm ci`, `npm run check` e `npm run typecheck`. Não há uma suíte de testes unitários neste repositório. As migrações incluem as extensões PostGIS/citext, as tabelas, os 27 estados, os tipos de carga e as configurações iniciais. Não execute `drizzle-kit push` ou migrações manualmente contra o banco; para futuras alterações de esquema, use `npx drizzle-kit generate --name nome_da_alteracao`.

A tarefa `daily-maintenance` é agendada pelo Netlify diariamente às 08:00 UTC e cuida dos avisos de vencimento e da retenção do rastreamento, sem depender de cron externo. A rota manual `/api/cron/daily` só aceita autorização por cabeçalho `Authorization: Bearer ...` quando `CRON_SECRET` estiver configurado; não coloque esse segredo na URL.

Variáveis opcionais: `ADMIN_EMAIL` restringe a criação automática do administrador a uma conta com esse e-mail confirmado; configure-a antes do primeiro cadastro para impedir que outra pessoa assuma o painel. Sem essa variável, o primeiro perfil autenticado torna-se administrador, conforme o fluxo original. `ORS_API_KEY` habilita rotas, ou a chave pode ser cadastrada pelo administrador. `NEXT_PUBLIC_APP_URL` pode definir o endereço público; notificações também usam a URL do site fornecida pelo Netlify. Suporte, mapas próprios, push e WhatsApp automático usam as variáveis descritas nas seções abaixo. Nunca versione arquivos `.env` ou credenciais.

Os planos pagos e os dados para PIX são definidos pelo administrador: a instalação não inventa preços nem informações de pagamento. O período inicial é de 30 dias e o bloqueio por assinatura começa desligado.

## O que existe
- **Fase 1:** cadastro/login, fazendas com mapa e GPS, caminhões, novo transporte com rota (asfalto/terra) e ajuste por pontos, oportunidades, propostas, contratação, contato por WhatsApp, status do transporte, documentos, avaliações, histórico.
- **Fase 2:** avisos internos e push (opcional), favoritos "de confiança" (avisados primeiro), perfil público com reputação e selo "Verificado", repetir transporte, rastreamento com trilha percorrida e fila offline de posições, avisos de estrada com confirmação de outros usuários, rascunho do novo transporte guardado no aparelho.
- **Fase 3:** planos editáveis, ativação manual de assinatura, registro de pagamentos, bloqueio opcional após o teste (`enforce_paywall`), painel admin (usuários, bloquear/verificar, planos, configurações, números, registro de atividades), tarefa diária, LGPD (baixar dados e excluir conta), Termos e Privacidade (modelos).
- **Fase 4 (outras cargas rurais):** tipos de carga configuráveis pelo admin (padrão: bovinos, grãos, madeira, máquinas agrícolas, insumos, fertilizantes, ração e outras). Cargas que não são gado usam descrição livre + quantidade na unidade do tipo (toneladas, m³, unidades). Caminhões declaram quais cargas levam e a capacidade em toneladas; as oportunidades têm filtro por carga e a proposta só lista caminhões compatíveis. Rotas, propostas, documentos, status, rastreamento e avaliações funcionam igual para todas as cargas.

## Colocar no ar (sem comandos, tudo pelo navegador)
**Publicar o site (sem GitHub):** descompacte o zip e dê dois cliques em **`PUBLICAR.bat`** (Windows) ou rode `bash publicar.sh` (Mac/Linux). Ele instala, conecta ao seu site no Netlify (abre o navegador uma vez para você autorizar), constrói e publica. Precisa só do Node.js (versão LTS, nodejs.org). Para atualizar depois, descompacte a versão nova e dê dois cliques de novo.
Se for subir pelo GitHub, rode antes **`VERIFICAR.bat`** (ou `bash verificar.sh`) na pasta do repositório: ele lista qualquer arquivo que esteja faltando. Se o site também estiver ligado ao GitHub, quem publicar por último vence; use um jeito só.
Não use "arrastar e soltar" no Netlify: esse jeito não roda o build e falha com erro no plugin `@netlify/plugin-nextjs`.

1. **Banco (Netlify Database):** já vem ligado ao site. A cada deploy, o Netlify aplica sozinho as migrações de `netlify/database/migrations/` (tabelas e os 27 estados). Os municípios são buscados no IBGE na primeira vez que alguém escolhe o estado, ou podem ser carregados pelo administrador. Não precisa criar banco nem variável `DATABASE_URL`.
2. **Login (Netlify Identity):** já vem ativado. Em *Project configuration > Identity* você escolhe se o cadastro é aberto ou só por convite e se o e-mail precisa ser confirmado (*autoconfirm*). Para dar o papel de administrador a alguém, abra o usuário em *Identity* e adicione o papel `admin`.
3. **Abra `https://SEU-SITE/instalar`** para conferir se o banco e as tabelas estão prontos.
4. **Crie sua conta** pelo site e entre no painel. Com `ADMIN_EMAIL`, use o e-mail configurado e confirme o cadastro. Sem essa variável, o primeiro perfil autenticado vira o administrador: faça isso antes de divulgar o site.
5. **Entre, abra Painel admin** e cole a chave do HeiGIT/OpenRouteService no campo "Chave de rotas".

Pronto. Não precisa instalar Node, rodar `npm` nem mexer no banco.
Opcional: `NEXT_PUBLIC_SUPPORT_WHATSAPP` (ex.: 5562999999999) no Netlify, para o botão de suporte na página inicial.

Se algo não funcionar, abra `/instalar` (mostra o que falta) ou `/api/health`. Para atualizar o site depois, basta subir os arquivos novos do mesmo jeito que você já fez; o Netlify refaz o deploy e aplica sozinho as novidades do banco.

## Limites conhecidos
- **Rota:** OpenRouteService (cota gratuita diária). Asfalto/terra vem do OpenStreetMap e pode estar incompleto; aparece "sem informação". Arrastar a linha e "evitar esta estrada" não existem; o ajuste é por pontos.
- **Rastreamento:** só com app aberto e tela ligada (limite dos navegadores; pior no iPhone). Posições sem sinal ficam na fila do aparelho e sobem depois.
- **Pagamentos:** sem gateway. A assinatura é ativada pelo admin. Integrar Pix/cartão exige conta num provedor.
- **WhatsApp:** os botões são links `wa.me`. Mensagens automáticas só funcionam com a API oficial da Meta configurada (veja “Avisos e WhatsApp automático”); são pagas por conversa. A verificação de número por WhatsApp não existe.
- **E-mail:** só os e-mails do Netlify Identity (confirmação de conta e nova senha). Os demais avisos são internos e push.
- **Outras cargas:** o app não tem regras específicas por tipo de carga (peso máximo por eixo, licenças de carga perigosa, documentos fiscais próprios). Cada transportador e produtor responde pela regularidade; as regras de documento continuam editáveis, mas não vêm preenchidas. Cargas muito grandes (máquinas, madeira em toras) podem exigir rota especial que o cálculo de caminhão da OpenRouteService não garante.
- **Documentos:** arquivos no Netlify Blobs (até 5 MB), com metadados e permissões no banco. Downloads só são liberados aos participantes do transporte. Sem regras de "documento obrigatório" nem integração com GTA.
- **Mapa:** padrão usa o servidor público do OpenStreetMap, só para testes. Troque `NEXT_PUBLIC_MAP_TILES_URL` antes de divulgar.
- **Termos e Privacidade:** são modelos; precisam de revisão jurídica.
- **Backup:** depende do que o Netlify Database oferece no seu plano; confira.

## Locais salvos, favoritos e mapa satélite

- **Locais e clientes (admin):** `/painel/admin/locais`. O administrador cadastra frigoríficos, matadouros, leilões, confinamentos, armazéns e outros pontos (nome, tipo, estado, município, referência, WhatsApp, observações) marcando a posição no mapa. Também vê o banco de clientes (fazendas cadastradas + dono + WhatsApp, com planilha CSV) e os destinos usados em transportes que ainda não foram salvos.
- **Locais e mapa (usuários):** `/painel/locais`. Mostra os locais do administrador, as fazendas do próprio usuário e os destinos que ele já usou. Dá para filtrar, buscar, favoritar (★) e usar como destino.
- **Novo transporte:** o destino pode ser escolhido numa lista (favoritos, recentes, minhas fazendas, por tipo) ou tocando no local no mapa. Os locais também podem ser usados como origem.
- **Mapa:** todos os mapas têm o seletor Híbrido (satélite + estradas + nomes), Satélite e Mapa. O padrão é Híbrido e a escolha fica salva no aparelho. As imagens vêm do Esri World Imagery. Para uso comercial em escala, configure um provedor com chave em `NEXT_PUBLIC_SATELLITE_TILES_URL` (ex.: MapTiler) e um servidor de ruas próprio em `NEXT_PUBLIC_MAP_TILES_URL`.
- **Privacidade:** as fazendas de um usuário só aparecem para ele mesmo e para o administrador.
- Migração `009_places.sql` cria as tabelas `places` e `place_favorites`.

## Km do motorista e calculadora de lucro

- **Km até o embarque:** em Oportunidades, o motorista escolhe de onde sai ou onde vai estar (GPS, fim do transporte em andamento, fazenda ou local salvo, ou ponto no mapa). O botão “Calcular km e lucro” de cada carga soma: ponto de partida → embarque (por estrada, via OpenRouteService) + embarque → desembarque (rota do produtor) + volta vazio, se marcada. Sem chave de rotas ou se o serviço falhar, usa estimativa em linha reta × 1,3 e avisa.
- **Calculadora de lucro:** diesel (R$/L), consumo (km/L, pode vir do cadastro do caminhão), cobrança por km ou valor fechado, impostos e outros em %, lista de outras despesas, lucro final, margem, lucro por km e frete mínimo para não ter prejuízo. Os valores ficam salvos por motorista. Também existe a tela avulsa `/painel/calculadora`.
- Migração `010_driver_costs.sql`: coluna `trucks.km_per_liter` e tabela `driver_costs`.

## Avisos e WhatsApp automático

**Dentro do app (já funciona, sem configurar nada):** com o painel aberto, o app consulta novos avisos a cada 30 segundos e quando você volta para a aba. Aviso novo (proposta, aceite, mudança de etapa do transporte, documento...) mostra uma faixa amarela na tela, toca um alerta sonoro, vibra no celular e atualiza o contador “Avisos (n)” e o título da aba. O sino 🔔/🔕 no topo liga e desliga o som. O navegador só libera o som depois do primeiro toque na tela.

**Com o app fechado (push no celular):** precisa de chaves VAPID. Gere com `npx web-push generate-vapid-keys` e coloque no Netlify: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT` (ex.: `mailto:seu@email.com`). Depois cada usuário toca em “Ativar avisos no celular” na tela Avisos. No iPhone (iOS 16.4 ou mais) o app precisa estar instalado na tela inicial. O som e o toque do aviso com o app fechado são os do próprio celular; o app não escolhe o som.

**WhatsApp automático (desligado até você configurar):** usa a API oficial da Meta (WhatsApp Business Platform). Passos:
1. Crie uma conta no Meta for Developers e um app com o produto WhatsApp; registre e verifique o número que vai enviar.
2. Em Gerenciador do WhatsApp > Modelos de mensagem, crie um modelo de categoria *Utilidade*, idioma Português (BR), nome `atualizacao_agro_frete`, com três variáveis, por exemplo: `Agro Frete: {{1}}. {{2}} Abra o app: {{3}}`. Espere a aprovação.
3. No Netlify, em Environment variables: `WHATSAPP_TOKEN` (token permanente do usuário de sistema), `WHATSAPP_PHONE_NUMBER_ID`. Opcionais: `WHATSAPP_TEMPLATE` (se usar outro nome), `WHATSAPP_TEMPLATE_LANG` (padrão `pt_BR`), `WHATSAPP_API_VERSION` (padrão `v21.0`).
4. Faça um novo deploy, abra Painel admin > “WhatsApp automático” e toque em “Enviar mensagem de teste para mim”.
5. Cada usuário liga o recebimento em Conta e privacidade (começa desligado; é o consentimento).

Tipos de aviso enviados por WhatsApp: nova proposta, proposta aceita, mudança de etapa do transporte, documento, nova carga de produtor de confiança e plano ativado. A Meta cobra por conversa e exige modelo aprovado para mensagens iniciadas pela empresa. Não usamos bibliotecas não oficiais de WhatsApp: elas violam os termos e o número pode ser banido.
- Migração `011_whatsapp_alerts.sql`: coluna `users.whatsapp_alerts`.
