# Notas fiscais e impostos do Realys

O código já está pronto e desligado (`FISCAL_ATIVO=false`). Enquanto isso, toda taxa que o Realys
cobra fica registrada como receita, e o resumo do mês já mostra receita, imposto estimado e lucro.
Quando a empresa e o servidor estiverem prontos, siga os passos abaixo.

## O que o sistema faz

| Parte | Como funciona |
| --- | --- |
| Receitas do Realys | Comissão de pedido, taxa de presente, taxa de live, proteção, visita, planos e anúncios viram receita no momento do pagamento |
| Nota do Realys (NFS-e) | Emitida no Emissor Nacional da Receita, por API, assinada com o certificado A1. Uma nota por taxa, por dia ou por mês por cliente (`FISCAL_AGRUPAR`) |
| Cancelamento | Pedido cancelado: a receita sai da fila, ou a nota já emitida é cancelada (evento e101101) |
| Erros | Instabilidade da Receita: tenta de novo sozinho até 5 vezes. Dado errado: fica com erro no painel para corrigir e reenviar |
| Nota das lojas (NF-e) | A loja liga "emitir pelo Realys" e informa o NCM dos produtos. A nota sai no CNPJ da loja pelo emissor parceiro (Focus NFe) |
| Impostos | Simples Nacional (Anexos I, III e V), Lucro Presumido, MEI e campos da reforma tributária (CBS e IBS) |
| Lucro | Resumo do mês com receita, imposto, custos e quanto falta para empatar. Avisa prejuízo, teto do Simples e certificado vencendo |
| MEI | Prestadores e lojas MEI veem quanto já usaram do teto anual (aviso em 80%, 100% e 120%) |

## Passo a passo para ligar

1. **Abrir o CNPJ** do Realys em Passo Fundo e pegar a **inscrição municipal** na prefeitura.
2. **Comprar o certificado digital A1** (e-CNPJ, arquivo `.pfx`) numa certificadora.
3. No servidor, converter o certificado: `bash deploy/certificado-fiscal.sh certificado.pfx`.
4. **Reunião com o contador** para conferir os itens da tabela abaixo e preencher o `.env`.
5. Ligar em **teste**: `FISCAL_ATIVO=true` e `FISCAL_AMBIENTE=2` (produção restrita da Receita).
6. Fazer pedidos de teste e conferir no painel: `GET /admin/fiscal/notas` e `GET /admin/fiscal/resumo`.
7. Com tudo certo e o contador de acordo: `FISCAL_AMBIENTE=1` (produção).

## O que o contador precisa confirmar

| Item no .env | Padrão no código | O que conferir |
| --- | --- | --- |
| `FISCAL_REGIME` | simples | Simples Nacional, Lucro Presumido ou MEI |
| `FISCAL_ANEXO` | fatorR | Intermediação de negócios é Anexo V sujeita ao fator R: com folha + pró-labore de 28% ou mais da receita, vai para o Anexo III |
| `FISCAL_FOLHA_12M` | 0 | Folha, pró-labore e encargos dos últimos 12 meses (o contador atualiza todo mês) |
| `FISCAL_CTRIBNAC` | 100501 | Código de tributação nacional do serviço (item 10.05 da LC 116: intermediação) |
| `FISCAL_CTRIBMUN` e `FISCAL_NBS` | vazio | Código municipal de Passo Fundo e código NBS, se a prefeitura exigir |
| `FISCAL_ISS_PCT` | 5 | Alíquota de ISS de Passo Fundo para o serviço |
| `FISCAL_AGRUPAR` | imediato | Se pode emitir uma nota por mês para cada cliente, em vez de uma por taxa |
| `FISCAL_DESTACAR_IBS_CBS` | false | Quando passar a destacar CBS e IBS na nota (reforma tributária) |
| `FISCAL_RBT12_INICIAL` | 0 | Faturamento da empresa fora do Realys nos últimos 12 meses |

Também vale o contador conferir quem é o "tomador" de cada taxa. No código, a comissão de pedido sai
em nome da loja, e as taxas de presente e de live saem em nome de quem enviou o presente.

## Rotas novas

| Rota | Quem usa | Para quê |
| --- | --- | --- |
| `GET /admin/fiscal/resumo?mes=AAAA-MM` | administrador | Receita, impostos, custos, lucro e avisos do mês |
| `GET /admin/fiscal/notas?status=erro` | administrador | Notas emitidas, na fila ou com erro |
| `POST /admin/fiscal/processar` | administrador | Rodar a emissão agora (ela também roda sozinha a cada 5 minutos) |
| `POST /admin/fiscal/notas/:id/reenviar` | administrador | Reenviar uma nota depois de corrigir o dado |
| `POST /admin/fiscal/receitas` | administrador | Lançar uma receita recebida fora do app (ex.: plano pago por Pix direto) |
| `GET /admin/fiscal/simular` | administrador | Simular o imposto de uma nota |
| `GET /fiscal/notas` | cliente | Minhas notas fiscais, com o link da consulta pública |
| `GET /fiscal/mei` | prestador ou loja MEI | Quanto já usou do teto do MEI no ano |
| `GET /fiscal/calculadora?receitaMes=` | qualquer conta | Comparar MEI, Simples e Lucro Presumido |
| `GET` e `PUT /companies/me/fiscal` | loja | Ligar a NF-e pelo Realys (exige NCM em todos os produtos) |
| `PUT /products/:id/ncm` | loja | Informar o NCM de um produto |

## Premissas conferidas em novembro de 2026

| Premissa | Situação | Fonte |
| --- | --- | --- |
| Tabelas do Simples (Anexos I, III e V) e ISS limitado a 5% | Confere, sem mudança em 2026 | LC 123/2006 com a LC 155/2016 |
| Intermediação de negócios no Simples | Corrigido: Anexo V com fator R (antes estava fixo no III) | LC 123, art. 18, § 5º-M |
| Teto do MEI | Corrigido: R$ 81 mil em 2026, R$ 110 mil em 2027 e R$ 140 mil a partir de 2028 | LC 238/2026 |
| Lucro Presumido | Corrigido: presunção de 35,2% sobre a receita acima de R$ 5 milhões no ano | LC 224/2025 |
| CBS 0,9% e IBS 0,1% em 2026 | Confere: Simples dispensado; regime regular obrigado a destacar (por isso o Presumido fica bloqueado até montar o grupo IBS/CBS) | LC 214/2025, arts. 343, 346 e 348 |
| Leiaute da NFS-e | Corrigido para 1.01 (a produção restrita só aceita 1.01 desde 12/2025) | Portal Nacional NFS-e |
| Id da DPS com 45 caracteres e envio em `dpsXmlGZipB64` com mTLS | Confere | Manual da API do Sistema Nacional NFS-e |
| Código de serviço 100501 (10.05.01) | Existe na lista nacional; o contador confirma se é o certo para o Realys | Lista nacional NFS-e |
| ISS de Passo Fundo para o item 10.05 | **Não confirmado**: a cidade cobra de 2% a 5%; padrão de 5% até o contador confirmar | Legislação municipal |

**Atenção para 2027:** pela reforma tributária (LC 214/2025, arts. 22 e 23), plataformas digitais como o
Realys passam a responder pela CBS e pelo IBS das vendas feitas por elas e precisam se inscrever no regime
regular desses tributos. Isso pode afetar a escolha do Simples. É a primeira conversa a ter com o contador.

## Antes de ir para produção

- O formato da DPS segue o leiaute 1.00 do Sistema Nacional NFS-e. A Receita atualiza o leiaute de
  tempos em tempos: confira a documentação técnica em gov.br/nfse e faça as notas de teste primeiro.
- As tabelas do Simples e do Lucro Presumido estão em `src/fiscal/impostos.js`. Se a lei mudar (ex.:
  novo teto do MEI), é só atualizar ali.
- O cálculo é uma estimativa para planejamento. A guia oficial (DAS ou DARF) continua sendo feita pelo
  contador nos sistemas da Receita.
