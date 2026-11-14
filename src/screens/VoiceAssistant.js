import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, Platform, KeyboardAvoidingView,
  Animated, Easing, TextInput, Pressable, Dimensions, AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as IntentLauncher from 'expo-intent-launcher';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useStore, buildServiceCall, callReply, searchReply, detectService, serviceType, priceText, myProducts, cartTotal } from '../store';
import { colors, brl, soft } from '../theme';
import { ServiceCallCard } from './cliente/ServicesScreen';
import { Photo } from '../components/ui';
import ProviderPreview from '../components/ProviderPreview';
import LotusFlower, { FlyingPetal, MOODS } from '../components/LotusFlower';
import StarField, { skyBg } from '../components/StarField';
import { getWeather, skyOf, weatherIcon } from '../weather';
import { searchAll, contentReply, CONTENT_WORDS } from '../search';
import { greetingReply } from '../lotusGreetings';
import { rememberMusic, giveMusicBack } from '../musicGuard';
import { stripWake, findCall, hearCall, stripEcho, fixMotos } from '../wakeMatch';
import { speakSoft, stopSpeaking, prepareVoice, speakParts, splitSentences, forSpeech } from '../voice';
import { voiceGateOn, voicePrintSupported, recordingFor, verifySpeech, REJECT_TEXT, tratoOf, phrasesOf } from '../voicePrint';
import { openLine } from '../lotusTrato';
import { answerKind } from '../voicePhrases';
import FaceCheck, { FACE_ABOVE } from '../components/FaceCheck';
import { isPanic } from '../panic';
import { lotusRefusal } from '../lotusConduta';
import { findPublicOrg, PUBLIC_ORGS } from '../publicServices';
import { emergencyNumbers } from '../extraData';
import { confirmCall } from '../phone';
import { findNavigation, navReply } from '../voiceNav';
import { understand } from '../lm/lotusLM';
import { knowledgeAnswer } from '../lm/knowledge';
import { openAction, isPartyQuery, hasPartyCue, partyReply, findProfile, pickOption, openReply, askReply, toResult } from '../voiceIntents';
import { withSystemDialog, systemDialogOpen } from '../systemDialog';
import { onDeviceOptions, noteVoiceError, isNetError, worksOffline } from '../offlineVoice';

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
const HINTS = ['Lotus', 'Re@lys', 'Community', 'Stories', 'Food', 'Date', 'Shop', 'Agro', 'Lives', 'Tecnologia', 'Pedidos', 'Perfil', 'Serviços'];

const norm = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

const YES = /^(sim|pode|pode sim|quero|chama|chame|manda|ok|beleza|isso|confirmo|agenda|agendar|agora|adiciona|adicione|coloca|bota|finaliza\w*|fecha\w*)\b/;
const NO = /^(nao|deixa|cancela|agora nao|nenhum|esquece)\b/;
const CALL_NOW = /\b(chama|chame|manda|mande|solicita)\b/;
// Lotus em pausa: "continua" retoma de onde parou, "repete" fala tudo de novo.
// Só vale quando é a frase INTEIRA ("continua", "pode continuar"): "como faço pra…" ou
// "segue pro centro" são pedidos novos, não ordem de voltar à fala antiga.
const RESUME = /^(continua|continue|pode continuar|continua falando|segue|siga|prossegue|prossiga|pode falar|termina|termina de falar|volta a falar|fala o resto)$/;
const REPEAT = /^(repete|repita|repete por favor|fala de novo|repete de novo|nao entendi|como e que e)$/;
const HOLD = /^(espera|pera|aguarda|aguarde|pausa|pause|um momento|so um minuto|calma)$/;
const bare = (c) => c.replace(/[^a-z\s]/g, ' ').replace(/\b(lotus|por favor|ai)\b/g, ' ').replace(/\s+/g, ' ').trim();
// Depois de interromper a Lotus: o pedido novo só aproveita o assunto anterior (a lista de
// motoristas, o carrinho…) se for continuação dele: "sim", "não", "o mais barato", "a segunda",
// "agenda pra amanhã". Qualquer outro pedido é entendido do zero.
const isFollowUp = (c, p) => {
  if (!p) return false;
  if (CONFIRM_VOICE.test(c)) return true;
  if (p.secq) return true; // resposta da pergunta de segurança
  const n = bare(c).split(' ').filter(Boolean).length;
  if (n <= 3 && (YES.test(c) || NO.test(c))) return true;
  if (p.type === 'service' && (FOLLOW.test(c) || LATER.test(c))) return true;
  if (p.type === 'checkout' && /continu/.test(c)) return true;
  return !!(p.options && pickOption(c, p.options));
};
// Perguntas sobre as opções que ela acabou de mostrar (sem precisar repetir o serviço).
const FOLLOW = /(mais barat|menor preco|mais em conta|economic|mais pert|mais proxim|melhor (nota|avaliad)|mais bem avaliad|maior nota|\boutr[oa]\b|tem mais|mais alguem|quanto (cobra|custa|fica|e|sai)|preco|valor|nota dele|nota dela|avaliac|quanto tempo|demora|chega em|distancia|longe|que carro|qual carro|placa|o que (ele|ela) faz)/;
const kmText = (p) => String(p.distanceKm.toFixed(1)).replace('.', ',');
// Mesma conta do chamado (store.js): transporte ~4 min/km, outros serviços ~6 min/km.
const etaMin = (p, transport) => Math.max(3, Math.round(p.distanceKm * (transport ? 4 : 6)));
// "Agendar para depois": mais tarde, amanhã, às 18h, sexta…
const LATER_RE = /\b(mais tarde|depois|outro horario|outro dia|amanha|depois de amanha|hoje a (tarde|noite)|(as|para as|pras|pra) \d|\d{1,2} ?h\b|\d{1,2}:\d{2}|segunda|terca|quarta|quinta|sexta|sabado|domingo|semana que vem)/;
const LATER = LATER_RE;
// Confirmação por voz: só vale com a palavra "confirmo/confirma" ("sim, confirmo", "sim, confirma
// para mim", "pode confirmar"). Um "sim" sozinho não executa nada. "Confirme" fica de fora: é o que
// a Lotus fala ("quer que eu confirme?"), e o microfone não pode confirmar com a voz dela.
const CONFIRM_VOICE = /\bconfirm(o|a|ar|ado)\b/;
// Confirmar por voz é só para quem cadastrou a voz do dono (é opcional), e só vale quando a frase
// foi conferida como a voz do titular. Sem o cadastro, toda confirmação é pelo botão.
let ownerVoice = false; // a frase que está sendo entendida agora veio do titular (voz conferida)
const voiceConfirmOn = () => voiceGateOn();
// Pergunta de segurança cadastrada (2ª pergunta da confirmação por voz).
const secqOf = () => {
  const q = phrasesOf();
  return q && q.question && q.allow && q.duress ? q : null;
};
const orSay = () => (voiceConfirmOn() && secqOf() ? ' ou diga: sim, confirmo' : ' para confirmar');
const NEED_PHRASE = 'Para confirmar por voz, cadastre a sua pergunta de segurança no Perfil, em Voz do titular. Por enquanto, toque no botão de confirmar.';
let typedNow = false; // pedido digitado na caixa (vale como o toque)
let confirmedNow = false; // confirmou de verdade: "sim, confirmo" do titular + resposta que libera
// A confirmação por voz só existe na hora de confirmar uma compra, contratação ou pagamento.
const confirmMoment = (p) => !!(p && (p.type === 'checkout' || p.type === 'convertLive' || (p.type === 'service' && p.providerId)));
const NEED_ENROLL = 'Para confirmar por voz, cadastre a sua voz nas configurações da Lotus. Por enquanto, toque no botão de confirmar.';
const NO_VOICE_PHONE = 'Neste celular a confirmação é pelo botão. Toque no botão de confirmar.';
const NOT_OWNER = 'Só a voz do titular da conta confirma por voz. Toque no botão de confirmar.';
const ORDINAL = /\b(primeir[oa]|segund[oa]|terceir[oa]|quart[oa]|quint[oa])\b/;
const DAY_CUE = /(feira|\b(na|nesta|nessa|essa|esta|proxima|dia|toda) (segunda|terca|quarta|quinta|sexta)|(segunda|terca|quarta|quinta|sexta) que vem|\b(as|para as|pras) \d|\d ?h\b|\d:\d|manha|tarde|noite)/;
// Nome do botão que coloca a decisão em prática.
const confirmLabel = (p, serviceKey, when) => {
  if (when) return 'Agendar';
  if (p && /visita/.test(p.priceUnit || '')) return 'Confirmar visita';
  return serviceType(serviceKey).group === 'Transporte' ? 'Chamar agora' : 'Contratar';
};
const WHEN = /\b(amanha|hoje|depois de amanha|segunda|terca|quarta|quinta|sexta|sabado|domingo|semana que vem|manha|tarde|noite|\d{1,2} ?h\b|\d{1,2}:\d{2}|(as|para as|pras) \d{1,2})/;
// Tem um dia ou horário de verdade? ("mais tarde" sozinho não conta: aí ela pergunta para quando.)
const hasWhen = (t) => WHEN.test(t.replace(/\b(mais tarde|depois|outro horario|outro dia)\b/g, ''));
const whenOf = (text) =>
  text
    .replace(/^(agend\w*|marca\w*|deixa|pode|sim|ok)\s*/i, '')
    .replace(/^(para|pra)\s+/i, '')
    .replace(/^(na|no|nesta|nessa)\s+/i, '')
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

// Tira do pedido o que a pessoa recusou ("não quero eletricista", "mudei de ideia", "esquece o eletricista").
const REFUSED = /(^|[\s,.;!?])((eu )?(n[ãa]o|nem) ((quero|preciso|vou querer)( mais)?( de)?( (um|uma|o|a|os|as))?|[ée] (um|uma|o|a)) [\wÀ-ú-]+|esquece( (o|a|os|as))? [\wÀ-ú-]+|mudei de ideia|troca(r)? (por|para|pra))(?=$|[\s,.;!?])/gi;
function dropRefused(text) {
  const s = String(text || '');
  if (!REFUSED.test(s)) return s;
  REFUSED.lastIndex = 0;
  return s.replace(REFUSED, ' ').replace(/\s*[,;]\s*(?=[,;]|$)/g, '').replace(/^[\s,.;!?]+|[\s,;]+$/g, '').replace(/\s{2,}/g, ' ').trim();
}

// Interpreta o comando. Devolve { reply, nav?, call?, list?, results?, pending? }.
// Na versão final isso vira uma IA no servidor, com os cadastros reais dos prestadores.
// Frase final da confirmação. A de verdade diz "finalizado(a) com sucesso"; a da resposta de segurança
// diz "confirmado(a) com sucesso, parabéns". Para quem está do lado, as duas soam como sucesso; para o
// cliente, o "parabéns" é o sinal de que a segurança foi acionada.
const DONE = {
  compra: ['Compra finalizada com sucesso.', 'Compra confirmada com sucesso, parabéns.'],
  contrato: ['Contrato finalizado com sucesso.', 'Contrato confirmado com sucesso, parabéns.'],
  operacao: ['Operação finalizada com sucesso.', 'Operação confirmada com sucesso, parabéns.'],
};
const doneLine = (kind, duress = false) => DONE[kind][duress ? 1 : 0];

// Valor do que está sendo confirmado (para a regra da biometria facial acima de R$ 1.000).
function amountOf(p, state) {
  if (!p) return 0;
  if (p.type === 'checkout') return p.total || 0;
  if (p.type === 'convertLive') return state.liveCredits || 0;
  if (p.type === 'service') {
    const prov = (state.providers || []).find((x) => x.id === p.providerId);
    return prov && typeof prov.price === 'number' ? prov.price : 0;
  }
  return 0;
}
const FACE_TEXT = 'Para valores acima de mil reais, falta a biometria facial. Olhe para a câmera.';

// Coação: a tela mostra o mesmo "deu certo" de sempre, mas nada é comprado, chamado ou pago.
function duressReply(state, dispatch, pending) {
  let reply = doneLine('operacao', true);
  let what = 'Confirmação sob coação';
  if (pending.type === 'checkout') {
    dispatch({ type: 'CHECKOUT_FAKE' });
    reply = `${doneLine('compra', true)} ${brl(pending.total)}, com pagamento protegido. Acompanhe em Pedidos.`;
    what = `Compra de ${brl(pending.total)} (simulada, nada foi cobrado)`;
  } else if (pending.type === 'convertLive') {
    reply = `${doneLine('operacao', true)} ${brl(state.liveCredits)} em créditos de live viraram moeda Re@lys no seu saldo.`;
    what = 'Conversão de créditos (simulada)';
  } else if (pending.type === 'service') {
    const call = buildServiceCall(state, pending.address || '', pending.serviceKey, pending.providerId);
    reply = call ? `${doneLine('contrato', true)} ${callReply(call)}` : doneLine('contrato', true);
    what = `Contratação de ${(call && call.serviceLabel) || 'serviço'} (simulada, ninguém foi chamado)`;
  }
  return { reply, duress: { what, at: Date.now() } };
}

// tap = o comando veio de um TOQUE num botão. A Lotus só pesquisa e conversa: agendar, confirmar
// visita, contratar, chamar e finalizar compra só acontecem quando a pessoa aperta o botão.
function interpret(text, state, dispatch, pending, canOpen, depth = 0, tap = false) {
  // Mudou de ideia no meio: "quero um motorista, não quero um eletricista" → vale só o motorista.
  // Regras de conduta: pedidos para trair, brigar, discriminar, mandar mensagem ou mexer em dinheiro sozinha.
  const refused = depth === 0 ? lotusRefusal(text) : null;
  if (refused) return { reply: refused };
  // "Lotus, denúncia, preto" / "Lotus, socorro, preto" / "Lotus, emergência, preto": as 3 palavras juntas
  // (com a resposta de segurança cadastrada) disparam o alerta EM SILÊNCIO, sem abrir tela nenhuma.
  if (depth === 0 && !(pending && pending.secq)) {
    const n1 = norm(stripWake(text));
    const sq = secqOf();
    const m3 = n1.match(/^(denuncia|denunciar|socorro|emergencia)\b[\s,.]*(.*)$/);
    if (sq && m3 && m3[2] && answerKind(m3[2], sq) === 'seguranca')
      return { silent: { kind: m3[1] === 'emergencia' ? 'emergencia' : 'perigo', tipo: m3[1] === 'emergencia' ? 'Emergência (silenciosa)' : m3[1] === 'socorro' ? 'Socorro (silencioso)' : 'Denúncia (silenciosa)' }, reply: 'Certo.' };
  }
  // "Lotus, denúncia" (violência, pedido de socorro) e "Lotus, emergência" (saúde): sem aba, só pela voz.
  if (depth === 0 && !(pending && pending.secq)) {
    const n0 = norm(stripWake(text));
    const denunciaPost = /\b(perfil|post|publicacao|comentario|anuncio|loja|live|golpe na plataforma)\b/.test(n0);
    if (!denunciaPost && /^(lotus )?(denuncia|denunciar|fazer (uma )?denuncia)\b|\b(quero|preciso|vou) (fazer (uma )?denuncia|denunciar)\b|\b(estou|to|tô) sendo (agredida|agredido|ameacada|ameacado)|\bviolencia domestica\b|\bmaria da penha\b|\bme (bateu|agrediu)\b/.test(n0))
      return { openSos: { kind: 'denuncia' }, reply: 'Certo.' };
    if (/^(lotus )?emergencia\b|\bemergencia medica\b|\b(estou|to|tô) passando mal\b|\b(infarto|desmaiou|desmaio|convulsao|nao consigo respirar|falta de ar forte|engasgad[oa])\b/.test(n0))
      return { openSos: { kind: 'emergencia' }, reply: 'Abrindo a emergência. Se for grave, ligue 192.' };
  }
  if (depth === 0) {
    confirmedNow = false;
    const secq = secqOf();
    const n = norm(text);
    // 2ª pergunta (a de segurança): a resposta decide. Para quem está do lado, as duas soam iguais.
    if (pending && pending.secq && !tap) {
      const base = { ...pending };
      delete base.secq;
      delete base.secqMiss;
      const k = answerKind(text, secq);
      // Resposta de segurança: finge que deu certo, nada é cobrado, e avisa a segurança em silêncio.
      // Acima de R$ 1.000: falta a biometria facial (nos dois casos, para parecer igual a quem está do lado).
      if (k && amountOf(base, state) > FACE_ABOVE) return { reply: FACE_TEXT, pending: base, needFace: { duress: k === 'seguranca' } };
      if (k === 'seguranca') return duressReply(state, dispatch, base);
      if (k === 'libera') {
        // Segue como uma confirmação comum (a resposta, como "branco", não vira pesquisa).
        confirmedNow = true;
        pending = base;
        text = 'sim, confirmo';
      } else {
        const miss = (pending.secqMiss || 0) + 1;
        if (miss >= 2 || NO.test(n)) return { reply: 'Tudo bem, não confirmei nada. Se quiser, toque no botão para confirmar.', pending: base, list: base.options };
        return { reply: `Não entendi. ${secq ? secq.question : ''}`.trim(), pending: { ...pending, secqMiss: miss } };
      }
    } else if (pending && pending.secq && tap) {
      pending = { ...pending };
      delete pending.secq;
      delete pending.secqMiss;
    } else if (!tap && confirmMoment(pending) && CONFIRM_VOICE.test(n) && !NO.test(n)) {
      // 1ª pergunta: "sim, confirmo". Por voz, só do titular cadastrado; digitado vale como o toque.
      const why = typedNow
        ? null
        : !voicePrintSupported()
        ? NO_VOICE_PHONE
        : !voiceConfirmOn()
        ? NEED_ENROLL
        : !ownerVoice
        ? NOT_OWNER
        : null;
      if (why) return { reply: why, pending, list: pending.options };
      if (!secq) {
        if (typedNow) confirmedNow = true; // digitado sem pergunta cadastrada: vale como o toque
        else return { reply: NEED_PHRASE, pending, list: pending.options };
      } else {
        // Guarda o que já veio junto ("a segunda, amanhã às 10, sim confirmo") e faz a pergunta de segurança.
        const next = { ...pending, secq: true };
        if (pending.type === 'service') {
          const said = stripWake(text).replace(/[,\s]*(e\s+)?(sim[,\s]*)?(pode\s+)?confirm\w*.*$/i, '');
          const chosen = pending.options ? pickOption(norm(said), pending.options) : null;
          if (chosen) next.providerId = chosen.id;
          const when = pending.when || (LATER.test(norm(said)) && hasWhen(norm(said)) ? whenOf(said) : null);
          if (pending.stage === 'when' && !when) return { reply: 'Para quando eu agendo? Por exemplo: hoje às 18h ou amanhã às 9h.', pending };
          next.when = when;
        }
        return { reply: secq.question, pending: next };
      }
    }
  }
  const changed = dropRefused(text);
  if (changed !== text && changed) return interpret(changed, state, dispatch, pending, canOpen, depth, tap);
  // O celular às vezes separa palavras: "a gronomo", "agro nomo" → agrônomo.
  const t = norm(stripWake(text)).replace(/\ba ?gro ?no ?m([oa]s?)\b/g, 'agronom$1');
  const addrMatch = text.match(/((rua|r\.|avenida|av\.?|alameda|travessa|praca|praça|estrada)\s.+)$/i);
  const address = addrMatch ? addrMatch[1].trim() : '';

  // Só chama depois que a pessoa confirmou (agora ou agendado).
  const startCall = (serviceKey, providerId, when, addr) => {
    if (!tap && !confirmedNow) return askConfirm(serviceKey, providerId, when, addr);
    const call = buildServiceCall(state, addr || address, serviceKey, providerId);
    if (!call) return { reply: 'Não encontrei esse prestador disponível agora.' };
    if (when) {
      call.when = when;
      call.status = `${call.serviceLabel} agendado para ${when}`;
    }
    dispatch({ type: 'REQUEST_RIDE', ride: call });
    return { call, reply: `${doneLine('contrato')} ${callReply(call)}` };
  };
  // Por voz ela NÃO executa: deixa tudo pronto e mostra o botão (Agendar, Confirmar visita,
  // Contratar ou Chamar agora). Só o toque no botão coloca a decisão em prática.
  const askConfirm = (serviceKey, providerId, when, addr) => {
    const p = state.providers.find((x) => x.id === providerId);
    if (!p) return { reply: 'Não encontrei esse prestador disponível agora.' };
    const base = pending && pending.type === 'service' ? pending : { type: 'service', serviceKey, options: [p] };
    const action = confirmLabel(p, serviceKey, when);
    const nome = p.name.split(' ')[0];
    return {
      reply: when
        ? `Tudo pronto para agendar com ${p.name} para ${when}, por ${priceText(p)}. Quer que eu confirme? (Toque em ${action}${orSay()}.)`
        : `Tudo pronto com ${p.name}, por ${priceText(p)}. Quer que eu confirme? (Toque em ${action}${orSay()}.)`,
      pending: { ...base, serviceKey, providerId: p.id, address: addr || base.address || address, when: when || null, stage: 'confirm' },
      list: base.options,
    };
  };
  const firstName = (id) => ((state.providers.find((p) => p.id === id) || {}).name || '').split(' ')[0];

  // Saudações: "bom dia", "boa tarde", "boa noite", "oi", "tudo bem?", "obrigado", "tchau".
  // Sexta, sábado e domingo ela já sugere o que fazer. Com pedido junto, cumprimenta e atende.
  const hi = greetingReply(stripWake(text), state.user && state.user.name, new Date(), tratoOf());
  if (hi) {
    if (!hi.rest) return { reply: hi.reply, pending };
    const sub = interpret(hi.rest, state, dispatch, pending, canOpen, depth, tap);
    return { ...sub, reply: `${hi.reply} ${sub.reply}` };
  }

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
    // "na segunda às 10h" é dia da semana: aí a palavra não escolhe ninguém da lista.
    let chosen = pickOption(ORDINAL.test(t) && DAY_CUE.test(t) ? t.replace(ORDINAL, ' ') : t, opts);
    // "a segunda", "o terceiro", "quero a quarta" = posição na lista. Só é dia da semana com
    // "feira", "na segunda", "próxima quarta"… ou quando ela perguntou "para quando?".
    const isOrdinal = ORDINAL.test(t) && !DAY_CUE.test(t) && pending.stage !== 'when';
    const LATER = { test: (x) => !isOrdinal && LATER_RE.test(x) };
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
    // "Sim, confirma para mim" (inclusive interrompendo a fala dela): a decisão é do cliente,
    // dita com todas as letras. Vale para quem ela estava apresentando (ou o que ele escolheu).
    if (confirmedNow && !NO.test(t)) {
      const said = stripWake(text).replace(/[,\s]*(e\s+)?(sim[,\s]*)?(pode\s+)?confirm\w*.*$/i, '');
      const when = pending.when || (LATER.test(norm(said)) && hasWhen(norm(said)) ? whenOf(said) : null);
      if (pending.stage === 'when' && !when) return { reply: 'Para quando eu agendo? Por exemplo: hoje às 18h ou amanhã às 9h.', pending };
      return startCall(pending.serviceKey, pid, when, pending.address);
    }
    if (pending.stage === 'confirm') {
      if (NO.test(t) && !chosen) return { reply: 'Tudo bem, não confirmei nada. Se precisar, é só pedir.' };
      if ((tap && (YES.test(t) || /confirm|contrat|agend|cham/.test(t))) || confirmedNow) return startCall(pending.serviceKey, pending.providerId, pending.when, pending.address);
      if (!chosen && !LATER.test(t)) {
        const p = state.providers.find((x) => x.id === pending.providerId);
        return { reply: `Quer que eu confirme? (Toque em ${confirmLabel(p, pending.serviceKey, pending.when)}${orSay()}.)`, pending, list: pending.options };
      }
    }
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
    const buy = tap ? YES.test(t) : confirmedNow;
    if (YES.test(t) && !buy) return { reply: `Quer que eu confirme a compra? (Toque em Finalizar compra${orSay()}.)`, pending };
    if (buy) {
      if (pending.total > state.wallet + (state.giftCredits || 0)) return { reply: 'Seu saldo não dá para essa compra. Adicione saldo na carteira e eu finalizo.' };
      dispatch({ type: 'CHECKOUT' });
      return { reply: `${doneLine('compra')} ${brl(pending.total)}, com pagamento protegido. Acompanhe em Pedidos.` };
    }
  }
  // Créditos de live: converter só com confirmação.
  if (pending && pending.type === 'convertLive') {
    const conv = tap ? YES.test(t) || /convert/.test(t) : confirmedNow;
    if ((YES.test(t) || /convert/.test(t)) && !conv) return { reply: `Quer que eu confirme a conversão? (Toque em Converter${orSay()}.)`, pending };
    if (conv) {
      if (state.liveCredits < 10) return { reply: 'Você precisa de pelo menos 10 créditos de live para converter.' };
      dispatch({ type: 'CONVERT_LIVE_CREDITS', amount: state.liveCredits });
      return { reply: `${doneLine('operacao')} ${brl(state.liveCredits)} em créditos de live viraram moeda Re@lys no seu saldo.` };
    }
  }
  if (pending && NO.test(t)) return { reply: 'Tudo bem. Se precisar, é só chamar.' };

  // Contratos e receitas: "Lotus, receita para Maria: dipirona 500 mg...", "fazer um contrato de aluguel".
  // ("receita de bolo" é comida: não abre a receita médica.)
  if (/\b(receitar|prescrever|prescricao|receita (medica|para|pra|pro|ao|a paciente|do paciente|da paciente))\b/.test(t) && !/\breceita de\b/.test(t))
    return { openDocs: { mode: 'receita', draft: stripWake(text) }, reply: 'Abrindo a receita. Confira os dados antes de gerar.' };
  if (/\bcontrato\b/.test(t)) return { openDocs: { mode: 'contrato' }, reply: 'Abrindo um novo contrato.' };

  // Serviço público: "abre o perfil dos bombeiros", "Defesa Civil", "agendar consulta no posto pelo SUS".
  // (Pedir socorro — "liga para os bombeiros", "chama o SAMU" — continua indo direto para a ligação.)
  const asksCall = /\b(liga|ligue|ligar|chama|chame|chamar|socorro|emergencia|urgente|incendio|fogo)\b/.test(t);
  if (/\b(agend|marc)\w* .*\b(consulta|atendimento|vacina)\b|\b(consulta|atendimento) (no|pelo) (sus|posto)\b/.test(t) && /\b(sus|posto|ubs|unidade basica|postinho)\b/.test(t)) {
    const o = PUBLIC_ORGS.find((x) => x.id === 'pub-ubs');
    return { openPublic: { id: o.id, tab: 'agendar' }, reply: `Abrindo os horários do ${o.name.replace(' (demo)', '')}. Escolha um horário e confirme.` };
  }
  const pubId = !asksCall && findPublicOrg(t);
  if (pubId) {
    const o = PUBLIC_ORGS.find((x) => x.id === pubId);
    return { openPublic: { id: pubId }, reply: `Abrindo o perfil: ${o.name.replace(' (demo)', '')}.` };
  }

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
    return { reply: `Não encontrei ninguém chamado ${prof.notFound} no Re@lys. Confira o nome ou procure pela lupa no topo do app.` };
  }

  // Festas: "festa mais próxima", "tem balada aberta agora?" → abertas ou que abrem logo, pela distância.
  // (Aluguel de salão e buffet continuam na busca geral.)
  const party = isPartyQuery(t);
  if (party && hasPartyCue(t)) return partyReply(t);

  // Navegação: "me leva pro Agro", "abre o Food", "volta pros Stories", "voltar".
  const nav = findNavigation(stripWake(text));
  // Nome de um produto ("tênis", "geladeira", "celular") sem pedir para abrir uma página:
  // em vez de só abrir a seção, mostra os produtos que existem no app; tocar leva até a loja.
  const OPEN_VERB = /\b(abre|abrir|abra|abri|me leva|leva|levar|vai|vamos|ir|entra|entrar|volta|voltar|aba|pagina|tela|secao|setor|categoria|area)\b/;
  // Falou só o nome de uma página do app ("gamers", "agro", "reels"): vai direto para ela.
  // (Grupos de produtos do Shop, como "tênis" ou "celular", continuam mostrando os produtos.)
  const said = norm(stripWake(text)).replace(/^(a |o |as |os )?(pagina|aba|tela|secao|area)( de| do| da| dos| das)? /, '').trim();
  const exactPage = nav && !nav.back && nav.go && !nav.go.group && [nav.label, ...((nav.target && nav.target.words) || [])].some((w) => norm(w) === said);
  if (nav && !nav.back && !exactPage && !OPEN_VERB.test(t)) {
    const found = searchAll(state, stripWake(text));
    const words = (found.tokens || []).map((w) => norm(w));
    const hit = (r) => words.some((w) => norm(r.title).includes(w.slice(0, Math.max(4, w.length - 1))));
    const first = (r) => (words.some((w) => norm(r.title).startsWith(w.slice(0, Math.max(4, w.length - 1)))) ? 0 : 1);
    // o próprio produto primeiro ("Celular 128 GB" antes de "técnico de celulares")
    const items = (found.results || []).filter((r) => r.go && hit(r)).sort((a, b) => first(a) - first(b));
    if (items.length) return withCartOffer({ reply: `${contentReply(items, found.label)} Ou diga "abre ${nav.label}" para ver a seção inteira.`, results: items }, state);
  }
  if (nav) {
    if (nav.back || !canOpen || canOpen(nav.go.tab)) return { nav, reply: navReply(nav) };
    return { reply: `${nav.label} é uma área para contas de empresa, com CNPJ. Cadastre uma empresa no login para acessar.` };
  }

  if (party) return partyReply(t);

  // "Alugar um carro", "hotel", "curso"… é busca de conteúdo, não chamada de prestador.
  const contentFirst = CONTENT_WORDS.test(t);
  const serviceKey = contentFirst ? null : detectService(t);
  if (serviceKey && serviceType(serviceKey).mode === 'online') {
    // Psicólogo, advogado, contador…: atendimento por vídeo. Mostra as opções e leva até a aba Online
    // para escolher o horário (nunca agenda sozinha).
    const type = serviceType(serviceKey);
    const list = state.providers.filter((p) => p.service === serviceKey).sort((a, b) => b.rating - a.rating);
    if (!list.length) return { reply: `Ainda não tem ${type.label.toLowerCase()} atendendo online no Re@lys.` };
    const f = list[0];
    let reply = `Encontrei ${list.length === 1 ? 'um' : list.length} ${type.label.toLowerCase()}${list.length === 1 ? '' : 's'} com atendimento online, por chamada de vídeo. ${f.name}, nota ${String(f.rating).replace('.', ',')}, cobra ${priceText(f)}`;
    reply += f.slots && f.slots[0] ? ` e tem horário ${f.slots[0].toLowerCase()}.` : '.';
    if (list[1]) reply += ` Também tem ${list[1].name}, por ${priceText(list[1])}.`;
    reply += ' Os horários estão na aba Online, em Serviços.';
    return { reply, list, nav: { label: 'Serviços Online', go: { tab: 'servicos', seg: 'online' } } };
  }
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
    if (c < 10) return { reply: `Você tem ${brl(c)} em créditos de live. Com 10 ou mais dá para converter em moeda Re@lys.` };
    return { reply: `Você tem ${brl(c)} em créditos de live, dos presentes que ganhou transmitindo. Quer que eu converta em moeda Re@lys agora?`, pending: { type: 'convertLive' } };
  }
  if (/(saldo|dinheiro|carteira)/.test(t)) return { reply: `Seu saldo Re@lys é de ${brl(state.wallet)}.` };

  // Busca geral em todo o conteúdo do app: anúncios, hotéis, imóveis, eventos, cursos,
  // lojas, produtos, promoções, prestadores, lives, pessoas e posts.
  const found = searchAll(state, stripWake(text));
  // Modelo de linguagem (dentro do celular): sem palavra-chave conhecida, entende pelo sentido.
  // "tô a fim de dançar hoje" → festas; "meu chuveiro queimou" → prestadores; "tô sem trabalho" → vagas.
  // Achou um produto com o próprio nome pedido ("violão" → Violão folk): é isso, não precisa adivinhar.
  const directHit = (found.tokens || []).length && found.results.some((r) => (found.tokens || []).every((w) => norm(r.title).includes(norm(w).slice(0, Math.max(4, norm(w).length - 1)))));
  if (!depth && !found.category && !directHit && (!found.results.length || !CONTENT_WORDS.test(t))) {
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
// (1,4 s: dá tempo de respirar no meio da frase sem ela cortar o pedido pela metade.)
const CALL_PAUSE_MS = 1400;
// Depois de ouvir só "Lotus", espera o pedido por até 3 segundos.
const CALL_WAIT_MS = 3000;
// Interromper a Lotus no meio da fala: assim que o microfone percebe a voz da pessoa por cima da
// dela (volume mais alto que o eco dela, ou palavras que não são da fala dela), ela PARA de falar
// na hora e ouve. Ela NÃO volta sozinha para a fala antiga: só se em DUCK_WAIT_MS o microfone não
// pegou palavra nenhuma (foi barulho, não gente). Se a pessoa falou, ela ouve até o fim e atende.
const DUCK_WAIT_MS = 3500;
const VOL_LEARN_MS = 700; // primeiro ela aprende o volume do próprio eco no microfone
const VOL_JUMP = 2.2; // quanto a voz da pessoa precisa passar do eco dela
const VOL_MIN = 5;
const VOL_HITS = 3; // ~3 leituras seguidas (uns 300 ms) de voz alta
const wordsOf = (x) =>
  norm(String(x || ''))
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
// Palavras que a pessoa disse e que não estão na fala da Lotus (só as últimas, as mais novas).
const foreignCount = (said, her) => {
  const mine = new Set(wordsOf(her));
  return wordsOf(said)
    .slice(-6)
    .filter((w) => w.length >= 3 && !mine.has(w)).length;
};

const speechOk = () => {
  try {
    return Platform.OS === 'android' && ExpoSpeechRecognitionModule.isRecognitionAvailable();
  } catch (e) {
    return false;
  }
};

const PHASE_TEXT = {
  idle: 'Toque na flor e fale',
  listening: 'Ouvindo…',
  thinking: 'Processando…',
  speaking: 'Lotus respondendo',
  paused: 'Em pausa',
};

// Assunto da conversa pinta a flor: verde no Agro, vermelha no SOS, dourada no Shop.
const SOS_RE = /(socorro|\bsos\b|samu|emerg|hospita|ambul[aâ]ncia|bombeir|infarto|acidente|pronto.?socorro|ajuda urgente)/;
const AGRO_RE = /(\bagro|pecu[aá]ria|caf[eé](?![a-z])|hortifr|fazenda|trator|\bgado\b|planta[çc]|colheita|safra|semente|lavoura)/;
const SHOP_RE = /(\bshop\b|compr|carrinho|produto|\bloja|promo[çc]|oferta|ingresso|sacola)/;
// Cor das bordas da flor: SEMPRE abre dourada; a cada resposta troca para surpreender, intercalando
// roxo → rosa → vermelho → verde → dourado… Socorro é sempre vermelho.
const MOOD_CYCLE = ['padrao', 'roxo', 'rosa', 'sos', 'agro'];
function moodOf(h, turns) {
  if (!h || !turns) return 'padrao';
  const t = String(h.q || '').toLowerCase();
  const tab = ((h.results || [])[0] || {}).go ? h.results[0].go.tab : null;
  if (SOS_RE.test(t) || tab === 'socorro') return 'sos';
  return MOOD_CYCLE[turns % MOOD_CYCLE.length];
}

// Na rolagem aparecem no máximo 4 conversas; as anteriores à última somem devagar depois de
// 30 segundos (continuam no histórico, no botão do relógio).
const HIST_SHOWN = 4;
const HIST_MS = 30000;
function FadeItem({ show, children }) {
  const o = useRef(new Animated.Value(show ? 1 : 0)).current;
  const [gone, setGone] = useState(!show);
  useEffect(() => {
    if (show) {
      setGone(false);
      Animated.timing(o, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    } else {
      Animated.timing(o, { toValue: 0, duration: 800, useNativeDriver: true }).start(({ finished }) => finished && setGone(true));
    }
  }, [show]);
  if (gone) return null;
  return <Animated.View style={{ opacity: o }}>{children}</Animated.View>;
}

export default function VoiceAssistant({ visible, onClose, initialCommand, wakeLive, handsFree, onNavigate, onVoiceNav, canOpen, onPanic, onDuress, onSilent }) {
  const { state, dispatch } = useStore();
  const [text, setText] = useState('');
  const [history, setHistory] = useState([]);
  // A caixa desce até o fim da tela: a barra de digitar sobe acima dos botões do celular.
  const insets = useSafeAreaInsets();
  // Conversa limpa: na rolagem ficam só as últimas mensagens; o resto fica no histórico (relógio).
  const [showHist, setShowHist] = useState(false);
  // Quantas respostas desde que a caixa abriu (a flor abre sempre dourada).
  const [openBase, setOpenBase] = useState(0);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!visible || history.length < 2) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [visible, history.length]);
  const [phase, setPhase] = useState('idle');
  const [partial, setPartial] = useState('');
  // Ouvido enquanto ela fala: 'wait' ligando, 'on' ouvindo o "Lotus", 'off' não conseguiu ouvir.
  const [ear, setEar] = useState(null);
  const [earHeard, setEarHeard] = useState('');
  const [pending, setPending] = useState(null);
  const level = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(0)).current;
  const session = useRef({ active: false, started: false, retried: false });
  const supported = useMemo(speechOk, []);
  const pendingRef = useRef(null);
  pendingRef.current = pending;
  // Escuta enquanto a Lotus fala, para interromper quando a pessoa chama "Lotus" de novo.
  const bargeIn = useRef({ on: false, heard: false, rest: '', timer: null, tries: 0 });
  // Conversa aberta FALANDO "abrir Lotus": os pedidos falados também são conferidos com a voz do
  // titular. Aberta tocando no botão (ou tocou na flor): qualquer pessoa fala (menos a própria Lotus,
  // que nunca é ouvida: ver stripEcho).
  const byVoice = useRef(false);
  const gated = () => byVoice.current && voiceGateOn();
  // Voz conferida como a do titular. Aberta pela voz, a conversa já foi conferida; pelo botão, a frase
  // de confirmação precisa ter sido medida de verdade (curta demais não conta).
  // "sim, confirmo" é curto: se a voz não pôde ser medida, a pergunta de segurança faz a segunda checagem.
  const ownerOk = (v) => !!(v && v.ok === true);
  // Áudio da escuta atual (para conferir a voz): uri, quando começou e quem espera o arquivo fechar.
  const audioRef = useRef({ uri: null, at: 0, waiters: [] });
  const audioDone = () =>
    new Promise((resolve) => {
      const t = setTimeout(() => resolve(audioRef.current.uri), 900);
      audioRef.current.waiters.push((uri) => (clearTimeout(t), resolve(uri)));
    });
  const reject = () => {
    setPhase(restPhase());
    setPartial('');
    setHistory((h) => [{ at: Date.now(), q: '🎙️', reply: REJECT_TEXT }, ...h]);
    speakSoft('Não reconheci a sua voz.');
  };
  // Cada fala tem um número: quando ela é interrompida, os avisos da fala antiga são ignorados.
  const speechId = useRef(0);
  // O que ela está falando agora (frases e em qual está) e, quando pausada, de onde continuar.
  const talking = useRef(null); // { parts, index, res }
  // Tudo o que ela falou nos últimos 20 segundos: o microfone pode pegar o finalzinho de uma fala
  // anterior, e isso também é a voz dela (não é comando).
  const herLog = useRef([]); // [{ at, text }]
  const herRecent = (now) => {
    const t = Date.now();
    herLog.current = herLog.current.filter((x) => t - x.at < 20000);
    return [...herLog.current.map((x) => x.text), now || ''].join(' ');
  };
  const [paused, setPaused] = useState(null);
  const [faceAsk, setFaceAsk] = useState(null); // biometria facial pendente (acima de R$ 1.000)
  // Prestador cuja prévia do perfil de trabalho está aberta (toque num resultado).
  const [preview, setPreview] = useState(null);
  // Céu da caixa conforme o tempo no local do usuário (GPS): sol, lua, nublado ou chuvoso.
  // Confere toda vez que a Lotus abre; sem GPS/internet, segue a hora do celular.
  const [weather, setWeather] = useState(null);
  useEffect(() => {
    if (!visible) return;
    let on = true;
    getWeather().then((w) => on && w && setWeather(w)).catch(() => {});
    return () => {
      on = false;
    };
  }, [visible]);
  const sky = useMemo(() => skyOf(weather), [visible, weather]);
  // Pétala voando até o carrinho: dispara quando algo entra no carrinho, uma compra
  // é finalizada ou um prestador é chamado com a caixa aberta.
  const [fly, setFly] = useState(0);
  const counts = useRef(null);
  useEffect(() => {
    const now = { cart: state.cart.reduce((n, c) => n + c.qty, 0), rides: state.rides.length, buys: state.nfeSeq || 0 };
    const prev = counts.current;
    counts.current = now;
    if (prev && visible && (now.cart > prev.cart || now.rides > prev.rides || now.buys > prev.buys)) setFly((n) => n + 1);
  }, [state.cart, state.rides, state.nfeSeq, visible]);
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
        // Volume do microfone: é assim que ela percebe a voz da pessoa por cima da dela.
        volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
        ...(voiceGateOn() ? recordingFor('barge') : {}),
        ...onDeviceOptions(),
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
    bargeIn.current = { on: true, heard: false, rest: '', timer: null, tries: 0, ducked: false, base: '', last: '', kept: '', any: false, ema: null, vStart: 0, loud: 0 };
    setEar('wait');
    setEarHeard('');
    startBargeRecognizer();
  };

  const stopBargeIn = () => {
    const b = bargeIn.current;
    clearTimeout(b.timer);
    setEar(null);
    setEarHeard('');
    if (!b.on) return;
    b.on = false;
    try {
      ExpoSpeechRecognitionModule.abort();
    } catch (e) {}
  };

  // A pessoa chamou "Lotus" no meio da fala: ela PAUSA (guarda a frase em que estava e o assunto,
  // como a lista de motoristas) e ouve o novo pedido, que é entendido junto com o que já foi pedido.
  const finishBargeIn = async () => {
    const b = bargeIn.current;
    const rest = b.rest;
    if (rest && pendingRef.current && pendingRef.current.secq) {
      stopBargeIn();
      return run(rest);
    }
    if (rest && (gated() || (voiceConfirmOn() && confirmMoment(pendingRef.current) && CONFIRM_VOICE.test(norm(rest)))) && b.on) {
      // Conversa por voz: confere se quem interrompeu é o titular (só o trecho depois que ela parou).
      if (b.checking) return;
      b.checking = true;
      clearTimeout(b.timer);
      const wait = audioDone();
      b.on = false;
      setEar(null);
      setEarHeard('');
      try {
        ExpoSpeechRecognitionModule.stop();
      } catch (e) {}
      level.setValue(0);
      setPhase('thinking');
      const from = b.cutAt && audioRef.current.at ? Math.max(0, (b.cutAt - audioRef.current.at) / 1000 - 0.6) : 0;
      const v = await verifySpeech(await wait, from);
      if (gated() && v.ok === false) return reject();
      return run(rest, null, null, false, ownerOk(v));
    }
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

  // Ela percebeu a voz da pessoa: para de falar NA HORA (guarda a frase em que estava e o assunto)
  // e fica ouvindo com o mesmo microfone. Sem pedido em poucos segundos, continua de onde parou.
  const duck = () => {
    const b = bargeIn.current;
    if (!b.on || b.ducked || b.heard || !talking.current) return;
    const cur = talking.current;
    b.ducked = true;
    b.cutAt = Date.now();
    b.base = b.last || '';
    b.spoken = herRecent(cur.parts.join(' '));
    pauseTalk();
    setPhase('listening');
    clearTimeout(b.timer);
    b.timer = setTimeout(unduck, DUCK_WAIT_MS);
  };
  // O que a pessoa disse depois que ela parou (somando o que o microfone pegou antes de reiniciar).
  const saidAfterDuck = (full) => {
    const b = bargeIn.current;
    const after = b.base && full.startsWith(b.base) ? full.slice(b.base.length) : full;
    return `${b.kept || ''} ${after}`.trim();
  };
  const unduck = () => {
    const b = bargeIn.current;
    if (!b.on || b.heard || !b.ducked) return;
    // A pessoa falou alguma coisa depois que ela parou: é um pedido novo. Atende o que ouviu
    // (ou abre o microfone de novo) e NUNCA volta para a frase antiga.
    if (b.any) {
      b.rest = stripEcho(saidAfterDuck(b.last || ''), b.spoken || '');
      b.heard = true;
      return finishBargeIn();
    }
    // Silêncio total: foi barulho (buzina, música), não gente. Aí sim ela continua de onde parou.
    stopBargeIn();
    level.setValue(0);
    if (!resume(false)) setPhase(restPhase());
  };

  const onBargeHeard = (results, isFinal) => {
    const b = bargeIn.current;
    const full = results && results[0] ? String(results[0].transcript || '') : '';
    b.last = full;
    // Chave de segurança interrompendo a Lotus: para tudo e dispara em silêncio.
    if (onPanic && (results || []).some((a) => a && isPanic(stripEcho(a.transcript, b.spoken || '')))) {
      speechId.current += 1;
      talking.current = null;
      stopBargeIn();
      stopSpeaking();
      setPartial('');
      setPhase('idle');
      return onPanic();
    }
    const call = hearCall(results);
    const cur = talking.current;
    const herAll = cur ? herRecent(cur.parts.join(' ')) : b.spoken || '';
    const herNow = cur ? cur.parts.slice(Math.max(0, cur.index - 1), cur.index + 2).join(' ') : b.spoken || '';
    // Mostra o que o microfone está pegando enquanto ela fala (sem as palavras dela).
    const said = full ? stripEcho(full.split(/[.!?]/).pop(), herNow) : '';
    if (!b.ducked) setEarHeard(said ? (said.length > 42 ? '…' + said.slice(-42) : said) : '');

    if (!b.heard) {
      if (call) {
        b.heard = true;
        if (!b.cutAt) b.cutAt = Date.now();
        // Guarda o que ela falou: o que vier igual a isso depois do "Lotus" é eco da voz dela.
        if (!b.ducked) b.spoken = herAll;
        pauseTalk(); // não apaga o assunto (pending): "Lotus… tem mais barato?" segue nos mesmos motoristas
        setPhase('listening');
      } else if (b.ducked) {
        // Já parou de falar: o que vier de novo (depois do que já estava no microfone) é a pessoa.
        const fresh = stripEcho(saidAfterDuck(full), b.spoken || '');
        if (wordsOf(fresh).length) {
          // Tem gente falando: ela não volta mais para a fala antiga e espera a pessoa terminar.
          b.any = true;
          clearTimeout(b.timer);
          b.timer = setTimeout(unduck, CALL_PAUSE_MS);
        }
        if (foreignCount(fresh, b.spoken) < 1 || wordsOf(fresh).length < 2) return;
        b.heard = true;
        b.rest = fresh;
      } else {
        // Ainda falando: várias palavras que não são dela = a pessoa está falando por cima.
        if (cur && foreignCount(said, herAll) >= 3) duck();
        return;
      }
    }
    if (call) b.rest = stripEcho(call.rest, b.spoken || '');
    else if (b.ducked) b.rest = stripEcho(saidAfterDuck(full), b.spoken || '') || b.rest;
    setPartial(b.rest || '');
    clearTimeout(b.timer);
    // Disse só "Lotus": continua com o MESMO microfone aberto esperando o pedido (até 3 s de
    // silêncio), em vez de desligar e ligar de novo (nesse vaivém as primeiras palavras se perdiam).
    if (isFinal && b.rest) return finishBargeIn();
    b.timer = setTimeout(finishBargeIn, b.rest ? CALL_PAUSE_MS : CALL_WAIT_MS);
  };

  const stopListening = () => {
    if (!session.current.active) return;
    session.current.active = false;
    try {
      ExpoSpeechRecognitionModule.abort();
    } catch (e) {}
  };

  const close = () => {
    setPreview(null);
    setShowHist(false);
    speechId.current += 1;
    talking.current = null;
    setPaused(null);
    stopBargeIn();
    stopListening();
    stopSpeaking();
    setPhase('idle');
    giveMusicBack();
    onClose();
  };
  // Minimizou o app (ou bloqueou a tela): a Lotus para de ouvir e de falar e a caixa fecha,
  // para não gastar bateria. O comando de voz só funciona com o app aberto na tela.
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!visible) return;
    const sub = AppState.addEventListener('change', (s) => {
      // Janela de permissão (microfone, GPS) por cima do app não é minimizar: a caixa continua aberta.
      if (s !== 'active' && !systemDialogOpen()) closeRef.current();
    });
    return () => sub.remove();
  }, [visible]);

  // Fala a resposta frase por frase, ouvindo "Lotus" ao mesmo tempo para poder ser pausada.
  const say = (res, parts, from) => {
    setPhase('speaking');
    setPaused(null);
    const id = (speechId.current += 1);
    talking.current = { parts, index: from, res };
    herLog.current.push({ at: Date.now(), text: parts.slice(from).join(' ') });
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
      alive: () => id === speechId.current, // interrompida antes de começar: não fala a resposta antiga
      onPart: (i) => {
        if (id === speechId.current && talking.current) talking.current.index = i;
      },
      onDone: () => {
        // Mãos livres: se a Lotus fez uma pergunta ("quer que eu chame?"), já abre o microfone para a resposta.
        // (um respiro depois da fala dela, para o microfone não pegar o finalzinho da própria voz)
        if (ended() && handsFree && res.pending) setTimeout(listen, 400);
        // Terminou e não ficou esperando resposta: a música (Spotify etc.) volta a tocar.
        else if (id === speechId.current && !(handsFree && res.pending)) giveMusicBack(700);
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

  const run = (cmdIn, forced, alts, tap = false, owner = false) => {
    if (!cmdIn || !cmdIn.trim()) return;
    // Chave de segurança (com ou sem o "Lotus", já que a caixa está aberta): dispara em silêncio.
    if (!forced && onPanic && (isPanic(cmdIn) || isPanic('Lotus ' + cmdIn))) {
      speechId.current += 1;
      talking.current = null;
      stopBargeIn();
      stopListening();
      stopSpeaking();
      setPartial('');
      setPhase('idle');
      return onPanic();
    }
    // "quero ver Lotus usadas" → o celular trocou "motos" por "Lotus".
    let cmd = fixMotos(cmdIn);
    // Em pausa: "continua" retoma da frase em que parou; "repete" fala tudo de novo; "espera" segue pausada.
    // Foi interrompida? Então o pedido novo é entendido do zero, sem o raciocínio da fala antiga.
    let topic = pendingRef.current;
    if (!forced && pausedRef.current) {
      const c = bare(norm(stripWake(cmd)));
      setPartial('');
      if (RESUME.test(c) && resume(false)) return;
      if (REPEAT.test(c) && resume(true)) return;
      if (HOLD.test(c)) return setPhase('paused');
      // Pedido novo: a fala antiga é descartada de vez (não volta mais). O assunto anterior só
      // continua se a frase for continuação dele ("o mais barato", "sim", "agenda pra amanhã").
      setPaused(null);
      if (!isFollowUp(c, topic)) {
        topic = null;
        setPending(null);
        pendingRef.current = null;
      }
    }
    setPhase('thinking');
    setPartial('');
    // Digitado na caixa vale como o toque: a pessoa está com o celular na mão.
    ownerVoice = owner === true && voiceConfirmOn();
    typedNow = owner === 'texto';
    let res = forced || interpret(cmd, state, dispatch, topic, canOpen, 0, tap);
    // O celular ouviu errado? Tenta as outras opções que ele ouviu antes de dizer "não encontrei".
    const empty = (r) => !!r.miss;
    if (!forced && empty(res) && alts && alts.length > 1) {
      for (const alt of alts) {
        if (alt === cmd) continue;
        const r = interpret(fixMotos(alt), state, dispatch, topic, canOpen, 0, tap);
        if (!empty(r)) {
          res = r;
          cmd = alt;
          break;
        }
      }
    }
    ownerVoice = false;
    typedNow = false;
    confirmedNow = false;
    // Coação: avisa a segurança em silêncio (a tela segue mostrando que deu tudo certo).
    if (res.duress && onDuress) onDuress(res.duress);
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
    if (res.openPublic) {
      setPending(null);
      setPhase('idle');
      speakSoft(res.reply);
      dispatch({ type: 'OPEN_PUBLIC', ...res.openPublic });
      onClose();
      return;
    }
    // Alerta silencioso (3 palavras): só "Certo.", fecha a caixa e avisa a segurança.
    if (res.silent) {
      setPending(null);
      setPhase('idle');
      speakSoft('Certo.');
      if (onSilent) onSilent(res.silent);
      onClose();
      return;
    }
    if (res.openSos) {
      setPending(null);
      setPhase('idle');
      // Denúncia: discreta, sem fala alta e sem ficar no histórico da Lotus.
      if (res.openSos.kind !== 'denuncia') speakSoft(res.reply);
      dispatch({ type: 'OPEN_SOS_FLOW', kind: res.openSos.kind });
      onClose();
      return;
    }
    if (res.openDocs) {
      setPending(null);
      setPhase('idle');
      speakSoft(res.reply);
      dispatch({ type: 'OPEN_DOCS', ...res.openDocs });
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
      dispatch(openAction(res.open));
      onClose();
      return;
    }
    // Pergunta sobre a lista que ela mostrou: mantém a lista na tela.
    if (!res.list && res.pending && res.pending.type === 'service' && pendingRef.current && pendingRef.current.type === 'service') res = { ...res, list: res.pending.options };
    setPending(res.pending || null);
    if (res.needFace) setFaceAsk(res.needFace);
    setHistory((h) => [{ at: Date.now(), q: cmd, ...res }, ...h]);
    say(res, splitSentences(forSpeech(res.reply)), 0);
  };

  // Microfone pelo diálogo do Google: só se o reconhecimento dentro do app não existir no celular.
  const legacyListen = async () => {
    if (Platform.OS !== 'android') return;
    setPhase('listening');
    try {
      const result = await withSystemDialog(() => IntentLauncher.startActivityAsync('android.speech.action.RECOGNIZE_SPEECH', {
        extra: {
          'android.speech.extra.LANGUAGE_MODEL': 'free_form',
          'android.speech.extra.LANGUAGE': 'pt-BR',
          'android.speech.extra.PROMPT': 'Fale com a Lotus',
          'android.speech.extra.MAX_RESULTS': 3,
        },
      }));
      const said = result && result.extra && result.extra['android.speech.extra.RESULTS'];
      if (said && said.length) return run(bestHeard(said.map((s) => ({ transcript: s }))), null, said);
      setPhase('idle');
    } catch (e) {
      setPhase('idle');
      setHistory((h) => [{ at: Date.now(), q: '🎙️', reply: 'Não consegui abrir o microfone. Digite seu comando abaixo.' }, ...h]);
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
        ...(voiceGateOn() ? recordingFor('cmd') : {}),
        // Sem internet: ouve pelo próprio celular (se ele tiver a voz em português no aparelho).
        ...onDeviceOptions(),
      });
    } catch (e) {
      session.current.active = false;
      setPhase('idle');
    }
  };

  const listen = async () => {
    if (!supported) return legacyListen();
    // Tocar na flor enquanto ela fala: pausa a fala e ouve.
    if (bargeIn.current.on || talking.current) {
      stopBargeIn();
      pauseTalk();
    }
    // Tocar na flor enquanto ouve: para de ouvir.
    if (session.current.active) {
      stopListening();
      setPhase(restPhase());
      return;
    }
    stopSpeaking();
    try {
      const p = await ExpoSpeechRecognitionModule.getPermissionsAsync();
      if (!p || !p.granted) {
        const r = await withSystemDialog(() => ExpoSpeechRecognitionModule.requestPermissionsAsync());
        if (!r || !r.granted) {
          setHistory((h) => [{ at: Date.now(), q: '🎙️', reply: 'O Re@lys precisa da permissão do microfone para ouvir você. Você também pode digitar abaixo.' }, ...h]);
          return;
        }
      }
    } catch (e) {}
    rememberMusic(); // tinha música tocando? no fim a Lotus dá play de novo
    session.current = { active: true, started: false, retried: false };
    setPartial('');
    setPhase('listening');
    startRecognizer();
  };

  useSpeechRecognitionEvent('start', () => {
    if (bargeIn.current.on) {
      bargeIn.current.tries = 0;
      setEar('on');
    }
    if (session.current.active) session.current.started = true;
  });
  useSpeechRecognitionEvent('volumechange', (e) => {
    const b = bargeIn.current;
    // Enquanto ela fala: aprende o volume do eco dela e, se a voz da pessoa passar disso, para na hora.
    if (b.on && !b.heard && !b.ducked && talking.current) {
      const v = e && typeof e.value === 'number' ? e.value : null;
      if (v == null) return;
      const now = Date.now();
      if (!b.vStart) b.vStart = now;
      if (b.ema == null || now - b.vStart < VOL_LEARN_MS) {
        b.ema = b.ema == null ? v : b.ema * 0.8 + v * 0.2;
        return;
      }
      if (v >= VOL_MIN && v > b.ema + VOL_JUMP) {
        if (++b.loud >= VOL_HITS) duck();
      } else {
        b.loud = 0;
        b.ema = b.ema * 0.95 + v * 0.05;
      }
      return;
    }
    if (b.on && (b.ducked || b.heard)) {
      const v = Math.max(0, Math.min(1, ((e && e.value) + 2) / 12));
      Animated.timing(level, { toValue: v, duration: 90, useNativeDriver: true }).start();
      return;
    }
    if (!session.current.active) return;
    const v = Math.max(0, Math.min(1, ((e && e.value) + 2) / 12));
    Animated.timing(level, { toValue: v, duration: 90, useNativeDriver: true }).start();
  });
  useSpeechRecognitionEvent('audiostart', (e) => {
    if (!visible || !(session.current.active || bargeIn.current.on)) return;
    audioRef.current.uri = (e && e.uri) || null;
    audioRef.current.at = Date.now();
  });
  useSpeechRecognitionEvent('audioend', (e) => {
    if (!visible) return;
    if (e && e.uri) audioRef.current.uri = e.uri;
    const w = audioRef.current.waiters;
    audioRef.current.waiters = [];
    w.forEach((fn) => fn(audioRef.current.uri));
  });
  useSpeechRecognitionEvent('result', (e) => {
    if (bargeIn.current.on) return onBargeHeard(e && e.results, e && e.isFinal);
    if (!session.current.active) return;
    const said = e && e.results && e.results[0] ? e.results[0].transcript : '';
    setPartial(said);
    if (e.isFinal) {
      session.current.active = false;
      level.setValue(0);
      const cmd = bestHeard(e.results);
      const alts = (e.results || []).map((a) => a && a.transcript).filter(Boolean);
      // Resposta da pergunta de segurança: atende na hora, sem conferir a voz (sob ameaça a voz muda).
      if (pendingRef.current && pendingRef.current.secq) return run(cmd, null, alts);
      if (/^(lotus\s+)?(denuncia|denunciar|socorro|emergencia)\b/.test(norm(stripWake(cmd)))) return run(cmd, null, alts);
      const confirming = voiceConfirmOn() && confirmMoment(pendingRef.current) && CONFIRM_VOICE.test(norm(cmd));
      if (!gated() && !confirming) return run(cmd, null, alts);
      // Conversa por voz: só atende depois de conferir que é o titular.
      // Aberta pelo botão: qualquer voz conversa, mas o "sim, confirmo" só vale com a voz do titular.
      setPhase('thinking');
      audioDone()
        .then((uri) => verifySpeech(uri))
        .then((v) => (gated() && v.ok === false ? reject() : run(cmd, null, alts, false, ownerOk(v))));
    }
  });
  useSpeechRecognitionEvent('end', () => {
    const b = bargeIn.current;
    if (b.on) {
      if (b.heard) return finishBargeIn();
      // O celular parou de ouvir sozinho, mas ela ainda está falando: volta a ouvir na hora,
      // quantas vezes precisar (só desiste se ele falhar muitas vezes seguidas sem nem começar).
      // Ela já tinha parado e a pessoa estava falando: guarda o que já ouviu antes de reiniciar o microfone.
      if (b.ducked && b.last) b.kept = saidAfterDuck(b.last);
      b.base = '';
      b.last = '';
      if (b.tries++ < 12) setTimeout(() => b.on && !b.heard && startBargeRecognizer(), 80);
      else setEar('off');
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
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        stopBargeIn();
        return setEar('off');
      }
      // Ela já tinha parado e a pessoa estava falando: guarda o que já ouviu antes de reiniciar o microfone.
      if (b.ducked && b.last) b.kept = saidAfterDuck(b.last);
      b.base = '';
      b.last = '';
      if (b.tries++ < 12) setTimeout(() => b.on && !b.heard && startBargeRecognizer(), code === 'no-speech' || code === 'speech-timeout' ? 80 : 250);
      else setEar('off');
      return;
    }
    const s = session.current;
    if (!s.active) return;
    const code = e && e.error;
    // Sem internet: tenta de novo uma vez pelo reconhecimento do próprio celular.
    if (noteVoiceError(code) && !s.netRetried) {
      s.netRetried = true;
      setTimeout(() => s.active && startRecognizer(), 140);
      return;
    }
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
      setHistory((h) => [{ at: Date.now(), q: '🎙️', reply: 'O Re@lys precisa da permissão do microfone para ouvir você.' }, ...h]);
    } else if (isNetError(code)) {
      setPartial('');
      setHistory((h) => [
        {
          at: Date.now(),
          q: '🎙️',
          reply: worksOffline()
            ? 'Estou sem internet e não consegui te ouvir. Tente falar de novo ou digite abaixo.'
            : 'Estou sem internet, e este celular só entende a voz com internet. Digite seu pedido abaixo. Para falar comigo sem internet, baixe o pacote de voz em português para uso offline nas configurações de voz do celular.',
        },
        ...h,
      ]);
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
    setOpenBase(history.length);
    Animated.timing(enter, { toValue: 1, duration: 140, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    byVoice.current = !!(initialCommand && (initialCommand.waiting || initialCommand.text || initialCommand.rejected));
    // Voz de outra pessoa no "abrir Lotus": avisa e fecha sozinha.
    if (initialCommand && initialCommand.rejected) {
      setPhase('idle');
      setPartial('');
      setHistory((h) => [{ at: Date.now(), q: '🎙️', reply: REJECT_TEXT }, ...h]);
      speakSoft('Não reconheci a sua voz.');
      const t = setTimeout(() => closeRef.current(), 3500);
      return () => clearTimeout(t);
    }
    // Aberta pelo "abrir Lotus": o microfone do "abrir Lotus" continua ouvindo o resto do pedido.
    // A caixa só mostra "Ouvindo…" e o que está sendo dito (sem ligar outro microfone por cima).
    if (initialCommand && initialCommand.waiting) {
      setPhase('listening');
      setPartial('');
      return;
    }
    if (initialCommand && initialCommand.text) {
      run(initialCommand.text);
      return;
    }
    // Pequena folga para o "abrir Lotus" liberar o microfone.
    const t = setTimeout(listen, 120);
    return () => clearTimeout(t);
  }, [visible, initialCommand && initialCommand.at]);

  useEffect(() => {
    if (visible && initialCommand && initialCommand.waiting) setPartial(wakeLive || '');
  }, [wakeLive]);

  // Chamar um prestador sempre passa pela Lotus (contato taxado pela plataforma).
  const callProvider = (p) => {
    setPreview(null);
    const call = buildServiceCall(state, '', p.service);
    call.provider = p;
    dispatch({ type: 'REQUEST_RIDE', ride: call });
    run(`Chamar ${p.name}`, { reply: `${doneLine('contrato')} ${callReply(call)}`, call });
  };

  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [36, 0] });
  const last = history[0];
  const mood = moodOf(last, history.length - openBase);
  const win = Dimensions.get('window');

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={() => (preview ? setPreview(null) : close())} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={close} />
        <Animated.View style={[styles.sheet, { backgroundColor: skyBg(sky), paddingBottom: 16 + insets.bottom, opacity: enter, transform: [{ translateY }] }]}>
          <StarField active={visible} sky={sky} south={!weather || weather.south !== false} />
          <View style={styles.grip} />
          <View style={styles.head}>
            <View>
              <Text style={styles.brand}>LOTUS</Text>
              <Text style={styles.brandSub}>assistente do Re@lys</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {weather ? (
                <View style={styles.tempChip} accessibilityLabel={`Temperatura agora: ${weather.temp} graus`}>
                  <Ionicons name={weatherIcon(sky)} size={14} color="#FFFFFF" />
                  <Text style={styles.tempText}>{weather.temp}°</Text>
                </View>
              ) : null}
            {history.length > 1 ? (
              <TouchableOpacity
                onPress={() => setShowHist((v) => !v)}
                style={[styles.histBtn, showHist && styles.histBtnOn]}
                hitSlop={8}
                accessibilityLabel={showHist ? 'Esconder o histórico da Lotus' : 'Ver o histórico da Lotus'}
              >
                <Ionicons name="time-outline" size={17} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={close} style={styles.closeBtn} hitSlop={10} accessibilityLabel="Fechar a Lotus">
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            </View>
          </View>

          <LotusFlower
            phase={phase}
            level={level}
            onPress={() => {
              byVoice.current = false; // tocou com a mão: atende qualquer voz (menos a da Lotus)
              listen();
            }}
            visible={visible}
            mood={mood}
          />
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: phase === 'listening' ? '#60A5FA' : phase === 'idle' ? 'rgba(255,255,255,0.4)' : colors.gold }]} />
            <Text style={styles.status}>{PHASE_TEXT[phase]}</Text>
          </View>
          {phase === 'speaking' && ear && ear !== 'wait' ? (
            <Text style={styles.earHint} numberOfLines={1}>
              {ear === 'on' ? (earHeard ? `🎙 ouvindo: “${earHeard}”` : '🎙 diga “Lotus” para interromper') : 'toque na flor para interromper'}
            </Text>
          ) : null}
          <Text style={[styles.live, !partial && !last && styles.livePlaceholder]} numberOfLines={2}>
            {partial || (last && phase !== 'listening' ? splitSentences(last.reply)[0] : tratoOf() ? openLine(tratoOf(), state.user && state.user.name) : '“Me leva pro Agro”')}
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
                {EXAMPLES.map((e, i) => (
                  <TouchableOpacity key={e} onPress={() => run(e)} style={styles.suggest} hitSlop={8} accessibilityLabel={e}>
                    {i ? <Text style={styles.suggestDot}>·</Text> : null}
                    <Text style={styles.suggestText}>{e.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : null}
            {showHist ? <Text style={styles.histTitle}>Histórico da conversa</Text> : null}
            {history.map((h, i) => (
              <FadeItem key={`${h.at || 0}-${i === 0 ? 'last' : h.q}`} show={showHist || i === 0 || (i < HIST_SHOWN && now - (h.at || 0) < HIST_MS)}>
              <View style={{ marginBottom: 14 }}>
                <View style={styles.userLine}>
                  <Text style={styles.userText}>{h.q}</Text>
                </View>
                <View style={styles.botCard}>
                  <View style={styles.botBar} />
                  <View style={{ flex: 1 }}>
                    {h.falseInfo ? (
                      <View style={[styles.sense, { backgroundColor: 'rgba(217,83,79,0.18)' }]}>
                        <Ionicons name="close-circle" size={11} color={colors.danger} />
                        <Text style={[styles.senseTxt, { color: colors.danger }]}>Informação falsa verificada</Text>
                      </View>
                    ) : h.knowledge ? (
                      <View style={[styles.sense, { backgroundColor: 'rgba(226,182,73,0.16)' }]}>
                        <Ionicons name="library-outline" size={11} color={colors.gold} />
                        <Text style={[styles.senseTxt, { color: colors.gold }]}>Pelo que foi publicado no Re@lys</Text>
                      </View>
                    ) : null}
                    {h.understood ? (
                      <View style={styles.sense}>
                        <Ionicons name="sparkles" size={11} color="#93C5FD" />
                        <Text style={styles.senseTxt}>Entendi pelo sentido: {h.understood}</Text>
                      </View>
                    ) : null}
                    <Text style={styles.botText}>{h.reply}</Text>
                  </View>
                </View>
                {h.list
                  ? h.list.map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        style={styles.item}
                        activeOpacity={0.85}
                        onPress={() => setPreview(p)}
                        accessibilityLabel={`Ver prévia do perfil de ${p.name}`}
                      >
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
                        <TouchableOpacity style={styles.callBtn} onPress={() => callProvider(p)}>
                          <Text style={styles.callText}>Chamar</Text>
                        </TouchableOpacity>
                      </TouchableOpacity>
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
                          } else if (r.pageId) {
                            dispatch({ type: 'OPEN_USER_PAGE', id: r.pageId });
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
                      ? pending.stage === 'confirm'
                        ? [[confirmLabel(state.providers.find((p) => p.id === pending.providerId), pending.serviceKey, pending.when), 'confirmar', true], ['Outro horário', 'agendar para mais tarde'], ['Não', 'Não']]
                        : pending.stage === 'when'
                        ? [['Hoje às 18h', 'hoje às 18h', true], ['Amanhã às 9h', 'amanhã às 9h'], ['Não agendar', 'Não']]
                        : [[`Chamar ${(state.providers.find((p) => p.id === pending.providerId) || { name: '' }).name.split(' ')[0]} agora`, 'Sim', true], ['Agendar para depois', 'agendar para mais tarde'], ['Não', 'Não']]
                      : pending.type === 'cart'
                      ? [[pending.options.length > 1 ? 'Adicionar o 1º' : 'Adicionar ao carrinho', 'Sim', true], ['Não', 'Não']]
                      : pending.type === 'checkout'
                      ? [['Finalizar compra', 'Sim', true], ['Continuar comprando', 'continuar']]
                      : pending.type === 'convertLive'
                      ? [['Converter', 'Sim', true], ['Não', 'Não']]
                      : [['Sim', 'Sim', true], ['Não', 'Não']]
                    ).map(([label, say, main]) => (
                      <TouchableOpacity key={label} style={[styles.chip, main && styles.chipOn]} onPress={() => run(say, null, null, true)}>
                        <Text style={[styles.chipText, main && { color: colors.onPrimary }]}>{label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
              </View>
              </FadeItem>
            ))}
          </ScrollView>

          <View style={styles.inputBar}>
            <Ionicons name="sparkles-outline" size={18} color={colors.gold} style={{ marginLeft: 4 }} />
            <TextInput
              placeholder="Digite ou fale com a Lotus"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={text}
              onChangeText={setText}
              onSubmitEditing={() => run(text, null, null, false, 'texto')}
              returnKeyType="send"
              style={styles.input}
            />
            {text.trim() ? (
              <TouchableOpacity onPress={() => run(text, null, null, false, 'texto')} style={styles.sendBtn} accessibilityLabel="Enviar">
                <Ionicons name="arrow-up" size={20} color={colors.onPrimary} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => ((byVoice.current = false), listen())} style={[styles.sendBtn, phase === 'listening' && { backgroundColor: colors.accent }]} accessibilityLabel="Falar">
                <Ionicons name={phase === 'listening' ? 'stop' : 'mic'} size={19} color={colors.onPrimary} />
              </TouchableOpacity>
            )}
          </View>
          <ProviderPreview provider={preview} onClose={() => setPreview(null)} onCall={callProvider} />
        </Animated.View>
        {/* Sai da flor (no meio da caixa) e voa até a sacola, no topo do app */}
        <FlyingPetal
          trigger={fly}
          from={{ x: win.width / 2, y: win.height * 0.16 + 130 }}
          to={{ x: win.width - 122, y: 48 }}
          color={MOODS[mood].mid}
        />
      </KeyboardAvoidingView>
      <FaceCheck
        visible={!!faceAsk}
        purpose="compra"
        title="Biometria facial: acima de R$ 1.000"
        onDone={(ok) => {
          const fa = faceAsk;
          setFaceAsk(null);
          // Resposta de segurança: o rosto não importa, a tela mostra que deu certo e a segurança é avisada.
          if (fa && fa.duress) return run('sim, confirmo', duressReply(state, dispatch, pendingRef.current || {}));
          if (ok) return run('sim, confirmo', null, null, true);
          run('não', { reply: 'Biometria não confirmada. Não confirmei nada.' });
        }}
        onClose={() => {
          const fa = faceAsk;
          setFaceAsk(null);
          if (fa && fa.duress) run('sim, confirmo', duressReply(state, dispatch, pendingRef.current || {}));
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(6,10,24,0.14)' },
  sheet: {
    // Céu translúcido (cor vem do tempo): dá para ver o app por trás, como um vidro.
    backgroundColor: 'rgba(10,16,40,0.62)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 16,
    height: '84%',
    overflow: 'hidden',
    shadowColor: '#7B6CF6',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 24,
  },
  grip: { alignSelf: 'center', width: 44, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)', marginBottom: 8 },
  // por cima da flor e da luz: o botão fechar sempre recebe o toque
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10, elevation: 10 },
  brand: { fontSize: 18, fontWeight: '800', letterSpacing: 6, color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 6 },
  brandSub: { fontSize: 11, color: 'rgba(253,230,138,0.85)', letterSpacing: 1.2, marginTop: 1 },
  tempChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(10,16,38,0.38)', borderRadius: 14, paddingHorizontal: 9, paddingVertical: 5, marginRight: 8 },
  tempText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', marginLeft: 4 },
  histBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)', marginRight: 8 },
  histBtnOn: { backgroundColor: 'rgba(226,182,73,0.55)' },
  histTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },

  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  earHint: { textAlign: 'center', color: 'rgba(253,230,138,0.85)', fontSize: 11, fontWeight: '600', marginTop: 2, paddingHorizontal: 16 },
  status: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 6 },
  live: { textAlign: 'center', color: '#FFFFFF', fontSize: 15, fontWeight: '600', marginTop: 6, paddingHorizontal: 10, minHeight: 26, textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 6 },
  pauseRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8, paddingHorizontal: 10 },
  pauseHint: { flex: 1, color: 'rgba(255,255,255,0.7)', fontSize: 12, marginRight: 8 },
  pauseBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 7 },
  pauseBtnText: { color: colors.onPrimary, fontWeight: '700', fontSize: 12, marginLeft: 4 },
  livePlaceholder: { color: 'rgba(255,255,255,0.45)', fontStyle: 'italic', fontWeight: '500' },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(253,230,138,0.35)',
    backgroundColor: 'rgba(10,16,38,0.48)',
    marginRight: 8,
    marginBottom: 6,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  // Sugestões embaixo da flor: só o texto em maiúsculas, sem caixa nem borda, rolando para o lado.
  suggest: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  suggestDot: { color: 'rgba(253,230,138,0.55)', fontSize: 16, fontWeight: '900', marginHorizontal: 12 },
  suggestText: { color: '#FDE68A', fontWeight: '800', fontSize: 13, letterSpacing: 1.6, textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 6 },
  chipText: { color: '#FDE68A', fontWeight: '700', fontSize: 13 },

  userLine: { alignSelf: 'flex-end', backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 16, borderBottomRightRadius: 4, maxWidth: '85%', marginBottom: 6 },
  userText: { color: colors.text, fontSize: 14 },
  botCard: { flexDirection: 'row', backgroundColor: 'rgba(10,16,38,0.58)', borderRadius: 16, padding: 12, marginBottom: 6 },
  botBar: { width: 3, borderRadius: 2, backgroundColor: colors.gold, marginRight: 10 },
  botText: { color: '#FFFFFF', fontSize: 14, lineHeight: 20 },
  sense: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: 'rgba(147,197,253,0.14)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 6 },
  senseTxt: { color: '#93C5FD', fontSize: 11, fontWeight: '700', marginLeft: 4 },

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
    backgroundColor: 'rgba(10,16,38,0.58)',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(253,230,138,0.3)',
    paddingLeft: 10,
    paddingRight: 5,
    paddingVertical: 5,
    marginTop: 8,
  },
  input: { flex: 1, color: '#FFFFFF', fontSize: 15, paddingHorizontal: 8, paddingVertical: 6 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});

// Para testes no computador.
export const _interpret = interpret;
export const _setOwnerVoice = (v) => (ownerVoice = !!v);
export const _setTyped = (v) => (typedNow = !!v);
export const _afterInterrupt = { isFollowUp, bare, RESUME, REPEAT, norm };
