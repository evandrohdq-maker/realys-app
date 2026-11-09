# O que ainda falta para finalizar o Realys

Lista viva: o que já foi combinado e ficou para depois. Atualizada em novembro de 2026.

## ⚠️ CONTRATAR (aviso também no painel do administrador)

- [ ] **Servidor de vídeo (lives e chamadas)**: VPS **Hetzner CX22 ou CAX11**, Alemanha ou Finlândia,
      ~€ 4 a 10/mês com **20 TB de tráfego incluídos** (~44 mil horas de live assistidas por mês;
      passou disso, € 1 por TB). O sistema já está pronto: MediaMTX (lives) + coturn (chamadas).
      Passo a passo em `server/deploy/video/LEIA-ME.md`. Na fase de testes pode ser a mesma VPS do app.
- [ ] **Servidor do app** (contas, carteira, pedidos): `server/deploy/setup-ubuntu.sh`.
- [ ] **Domínios**: `api.` e `video.` apontando para as VPS.

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
- [ ] **Modo acessível**: letras maiores, alto contraste e modo simples para idosos em todo o app.
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
- [ ] Ligar no servidor: ORDER_FEE_PCT=10 e FOOD_FEE_PCT=11 quando sair da fase de testes.
- [ ] Tela "Por que o Realys é mais barato" usando `comparativo()` de src/taxas.js.
- [ ] Rever a tabela a cada 6 meses (o mercado muda: Shopee e Mercado Livre mudaram em 2026).

## Tele grátis e verificação de entregadores (novembro de 2026)

- [x] Primeira tele grátis paga pelo Realys (pedido mínimo R$ 30, orçamento de R$ 3 mil/mês que pausa sozinho)
      e tele grátis do restaurante (liga na página da empresa, com pedido mínimo e selo no Food). src/teleGratis.js.
- [x] Verificação facial de entregadores, motoboys e motoristas a cada 6 horas (BIOMETRIA_PERIODIC_HOURS).
- [ ] Levar o orçamento da primeira tele grátis para o servidor (hoje é contado no app) e mostrar no painel do administrador.
- [ ] Pix automático por API de banco (depósito e saque sem o administrador), quando tiver CNPJ e banco escolhido.
