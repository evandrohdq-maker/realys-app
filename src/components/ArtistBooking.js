// Contratação de artistas: vitrine (cachês, onde atende, agenda, vídeos), os botões Contratar,
// Fazer orçamento e Entrar em contato, o cartão do pedido (dos dois lados) e a arte do story de
// divulgação com a marca do artista. Regras em src/artistShows.js.
import React, { useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { colors, brl, soft } from '../theme';
import { Photo } from './ui';
import { isVerified } from './BioGate';
import { askPix } from './PixPay';
import { antiDesvio } from '../moderation';
import { conectado } from '../serverShop';
import { enviarPedido, acaoPedido } from '../serverShows';

// Pedido com artista do servidor: a ação vai para o servidor. Do celular (demonstração): local.
const run = (p, acao, body, local) =>
  p.serverId ? acaoPedido(p, acao, body).catch((e) => Alert.alert('Não deu certo', e.message)) : Promise.resolve(local && local());
import {
  useShows, artistById, coverage, atendeText, agendaText, fromPrice, nextFreeDays, dayState, monthDays, keyLabel, dayKey, cityName,
  createPedido, respond, markPaid, markCanceled, markDone, addMsg, markStory, rate, canCancel, showPassed, storyDone, storyCard,
  STATUS, EVENT_TYPES, DIVULGA, SHOW_FEE_PCT, artistGets, showFee, CANCEL_DAYS, WEEK, getShows, pedidoById,
} from '../artistShows';

const GOLD = '#F5C331';
const NIGHT = '#120F1A';

// ---------- Abrir a vitrine de qualquer tela ----------
let openListener = null;
export const openArtistShow = (id) => openListener && openListener(id);
export function ArtistShowHost() {
  const [id, setId] = useState(null);
  useEffect(() => {
    openListener = setId;
    return () => (openListener = null);
  }, []);
  useShows();
  const a = id ? artistById(id) : null;
  if (!a) return null;
  return <ArtistShowModal artist={a} onClose={() => setId(null)} />;
}

function ArtistShowModal({ artist, onClose }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
        <ShowHero artist={artist} top={insets.top} onClose={onClose} />
        <View style={{ paddingHorizontal: 16 }}>
          <ArtistShowcase artist={artist} hideHead />
        </View>
      </ScrollView>
    </Modal>
  );
}

function ShowHero({ artist, top = 0, onClose }) {
  return (
    <View style={[st.hero, { paddingTop: top + 10 }]}>
      {artist.foto ? <Photo uri={artist.foto} style={StyleSheet.absoluteFill} fallback={artist.logo} /> : null}
      <View style={st.shade} />
      {onClose ? (
        <TouchableOpacity onPress={onClose} style={[st.back, { top: top + 8 }]} accessibilityLabel="Voltar">
          <Ionicons name="chevron-down" size={22} color="#fff" />
        </TouchableOpacity>
      ) : null}
      <View style={{ padding: 16 }}>
        <Text style={st.kicker}>CONTRATE PARA O SEU EVENTO</Text>
        <Text style={st.heroName} numberOfLines={2}>{artist.nome}</Text>
        <Text style={st.heroMeta} numberOfLines={1}>{[artist.genero, cityName(artist.cidade), artist.rating ? `★ ${artist.rating}` : null, artist.shows ? `${artist.shows} shows pelo Realyz` : null].filter(Boolean).join(' · ')}</Text>
      </View>
    </View>
  );
}

// ---------- Vitrine (entra na página do artista, no perfil e na aba Artistas) ----------
export function ArtistShowcase({ artist, hideHead }) {
  const { state, dispatch } = useStore();
  const shows = useShows();
  const [book, setBook] = useState(null); // 'contratar' | 'orcamento' | 'contato'
  const [allDays, setAllDays] = useState(false);
  const mine = artist.id === 'me';
  const a = atendeText(artist);
  const ag = agendaText(artist);
  const free = nextFreeDays(artist, shows.pedidos, 6);
  const min = fromPrice(artist);
  const videos = (artist.vitrine || []).filter((v) => v.kind === 'video');
  const go = (mode) => {
    if (mine) return Alert.alert('Essa é a sua vitrine', 'É assim que ela aparece para quem quer contratar. Edite em Perfil › Shows e contratação.');
    if (mode !== 'contato' && !isVerified(state)) return dispatch({ type: 'BIO_GATE' });
    setBook(mode);
  };
  return (
    <View>
      {hideHead ? null : (
        <View style={st.headRow}>
          <Ionicons name="mic-outline" size={18} color={colors.primary} />
          <Text style={st.h}>Contrate para o seu evento</Text>
        </View>
      )}
      {artist.frase ? <Text style={st.frase}>“{artist.frase}”</Text> : null}

      {/* Os três cartões da vitrine: vídeos ao vivo, onde atende e agenda. */}
      {videos.length ? <InfoCard icon="videocam-outline" tint="#FDE8E8" ink="#C81E1E" title={`${videos.length} vídeo${videos.length > 1 ? 's' : ''} ao vivo no perfil`} sub="dá pra ouvir antes de contratar" /> : null}
      <InfoCard icon="location-outline" tint="#E6EEFB" ink="#2F74D0" title={a.title} sub={a.sub} />
      <InfoCard icon="calendar-outline" tint="#EFEAFF" ink="#6B5CE7" title={ag.title} sub={ag.sub} />

      {videos.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, marginTop: 6 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {videos.map((v, i) => (
            <TouchableOpacity key={i} style={st.video} activeOpacity={0.85} onPress={() => Alert.alert(v.titulo, 'Vídeo ao vivo do artista. Toque em Contratar ou Fazer orçamento quando quiser.')} accessibilityLabel={`Ver vídeo ${v.titulo}`}>
              <Photo uri={v.capa} style={st.videoImg} fallback="🎬" />
              <View style={st.play}><Ionicons name="play" size={16} color="#fff" /></View>
              <Text style={st.videoTitle} numberOfLines={1}>{v.titulo}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}

      <Text style={st.sub2}>CACHÊS</Text>
      {(artist.pacotes || []).map((p) => (
        <View key={p.id} style={st.pack}>
          <View style={{ flex: 1 }}>
            <Text style={st.packName} numberOfLines={1}>{p.nome}</Text>
            <Text style={st.small} numberOfLines={2}>{[durText(p.duracao), p.desc].filter(Boolean).join(' · ')}</Text>
          </View>
          <Text style={st.packPrice}>{brl(p.valor)}</Text>
        </View>
      ))}
      {artist.estrutura ? <Text style={[st.small, { marginTop: 2 }]}>🎛️ {artist.estrutura}</Text> : null}
      {(artist.eventos || []).length ? (
        <View style={st.tags}>
          {artist.eventos.map((e) => (
            <View key={e} style={st.tag}><Text style={st.tagText}>{e}</Text></View>
          ))}
        </View>
      ) : null}

      <Text style={st.sub2}>PRÓXIMOS DIAS LIVRES</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {free.map((k) => {
          const d = new Date(k + 'T12:00:00');
          return (
            <TouchableOpacity key={k} style={st.day} onPress={() => go('contratar')} accessibilityLabel={`Livre em ${keyLabel(k)}`}>
              <Text style={st.dayWd}>{WEEK[d.getDay()]}</Text>
              <Text style={st.dayN}>{d.getDate()}</Text>
              <Text style={st.dayM}>{MONTHS3[d.getMonth()]}</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity style={[st.day, { justifyContent: 'center' }]} onPress={() => setAllDays(true)} accessibilityLabel="Ver a agenda inteira">
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          <Text style={[st.dayM, { color: colors.primary }]}>Agenda</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Os botões: contratar, orçamento e contato (sempre dentro do Realyz). */}
      <TouchableOpacity style={st.cta} onPress={() => go('contratar')} activeOpacity={0.88} accessibilityLabel={`Contratar ${artist.nome}`}>
        <Ionicons name="flash" size={18} color={NIGHT} />
        <Text style={st.ctaText} numberOfLines={1}>{min ? `Contratar · a partir de ${brl(min)}` : 'Contratar'}</Text>
      </TouchableOpacity>
      <View style={{ flexDirection: 'row', marginTop: 8 }}>
        <TouchableOpacity style={[st.cta2, { marginRight: 8 }]} onPress={() => go('orcamento')} accessibilityLabel="Fazer orçamento">
          <Ionicons name="document-text-outline" size={16} color={colors.text} />
          <Text style={st.cta2Text} numberOfLines={1}>Fazer orçamento</Text>
        </TouchableOpacity>
        <TouchableOpacity style={st.cta2} onPress={() => go('contato')} accessibilityLabel="Entrar em contato">
          <Ionicons name="chatbubbles-outline" size={16} color={colors.text} />
          <Text style={st.cta2Text} numberOfLines={1}>Entrar em contato</Text>
        </TouchableOpacity>
      </View>
      <Text style={[st.small, { textAlign: 'center', marginTop: 8 }]}>🛡️ Pagamento retido pela Garantia Realyz até o show acontecer.</Text>

      {book ? <BookSheet artist={artist} mode={book} onClose={() => setBook(null)} /> : null}
      {allDays ? <AgendaModal artist={artist} onClose={() => setAllDays(false)} onPick={() => { setAllDays(false); go('contratar'); }} /> : null}
    </View>
  );
}

const MONTHS3 = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export const durText = (m) => (!m ? '' : m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)}h${m % 60}` : `${m / 60}h`);

function InfoCard({ icon, tint, ink, title, sub }) {
  return (
    <View style={st.info}>
      <View style={[st.infoIcon, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={20} color={ink} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={st.infoTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{title}</Text>
        {sub ? <Text style={st.small} numberOfLines={2}>{sub}</Text> : null}
      </View>
    </View>
  );
}

// ---------- Calendário (mês) ----------
// editable: o artista toca para bloquear ou liberar o dia.
export function MonthCalendar({ artist, pedidos, onDay, selected }) {
  const now = new Date();
  const [ym, setYm] = useState([now.getFullYear(), now.getMonth()]);
  const cells = monthDays(ym[0], ym[1]);
  const move = (n) => {
    const d = new Date(ym[0], ym[1] + n, 1);
    setYm([d.getFullYear(), d.getMonth()]);
  };
  const COLOR = { livre: colors.success, show: colors.primary, bloqueado: colors.danger };
  return (
    <View>
      <View style={st.calHead}>
        <TouchableOpacity onPress={() => move(-1)} accessibilityLabel="Mês anterior"><Ionicons name="chevron-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={st.calTitle}>{MONTHS[ym[1]]} {ym[0]}</Text>
        <TouchableOpacity onPress={() => move(1)} accessibilityLabel="Próximo mês"><Ionicons name="chevron-forward" size={20} color={colors.text} /></TouchableOpacity>
      </View>
      <View style={st.calRow}>
        {WEEK.map((w) => <Text key={w} style={st.calWd}>{w[0]}</Text>)}
      </View>
      <View style={st.calGrid}>
        {cells.map((k, i) => {
          if (!k) return <View key={i} style={st.calCell} />;
          const s = dayState(artist, k, pedidos);
          const on = selected === k;
          const usable = onDay && s !== 'passado' && s !== 'show';
          return (
            <TouchableOpacity key={i} style={st.calCell} disabled={!usable} onPress={() => onDay(k, s)} accessibilityLabel={`${keyLabel(k)}: ${s}`}>
              <View style={[st.calDot, on && { backgroundColor: colors.primary }, s === 'show' && !on && { borderColor: colors.primary, borderWidth: 1.5 }]}>
                <Text style={[st.calN, (s === 'passado' || s === 'fora') && { color: '#C9C2B4' }, on && { color: '#fff' }]}>{Number(k.slice(8))}</Text>
              </View>
              {COLOR[s] && !on ? <View style={[st.calMark, { backgroundColor: COLOR[s] }]} /> : <View style={st.calMark} />}
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={[st.calRow, { justifyContent: 'center', marginTop: 4 }]}>
        <Legend color={colors.success} label="Livre" />
        <Legend color={colors.primary} label="Show" />
        <Legend color={colors.danger} label="Bloqueado" />
      </View>
    </View>
  );
}
const Legend = ({ color, label }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 8 }}>
    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, marginRight: 4 }} />
    <Text style={st.small}>{label}</Text>
  </View>
);

function AgendaModal({ artist, onClose, onPick }) {
  const shows = useShows();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={st.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={[st.sheet, { paddingBottom: 16 + insets.bottom }]}>
        <Text style={st.sheetTitle}>Agenda de {artist.nome}</Text>
        <MonthCalendar artist={artist} pedidos={shows.pedidos} onDay={(k, s) => (s === 'livre' ? onPick(k) : Alert.alert(keyLabel(k), s === 'bloqueado' ? 'Dia bloqueado pelo artista.' : 'O artista não toca nesse dia. Peça um orçamento se quiser propor.'))} />
      </View>
    </Modal>
  );
}

// ---------- Contratar / Fazer orçamento / Entrar em contato ----------
function BookSheet({ artist, mode, onClose }) {
  const { state, dispatch } = useStore();
  const shows = useShows();
  const insets = useSafeAreaInsets();
  const [pacote, setPacote] = useState((artist.pacotes || [])[0] || null);
  const [dia, setDia] = useState(null);
  const [hora, setHora] = useState('21:00');
  const [cidade, setCidade] = useState(artist.cidade);
  const [local, setLocal] = useState('');
  const [evento, setEvento] = useState((artist.eventos || [])[0] || EVENT_TYPES[0]);
  const [publico, setPublico] = useState('');
  const [msg, setMsg] = useState('');
  const cov = useMemo(() => coverage(artist, cidade), [artist, cidade]);
  const contratar = mode === 'contratar';
  const total = contratar && pacote && cov.ok && cov.desloc != null ? pacote.valor + cov.desloc : null;
  const title = { contratar: 'Contratar', orcamento: 'Fazer orçamento', contato: 'Entrar em contato' }[mode];

  const send = () => {
    if (msg.trim()) {
      const ad = antiDesvio(msg);
      if (!ad.ok) return Alert.alert('Mensagem não enviada', ad.why);
    }
    // Artista do servidor (conta ligada): o pedido e o pagamento passam pelo servidor.
    if (artist.server && conectado(state)) {
      if (mode === 'contato' && !msg.trim()) return Alert.alert('Escreva a sua mensagem', 'Conte o que você quer saber do artista.');
      if (mode !== 'contato' && !dia) return Alert.alert('Escolha o dia', 'Toque em um dia livre na agenda.');
      return enviarPedido({ artistaId: artist.id, tipo: mode === 'contratar' ? 'contratacao' : mode, pacoteId: pacote && pacote.id, data: dia, hora, cidade, local, evento, publico: parseInt(publico, 10) || null, mensagem: msg.trim(), km: cov.km || 0 })
        .then(() => {
          onClose();
          Alert.alert('Pedido enviado ✅', 'Acompanhe em Pedidos › Aguardando.');
        })
        .catch((e) => Alert.alert('Pedido não enviado', e.message));
    }
    if (mode === 'contato') {
      if (!msg.trim()) return Alert.alert('Escreva a sua mensagem', 'Conte o que você quer saber do artista.');
      createPedido({ artista: artist, tipo: 'contato', mensagem: msg.trim(), cidade, evento });
      onClose();
      return Alert.alert('Mensagem enviada 💬', `A conversa com ${artist.nome} fica em Pedidos › Shows. Contato e pagamento sempre pelo Realyz.`);
    }
    if (!dia) return Alert.alert('Escolha o dia', 'Toque em um dia livre na agenda.');
    if (mode === 'orcamento') {
      createPedido({ artista: artist, tipo: 'orcamento', data: dia, hora, cidade, local, evento, publico: parseInt(publico, 10) || null, mensagem: msg.trim(), km: cov.km });
      onClose();
      return Alert.alert('Orçamento pedido 📝', `${artist.nome} vai responder com o valor. Você acompanha em Pedidos › Aguardando.`);
    }
    if (!pacote) return Alert.alert('Escolha o show', 'Toque em um dos cachês.');
    if (!cov.ok || cov.desloc == null) return Alert.alert('Fora da área do artista', `${cov.why || ''}\n\nPeça um orçamento: o artista pode aceitar e informar o deslocamento.`);
    const pay = () => {
      const fromGift = +Math.min(state.giftCredits, total).toFixed(2);
      dispatch({ type: 'SHOW_HOLD', amount: total });
      createPedido({ artista: artist, tipo: 'contratacao', pacote, data: dia, hora, cidade, local, evento, publico: parseInt(publico, 10) || null, mensagem: msg.trim(), desloc: cov.desloc, km: cov.km, fromGift });
      onClose();
      Alert.alert('Pedido enviado 🎤', `${brl(total)} retido pela Garantia Realyz. ${artist.nome} confirma o show; se recusar, o dinheiro volta na hora.`);
    };
    const avail = state.wallet + state.giftCredits;
    if (total > avail) return askPix({ amount: total, available: avail, label: `Show de ${artist.nome}`, onPaid: pay });
    Alert.alert('Confirmar contratação', `${pacote.nome} · ${keyLabel(dia)} às ${hora}\n${cityName(cidade)}${cov.desloc ? `\nDeslocamento: ${brl(cov.desloc)}` : ''}\n\nTotal: ${brl(total)}`, [{ text: 'Voltar', style: 'cancel' }, { text: 'Pagar e enviar', onPress: pay }]);
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={st.backdrop} activeOpacity={1} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[st.sheet, { maxHeight: '90%', paddingBottom: 12 + insets.bottom }]}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <Text style={st.sheetTitle}>{title} · {artist.nome}</Text>
          {mode !== 'contato' ? (
            <>
              {contratar ? (
                <>
                  <Text style={st.label}>Qual show</Text>
                  {(artist.pacotes || []).map((p) => (
                    <TouchableOpacity key={p.id} style={[st.pack, pacote && pacote.id === p.id && st.packOn]} onPress={() => setPacote(p)}>
                      <Ionicons name={pacote && pacote.id === p.id ? 'radio-button-on' : 'radio-button-off'} size={18} color={colors.primary} />
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={st.packName} numberOfLines={1}>{p.nome}</Text>
                        <Text style={st.small} numberOfLines={1}>{durText(p.duracao)}</Text>
                      </View>
                      <Text style={st.packPrice}>{brl(p.valor)}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              ) : null}
              <Text style={st.label}>Dia {dia ? `· ${keyLabel(dia)}` : ''}</Text>
              <MonthCalendar artist={artist} pedidos={shows.pedidos} selected={dia} onDay={(k, s) => (s === 'livre' || mode === 'orcamento' ? setDia(k) : Alert.alert(keyLabel(k), s === 'bloqueado' ? 'Dia bloqueado pelo artista.' : 'O artista não toca nesse dia da semana. Peça um orçamento para propor.'))} />
              <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={st.label}>Horário</Text>
                  <TextInput style={st.input} value={hora} onChangeText={setHora} placeholder="21:00" placeholderTextColor={colors.muted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.label}>Público</Text>
                  <TextInput style={st.input} value={publico} onChangeText={setPublico} placeholder="Ex.: 150" keyboardType="number-pad" placeholderTextColor={colors.muted} />
                </View>
              </View>
              <Text style={st.label}>Cidade do evento</Text>
              <TextInput style={st.input} value={cidade} onChangeText={setCidade} placeholder="Ex.: Passo Fundo - RS" placeholderTextColor={colors.muted} />
              <Text style={[st.small, { color: cov.ok ? colors.success : colors.danger, marginTop: 4 }]}>
                {cov.ok ? (cov.km ? `${cov.km} km de ${cityName(artist.cidade)} · deslocamento ${brl(cov.desloc || 0)}` : 'Dentro da cidade do artista: sem deslocamento') : cov.why}
              </Text>
              <Text style={st.label}>Local</Text>
              <TextInput style={st.input} value={local} onChangeText={setLocal} placeholder="Nome do lugar (o endereço fica no pedido)" placeholderTextColor={colors.muted} />
              <Text style={st.label}>Tipo de evento</Text>
              <View style={st.tags}>
                {EVENT_TYPES.map((e) => (
                  <TouchableOpacity key={e} style={[st.tag, evento === e && st.tagOn]} onPress={() => setEvento(e)}>
                    <Text style={[st.tagText, evento === e && { color: colors.primaryDark, fontWeight: '800' }]}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : null}
          <Text style={st.label}>{mode === 'contato' ? 'Sua mensagem' : 'Recado para o artista (opcional)'}</Text>
          <TextInput style={[st.input, { minHeight: 70, textAlignVertical: 'top' }]} value={msg} onChangeText={setMsg} multiline placeholder={mode === 'contato' ? 'Ex.: Vocês tocam música gaúcha também?' : 'Ex.: É aniversário de 40 anos, queremos músicas dos anos 90.'} placeholderTextColor={colors.muted} />
          <Text style={[st.small, { marginTop: 6 }]}>🔒 Telefone, rede social e pagamento por fora não passam: fora do Realyz não tem garantia.</Text>
          {total != null ? (
            <View style={st.totalBox}>
              <Text style={st.small}>Cachê {brl(pacote.valor)}{cov.desloc ? ` + deslocamento ${brl(cov.desloc)}` : ''}</Text>
              <Text style={st.total}>{brl(total)}</Text>
              <Text style={st.small}>Sem taxa para quem contrata. Fica retido até o show.</Text>
            </View>
          ) : null}
          <TouchableOpacity style={[st.cta, { marginTop: 14 }]} onPress={send} activeOpacity={0.88}>
            <Text style={st.ctaText}>{contratar ? 'Contratar' : mode === 'orcamento' ? 'Pedir orçamento' : 'Enviar mensagem'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------- Pedido de show (Pedidos do cliente e Estúdio do artista) ----------
export function ShowPedidoCard({ p }) {
  const { state, dispatch } = useStore();
  const [chat, setChat] = useState(false);
  const [answer, setAnswer] = useState(false);
  const [story, setStory] = useState(null); // lado que vai postar
  const s = STATUS[p.status] || STATUS.aguardando;
  const artist = artistById(p.artistaId) || p.artista;
  const artistSide = p.lado === 'artista';
  const meSide = artistSide ? 'artista' : 'contratante';

  // Fechar o orçamento respondido: paga e o valor fica retido. Sem saldo, abre o Pix.
  const pay = () => {
    const doIt = () =>
      run(p, 'pagar', null, () => {
        markPaid(p.id, +Math.min(state.giftCredits, p.total).toFixed(2));
        dispatch({ type: 'SHOW_HOLD', amount: p.total });
      }).then(() => Alert.alert('Show fechado 🎉', `${brl(p.total)} retido pela Garantia Realyz até o show. Agora é divulgar!`));
    const avail = state.wallet + state.giftCredits;
    if (p.total > avail) return askPix({ amount: p.total, available: avail, label: `Show de ${p.artista.nome}`, onPaid: doIt });
    Alert.alert('Fechar o show', `${brl(p.total)} sai do seu saldo e fica retido até o show.`, [{ text: 'Voltar', style: 'cancel' }, { text: 'Pagar', onPress: doIt }]);
  };

  const cancel = () => {
    if (!canCancel(p)) return Alert.alert('Cancelamento pelo suporte', `Faltam menos de ${CANCEL_DAYS} dias para o show. Fale com o suporte do Realyz: o caso é analisado com a Garantia Realyz.`);
    Alert.alert('Cancelar o show?', p.pago ? `${brl(p.total)} volta para a sua carteira.` : 'O pedido é encerrado.', [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Cancelar', style: 'destructive', onPress: () => run(p, 'cancelar', null, () => { if (p.pago) dispatch({ type: 'SHOW_REFUND', amount: p.total, fromGift: p.fromGift }); markCanceled(p.id, meSide); }) },
    ]);
  };
  // Lado do artista: aceitar ou recusar (contratação) e responder o orçamento.
  const accept = () => {
    if (p.tipo === 'orcamento') return setAnswer(true);
    run(p, 'responder', { aceitar: true }, () => respond(p.id, { aceitar: true }));
    Alert.alert('Show confirmado 🎤', 'O dia já saiu da sua agenda. Divulgue nos Now: a arte do show está pronta no pedido.');
  };
  const refuse = () =>
    Alert.alert('Recusar?', p.pago ? 'O dinheiro volta para quem contratou na hora. Recusar não tira pontos.' : 'Recusar não tira pontos.', [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Recusar', style: 'destructive', onPress: () => run(p, 'responder', { aceitar: false }, () => respond(p.id, { aceitar: false })) },
    ]);
  const done = () =>
    Alert.alert('O show aconteceu?', `Ao confirmar, ${p.artista.nome} recebe o cachê (o Realyz fica com ${SHOW_FEE_PCT}%).`, [
      { text: 'Ainda não', style: 'cancel' },
      { text: 'Sim, aconteceu', onPress: () => run(p, 'realizado', null, () => { markDone(p.id); if (artistSide) dispatch({ type: 'SHOW_PAYOUT', amount: artistGets(p.valor, p.desloc) }); }) },
    ]);

  return (
    <View style={st.pedido}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Photo uri={p.artista.foto} style={st.pedidoImg} fallback={p.artista.logo} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={st.packName} numberOfLines={1}>{artistSide ? `${p.cliente} quer te contratar` : p.artista.nome}</Text>
          <Text style={st.small} numberOfLines={1}>{[p.tipo === 'orcamento' ? 'Orçamento' : p.tipo === 'contato' ? 'Contato' : p.pacote && p.pacote.nome, p.evento].filter(Boolean).join(' · ')}</Text>
        </View>
        <View style={[st.status, { backgroundColor: s.color + '1A' }]}>
          <Ionicons name={s.icon} size={12} color={s.color} />
          <Text style={[st.statusText, { color: s.color }]} numberOfLines={1}>{artistSide && p.status === 'aguardando' ? 'Responder' : s.label}</Text>
        </View>
      </View>
      {p.data ? <Text style={[st.small, { marginTop: 8 }]}>📅 {keyLabel(p.data)}{p.hora ? ` às ${p.hora}` : ''} · 📍 {[p.local, cityName(p.cidade)].filter(Boolean).join(', ')}{p.publico ? ` · ${p.publico} pessoas` : ''}</Text> : null}
      {p.total != null ? (
        <Text style={[st.small, { marginTop: 2 }]}>
          💰 {brl(p.total)}{p.desloc ? ` (cachê ${brl(p.valor)} + deslocamento ${brl(p.desloc)})` : ''}
          {artistSide && p.valor ? ` · você recebe ${brl(artistGets(p.valor, p.desloc))}` : ''}
          {p.pago && ['aguardando', 'confirmado'].includes(p.status) ? ' · retido pela Garantia' : ''}
        </Text>
      ) : null}

      {/* Divulgação: compromisso nos stories. */}
      {['confirmado', 'realizado'].includes(p.status) && artist ? (
        <View style={st.divulga}>
          <Text style={[st.packName, { fontSize: 13 }]}>📣 Divulgação nos Now</Text>
          <Commit label={`Artista: ${DIVULGA.artista} Now (o anúncio e o "é hoje")`} n={(p.divulgacao.artista || []).length} need={DIVULGA.artista} />
          <Commit label={`Quem contratou: ${DIVULGA.contratante} Now`} n={(p.divulgacao.contratante || []).length} need={DIVULGA.contratante} />
          {p.status === 'confirmado' && !storyDone(p, meSide) ? (
            <TouchableOpacity style={[st.cta, { marginTop: 8, paddingVertical: 10 }]} onPress={() => setStory(meSide)}>
              <Ionicons name="sparkles" size={16} color={NIGHT} />
              <Text style={st.ctaText}>Ver a arte e postar no Now</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      <View style={st.actions}>
        {p.status !== 'cancelado' && p.status !== 'recusado' ? <Act icon="chatbubbles-outline" label={`Conversa${p.msgs.length ? ` (${p.msgs.length})` : ''}`} onPress={() => setChat(true)} /> : null}
        {artistSide && p.status === 'aguardando' ? (
          <>
            <Act icon="checkmark" label={p.tipo === 'orcamento' ? 'Responder' : 'Aceitar'} gold onPress={accept} />
            <Act icon="close" label="Recusar" onPress={refuse} />
          </>
        ) : null}
        {!artistSide && p.status === 'proposta' ? <Act icon="card-outline" label={`Fechar · ${brl(p.total)}`} gold onPress={pay} /> : null}
        {!artistSide && ['aguardando', 'proposta', 'confirmado'].includes(p.status) ? <Act icon="close-circle-outline" label="Cancelar" onPress={cancel} /> : null}
        {p.status === 'confirmado' && showPassed(p) && (!artistSide || !p.serverId) ? <Act icon="checkmark-done" label="O show aconteceu" gold onPress={done} /> : null}
        {!artistSide && p.status === 'realizado' && !p.nota ? <Act icon="star-outline" label="Avaliar" gold onPress={() => Alert.alert('Avaliar o show', 'Como foi?', [1, 3, 5].map((n) => ({ text: '★'.repeat(n), onPress: () => rate(p.id, n) })))} /> : null}
        {/* Demonstração: o outro lado responde por estes botões. */}
        {!artistSide && !p.serverId && p.status === 'aguardando' ? (
          <Act icon="flask-outline" label="Simular resposta" onPress={() => (p.tipo === 'orcamento' ? respond(p.id, { aceitar: true, valor: (fromPrice(artist || {}) || 800) * 1.1, desloc: p.km ? p.km * 2 * ((artist && artist.atende && artist.atende.porKm) || 2) : 0, nota: 'Tenho a data livre! Segue o valor com o deslocamento.' }) : respond(p.id, { aceitar: true }))} />
        ) : null}
      </View>

      {chat ? <PedidoChat p={p} side={artistSide ? 'artista' : 'cliente'} onClose={() => setChat(false)} /> : null}
      {answer ? <AnswerQuote p={p} onClose={() => setAnswer(false)} /> : null}
      {story ? <StoryPreview p={p} artist={artist} lado={story} onClose={() => setStory(null)} /> : null}
    </View>
  );
}

const Commit = ({ label, n, need }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
    <Ionicons name={n >= need ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={n >= need ? colors.success : colors.muted} />
    <Text style={[st.small, { marginLeft: 6, flex: 1 }]} numberOfLines={1}>{label}</Text>
    <Text style={[st.small, { fontWeight: '800' }]}>{Math.min(n, need)}/{need}</Text>
  </View>
);
const Act = ({ icon, label, onPress, gold }) => (
  <TouchableOpacity style={[st.act, gold && st.actGold]} onPress={onPress} accessibilityLabel={label}>
    <Ionicons name={icon} size={14} color={gold ? colors.primaryDark : colors.text} />
    <Text style={[st.actText, gold && { color: colors.primaryDark }]} numberOfLines={1}>{label}</Text>
  </TouchableOpacity>
);

function AnswerQuote({ p, onClose }) {
  const insets = useSafeAreaInsets();
  const [valor, setValor] = useState(String(fromPrice(getMine()) || ''));
  const [desloc, setDesloc] = useState('0');
  const [nota, setNota] = useState('');
  const v = parseFloat(String(valor).replace(',', '.')) || 0;
  const d = parseFloat(String(desloc).replace(',', '.')) || 0;
  const send = () => {
    if (!v) return Alert.alert('Informe o cachê');
    if (nota.trim()) {
      const ad = antiDesvio(nota);
      if (!ad.ok) return Alert.alert('Mensagem não enviada', ad.why);
    }
    run(p, 'responder', { aceitar: true, valor: v, desloc: d, nota: nota.trim() }, () => respond(p.id, { aceitar: true, valor: v, desloc: d, nota: nota.trim() }));
    onClose();
    Alert.alert('Orçamento enviado ✅', `Quando ${p.cliente} pagar, o show fecha e o dia sai da sua agenda.`);
  };
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={st.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={[st.sheet, { paddingBottom: 16 + insets.bottom }]}>
        <Text style={st.sheetTitle}>Responder orçamento</Text>
        <Text style={st.small}>{[p.evento, p.data && keyLabel(p.data), cityName(p.cidade), p.publico && `${p.publico} pessoas`].filter(Boolean).join(' · ')}</Text>
        <Text style={st.label}>Cachê (R$)</Text>
        <TextInput style={st.input} value={valor} onChangeText={setValor} keyboardType="decimal-pad" />
        <Text style={st.label}>Deslocamento (R$)</Text>
        <TextInput style={st.input} value={desloc} onChangeText={setDesloc} keyboardType="decimal-pad" />
        <Text style={st.label}>Recado</Text>
        <TextInput style={st.input} value={nota} onChangeText={setNota} placeholder="Ex.: Data livre, levo o som." placeholderTextColor={colors.muted} />
        <Text style={[st.small, { marginTop: 6 }]}>Você recebe {brl(artistGets(v, d))} (o Realyz fica com {SHOW_FEE_PCT}% do cachê: {brl(showFee(v))}).</Text>
        <TouchableOpacity style={[st.cta, { marginTop: 12 }]} onPress={send}>
          <Text style={st.ctaText}>Enviar orçamento · {brl(v + d)}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
const getMine = () => getShows().mine || {};

function PedidoChat({ p, side, onClose }) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  useShows();
  const fresh = pedidoById(p.id) || p;
  const send = () => {
    const t = text.trim();
    if (!t) return;
    const ad = antiDesvio(t);
    if (!ad.ok) return Alert.alert('Mensagem não enviada', ad.why);
    run(p, 'mensagens', { text: t }, () => addMsg(p.id, side, t));
    setText('');
  };
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <View style={st.chatHead}>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Voltar"><Ionicons name="arrow-back" size={22} color={colors.text} /></TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={st.packName} numberOfLines={1}>{side === 'artista' ? p.cliente : p.artista.nome}</Text>
            <Text style={st.small} numberOfLines={1}>Conversa do pedido · dentro do Realyz</Text>
          </View>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          <Text style={[st.small, { textAlign: 'center', marginBottom: 10 }]}>🔒 Telefone e pagamento por fora são bloqueados. Combine tudo aqui.</Text>
          {fresh.msgs.map((m, i) => {
            const mine = m.de === side;
            return (
              <View key={i} style={[st.bubble, mine ? st.bubbleMe : st.bubbleThem]}>
                <Text style={{ color: colors.text }}>{m.text}</Text>
              </View>
            );
          })}
          {!fresh.msgs.length ? <Text style={[st.small, { textAlign: 'center' }]}>Nenhuma mensagem ainda.</Text> : null}
        </ScrollView>
        <View style={[st.chatBar, { paddingBottom: 8 + insets.bottom }]}>
          <TextInput style={[st.input, { flex: 1, marginTop: 0 }]} value={text} onChangeText={setText} placeholder="Escreva..." placeholderTextColor={colors.muted} onSubmitEditing={send} />
          <TouchableOpacity style={st.sendBtn} onPress={send} accessibilityLabel="Enviar"><Ionicons name="send" size={18} color={NIGHT} /></TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------- Arte de divulgação (story com a marca do artista) ----------
export function ShowStoryCard({ card, style }) {
  return (
    <View style={[st.story, style]}>
      {card.foto ? <Photo uri={card.foto} style={st.storyPhoto} fallback={card.logo} /> : <View style={st.storyPhoto} />}
      <View style={st.storyFade} />
      <View style={st.storyTop}>
        <View style={st.brandPill}>
          <Text style={st.brandStar}>★</Text>
          <Text style={st.brandText}>REALYZ</Text>
        </View>
        <View style={st.newPill}><Text style={st.newText}>{card.show ? 'SHOW CONFIRMADO' : 'NOVIDADE'}</Text></View>
      </View>
      <View style={st.storyBody}>
        <Text style={st.storyName} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6}>{card.nome}</Text>
        <Text style={st.storyMeta}>{[card.genero, card.cidade].filter(Boolean).join(' · ')}</Text>
        {card.show ? (
          <View style={st.storyShow}>
            <Text style={st.storyShowWhen}>{card.show.quando}</Text>
            <Text style={st.storyShowWhere} numberOfLines={1}>{[card.show.evento, card.show.onde].filter(Boolean).join(' · ')}</Text>
          </View>
        ) : (
          <Text style={st.storyLead}>Agora você me encontra no <Text style={{ color: GOLD, fontWeight: '900' }}>Realyz</Text></Text>
        )}
        {card.itens.map((it, i) => (
          <View key={i} style={st.storyItem}>
            <View style={[st.infoIcon, { backgroundColor: it.tint, width: 34, height: 34 }]}><Ionicons name={it.icon} size={16} color={it.ink} /></View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[st.infoTitle, { fontSize: 13 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{it.title}</Text>
              <Text style={[st.small, { fontSize: 10.5 }]} numberOfLines={1}>{it.sub}</Text>
            </View>
          </View>
        ))}
        <Text style={st.storyAsk}>Peça seu orçamento</Text>
        <View style={st.linkPill}><Text style={st.linkText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{card.link}</Text></View>
      </View>
    </View>
  );
}

function StoryPreview({ p, artist, lado, onClose }) {
  const { dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const card = storyCard(artist, p);
  const post = () => {
    dispatch({ type: 'PUBLISH_STORY', item: { id: 'show' + Date.now(), text: '', showCard: card, time: 'agora', views: 0 } });
    run(p, 'divulgacao', null, () => markStory(p.id, lado));
    onClose();
    Alert.alert('Now publicado 📣', 'A arte do show está nos seus Now com o link para contratar.');
  };
  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000', paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <ShowStoryCard card={card} style={{ flex: 1, borderRadius: 0 }} />
        <View style={{ flexDirection: 'row', padding: 12 }}>
          <TouchableOpacity style={[st.cta2, { marginRight: 8, backgroundColor: '#fff' }]} onPress={onClose}><Text style={st.cta2Text}>Agora não</Text></TouchableOpacity>
          <TouchableOpacity style={[st.cta, { flex: 1, marginTop: 0 }]} onPress={post}>
            <Ionicons name="add-circle" size={18} color={NIGHT} />
            <Text style={st.ctaText}>Postar no meu Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  hero: { height: 250, justifyContent: 'flex-end', backgroundColor: NIGHT, overflow: 'hidden' },
  shade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(18,15,26,0.55)' },
  back: { position: 'absolute', left: 12, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  kicker: { color: GOLD, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  heroName: { color: '#fff', fontSize: 28, fontWeight: '900', marginTop: 2 },
  heroMeta: { color: 'rgba(255,255,255,0.88)', fontSize: 13, marginTop: 4 },
  headRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 4 },
  h: { color: colors.text, fontWeight: '800', fontSize: 16, marginLeft: 6 },
  frase: { color: colors.text, fontStyle: 'italic', marginTop: 12, marginBottom: 4, fontSize: 14 },
  info: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 12, marginTop: 8, ...soft },
  infoIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  infoTitle: { color: colors.text, fontWeight: '800', fontSize: 14.5 },
  small: { color: colors.muted, fontSize: 12 },
  sub2: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1, marginTop: 16, marginBottom: 6 },
  video: { width: 170, marginRight: 10 },
  videoImg: { width: 170, height: 96, borderRadius: 12 },
  play: { position: 'absolute', top: 34, left: 71, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  videoTitle: { color: colors.text, fontSize: 12, fontWeight: '700', marginTop: 4 },
  pack: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  packOn: { borderColor: colors.gold, backgroundColor: '#FFFBEF' },
  packName: { color: colors.text, fontWeight: '800', fontSize: 14 },
  packPrice: { color: colors.primaryDark, fontWeight: '900', fontSize: 15, marginLeft: 8 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.cardAlt, marginRight: 6, marginBottom: 6 },
  tagOn: { backgroundColor: '#F6EDD6', borderWidth: 1, borderColor: colors.gold },
  tagText: { color: colors.menu, fontSize: 12, fontWeight: '600' },
  day: { width: 58, alignItems: 'center', paddingVertical: 8, borderRadius: 14, backgroundColor: '#fff', marginRight: 8, ...soft },
  dayWd: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  dayN: { color: colors.text, fontSize: 18, fontWeight: '900' },
  dayM: { color: colors.muted, fontSize: 11 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: GOLD, borderRadius: 16, paddingVertical: 14, marginTop: 18 },
  ctaText: { color: NIGHT, fontWeight: '900', fontSize: 15, marginLeft: 6 },
  cta2: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: '#fff' },
  cta2Text: { color: colors.text, fontWeight: '700', marginLeft: 6, fontSize: 13 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16 },
  sheetTitle: { color: colors.text, fontWeight: '900', fontSize: 17, marginBottom: 8 },
  label: { color: colors.text, fontWeight: '700', fontSize: 13, marginTop: 12, marginBottom: 4 },
  input: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10, color: colors.text },
  totalBox: { backgroundColor: '#FFFBEF', borderRadius: 14, padding: 12, marginTop: 12, borderWidth: 1, borderColor: colors.borderStrong },
  total: { color: colors.primaryDark, fontWeight: '900', fontSize: 22, marginVertical: 2 },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 6 },
  calTitle: { color: colors.text, fontWeight: '800' },
  calRow: { flexDirection: 'row' },
  calWd: { flex: 1, textAlign: 'center', color: colors.muted, fontSize: 11, fontWeight: '700' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 },
  calDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  calN: { color: colors.text, fontWeight: '700', fontSize: 13 },
  calMark: { width: 5, height: 5, borderRadius: 3, marginTop: 1 },
  pedido: { backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 10, ...soft },
  pedidoImg: { width: 46, height: 46, borderRadius: 12 },
  status: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, marginLeft: 6, maxWidth: 130 },
  statusText: { fontSize: 11, fontWeight: '800', marginLeft: 4 },
  divulga: { backgroundColor: colors.cardAlt, borderRadius: 12, padding: 10, marginTop: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  act: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: colors.border, marginRight: 6, marginBottom: 6 },
  actGold: { borderColor: colors.gold, backgroundColor: '#FFFBEF' },
  actText: { color: colors.text, fontSize: 12, fontWeight: '700', marginLeft: 4 },
  chatHead: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  bubble: { maxWidth: '80%', borderRadius: 14, padding: 10, marginBottom: 8 },
  bubbleMe: { alignSelf: 'flex-end', backgroundColor: '#FFF4D6' },
  bubbleThem: { alignSelf: 'flex-start', backgroundColor: '#fff' },
  chatBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  // Arte do story
  story: { backgroundColor: NIGHT, borderRadius: 18, overflow: 'hidden', aspectRatio: 9 / 16 },
  storyPhoto: { position: 'absolute', top: 0, left: 0, right: 0, height: '55%' },
  storyFade: { position: 'absolute', top: '30%', left: 0, right: 0, height: '30%', backgroundColor: 'rgba(18,15,26,0.55)' },
  storyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  brandPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: GOLD },
  brandStar: { color: GOLD, fontWeight: '900', marginRight: 4 },
  brandText: { color: '#fff', fontWeight: '900', letterSpacing: 1.5 },
  newPill: { backgroundColor: GOLD, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, transform: [{ rotate: '4deg' }] },
  newText: { color: NIGHT, fontWeight: '900', fontSize: 11 },
  storyBody: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: NIGHT, paddingTop: 10 },
  storyName: { color: GOLD, fontSize: 30, fontWeight: '900' },
  storyMeta: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 6 },
  storyLead: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 6 },
  storyShow: { borderLeftWidth: 3, borderLeftColor: GOLD, paddingLeft: 10, marginBottom: 6 },
  storyShowWhen: { color: '#fff', fontWeight: '900', fontSize: 15 },
  storyShowWhere: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  storyItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 8, marginTop: 6 },
  storyAsk: { color: '#fff', fontWeight: '800', textAlign: 'center', marginTop: 12 },
  linkPill: { alignSelf: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, marginTop: 6, maxWidth: '100%' },
  linkText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});

// Botão dourado "Contratar para o seu evento" (perfil da pessoa, página do artista, player de música).
// before: fecha a tela de onde veio (ex.: a prévia do perfil) antes de abrir a vitrine.
export function HireButton({ artist, before, style }) {
  useShows();
  if (!artist || !artist.ativo) return null;
  const min = fromPrice(artist);
  return (
    <TouchableOpacity
      style={[st2.hire, style]}
      activeOpacity={0.88}
      onPress={() => {
        if (before) before();
        setTimeout(() => openArtistShow(artist.id), before ? 250 : 0);
      }}
      accessibilityLabel={`Contratar ${artist.nome} para o seu evento`}
    >
      <Ionicons name="mic" size={18} color={NIGHT} />
      <View style={{ flex: 1, marginLeft: 8 }}>
        <Text style={st2.hireTitle} numberOfLines={1}>Contratar para o seu evento</Text>
        <Text style={st2.hireSub} numberOfLines={1}>{[min ? `a partir de ${brl(min)}` : null, atendeText(artist).title].filter(Boolean).join(' · ')}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={NIGHT} />
    </TouchableOpacity>
  );
}
const st2 = StyleSheet.create({
  hire: { flexDirection: 'row', alignItems: 'center', backgroundColor: GOLD, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 11, marginTop: 12 },
  hireTitle: { color: NIGHT, fontWeight: '900', fontSize: 14 },
  hireSub: { color: 'rgba(18,15,26,0.75)', fontSize: 11.5, marginTop: 1 },
});
