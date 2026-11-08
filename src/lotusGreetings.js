import { addressOf, applyTrato } from './lotusTrato';
// Saudações da Lotus: "bom dia", "boa tarde", "boa noite", "oi", "tudo bem?", "obrigado", "tchau".
// Responde com carinho, de acordo com a hora do celular, e pelo primeiro nome de quem fala.
// Se vier um pedido junto ("bom dia, Lotus, preciso de um eletricista"), devolve o resto
// para a Lotus atender logo depois da saudação.

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

const pick = (list) => list[Math.floor(Math.random() * list.length)];

// Período do dia pela hora do celular.
export function periodOf(date = new Date()) {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'dia';
  if (h >= 12 && h < 18) return 'tarde';
  return 'noite';
}

const HELLO = { dia: 'Bom dia', tarde: 'Boa tarde', noite: 'Boa noite' };

const REPLIES = {
  dia: [
    '{Hello}{nome}! Que o seu dia seja abençoado e cheio de coisas boas. Em que posso ajudar?',
    '{Hello}{nome}! Um ótimo começo de dia para você. O que vamos fazer hoje?',
    '{Hello}{nome}! Que alegria ouvir você logo cedo. Como posso ajudar?',
  ],
  tarde: [
    '{Hello}{nome}! Espero que o seu dia esteja sendo ótimo. Em que posso ajudar?',
    '{Hello}{nome}! Que a sua tarde seja leve e produtiva. O que você precisa?',
    '{Hello}{nome}! Tô aqui com você. Como posso ajudar nesta tarde?',
  ],
  noite: [
    '{Hello}{nome}! Que a sua noite seja tranquila e abençoada. Em que posso ajudar?',
    '{Hello}{nome}! Hora de descansar, mas se precisar de algo, tô aqui.',
    '{Hello}{nome}! Espero que o seu dia tenha sido bom. O que você precisa?',
  ],
};

// Pessoa deu "bom dia" fora de hora: responde com bom humor e com a saudação certa.
const OFF_HOUR = {
  dia: 'Bom dia{nome}! Por aqui o dia está só começando, aproveite.',
  tarde: 'Já é de tarde{nome}, então boa tarde!',
  noite: 'Já é de noite{nome}, então boa noite!',
};

const HOWAREYOU = [
  'Tô ótima, obrigada por perguntar{nome}! E você, como está? Em que posso ajudar?',
  'Tudo bem por aqui, graças a Deus! E com você{nome}? O que vamos fazer?',
];
const THANKS = ['Por nada{nome}! Sempre que precisar, é só chamar.', 'Imagina{nome}, foi um prazer ajudar!', 'De nada{nome}! Tô sempre por aqui.'];
const BYE = ['Até logo{nome}! Fique com Deus.', 'Tchau{nome}! Quando precisar, é só chamar a Lotus.', 'Até mais{nome}! Foi bom falar com você.'];
const HI = ['Oi{nome}! Que bom te ouvir. Em que posso ajudar?', 'Olá{nome}! Tô aqui. O que você precisa?', 'Oi{nome}! Como posso ajudar hoje?'];

// Ordem importa: as frases mais longas primeiro.
const PATTERNS = [
  ['dia', /^(muito )?(bom dia|bon dia|bomdia)\b/],
  ['tarde', /^(muito )?(boa tarde|boatarde)\b/],
  ['noite', /^(muito )?(boa noite|boanoite|boa madrugada)\b/],
  ['how', /^(tudo bem|tudo bom|tudo certo|tudo joia|tudo tranquilo|como (voce )?(vai|esta|ta)|como vai voce)\b/],
  ['thanks', /^(muito )?(obrigad[oa]|obg|valeu|vlw|agradeco|brigad[oa])\b/],
  ['bye', /^(tchau|ate logo|ate mais|ate amanha|ate depois)\b/],
  ['hi', /^(oi+|ola|ei|e ai|eai|opa|salve|alo|hey)\b/],
];

const FILLER = /^[\s,.!?;:-]*(lotus|lotos|lotis|lottus|lote|loti|realys|minha (querida|amiga)|querida|amiga)?[\s,.!?;:-]*/;

// Devolve { reply, rest } se a fala começa com uma saudação; senão null.
export function greetingReply(text, userName, date = new Date(), trato = null) {
  const r = greetingCore(text, userName, date, trato);
  return r ? { ...r, reply: applyTrato(r.reply, trato) } : r;
}
function greetingCore(text, userName, date, trato) {
  let t = norm(text).replace(/[!?.,]+/g, (m) => m[0]).trim();
  t = t.replace(FILLER, '').trim();
  const hit = PATTERNS.find(([, re]) => re.test(t));
  if (!hit) return null;
  const [kind, re] = hit;
  const m = t.match(re);
  // O que vem depois da saudação (tira "Lotus", vírgulas, "tudo bem?"). Ex.: "bom dia lotus tudo bem" → "".
  let rest = t.slice(m[0].length).replace(FILLER, '').trim();
  let asked = kind === 'how';
  const how = rest.match(/^(tudo bem|tudo bom|tudo certo|tudo joia|como (voce )?(vai|esta|ta))\b[\s,.!?]*/);
  if (how) {
    asked = true;
    rest = rest.slice(how[0].length).replace(FILLER, '').trim();
  }
  rest = rest.replace(/^[\s,.!?;:-]+/, '').trim();
  // "oi" dentro de pedido ("oi, preciso de um eletricista") só cumprimenta se vier sozinho.
  if (kind === 'hi' && rest) {
    const n = rest.split(/\s+/).length;
    const orig = String(text || '').trim().split(/\s+/);
    return { reply: pick(['Oi{nome}!', 'Olá{nome}!']).replace('{nome}', nameBit(userName, trato)), rest: orig.slice(orig.length - n).join(' '), kind };
  }

  const nome = nameBit(userName, trato);
  const now = periodOf(date);
  let reply;
  if (kind === 'dia' || kind === 'tarde' || kind === 'noite') {
    if (kind !== now && !(kind === 'noite' && /tchau|ate amanha|vou dormir|dormir/.test(rest))) {
      reply = OFF_HOUR[now].replace('{nome}', nome);
      if (!rest) reply += ' Em que posso ajudar?';
    } else {
      reply = rest ? `${HELLO[kind]}${nome}!` : pick(REPLIES[kind]).replace('{Hello}', HELLO[kind]).replace('{nome}', nome);
    }
    // Boa noite de despedida: "boa noite, vou dormir".
    if (kind === 'noite' && /(vou dormir|dormir|ate amanha|tchau)/.test(rest)) return { reply: `Boa noite${nome}! Durma bem e fique com Deus. Até amanhã!`, rest: '' };
    if (asked && !rest) reply = `${HELLO[kind === now ? kind : now]}${nome}! Tô ótima, obrigada por perguntar. E você, como está? Em que posso ajudar?`;
  } else if (kind === 'how') reply = pick(HOWAREYOU).replace('{nome}', nome);
  else if (kind === 'thanks') reply = pick(THANKS).replace('{nome}', nome);
  else if (kind === 'bye') reply = pick(BYE).replace('{nome}', nome);
  else reply = pick(HI).replace('{nome}', nome);

  // Sexta, sábado e domingo: além da saudação, ela já puxa ideias do que fazer.
  const wk = weekendLine(date);
  if (wk && !rest && kind !== 'thanks' && kind !== 'bye') {
    const hello = kind === 'how' ? `Tô ótima, obrigada por perguntar${nome}!` : `${HELLO[now]}${nome}!`;
    reply = `${hello} ${wk}`;
  }

  // O resto volta com a escrita original (acentos e maiúsculas), para nomes e endereços.
  if (rest) {
    const n = rest.split(/\s+/).length;
    const orig = String(text || '').trim().split(/\s+/);
    rest = orig.slice(Math.max(0, orig.length - n)).join(' ').replace(/^[\s,.!?;:-]+/, '').trim();
  }
  // Depois de "obrigado"/"tchau" não puxa assunto; o resto (se tiver) é atendido normalmente.
  return { reply, rest, kind };
}

// Fim de semana (sexta, sábado e domingo): ideias de programa e de busca.
const WEEKEND = {
  5: [
    'Sextou! O que vamos fazer hoje? Que tal um restaurante, um barzinho ou uma festa? Está procurando alguma pessoa ou algum segmento? É só me dizer.',
    'Hoje é sexta-feira! Bora curtir? Posso achar uma festa perto, um restaurante ou um happy hour. Ou está procurando alguém ou algum serviço?',
  ],
  6: [
    'Sábado chegou! O que vamos fazer hoje? Que tal um restaurante, uma festa ou um passeio? Está procurando alguma pessoa ou algum segmento?',
    'Hoje é sábado! Posso te mostrar festas, restaurantes, lives e promoções. Está procurando alguém ou algum segmento?',
  ],
  0: [
    'Domingão! O que vamos fazer hoje? Um almoço num restaurante, um passeio ou uma festa? Está procurando alguma pessoa ou algum segmento?',
    'Hoje é domingo, dia de descansar e curtir a família! Quer ideias de restaurante, passeio ou evento? Ou está procurando alguém ou algum segmento?',
  ],
};
export function weekendLine(date = new Date()) {
  const list = WEEKEND[date.getDay()];
  return list ? pick(list) : null;
}

function nameBit(userName, trato) {
  if (trato) {
    const a = addressOf(trato, userName);
    return a ? `, ${a}` : '';
  }
  const first = String(userName || '').trim().split(/\s+/)[0];
  if (!first || /^(cliente|voce|usuario|prestador)$/i.test(norm(first))) return '';
  return `, ${first[0].toUpperCase()}${first.slice(1)}`;
}
