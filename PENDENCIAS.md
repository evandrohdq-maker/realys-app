# O que ainda falta para finalizar o Realys

Lista viva: o que já foi combinado e ficou para depois. Atualizada em novembro de 2026.

## ⚠️ CONTRATAR (aviso também no painel do administrador)

- [ ] **Servidor de vídeo (lives e chamadas)**: VPS **Hetzner CX22 ou CAX11**, Alemanha ou Finlândia,
      ~€ 4 a 10/mês com **20 TB de tráfego incluídos** (~44 mil horas de live assistidas por mês;
      passou disso, € 1 por TB). O sistema já está pronto: MediaMTX (lives) + coturn (chamadas).
      Passo a passo em `server/deploy/video/LEIA-ME.md`. Na fase de testes pode ser a mesma VPS do app.
- [ ] **Servidor do app** (contas, carteira, pedidos): `server/deploy/setup-ubuntu.sh`.
- [ ] **Domínios**: `api.` e `video.` apontando para as VPS.

## Compartilhar a tela (Arena Gamer e Salas de Negócios) — testar no primeiro APK com o servidor

- [ ] **Minimizar o Re@lys com a tela sendo transmitida**: o jogo (ou qualquer app) tem que continuar indo
      para a sala e para a live. As permissões FOREGROUND_SERVICE_MEDIA_PROJECTION já estão no app.json; se
      no Android 14+ a transmissão parar ao minimizar, conferir o serviço em primeiro plano do react-native-webrtc
      (já é ligado pelo módulo RealysUpdater, enableMediaProjectionService).
- [ ] **Live + sala ao mesmo tempo**: a captura é uma só (src/video.js) e vai para os dois. Conferir o
      uso de internet do celular (dois envios de vídeo, ~2 a 5 Mbps no total).
- [ ] Pausa automática: carteira, Pix, login, biometria, conversas privadas e qualquer campo de senha
      do Re@lys já pausam. Senhas de OUTROS apps: o Android 15+ esconde sozinho e os apps de banco ficam
      pretos na transmissão; conferir em Android 12–14.
- [ ] Rever com advogado as regras de vídeo ao vivo (ECA Digital, ANPD: caso Discord, ago/2026).

## Rádios e TVs (Stream)

- [ ] **Sky Plus** (rádio principal, https://stm1.voxpainel.com.br:7004/stream): confirmar no celular que
      toca e a categoria dela (hoje está em "Comunitária e local"; trocar se for outro estilo).
- [ ] **Janelinha por cima dos outros apps (rádio)**: Android 12+ abre sozinho ao sair do app; testar no
      primeiro APK novo. Nos Android 8 a 11 abre pelo botão de janela do player.
- [ ] Com o servidor: subir logo e capa das rádios/TVs (uploadMedia) junto com o cadastro; hoje ficam no celular.
- [ ] Seguir estação: com o servidor, avisar os seguidores quando a rádio/TV publicar ou entrar ao vivo.

## Quando contratar o servidor (fase de testes, 10 a 20 usuários)

- [ ] **Hospedar o Realys num servidor na nuvem**, para as pessoas acessarem de verdade.
- [ ] **Etapa 2 de contratos e receitas: assinatura ICP-Brasil.** Contratar uma empresa certificadora
      (com API) para a assinatura com certificado digital ICP-Brasil, ligada pelo servidor.
  - Obrigatória para **receitas médicas** (Resolução CFM 2.299/2021, RDC Anvisa 1.000/2025).
    O médico tira o certificado em nuvem de graça pelo CRM Virtual; o Realys usa esse certificado
    para assinar sem sair do app. Validação em validar.iti.gov.br.
  - Obrigatória para **contratos que vão a cartório**: aluguel com cláusula de vigência e compra e
    venda de imóvel (a compra de imóvel ainda precisa de escritura no cartório).
  - Hoje (etapa 1) o app já monta e entrega os documentos; o médico assina a receita pelo próprio
    certificado (ex.: Prescrição Eletrônica do CFM) e os contratos podem ser assinados pelo gov.br.
  - [x] Página de conferência pronta (/v/<código>) e o código vai no PDF do contrato. Falta desenhar o QR Code
        no PDF (biblioteca de QR no app, quando gerarmos o APK com o servidor).
- [ ] **Assinatura gov.br direto no app**: hoje a API do gov.br só é liberada para órgãos públicos.
      Acompanhar a abertura anunciada pelo ITI para empresas privadas.
- [ ] Conferência dos registros profissionais nos conselhos (CRM, CRO, CRMV, COREN, CRP, CRN…)
      pelo servidor, antes de liberar o botão "Receitar".
- [ ] Alertas da chave de segurança do motorista chegarem ao painel do administrador **em tempo real**
      (hoje ficam no celular, porque ainda não há servidor).

## Negócios (imóveis, veículos e máquinas)

- [ ] **Com o servidor**: guardar anúncios, fotos e pedidos de contato de verdade; avisar o anunciante
      quando chega um interessado; cobrar o plano todo mês (hoje é cobrado só na assinatura).
- [ ] **Devolução em 48 horas**: a tela promete devolver o valor do contato como crédito se o
      interessado não responder em 48 horas. A devolução automática ainda não foi programada.
- [ ] **Valores**: propostos em 14/11/2026 a partir dos preços públicos do ZAP e da Webmotors
      (fontes: zapimoveis.com.br/blog/anunciar/quanto-custa-anunciar-no-zap-imoveis e
      webmotors.com.br/vender-carro). Não foi achado preço público de cobrança por contato.
- [ ] **Taxa de sucesso nos aluguéis** fechados com contrato assinado no app (etapa seguinte).

## Perfis e páginas

- [ ] **Mensalidade da página**: R$ 14,90 é cobrado na criação; a cobrança todo mês depende do servidor.
- [ ] **Vitrine de cada classe profissional**: o prestador já tem a página de trabalhos (plano
      Destaque). Falta dar o mesmo espaço de exposição para rádios, TVs online, imobiliárias e
      revendas de veículos, e destacar os perfis por classe de trabalhador.
- [ ] **Páginas de quem já tinha página**: as criadas antes da mensalidade continuam no ar sem cobrança.

## Publicidade (Anuncie no Re@lys)

- [ ] **Pôr a arte do anunciante no ar**: hoje a compra do story patrocinado, do patrocinado nas
      buscas e do banner da vitrine fica registrada e debitada, mas o anúncio em si ainda não
      aparece nesses espaços (precisa do envio da arte, da análise e do servidor).
- [ ] **Valores**: definidos em 14/11/2026. Referência: iFood Anúncios com orçamento mínimo de
      R$ 25 por dia (blog-parceiros.ifood.com.br). Rever depois do piloto com os números de uso.

## Players (rádio, TV e lives)

- [ ] **Testar num celular**: arrastar os players (segurar e arrastar), a TV em picture-in-picture
      (botão de janela e ao sair do app) e a rádio tocando com o app minimizado.
- [ ] **Live em janela fora do app**: hoje a live minimizada só flutua dentro do Re@lys. Para ela
      continuar num canto da tela com o app minimizado é preciso código nativo de picture-in-picture
      para o vídeo WebRTC (dá para pôr no módulo `modules/realys-updater` ou num módulo novo).
- [ ] **Canais de TV de exemplo**: usam sinais públicos de teste; trocar por canais reais quando houver.

## Parceria com o governo (serviço público e SUS)

- [ ] Contas verificadas para os órgãos públicos (Bombeiros, Defesa Civil, SAMU, hospitais, UPAs, UBSs):
      cada órgão entra com conta oficial e usa o Painel do órgão (hoje aberto só para demonstração).
- [ ] Números reais de cada cidade (0800 e contatos); hoje os 0800 dos perfis são de demonstração.
- [ ] Agendamento do SUS ligado aos sistemas oficiais (cadastro do Cartão Nacional de Saúde e regulação
      de consultas). Hoje os horários são publicados pelas unidades dentro do Realys e o app confere o
      número do cartão pela regra oficial.

## Vídeo (já pronto, falta o servidor)

- [ ] Depois de instalar: testar live real (transmitir num celular, assistir em outro) e chamada 1 para 1.
- [ ] Com muita gente assistindo: rede de entrega (CDN) com ponto em São Paulo na frente do `/hls/`.
- [ ] Reprise das lives (opcional do streamer, com prazo para sumir) e anúncios dentro das lives.
- [ ] Chamadas em grupo (hoje a chamada direta é de 1 para 1).

## Conteúdo, moderação e privacidade

- [x] **IA de imagem para nudez: pronta no servidor** (server/moderacao-ia + src/moderacaoImagem.js):
      fotos e vídeos públicos são conferidos no envio (bloqueia / manda para revisão / libera), as lives são
      conferidas a cada 20 s (nudez = live encerrada) e há fila de revisão para o administrador.
      Conversas privadas não passam pela regra. **Falta, ao contratar o servidor:** instalar
      (server/moderacao-ia/LEIA-ME.md), testar com fotos de praia e ajustar os limites; depois ligar no app o
      envio com `?uso=privado` nas conversas e a mensagem de "nudez" no envio de fotos (gerar APK nessa hora).
- [ ] **Detecção de abuso infantil por "impressão digital" de imagem** (lista de imagens já conhecidas, como o
      PhotoDNA): só por parceria com organizações autorizadas (ex.: SaferNet); a IA de nudez não substitui isso.
- [x] **Moderação de texto no servidor** (posts, depoimentos e mensagens): pronta (server/src/moderacaoTexto.js).
- [ ] **Canal de denúncia às autoridades** (SaferNet / Polícia Federal) para conteúdo com menores, com
      preservação das provas, e responsável pela moderação definido na empresa.
- [ ] **Advogado revisar o Termo de Adesão v14** e os Termos do Encontros v0.2 antes do lançamento oficial.

## Date+

- [ ] **Cobrança da assinatura pela loja:** assinatura de conteúdo digital vendida dentro do app precisa seguir
      as regras do Google Play (cobrança do Google Play ou o sistema alternativo permitido no Brasil). Hoje o
      Date+ é pago com saldo ou pontos; confirmar o modelo com o contador e as regras da loja antes de lançar.
- [ ] Guardar a assinatura no servidor e checar o Date+ também lá na chamada de vídeo (hoje é conferido no app).
- [ ] Revisar os preços do Date+ a cada 6 meses comparando com Tinder, Happn e Bumble.

## Segurança do cliente (pergunta de segurança)

- [x] Alertas de segurança e bloqueio por chamada falsa no servidor: prontos (server/src/routes/seguranca.js);
      a conta é bloqueada, as sessões encerradas e o saldo retido. O app manda os alertas quando o servidor estiver no ar.
- [x] Tela da central de segurança no painel do administrador (alertas na hora, mapa, atendido / chamada falsa).
- [ ] **Pessoas para a central 24 h** (operar a tela e falar com a polícia).
- [ ] Advogado revisar a retenção do saldo por chamada falsa (reter durante a apuração e para ressarcir custos
      é mais seguro do que perder tudo automaticamente).

- [x] Contrato sob coação marcado no servidor: a página de conferência mostra só "em análise".
- [ ] Definir com o advogado quando avisar a outra parte depois da apuração.

## Polícia Inteligente (proposta para o governo)

- [ ] Montar a proposta para cadastrar os órgãos de polícia **estaduais (PM/Brigada, Polícia Civil),
      federais (PF, PRF) e municipais (Guarda Municipal)** no Realys.
- [ ] **Participação opcional do policial:** ele se cadastra com a **carteira funcional (carteira de serviço)**
      + biometria facial e escolhe se quer **ativar o recebimento de alertas** da plataforma ("estou na ativa",
      com GPS). Ele **não presta serviço para o Realys**: não é prestador, não recebe pagamento da plataforma e
      não tem vínculo; só recebe as informações dos pedidos de emergência perto dele. Pode desativar quando quiser.
- [ ] Pedido de emergência do cidadão (Lotus Denúncia "estou em perigo", resposta de segurança, chave do
      motorista): vai para a central do órgão e notifica o **policial mais próximo da vítima**, com a
      localização e o protocolo. Só para emergência; dúvidas ficam com a Lotus.
- [ ] **A mesma regra para todo servidor público** (SAMU, Bombeiros, Defesa Civil, agentes de saúde do SUS,
      guardas, fiscais etc.): cadastro opcional com a carteira funcional + biometria, liga o recebimento de
      alertas se quiser, **não presta serviço para o Realys** e não paga taxa (Lotus Emergência → socorrista mais perto).
- [ ] Convênio, regras de sigilo dos dados (LGPD, poder público) e integração com o 190/192 de cada estado.
- [x] Pedidos da Lotus Denúncia e Emergência no servidor, com a fila da central; plantão ("estou na ativa") e
      aviso ao profissional mais perto prontos.

- [ ] **Carteira profissional (já pronto no código, falta contratar):**
      - CFM (médicos): webservice oficial, R$ 948/ano → CFM_WS_URL/CFM_WS_KEY; ajustar src/cfm.js ao manual que vem com a chave.
      - CRP, CRMV, COREN, CRO, CREA: Infosimples → INFOSIMPLES_TOKEN; conferir os caminhos de COREN/CRO/CREA de cada
        estado e preencher CONSELHO_PATHS. Testar uma consulta real de cada conselho antes de lançar.
      - OAB: pedir acordo ao Conselho Federal (o CNA não pode ser repassado sem autorização); até lá, conferência manual.
      - E-mail institucional: contratar o envio (Resend) → RESEND_API_KEY/EMAIL_FROM.
      - Painel do administrador ler a fila do servidor (/admin/credenciais) quando o servidor estiver no ar.
- [x] Casos para profissionais no servidor, com registro de quem acompanhou cada caso.

## Lotus

- [ ] Calibrar a **voz do titular** com vozes reais (o Evandro manda os números da "Última conferência"
      do Perfil, dele e de outra pessoa).
- [ ] **Detector próprio do "Lotus"** dentro do app (mais rápido que o do Google, se a abertura ainda
      passar de meio segundo).
- [ ] "Abrir Lotus" com o **celular bloqueado** (serviço em segundo plano com aviso fixo).

## Negócio

- [x] Taxa de presentes do servidor igual à do app (10% sai do presente; gorjeta sem taxa).

- [ ] **Calibrar a Tarifa Realys e as faixas justas** com dados reais da plataforma (src/pricing.js):
      os apps grandes não divulgam mais as tarifas; as faixas de consulta médica geral estão marcadas
      como provisórias. Revisar a parte do Realys nas corridas (hoje 15%).

- [ ] **Dezembro de 2026:** revisar a Taxa de proteção Realys (R$ 0,99 fixa) e a ideia de taxa
      variando por horário.
- [x] Aba **Desapego** pronta (menu ⋮ e "Lotus, me leva pro desapego"), com a Garantia Realys e taxa de 10%.
      Falta levar os anúncios para o servidor.
- [ ] Decidir banco (nacional ou estrangeiro) e o cálculo de margem com os impostos da nota.

## Serviços novos (novembro de 2026)

- [x] Classes novas em Serviços: **Turismo e passeios** (guia, trilhas, barco, transfer) e **Meio ambiente e
      reciclagem** (recicláveis, caçamba, eletrônicos, móveis velhos, terreno); **Intérprete de Libras** e
      **Acompanhante de pessoa com deficiência** em Cuidados e família.
- [x] Serviço público: **Central do Cidadão** (segunda via de IPTU, certidões, alvará e MEI, RG com agendamento)
      e **Ecoponto**. O agendamento agora vale para qualquer órgão; só o SUS pede o Cartão do SUS.
- [x] **Selo de Equipe** (src/teams.js): prestadores com MEI próprio que trabalham juntos. Cada um recebe na
      própria carteira e emite a própria nota. Exemplo: Equipe Luz & Força (5 eletricistas).
- [ ] Selo de Equipe no servidor: convite e aceite de cada membro, e o administrador poder retirar o selo
      se a equipe funcionar como empresa com empregados (pejotização). Confirmar as regras com um contador.
- [x] **Modo acessível**: Perfil › Letras maiores (todo o texto 18% maior, guardado no celular).
- [ ] Modo acessível: alto contraste e modo simples para idosos.
- [ ] **Microcrédito e seguros para MEI**: só com parceiro autorizado (Banco Central / Susep).

## Notas fiscais e impostos (código pronto, desligado)

- [x] Módulo fiscal no servidor (server/src/fiscal, guia em server/fiscal-LEIA-ME.md): receitas do Realys,
      NFS-e Nacional assinada com certificado A1, cancelamento, NF-e das lojas por emissor parceiro,
      cálculo de impostos (Simples, Lucro Presumido, MEI, CBS/IBS), resumo de lucro e aviso de teto do MEI.
- [ ] **Abrir o CNPJ em Passo Fundo** e tirar a inscrição municipal.
- [ ] **Comprar o certificado digital A1** e converter com `server/deploy/certificado-fiscal.sh`.
- [ ] **Contador conferir** regime, anexo, código do serviço, ISS de Passo Fundo e agrupamento das notas.
- [ ] Testar na produção restrita da Receita (`FISCAL_AMBIENTE=2`) antes de ligar em produção.
- [ ] Contratar o emissor parceiro de NF-e (Focus NFe ou parecido) para as lojas que quiserem.
- [ ] Ligar no servidor a taxa de proteção (R$ 0,99) e a taxa de visita, que hoje existem só no app,
      chamando `fiscal.registrar` como já é feito na comissão de pedido e nos presentes.
- [ ] Telas no app: "Minhas notas fiscais", painel fiscal do administrador e aviso de teto do MEI.
- [ ] **Conversa com o contador sobre 2027:** pela LC 214/2025 (arts. 22 e 23), plataformas digitais respondem
      pela CBS/IBS das vendas intermediadas e precisam se inscrever no regime regular. Ver se o Simples ainda compensa.
- [ ] Confirmar a alíquota de ISS de Passo Fundo para o item 10.05 (hoje o padrão é 5%).
- [ ] Fator R: lançar todo mês a folha + pró-labore (FISCAL_FOLHA_12M). Sem folha, o Realys cai no Anexo V (15,5%).
- [ ] Lucro Presumido: montar o grupo IBS/CBS da NFS-e (leiaute 1.01) antes de usar esse regime.

## Tabela de taxas (novembro de 2026, src/taxas.js)

Regra: perto do mercado para ter margem, sempre abaixo para divulgar. Fontes consultadas: planos do iFood
(Serasa, Saipos), taxa de serviço do iFood (Tecnoblog), comissões de marketplace 2026 (Mercado Livre e
Shopee), taxa da Uber e da 99, GetNinjas, Sympla e TikTok Live.

- [x] Food 11% (iFood 12% + 3,2%), Shop 10% (ML 10–14% + custo fixo), corridas 18% (Uber/99 20–35%),
      visita 15%, ingresso 8% mín. R$ 1,99 (Sympla 10% mín. R$ 2,50), plano de empresa R$ 89 acima de
      R$ 1.800 (iFood R$ 110–150), lives: criador 70% (TikTok ~50%), antecipado 63%. Proteção R$ 0,99 fixa.
- [x] Termo de Adesão v15 com as novas taxas (app e servidor).
- [ ] Ligar no servidor: ORDER_FEE_PCT=10 e FOOD_FEE_PCT=10 quando sair da fase de testes.
- [x] Tela "Por que o Re@lys é mais barato" (Perfil › Nossas taxas), usando `comparativo()` de src/taxas.js.
- [ ] Rever a tabela a cada 6 meses (o mercado muda: Shopee e Mercado Livre mudaram em 2026).

## Tele grátis e verificação de entregadores (novembro de 2026)

- [x] Primeira tele grátis paga pelo Realys (pedido mínimo R$ 30, orçamento de R$ 3 mil/mês que pausa sozinho)
      e tele grátis do restaurante (liga na página da empresa, com pedido mínimo e selo no Food). src/teleGratis.js.
- [x] Verificação facial de entregadores, motoboys e motoristas a cada 6 horas (BIOMETRIA_PERIODIC_HOURS).
- [ ] Levar o orçamento da primeira tele grátis para o servidor (hoje é contado no app) e mostrar no painel do administrador.
- [ ] Pix automático por API de banco (depósito e saque sem o administrador), quando tiver CNPJ e banco escolhido.

## Páginas de usuários (nov/2026)
- Feito no APK: aba Páginas (menu ⋮ → Comunidade e lives, Perfil → Minhas páginas), até 5 páginas por usuário, assinada (nome + selo verificado) ou anônima (dono verificado, nome oculto), posts com checagem de fatos, seguir/denunciar, busca e Lotus ("abre a página X", "criar página").
- Pendente: sincronizar páginas e posts com o servidor (hoje ficam no perfil salvo no aparelho); moderação de denúncias no painel admin; dono de página anônima só revelado por ordem judicial.

## Conta sem biometria (modo social) e plano da loja — novembro de 2026

- [x] Cadastro pede documento e biometria. Quem escolhe "Fazer a biometria depois" (ou está num celular sem
      digital/rosto) entra no modo social: usa Community, News, Stream, Lives, Reels, páginas e o perfil,
      mas não compra, não contrata, não anuncia e não usa a carteira. Abas de compra e serviço mostram a
      tela "Falta só a biometria"; qualquer ação de compra abre a mesma janela. O SOS continua liberado.
- [x] Plano da loja: R$ 49,90 por mês ou anual por 75% do valor (R$ 449,10). Só é pedido quando a loja
      aceita o primeiro pedido; primeiro mês grátis. Comissão única de 10% sobre as vendas (Shop e Food).
      Termo de adesão na versão v16.
- [ ] Servidor: recusar pedido, contratação e carteira de conta sem biometria aprovada (hoje a trava é só no app).
- [ ] Servidor: cobrar o plano da loja (mensal/anual) depois do mês grátis e travar o aceite de pedido sem plano.
      No app, a chegada do primeiro pedido é simulada por um botão no Painel da empresa.
- [ ] Contas de demonstração (login sem cadastro) entram como verificadas.
- [x] Páginas: a primeira página de cada conta é gratuita; da segunda em diante, R$ 14,90 por mês cada.
- [x] Reels de prestador: botão "Chamar pelo Re@lys"; reels de anúncio mandam o "Tenho interesse" direto.
      Pedidos ganhou a aba "Aguardando" (chamados, interesses e pedidos esperando retorno).
- [x] Publicidade avulsa (story R$ 9,90; buscas R$ 14,90/dia ou R$ 79,90/semana; banner R$ 39,90/dia ou
      R$ 199,90/semana) aparece na oferta do plano da loja.
- [x] Conta sem biometria navega normalmente em Shop, Food e Serviços; só a compra e a contratação pedem a biometria.

## Servidor pronto para a biometria, conversas organizadas e temas futuristas — novembro de 2026

- [x] Servidor: compra, chamado de serviço, pagamento, carteira e presentes só com biometria aprovada
      (`server/src/bioGate.js`, liga com `EXIGIR_BIOMETRIA=true`; em produção já vem ligado). Resposta 403
      com código `biometria`; o app abre o aviso "Biometria não cadastrada". `/me` devolve `podeComprar`.
- [x] Conversas: listas para classificar contatos (Família, Trabalho, Clientes e as que a pessoa criar),
      não lidas, fixar no topo, arquivar e busca. Segurar a conversa abre as opções.
- [x] Temas futuristas (Neon, Aurora, Cyber, Holograma, Galáxia, Ouro digital) para o fundo das páginas
      e para a capa do perfil (`src/components/ThemeArt.js`).
- [ ] O login do app ainda é local: quando o servidor entrar no ar, ligar cadastro/login ao servidor para
      a trava valer de ponta a ponta (hoje o app só consulta `/me` se já houver sessão com o servidor).
- [ ] Servidor ainda não tem as rotas de plano da loja, páginas pagas, anúncios e Negócios; quando forem
      criadas, incluir em `ROTAS_COM_BIOMETRIA`.
- [ ] Listas e conversas arquivadas ficam salvas só no celular.
- [x] Arena (estilo Discord): tocar numa pessoa abre as opções: volume só dela (0 a 200%), silenciar,
      ignorar, bloquear, adicionar amigo, mencionar, apelido/nota, denunciar e, para dono ou moderador,
      tirar da voz e expulsar. Barra de voz com Mic e Áudio (mutar) com nome.
- [ ] Arena: a voz ainda é demonstração. Volume, silenciar e mutar já ficam guardados, mas só agem de
      verdade quando a voz real (servidor) entrar. Bloqueio e denúncia também precisam do servidor.
- [x] Empresa: aba Clientes (CRM). Atendimentos por etapas (Novo contato, Em conversa, Proposta enviada,
      Negociação, Venda fechada, Não fechou), conversa, valor, notas, lembrete de retorno, origem e linha
      do tempo; números do funil no topo (`src/crm.js`, `src/screens/empresa/CrmScreen.js`).
- [ ] CRM: os atendimentos são de exemplo e ficam no celular. Com o servidor, cada conversa de cliente
      com a loja (Shop, Food, Reels, anúncio, página) deve abrir um atendimento sozinha, e a venda feita
      pelo app deve fechar a etapa automaticamente. O lembrete de retorno ainda não gera notificação.
- [x] CRM também para prestador (aba Clientes, com Serviços, Aulas e Atendimento online) e para
      imobiliárias e revendas (botão Clientes em Negócios › Meus anúncios). Cada um com os nomes de
      etapa do seu trabalho. Tudo ainda com atendimentos de exemplo, salvos no celular.

## Empresa reorganizada, Músicas e leads — novembro de 2026

- [x] Empresa: barra de baixo em duas linhas (4 em cima, 4 embaixo), nomes em uma linha só, botão
      Community no topo (entra no perfil de usuário: feed e serviços) e botão Empresa para voltar.
- [x] Estúdio Re@lys só para artistas, músicos e criadores (não aparece no perfil de empresa). A empresa
      tem o cartão Divulgação no Painel: anúncios, propagandas e reel de anúncio.
- [x] Carteira do Perfil virou uma pílula discreta com o saldo.
- [x] Stream › Músicas: galeria dos artistas para ouvir grátis com propaganda (uma a cada 3 músicas),
      compra da música (20% Re@lys, 80% artista) para liberar o download, playlists guardadas, plano
      Premium sem propaganda (3 meses grátis, depois R$ 9,90/mês) e área do artista para publicar.
- [x] Leads: campanhas de leads no CRM (aba Clientes › Captar leads) e botão Pedir orçamento nas
      páginas de empresa, que cai como contato novo no CRM.
- [ ] Músicas: faixas de exemplo usam áudios públicos de teste (não conferidos no celular). O artista
      informa o link do MP3; envio do arquivo, repasse ao artista, cobrança do Premium depois dos 3 meses,
      download de verdade (hoje só marca como baixada) e propaganda vendida de verdade dependem do servidor.
      Não há passar para a próxima música sozinho.
- [ ] Player fora do app: rádio e música continuam tocando com o app minimizado e aparecem na
      notificação do celular (com pausar); TV tem janelinha (PiP). Janela flutuante de áudio por cima de
      outros apps o Android não permite sem código nativo e permissão especial.
- [ ] Leads: campanhas trazem interessados de exemplo; com o servidor, mostrar a oferta ao público
      escolhido e cobrar por lead. Pedido de orçamento só entra no CRM quando é para a empresa da demonstração.
- [x] Músicas: passagem automática para a próxima da lista (Galeria, playlist ou Compradas) e botão
      de próxima na barrinha do player. Com a tela de Músicas fechada, a propaganda entre músicas não aparece.
- [x] Menus: perfis voltaram a ter o menu numa linha só no rodapé; a empresa tem um menu no alto da
      tela (4 botões) e outro no rodapé (4 botões).
- [x] Atualização automática sem aviso: ao abrir o app, só uma barra fina com a porcentagem no alto da
      tela. O termo de adesão (v17) passou a prever a atualização automática. Continua existindo, por
      exigência do Android: a chave "instalar apps desconhecidos" pedida uma única vez e, em Android
      anterior ao 12, a tela de confirmação do próprio sistema. A porcentagem vem do tamanho já baixado;
      se o celular não informar, é estimada pelo tempo.
- [x] Varredura de botões: 465 botões (em 85 arquivos) agora ficam em uma linha só, encolhendo a letra
      quando o nome não cabe. Fontes menores na página da empresa, nos números do painel e nos títulos.
- [x] Camada responsiva reforçada (`src/responsive.js`): a letra acompanha a largura da tela (base 392,
      a maioria dos Android tem 360), títulos e números grandes ficam contidos (acima de 16 crescem pela
      metade) e a letra grande do sistema aumenta o app no máximo 10%.
- [ ] Conferir no celular, tela por tela, antes da apresentação: nada disso foi visto num aparelho.

## Suporte aos usuários — novembro de 2026

- [x] Perfil › Ajuda e suporte: a Lotus responde as dúvidas comuns (12 perguntas frequentes), e o que
      ela não resolve vira chamado numerado, com assunto, conversa, "resolvido" e nota do atendimento.
      Pagamento, conta e biometria entram com prioridade.
- [x] Administrador › Suporte: fila (aguardando, respondidos, resolvidos), urgentes na frente,
      respostas prontas, encerrar chamado e nota média.
- [ ] Suporte: hoje os chamados ficam salvos no celular (usuário e administrador só se enxergam no
      mesmo aparelho). Com o servidor: chamados pelo servidor, aviso (notificação) quando a equipe
      responde, mais de um atendente e prazo de resposta. Revisar os textos das perguntas frequentes.
- [x] Atendimento só por mensagem (decisão do Evandro): na tela de entrada, "Não consigo entrar · Falar com o suporte" abre a mesma central sem precisar estar na conta (chamados ligados ao aparelho).
- [ ] Recuperação de senha automática ainda não existe: por enquanto é feita pela equipe, por chamado. Com o servidor, a equipe precisa de um jeito de redefinir a senha depois de confirmar a biometria.

## CRM profissional, equipe, catálogo e chamadas de voz — novembro de 2026

- [x] CRM: visões Funil, Hoje (responder, tarefas, retornos, parados, a receber) e Relatório (funil,
      conversão, dias para fechar, valor médio, origens, motivos de perda). Qualificação em 4 passos,
      temperatura (quente, morno, frio), tarefas, mensagens prontas por etapa.
- [x] Cliente que não fechou e escreve de novo: o atendimento recomeça do início (novo ciclo,
      qualificação zerada, histórico guardado).
- [x] Fechamento acompanhado pelo Re@lys: ao fechar, a taxa fica registrada (lojas 10%; serviços, aulas
      e atendimento online com a taxa de serviço; imóveis e veículos sem taxa no fechamento, pois pagam
      por plano ou por conversa). Administrador › Geral mostra os fechamentos e a taxa.
- [x] Prestador: pedidos de visita e visitas aceitas entram sozinhos no CRM (aba Clientes).
- [x] Equipe (botão no CRM): classes de funcionários (exemplos que o dono renomeia, altera, apaga e
      cria), funcionários com tela própria de controles, permissões, origens que atende, biometria
      obrigatória, responsabilidade da empresa e atendimento direcionado (distribuição automática).
- [x] Conversa do CRM: enviar catálogo da loja, chamada de voz e de vídeo, registro das chamadas.
      Conversas comuns também ganharam a chamada de voz.
- [ ] Depende do servidor: mensagem real do cliente (hoje há o botão "Simular mensagem do cliente"),
      cobrança do fechamento pelo Re@lys com desconto automático da taxa, login próprio de cada
      funcionário (hoje o perfil é criado dentro da empresa, no mesmo aparelho), permissões valendo
      por pessoa, chamada de voz real (hoje é demonstração visual) e o cliente tocar no catálogo para comprar.
- [x] Termo da empresa v3 (funcionários de atendimento, biometria, atendimento direcionado e fechamentos) e Termo de Adesão v18 (item 16-k: taxa sobre negócios fechados pelo CRM). Advogado revisar.
- [ ] Notificação com o app fechado: precisa da biblioteca de notificações, de uma conta Firebase
      (Google) do Re@lys e do servidor enviando os avisos. Ainda não instalado.
- [x] Food: atalhos Tudo, Pratos, Lanches, Pizza, Japonesa, Padaria, Café & Doces, Saudável e Bar & Drinks, filtrando as lojas pelos produtos de cada tipo.

## Depoimentos, prévia de perfil e convite para chamada na Arena — novembro de 2026

- [x] Perfil de amigo: botão "Deixar depoimento para…" logo abaixo de Mensagem e Presente.
- [x] Depoimentos: no feed da Community, "Deixar depoimento" e "Pesquisar depoimentos" (por nome ou
      @usuário, digitando ou por voz). Ao escrever, a escolha do contato tem pesquisa; quem ainda não é
      amigo aparece para ver a prévia e adicionar.
- [x] Tocar no nome ou na foto de alguém (stories, Reels, feed, depoimentos, mensagens, Arena, pesquisa):
      se for amigo, abre o perfil completo; se não for, abre uma prévia (quem é, posts, depoimentos e o
      botão de adicionar). Empresa abre a página da empresa.
- [x] Arena Gamer: segurar o nome de alguém (membros, jogando agora, sala de voz) abre "Convidar para
      chamada": chamar para a sala de voz em que você está, para outra sala ou chamada particular.
      Também nas opções da pessoa.
- [x] Arena: o botão de adicionar (👤+) convida amigos do Re@lys para a sala e tem "Enviar link por fora
      do app". O link abre uma página do Re@lys (servidor › /c/CÓDIGO) com "entrar na chamada" e
      "baixar o Re@lys" + os passos do cadastro. Depois do login ou do cadastro, o app leva direto para a
      sala. O convite vale 24 h (servidor › routes/convites.js).
- [ ] Depende do servidor no ar: colocar PUBLIC_URL no .env (endereço com https) para o link do convite.
      Sem servidor, o link só funciona entre quem já tem o app.
- [ ] Quando o domínio estiver definido: ligar os App Links do Android (o link https abrir o app direto,
      sem passar pela página). Hoje a página tem o botão "Já tenho o Re@lys: entrar na chamada".
- [ ] Voz real da Arena entre celulares (hoje a sala de voz e o "aceitou o convite" são demonstração).
