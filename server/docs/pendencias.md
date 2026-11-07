# Pendências do Realys

Lista consolidada do que falta para finalizar. Detalhes de procedimentos estão em `docs/procedimentos.md`.

## Servidor: biometria e serviço de IA
- [ ] Instalar onnxruntime e OpenCV no servidor com GPU e publicar o serviço com o systemd (`biometria-ia/realys-biometria.service`).
- [ ] Testar com os pesos reais dos modelos (hoje só o modo stub foi testado).
- [ ] Decidir e registrar a licença do modelo usado.
- [ ] Calibrar o limiar de 80% (`BIOMETRIA_MATCH_MIN`, `BIOMETRIA_VERIFY_MIN`) com voluntários reais; 80% pode ser rígido para a mesma pessoa.
- [ ] Calibrar os limites de nitidez, reflexo e resolução do documento (`BIOMETRIA_DOC_SHARP_MIN`, `BIOMETRIA_DOC_GLARE_MAX`, `BIOMETRIA_DOC_MIN_SIDE`).
- [ ] Calibrar o limiar de movimento do scan (`BIOMETRIA_MOVE_MIN`).
- [ ] Gerar a chave com `deploy/gerar-chaves.sh`, guardar em dois lugares e testar a restauração.
- [ ] Configurar o destino de backup fora do servidor (`BACKUP_REMOTE_DIR`).
- [ ] Definir como um pedido de apagamento chega aos backups.

## Servidor: prestação de serviço
- [ ] Regras de documentos do prestador no servidor, iguais às do app: MEI com titular, CNH válida por categoria, EAR para passageiros, CNPJ com um sócio titular.
- [ ] Aplicar o prazo de 24 horas a partir do aceite, com o mandado indo para revisão quando vencer.
- [ ] Bloquear o repasse sem biometria de conclusão dentro do prazo.
- [ ] Gerar e validar o código de finalização (QR) do cliente no servidor.
- [ ] Persistir o chat do pedido durante o prazo.
- [ ] Modelo de empresa: cadastro, funcionários como subgrupo e aceite obrigatório do termo da empresa antes de atender.
- [ ] Vincular cada aceite e conclusão ao funcionário e à empresa responsável.
- [ ] Encaminhamento dos mandados da empresa para os funcionários.
- [ ] Pagamento e repasse reais, com um meio de pagamento contratado.

## Servidor: operação e direitos
- [ ] Canal de suporte e formulário de direitos do titular (LGPD), com registro de data e de cada pedido.
- [ ] Tela de revisão humana no painel administrativo, com prazo interno e motivo obrigatório.
- [ ] Definir quem são os revisores e treiná-los.

## App (APK)
- [ ] Ligar login e cadastro à API real. Hoje `LoginScreen` e `SignupForm` usam o armazenamento local de demonstração, e `api.js` ainda não está conectado.
- [ ] Fluxo de login: usuário e senha, com biometria só em aparelho novo. Decidir o que fica com a biometria do próprio aparelho para desbloqueio.
- [ ] Substituir os dados fictícios de prestação (`empresaDemo.js`, exemplos e a simulação de QR e de biometria) pelos dados do servidor.
- [ ] Tela de cadastro de empresa para aceitar o termo.
- [ ] Tela de suporte e de direitos do titular.
- [ ] Testar o scan em aparelho real. A captura de vídeo e de foto ao mesmo tempo pode falhar no Android.
- [ ] Classificação dos produtos do mercado: hoje é local por nome; o servidor já tem o campo `secao`.

## Decisões a confirmar com você
- [x] Primeiro cadastro segue o limiar de 80%. Abaixo disso, vai para revisão humana; nenhuma aprovação automática abaixo de 80%.
- [ ] Desbloqueio por biometria do aparelho continua ou sai, diante da regra de usuário e senha?
- [ ] Prazo de resposta aos direitos do titular (confirmar com o advogado).
- [ ] Prazo interno de análise de disputas (sugestão: 5 dias úteis).

## Jurídico e operacional
- [ ] Parecer de advogado sobre os termos, a base legal da LGPD, a responsabilidade da empresa, as regras de transporte e de MEI, e a licença dos modelos.
- [ ] Testes com rostos reais em homologação, com voluntários e termo assinado (protocolo em `procedimentos.md`, seção 5).
- [ ] Relatório dos testes de ataque: foto impressa, foto na tela e vídeo reproduzido.

## Opcional
- [ ] Endurecimento do APK (R8, Hermes, Play Integrity). Exige o pacote `expo-build-properties`, que não pôde ser instalado. Mesmo assim, o APK não pode ser totalmente protegido contra cópia.
