// Notícias e Alertas do portal (topo da Community).
// Alertas oficiais primeiro (Defesa Civil, INMET, Cemaden), com "o que fazer", ligar e "Estou seguro".
// Depois relatos de moradores (moderados), lives de noticiário e as notícias por assunto.
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Alert, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../../store';
import { colors, soft } from '../../../theme';
import { Screen, Photo } from '../../../components/ui';
import { NEWS, NEWS_CATS, ALERTS, ALERT_LEVELS, REPORTS, TRANSPORT_ALERTS, RISK } from '../../../newsData';
import { allLives } from '../../../components/LiveBits';
import { confirmCall } from '../../../phone';

const fmt = (n) => n.toLocaleString('pt-BR');

export default function NewsTab({ onWatch, navigate }) {
  const { state, dispatch } = useStore();
  const [cat, setCat] = useState('todas');
  const [open, setOpen] = useState(null);
  const [reporting, setReporting] = useState(false);
  const showAlerts = cat === 'todas' || cat === 'alertas';
  const onlyTransport = cat === 'transporte';
  const list = NEWS.filter((n) => cat === 'todas' || n.cat === cat);
  const lives = allLives(state).filter((l) => l.cat === 'noticias');

  return (
    <Screen>
      <View style={styles.trust}>
        <Ionicons name="shield-checkmark" size={16} color={colors.success} />
        <Text style={styles.trustText}>Só canais verificados e fontes oficiais. Notícia falsa é derrubada pela IA Re@lys.</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, marginBottom: 12 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {NEWS_CATS.map((c) => {
          const on = c.key === cat;
          const alert = c.key === 'alertas';
          return (
            <TouchableOpacity key={c.key} style={[styles.chip, on && (alert ? styles.chipAlertOn : styles.chipOn)]} onPress={() => setCat(c.key)} accessibilityLabel={c.label}>
              <Ionicons name={c.icon} size={15} color={on ? '#fff' : alert ? ALERT_LEVELS.extremo.color : colors.primary} />
              <Text style={[styles.chipText, on && { color: '#fff' }]}>{c.label}</Text>
              {alert ? <View style={styles.dot} /> : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {showAlerts ? (
        <>
          {ALERTS.map((a) => (
            <AlertCard key={a.id} a={a} navigate={navigate} />
          ))}
          <TransportAlerts navigate={navigate} />
          <SafeCheck />
          <Reports onReport={() => setReporting(true)} mine={state.newsReports} />
        </>
      ) : null}

      {onlyTransport ? <TransportAlerts navigate={navigate} all /> : null}

      {lives.length && cat === 'todas' ? (
        <>
          <Text style={styles.h}>Ao vivo agora</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, marginBottom: 14 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {lives.map((l) => (
              <TouchableOpacity key={l.id} style={styles.liveCard} onPress={() => onWatch && onWatch(l)} activeOpacity={0.9} accessibilityLabel={`Assistir: ${l.title}`}>
                <Photo uri={l.photo} style={styles.livePhoto} fallback="📺" />
                <View style={styles.liveTag}><Text style={styles.liveTagText}>AO VIVO</Text></View>
                <Text style={styles.liveTitle} numberOfLines={2}>{l.title}</Text>
                <Text style={styles.meta}>{l.host} · {fmt(l.viewers)} assistindo</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      ) : null}

      {list.length ? <Text style={styles.h}>{cat === 'todas' ? 'Notícias' : NEWS_CATS.find((c) => c.key === cat).label}</Text> : null}
      {list.map((n, i) =>
        i === 0 ? (
          <TouchableOpacity key={n.id} style={styles.big} onPress={() => setOpen(n)} activeOpacity={0.9}>
            <Photo uri={n.photo} style={styles.bigPhoto} fallback="📰" />
            <View style={{ padding: 12 }}>
              <Source n={n} />
              <Text style={styles.bigTitle}>{n.title}</Text>
              <Text style={styles.summary} numberOfLines={2}>{n.summary}</Text>
              <Text style={styles.meta}>{n.time} · {fmt(n.reads)} leituras</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity key={n.id} style={styles.row} onPress={() => setOpen(n)} activeOpacity={0.9}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Source n={n} />
              <Text style={styles.rowTitle} numberOfLines={3}>{n.title}</Text>
              <Text style={styles.meta}>{n.time}</Text>
            </View>
            <Photo uri={n.photo} style={styles.rowPhoto} fallback="📰" />
          </TouchableOpacity>
        ),
      )}

      <Article n={open} onClose={() => setOpen(null)} />
      <ReportSheet visible={reporting} onClose={() => setReporting(false)} />
    </Screen>
  );
}

function Source({ n }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
      <Ionicons name={n.official ? 'shield-checkmark' : 'checkmark-circle'} size={13} color={n.official ? colors.success : colors.accent} />
      <Text style={[styles.source, { color: n.official ? colors.success : colors.accent }]}>
        {n.source} · {n.official ? 'fonte oficial' : 'canal verificado'}
      </Text>
    </View>
  );
}

// Cartão de alerta oficial: nível, área, o que fazer e ações rápidas.
function AlertCard({ a, navigate }) {
  const [more, setMore] = useState(a.level === 'extremo');
  const L = ALERT_LEVELS[a.level];
  return (
    <View style={[styles.alert, { backgroundColor: L.bg, borderColor: L.color + '66' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={[styles.alertIcon, { backgroundColor: L.color }]}>
          <Ionicons name={a.icon} size={20} color="#fff" />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[styles.alertLevel, { color: L.color }]}>{L.label.toUpperCase()} · {a.source}</Text>
          <Text style={styles.alertType}>{a.type}</Text>
        </View>
      </View>
      <Text style={styles.alertArea}>📍 {a.area} · {a.until}</Text>
      <Text style={styles.alertText}>{a.text}</Text>
      <TouchableOpacity onPress={() => setMore(!more)} style={{ marginTop: 6 }}>
        <Text style={{ color: L.color, fontWeight: '800', fontSize: 12 }}>{more ? 'Esconder' : 'O que fazer agora'} {more ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {more
        ? a.todo.map((t, i) => (
            <View key={i} style={{ flexDirection: 'row', marginTop: 5 }}>
              <Text style={[styles.todoNum, { backgroundColor: L.color }]}>{i + 1}</Text>
              <Text style={styles.todoText}>{t}</Text>
            </View>
          ))
        : null}
      <View style={{ flexDirection: 'row', marginTop: 10 }}>
        <TouchableOpacity style={[styles.alertBtn, { backgroundColor: L.color }]} onPress={() => confirmCall(a.phoneLabel, a.phone)} accessibilityLabel={`Ligar ${a.phone}`}>
          <Ionicons name="call" size={14} color="#fff" />
          <Text style={styles.alertBtnText}>{a.phoneLabel} {a.phone}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sosBtn} onPress={() => navigate && navigate({ tab: 'socorro' })} accessibilityLabel="Abrir SOS" activeOpacity={0.85}>
          <Ionicons name="medkit" size={14} color="#fff" />
          <Text style={styles.sosText}>SOS</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.alertBtn, styles.alertBtnLight, { borderColor: L.color }]}
          onPress={() => Share.share({ message: `${L.label} (${a.source}): ${a.type}. ${a.area}, ${a.until}. Fonte oficial, via Re@lys.` }).catch(() => {})}
          accessibilityLabel="Compartilhar alerta"
        >
          <Ionicons name="share-social" size={14} color={L.color} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Avisos de transporte (voos, estradas, metrô, ônibus), ligados aos alertas de clima.
export function TransportAlerts({ navigate, all, compact }) {
  const list = all ? TRANSPORT_ALERTS : TRANSPORT_ALERTS.filter((t) => t.risk !== 'baixa');
  return (
    <View style={styles.reports}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
        <Ionicons name="airplane" size={16} color={colors.accent} />
        <Text style={[styles.h, { marginBottom: 0, marginLeft: 6, flex: 1, fontSize: 14 }]}>Viagens e transporte</Text>
        {!compact ? (
          <TouchableOpacity onPress={() => navigate && navigate({ tab: 'transporte' })} accessibilityLabel="Abrir Transporte">
            <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 12 }}>Abrir Transporte ›</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={[styles.meta, { marginBottom: 4 }]}>O que o clima e os alertas podem mudar na sua viagem hoje</Text>
      {list.map((t) => (
        <View key={t.id} style={styles.report}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name={t.icon} size={15} color={RISK[t.risk].color} />
            <Text style={[styles.rowTitle, { flex: 1, marginLeft: 6 }]}>{t.title}</Text>
          </View>
          <Text style={styles.summary}>{t.text}</Text>
          <Text style={styles.meta}>
            <Text style={{ color: RISK[t.risk].color, fontWeight: '800' }}>{RISK[t.risk].label} de atraso</Text> · {t.source}
            {t.related ? ' · ligado ao alerta de clima' : ''}
          </Text>
        </View>
      ))}
    </View>
  );
}

// "Estou seguro": avisa os contatos de uma vez durante um alerta.
function SafeCheck() {
  const { state, dispatch } = useStore();
  const n = (state.contacts || []).length || 12;
  if (state.safeAt)
    return (
      <View style={[styles.safe, { backgroundColor: '#EEF7F1', borderColor: '#BFE3CC' }]}>
        <Ionicons name="checkmark-circle" size={20} color={colors.success} />
        <Text style={[styles.safeText, { color: colors.success }]}>Você marcou que está seguro. Seus contatos foram avisados.</Text>
      </View>
    );
  return (
    <TouchableOpacity
      style={styles.safe}
      activeOpacity={0.85}
      onPress={() =>
        Alert.alert('Estou seguro', `Avisar seus ${n} contatos que você está bem?`, [
          { text: 'Agora não', style: 'cancel' },
          { text: 'Avisar', onPress: () => dispatch({ type: 'MARK_SAFE' }) },
        ])
      }
      accessibilityLabel="Marcar que estou seguro"
    >
      <Ionicons name="heart-circle" size={22} color={colors.success} />
      <View style={{ flex: 1, marginLeft: 8 }}>
        <Text style={styles.safeTitle}>Está tudo bem com você?</Text>
        <Text style={styles.meta}>Toque para avisar seus contatos que você está seguro</Text>
      </View>
      <Text style={styles.safeBtn}>Estou seguro</Text>
    </TouchableOpacity>
  );
}

// Relatos de moradores (moderados). Não são alertas oficiais.
function Reports({ onReport, mine }) {
  return (
    <View style={styles.reports}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name="people" size={16} color={colors.accent} />
        <Text style={[styles.h, { marginBottom: 0, marginLeft: 6, flex: 1, fontSize: 14 }]}>Relatos de moradores</Text>
        <TouchableOpacity onPress={onReport} accessibilityLabel="Enviar relato">
          <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 12 }}>+ Enviar relato</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.meta, { marginBottom: 4 }]}>Pessoas verificadas, revisadas pela moderação. Não substituem o alerta oficial.</Text>
      {[...mine.map((m) => ({ ...m, who: 'Você', time: 'agora', pending: true })), ...REPORTS].map((r) => (
        <View key={r.id} style={styles.report}>
          <Text style={styles.rowTitle}>{r.area}</Text>
          <Text style={styles.summary}>{r.text}</Text>
          <Text style={styles.meta}>
            {r.who} · {r.time}
            {r.pending ? ' · em moderação' : ` · ${r.confirms} confirmaram`}
          </Text>
        </View>
      ))}
    </View>
  );
}

function ReportSheet({ visible, onClose }) {
  const { dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const [area, setArea] = useState('');
  const [text, setText] = useState('');
  const send = () => {
    if (area.trim().length < 3 || text.trim().length < 8) return Alert.alert('Faltou detalhe', 'Diga onde é e o que está acontecendo.');
    dispatch({ type: 'NEWS_REPORT', area: area.trim(), text: text.trim() });
    setArea('');
    setText('');
    onClose();
    Alert.alert('Relato enviado', 'A moderação confere antes de mostrar para os vizinhos. Em perigo, ligue 199 (Defesa Civil) ou 193 (Bombeiros).');
  };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.back}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
          <Text style={styles.h}>Enviar relato</Text>
          <Text style={styles.meta}>Conte o que você está vendo. Relato falso tira pontos do seu Score.</Text>
          <TextInput style={styles.input} placeholder="Onde? (rua, bairro)" placeholderTextColor={colors.muted} value={area} onChangeText={setArea} />
          <TextInput style={[styles.input, { minHeight: 70 }]} placeholder="O que está acontecendo?" placeholderTextColor={colors.muted} value={text} onChangeText={setText} multiline />
          <TouchableOpacity style={styles.send} onPress={send}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>Enviar para a moderação</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function Article({ n, onClose }) {
  const insets = useSafeAreaInsets();
  if (!n) return null;
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
        <Photo uri={n.photo} style={{ width: '100%', height: 240 }} fallback="📰" />
        <TouchableOpacity onPress={onClose} style={[styles.close, { top: insets.top + 10 }]} accessibilityLabel="Voltar">
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ padding: 16 }}>
          <Source n={n} />
          <Text style={[styles.bigTitle, { fontSize: 22 }]}>{n.title}</Text>
          <Text style={styles.meta}>{n.time} · {fmt(n.reads)} leituras</Text>
          <View style={styles.checked}>
            <Ionicons name="sparkles" size={14} color={colors.success} />
            <Text style={{ color: colors.success, fontWeight: '700', fontSize: 12, marginLeft: 6, flex: 1 }}>Checado pela IA Re@lys: confere com outras fontes confiáveis</Text>
          </View>
          <Text style={styles.body}>{n.summary}</Text>
          <Text style={styles.body}>
            Esta é uma notícia de demonstração. Na versão real, o texto completo vem do canal verificado que publicou, com nome do jornalista responsável e data.
          </Text>
          <TouchableOpacity style={[styles.send, { backgroundColor: colors.primary }]} onPress={() => Share.share({ message: `${n.title} (${n.source}, via Re@lys)` }).catch(() => {})}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>Compartilhar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  trust: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF7F1', borderRadius: 12, padding: 9, marginBottom: 10 },
  trustText: { color: colors.success, fontSize: 12, fontWeight: '700', marginLeft: 6, flex: 1 },
  chip: { flexDirection: 'row', alignItems: 'center', height: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: colors.cardAlt, marginRight: 8 },
  chipOn: { backgroundColor: colors.primary },
  chipAlertOn: { backgroundColor: '#B42318' },
  chipText: { color: colors.text, fontWeight: '600', fontSize: 12, marginLeft: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#E5484D', marginLeft: 5 },
  h: { color: colors.text, fontWeight: '800', fontSize: 17, marginBottom: 10 },
  alert: { borderRadius: 18, borderWidth: 1.5, padding: 12, marginBottom: 12 },
  alertIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  alertLevel: { fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },
  alertType: { color: colors.text, fontWeight: '800', fontSize: 16, marginTop: 1 },
  alertArea: { color: colors.text, fontSize: 12, fontWeight: '700', marginTop: 8 },
  alertText: { color: colors.text, fontSize: 13, marginTop: 4, lineHeight: 19 },
  todoNum: { width: 20, height: 20, borderRadius: 10, color: '#fff', textAlign: 'center', fontSize: 11, fontWeight: '800', lineHeight: 20, overflow: 'hidden', marginRight: 8 },
  todoText: { color: colors.text, fontSize: 13, flex: 1, lineHeight: 19 },
  alertBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
  alertBtnLight: { backgroundColor: '#fff', borderWidth: 1 },
  sosBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', backgroundColor: '#D9534F', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, shadowColor: '#D9534F', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  sosText: { color: '#fff', fontWeight: '800', fontSize: 12, marginLeft: 5, letterSpacing: 0.5 },
  alertBtnText: { color: '#fff', fontWeight: '800', fontSize: 12, marginLeft: 5 },
  safe: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: '#BFE3CC', padding: 12, marginBottom: 12 },
  safeTitle: { color: colors.text, fontWeight: '800' },
  safeText: { fontWeight: '700', fontSize: 13, marginLeft: 8, flex: 1 },
  safeBtn: { color: '#fff', backgroundColor: colors.success, fontWeight: '800', fontSize: 12, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, overflow: 'hidden' },
  reports: { backgroundColor: colors.card, borderRadius: 16, padding: 12, marginBottom: 16, ...soft },
  report: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 8 },
  liveCard: { width: 210, marginRight: 10 },
  livePhoto: { width: 210, height: 118, borderRadius: 14 },
  liveTag: { position: 'absolute', top: 8, left: 8, backgroundColor: '#FF3B5C', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  liveTagText: { color: '#fff', fontWeight: '800', fontSize: 10 },
  liveTitle: { color: colors.text, fontWeight: '700', fontSize: 13, marginTop: 6 },
  big: { backgroundColor: colors.card, borderRadius: 18, overflow: 'hidden', marginBottom: 12, ...soft },
  bigPhoto: { width: '100%', height: 190 },
  bigTitle: { color: colors.text, fontWeight: '800', fontSize: 17, lineHeight: 23 },
  summary: { color: colors.muted, fontSize: 13, marginTop: 4, lineHeight: 18 },
  meta: { color: colors.muted, fontSize: 11, marginTop: 4 },
  source: { fontSize: 11, fontWeight: '800', marginLeft: 4 },
  row: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 16, padding: 10, marginBottom: 10, ...soft },
  rowTitle: { color: colors.text, fontWeight: '700', fontSize: 14, lineHeight: 19 },
  rowPhoto: { width: 92, height: 92, borderRadius: 12 },
  back: { flex: 1, backgroundColor: 'rgba(15,20,35,0.35)' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 16 },
  input: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 11, color: colors.text, marginTop: 10, textAlignVertical: 'top' },
  send: { backgroundColor: colors.success, borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: 14 },
  close: { position: 'absolute', left: 14, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  checked: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF7F1', borderRadius: 10, padding: 8, marginTop: 10 },
  body: { color: colors.text, fontSize: 15, lineHeight: 23, marginTop: 12 },
});
