// Conhecimento do Realyz dentro da Lotus — 100% no celular, sem servidor, sem internet e sem custo.
//
// O que ela sabe:
//   1. Respostas sobre o Realyz (como funciona cada coisa, taxas, garantia, pontos, saque, biometria,
//      Date, lives, contratos...). Os números vêm das tabelas do próprio app (src/taxas.js,
//      src/rewards.js, src/gifts.js, src/guarantee.js): mudou a taxa lá, a Lotus já responde certo.
//   2. O Termo de Adesão e o Termo da Empresa inteiros: o que não estiver nas respostas prontas ela
//      procura no termo e responde com as frases que tratam do assunto, dizendo o item.
//   3. A conta de quem pergunta: saldo, pontos, pedidos esperando resposta, biometria, carrinho.
//      "Quanto tenho de saldo?" ou "meu pedido não chegou" vêm com os dados da própria pessoa.
//
// Como ela entende (não é só palavra-chave):
//   • pelo SENTIDO da frase, com o modelo de linguagem da Lotus (src/lm/lotusLM.js): "quero tirar
//     minha grana" cai em saque mesmo sem a palavra "saque";
//   • pelas PALAVRAS em comum, pesando mais as raras ("estorno" vale mais que "pedido");
//   • as duas notas juntas decidem. Se a pergunta tiver dois assuntos ("como saco e quanto é a taxa?"),
//     ela responde os dois. Se não tiver certeza, diz o que entendeu e sugere as perguntas parecidas.
//
// Regra: a Lotus só INFORMA. Nunca mexe em dinheiro, conta ou pedido sozinha.
import { TAXAS } from '../taxas';
import { TERMO_ADESAO, TERMO_EMPRESA } from '../termoAdesao';
import { POINT_VALUE, EARN_PCT, POINTS_PER_RATING, POINT_RULES } from '../rewards';
import { GIFT_FEE_PCT, GIFT_MIN, GIFT_MAX, CASHOUT_MIN_POINTS, CASHOUT_EARLY_MIN_POINTS, CASHOUT_KEEP_PCT, CASHOUT_EARLY_KEEP_PCT, CASHOUT_POINTS_PER_REAL } from '../gifts';
import { GUARANTEE_DAYS, GUARANTEE_ANSWER_HOURS } from '../guarantee';
import { encode, likeness } from './lotusLM';
import { FAQ } from '../supportFaq';
import { desapegoFee } from '../desapego';

const brl = (v) => 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d),)/g, '.');
const n0 = (v) => Number(v || 0).toLocaleString('pt-BR');
const first = (name) => String(name || '').split(' ')[0];

// ---------------------------------------------------------------------------------------------
// Respostas prontas. ex = jeitos de perguntar (do jeito que o povo fala); a = resposta (texto ou
// função que recebe o estado do app, para responder com os dados da própria pessoa).
// topic = assunto do chamado de suporte, caso a pessoa queira falar com a equipe.
// ---------------------------------------------------------------------------------------------
const T = TAXAS;
const ENTRIES = () => [
  // ----- O Realyz -----
  { id: 'o-que-e', topic: 'outro', q: 'O que é o Realyz?', ex: ['o que é esse app', 'pra que serve o realys', 'como funciona o aplicativo', 'o que dá pra fazer aqui', 'me explica o realys'],
    a: 'O Realyz junta tudo num app só: rede social, Shop, Food, serviços, corridas, negócios, lives, músicas e muito mais. Todo mundo aqui é gente de verdade, com biometria. Por isso não tem perfil fake, e o seu dinheiro fica protegido até você receber o que comprou.' },
  { id: 'seguranca', topic: 'outro', q: 'Por que o Realyz é seguro?', ex: ['é seguro comprar aqui', 'posso confiar no app', 'tem golpe aqui', 'perfil fake', 'como sei que a pessoa é real', 'é confiável'],
    a: `Cada conta tem dono identificado pela biometria, então não tem perfil fake, e quem aplica golpe não volta com outra conta. Nas compras e serviços o pagamento fica retido e só é liberado quando você confirma que recebeu (Garantia Realyz). Uma dica: pague sempre pelo Realyz, nunca por fora.` },
  { id: 'idade', topic: 'conta', q: 'Menor de idade pode usar?', ex: ['tenho 16 anos posso usar', 'idade mínima', 'menor de 18', 'meu filho pode ter conta', 'adolescente pode entrar'],
    a: 'Não. O Realyz é só para maiores de 18 anos. Contas de menores encontradas são encerradas.' },

  // ----- Conta, biometria, acesso -----
  { id: 'biometria', topic: 'biometria', q: 'Por que preciso da biometria?', ex: ['pra que serve a biometria', 'não quero fazer reconhecimento facial', 'preciso cadastrar meu rosto', 'sem biometria posso comprar', 'por que pede minha cara', 'modo social'],
    a: (s) => {
      const ok = s && s.user && s.user.verified !== false;
      return 'A biometria confirma que a conta é de uma pessoa de verdade, e isso acaba com perfil fake e golpe. Sem ela você navega, posta e conversa normalmente, mas não compra nem contrata. ' +
        (ok ? 'A sua já está cadastrada. ✓' : 'A sua ainda não está cadastrada: vá em Perfil e toque em "Conta no modo social" para fazer em menos de um minuto.');
    }, go: { tab: 'perfil', biometria: true } },
  { id: 'biometria-dados', topic: 'biometria', q: 'O que vocês fazem com o meu rosto?', ex: ['minha foto fica guardada', 'vocês vendem meus dados', 'onde fica minha biometria', 'privacidade do reconhecimento facial', 'apagam minha foto'],
    a: 'O rosto vira um código matemático criptografado, que não permite refazer a sua foto. As fotos servem só para a verificação e são apagadas logo depois da análise (ou ao fim de uma revisão da equipe). Tudo com o seu consentimento, pela LGPD, e você pode pedir a exclusão pelo Suporte.' },
  { id: 'senha', topic: 'conta', q: 'Esqueci a senha ou não consigo entrar', ex: ['esqueci minha senha', 'não consigo logar', 'perdi o acesso', 'troquei de celular', 'roubaram meu celular', 'conta bloqueada'],
    a: 'Confira usuário e senha (maiúsculas contam). Se esqueceu a senha, trocou ou perdeu o celular, abra um chamado de "Conta e acesso" com o seu nome e o usuário: a equipe confirma que é você pela biometria e libera. Dá para abrir o chamado pela tela de entrada, mesmo sem estar logado.' },
  { id: 'conectado', topic: 'conta', q: 'Preciso digitar a senha toda vez?', ex: ['ficar logado', 'continuar conectado', 'salvar meu usuário', 'trocar de usuário', 'celular da empresa com vários funcionários'],
    a: 'Não. Depois do primeiro acesso o app te mantém conectado. Na entrada tem "Salvar usuário" para não digitar sempre e "Trocar usuário" para celular compartilhado, como o de uma empresa.' },
  { id: 'apagar-conta', topic: 'conta', q: 'Como apago a minha conta?', ex: ['excluir minha conta', 'deletar meus dados', 'sair do realys', 'lgpd', 'quero cancelar minha conta'],
    a: 'Abra um chamado de "Conta e acesso" pedindo a exclusão. A equipe confirma que é você e apaga a conta e a biometria, guardando só o que a lei obriga (como os registros de acesso por 6 meses).' },
  { id: 'atualizacao', topic: 'app', q: 'Como o app se atualiza?', ex: ['atualizar o aplicativo', 'versão nova', 'como baixo a atualização', 'barra de porcentagem ao abrir', 'o app atualizou sozinho'],
    a: 'Sozinho. Ao abrir com internet, o Realyz confere se tem versão nova, baixa e instala por cima da atual, só com uma barrinha de avanço. Sua conta e seus dados continuam iguais.' },
  { id: 'erro', topic: 'app', q: 'O app está travando ou com erro', ex: ['travou', 'deu erro', 'está lento', 'fecha sozinho', 'não abre', 'bug'],
    a: 'Feche e abra o Realyz de novo, com internet: ele se atualiza ao abrir e isso costuma resolver. Se continuar, abra um chamado dizendo em qual tela acontece, que a equipe corrige rápido.' },

  // ----- Carteira, Pix, saque -----
  { id: 'saldo', topic: 'pagamento', q: 'Quanto eu tenho de saldo?', ex: ['meu saldo', 'quanto dinheiro eu tenho', 'ver minha carteira', 'meu extrato', 'quanto tenho na conta'],
    a: (s) => s ? `Você tem ${brl(s.wallet)} de saldo${s.giftCredits ? ` e ${brl(s.giftCredits)} em créditos de presente` : ''}. O extrato completo (depósitos, gastos e saques) está em Perfil › Carteira.` : 'O saldo e o extrato ficam em Perfil › Carteira.',
    go: { tab: 'perfil', wallet: true } },
  { id: 'depositar', topic: 'pagamento', q: 'Como coloco saldo na carteira?', ex: ['depositar dinheiro', 'colocar crédito', 'recarregar a carteira', 'pagar com pix', 'adicionar saldo'],
    a: 'Em Perfil › Carteira › Depositar: escolha o valor e pague pelo Pix. O saldo entra assim que o pagamento é confirmado.', go: { tab: 'perfil', wallet: true } },
  { id: 'sem-saldo', topic: 'pagamento', q: 'E se eu não tiver saldo na hora de comprar?', ex: ['não tenho saldo suficiente', 'faltou dinheiro na carteira', 'pagar parte no pix', 'comprar sem saldo'],
    a: 'Sem problema: abre uma janela com QR Code Pix e você escolhe pagar tudo no Pix ou usar o saldo que tem e completar o resto no Pix.' },
  { id: 'sacar', topic: 'pagamento', q: 'Como saco o meu dinheiro?', ex: ['tirar meu dinheiro', 'transferir para minha conta', 'retirar o saldo', 'mandar pro meu banco', 'resgatar valor'],
    a: 'Em Perfil › Carteira › Sacar. O valor vai por Pix para uma conta no seu CPF ou CNPJ, e o saque pede a verificação do rosto. Prestadores e lojas recebem na carteira o que venderam e sacam do mesmo jeito.', go: { tab: 'perfil', wallet: true } },
  { id: 'taxas-geral', topic: 'outro', q: 'Quais são as taxas do Realyz?', ex: ['quanto o realys cobra', 'taxas do aplicativo', 'quanto fica para a plataforma', 'tem taxa escondida', 'comissão do app'],
    a: `Tudo aparece antes de você confirmar. Cliente: ${brl(T.protecao.valor)} de taxa de proteção por pedido, a qualquer hora. Lojas do Shop e do Food: ${T.shop.pct}% das vendas. Prestadores: ${T.visita.pct}% da taxa de visita. Corridas e entregas: ${T.corrida.pct}%. Presentes: ${T.presente.pct}%. Ingressos: ${T.ingresso.pct}% (mínimo ${brl(T.ingresso.minimo)}). Sempre abaixo dos concorrentes.` },
  { id: 'protecao', topic: 'pagamento', q: 'O que é a taxa de proteção?', ex: ['taxa de 99 centavos', 'por que paguei 0,99', 'taxa de serviço no pedido', 'taxa noturna'],
    a: `São ${brl(T.protecao.valor)} por pedido, com o mesmo valor a qualquer hora (sem taxa noturna). Ela paga a Garantia Realyz (seu dinheiro volta se der problema), a verificação de quem vende e entrega e o suporte.` },

  // ----- Garantia, pedidos, reembolso -----
  { id: 'garantia', topic: 'pedido', q: 'Como funciona a Garantia Realyz?', ex: ['meu dinheiro está protegido', 'e se der problema na compra', 'garantia de entrega', 'e se a loja não entregar', 'golpe na compra'],
    a: `O seu pagamento fica retido e só vai para a loja ou o prestador quando você confirma que recebeu. Depois de confirmar, ainda tem ${GUARANTEE_DAYS} dias para abrir um caso em Pedidos › "Tive um problema". O Realyz responde em até ${GUARANTEE_ANSWER_HOURS} horas e, se você tiver razão, o dinheiro volta para a sua carteira.` },
  { id: 'nao-chegou', topic: 'pedido', q: 'Meu pedido não chegou', ex: ['pedido atrasado', 'cadê minha entrega', 'o entregador não veio', 'já passou do horário', 'comprei e não recebi', 'minha comida não chegou', 'meu lanche está demorando', 'a encomenda não chegou ainda', 'demora na entrega'],
    a: (s) => {
      const open = s ? (s.orders || []).filter((o) => o.status !== 'Entregue' && o.status !== 'Reembolsado') : [];
      const lead = open.length ? `Você tem ${open.length} ${open.length === 1 ? 'pedido em andamento' : 'pedidos em andamento'}${open[0].store ? ` (o mais recente é da ${open[0].store}, "${open[0].status}")` : ''}. ` : '';
      return lead + 'Em Pedidos você acompanha a entrega ao vivo e fala com a loja. Se passou do prazo e ninguém respondeu, toque em "Tive um problema": o pagamento continua protegido até a entrega ser confirmada.';
    }, go: { tab: 'pedidos' } },
  { id: 'reembolso', topic: 'pedido', q: 'Como peço reembolso?', ex: ['quero meu dinheiro de volta', 'estorno', 'devolver produto', 'cancelar compra', 'veio errado', 'produto com defeito'],
    a: `Em Pedidos, abra a compra e toque em "Tive um problema". A loja tem prazo para responder; se não houver acordo, o Realyz analisa o chat, o GPS, o QR Code da entrega e as fotos, e devolve o valor na sua carteira quando for o caso. Você tem até ${GUARANTEE_DAYS} dias depois de receber.`, go: { tab: 'pedidos' } },
  { id: 'qr', topic: 'pedido', q: 'Para que serve o QR Code do pedido?', ex: ['qr code da entrega', 'o entregador pediu o código', 'confirmar que recebi', 'mostrar o qr'],
    a: 'Todo pedido finalizado gera um QR Code para você. O entregador ou o prestador lê o código com o app, a entrega fica confirmada para todo mundo e só então o pagamento é liberado. Não mostre o QR antes de receber.' },
  { id: 'aguardando', topic: 'pedido', q: 'Onde vejo o que está esperando resposta?', ex: ['pedido aguardando', 'o prestador ainda não respondeu', 'agendei e não confirmou', 'meus chamados enviados', 'aguardando retorno'],
    a: (s) => {
      const w = s ? (s.visits || []).filter((v) => v.status === 'aguardando').length + (s.onlineAppts || []).filter((x) => x.status === 'aguardando').length + Object.values(s.negRequests || {}).filter((x) => x === 'aguardando').length : 0;
      return (w ? `Você tem ${w} ${w === 1 ? 'pedido esperando' : 'pedidos esperando'} resposta. ` : '') + 'Tudo que espera a resposta de alguém (visitas, agendamentos online, interesse em anúncios) fica em Pedidos › Aguardando até ter retorno.';
    }, go: { tab: 'pedidos', seg: 'aguardando' } },
  { id: 'gorjeta', topic: 'pedido', q: 'Como dou gorjeta ou avalio depois?', ex: ['esqueci de avaliar', 'dar gorjeta para o motoboy', 'avaliar depois', 'gorjeta pro entregador'],
    a: 'Pedidos, serviços e corridas concluídos ficam na sua lista por 7 dias úteis. Nesse tempo dá para dar gorjeta (vai inteira para quem atendeu) e avaliar, se ainda não avaliou.', go: { tab: 'pedidos' } },
  { id: 'carrinho', topic: 'pedido', q: 'Onde fica o carrinho?', ex: ['meu carrinho', 'cesta de compras', 'itens que separei', 'finalizar compra'],
    a: (s) => {
      const n = s ? (s.cart || []).reduce((x, c) => x + c.qty, 0) : 0;
      return `O carrinho fica em Pedidos, e também abre pelo ícone de sacola no topo quando tem itens${n ? `: agora você tem ${n} ${n === 1 ? 'item' : 'itens'} nele` : ''}. Dá para misturar produto e serviço no mesmo carrinho.`;
    }, go: { tab: 'home', cart: true } },

  // ----- Serviços e corridas -----
  { id: 'contratar', topic: 'servico', q: 'Como contrato um prestador?', ex: ['chamar um eletricista', 'contratar encanador', 'pedir um serviço', 'achar um profissional perto', 'como funciona a visita'],
    a: `Em Serviços, escolha a profissão e veja os prestadores mais perto, com nota e preço. Você paga só a taxa de visita, que fica reservada até a visita acontecer. O valor do serviço é combinado direto com o prestador, e ele pode abater a visita no fechamento.`, go: { tab: 'servicos' } },
  { id: 'nao-veio', topic: 'servico', q: 'O prestador não apareceu', ex: ['o profissional faltou', 'marquei e não veio', 'o eletricista não apareceu', 'prestador sumiu'],
    a: 'A taxa de visita fica reservada e só é liberada quando a visita acontece. Se o prestador não veio, abra o caso em Pedidos (Aguardando ou Serviços) e o valor volta para a sua carteira.' },
  { id: 'online', topic: 'servico', q: 'Como agendo um atendimento online?', ex: ['consulta com psicólogo', 'atendimento por vídeo', 'advogado online', 'agendar chamada de vídeo', 'aula online com professor'],
    a: 'Em Serviços › Online, escolha o profissional e o horário e toque em Agendar. O pedido fica em Pedidos › Aguardando até ele confirmar; no horário, a chamada de vídeo abre aqui mesmo no Realyz.', go: { tab: 'servicos', seg: 'online' } },
  { id: 'corrida', topic: 'servico', q: 'Como funciona a corrida?', ex: ['chamar um motorista', 'preço da corrida', 'pedir um carro', 'motoboy para entrega', 'pedir carro para outra pessoa'],
    a: `O preço aparece antes de você pedir, pela distância e pelo tempo. Dá para pedir para outra pessoa em outro endereço, e ver dados do carro como cadeirinha para criança. Quando o motorista chega, ele espera até 10 minutos; depois disso a corrida é encerrada e cobrada. O motorista fica com ${100 - T.corrida.pct}% da corrida.` },
  { id: 'espera', topic: 'servico', q: 'Quanto tempo o motorista espera?', ex: ['o motorista foi embora', 'atrasei para embarcar', 'cobrou sem eu entrar no carro', 'não embarquei a tempo'],
    a: 'Quando o motorista avisa que chegou, ele espera até 10 minutos. Se você não embarcar nesse tempo, a corrida é encerrada, o motorista recebe pela espera e o valor não é devolvido.' },
  { id: 'ser-prestador', topic: 'servico', q: 'Como viro prestador de serviço?', ex: ['quero trabalhar no realys', 'cadastrar meus serviços', 'ser motorista do app', 'ser motoboy', 'oferecer meu trabalho', 'sou mei'],
    a: `No cadastro você informa as suas funções e os seus valores (por exemplo, por hora ou pela visita). Você define a taxa de visita e o Realyz fica com ${T.visita.pct}% dela; o valor do serviço é todo seu. Quanto mais serviços aceitar e terminar, mais no topo das indicações você aparece.` },

  // ----- Lojas, anúncios, negócios -----
  { id: 'vender', topic: 'loja', q: 'Quanto a loja paga para vender?', ex: ['abrir minha loja', 'vender no realys', 'taxa da loja', 'mensalidade da loja', 'plano da empresa', 'quanto custa ter uma loja'],
    a: `A loja paga ${T.shop.pct}% de cada venda, já com o pagamento online incluído, e sem taxa fixa por item. O plano é ${brl(T.planoEmpresa.valor)} por mês (ou anual por ${T.planoEmpresa.anualPct}% do valor) e só começa quando a loja aceita o primeiro pedido, com o primeiro mês grátis. No Shop só se vendem itens novos.` },
  { id: 'cadastrar-produto', topic: 'loja', q: 'Como cadastro os meus produtos?', ex: ['colocar produto à venda', 'subir produto no shop', 'adicionar item na loja', 'publicar produto'],
    a: 'No perfil da loja, o administrador adiciona o item com foto, descrição e preço. O Realyz classifica o produto pelo nome e já o coloca na categoria certa do Shop (ou do Food, se for comida).' },
  { id: 'anunciar', topic: 'loja', q: 'Como anuncio no Realyz?', ex: ['fazer propaganda', 'impulsionar minha loja', 'aparecer primeiro na busca', 'banner patrocinado', 'quanto custa anunciar', 'divulgar meu negócio'],
    a: `Você contrata direto no app, com preço fechado: primeiro lugar nas buscas por ${brl(T.publicidade.valor)} por dia, story patrocinado ${brl(9.9)} e banner da vitrine ${brl(39.9)} por dia. Empresa contrata no Painel › Divulgação; usuário, em Negócios › Anunciar. Também dá para pagar com pontos.` },
  { id: 'boost', topic: 'loja', q: 'O que é o boost?', ex: ['dar um boost', 'aparecer no topo', 'impulsionar meu perfil', 'boost de prestador', 'boost no date', 'boost de produto'],
    a: 'O boost coloca você em destaque por um tempo: prestador no topo das indicações da região (bom para pegar trabalho rápido), produto em destaque no Shop, publicação para mais gente, live no "Em destaque" ou perfil primeiro no Date. Dá para pagar com dinheiro ou com pontos.' },
  { id: 'imovel', topic: 'loja', q: 'Como anuncio um imóvel ou veículo?', ex: ['vender minha casa', 'alugar meu apartamento', 'anunciar carro', 'imobiliária no realys', 'vender máquina', 'quanto custa anunciar imóvel'],
    a: `Em Negócios. Quem procura nunca paga. Proprietário e particular anunciam grátis e só pagam quando liberam a conversa com um interessado (${brl(T.contatoImovel.valor)} por imóvel, ${brl(T.contatoVeiculo.valor)} por veículo ou máquina). Imobiliária tem plano de ${brl(T.anuncioImobiliaria.valor)} por mês e revenda, ${brl(T.anuncioRevenda.valor)}, com as conversas liberadas.`, go: { tab: 'negocios' } },
  { id: 'ingresso', topic: 'loja', q: 'Como vendo ingressos do meu evento?', ex: ['vender ingresso', 'criar evento', 'taxa do ingresso', 'produtor de festa'],
    a: `O produtor publica o evento e vende pelo app. O Realyz fica com ${T.ingresso.pct}% de cada ingresso (mínimo de ${brl(T.ingresso.minimo)}), e o produtor pode repassar isso ao comprador. No dia, quem comprou pode pedir bebida e comida pelo app, até na mesa reservada.` },

  // ----- Pontos, presentes, lives -----
  { id: 'pontos', topic: 'pagamento', q: 'Como funcionam os pontos?', ex: ['quantos pontos eu tenho', 'para que servem os pontos', 'trocar meus pontos', 'ganhar pontos', 'pontos viram dinheiro'],
    a: (s) => `${s && s.points ? `Você tem ${n0(s.points)} pontos (vale ${brl(s.points * POINT_VALUE)} aqui dentro). ` : ''}Você ganha pontos avaliando (${POINTS_PER_RATING} por avaliação), comprando, assistindo lives e enviando presentes (${EARN_PCT}% de volta). Cada ponto vale ${brl(POINT_VALUE)} em boosts, anúncios e serviços do Realyz, mas não vira dinheiro nem saque, e vence em ${POINT_RULES.validityMonths} meses.` },
  { id: 'presente', topic: 'pagamento', q: 'Como funciona o presente?', ex: ['mandar presente para alguém', 'dar uma gorjeta de presente', 'presentear um amigo', 'taxa do presente', 'recebi um presente'],
    a: `Você manda de ${brl(GIFT_MIN)} a ${brl(GIFT_MAX)} da sua carteira para um amigo, um prestador ou um criador, e a pessoa recebe direto, sem precisar aceitar. O Realyz fica com ${GIFT_FEE_PCT}% de dentro do valor (você não paga a mais) e você ganha pontos de volta. O presente vira crédito para usar dentro do app.` },
  { id: 'saque-live', topic: 'pagamento', q: 'Como o criador saca os presentes das lives?', ex: ['sacar presentes da live', 'quanto o streamer recebe', 'ganhar dinheiro com live', 'saque antecipado', 'pontos de saque'],
    a: (s) => {
      const pts = s ? Math.floor(((s.giftCredits || 0) + (s.liveCredits || 0)) * CASHOUT_POINTS_PER_REAL) : 0;
      return `O que você recebe em presentes vira pontos de saque (R$ 1 = ${CASHOUT_POINTS_PER_REAL} pontos). Com ${n0(CASHOUT_MIN_POINTS)} pontos você saca e fica com ${CASHOUT_KEEP_PCT}% do que os fãs pagaram; o saque antecipado sai a partir de ${n0(CASHOUT_EARLY_MIN_POINTS)} pontos, com ${CASHOUT_EARLY_KEEP_PCT}%. Pede verificação do rosto e Pix no seu nome.` + (pts ? ` Hoje você tem ${n0(pts)} pontos de saque.` : '');
    } },
  { id: 'live', topic: 'outro', q: 'Como faço uma live?', ex: ['abrir uma live', 'transmitir ao vivo', 'transmitir jogo do celular', 'live de gamer', 'quem pode assistir live'],
    a: 'Em Lives, toque para abrir a sua. Dá para transmitir como gamer (a tela do celular), jogar com o time pela própria plataforma e receber presentes. Para assistir é preciso ter conta Realyz.' },

  // ----- Social, perfil, Date -----
  { id: 'depoimento', topic: 'outro', q: 'Como funcionam os depoimentos?', ex: ['deixar depoimento para alguém', 'aceitar depoimento', 'esconder depoimento do meu perfil', 'depoimento estilo orkut'],
    a: 'Você deixa um depoimento no perfil de alguém e ele só aparece depois que a pessoa aceita. No seu perfil, você escolhe quais mostrar. Os depoimentos aceitos também aparecem no feed dos Stories para curtir e comentar.' },
  { id: 'paginas', topic: 'outro', q: 'Quanto custa ter uma página?', ex: ['criar minha página', 'página tipo blog', 'segunda página', 'portfólio na página', 'mensalidade da página'],
    a: `A primeira página é grátis. Da segunda em diante custa ${brl(T.paginaUsuario.valor)} por mês cada. Prestadores com o plano de ${brl(T.destaquePrestador.valor)} já têm a página incluída para mostrar os trabalhos.` },
  { id: 'privacidade', topic: 'conta', q: 'Quem vê o meu perfil?', ex: ['deixar meu perfil privado', 'esconder meu perfil', 'só amigos veem', 'privacidade do perfil', 'ver como os outros veem meu perfil'],
    a: 'Você escolhe: mostrar para todos, só para amigos ou não mostrar, separando a vida social do seu portfólio. Em Perfil tem a "Prévia", para ver exatamente como os outros enxergam o seu perfil.', go: { tab: 'perfil' } },
  { id: 'date', topic: 'outro', q: 'Como funciona o Date?', ex: ['encontros', 'namoro no app', 'dar match', 'conhecer alguém perto', 'date plus', 'assinatura do date'],
    a: 'O Date fica no seu Perfil e é opcional: só entra quem aceita os termos, tem mais de 18 anos, biometria e está disponível (solteiro, divorciado ou viúvo). Lá aparece só o seu primeiro nome e um álbum que você escolhe, sem expor seu perfil social. O Date+ libera mais recursos, como a chamada de vídeo depois do match.' },
  { id: 'denuncia', topic: 'outro', q: 'Sofri um golpe ou fui ofendido', ex: ['denunciar alguém', 'fui enganado', 'alguém está me ameaçando', 'assédio', 'perfil me ofendendo', 'fake news'],
    a: 'Toque em Denunciar no perfil, no post ou na mensagem da pessoa. Em perigo, use o SOS no Perfil. Abra também um chamado contando o que houve: como toda conta tem dono identificado, a equipe consegue agir de verdade.' },
  { id: 'sos', topic: 'outro', q: 'Onde fica o SOS?', ex: ['emergência', 'chamar socorro', 'samu', 'hospital mais perto', 'botão de pânico'],
    a: 'O SOS é o botãozinho vermelho no Perfil. Ele mostra os hospitais mais próximos, o SAMU e os números de emergência, e liga direto do seu celular. Em perigo imediato, ligue 190 ou 192.', go: { tab: 'perfil' } },

  // ----- Lotus -----
  { id: 'desapego', topic: 'loja', q: 'Posso vender coisas usadas?', ex: ['vender roupa usada', 'vender meu celular usado', 'desapego', 'vender o que não uso mais', 'item de segunda mão', 'brechó'],
    a: `Pode, no Desapego (menu ⋮ › Desapego): é para pessoas venderem entre si o que não usam mais. O comprador paga pelo Realyz, o dinheiro fica retido e só vai para você quando ele confirma que recebeu. O Realyz fica com ${Math.round(desapegoFee(100))}% da venda. O Shop é só para produtos novos, das lojas.`, go: { tab: 'desapego' } },
  { id: 'musica', topic: 'outro', q: 'Como funcionam as músicas?', ex: ['ouvir música no app', 'plano premium de música', 'tirar as propagandas da música', 'vender minhas músicas', 'baixar música', 'sou artista'],
    a: `Ouvir é grátis, com propaganda entre as músicas. O plano sem propaganda custa ${brl(T.musicaPremium.valor)} por mês, com os ${T.musicaPremium.gratisMeses} primeiros meses grátis. Para baixar, você compra a música do artista. Artistas vendem as faixas aqui e recebem 100% do valor deles; o Realyz soma só ${brl(T.musicaVenda.valor)} por download.` },
  { id: 'emprego', topic: 'outro', q: 'Como procuro emprego no Realyz?', ex: ['vaga de emprego', 'mandar currículo', 'estou desempregado', 'me candidatar a uma vaga', 'empresa contratando'],
    a: 'Em Empregos (menu ⋮) estão as vagas de empresas com CNPJ conferido, perto de você. O seu currículo é montado a partir do perfil verificado, a candidatura é com um toque e você acompanha cada etapa: enviada, vista, entrevista e resultado.', go: { tab: 'empregos' } },
  { id: 'funcionarios', topic: 'loja', q: 'Como coloco meus funcionários no app?', ex: ['cadastrar funcionário', 'perfil de atendente', 'equipe da empresa', 'colaborador atender cliente', 'vários funcionários na mesma conta'],
    a: 'No Painel da empresa você cria os perfis dos funcionários e as funções deles (dá para criar, renomear e mudar). O cliente chama a empresa, a empresa direciona e o funcionário atende. Todo funcionário precisa de biometria, e a empresa responde pelo atendimento deles.' },
  { id: 'crm', topic: 'loja', q: 'O que é o CRM?', ex: ['organizar meus clientes', 'funil de vendas', 'leads', 'acompanhar negociação', 'etapas da venda'],
    a: 'O CRM organiza as conversas com os clientes em etapas, do primeiro contato ao fechamento da venda. Serve para lojas, prestadores, imobiliárias, revendas, aulas e atendimento online, e fica no Painel.' },
  { id: 'lotus', topic: 'app', q: 'O que a Lotus faz?', ex: ['quem é a lotus', 'como falo com a lotus', 'comando de voz', 'assistente do app', 'a lotus compra sozinha'],
    a: 'A Lotus é a assistente do Realyz. Diga "Lotus" ou toque na flor e peça o que quiser: achar um produto, um prestador, uma festa, abrir uma tela ou tirar dúvidas como esta. Ela mostra as opções e pergunta antes, mas nunca compra, contrata ou paga sem você confirmar.' },
  { id: 'lotus-voz', topic: 'app', q: 'A Lotus fica me ouvindo o tempo todo?', ex: ['microfone ligado', 'a lotus escuta com o app fechado', 'gasta bateria', 'reconhecer minha voz', 'voz do dono'],
    a: 'Não. A Lotus só ouve com o app aberto; minimizou, ela desliga para não gastar bateria. Ela não pausa a sua música. Se você cadastrar a voz do dono no Perfil, chamada por voz ela atende só você.' },
  { id: 'contrato', topic: 'outro', q: 'Como assino um contrato pelo app?', ex: ['assinar contrato', 'contrato de aluguel', 'assinatura eletrônica', 'gov.br', 'pdf do contrato'],
    a: 'Os contratos de compra, locação e serviço são assinados aqui dentro, com a sua biometria ou pelo gov.br, e as duas partes recebem o PDF.' },
  { id: 'suporte', topic: 'outro', q: 'Como falo com uma pessoa da equipe?', ex: ['falar com atendente', 'quero falar com humano', 'suporte do realys', 'abrir chamado', 'contato do realys'],
    a: 'Aqui mesmo em Ajuda e suporte: escreva o que aconteceu e toque em "Falar com a equipe". A resposta chega nas suas mensagens do suporte, e assuntos de dinheiro, conta e biometria entram na frente da fila.' },
];

// ---------------------------------------------------------------------------------------------
// Índice: respostas prontas + perguntas frequentes do Suporte + itens dos termos.
// Montado uma vez, na primeira pergunta (leva uma fração de segundo).
// ---------------------------------------------------------------------------------------------
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function stem(w) {
  if (w.length <= 3) return w;
  if (w.endsWith('oes') || w.endsWith('aes')) return w.slice(0, -3) + 'ao';
  if (w.endsWith('eis')) return w.slice(0, -3) + 'el';
  if (w.endsWith('ais')) return w.slice(0, -3) + 'al';
  if (w.endsWith('ns')) return w.slice(0, -2) + 'm';
  if (w.endsWith('res') || w.endsWith('zes') || w.endsWith('ses')) return w.slice(0, -2);
  if (w.endsWith('s')) return w.slice(0, -1);
  return w;
}
const STOP = new Set(('a o e as os um uma de do da dos das no na nos nas em pra pro para por com sem que se me eu meu minha meus minhas ' +
  'seu sua voce vc ele ela isso esse essa este esta ai la aqui ja ta to tou estou esta ser sou foi vai vou ir ter tem tenho ha mais muito bem ' +
  'so tambem ou mas como quando onde qual quais quem algum alguma algo coisa tipo ne lotus realys oi ola entao agora hoje quero queria ' +
  'gostaria preciso pode posso poderia favor obrigado fazer faco dar da sim nao ok ao aos pelo pela pelos pelas sobre funciona').split(' '));
const terms = (s) => norm(s).split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !STOP.has(w)).map(stem);

// Perguntas frequentes do Suporte que já têm resposta pronta (mais completa) acima.
const COVERED = new Set(['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12']);
let IDX = null;
function index() {
  const extra = FAQ;
  if (IDX) return IDX;
  const docs = [];
  for (const e of ENTRIES()) docs.push({ kind: 'kb', id: e.id, topic: e.topic, q: e.q, a: e.a, go: e.go, texts: [e.q, ...e.ex] });
  // Perguntas frequentes do Suporte (src/supportFaq.js): entram só as que ainda não têm resposta pronta
  // aqui (COVERED), para não aparecer a mesma pergunta duas vezes nas sugestões.
  for (const f of extra) if (!COVERED.has(f.id)) docs.push({ kind: 'faq', id: f.id, topic: f.topic, q: f.q, a: f.a, texts: [f.q, ...(f.keys || [])] });
  // Termos: cada item vira um documento; as frases do item são guardadas para escolher as que respondem.
  for (const [termo, nome] of [[TERMO_ADESAO, 'Termo de Adesão'], [TERMO_EMPRESA, 'Termo da Empresa']]) {
    for (const it of termo.itens || []) {
      if (!it.texto) continue;
      const sents = it.texto.match(/[^.!?]+[.!?]+/g) || [it.texto];
      const title = it.titulo.replace(/^[\d-A-Z]+\.\s*/, '');
      docs.push({ kind: 'termo', id: `${nome}:${it.titulo}`, topic: 'outro', q: title, src: `${nome}, item ${it.titulo.split('.')[0]}`, sents: sents.map((x) => x.trim()), texts: [title] });
    }
  }
  // Peso das palavras: as raras valem mais ("estorno" decide mais que "pedido").
  const df = new Map();
  for (const d of docs) {
    d.bag = new Set([...d.texts.flatMap(terms), ...(d.sents ? d.sents.flatMap(terms) : [])]);
    for (const w of d.bag) df.set(w, (df.get(w) || 0) + 1);
  }
  const N = docs.length;
  const idf = (w) => Math.log(1 + N / (df.get(w) || 0.5));
  // Sentido: cada jeito de perguntar (e, nos termos, o título e cada frase) vira vetor uma vez só.
  for (const d of docs) {
    d.enc = d.texts.map(encode).filter(Boolean);
    if (d.sents) d.sentEnc = d.sents.map((x) => ({ x, e: encode(x), t: new Set(terms(x)) }));
  }
  IDX = { docs, idf };
  return IDX;
}

// Nota de uma pergunta para um documento: sentido (0..1) + palavras em comum pesadas pela raridade.
function scoreDoc(d, q, qt, idf) {
  let sem = 0;
  for (const e of d.enc) sem = Math.max(sem, likeness(q, e));
  if (d.sentEnc) for (const s of d.sentEnc) sem = Math.max(sem, 0.92 * likeness(q, s.e));
  let tot = 0;
  let hit = 0;
  for (const w of qt) {
    const p = idf(w);
    tot += p;
    if (d.bag.has(w)) hit += p;
  }
  const kw = tot ? hit / tot : 0;
  // Termos são longos e "parecem" com tudo: as respostas prontas levam uma vantagem pequena.
  const bias = d.kind === 'kb' ? 0.04 : d.kind === 'faq' ? 0.02 : 0;
  return { sem, kw, score: 0.6 * sem + 0.4 * kw + bias };
}

// Nos termos: escolhe as 1 ou 2 frases do item que mais respondem a pergunta, na ordem do texto.
function bestSentences(d, q, qt, idf) {
  const ranked = d.sentEnc
    .map((s, i) => {
      let hit = 0;
      for (const w of qt) if (s.t.has(w)) hit += idf(w);
      return { i, x: s.x, sc: 0.6 * likeness(q, s.e) + 0.4 * Math.min(1, hit / 6) };
    })
    .sort((a, b) => b.sc - a.sc);
  const pick = ranked.slice(0, ranked[1] && ranked[1].sc > ranked[0].sc - 0.08 ? 2 : 1).sort((a, b) => a.i - b.i);
  return pick.map((p) => p.x).join(' ');
}

const answerOf = (d, state, q, qt, idf) => {
  if (d.kind === 'termo') return `${bestSentences(d, q, qt, idf)} (${d.src}.)`;
  return typeof d.a === 'function' ? d.a(state) : d.a;
};

// Divide "como saco e quanto é a taxa?" em duas perguntas, quando faz sentido.
const splitAsk = (t) => String(t).split(/\?\s+|\s+e (?=(?:como|quanto|qual|quais|onde|quando|por ?que|o que|posso|da pra|dá pra)\b)/i).map((x) => x.trim()).filter((x) => x.length > 3);

// Pergunta → resposta.
// Devolve { reply, voice, topic, go, confident, suggestions: [pergunta...] } ou null se não tiver nada parecido.
export function askRealys(text, state, { min = 0.5 } = {}) {
  try {
    const { docs, idf } = index();
    const parts = splitAsk(text);
    const asks = parts.length > 1 && parts.length <= 3 ? parts : [text];
    const answers = [];
    let sugg = [];
    for (const a of asks) {
      const q = encode(a);
      const qt = terms(a);
      if (!q && !qt.length) continue;
      const ranked = docs.map((d) => ({ d, ...scoreDoc(d, q, qt, idf) })).sort((x, y) => y.score - x.score);
      const top = ranked[0];
      if (!top || top.score < min) {
        sugg = sugg.concat(ranked.filter((r) => r.d.kind !== 'termo').slice(0, 3).map((r) => r.d.q));
        continue;
      }
      if (answers.some((x) => x.d === top.d)) continue;
      answers.push({ d: top.d, score: top.score, text: answerOf(top.d, state, q, qt, idf) });
      sugg = sugg.concat(ranked.slice(1, 6).filter((r) => r.d.kind !== 'termo' && r.score > min - 0.08 && r.d !== top.d).map((r) => r.d.q));
    }
    const suggestions = [...new Set(sugg)].filter((s) => !answers.some((a) => a.d.q === s)).slice(0, 3);
    if (!answers.length) return suggestions.length ? { reply: null, confident: false, suggestions } : null;
    const confident = answers.every((a) => a.score >= 0.62);
    const body = answers.map((a) => a.text).join('\n\n');
    const reply = confident ? body : `Acho que você quer saber sobre "${answers[0].d.q.replace(/\?$/, '')}": ${body}`;
    // Para falar: só as 2 primeiras frases de cada resposta, sem símbolos (a voz da Lotus é curta).
    const voice = answers
      .map((a) => (a.text.match(/[^.!?]+[.!?]+/g) || [a.text]).slice(0, 2).join(' '))
      .join(' ')
      .replace(/\s*\((?:Termo|item)[^)]*\)\.?/g, '')
      .replace(/›/g, ', ')
      .replace(/R\$\s?/g, '')
      .replace(/%/g, ' por cento');
    return { reply, voice, score: Math.min(...answers.map((a) => a.score)), topic: answers[0].d.topic, go: answers[0].d.go || null, confident, suggestions, ids: answers.map((a) => a.d.id) };
  } catch (e) {
    return null;
  }
}

// É uma dúvida sobre o Realyz (e não um pedido de ação)? A voz da Lotus usa isso para decidir
// entre responder a dúvida ou procurar produto, prestador, festa...
const QUESTION = /\b(como|quanto|quantos|quantas|qual|quais|por ?que|pra que|para que|o que (e|é|significa|acontece|diz|fala)|posso|da pra|dá pra|tem como|e se|onde (fica|vejo|acho)|preciso|funciona|cobra|pode|(quero|queria|vou|posso) (ser|virar|trabalhar))\b/;
// Pedido de serviço ("preciso de um motorista", "quero uma diarista") não é dúvida sobre o app:
// vai para a busca de prestadores. Só continua dúvida se a pessoa fala de SER prestador
// ("quero ser motorista", "preciso me cadastrar").
const SERVICE_REQUEST = /^\s*(eu\s+)?(preciso|precisava|quero|queria|procuro|to precisando|estou precisando|me arruma|arruma|me manda|manda|me chama)\s+(de\s+)?(um|uma|uns|umas)\b/;
const BE_PROVIDER = /\b(ser|virar|trabalhar|cadastr|me cadastrar|oferecer)\b/;
export const isServiceRequest = (t) => SERVICE_REQUEST.test(norm(t)) && !BE_PROVIDER.test(norm(t));
export const looksLikeRealysQuestion = (t) => QUESTION.test(norm(t)) && !isServiceRequest(t) && !/^\s*(abr[ea]|abrir|me leva|vai pra|mostra|chama|pede|compra|liga)\b/.test(norm(t));

// Para os testes e para o administrador: quantas respostas a Lotus tem na cabeça.
export const knowledgeSize = () => {
  const { docs } = index();
  return { respostas: docs.filter((d) => d.kind === 'kb').length, perguntasFrequentes: docs.filter((d) => d.kind === 'faq').length, itensDosTermos: docs.filter((d) => d.kind === 'termo').length };
};
