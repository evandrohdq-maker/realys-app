// Ajuda e suporte (Perfil › Ajuda e suporte).
// Início: a pessoa escreve a dúvida e a Lotus responde na hora; abaixo, as perguntas frequentes e os
// chamados dela. Se a Lotus não resolver, um toque abre o chamado para a equipe.
import React, { useRef, useState } from 'react';
import { KeyboardLift } from '../keyboard';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { colors, soft } from '../theme';
import { useSupport, SUPPORT_TOPICS, topicOf, STATUS_LABEL, FAQ, lotusAnswer, guessTopic, openTicket, userReply, closeTicket, rateTicket, markRead, ticketsOf } from '../support';

const day = (t) => new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

// Quem ainda não entrou na conta (tela de entrada) também fala com o suporte, só por mensagem:
// os chamados ficam ligados a este aparelho.
const GUEST = { id: 'visitante', name: 'Visitante (sem entrar na conta)' };

export default function SupportCenter({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const { state } = useStore();
  useSupport();
  const user = state.user || GUEST;
  const guest = !state.user;
  const mine = ticketsOf(user);
  const [q, setQ] = useState('');
  const [asked, setAsked] = useState(null); // { text, faq } depois que a Lotus respondeu
  const [topic, setTopic] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);
  const [ticketId, setTicketId] = useState(null);
  const ticket = mine.find((t) => t.id === ticketId) || null;

  const ask = (text) => {
    const t = String(typeof text === 'string' ? text : q).trim();
    if (!t) return;
    const r = lotusAnswer(t, state.user ? state : null);
    setQ(t);
    setAsked({ text: t, faq: r && r.a ? r : null, suggestions: (r && r.suggestions) || [] });
    setTopic((r && r.topic) || guessTopic(t));
  };
  const reset = () => {
    setAsked(null);
    setQ('');
    setTopic(null);
  };
  const create = () => {
    const tk = openTicket({ user, topic: topic || 'outro', text: asked.text, lotusTried: !!asked.faq });
    reset();
    setTicketId(tk.id);
  };
  const close = () => {
    reset();
    setTicketId(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={() => (ticket ? setTicketId(null) : close())}>
      <KeyboardLift style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={st.head}>
          <TouchableOpacity onPress={() => (ticket ? setTicketId(null) : close())} style={st.back} accessibilityLabel="Voltar">
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={st.title} numberOfLines={1}>{ticket ? `Chamado nº ${ticket.n}` : 'Ajuda e suporte'}</Text>
        </View>

        {ticket ? (
          <TicketThread ticket={ticket} bottom={insets.bottom} />
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 + insets.bottom }} keyboardShouldPersistTaps="handled">
            {/* Dúvida: a Lotus responde primeiro */}
            <View style={st.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="flower-outline" size={19} color={colors.primary} />
                <Text style={{ color: colors.text, fontWeight: '800', marginLeft: 8 }}>Como a gente pode ajudar?</Text>
              </View>
              {!asked ? (
                <>
                  <TextInput value={q} onChangeText={setQ} placeholder={guest ? 'Diga o seu nome, o seu usuário e o que aconteceu' : 'Escreva a sua dúvida ou o que aconteceu'} placeholderTextColor={colors.muted} multiline maxLength={400} style={st.input} />
                  <TouchableOpacity style={[st.btn, !q.trim() && { opacity: 0.5 }]} onPress={() => ask()} disabled={!q.trim()} accessibilityLabel="Enviar dúvida">
                    <Text numberOfLines={1} style={st.btnText}>Enviar</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={[st.bubble, st.mine]}>
                    <Text style={{ color: colors.text }}>{asked.text}</Text>
                  </View>
                  <View style={[st.bubble, st.theirs]}>
                    <Text style={st.who}>Lotus</Text>
                    <Text style={{ color: colors.text, lineHeight: 20 }}>{asked.faq ? asked.faq.a : 'Essa eu prefiro passar para a equipe, para você ter a resposta certa. É só confirmar o assunto abaixo.'}</Text>
                  </View>
                  {/* Perguntas parecidas: tocar pergunta de novo para a Lotus. */}
                  {asked.suggestions && asked.suggestions.length ? (
                    <>
                      <Text style={st.label}>{asked.faq ? 'Também pode te ajudar:' : 'Não tenho certeza do que você quis dizer. Seria uma destas?'}</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {asked.suggestions.map((sg) => (
                          <TouchableOpacity key={sg} style={st.chip} onPress={() => ask(sg)} accessibilityLabel={sg}>
                            <Text numberOfLines={1} style={st.chipText}>{sg}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  ) : null}
                  {asked.faq ? (
                    <TouchableOpacity style={st.btnGhost} onPress={reset} accessibilityLabel="Resolveu">
                      <Ionicons name="checkmark-circle-outline" size={17} color={colors.text} />
                      <Text numberOfLines={1} style={st.btnGhostText}>Resolveu, obrigado</Text>
                    </TouchableOpacity>
                  ) : null}
                  <Text style={st.label}>{asked.faq ? 'Não resolveu? Fale com a equipe. Assunto:' : 'Assunto do chamado:'}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {SUPPORT_TOPICS.map((t) => (
                      <TouchableOpacity key={t.key} style={[st.chip, topic === t.key && st.chipOn]} onPress={() => setTopic(t.key)}>
                        <Text numberOfLines={1} style={[st.chipText, topic === t.key && { color: '#fff' }]}>{t.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity style={st.btn} onPress={create} accessibilityLabel="Abrir chamado com a equipe">
                    <Ionicons name="headset-outline" size={17} color="#fff" />
                    <Text numberOfLines={1} style={[st.btnText, { marginLeft: 6 }]}>Falar com a equipe</Text>
                  </TouchableOpacity>
                  {topicOf(topic).urgent ? <Text style={st.note}>Este assunto entra com prioridade na fila.</Text> : null}
                </>
              )}
            </View>

            {/* Meus chamados */}
            {mine.length ? <Text style={st.h}>Meus chamados</Text> : null}
            {mine.map((t) => (
              <TouchableOpacity key={t.id} style={st.row} onPress={() => { setTicketId(t.id); markRead(t.id); }} accessibilityLabel={`Chamado ${t.n}, ${STATUS_LABEL[t.status]}`}>
                <Ionicons name={topicOf(t.topic).icon} size={20} color={colors.menu} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>nº {t.n} · {topicOf(t.topic).label}</Text>
                  <Text style={{ color: t.status === 'respondido' ? colors.primary : colors.muted, fontSize: 12.5, fontWeight: t.status === 'respondido' ? '700' : '400' }} numberOfLines={1}>{STATUS_LABEL[t.status]} · {day(t.updatedAt)}</Text>
                </View>
                {t.unreadUser ? (
                  <View style={st.badge}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{t.unreadUser}</Text>
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={17} color={colors.muted} />
                )}
              </TouchableOpacity>
            ))}

            {/* Perguntas frequentes */}
            <Text style={st.h}>Perguntas frequentes</Text>
            {FAQ.map((f) => (
              <TouchableOpacity key={f.id} style={st.faq} onPress={() => setOpenFaq(openFaq === f.id ? null : f.id)} activeOpacity={0.8}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>{f.q}</Text>
                  <Ionicons name={openFaq === f.id ? 'chevron-up' : 'chevron-down'} size={17} color={colors.muted} />
                </View>
                {openFaq === f.id ? <Text style={{ color: colors.muted, marginTop: 8, lineHeight: 20 }}>{f.a}</Text> : null}
              </TouchableOpacity>
            ))}
            <Text style={st.note}>O atendimento do Re@lys é só por mensagem, aqui no app. {guest ? 'Volte a esta tela para ver a resposta do seu chamado.' : 'Em caso de perigo, use o SOS no Perfil: o suporte não substitui a polícia nem o SAMU.'}</Text>
          </ScrollView>
        )}
      </KeyboardLift>
    </Modal>
  );
}

// Conversa do chamado (usada também pelo administrador, com asTeam).
export function TicketThread({ ticket, bottom = 0, asTeam = false, onSend, quick = [] }) {
  const [text, setText] = useState('');
  const scroll = useRef(null);
  const send = (t) => {
    const v = (t || text).trim();
    if (!v) return;
    if (asTeam) onSend(v);
    else userReply(ticket.id, v);
    setText('');
  };
  const solved = ticket.status === 'resolvido';
  return (
    <>
      <View style={st.ticketInfo}>
        <Ionicons name={topicOf(ticket.topic).icon} size={17} color={colors.menu} />
        <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8, flex: 1 }} numberOfLines={1}>{asTeam ? `${ticket.userName} · ` : ''}{topicOf(ticket.topic).label}</Text>
        {ticket.urgent ? <Text style={st.urgent}>Prioridade</Text> : null}
        <Text style={{ color: colors.muted, fontSize: 12, marginLeft: 8 }}>{STATUS_LABEL[ticket.status]}</Text>
      </View>
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }} onContentSizeChange={() => scroll.current && scroll.current.scrollToEnd({ animated: false })}>
        {ticket.messages.map((m, i) =>
          m.from === 'system' ? (
            <Text key={i} style={st.system}>{m.text}</Text>
          ) : (
            <View key={i} style={[st.bubble, (m.from === 'user') !== asTeam ? st.mine : st.theirs]}>
              {m.from === 'team' && !asTeam ? <Text style={st.who}>{m.by || 'Equipe Re@lys'}</Text> : null}
              {m.from === 'user' && asTeam ? <Text style={st.who}>{ticket.userName}</Text> : null}
              <Text style={{ color: colors.text, lineHeight: 20 }}>{m.text}</Text>
              <Text style={{ color: colors.muted, fontSize: 10.5, marginTop: 3, alignSelf: 'flex-end' }}>{m.time}</Text>
            </View>
          )
        )}
        {/* Depois de resolvido, a pessoa avalia o atendimento */}
        {solved && !asTeam ? (
          <View style={{ alignItems: 'center', marginTop: 8 }}>
            <Text style={{ color: colors.muted, fontSize: 12.5 }}>{ticket.rating ? 'Obrigado pela avaliação!' : 'Como foi o atendimento?'}</Text>
            <View style={{ flexDirection: 'row', marginTop: 6 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => rateTicket(ticket.id, n)} style={{ padding: 4 }} accessibilityLabel={`${n} estrelas`}>
                  <Ionicons name={ticket.rating >= n ? 'star' : 'star-outline'} size={24} color={colors.primary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}
        {solved && asTeam && ticket.rating ? <Text style={st.system}>Avaliação do usuário: {ticket.rating} de 5</Text> : null}
      </ScrollView>
      <View style={{ paddingHorizontal: 12, paddingBottom: 8 + bottom }}>
        {asTeam && quick.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
            {quick.map((r) => (
              <TouchableOpacity key={r} style={[st.chip, { maxWidth: 240 }]} onPress={() => send(r)}>
                <Text numberOfLines={1} style={st.chipText}>{r}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}
        {!solved ? (
          <TouchableOpacity style={{ alignSelf: 'center', paddingVertical: 6 }} onPress={() => closeTicket(ticket.id, asTeam ? 'team' : 'user')} accessibilityLabel="Marcar como resolvido">
            <Text style={{ color: colors.muted, fontWeight: '700', fontSize: 12.5 }}>{asTeam ? 'Encerrar chamado' : 'Já resolveu? Marcar como resolvido'}</Text>
          </TouchableOpacity>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          <TextInput value={text} onChangeText={setText} placeholder={solved ? 'Escreva para reabrir o chamado' : asTeam ? 'Responder ao usuário' : 'Escreva para a equipe'} placeholderTextColor={colors.muted} multiline style={st.reply} />
          <TouchableOpacity onPress={() => send()} style={st.send} accessibilityLabel="Enviar">
            <Ionicons name="send" size={17} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 8 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontWeight: '800', fontSize: 18, marginLeft: 2 },
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 14, ...soft },
  input: { borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, marginTop: 10, minHeight: 70, textAlignVertical: 'top' },
  btn: { flexDirection: 'row', minHeight: 44, borderRadius: 12, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center', marginTop: 10, paddingHorizontal: 12 },
  btnText: { color: '#fff', fontWeight: '800' },
  btnGhost: { flexDirection: 'row', minHeight: 40, borderRadius: 12, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center', marginTop: 4, paddingHorizontal: 12 },
  btnGhostText: { color: colors.text, fontWeight: '700', marginLeft: 6 },
  label: { color: colors.muted, fontWeight: '700', fontSize: 12, marginTop: 12, marginBottom: 6 },
  chip: { paddingHorizontal: 12, minHeight: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', marginRight: 6, marginBottom: 6 },
  chipOn: { backgroundColor: colors.text, borderColor: colors.text },
  chipText: { color: colors.text, fontWeight: '700', fontSize: 12.5 },
  note: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 8 },
  h: { color: colors.text, fontWeight: '800', fontSize: 15, marginTop: 18, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, padding: 12, marginBottom: 8, ...soft },
  badge: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  faq: { backgroundColor: colors.card, borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  bubble: { maxWidth: '86%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, marginTop: 8 },
  mine: { alignSelf: 'flex-end', backgroundColor: '#F6EBC9' },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.cardAlt },
  who: { color: colors.primary, fontWeight: '800', fontSize: 11.5, marginBottom: 2 },
  system: { color: colors.muted, fontSize: 12, textAlign: 'center', marginVertical: 8, paddingHorizontal: 10 },
  ticketInfo: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  urgent: { color: colors.primary, fontWeight: '800', fontSize: 11 },
  reply: { flex: 1, backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 9, color: colors.text, maxHeight: 110 },
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
});
