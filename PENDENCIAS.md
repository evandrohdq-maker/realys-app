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
  - Gerar **QR Code de conferência** nos PDFs apontando para uma página de verificação do Realys.
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

- [ ] **IA de imagem no servidor para nudez** (fotos de posts, stories, perfil do Date e quadros das lives).
      Hoje o texto é moderado no celular (src/moderation.js) e as fotos têm a regra confirmada por quem publica
      e denúncia; falta a checagem automática da imagem (modelo aberto rodando no próprio servidor, sem mandar
      foto para fora).
- [ ] **Repetir a moderação de texto no servidor** quando posts, comentários e mensagens passarem por ele.
- [ ] **Canal de denúncia às autoridades** (SaferNet / Polícia Federal) para conteúdo com menores, com
      preservação das provas, e responsável pela moderação definido na empresa.
- [ ] **Advogado revisar o Termo de Adesão v13** e os Termos do Encontros v0.2 antes do lançamento oficial.

## Date+

- [ ] **Cobrança da assinatura pela loja:** assinatura de conteúdo digital vendida dentro do app precisa seguir
      as regras do Google Play (cobrança do Google Play ou o sistema alternativo permitido no Brasil). Hoje o
      Date+ é pago com saldo ou pontos; confirmar o modelo com o contador e as regras da loja antes de lançar.
- [ ] Guardar a assinatura no servidor e checar o Date+ também lá na chamada de vídeo (hoje é conferido no app).
- [ ] Revisar os preços do Date+ a cada 6 meses comparando com Tinder, Happn e Bumble.

## Segurança do cliente (pergunta de segurança)

- [ ] Levar os alertas de segurança e o bloqueio por chamada falsa para o servidor (hoje ficam no celular e
      no painel local); bloquear a conta e reter o saldo também na carteira do servidor.
- [ ] Central de segurança do Realys 24 h recebendo os alertas e falando com a polícia, para não depender
      só da ligação do celular (a ligação para o 190 aparece na tela de quem está perto).
- [ ] Advogado revisar a retenção do saldo por chamada falsa (reter durante a apuração e para ressarcir custos
      é mais seguro do que perder tudo automaticamente).

- [ ] Contrato assinado sob coação: marcar o PDF/verificação do contrato como sem validade também no
      servidor (hoje a marca fica no celular) e avisar a outra parte só depois da apuração.

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
- [ ] Levar os pedidos (sosRequests) para o servidor, com fila da central 24 h.

- [ ] **Carteira profissional (já pronto no código, falta contratar):**
      - CFM (médicos): webservice oficial, R$ 948/ano → CFM_WS_URL/CFM_WS_KEY; ajustar src/cfm.js ao manual que vem com a chave.
      - CRP, CRMV, COREN, CRO, CREA: Infosimples → INFOSIMPLES_TOKEN; conferir os caminhos de COREN/CRO/CREA de cada
        estado e preencher CONSELHO_PATHS. Testar uma consulta real de cada conselho antes de lançar.
      - OAB: pedir acordo ao Conselho Federal (o CNA não pode ser repassado sem autorização); até lá, conferência manual.
      - E-mail institucional: contratar o envio (Resend) → RESEND_API_KEY/EMAIL_FROM.
      - Painel do administrador ler a fila do servidor (/admin/credenciais) quando o servidor estiver no ar.
- [ ] Casos para profissionais: levar para o servidor, com registro de quem viu e quem acompanhou cada caso.

## Lotus

- [ ] Calibrar a **voz do titular** com vozes reais (o Evandro manda os números da "Última conferência"
      do Perfil, dele e de outra pessoa).
- [ ] **Detector próprio do "Lotus"** dentro do app (mais rápido que o do Google, se a abertura ainda
      passar de meio segundo).
- [ ] "Abrir Lotus" com o **celular bloqueado** (serviço em segundo plano com aviso fixo).

## Negócio

- [ ] **Alinhar a taxa de presentes do servidor com o app:** no app são 10% descontados do presente; o servidor
      ainda cobra 5% por cima (GIFT_FEE_PCT). Mudar junto com os testes antes de ligar os pagamentos reais.

- [ ] **Calibrar a Tarifa Realys e as faixas justas** com dados reais da plataforma (src/pricing.js):
      os apps grandes não divulgam mais as tarifas; as faixas de consulta médica geral estão marcadas
      como provisórias. Revisar a parte do Realys nas corridas (hoje 15%).

- [ ] **Dezembro de 2026:** revisar a Taxa de proteção Realys (R$ 0,99 fixa) e a ideia de taxa
      variando por horário.
- [ ] Aba **Desapego** (clientes vendendo itens usados entre eles).
- [ ] Decidir banco (nacional ou estrangeiro) e o cálculo de margem com os impostos da nota.
