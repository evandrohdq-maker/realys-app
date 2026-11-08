# O que ainda falta para finalizar o Realys

Lista viva: o que já foi combinado e ficou para depois. Atualizada em novembro de 2026.

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

## Lotus

- [ ] Calibrar a **voz do titular** com vozes reais (o Evandro manda os números da "Última conferência"
      do Perfil, dele e de outra pessoa).
- [ ] **Detector próprio do "Lotus"** dentro do app (mais rápido que o do Google, se a abertura ainda
      passar de meio segundo).
- [ ] "Abrir Lotus" com o **celular bloqueado** (serviço em segundo plano com aviso fixo).

## Negócio

- [ ] **Calibrar a Tarifa Realys e as faixas justas** com dados reais da plataforma (src/pricing.js):
      os apps grandes não divulgam mais as tarifas; as faixas de consulta médica geral estão marcadas
      como provisórias. Revisar a parte do Realys nas corridas (hoje 15%).

- [ ] **Dezembro de 2026:** revisar a Taxa de proteção Realys (R$ 0,99 fixa) e a ideia de taxa
      variando por horário.
- [ ] Aba **Desapego** (clientes vendendo itens usados entre eles).
- [ ] Decidir banco (nacional ou estrangeiro) e o cálculo de margem com os impostos da nota.
