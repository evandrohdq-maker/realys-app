// Termo de adesão do Realys. Aceito no primeiro acesso (cadastro). Quando o texto mudar, a versão muda,
// e quem já aceitou é convidado a aceitar de novo.
export const TERMO_ADESAO_VERSAO = '2026-11-adesao-v1';

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
      titulo: '11. Foro',
      texto: 'Fica eleito o foro da comarca de domicílio do usuário consumidor, nos termos do Código de Defesa do Consumidor, para dirimir questões decorrentes deste termo.',
    },
  ],
};
