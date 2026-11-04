import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import * as Speech from 'expo-speech';
import * as IntentLauncher from 'expo-intent-launcher';
import { useStore, buildServiceCall, callReply, searchReply, detectService, serviceType, priceText, myProducts, cartTotal } from '../store';
import { colors, brl } from '../theme';
import { Input, Button, Row } from '../components/ui';
import { ServiceCallCard } from './cliente/ServicesScreen';
import { Photo } from '../components/ui';
import { searchAll, contentReply, CONTENT_WORDS } from '../search';
import { stripWake } from '../wakeMatch';
import { emergencyNumbers } from '../extraData';
import { confirmCall } from '../phone';

const EXAMPLES = [
  'Realys, preciso de um eletricista. Tem algum perto de mim?',
  'Realys, preciso de um encanador',
  'Realys, meu carro quebrou, preciso de um mecânico',
  'Realys, preciso de um carro na Rua Augusta, 1200',
  'Realys, tem motoboy perto de mim?',
  'Realys, quanto eu vendi hoje?',
  'Realys, quais produtos estão acabando?',
  'Realys, tem hotel em Campos do Jordão?',
  'Realys, quero alugar um apartamento',
  'Realys, tem curso online?',
];

const norm = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const YES = /^(sim|pode|pode sim|quero|chama|chame|manda|ok|beleza|isso|confirmo|agenda|agendar)\b/;
const CALL_NOW = /\b(chama|chame|manda|mande|agenda|agende|agendar|solicita)\b/;

// Interpreta o comando. Devolve { reply, call?, list?, results?, pending? }.
// Na versão final isso vira uma IA no servidor, com os cadastros reais dos prestadores.
function interpret(text, state, dispatch, pending) {
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

  // Emergência: "Realys, liga para o SAMU", "chama os bombeiros", "socorro!".
  const EM = { samu: /\b(samu|ambulancia)\b/, bombeiros: /\bbombeiros?\b/, policia: /\bpolicia\b(?! rodoviaria)/, prf: /\bpolicia rodoviaria\b/, defesa: /\bdefesa civil\b/, cvv: /\bcvv\b/ };
  const emKey = Object.keys(EM).find((k) => EM[k].test(t));
  const wantsCall = /\b(liga|ligue|ligar|chama|chame|chamar|socorro|emergencia|urgente)\b/.test(t);
  if ((emKey && wantsCall) || /^socorro\b/.test(t)) {
    const e = emergencyNumbers.find((x) => x.key === (emKey || 'samu'));
    setTimeout(() => confirmCall(e.label, e.number), 300);
    return { reply: `Vou ligar para ${e.label}, ${e.number.split('').join(' ')}. Confirme na tela.` };
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
      'Desculpe, ainda não entendi. Você pode procurar qualquer coisa do Realys, como hotéis, imóveis, lojas, produtos, cursos ou eventos, chamar um prestador, ou ver pedidos, vendas e estoque.',
  };
}

export default function VoiceAssistant({ visible, onClose, initialCommand, handsFree, onNavigate }) {
  const { state, dispatch } = useStore();
  const [text, setText] = useState('');
  const [history, setHistory] = useState([]);
  const [listening, setListening] = useState(false);
  const [pending, setPending] = useState(null);

  const run = (cmd, forced) => {
    if (!cmd.trim()) return;
    const res = forced || interpret(cmd, state, dispatch, pending);
    setPending(res.pending || null);
    setHistory((h) => [{ q: cmd, ...res }, ...h]);
    setText('');
    Speech.stop();
    Speech.speak(res.reply, {
      language: 'pt-BR',
      rate: 1.0,
      // Mãos livres: se a Realys fez uma pergunta ("quer que eu chame?"), já abre o microfone para a resposta.
      onDone: () => handsFree && res.pending && listen(),
    });
  };

  // Aberto pela palavra "Realys": executa o pedido falado ou abre o microfone.
  useEffect(() => {
    if (!visible || !initialCommand) return;
    if (initialCommand.text) run('Realys, ' + initialCommand.text);
    else listen();
  }, [visible, initialCommand && initialCommand.at]);

  // Usa o reconhecimento de voz nativo do Android (Google).
  const listen = async () => {
    if (Platform.OS !== 'android') return;
    setListening(true);
    try {
      const result = await IntentLauncher.startActivityAsync('android.speech.action.RECOGNIZE_SPEECH', {
        extra: {
          'android.speech.extra.LANGUAGE_MODEL': 'free_form',
          'android.speech.extra.LANGUAGE': 'pt-BR',
          'android.speech.extra.PROMPT': 'Fale com o Realys',
        },
      });
      const said = result && result.extra && result.extra['android.speech.extra.RESULTS'];
      if (said && said.length) run(said[0]);
    } catch (e) {
      setHistory((h) => [{ q: '🎙️', reply: 'Não consegui abrir o microfone. Digite seu comando abaixo.' }, ...h]);
    } finally {
      setListening(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.head}>
            <Text style={styles.title}>🎙️ Assistente Realys</Text>
            <TouchableOpacity onPress={() => { Speech.stop(); onClose(); }}>
              <Text style={{ fontSize: 22, color: colors.muted }}>✕</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={listen} activeOpacity={0.85} style={[styles.bigMic, listening && { backgroundColor: colors.accent }]}>
            <Text style={{ color: colors.text, fontSize: 40 }}>🎙️</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>{listening ? 'Ouvindo…' : 'Toque e fale: "Realys, tem hotel perto?"'}</Text>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Input
              placeholder="Ou digite o comando"
              value={text}
              onChangeText={setText}
              onSubmitEditing={() => run(text)}
              returnKeyType="search"
              style={{ flex: 1, marginBottom: 0 }}
            />
            <Button small title="Enviar" onPress={() => run(text)} style={{ marginLeft: 8 }} />
          </View>

          <ScrollView style={{ marginTop: 12 }} keyboardShouldPersistTaps="handled">
            {!history.length ? (
              <View>
                <Text style={{ fontWeight: '700', marginBottom: 8, color: colors.text }}>Experimente:</Text>
                {EXAMPLES.map((e) => (
                  <TouchableOpacity key={e} onPress={() => run(e)} style={styles.example}>
                    <Text style={{ color: colors.primaryDark }}>“{e}”</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
            {history.map((h, i) => (
              <View key={i} style={{ marginBottom: 12 }}>
                <View style={styles.userBubble}>
                  <Text style={{ color: colors.onPrimary }}>{h.q}</Text>
                </View>
                <View style={styles.botBubble}>
                  <Text style={{ color: colors.text }}>🔊 {h.reply}</Text>
                </View>
                {h.list
                  ? h.list.map((p) => (
                      <View key={p.id} style={styles.provider}>
                        <Photo uri={p.photo} style={styles.pPhoto} fallback="🧑" />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={{ color: colors.text, fontWeight: '700' }}>
                            {p.name} · <Text style={{ color: colors.accent, fontWeight: '800' }}>★ {p.rating}</Text>
                          </Text>
                          <Text style={{ color: colors.muted, fontSize: 12 }}>
                            {p.distanceKm.toFixed(1)} km · {p.functions.join(', ')}
                          </Text>
                          <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 13 }}>{priceText(p)}</Text>
                        </View>
                        <Button
                          small
                          title="Chamar"
                          onPress={() => {
                            const call = buildServiceCall(state, '', p.service);
                            call.provider = p;
                            dispatch({ type: 'REQUEST_RIDE', ride: call });
                            const reply = callReply(call);
                            run(`Chamar ${p.name}`, { reply, call });
                          }}
                        />
                      </View>
                    ))
                  : null}
                {h.results
                  ? h.results.map((r) => (
                      <TouchableOpacity
                        key={r.id}
                        style={styles.provider}
                        activeOpacity={0.85}
                        onPress={() => {
                          Speech.stop();
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
                          <Text style={{ color: colors.accent, fontSize: 11, fontWeight: '800' }}>
                            {r.section}{r.sponsored ? ' · Patrocinado' : ''}
                          </Text>
                          <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={2}>{r.title}</Text>
                          {r.subtitle ? <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={2}>{r.subtitle}</Text> : null}
                          {r.price || r.priceValue != null ? (
                            <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 13 }}>
                              {r.price || `${brl(r.priceValue)}${r.priceUnit ? ' por ' + r.priceUnit : ''}`}
                            </Text>
                          ) : null}
                        </View>
                        <Text style={{ color: colors.muted, fontSize: 20, marginLeft: 6 }}>›</Text>
                      </TouchableOpacity>
                    ))
                  : null}
                {h.call ? <ServiceCallCard call={h.call} /> : null}
                {i === 0 && h.pending ? (
                  <Row style={{ marginTop: 4 }}>
                    <Button small title="Sim, pode chamar" onPress={() => run('Sim')} style={{ marginRight: 8 }} />
                    <Button small variant="outline" title="Não" onPress={() => run('Não')} />
                  </Row>
                ) : null}
              </View>
            ))}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, height: '86%' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  bigMic: {
    alignSelf: 'center',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  hint: { textAlign: 'center', color: colors.muted, marginBottom: 12 },
  example: { backgroundColor: colors.primaryLight, padding: 11, borderRadius: 12, marginBottom: 8 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.primary, padding: 10, borderRadius: 14, maxWidth: '85%', marginBottom: 6 },
  provider: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: colors.border },
  pPhoto: { width: 44, height: 44, borderRadius: 22 },
  rPhoto: { width: 56, height: 56, borderRadius: 12 },
  botBubble: { alignSelf: 'flex-start', backgroundColor: colors.card, padding: 10, borderRadius: 14, maxWidth: '90%', borderWidth: 1, borderColor: colors.border, marginBottom: 6 },
});
