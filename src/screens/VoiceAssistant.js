import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, Platform, KeyboardAvoidingView,
  Animated, Easing, TextInput, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as IntentLauncher from 'expo-intent-launcher';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useStore, buildServiceCall, callReply, searchReply, detectService, serviceType, priceText, myProducts, cartTotal } from '../store';
import { colors, brl, soft } from '../theme';
import { ServiceCallCard } from './cliente/ServicesScreen';
import { Photo } from '../components/ui';
import { searchAll, contentReply, CONTENT_WORDS } from '../search';
import { stripWake, findCall, hearCall } from '../wakeMatch';
import { speakSoft, stopSpeaking, prepareVoice, speakParts, splitSentences } from '../voice';
import { emergencyNumbers } from '../extraData';
import { confirmCall } from '../phone';
import { findNavigation, navReply } from '../voiceNav';
import { understand } from '../lm/lotusLM';
import { knowledgeAnswer } from '../lm/knowledge';
import { isPartyQuery, hasPartyCue, partyReply, findProfile, pickOption, openReply, askReply, toResult } from '../voiceIntents';

// Sugestões que aparecem antes da primeira fala.
const EXAMPLES = [
  'Me leva pro Agro',
  'Abre o Food',
  'Abre o Community',
  'Festa mais próxima',
  'Abre o perfil da Ana',
  'Tem eletricista perto de mim?',
  'Preciso de um carro na Rua Augusta, 1200',
  'Preciso de um hotel barato',
  'Tem hotel em Campos do Jordão?',
  'Abre minha carteira',
  'Abre meu carrinho',
  'Quanto eu vendi hoje?',
];

// Palavras que ajudam o reconhecimento de voz a acertar os nomes do app.
const HINTS = ['Lotus', 'Realys', 'Community', 'Stories', 'Food', 'Date', 'Shop', 'Agro', 'Lives', 'Tecnologia', 'Pedidos', 'Perfil', 'Serviços'];

const norm = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

const YES = /^(sim|pode|pode sim|quero|chama|chame|manda|ok|beleza|isso|confirmo|agenda|agendar|agora|adiciona|adicione|coloca|bota|finaliza\w*|fecha\w*)\b/;
const NO = /^(nao|deixa|cancela|agora nao|nenhum|esquece)\b/;
const CALL_NOW = /\b(chama|chame|manda|mande|solicita)\b/;
// Lotus em pausa: "continua" retoma de onde parou, "repete" fala tudo de novo.
const RESUME = /^(continua\w*|continue|pode continuar|segue|siga|prossegue|prossiga|pode falar|termina\w*|volta a falar|fala o resto)\b/;
const REPEAT = /^(repete|repita|fala de novo|de novo|nao entendi|como)\b/;
const HOLD = /^(espera|pera|aguarda|aguarde|pausa|pause|um momento|so um minuto|calma)\b/;
// Perguntas sobre as opções que ela acabou de mostrar (sem precisar repetir o serviço).
const FOLLOW = /(mais barat|menor preco|mais em conta|economic|mais pert|mais proxim|melhor (nota|avaliad)|mais bem avaliad|maior nota|\boutr[oa]\b|tem mais|mais alguem|quanto (cobra|custa|fica|e|sai)|preco|valor|nota dele|nota dela|avaliac|quanto tempo|demora|chega em|distancia|longe|que carro|qual carro|placa|o que (ele|ela) faz)/;
const kmText = (p) => String(p.distanceKm.toFixed(1)).replace('.', ',');
// Mesma conta do chamado (store.js): transporte ~4 min/km, outros serviços ~6 min/km.
const etaMin = (p, transport) => Math.max(3, Math.round(p.distanceKm * (transport ? 4 : 6)));
// "Agendar para depois": mais tarde, amanhã, às 18h, sexta…
const LATER = /\b(mais tarde|depois|outro horario|outro dia|amanha|depois de amanha|hoje a (tarde|noite)|(as|para as|pras|pra) \d|\d{1,2} ?h\b|\d{1,2}:\d{2}|segunda|terca|quarta|quinta|sexta|sabado|domingo|semana que vem)/;
const WHEN = /\b(amanha|hoje|depois de amanha|segunda|terca|quarta|quinta|sexta|sabado|domingo|semana que vem|manha|tarde|noite|\d{1,2} ?h\b|\d{1,2}:\d{2}|(as|para as|pras) \d{1,2})/;
// Tem um dia ou horário de verdade? ("mais tarde" sozinho não conta: aí ela pergunta para quando.)
const hasWhen = (t) => WHEN.test(t.replace(/\b(mais tarde|depois|outro horario|outro dia)\b/g, ''));
const whenOf = (text) =>
  text
    .replace(/^(agend\w*|marca\w*|deixa|pode|sim|ok)\s*/i, '')
    .replace(/^(para|pra)\s+/i, '')
    .replace(/[.!?]+$/, '')
    .trim();

// Produtos que a Lotus mostrou (busca ou preços): ela pergunta se pode pôr no carrinho.
const cartOptions = (results, state) =>
  (results || [])
    .map((r) => {
      const m = String(r.id || '').match(/^(?:k-)?p-(.+)$/);
      const prod = m && state.products.find((x) => x.id === m[1]);
      return prod && prod.stock > 0 ? { id: prod.id, name: prod.name, price: prod.price } : null;
    })
    .filter(Boolean)
    .slice(0, 5);
const withCartOffer = (res, state) => {
  const options = cartOptions(res.results, state);
  if (!options.length || res.pending) return res;
  return { ...res, pending: { type: 'cart', options }, reply: `${res.reply} Quer que eu adicione ${options.length > 1 ? 'algum deles' : options[0].name} ao carrinho?` };
};

// Interpreta o comando. Devolve { reply, nav?, call?, list?, results?, pending? }.
// Na versão final isso vira uma IA no servidor, com os cadastros reais dos prestadores.
function interpret(text, state, dispatch, pending, canOpen, depth = 0) {
  const t = norm(stripWake(text));
  const addrMatch = text.match(/((rua|r\.|avenida|av\.?|alameda|travessa|praca|praça|estrada)\s.+)$/i);
  const address = addrMatch ? addrMatch[1].trim() : '';

  // Só chama depois que a pessoa confirmou (agora ou agendado).
  const startCall = (serviceKey, providerId, when, addr) => {
    const call = buildServiceCall(state, addr || address, serviceKey, providerId);
    if (!call) return { reply: 'Não encontrei esse prestador disponível agora.' };
    if (when) {
      call.when = when;
      call.status = `${call.serviceLabel} agendado para ${when}`;
    }
    dispatch({ type: 'REQUEST_RIDE', ride: call });
    return { call, reply: callReply(call) };
  };
  const firstName = (id) => ((state.providers.find((p) => p.id === id) || {}).name || '').split(' ')[0];

  // Resposta "sim" depois de uma pesquisa: chama o prestador sugerido.
  // "Encontrei duas Anas, qual delas?" → "a Ana Souza", "a segunda".
  if (pending && pending.type === 'profile') {
    const o = pickOption(t, pending.options);
    if (o) return { open: o, reply: openReply(o) };
  }
  // Serviço mostrado: a pessoa escolhe quem, se chama agora ou agenda, ou desiste.
  const sameService = pending && pending.type === 'service' && detectService(t) === pending.serviceKey && FOLLOW.test(t);
  if (pending && pending.type === 'service' && (!detectService(t) || sameService)) {
    const opts = pending.options || [];
    let chosen = pickOption(t, opts);
    const current = opts.find((o) => o.id === pending.providerId) || opts[0];
    // "Tem mais barato?", "e o mais perto?", "o de melhor nota", "tem outro?": escolhe na lista já mostrada.
    let already = '';
    if (!chosen && opts.length) {
      const by = (f) => [...opts].sort(f)[0];
      if (/mais barat|menor preco|mais em conta|economic/.test(t)) {
        chosen = by((a, b) => a.price - b.price);
        if (current && chosen.price === current.price) [chosen, already] = [current, 'mais em conta'];
      } else if (/mais pert|mais proxim/.test(t)) {
        chosen = by((a, b) => a.distanceKm - b.distanceKm);
        if (chosen === current) already = 'mais perto';
      } else if (/melhor (nota|avaliad)|mais bem avaliad|maior nota/.test(t)) {
        chosen = by((a, b) => b.rating - a.rating);
        if (current && chosen.rating === current.rating) [chosen, already] = [current, 'mais bem avaliado'];
      }
      else if (/\boutr[oa]\b|tem mais|mais alguem/.test(t)) {
        const i = opts.findIndex((o) => o.id === (current && current.id));
        chosen = opts[(i + 1) % opts.length];
        if (chosen === current) return { reply: `Por enquanto só tem ${current.name} disponível perto de você.`, pending };
      }
    }
    // Perguntas sobre quem ela estava apresentando: preço, nota, tempo para chegar, o que faz.
    const about = chosen || current;
    if (about && !YES.test(t) && !NO.test(t) && !LATER.test(t)) {
      const ask = `Quer que eu chame ${about.name.split(' ')[0]} agora ou agende para outro horário?`;
      const keep = { ...pending, providerId: about.id };
      if (/quanto (cobra|custa|fica|e|sai)|preco|valor/.test(t) && !chosen) return { reply: `${about.name} cobra ${priceText(about)}. ${ask}`, pending: keep };
      if (/nota dele|nota dela|avaliac/.test(t) && !chosen) return { reply: `${about.name} tem nota ${String(about.rating).replace('.', ',')}. ${ask}`, pending: keep };
      if (/quanto tempo|demora|chega em|distancia|longe/.test(t) && !chosen) return { reply: `${about.name} está a ${kmText(about)} quilômetros, chega em uns ${etaMin(about, serviceType(pending.serviceKey).group === 'Transporte')} minutos. ${ask}`, pending: keep };
      if (/o que (ele|ela) faz/.test(t) && !chosen) return { reply: `${about.name} faz ${about.functions.slice(0, 4).join(', ').toLowerCase()}. ${ask}`, pending: keep };
      if (already) return { reply: `${chosen.name} já é o ${already} da lista: ${kmText(chosen)} quilômetros, nota ${String(chosen.rating).replace('.', ',')}, ${priceText(chosen)}. ${ask}`, pending: keep, list: opts };
      if (chosen && FOLLOW.test(t))
        return { reply: `${chosen.name}, a ${kmText(chosen)} quilômetros, nota ${String(chosen.rating).replace('.', ',')}, cobra ${priceText(chosen)}. ${ask}`, pending: keep, list: opts };
    }
    const pid = chosen ? chosen.id : pending.providerId;
    if (pending.stage === 'when') {
      if (NO.test(t)) return { reply: 'Tudo bem, não agendei nada. Se precisar, é só chamar.' };
      if (hasWhen(t)) return startCall(pending.serviceKey, pid, whenOf(text.replace(/^\s*lotus[,\s]*/i, '')), pending.address);
      return { reply: 'Para quando? Por exemplo: hoje às 18h ou amanhã às 9h.', pending };
    }
    if (NO.test(t) && !chosen) return { reply: 'Tudo bem, não chamei ninguém. Se precisar, é só pedir.' };
    if (LATER.test(t)) {
      if (hasWhen(t)) return startCall(pending.serviceKey, pid, whenOf(stripWake(text)), pending.address);
      return { reply: `Combinado. Para quando eu agendo com ${firstName(pid)}? Por exemplo: hoje às 18h ou amanhã às 9h.`, pending: { ...pending, providerId: pid, stage: 'when' } };
    }
    if (chosen && !YES.test(t) && !CALL_NOW.test(t))
      return { reply: `${chosen.name}, por ${priceText(chosen)}. Quer que eu chame agora ou agende para outro horário?`, pending: { ...pending, providerId: chosen.id } };
    if (chosen || YES.test(t)) return startCall(pending.serviceKey, pid, null, pending.address);
  }
  // Produtos mostrados: pôr no carrinho só se a pessoa quiser.
  if (pending && pending.type === 'cart') {
    const chosen = pickOption(t, pending.options);
    if (NO.test(t) && !chosen) return { reply: 'Tudo bem, não adicionei nada.' };
    const item = chosen || (YES.test(t) && pending.options[0]);
    if (item) {
      dispatch({ type: 'ADD_TO_CART', productId: item.id });
      const total = cartTotal(state) + item.price;
      return { reply: `Adicionei ${item.name} ao carrinho. O total fica em ${brl(total)}. Quer que eu finalize a compra agora?`, pending: { type: 'checkout', total } };
    }
  }
  // Carrinho: finalizar só com confirmação.
  if (pending && pending.type === 'checkout') {
    if (NO.test(t) || /continu/.test(t)) return { reply: 'Certo, o carrinho fica guardado. Ele fica no ícone da sacola, no topo da tela.' };
    if (YES.test(t)) {
      if (pending.total > state.wallet + (state.giftCredits || 0)) return { reply: 'Seu saldo não dá para essa compra. Adicione saldo na carteira e eu finalizo.' };
      dispatch({ type: 'CHECKOUT' });
      return { reply: `Compra finalizada, ${brl(pending.total)}, com pagamento protegido. Acompanhe em Pedidos.` };
    }
  }
  // Créditos de live: converter só com confirmação.
  if (pending && pending.type === 'convertLive') {
    if (YES.test(t) || /convert/.test(t)) {
      if (state.liveCredits < 10) return { reply: 'Você precisa de pelo menos 10 créditos de live para converter.' };
      dispatch({ type: 'CONVERT_LIVE_CREDITS', amount: state.liveCredits });
      return { reply: `Pronto, ${brl(state.liveCredits)} em créditos de live viraram moeda Realys no seu saldo.` };
    }
  }
  if (pending && NO.test(t)) return { reply: 'Tudo bem. Se precisar, é só chamar.' };

  // Emergência: "Lotus, liga para o SAMU", "chama os bombeiros", "socorro!".
  const EM = { samu: /\b(samu|ambulancia)\b/, bombeiros: /\bbombeiros?\b/, policia: /\bpolicia\b(?! rodoviaria)/, prf: /\bpolicia rodoviaria\b/, defesa: /\bdefesa civil\b/, cvv: /\bcvv\b/ };
  const emKey = Object.keys(EM).find((k) => EM[k].test(t));
  const wantsCall = /\b(liga|ligue|ligar|chama|chame|chamar|socorro|emergencia|urgente)\b/.test(t);
  if ((emKey && wantsCall) || /^socorro\b/.test(t)) {
    const e = emergencyNumbers.find((x) => x.key === (emKey || 'samu'));
    setTimeout(() => confirmCall(e.label, e.number), 300);
    return { reply: `Vou ligar para ${e.label}, ${e.number.split('').join(' ')}. Confirme na tela.` };
  }

  // No evento ou bar com check-in: "quero pedir uma cerveja", "abre a comanda" → abre a comanda
  // (ela mostra o cardápio; o pedido só sai quando a pessoa confirma).
  if (state.venue && /(comanda|na mesa|cardapio|cerveja|chope|drink|caipirinha|agua|refri|porcao|petisco|bebida)/.test(t)) {
    return { openVenue: true, reply: `Abrindo a comanda de ${state.venue.name}${state.venue.table ? `, mesa ${state.venue.table}` : ''}. Escolha o que quer e confirme o pedido.` };
  }
  // "Abre meu carrinho", "ver carrinho": abre a janela do carrinho.
  if (/(carrinho|minhas compras|sacola)/.test(t) && !/\b(adiciona|adicione|coloca|bota|poe|por)\b/.test(t)) {
    const n = state.cart.reduce((x, c) => x + c.qty, 0);
    return { openCart: true, reply: n ? `Abrindo seu carrinho: ${n} ${n === 1 ? 'item' : 'itens'}, total de ${brl(cartTotal(state))}.` : 'Seu carrinho está vazio. Abrindo para você ver.' };
  }

  // Conhecimento da Lotus (o que empresas e clientes publicaram): preços, comparação, opinião dos
  // clientes e informação falsa. "Quanto custa um eletricista?", "o que falam da Pizzaria?",
  // "é verdade que a gasolina vai a R$ 15?". Só responde: nunca compra, vende ou age sozinha.
  const known = knowledgeAnswer(state, stripWake(text));
  if (known) return withCartOffer(known, state);

  // Perfil de alguém: "abre o perfil da Ana", "página da Pizzaria da Praça".
  const prof = findProfile(stripWake(text), state);
  if (prof) {
    if (prof.open) return { open: prof.open, reply: openReply(prof.open, prof.others) };
    if (prof.ask) return { reply: askReply(prof.ask, prof.options), results: prof.options.map(toResult), pending: { type: 'profile', options: prof.options } };
    return { reply: `Não encontrei ninguém chamado ${prof.notFound} no Realys. Confira o nome ou procure pela lupa no topo do app.` };
  }

  // Festas: "festa mais próxima", "tem balada aberta agora?" → abertas ou que abrem logo, pela distância.
  // (Aluguel de salão e buffet continuam na busca geral.)
  const party = isPartyQuery(t);
  if (party && hasPartyCue(t)) return partyReply(t);

  // Navegação: "me leva pro Agro", "abre o Food", "volta pros Stories", "voltar".
  const nav = findNavigation(stripWake(text));
  if (nav) {
    if (nav.back || !canOpen || canOpen(nav.go.tab)) return { nav, reply: navReply(nav) };
    return { reply: `${nav.label} é uma área para contas de empresa, com CNPJ. Cadastre uma empresa no login para acessar.` };
  }

  if (party) return partyReply(t);

  // "Alugar um carro", "hotel", "curso"… é busca de conteúdo, não chamada de prestador.
  const contentFirst = CONTENT_WORDS.test(t);
  const serviceKey = contentFirst ? null : detectService(t);
  if (serviceKey) {
    const transport = serviceType(serviceKey).group === 'Transporte';
    // Nunca chama nem agenda sozinha: mostra quem está perto, o que faz e quanto cobra,
    // e pergunta se chama agora, agenda para outro horário ou se prefere outro da lista.
    const { list, reply } = searchReply(state, serviceKey);
    const where = transport && address ? ` saindo de ${address}` : '';
    return {
      reply: where ? reply.replace(' perto de você.', ` perto de você${where}.`) : reply,
      list,
      pending: list.length ? { type: 'service', serviceKey, providerId: list[0].id, options: list, address } : null,
    };
  }

  if (/(pedido|minha entrega)/.test(t)) {
    const o = state.orders[0];
    return { reply: o ? `Seu último pedido, de ${o.store}, está com status: ${o.status}.` : 'Você ainda não tem pedidos.' };
  }
  if (/(vendi|vendas|faturamento|faturei)/.test(t)) {
    const v = state.salesByDay[state.salesByDay.length - 1].value;
    const w = state.salesByDay.reduce((s, d) => s + d.value, 0);
    return { reply: `Hoje sua empresa vendeu ${brl(v)}. Nos últimos 7 dias foram ${brl(w)}.` };
  }
  if (/(estoque|acabando|acabar|faltando)/.test(t)) {
    const low = myProducts(state).filter((p) => p.stock <= p.minStock);
    return {
      reply: low.length
        ? `Estão acabando: ${low.map((p) => `${p.name}, com ${p.stock} unidades`).join('; ')}.`
        : 'Seu estoque está em dia.',
    };
  }
  // "Quanto ganhei nas lives?", "converte meus créditos de live".
  if (/\blives?\b/.test(t) && /(credito|ganhei|presente|recebi|converte|converter|moeda)/.test(t)) {
    const c = state.liveCredits || 0;
    if (c < 10) return { reply: `Você tem ${brl(c)} em créditos de live. Com 10 ou mais dá para converter em moeda Realys.` };
    return { reply: `Você tem ${brl(c)} em créditos de live, dos presentes que ganhou transmitindo. Quer que eu converta em moeda Realys agora?`, pending: { type: 'convertLive' } };
  }
  if (/(saldo|dinheiro|carteira)/.test(t)) return { reply: `Seu saldo Realys é de ${brl(state.wallet)}.` };

  // Busca geral em todo o conteúdo do app: anúncios, hotéis, imóveis, eventos, cursos,
  // lojas, produtos, promoções, prestadores, lives, pessoas e posts.
  const found = searchAll(state, stripWake(text));
  // Modelo de linguagem (dentro do celular): sem palavra-chave conhecida, entende pelo sentido.
  // "tô a fim de dançar hoje" → festas; "meu chuveiro queimou" → prestadores; "tô sem trabalho" → vagas.
  if (!depth && !found.category && (!found.results.length || !CONTENT_WORDS.test(t))) {
    let sense = null;
    try {
      sense = understand(stripWake(text));
    } catch (e) {}
    if (sense) {
      const sub = interpret(sense.intent.command, state, dispatch, null, canOpen, 1);
      if (!sub.miss) return { ...sub, understood: sense.intent.label, reply: sub.nav || sub.open ? sub.reply : `Entendi, você procura ${sense.intent.label}. ${sub.reply}` };
    }
  }
  const { results, tokens, label } = found;
  if (results.length || found.category) return withCartOffer({ reply: contentReply(results, label, found), results }, state);
  if (tokens.length) return { miss: true, reply: contentReply([], label) };
  return {
    miss: true,
    reply:
      'Desculpe, ainda não entendi. Você pode pedir para eu abrir qualquer página, como "me leva pro Agro", procurar hotéis, lojas ou cursos, chamar um prestador, ou ver pedidos, vendas e estoque.',
  };
}

// Entre as opções que o celular ouviu, prefere a que é um pedido de navegação
// ("histories" na 1ª opção, "stories" na 2ª → vai para os Stories).
function bestHeard(alts) {
  const list = (alts || []).map((a) => (a && a.transcript ? a.transcript : '')).filter(Boolean);
  if (!list.length) return '';
  if (findNavigation(stripWake(list[0]))) return list[0];
  return list.find((s) => findNavigation(stripWake(s))) || list[0];
}

// Chamar "Lotus" enquanto ela fala: espera esta pausa depois do nome para pegar o novo pedido
// ("Lotus… me leva pro Agro"). Se a pessoa disser só "Lotus", ela abre o microfone para ouvir.
const CALL_PAUSE_MS = 900;

const speechOk = () => {
  try {
    return Platform.OS === 'android' && ExpoSpeechRecognitionModule.isRecognitionAvailable();
  } catch (e) {
    return false;
  }
};

const PHASE_TEXT = {
  idle: 'Toque no orbe e fale',
  listening: 'Ouvindo…',
  thinking: 'Processando…',
  speaking: 'Lotus respondendo',
  paused: 'Em pausa',
};

// Orbe da Lotus: anéis que respiram em repouso, pulsam ao ouvir e acompanham o volume da voz.
function Orb({ phase, level, onPress }) {
  const breath = useRef(new Animated.Value(0)).current;
  const wave = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fast = phase === 'listening' || phase === 'speaking';
    breath.setValue(0);
    wave.setValue(0);
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: fast ? 520 : 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: fast ? 520 : 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const w = Animated.loop(Animated.timing(wave, { toValue: 1, duration: fast ? 1100 : 2600, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    a.start();
    w.start();
    return () => {
      a.stop();
      w.stop();
    };
  }, [phase]);

  useEffect(() => {
    const s = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true }));
    s.start();
    return () => s.stop();
  }, []);

  const coreScale = Animated.add(
    breath.interpolate({ inputRange: [0, 1], outputRange: [1, phase === 'idle' ? 1.04 : 1.07] }),
    level.interpolate({ inputRange: [0, 1], outputRange: [0, 0.28] }),
  );
  const waveScale = wave.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] });
  const waveOpacity = wave.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.45, 0] });
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const accent = phase === 'listening' ? colors.accent : colors.primary;

  return (
    <Pressable onPress={onPress} accessibilityLabel="Falar com a Lotus" style={styles.orbWrap}>
      <Animated.View style={[styles.wave, { borderColor: accent, opacity: waveOpacity, transform: [{ scale: waveScale }] }]} />
      <Animated.View style={[styles.halo, { transform: [{ rotate }] }]}>
        <View style={[styles.haloDot, { backgroundColor: colors.gold, top: -4, left: (ORB + 8) / 2 - 4 }]} />
        <View style={[styles.haloDot, { backgroundColor: colors.accent, bottom: -3, left: (ORB + 8) / 2 - 3, width: 6, height: 6 }]} />
      </Animated.View>
      <Animated.View style={[styles.core, { transform: [{ scale: coreScale }] }]}>
        <View style={styles.coreGlowGold} />
        <View style={styles.coreGlowBlue} />
        <View style={[styles.coreInner, phase === 'listening' && { borderColor: colors.accent }]}>
          <Ionicons name={phase === 'listening' ? 'mic' : phase === 'speaking' ? 'volume-high' : phase === 'paused' ? 'pause' : phase === 'thinking' ? 'sparkles' : 'mic-outline'} size={30} color={accent} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

export default function VoiceAssistant({ visible, onClose, initialCommand, handsFree, onNavigate, onVoiceNav, canOpen }) {
  const { state, dispatch } = useStore();
  const [text, setText] = useState('');
  const [history, setHistory] = useState([]);
  const [phase, setPhase] = useState('idle');
  const [partial, setPartial] = useState('');
  const [pending, setPending] = useState(null);
  const level = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(0)).current;
  const session = useRef({ active: false, started: false, retried: false });
  const supported = useMemo(speechOk, []);
  const pendingRef = useRef(null);
  pendingRef.current = pending;
  // Escuta enquanto a Lotus fala, para interromper quando a pessoa chama "Lotus" de novo.
  const bargeIn = useRef({ on: false, heard: false, rest: '', timer: null, tries: 0 });
  // Cada fala tem um número: quando ela é interrompida, os avisos da fala antiga são ignorados.
  const speechId = useRef(0);
  // O que ela está falando agora (frases e em qual está) e, quando pausada, de onde continuar.
  const talking = useRef(null); // { parts, index, res }
  const [paused, setPaused] = useState(null);
  const pausedRef = useRef(null);
  pausedRef.current = paused;
  const restPhase = () => (pausedRef.current ? 'paused' : 'idle');

  const startBargeRecognizer = () => {
    if (!bargeIn.current.on) return;
    try {
      ExpoSpeechRecognitionModule.start({
        lang: 'pt-BR',
        interimResults: true,
        continuous: true,
        maxAlternatives: 5,
        contextualStrings: ['Lotus', 'Lótus', ...HINTS],
        // Em Androids mais antigos o "continuous" não existe e o microfone desliga sozinho depois de
        // cada frase que ouve (inclusive a voz da própria Lotus). Aqui ele aguenta mais tempo ligado.
        androidIntentOptions: {
          EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 60000,
          EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 8000,
          EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 8000,
        },
      });
    } catch (e) {
      bargeIn.current.on = false;
    }
  };

  // Começa a ouvir enquanto a Lotus fala.
  const startBargeIn = (reply) => {
    if (!supported) return;
    // Se a própria resposta tem o nome "Lotus", o microfone poderia ouvir a voz dela e se interromper.
    if (findCall(reply)) return;
    bargeIn.current = { on: true, heard: false, rest: '', timer: null, tries: 0 };
    startBargeRecognizer();
  };

  const stopBargeIn = () => {
    const b = bargeIn.current;
    clearTimeout(b.timer);
    if (!b.on) return;
    b.on = false;
    try {
      ExpoSpeechRecognitionModule.abort();
    } catch (e) {}
  };

  // A pessoa chamou "Lotus" no meio da fala: ela PAUSA (guarda a frase em que estava e o assunto,
  // como a lista de motoristas) e ouve o novo pedido, que é entendido junto com o que já foi pedido.
  const finishBargeIn = () => {
    const rest = bargeIn.current.rest;
    stopBargeIn();
    level.setValue(0);
    if (rest) return run(rest);
    setPartial('');
    setTimeout(listen, 150);
  };

  const pauseTalk = () => {
    speechId.current += 1;
    const cur = talking.current;
    talking.current = null;
    stopSpeaking();
    if (cur) setPaused({ parts: cur.parts, index: cur.index, res: cur.res });
  };

  const onBargeHeard = (results, isFinal) => {
    const b = bargeIn.current;
    const call = hearCall(results);
    if (!b.heard) {
      if (!call) return;
      b.heard = true;
      // Não apaga o assunto (pending): "Lotus… tem mais barato?" continua falando dos mesmos motoristas.
      pauseTalk();
      setPhase('listening');
    }
    if (call) b.rest = call.rest;
    setPartial(b.rest || '');
    clearTimeout(b.timer);
    if (isFinal) return finishBargeIn();
    b.timer = setTimeout(finishBargeIn, CALL_PAUSE_MS);
  };

  const stopListening = () => {
    if (!session.current.active) return;
    session.current.active = false;
    try {
      ExpoSpeechRecognitionModule.abort();
    } catch (e) {}
  };

  const close = () => {
    speechId.current += 1;
    talking.current = null;
    setPaused(null);
    stopBargeIn();
    stopListening();
    stopSpeaking();
    setPhase('idle');
    onClose();
  };

  // Fala a resposta frase por frase, ouvindo "Lotus" ao mesmo tempo para poder ser pausada.
  const say = (res, parts, from) => {
    setPhase('speaking');
    setPaused(null);
    const id = (speechId.current += 1);
    talking.current = { parts, index: from, res };
    let done = false;
    const ended = () => {
      done = true;
      if (id !== speechId.current) return false; // fala pausada: já está ouvindo o novo pedido
      talking.current = null;
      stopBargeIn();
      setPhase('idle');
      return true;
    };
    speakParts(parts, from, {
      onPart: (i) => {
        if (id === speechId.current && talking.current) talking.current.index = i;
      },
      onDone: () => {
        // Mãos livres: se a Lotus fez uma pergunta ("quer que eu chame?"), já abre o microfone para a resposta.
        if (ended() && handsFree && res.pending) setTimeout(listen, 150);
      },
      onStopped: ended,
      onError: ended,
    });
    // Enquanto fala, fica ouvindo: dizer "Lotus" de novo pausa e ela ouve um novo pedido.
    stopBargeIn();
    setTimeout(() => !done && id === speechId.current && startBargeIn(res.reply), 200);
  };

  const resume = (fromStart) => {
    const p = pausedRef.current;
    if (!p) return false;
    say(p.res, p.parts, fromStart ? 0 : Math.min(p.index, p.parts.length - 1));
    return true;
  };

  const run = (cmd, forced, alts) => {
    if (!cmd || !cmd.trim()) return;
    // Em pausa: "continua" retoma da frase em que parou; "repete" fala tudo de novo; "espera" segue pausada.
    if (!forced && pausedRef.current) {
      const c = norm(stripWake(cmd));
      setPartial('');
      if (RESUME.test(c) && resume(false)) return;
      if (REPEAT.test(c) && resume(true)) return;
      if (HOLD.test(c)) return setPhase('paused');
      setPaused(null); // pedido novo: a fala antiga fica para trás, mas o assunto (pending) continua valendo
    }
    setPhase('thinking');
    setPartial('');
    let res = forced || interpret(cmd, state, dispatch, pendingRef.current, canOpen);
    // O celular ouviu errado? Tenta as outras opções que ele ouviu antes de dizer "não encontrei".
    const empty = (r) => !!r.miss;
    if (!forced && empty(res) && alts && alts.length > 1) {
      for (const alt of alts) {
        if (alt === cmd) continue;
        const r = interpret(alt, state, dispatch, pendingRef.current, canOpen);
        if (!empty(r)) {
          res = r;
          cmd = alt;
          break;
        }
      }
    }
    setText('');
    // Navegação: fala "Abrindo Agro", fecha a caixa e abre a página na hora.
    if (res.nav && onVoiceNav) {
      setPending(null);
      setPhase('idle');
      speakSoft(res.reply);
      onVoiceNav(res.nav);
      return;
    }
    if (res.openVenue) {
      setPending(null);
      setPhase('idle');
      speakSoft(res.reply);
      dispatch({ type: 'OPEN_VENUE' });
      onClose();
      return;
    }
    // Carrinho: fala, fecha a caixa e abre a janela do carrinho.
    if (res.openCart) {
      setPending(null);
      setPhase('idle');
      speakSoft(res.reply);
      dispatch({ type: 'OPEN_CART' });
      onClose();
      return;
    }
    // Perfil: fala "Abrindo o perfil de Ana Paula", fecha a caixa e abre o perfil.
    if (res.open) {
      setPending(null);
      setPhase('idle');
      speakSoft(res.reply);
      dispatch({ type: res.open.kind === 'company' ? 'OPEN_COMPANY' : 'OPEN_PROFILE', id: res.open.id });
      onClose();
      return;
    }
    // Pergunta sobre a lista que ela mostrou: mantém a lista na tela.
    if (!res.list && res.pending && res.pending.type === 'service' && pendingRef.current && pendingRef.current.type === 'service') res = { ...res, list: res.pending.options };
    setPending(res.pending || null);
    setHistory((h) => [{ q: cmd, ...res }, ...h]);
    say(res, splitSentences(res.reply), 0);
  };

  // Microfone pelo diálogo do Google: só se o reconhecimento dentro do app não existir no celular.
  const legacyListen = async () => {
    if (Platform.OS !== 'android') return;
    setPhase('listening');
    try {
      const result = await IntentLauncher.startActivityAsync('android.speech.action.RECOGNIZE_SPEECH', {
        extra: {
          'android.speech.extra.LANGUAGE_MODEL': 'free_form',
          'android.speech.extra.LANGUAGE': 'pt-BR',
          'android.speech.extra.PROMPT': 'Fale com a Lotus',
          'android.speech.extra.MAX_RESULTS': 3,
        },
      });
      const said = result && result.extra && result.extra['android.speech.extra.RESULTS'];
      if (said && said.length) return run(bestHeard(said.map((s) => ({ transcript: s }))), null, said);
      setPhase('idle');
    } catch (e) {
      setPhase('idle');
      setHistory((h) => [{ q: '🎙️', reply: 'Não consegui abrir o microfone. Digite seu comando abaixo.' }, ...h]);
    }
  };

  // Microfone dentro do próprio app: começa a ouvir na hora, sem abrir a janela do Google.
  const startRecognizer = () => {
    try {
      ExpoSpeechRecognitionModule.start({
        lang: 'pt-BR',
        interimResults: true,
        continuous: false,
        maxAlternatives: 3,
        contextualStrings: HINTS,
        volumeChangeEventOptions: { enabled: true, intervalMillis: 90 },
      });
    } catch (e) {
      session.current.active = false;
      setPhase('idle');
    }
  };

  const listen = async () => {
    if (!supported) return legacyListen();
    // Tocar no orbe enquanto ela fala: pausa a fala e ouve.
    if (bargeIn.current.on || talking.current) {
      stopBargeIn();
      pauseTalk();
    }
    // Tocar no orbe enquanto ouve: para de ouvir.
    if (session.current.active) {
      stopListening();
      setPhase(restPhase());
      return;
    }
    stopSpeaking();
    try {
      const p = await ExpoSpeechRecognitionModule.getPermissionsAsync();
      if (!p || !p.granted) {
        const r = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!r || !r.granted) {
          setHistory((h) => [{ q: '🎙️', reply: 'O Realys precisa da permissão do microfone para ouvir você. Você também pode digitar abaixo.' }, ...h]);
          return;
        }
      }
    } catch (e) {}
    session.current = { active: true, started: false, retried: false };
    setPartial('');
    setPhase('listening');
    startRecognizer();
  };

  useSpeechRecognitionEvent('start', () => {
    if (bargeIn.current.on) bargeIn.current.tries = 0;
    if (session.current.active) session.current.started = true;
  });
  useSpeechRecognitionEvent('volumechange', (e) => {
    if (!session.current.active) return;
    const v = Math.max(0, Math.min(1, ((e && e.value) + 2) / 12));
    Animated.timing(level, { toValue: v, duration: 90, useNativeDriver: true }).start();
  });
  useSpeechRecognitionEvent('result', (e) => {
    if (bargeIn.current.on) return onBargeHeard(e && e.results, e && e.isFinal);
    if (!session.current.active) return;
    const said = e && e.results && e.results[0] ? e.results[0].transcript : '';
    setPartial(said);
    if (e.isFinal) {
      session.current.active = false;
      level.setValue(0);
      run(bestHeard(e.results), null, (e.results || []).map((a) => a && a.transcript).filter(Boolean));
    }
  });
  useSpeechRecognitionEvent('end', () => {
    const b = bargeIn.current;
    if (b.on) {
      if (b.heard) return finishBargeIn();
      // O celular parou de ouvir sozinho, mas ela ainda está falando: volta a ouvir na hora,
      // quantas vezes precisar (só desiste se ele falhar muitas vezes seguidas sem nem começar).
      if (b.tries++ < 12) setTimeout(() => b.on && !b.heard && startBargeRecognizer(), 80);
      return;
    }
    if (!session.current.active || !session.current.started) return;
    session.current.active = false;
    level.setValue(0);
    setPhase(restPhase());
  });
  useSpeechRecognitionEvent('error', (e) => {
    const b = bargeIn.current;
    if (b.on) {
      if (b.heard) return finishBargeIn();
      const code = e && e.error;
      if (code === 'not-allowed' || code === 'service-not-allowed') return stopBargeIn();
      if (b.tries++ < 12) setTimeout(() => b.on && !b.heard && startBargeRecognizer(), code === 'no-speech' || code === 'speech-timeout' ? 80 : 250);
      return;
    }
    const s = session.current;
    if (!s.active) return;
    const code = e && e.error;
    // O "abrir Lotus" ainda estava soltando o microfone: tenta de novo uma vez.
    if (!s.started && !s.retried && (code === 'aborted' || code === 'busy' || code === 'client' || code === 'recognizer-busy')) {
      s.retried = true;
      setTimeout(() => s.active && startRecognizer(), 140);
      return;
    }
    s.active = false;
    level.setValue(0);
    setPhase(restPhase());
    if (code === 'not-allowed' || code === 'service-not-allowed') {
      setHistory((h) => [{ q: '🎙️', reply: 'O Realys precisa da permissão do microfone para ouvir você.' }, ...h]);
    } else if (code === 'no-speech' || code === 'speech-timeout') {
      setPartial('');
    }
  });

  // Abriu a caixa: entra rápido e já começa a ouvir (ou executa o pedido do "abrir Lotus").
  useEffect(() => {
    if (!visible) {
      speechId.current += 1;
      talking.current = null;
      setPaused(null);
      stopBargeIn();
      stopListening();
      enter.setValue(0);
      return;
    }
    prepareVoice();
    Animated.timing(enter, { toValue: 1, duration: 170, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    if (initialCommand && initialCommand.text) {
      run(initialCommand.text);
      return;
    }
    // Pequena folga para o "abrir Lotus" liberar o microfone.
    const t = setTimeout(listen, 120);
    return () => clearTimeout(t);
  }, [visible, initialCommand && initialCommand.at]);

  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [36, 0] });
  const last = history[0];

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={close} />
        <Animated.View style={[styles.sheet, { opacity: enter, transform: [{ translateY }] }]}>
          <View style={styles.grip} />
          <View style={styles.head}>
            <View>
              <Text style={styles.brand}>LOTUS</Text>
              <Text style={styles.brandSub}>assistente do Realys</Text>
            </View>
            <TouchableOpacity onPress={close} style={styles.closeBtn} accessibilityLabel="Fechar a Lotus">
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <Orb phase={phase} level={level} onPress={listen} />
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: phase === 'listening' ? colors.accent : phase === 'idle' ? colors.muted : colors.primary }]} />
            <Text style={styles.status}>{PHASE_TEXT[phase]}</Text>
          </View>
          <Text style={[styles.live, !partial && !last && styles.livePlaceholder]} numberOfLines={3}>
            {partial || (last && phase !== 'listening' ? last.reply : '“Me leva pro Agro”')}
          </Text>
          {paused && phase !== 'speaking' ? (
            <View style={styles.pauseRow}>
              <Text style={styles.pauseHint}>Diga "continua" ou faça outro pedido sobre o mesmo assunto</Text>
              <TouchableOpacity onPress={() => resume(false)} style={styles.pauseBtn} accessibilityLabel="Continuar a fala da Lotus">
                <Ionicons name="play" size={14} color={colors.onPrimary} />
                <Text style={styles.pauseBtnText}>Continuar</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <ScrollView style={{ flex: 1, marginTop: 10 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {!history.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingVertical: 4 }}>
                {EXAMPLES.map((e) => (
                  <TouchableOpacity key={e} onPress={() => run(e)} style={styles.chip}>
                    <Text style={styles.chipText}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : null}
            {history.map((h, i) => (
              <View key={i} style={{ marginBottom: 14 }}>
                <View style={styles.userLine}>
                  <Text style={styles.userText}>{h.q}</Text>
                </View>
                <View style={styles.botCard}>
                  <View style={styles.botBar} />
                  <View style={{ flex: 1 }}>
                    {h.falseInfo ? (
                      <View style={[styles.sense, { backgroundColor: 'rgba(217,83,79,0.1)' }]}>
                        <Ionicons name="close-circle" size={11} color={colors.danger} />
                        <Text style={[styles.senseTxt, { color: colors.danger }]}>Informação falsa verificada</Text>
                      </View>
                    ) : h.knowledge ? (
                      <View style={[styles.sense, { backgroundColor: 'rgba(168,121,10,0.1)' }]}>
                        <Ionicons name="library-outline" size={11} color={colors.primary} />
                        <Text style={[styles.senseTxt, { color: colors.primary }]}>Pelo que foi publicado no Realys</Text>
                      </View>
                    ) : null}
                    {h.understood ? (
                      <View style={styles.sense}>
                        <Ionicons name="sparkles" size={11} color={colors.accent} />
                        <Text style={styles.senseTxt}>Entendi pelo sentido: {h.understood}</Text>
                      </View>
                    ) : null}
                    <Text style={styles.botText}>{h.reply}</Text>
                  </View>
                </View>
                {h.list
                  ? h.list.map((p) => (
                      <View key={p.id} style={styles.item}>
                        <Photo uri={p.photo} style={styles.pPhoto} fallback="🧑" />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.itemTitle}>
                            {p.name} · <Text style={{ color: colors.primary, fontWeight: '700' }}>★ {p.rating}</Text>
                          </Text>
                          <Text style={styles.itemSub}>
                            {p.distanceKm.toFixed(1)} km · {p.functions.join(', ')}
                          </Text>
                          <Text style={styles.itemPrice}>{priceText(p)}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.callBtn}
                          onPress={() => {
                            const call = buildServiceCall(state, '', p.service);
                            call.provider = p;
                            dispatch({ type: 'REQUEST_RIDE', ride: call });
                            run(`Chamar ${p.name}`, { reply: callReply(call), call });
                          }}
                        >
                          <Text style={styles.callText}>Chamar</Text>
                        </TouchableOpacity>
                      </View>
                    ))
                  : null}
                {h.results
                  ? h.results.map((r) => (
                      <TouchableOpacity
                        key={r.id}
                        style={styles.item}
                        activeOpacity={0.85}
                        onPress={() => {
                          stopSpeaking();
                          if (r.profileId) {
                            dispatch({ type: 'OPEN_PROFILE', id: r.profileId });
                            onClose();
                          } else if (r.companyId) {
                            dispatch({ type: 'OPEN_COMPANY', id: r.companyId });
                            onClose();
                          } else if (r.go && onNavigate) onNavigate(r.go);
                        }}
                      >
                        <Photo uri={r.photo} style={styles.rPhoto} fallback={r.icon || '🔎'} />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.itemTag}>
                            {r.section}{r.sponsored ? ' · Patrocinado' : ''}
                          </Text>
                          <Text style={styles.itemTitle} numberOfLines={2}>{r.title}</Text>
                          {r.subtitle ? <Text style={styles.itemSub} numberOfLines={2}>{r.subtitle}</Text> : null}
                          {r.price || r.priceValue != null ? (
                            <Text style={styles.itemPrice}>{r.price || `${brl(r.priceValue)}${r.priceUnit ? ' por ' + r.priceUnit : ''}`}</Text>
                          ) : null}
                        </View>
                        {/^(?:k-)?p-/.test(String(r.id)) && state.products.some((x) => 'p-' + x.id === String(r.id).replace(/^k-/, '')) ? (
                          <TouchableOpacity
                            style={styles.callBtn}
                            onPress={() => {
                              const pid = String(r.id).replace(/^k-/, '').slice(2);
                              const prod = state.products.find((x) => x.id === pid);
                              dispatch({ type: 'ADD_TO_CART', productId: pid });
                              run(`Adicionar ${prod.name}`, { reply: `Adicionei ${prod.name} ao carrinho. Quer que eu finalize a compra agora?`, pending: { type: 'checkout', total: cartTotal(state) + prod.price } });
                            }}
                          >
                            <Text style={styles.callText}>Adicionar</Text>
                          </TouchableOpacity>
                        ) : (
                          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                        )}
                      </TouchableOpacity>
                    ))
                  : null}
                {h.call ? <ServiceCallCard call={h.call} /> : null}
                {i === 0 && h.pending && pending ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
                    {(pending.type === 'service'
                      ? pending.stage === 'when'
                        ? [['Hoje às 18h', 'hoje às 18h', true], ['Amanhã às 9h', 'amanhã às 9h'], ['Não agendar', 'Não']]
                        : [[`Chamar ${(state.providers.find((p) => p.id === pending.providerId) || { name: '' }).name.split(' ')[0]} agora`, 'Sim', true], ['Agendar para depois', 'agendar para mais tarde'], ['Não', 'Não']]
                      : pending.type === 'cart'
                      ? [[pending.options.length > 1 ? 'Adicionar o 1º' : 'Adicionar ao carrinho', 'Sim', true], ['Não', 'Não']]
                      : pending.type === 'checkout'
                      ? [['Finalizar compra', 'Sim', true], ['Continuar comprando', 'continuar']]
                      : [['Sim', 'Sim', true], ['Não', 'Não']]
                    ).map(([label, say, main]) => (
                      <TouchableOpacity key={label} style={[styles.chip, main && styles.chipOn]} onPress={() => run(say)}>
                        <Text style={[styles.chipText, main && { color: colors.onPrimary }]}>{label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
              </View>
            ))}
          </ScrollView>

          <View style={styles.inputBar}>
            <Ionicons name="sparkles-outline" size={18} color={colors.primary} style={{ marginLeft: 4 }} />
            <TextInput
              placeholder="Digite ou fale com a Lotus"
              placeholderTextColor={colors.muted}
              value={text}
              onChangeText={setText}
              onSubmitEditing={() => run(text)}
              returnKeyType="send"
              style={styles.input}
            />
            {text.trim() ? (
              <TouchableOpacity onPress={() => run(text)} style={styles.sendBtn} accessibilityLabel="Enviar">
                <Ionicons name="arrow-up" size={20} color={colors.onPrimary} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={listen} style={[styles.sendBtn, phase === 'listening' && { backgroundColor: colors.accent }]} accessibilityLabel="Falar">
                <Ionicons name={phase === 'listening' ? 'stop' : 'mic'} size={19} color={colors.onPrimary} />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const ORB = 132;

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(16,22,40,0.42)' },
  sheet: {
    backgroundColor: '#FFFDF8',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 16,
    height: '84%',
    borderWidth: 1,
    borderColor: 'rgba(226,182,73,0.45)',
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 24,
  },
  grip: { alignSelf: 'center', width: 44, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 8 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { fontSize: 18, fontWeight: '800', letterSpacing: 6, color: colors.text },
  brandSub: { fontSize: 11, color: colors.muted, letterSpacing: 1.2, marginTop: 1 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardAlt },

  orbWrap: { alignSelf: 'center', width: ORB + 40, height: ORB + 40, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  wave: { position: 'absolute', width: ORB, height: ORB, borderRadius: ORB / 2, borderWidth: 2 },
  halo: {
    position: 'absolute',
    width: ORB + 8,
    height: ORB + 8,
    borderRadius: (ORB + 8) / 2,
    borderWidth: 1,
    borderColor: 'rgba(168,121,10,0.25)',
    borderStyle: 'dashed',
  },
  haloDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
  core: {
    width: ORB - 24,
    height: ORB - 24,
    borderRadius: (ORB - 24) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF6DE',
    shadowColor: colors.gold,
    shadowOpacity: 0.7,
    shadowRadius: 22,
    elevation: 14,
    overflow: 'hidden',
  },
  coreGlowGold: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(226,182,73,0.55)', top: -38, left: -30 },
  coreGlowBlue: { position: 'absolute', width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(47,116,208,0.28)', bottom: -34, right: -26 },
  coreInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.gold,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  status: { color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  live: { textAlign: 'center', color: colors.text, fontSize: 19, fontWeight: '600', marginTop: 8, paddingHorizontal: 10, minHeight: 26 },
  pauseRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8, paddingHorizontal: 10 },
  pauseHint: { flex: 1, color: colors.muted, fontSize: 12, marginRight: 8 },
  pauseBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 7 },
  pauseBtnText: { color: colors.onPrimary, fontWeight: '700', fontSize: 12, marginLeft: 4 },
  livePlaceholder: { color: 'rgba(110,120,145,0.6)', fontStyle: 'italic', fontWeight: '500' },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(168,121,10,0.35)',
    backgroundColor: 'rgba(251,241,214,0.6)',
    marginRight: 8,
    marginBottom: 6,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.primaryDark, fontWeight: '700', fontSize: 13 },

  userLine: { alignSelf: 'flex-end', backgroundColor: colors.text, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 16, borderBottomRightRadius: 4, maxWidth: '85%', marginBottom: 6 },
  userText: { color: '#FFFFFF', fontSize: 14 },
  botCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, marginBottom: 6, ...soft },
  botBar: { width: 3, borderRadius: 2, backgroundColor: colors.gold, marginRight: 10 },
  botText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  sense: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: 'rgba(47,116,208,0.08)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 6 },
  senseTxt: { color: colors.accent, fontSize: 11, fontWeight: '700', marginLeft: 4 },

  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 10, marginBottom: 6, ...soft },
  itemTag: { color: colors.accent, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  itemTitle: { color: colors.text, fontWeight: '700' },
  itemSub: { color: colors.muted, fontSize: 12 },
  itemPrice: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  pPhoto: { width: 44, height: 44, borderRadius: 22 },
  rPhoto: { width: 54, height: 54, borderRadius: 14 },
  callBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  callText: { color: colors.onPrimary, fontWeight: '700', fontSize: 12 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(168,121,10,0.35)',
    paddingLeft: 10,
    paddingRight: 5,
    paddingVertical: 5,
    marginTop: 8,
  },
  input: { flex: 1, color: colors.text, fontSize: 15, paddingHorizontal: 8, paddingVertical: 6 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});

// Para testes no computador.
export const _interpret = interpret;
