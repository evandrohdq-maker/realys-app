// Termo de adesão do Realys. Aceito no primeiro acesso (cadastro). Quando o texto mudar, a versão muda,
// e quem já aceitou é convidado a aceitar de novo.
export const TERMO_ADESAO_VERSAO = '2026-11-adesao-v8';

// Itens 1 a 13 tratam da conta e da biometria; 14 em diante, das regras de cada serviço, das taxas,
// da Lotus e do conteúdo. Texto a ser revisado por advogado antes do lançamento oficial.
export const TERMO_ADESAO = {
  versao: TERMO_ADESAO_VERSAO,
  titulo: 'Termo de Adesão ao aplicativo Realys',
  atualizado: '8 de novembro de 2026',
  itens: [
    {
      titulo: '1. Objeto',
      texto: 'Este termo regula o uso do aplicativo Realys, plataforma que reúne rede social, compras, comida, serviços, corridas e entregas, negócios, lives, encontros (Date), documentos e acesso a serviços públicos. Ao criar sua conta, você declara ter lido este termo e concordar com as condições aqui descritas. Algumas áreas têm termos próprios, que complementam este (por exemplo, os Termos do Encontros e o Termo da Empresa Prestadora).',
    },
    {
      titulo: '2. Quem pode usar, cadastro e identidade',
      texto: 'O Realys é só para maiores de 18 anos. Não aceitamos cadastro de menores, e contas de menores encontradas são encerradas. Para usar o Realys, é necessário informar dados verdadeiros, inclusive data de nascimento e CPF ou CNPJ. A conta é pessoal e intransferível. Você é responsável pelo sigilo de sua senha e pelas atividades realizadas com sua conta.',
    },
    {
      titulo: '3. Reconhecimento facial',
      texto: 'O Realys utiliza reconhecimento facial para confirmar que é você quem está usando a conta em situações que exigem maior segurança. Essa verificação ocorre nas seguintes situações: (a) no cadastro biométrico, com a foto do rosto e a foto de um documento de identidade válido; (b) quando um aparelho novo é vinculado à sua conta; (c) ao aceitar ou finalizar um serviço prestado pelo aplicativo; (d) ao realizar vendas e confirmar pedidos, quando você é lojista; (e) ao solicitar saques; e (f) a cada 2 horas, enquanto você estiver disponível para corridas e entregas.',
    },
    {
      titulo: '4. Como os dados biométricos são tratados',
      texto: 'As imagens do rosto são convertidas em um código matemático criptografado, que não permite reconstruir a sua fotografia. As fotos são usadas apenas no momento da verificação e são apagadas logo após a análise, salvo quando a equipe precisar revisar um cadastro, situação em que são apagadas ao fim da revisão. Os dados biométricos são sensíveis e são tratados com base no consentimento específico que você dá ao aceitar o cadastro, nos termos da Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).',
    },
    {
      titulo: '5. Voz do dono (Lotus por voz)',
      texto: 'Se você ativar a Lotus por voz, gravamos algumas frases curtas para que ela reconheça a sua voz. A partir delas é criado um código da voz (impressão de voz), guardado de forma criptografada só no seu celular. Ele serve apenas para que, quando você abrir a Lotus pela voz, ela atenda somente você. As gravações não são enviadas a ninguém e não são usadas para outra finalidade. A impressão de voz é um dado biométrico: você pode apagá-la a qualquer momento nas configurações da Lotus. Quando a Lotus é aberta pelo botão, qualquer voz pode falar com ela, mas ela nunca escuta a própria voz. O cadastro da voz é opcional, mas é ele que libera a confirmação por voz. No cadastro você escolhe como a Lotus vai chamar você (senhor, senhora, doutor, doutora, pelo nome ou por um apelido) e cadastra uma pergunta de segurança (por exemplo, "Qual a sua cor preferida?") com duas respostas gravadas pela sua voz: a resposta que libera e a resposta de segurança (item 18). A confirmação por voz tem duas perguntas: na primeira ("Você confirma?"), você responde "sim, confirmo" com a voz do titular; na segunda, a Lotus faz a sua pergunta de segurança, e só a resposta que libera conclui a compra, contratação, agendamento ou pagamento. A mesma pergunta de segurança é feita, depois da biometria, quando você assina um contrato pelo Realys; a assinatura feita com a resposta de segurança fica marcada como feita sob coação e não tem validade. Qualquer outra resposta não confirma nada. A pergunta e as respostas só são usadas no momento da confirmação e ficam guardadas só no seu celular, de forma criptografada. Sem o cadastro, ou em celulares que não permitem conferir a voz, toda confirmação é feita pelo botão na tela.',
    },
    {
      titulo: '6. Documentos aceitos',
      texto: 'São aceitos documentos de identidade válidos: RG, Carteira Nacional de Habilitação, suas versões digitais oficiais e carteiras de classe profissional, como as de conselhos profissionais e de brigadistas. O documento deve estar dentro do prazo de validade e ter sido emitido há no máximo 10 anos. Documentos vencidos ou fora desses critérios não são aceitos.',
    },
    {
      titulo: '7. Consentimento e revogação',
      texto: 'Você pode retirar seu consentimento para o uso biométrico a qualquer momento, pelo Perfil, em "Gerenciar biometria facial", e apagar a voz do dono nas configurações da Lotus. Nesse caso, o código biométrico e as fotos eventualmente guardadas são apagados. Algumas funções que dependem da verificação, como prestar serviços, receber pagamentos e sacar, deixam de estar disponíveis enquanto a verificação não for feita novamente.',
    },
    {
      titulo: '8. Guarda e segurança',
      texto: 'Mantemos registros das verificações e das decisões tomadas, para segurança e para atender a obrigações legais, pelo prazo previsto em lei. Adotamos medidas técnicas e administrativas para proteger seus dados, como criptografia, controle de acesso e cópias de segurança. Nenhum sistema é totalmente isento de riscos, e comunicaremos incidentes relevantes na forma da lei.',
    },
    {
      titulo: '9. Seus direitos',
      texto: 'Nos termos da LGPD, você pode solicitar a confirmação do tratamento, o acesso, a correção, a portabilidade e a eliminação dos seus dados, além de informações sobre o compartilhamento. As solicitações são feitas pelo aplicativo ou pelo canal de suporte do Realys. Os seus dados não são vendidos.',
    },
    {
      titulo: '10. Uso adequado',
      texto: 'O Realys deve ser usado de forma respeitosa e lícita. Não é permitido criar contas falsas, usar o rosto, a voz ou a identidade de terceiros, burlar a verificação facial, combinar pagamento por fora do aplicativo para fugir das regras, ou publicar conteúdo que viole a lei, este termo ou os direitos de outras pessoas. Contas que descumprirem estas regras podem ser advertidas, suspensas ou encerradas, conforme a gravidade.',
    },
    {
      titulo: '11. Alterações',
      texto: 'Este termo pode ser atualizado. Quando houver mudança relevante, você será convidado a ler e aceitar a nova versão antes de continuar usando o aplicativo ou as funções afetadas. A versão e a data do seu aceite ficam registradas na sua conta.',
    },
    {
      titulo: '12. Prazos de guarda e suporte',
      texto: 'As fotos usadas na verificação são apagadas logo após a análise. Revisões que ficam paradas por mais de 30 dias são recusadas e as fotos apagadas. Os registros de auditoria, que não contêm imagens, são mantidos por até 5 anos, pelo prazo de segurança e das obrigações legais. Os registros de acesso ao aplicativo são mantidos por 6 meses, como exige o Marco Civil da Internet (Lei 12.965/2014). Para exercer seus direitos ou tirar dúvidas, use o canal de suporte do aplicativo. Respondemos no prazo previsto na LGPD.',
    },
    {
      titulo: '13. Disputas, reembolso e avaliações',
      texto: 'Problemas com um serviço ou uma compra devem ser comunicados pelo chat do pedido ou pelo suporte. Quando houver cobrança indevida, cancelamento ou serviço não prestado, o Realys analisa a situação com as partes e os registros do atendimento (chat, GPS, QR Code da entrega, fotos e verificações), e pode determinar o reembolso. Avaliações devem refletir a experiência real; avaliações falsas ou ofensivas podem ser removidas. Seus direitos como consumidor, previstos no Código de Defesa do Consumidor, não são reduzidos por este termo.',
    },
    {
      titulo: '14. O papel do Realys',
      texto: 'O Realys é a plataforma que aproxima clientes, lojas, prestadores, motoristas, entregadores, criadores e pessoas. Os produtos são vendidos pelas lojas e os serviços são prestados pelos profissionais e empresas cadastrados, que respondem pelo que oferecem. O Realys verifica a identidade de todos, guarda o pagamento até a confirmação, oferece a Garantia Realys e analisa as reclamações, na forma deste termo e da lei.',
    },
    {
      titulo: '15. Garantia Realys e taxa de proteção',
      texto: 'Nas compras e serviços pagos pelo aplicativo, o pagamento fica retido e só é liberado a quem vendeu ou prestou o serviço depois que você confirma o recebimento (na entrega, pelo QR Code). Depois de confirmar, você ainda tem 7 dias para abrir um caso. O Realys responde em até 48 horas. Se der razão a você, o valor volta para a sua carteira. A garantia vale só para o que foi pago pelo Realys: não pague por fora. Nos pedidos de produtos (Shop e Food) é cobrada uma taxa de proteção fixa de R$ 0,99 por pedido, que custeia a garantia, a verificação por biometria e a segurança contra golpes, mostrada antes do pagamento. Quem tem o Score Realys Diamante não paga essa taxa.',
    },
    {
      titulo: '16. Taxas do Realys',
      texto: 'Todas as taxas são mostradas antes de você confirmar. (a) Pedidos de lojas: 10% sobre a venda, pagos pela loja; o cliente não paga a mais por isso. (b) Contratação de serviços: o prestador define a taxa de visita e o Realys fica com 10% dela; o valor final do serviço é combinado entre cliente e prestador. (c) Corridas e entregas: o Realys fica com 15% do valor da corrida. (d) Presentes: 10% do valor do presente. (e) Saque de presentes, conforme o item 21. (f) Boosts, anúncios e a assinatura Date+, pelo preço mostrado na tela. O Realys pode rever as taxas; a mudança vale só para o que for contratado depois do aviso.',
    },
    {
      titulo: '17. Preços das corridas e faixa justa dos serviços',
      texto: 'O preço da corrida é calculado antes de você pedir, pela distância, pelo tempo estimado e pela tarifa da categoria. Em horários de muita procura pode haver um acréscimo dinâmico, sempre limitado a 1,5 vez o preço normal e sempre mostrado antes da confirmação. Para visitas, consultas e atendimentos por vídeo, o Realys mantém uma faixa de preço justo de referência e avisa quando um valor está muito acima ou muito abaixo dela, para proteger clientes e profissionais.',
    },
    {
      titulo: '18. Espera, não comparecimento, chave de segurança e resposta de segurança',
      texto: 'Quando o motorista chega ao local de embarque, começa a contagem de espera. Se o passageiro não aparecer em até 10 minutos, a corrida é encerrada, o motorista recebe pela espera e o passageiro perde a corrida, sem reembolso desse valor. Motoristas e entregadores podem cadastrar uma chave de segurança secreta: ao dizer "Lotus" seguido dessa chave, o aplicativo aciona um alerta de emergência com a localização para a equipe de segurança do Realys e para as autoridades (Polícia Militar / Brigada Militar, 190). Clientes que cadastraram a voz do dono também têm a resposta de segurança: se forem obrigados a comprar, contratar ou pagar (assalto, sequestro, abordagem), ao dar a resposta de segurança na segunda pergunta da confirmação, a Lotus mostra na tela que deu tudo certo, mas a operação não é feita e nenhum valor é cobrado. Para você saber o que aconteceu, a frase final muda: na confirmação de verdade ela diz "Contrato finalizado com sucesso" (ou "Compra finalizada com sucesso"); com a resposta de segurança, ela diz "Contrato confirmado com sucesso, parabéns" (ou "Compra confirmada com sucesso, parabéns"); em silêncio, o aplicativo envia o alerta com a localização do GPS e o endereço aproximado para a equipe de segurança do Realys e liga para o 190. Chamada falsa: se a polícia ou a equipe de segurança confirmar que um alerta foi falso (brincadeira, teste ou trote), a conta é bloqueada na hora, o acesso à plataforma é encerrado e o saldo fica retido durante a apuração, podendo ser usado para ressarcir os custos e prejuízos causados, na forma da lei. Comunicar falsamente um crime ou acionar a polícia sem motivo também é crime (artigos 340 do Código Penal e 41 da Lei de Contravenções Penais). Quem foi bloqueado pode pedir a revisão do caso pelo suporte.',
    },
    {
      titulo: '19. Gorjeta e avaliação',
      texto: 'Depois que um pedido, serviço ou corrida é concluído, ele fica na sua lista por 7 dias úteis. Nesse prazo você pode dar gorjeta, que vai inteira para quem atendeu, e avaliar, se ainda não tiver avaliado. Depois desse prazo, o pedido vai para o histórico.',
    },
    {
      titulo: '20. Pontos Realys',
      texto: 'Os pontos que o Realys dá de presente (por avaliar, assistir, comprar, indicar, participar de campanhas e outras ações) valem somente para compras e serviços dentro da plataforma, como boosts, assinaturas e descontos. Esses pontos nunca podem ser sacados nem convertidos em dinheiro, não têm valor fora do Realys e podem ter prazo de validade, informado no aplicativo. Cada ponto vale R$ 0,01 nas compras dentro do Realys.',
    },
    {
      titulo: '21. Presentes, lives e saque dos criadores',
      texto: 'Nas lives e publicações, as pessoas podem enviar presentes pagos aos criadores. O Realys retém 10% de cada presente no envio. O que o criador recebe em presentes vira pontos de saque (R$ 1 = 100 pontos de saque), que são diferentes dos pontos de presente da plataforma. Saque normal: a partir de 50.000 pontos de saque, o criador recebe 75% do valor que os fãs pagaram nos presentes. Saque antecipado: a partir de 10.000 pontos de saque, o criador recebe 60% desse valor (15 pontos percentuais a menos, pela antecipação). O saque exige verificação facial e conta bancária ou chave Pix no nome do titular. Presentes ligados a fraude, estorno ou conteúdo proibido podem ser bloqueados e não entram no saque.',
    },
    {
      titulo: '22. Date (Encontros) e assinatura Date+',
      texto: 'O Date é uma área opcional, com termos próprios que você aceita ao entrar. Só participam maiores de 18 anos, verificados por biometria e com status disponível (solteiro, divorciado ou viúvo). A assinatura Date+ é oferecida nos planos semanal, mensal, semestral e anual, além de boosts avulsos, pelos preços mostrados na tela; pode ser paga com saldo ou com pontos. Assinar de novo soma os dias no fim da assinatura atual. Cancelar desliga só a renovação: o período já pago continua valendo até o fim. A chamada de vídeo do Date só existe entre pessoas que já deram match, só quando a outra pessoa está online e só para assinantes do Date+. Ela não toca nem faz som: chega como um convite discreto na tela, com as opções "Entrar agora" e "Recusar". Para entrar na chamada, também é preciso ser assinante.',
    },
    {
      titulo: '23. Contratos e assinatura eletrônica',
      texto: 'Pelo Realys você pode gerar contratos simples (aluguel, compra e venda, prestação de serviço) e assiná-los eletronicamente, com identificação por biometria, data, hora e um código de verificação, na forma da Lei 14.063/2020. As duas partes recebem uma cópia igual. O conteúdo do contrato é de responsabilidade de quem o preenche e assina; o Realys não presta assessoria jurídica. Para contratos que a lei exige registro em cartório ou assinatura com certificado digital ICP-Brasil, siga também essa exigência.',
    },
    {
      titulo: '24. Receitas e atendimentos de saúde',
      texto: 'Receitas e documentos de saúde só podem ser emitidos por profissionais com registro ativo e verificado (por exemplo, CRM, CRO ou CRMV), durante ou após um atendimento real, e somente dentro do que a sua formação permite. Hoje o Realys gera a receita com identificação do profissional e do paciente; receitas que a lei exige assinar com certificado digital ICP-Brasil (como as de medicamentos controlados) só valem depois dessa assinatura, que será integrada ao aplicativo. O atendimento por vídeo segue as regras do conselho de cada profissão. Em emergência, ligue 192 (SAMU) ou 193 (Bombeiros).',
    },
    {
      titulo: '25. Serviços públicos e cartão do SUS',
      texto: 'Bombeiros, Defesa Civil, hospitais públicos, UPAs e UBSs podem ter perfil oficial no Realys, com telefones, horários e informações publicadas pelos próprios órgãos. Você pode guardar no seu perfil o número do seu Cartão Nacional de Saúde (CNS) para pedir atendimento nas unidades que oferecem horários pelo Realys. Esses dados ficam guardados com segurança no seu celular e são enviados apenas à unidade que você escolher, só para o agendamento. A integração com os sistemas oficiais do governo depende de convênio com os órgãos públicos. O Realys não substitui os canais oficiais de emergência (190, 192, 193, 199).',
    },
    {
      titulo: '26. A Lotus, assistente do Realys',
      texto: 'A Lotus é a inteligência artificial do Realys. Ela segue regras fixas: (a) nunca age sozinha: só responde quando é chamada e só faz o que você pediu, dentro dos serviços oferecidos pelo Realys; (b) nunca contrata, agenda, compra ou chama um serviço sem a sua confirmação, pelo botão na tela ou, para quem cadastrou a voz do dono (item 5), respondendo as duas perguntas de confirmação com a própria voz; (c) nunca movimenta dinheiro sem a sua autorização: não paga, não transfere, não saca e não usa pontos sozinha; (d) nunca envia mensagens a ninguém por conta própria e nunca entra nas conversas entre pessoas; (e) nunca lê nem usa conversas privadas, chamadas, dados do Date, carteira ou pedidos de outras pessoas, e só aprende com o que é público no Realys; (f) nunca interfere nas relações humanas: não incentiva brigas, traições, mentiras, discriminação, racismo ou qualquer conduta de mau caráter; e (g) nunca ajuda a publicar nudez, pornografia ou conteúdo sexual envolvendo crianças ou adolescentes. As respostas da Lotus são informativas, podem conter erros e não substituem a orientação de um profissional; confira antes de decidir.',
    },
    {
      titulo: '27. Regras de conteúdo nas áreas públicas',
      texto: 'Em publicações, stories, comentários, perfis, anúncios, lojas, fotos do Date e lives, não é permitido: (a) nudez ou partes íntimas à mostra, pornografia e conteúdo sexual explícito; roupa de banho (biquíni, maiô, sunga) é permitida; (b) qualquer conteúdo que envolva criança ou adolescente em situação sexual ou íntima, o que é crime e é comunicado às autoridades; (c) racismo, injúria racial, discriminação e discurso de ódio contra qualquer pessoa ou grupo; (d) violência, ameaça, assédio ou incentivo ao crime; (e) informação falsa que possa causar dano; e (f) golpes e venda de produtos ou serviços proibidos. Textos passam por moderação automática antes de serem publicados, e fotos e vídeos podem ser analisados por inteligência artificial e pela equipe. Conteúdo fora das regras é removido, e a conta pode ser suspensa ou encerrada.',
    },
    {
      titulo: '28. Lives',
      texto: 'Nas transmissões ao vivo não é permitida nudez nem conteúdo sexual, mesmo que por poucos segundos. A live pode ser interrompida na hora pela moderação, e o criador pode perder os presentes recebidos nela. Quem assiste pode denunciar a qualquer momento. As lives passam pelos servidores do Realys apenas para chegar a quem está assistindo; gravações, quando houver, seguem os prazos informados no aplicativo.',
    },
    {
      titulo: '29. Conversas e chamadas privadas',
      texto: 'As conversas e chamadas privadas pertencem às pessoas que participam delas. O Realys não usa o conteúdo das suas conversas para anúncios, não o mostra a outras pessoas e não o usa para treinar a Lotus. As chamadas de vídeo vão direto de um celular ao outro sempre que possível. Enquanto um chat ou uma chamada privada estiver aberto, o aplicativo bloqueia print e gravação de tela no Android. Entre adultos que concordam, a conversa pode ter conteúdo íntimo, inclusive mostrar o próprio corpo numa chamada ou enviar uma foto de si mesmo a quem quer recebê-la. Essa é uma escolha das duas pessoas: o Realys não oferece esse tipo de conteúdo como serviço e não o promove. É proibido: (a) enviar conteúdo íntimo a quem não pediu ou não quer; (b) gravar, fotografar, guardar ou repassar a imagem íntima de outra pessoa sem a autorização dela, o que é crime (artigo 218-C do Código Penal); (c) usar conteúdo íntimo para chantagear ou ameaçar; e (d) qualquer conteúdo sexual com menores de 18 anos, ou cobrar por conteúdo sexual. Mesmo em conversas privadas, mensagens com racismo, ódio ou conteúdo sexual envolvendo menores são bloqueadas antes do envio. A equipe do Realys só tem acesso a uma conversa quando um dos participantes a denuncia (apenas ao trecho denunciado) ou por ordem judicial.',
    },
    {
      titulo: '30. Denúncias e medidas',
      texto: 'Todo perfil, publicação, live e conversa tem a opção de denunciar e bloquear. Quem denuncia não é identificado para a outra pessoa. As denúncias são analisadas pela equipe, que pode remover o conteúdo, advertir, suspender ou encerrar a conta. Casos de crime, especialmente envolvendo crianças e adolescentes, são preservados e comunicados às autoridades competentes, como determina a lei. Quem teve conteúdo removido pode pedir revisão pelo suporte.',
    },
    {
      titulo: '31. Foro',
      texto: 'Fica eleito o foro da comarca de domicílio do usuário consumidor, nos termos do Código de Defesa do Consumidor, para resolver questões decorrentes deste termo.',
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
