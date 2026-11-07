# Procedimentos do Realys

Este documento reúne as decisões de operação para evitar problemas futuros. Cada item diz o que já está definido, o que depende de uma pessoa (dono, equipe ou advogado) e o que ainda não foi feito.

Estado: **definido** = decidido e refletido no código ou nos termos. **Pendente** = depende de ação humana ou de outra etapa.

---

## 1. Parecer jurídico (pendente: advogado)

Não é possível concluir a regularização apenas pelo código. Antes de colocar o aplicativo em produção, um advogado precisa revisar, no mínimo:

- Termo de Adesão (`server/src/termos.js`, `TERMO_ADESAO`) e Termo de Responsabilidade da Empresa (`TERMO_EMPRESA`).
- Base legal para o tratamento de dados biométricos (LGPD): o termo usa consentimento específico. Confirmar se é a base correta para todas as finalidades.
- Responsabilidade civil da empresa pelos colaboradores e a cláusula de ressarcimento.
- Regras de transporte remunerado de passageiros (EAR na CNH e demais exigências do serviço) e de MEI.
- Prazo de resposta aos direitos do titular (texto cita a LGPD; confirmar o prazo aplicável).
- Consumidor: foro, reembolso, cancelamento e avaliações.
- Licença dos modelos de IA usados no serviço biométrico.

Checklist para entregar ao advogado: os dois termos, este documento, a lista de dados coletados (rosto, documento, horário e local dos atendimentos) e o tempo de guarda de cada um.

## 2. Retenção e apagamento de dados (definido, com risco aberto)

- Fotos de rosto e de documento: apagadas logo após a análise. Revisão parada por mais de **30 dias** é recusada e as fotos são apagadas (`BIOMETRIA_REVIEW_MAX_DAYS`).
- Registros de auditoria, sem imagens: mantidos por até **5 anos** (`AUDIT_KEEP_DAYS = 1825`).
- Sessões expiradas: removidas pela rotina de manutenção.
- Código biométrico (template): guardado cifrado enquanto o cadastro estiver ativo. Revogação apaga o código e as fotos guardadas.
- Risco aberto: **backups** guardam cópias antigas por até **14** versões (`BACKUP_KEEP`). Um pedido de apagamento precisa chegar aos backups. Definir a regra: os backups são substituídos pela rotação e não são restaurados com dados apagados.

## 3. Revisão humana (definido, falta equipe)

- Casos sem decisão automática (semelhança abaixo de **80%**, prova de vida duvidosa, documento ilegível ou rosto não encontrado no documento) vão para revisão humana. **Nenhuma aprovação automática abaixo de 80%.**
- Quem revisa: somente administradores, pela tela de biometria do painel administrativo (`/admin/biometria`).
- Regras para o revisor:
  - Conferir as duas fotos (rosto e documento) antes de aprovar.
  - Recusar com um motivo escrito, que o cliente recebe.
  - Não aprovar por pressão do cliente ou por urgência de um serviço.
  - Registrar a decisão no histórico (já é feito pelo sistema).
- Pendente: definir quem são os revisores, treiná-los e fixar o prazo de resposta interno (sugestão: 2 dias úteis, com o limite de 30 dias para o caso parado).

## 4. Chave de criptografia (definido, depende do dono)

- A chave `BIOMETRIA_KEYS` é gerada uma vez com `server/deploy/gerar-chaves.sh`, guardada no `.env` com permissão 600, e **não** vai para o repositório nem para o backup em texto puro.
- Se a chave for perdida, os códigos biométricos cifrados **não podem ser recuperados**. Os usuários precisariam refazer o cadastro. Por isso:
  1. Guardar a chave em dois lugares separados (cofre pessoal e cópia lacrada em outro local).
  2. Nunca apagar uma chave antiga antes de a rotação terminar.
  3. Para trocar a chave: gerar uma nova com identificador maior (`2:...`), manter a antiga na variável (`BIOMETRIA_KEYS=2:nova,1:antiga`) e rodar o job `rotacao-chaves`. Só depois remover a antiga.
- Pendente: o dono precisa guardar a chave e testar uma vez a restauração com a cópia lacrada.

## 5. Testes com rostos reais (definido o protocolo, pendente a execução)

Os testes automatizados usam dados fictícios. Antes de liberar o cadastro, testar com pessoas reais em ambiente de homologação:

- Participantes: voluntários da equipe, com termo assinado, nunca público.
- Medir a taxa de falsa recusa (pessoa certa recusada) e de falsa aceitação (pessoa errada aceita) com o limiar de 80%. Se a falsa recusa for alta, o limiar precisa ser recalibrado (`BIOMETRIA_MATCH_MIN`, `BIOMETRIA_VERIFY_MIN`) com registro do motivo.
- Testar ataques básicos: foto impressa, foto na tela, vídeo reproduzido, duas pessoas diante da câmera.
- Testar documentos: borrado, com reflexo, vencido, emitido há mais de 10 anos, com foto recortada.
- Testar luz ruim e câmera de celular comum.
- Registrar os resultados num relatório. As imagens dos testes são apagadas ao fim.

## 6. Suporte e direitos do titular (parcialmente definido)

- Definido nos termos: o usuário pode pedir confirmação, acesso, correção, portabilidade e eliminação; e pode revogar o consentimento biométrico em "Gerenciar biometria facial".
- Pendente no app/servidor: o canal de suporte e o formulário de direitos ainda não existem. Criar uma tela de suporte com registro de cada pedido e data.
- Prazo de resposta: o termo cita a LGPD. Confirmar o prazo com o advogado (o texto não fixa um número de dias).

## 7. Disputas, reembolso e avaliações (definido)

Passo a passo:
1. O cliente registra o problema no chat do pedido.
2. Se não resolver, abre um pedido no suporte.
3. A equipe analisa com os registros do atendimento: horário, local, verificação facial do aceite e da conclusão, e o QR lido.
4. A decisão é comunicada ao cliente e à empresa ou ao prestador, que pode se manifestar.
5. Reembolso ou ajuste quando couber.
6. Avaliações falsas ou ofensivas podem ser removidas.

Prazo interno de análise: **7 dias úteis**. Pendente: definir quem decide os casos.

## 8. Regras de operação já definidas no código

- Prestador tem **24 horas**, a partir do aceite, para finalizar e fazer a biometria de conclusão. Fora desse prazo, o mandado vai para revisão e não há repasse.
- O código de finalização só deve ser enviado ao prestador **depois** do serviço concluído. O aviso aparece no app.
- Repasse só ocorre com a biometria de conclusão feita dentro do prazo.
- Transporte de passageiros: verificação periódica a cada 2 horas enquanto o prestador estiver disponível.

Observação: as regras de prazo e de repasse acima estão, por enquanto, só na demonstração do app. A aplicação real depende do servidor (seção 9).

## 9. O que depende do servidor

- Aplicação do prazo de 24 horas e do bloqueio de repasse.
- Geração e validação do QR do cliente.
- Persistência do chat do pedido.
- Modelo de empresa com funcionários e aceite obrigatório do termo da empresa.
- Pagamento e repasse reais, que dependem de um meio de pagamento contratado.
