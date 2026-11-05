import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, Platform, KeyboardAvoidingView,
  Animated, Easing, TextInput, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as IntentLauncher from 'expo-intent-launcher';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useStore, buildServiceCall, callReply, searchReply, detectService, serviceType, priceText, myProducts, cartTotal } from '../store';
import { colors, brl } from '../theme';
import { ServiceCallCard } from './cliente/ServicesScreen';
import { Photo } from '../components/ui';
import { searchAll, contentReply, CONTENT_WORDS } from '../search';
import { stripWake } from '../wakeMatch';
import { speakSoft, stopSpeaking, prepareVoice } from '../voice';
import { emergencyNumbers } from '../extraData';
import { confirmCall } from '../phone';
import { findNavigation, navReply } from '../voiceNav';

// Sugestões que aparecem antes da primeira fala.
const EXAMPLES = [
  'Me leva pro Agro',
  'Abre o Food',
  'Volta pros Stories',
  'Tem eletricista perto de mim?',
  'Preciso de um carro na Rua Augusta, 1200',
  'Tem hotel em Campos do Jordão?',
  'Abre minha carteira',
  'Quanto eu vendi hoje?',
];

// Palavras que ajudam o reconhecimento de voz a acertar os nomes do app.
const HINTS = ['Lotus', 'Realys', 'Stories', 'Food', 'Date', 'Shop', 'Agro', 'Lives', 'Tecnologia', 'Pedidos', 'Perfil', 'Serviços'];

const norm = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

const YES = /^(sim|pode|pode sim|quero|chama|chame|manda|ok|beleza|isso|confirmo|agenda|agendar)\b/;
const CALL_NOW = /\b(chama|chame|manda|mande|agenda|agende|agendar|solicita)\b/;

// Interpreta o comando. Devolve { reply, nav?, call?, list?, results?, pending? }.
// Na versão final isso vira uma IA no servidor, com os cadastros reais dos prestadores.
function interpret(text, state, dispatch, pending, canOpen) {
  const t = norm(stripWake(text));
  const addrMatch = text.match(/((rua|r\.|avenida|av\.?|alameda|travessa|praca|praça|estrada)\s.+)$/i);
  const address = addrMatch ? addrMatch[1].trim() : '';

  const startCall = (serviceKey, providerId) => {
    const call = buildServiceCall(state, address, serviceKey);
    if (!call) return { reply: 'Não encontrei esse prestador disponível agora.' };
    if (providerId) call.provider = state.providers.find((p) => p.id === providerId) || call.provider;
    dispatch({ type: 'REQUEST_RIDE', ride: call });
    return { call, reply: callReply(call) };
  };

  // Resposta "sim" depois de uma pesquisa: chama o prestador sugerido.
  if (pending && YES.test(t) && !detectService(t)) return startCall(pending.serviceKey, pending.providerId);
  if (pending && /^(nao|não|deixa|cancela)/.test(t)) return { reply: 'Tudo bem. Se precisar, é só chamar.' };

  // Emergência: "Lotus, liga para o SAMU", "chama os bombeiros", "socorro!".
  const EM = { samu: /\b(samu|ambulancia)\b/, bombeiros: /\bbombeiros?\b/, policia: /\bpolicia\b(?! rodoviaria)/, prf: /\bpolicia rodoviaria\b/, defesa: /\bdefesa civil\b/, cvv: /\bcvv\b/ };
  const emKey = Object.keys(EM).find((k) => EM[k].test(t));
  const wantsCall = /\b(liga|ligue|ligar|chama|chame|chamar|socorro|emergencia|urgente)\b/.test(t);
  if ((emKey && wantsCall) || /^socorro\b/.test(t)) {
    const e = emergencyNumbers.find((x) => x.key === (emKey || 'samu'));
    setTimeout(() => confirmCall(e.label, e.number), 300);
    return { reply: `Vou ligar para ${e.label}, ${e.number.split('').join(' ')}. Confirme na tela.` };
  }

  // Navegação: "me leva pro Agro", "abre o Food", "volta pros Stories", "voltar".
  const nav = findNavigation(stripWake(text));
  if (nav) {
    if (nav.back || !canOpen || canOpen(nav.go.tab)) return { nav, reply: navReply(nav) };
    return { reply: `${nav.label} é uma área para contas de empresa, com CNPJ. Cadastre uma empresa no login para acessar.` };
  }

  // "Alugar um carro", "hotel", "curso"… é busca de conteúdo, não chamada de prestador.
  const contentFirst = CONTENT_WORDS.test(t);
  const serviceKey = contentFirst ? null : detectService(t);
  if (serviceKey) {
    const transport = serviceType(serviceKey).group === 'Transporte';
    // Transporte com endereço, ou pedido direto ("chama um eletricista"): já agenda.
    if ((transport && address) || CALL_NOW.test(t)) return startCall(serviceKey);
    // Senão é uma pesquisa: quem está perto, o que faz e quanto cobra.
    const { list, reply } = searchReply(state, serviceKey);
    return { reply, list, pending: list.length ? { serviceKey, providerId: list[0].id } : null };
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
  if (/(saldo|dinheiro|carteira)/.test(t)) return { reply: `Seu saldo Realys é de ${brl(state.wallet)}.` };
  if (/(carrinho)/.test(t)) return { reply: `Seu carrinho tem ${state.cart.length} itens, total de ${brl(cartTotal(state))}.` };

  // Busca geral em todo o conteúdo do app: anúncios, hotéis, imóveis, eventos, cursos,
  // lojas, produtos, promoções, prestadores, lives, pessoas e posts.
  const { results, tokens, label } = searchAll(state, stripWake(text));
  if (results.length) return { reply: contentReply(results, label), results };
  if (tokens.length) return { reply: contentReply([], label) };
  return {
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
          <Ionicons name={phase === 'listening' ? 'mic' : phase === 'speaking' ? 'volume-high' : phase === 'thinking' ? 'sparkles' : 'mic-outline'} size={30} color={accent} />
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

  const stopListening = () => {
    if (!session.current.active) return;
    session.current.active = false;
    try {
      ExpoSpeechRecognitionModule.abort();
    } catch (e) {}
  };

  const close = () => {
    stopListening();
    stopSpeaking();
    setPhase('idle');
    onClose();
  };

  const run = (cmd, forced) => {
    if (!cmd || !cmd.trim()) return;
    setPhase('thinking');
    setPartial('');
    const res = forced || interpret(cmd, state, dispatch, pendingRef.current, canOpen);
    setText('');
    // Navegação: fala "Abrindo Agro", fecha a caixa e abre a página na hora.
    if (res.nav && onVoiceNav) {
      setPending(null);
      setPhase('idle');
      speakSoft(res.reply);
      onVoiceNav(res.nav);
      return;
    }
    setPending(res.pending || null);
    setHistory((h) => [{ q: cmd, ...res }, ...h]);
    setPhase('speaking');
    speakSoft(res.reply, {
      onDone: () => {
        setPhase('idle');
        // Mãos livres: se a Lotus fez uma pergunta ("quer que eu chame?"), já abre o microfone para a resposta.
        if (handsFree && res.pending) listen();
      },
      onStopped: () => setPhase('idle'),
      onError: () => setPhase('idle'),
    });
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
      if (said && said.length) return run(bestHeard(said.map((s) => ({ transcript: s }))));
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
    // Tocar no orbe enquanto ouve: para de ouvir.
    if (session.current.active) {
      stopListening();
      setPhase('idle');
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
    if (session.current.active) session.current.started = true;
  });
  useSpeechRecognitionEvent('volumechange', (e) => {
    if (!session.current.active) return;
    const v = Math.max(0, Math.min(1, ((e && e.value) + 2) / 12));
    Animated.timing(level, { toValue: v, duration: 90, useNativeDriver: true }).start();
  });
  useSpeechRecognitionEvent('result', (e) => {
    if (!session.current.active) return;
    const said = e && e.results && e.results[0] ? e.results[0].transcript : '';
    setPartial(said);
    if (e.isFinal) {
      session.current.active = false;
      level.setValue(0);
      run(bestHeard(e.results));
    }
  });
  useSpeechRecognitionEvent('end', () => {
    if (!session.current.active || !session.current.started) return;
    session.current.active = false;
    level.setValue(0);
    setPhase('idle');
  });
  useSpeechRecognitionEvent('error', (e) => {
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
    setPhase('idle');
    if (code === 'not-allowed' || code === 'service-not-allowed') {
      setHistory((h) => [{ q: '🎙️', reply: 'O Realys precisa da permissão do microfone para ouvir você.' }, ...h]);
    } else if (code === 'no-speech' || code === 'speech-timeout') {
      setPartial('');
    }
  });

  // Abriu a caixa: entra rápido e já começa a ouvir (ou executa o pedido do "abrir Lotus").
  useEffect(() => {
    if (!visible) {
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
                  <Text style={styles.botText}>{h.reply}</Text>
                </View>
                {h.list
                  ? h.list.map((p) => (
                      <View key={p.id} style={styles.item}>
                        <Photo uri={p.photo} style={styles.pPhoto} fallback="🧑" />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.itemTitle}>
                            {p.name} · <Text style={{ color: colors.primary, fontWeight: '800' }}>★ {p.rating}</Text>
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
                        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                      </TouchableOpacity>
                    ))
                  : null}
                {h.call ? <ServiceCallCard call={h.call} /> : null}
                {i === 0 && h.pending ? (
                  <View style={{ flexDirection: 'row', marginTop: 4 }}>
                    <TouchableOpacity style={[styles.chip, styles.chipOn]} onPress={() => run('Sim')}>
                      <Text style={[styles.chipText, { color: colors.onPrimary }]}>Sim, pode chamar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.chip} onPress={() => run('Não')}>
                      <Text style={styles.chipText}>Não</Text>
                    </TouchableOpacity>
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
  brand: { fontSize: 18, fontWeight: '900', letterSpacing: 6, color: colors.text },
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
  botCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 6 },
  botBar: { width: 3, borderRadius: 2, backgroundColor: colors.gold, marginRight: 10 },
  botText: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 20 },

  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: colors.border },
  itemTag: { color: colors.accent, fontSize: 10, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  itemTitle: { color: colors.text, fontWeight: '700' },
  itemSub: { color: colors.muted, fontSize: 12 },
  itemPrice: { color: colors.primary, fontWeight: '800', fontSize: 13 },
  pPhoto: { width: 44, height: 44, borderRadius: 22 },
  rPhoto: { width: 54, height: 54, borderRadius: 14 },
  callBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  callText: { color: colors.onPrimary, fontWeight: '800', fontSize: 12 },

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
