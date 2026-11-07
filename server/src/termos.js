// Termo de adesão do Realys. Aceito no primeiro acesso (cadastro). Quando o texto mudar, a versão muda,
// e quem já aceitou é convidado a aceitar de novo.
export const TERMO_ADESAO_VERSAO = '2026-11-adesao-v2';

export const TERMO_ADESAO = {
  versao: TERMO_ADESAO_VERSAO,
  titulo: 'Termo de Adesão ao aplicativo Realys',
  atualizado: '7 de novembro de 2026',
  itens: [
    {
      titulo: '1. Objeto',
      texto: 'Este termo regula o uso do aplicativo Realys, plataforma que reúne rede social, compras, serviços, negócios e relacionamentos. Ao criar sua conta, você declara ter lido este termo e concordar com as condições aqui descritas.',
    },
    {
      titulo: '2. Cadastro e identidade',
      texto: 'Para usar o Realys, é necessário informar dados verdadeiros, inclusive CPF ou CNPJ. A conta é pessoal. Você é responsável pelo sigilo de sua senha e pelas atividades realizadas com sua conta.',
    },
    {
      titulo: '3. Reconhecimento facial',
      texto: 'O Realys utiliza reconhecimento facial para confirmar que é você quem está usando a conta em situações que exigem maior segurança. Essa verificação ocorre nas seguintes situações: (a) no cadastro biométrico, com a foto do rosto e a foto de um documento de identidade válido; (b) quando um aparelho novo é vinculado à sua conta; (c) ao aceitar ou finalizar um serviço prestado pelo aplicativo; (d) ao realizar vendas e confirmar pedidos, quando você é lojista; (e) ao solicitar saques; e (f) a cada 2 horas, enquanto você estiver disponível para corridas e entregas.',
    },
    {
      titulo: '4. Como os dados biométricos são tratados',
      texto: 'As imagens do rosto são convertidas em um código matemático criptografado, que não permite reconstruir a sua fotografia. As fotos são usadas apenas no momento da verificação e são apagadas logo após a análise, salvo quando a equipe precisar revisar um cadastro, situação em que são apagadas ao fim da revisão. Os dados biométricos são sensíveis e são tratados com base no consentimento específico que você dá ao aceitar o cadastro, nos termos da Lei Geral de Proteção de Dados (LGPD).',
    },
    {
      titulo: '5. Documentos aceitos',
      texto: 'São aceitos documentos de identidade válidos: RG, Carteira Nacional de Habilitação, suas versões digitais oficiais e carteiras de classe profissional, como as de conselhos profissionais e de brigadistas. O documento deve estar dentro do prazo de validade e ter sido emitido há no máximo 10 anos. Documentos vencidos ou fora desses critérios não são aceitos.',
    },
    {
      titulo: '6. Consentimento e revogação',
      texto: 'Você pode retirar seu consentimento para o uso biométrico a qualquer momento, pelo Perfil, em "Gerenciar biometria facial". Nesse caso, o código biométrico e as fotos eventualmente guardadas são apagados. Algumas funções que dependem da verificação, como prestar serviços e receber pagamentos, deixam de estar disponíveis enquanto a verificação não for feita novamente.',
    },
    {
      titulo: '7. Guarda e segurança',
      texto: 'Mantemos registros das verificações e das decisões tomadas, para segurança e para atender a obrigações legais, pelo prazo previsto em lei. Adotamos medidas técnicas e administrativas para proteger seus dados, como criptografia, controle de acesso e cópias de segurança. Nenhum sistema é totalmente isento de riscos, e comunicaremos incidentes relevantes na forma da lei.',
    },
    {
      titulo: '8. Seus direitos',
      texto: 'Nos termos da LGPD, você pode solicitar a confirmação do tratamento, o acesso, a correção, a portabilidade e a eliminação dos seus dados, além de informações sobre o compartilhamento. As solicitações são feitas pelo aplicativo ou pelo canal de suporte do Realys.',
    },
    {
      titulo: '9. Uso adequado',
      texto: 'O Realys deve ser usado de forma respeitosa e lícita. Não é permitido criar contas falsas, usar o rosto ou a identidade de terceiros, burlar a verificação facial ou publicar conteúdo que viole a lei ou os direitos de outras pessoas. Contas que descumprirem estas regras podem ser suspensas.',
    },
    {
      titulo: '10. Alterações',
      texto: 'Este termo pode ser atualizado. Quando houver mudança relevante, você será convidado a ler e aceitar a nova versão antes de continuar usando as funções afetadas.',
    },
    {
      titulo: '11. Prazos de guarda e suporte',
      texto: 'As fotos usadas na verificação são apagadas logo após a análise. Revisões que ficam paradas por mais de 30 dias são recusadas e as fotos apagadas. Os registros de auditoria, que não contêm imagens, são mantidos por até 5 anos, pelo prazo de segurança e das obrigações legais. Para exercer seus direitos ou tirar dúvidas, use o canal de suporte do aplicativo. Respondemos no prazo previsto na LGPD.',
    },
    {
      titulo: '12. Disputas, reembolso e avaliações',
      texto: 'Problemas com um serviço ou uma compra devem ser comunicados pelo chat do pedido ou pelo suporte. Quando houver cobrança indevida, cancelamento ou serviço não prestado, o Realys analisa a situação com as partes e os registros do atendimento, e pode orientar o reembolso. Avaliações devem refletir a experiência real; avaliações falsas ou ofensivas podem ser removidas.',
    },
    {
      titulo: '13. Foro',
      texto: 'Fica eleito o foro da comarca de domicílio do usuário consumidor, nos termos do Código de Defesa do Consumidor, para dirimir questões decorrentes deste termo.',
    },
  ],
};

// Termo da empresa prestadora. A empresa aceita este termo antes de colocar qualquer colaborador para prestar serviço
// pelo Realys. Quando o texto mudar, a versão muda.
export const TERMO_EMPRESA_VERSAO = '2026-11-empresa-v2';

export const TERMO_EMPRESA = {
  versao: TERMO_EMPRESA_VERSAO,
  titulo: 'Termo de Responsabilidade da Empresa Prestadora',
  atualizado: '7 de novembro de 2026',
  itens: [
    {
      titulo: '1. Objeto',
      texto: 'Este termo regula a participação de empresas prestadoras de serviço que colocam colaboradores para atender clientes pelo Realys. Ao aceitá-lo, a empresa declara ter lido e concordar com as condições aqui descritas.',
    },
    {
      titulo: '2. Responsabilidade pelos colaboradores',
      texto: 'A empresa é responsável pelos serviços prestados por seus colaboradores em seu nome, durante o atendimento, inclusive por perda, extravio ou dano a bens do cliente, e pelos atos praticados nesse período. Essa responsabilidade é da empresa, e não do colaborador individualmente, nos termos da lei.',
    },
    {
      titulo: '3. Cadastro dos colaboradores',
      texto: 'A empresa cadastra cada colaborador com dados verdadeiros e vincula-o à sua estrutura. Só presta serviço pelo Realys o colaborador cadastrado e vinculado à empresa.',
    },
    {
      titulo: '4. Verificação facial dos colaboradores',
      texto: 'O colaborador que recebe um mandado de serviço pelo Realys aciona o aceite no próprio acesso e confirma sua identidade por verificação facial. Ao concluir o serviço, ele faz nova verificação facial para confirmar que executou aquele atendimento. Nas atividades de transporte, aplica-se também a verificação periódica prevista no termo de adesão. A empresa orienta seus colaboradores a cumprir essas verificações.',
    },
    {
      titulo: '5. Registro de horário e local',
      texto: 'O Realys registra o horário e o local em que cada atendimento acontece, com a identificação do colaborador. Esses registros servem para a segurança dos clientes e para a apuração de ocorrências.',
    },
    {
      titulo: '6. Documentação habilitatória',
      texto: 'A empresa mantém vigentes os documentos exigidos para cada categoria de serviço, como CNPJ, CNH na categoria adequada e, para o transporte de passageiros, a autorização de atividade remunerada na CNH. Para empresas com sociedade, basta a apresentação do documento de um dos sócios titulares. A empresa comunica ao Realys qualquer alteração nesses documentos.',
    },
    {
      titulo: '7. Ressarcimento e reparação',
      texto: 'Se o Realys tiver que responder ou arcar com prejuízo causado por colaborador da empresa durante o atendimento, a empresa ressarcirá o valor, na medida da sua responsabilidade e nos termos da lei, sem prejuízo de outras medidas cabíveis.',
    },
    {
      titulo: '8. Uso de dados do cliente',
      texto: 'Os dados do cliente obtidos durante o atendimento são usados somente para a prestação do serviço e para as obrigações legais, com o cuidado previsto na LGPD.',
    },
    {
      titulo: '9. Suspensão',
      texto: 'O Realys pode suspender temporariamente um colaborador, ou a própria empresa, quando houver descumprimento deste termo, verificação facial recusada ou documentação vencida, até a regularização.',
    },
    {
      titulo: '10. Alterações',
      texto: 'Este termo pode ser atualizado. Quando houver mudança relevante, a empresa será convidada a ler e aceitar a nova versão antes de continuar atendendo pelo Realys.',
    },
    {
      titulo: '11. Disputas e suporte',
      texto: 'Reclamações de clientes sobre os atendimentos são registradas no pedido e analisadas com a empresa, com base nos registros de horário, local e verificação. O Realys pode orientar o reembolso e a empresa será comunicada para se manifestar. Dúvidas e solicitações podem ser enviadas pelo canal de suporte do aplicativo.',
    },
    {
      titulo: '12. Foro',
      texto: 'Fica eleito o foro da comarca de domicílio do consumidor, quando aplicável, ou o foro da sede do Realys nas demais relações, para dirimir questões decorrentes deste termo.',
    },
  ],
};
