// "Para quando?" antes de chamar um prestador pela Lotus (ou pela busca de serviços).
// Opções: Agora (o mais rápido), um turno de hoje/amanhã/outro dia (manhã, tarde, noite),
// um horário exato, ou "A combinar com o prestador" (vocês acertam pela conversa do pedido).
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../responsive';
import { colors } from '../theme';
import { WEEKDAYS_SHORT, startOfDay, addDays, at } from '../agenda';

export const TURNOS = [
  { key: 'manha', label: 'Manhã', faixa: '8h às 12h', ini: 8, fim: 12, icon: 'partly-sunny-outline', frase: 'de manhã' },
  { key: 'tarde', label: 'Tarde', faixa: '13h às 18h', ini: 13, fim: 18, icon: 'sunny-outline', frase: 'à tarde' },
  { key: 'noite', label: 'Noite', faixa: '18h às 21h', ini: 18, fim: 21, icon: 'moon-outline', frase: 'à noite' },
];
const HORAS = Array.from({ length: 14 }, (_, i) => 7 + i); // 7h às 20h

const dd = (ts) => {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const dayName = (off, ts) => (off === 0 ? 'hoje' : off === 1 ? 'amanhã' : `${WEEKDAYS_SHORT[new Date(ts).getDay()].toLowerCase()} ${dd(ts)}`);

// Texto do horário escolhido (vai para o pedido e para a fala da Lotus).
export function whenText(c) {
  if (!c || c.kind === 'agora') return null;
  if (c.kind === 'combinar') return 'a combinar com o prestador';
  const day = addDays(startOfDay(Date.now()), c.off);
  if (c.kind === 'turno') {
    const t = TURNOS.find((x) => x.key === c.turno);
    return `${dayName(c.off, day)} ${t.frase} (${t.faixa})`;
  }
  return `${dayName(c.off, day)} às ${c.hora}h`;
}
// Quando começa (para a agenda do prestador).
export function whenStart(c) {
  if (!c || c.kind === 'agora' || c.kind === 'combinar') return null;
  const day = addDays(startOfDay(Date.now()), c.off);
  if (c.kind === 'turno') return at(day, TURNOS.find((x) => x.key === c.turno).ini);
  return at(day, c.hora);
}

export default function WhenPicker({ provider, eta, onPick, onClose }) {
  const insets = useSafeAreaInsets();
  const [off, setOff] = useState(0); // 0 hoje, 1 amanhã, 2… outros dias
  const [choice, setChoice] = useState({ kind: 'agora' });
  useEffect(() => {
    setOff(0);
    setChoice({ kind: 'agora' });
  }, [provider && provider.id]);
  if (!provider) return null;
  const now = new Date();
  const nowH = now.getHours() + now.getMinutes() / 60;
  const first = String(provider.name || '').split(' ')[0];
  const days = Array.from({ length: 8 }, (_, i) => ({ off: i, ts: addDays(startOfDay(Date.now()), i) }));
  const turnoOk = (t) => off > 0 || nowH < t.fim - 1;
  const horaOk = (h) => off > 0 || h > nowH + 1;
  const sel = (c) => setChoice(c);
  const isSel = (c) => choice.kind === c.kind && choice.off === c.off && choice.turno === c.turno && choice.hora === c.hora;
  const resumo = choice.kind === 'agora' ? `agora${eta ? ` (chega em ~${eta} min)` : ''}` : whenText(choice);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={st.dim} activeOpacity={1} onPress={onClose} accessibilityLabel="Fechar" />
      <View style={[st.sheet, { paddingBottom: 14 + insets.bottom }]}>
        <View style={st.grab} />
        <Text style={st.title}>Para quando você quer {first}?</Text>
        <Text style={st.sub}>Escolha um turno, um horário, ou deixe para combinar com o prestador.</Text>
        <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={[st.big, choice.kind === 'agora' && st.bigOn]} onPress={() => sel({ kind: 'agora' })} accessibilityLabel="Agora, o mais rápido">
            <Ionicons name="flash" size={18} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={st.bigTitle}>Agora</Text>
              <Text style={st.bigSub}>O mais rápido{eta ? ` · chega em ~${eta} min` : ''}</Text>
            </View>
            {choice.kind === 'agora' ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
          </TouchableOpacity>

          <Text style={st.h}>Agendar</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 4 }}>
            {days.map((d) => {
              const on = off === d.off;
              return (
                <TouchableOpacity key={d.off} style={[st.day, on && st.dayOn]} onPress={() => (setOff(d.off), choice.kind !== 'combinar' && choice.kind !== 'agora' && setChoice({ kind: 'turno', off: d.off, turno: 'tarde' }))} accessibilityLabel={dayName(d.off, d.ts)}>
                  <Text style={[st.dayTop, on && st.dayTxtOn]}>{d.off === 0 ? 'Hoje' : d.off === 1 ? 'Amanhã' : WEEKDAYS_SHORT[new Date(d.ts).getDay()]}</Text>
                  <Text style={[st.dayNum, on && st.dayTxtOn]}>{dd(d.ts)}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={st.row}>
            {TURNOS.map((t) => {
              const ok = turnoOk(t);
              const c = { kind: 'turno', off, turno: t.key };
              const on = isSel(c);
              return (
                <TouchableOpacity key={t.key} disabled={!ok} style={[st.turno, on && st.turnoOn, !ok && { opacity: 0.35 }]} onPress={() => sel(c)} accessibilityLabel={`${t.label}, ${t.faixa}`}>
                  <Ionicons name={t.icon} size={17} color={on ? colors.primary : colors.text} />
                  <Text style={[st.turnoTitle, on && { color: colors.primary }]}>{t.label}</Text>
                  <Text style={st.turnoSub}>{t.faixa}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={st.h2}>Ou um horário exato</Text>
          <View style={st.hours}>
            {HORAS.map((h) => {
              const ok = horaOk(h);
              const c = { kind: 'hora', off, hora: h };
              const on = isSel(c);
              return (
                <TouchableOpacity key={h} disabled={!ok} style={[st.hour, on && st.hourOn, !ok && { opacity: 0.3 }]} onPress={() => sel(c)} accessibilityLabel={`${h} horas`}>
                  <Text style={[st.hourTxt, on && { color: colors.primary, fontWeight: '800' }]}>{h}h</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={[st.big, { marginTop: 12 }, choice.kind === 'combinar' && st.bigOn]} onPress={() => sel({ kind: 'combinar' })} accessibilityLabel="A combinar com o prestador">
            <Ionicons name="chatbubbles-outline" size={18} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={st.bigTitle}>A combinar com o prestador</Text>
              <Text style={st.bigSub}>Vocês acertam o melhor horário pela conversa do pedido</Text>
            </View>
            {choice.kind === 'combinar' ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
          </TouchableOpacity>
        </ScrollView>

        <TouchableOpacity style={st.go} onPress={() => onPick(choice)} accessibilityLabel={`Chamar ${first}: ${resumo}`}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={st.goTxt}>Chamar {first} · {resumo}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  dim: { flex: 1, backgroundColor: 'rgba(241,235,221,0.55)' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 8, borderWidth: 1, borderColor: '#EAD7A4' },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 10 },
  title: { color: colors.text, fontWeight: '800', fontSize: 18 },
  sub: { color: colors.muted, fontSize: 12.5, marginTop: 2, marginBottom: 10 },
  h: { color: colors.text, fontWeight: '800', fontSize: 14, marginTop: 14, marginBottom: 8 },
  h2: { color: colors.muted, fontWeight: '700', fontSize: 12, marginTop: 12, marginBottom: 6 },
  big: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 16, padding: 12 },
  bigOn: { borderColor: colors.gold, backgroundColor: '#FFF8E4' },
  bigTitle: { color: colors.text, fontWeight: '800', fontSize: 14.5 },
  bigSub: { color: colors.muted, fontSize: 12, marginTop: 1 },
  day: { width: 64, alignItems: 'center', paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, marginRight: 6 },
  dayOn: { borderColor: colors.gold, backgroundColor: '#F6EDD6' },
  dayTop: { color: colors.muted, fontSize: 11.5, fontWeight: '700' },
  dayNum: { color: colors.text, fontSize: 13, fontWeight: '800', marginTop: 2 },
  dayTxtOn: { color: colors.primary },
  row: { flexDirection: 'row', marginTop: 8 },
  turno: { flex: 1, alignItems: 'center', paddingVertical: 10, marginHorizontal: 3, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  turnoOn: { borderColor: colors.gold, backgroundColor: '#FFF8E4' },
  turnoTitle: { color: colors.text, fontWeight: '800', fontSize: 13, marginTop: 3 },
  turnoSub: { color: colors.muted, fontSize: 11 },
  hours: { flexDirection: 'row', flexWrap: 'wrap' },
  hour: { paddingVertical: 6, paddingHorizontal: 11, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, marginRight: 6, marginBottom: 6 },
  hourOn: { borderColor: colors.gold, backgroundColor: '#FFF8E4' },
  hourTxt: { color: colors.text, fontSize: 12.5, fontWeight: '600' },
  go: { marginTop: 12, backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' },
  goTxt: { color: colors.onPrimary, fontWeight: '800', fontSize: 14 },
});
