// Horário de trabalho do prestador: ele programa os dias e as horas e liga "ficar disponível
// sozinho". No horário, o Realyz deixa ele disponível (aparece para os clientes e recebe os chamados
// por notificação, mesmo com o app fechado); fora do horário, desliga. Pode passar da meia-noite.
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../responsive';
import { useStore } from '../store';
import { colors, soft } from '../theme';
import { WEEKDAYS_SHORT } from '../agenda';
import { api } from '../api';
import { conectado } from '../serverShop';
import { getDevicePoint } from '../geo';

// Mesma regra do servidor (horário do aparelho).
export function emHorario(horario, d = new Date()) {
  if (!Array.isArray(horario) || horario.length !== 7) return false;
  const dia = d.getDay();
  const hora = d.getHours() + d.getMinutes() / 60;
  const hoje = horario[dia];
  if (hoje && hoje.on && (hoje.to > hoje.from ? hora >= hoje.from && hora < hoje.to : hora >= hoje.from)) return true;
  const ontem = horario[(dia + 6) % 7];
  return !!(ontem && ontem.on && ontem.to <= ontem.from && hora < ontem.to);
}
const hh = (h) => `${String(Math.floor(h) % 24).padStart(2, '0')}h`;

export default function HorarioTrabalho() {
  const { state, dispatch } = useStore();
  const [aberto, setAberto] = useState(false);
  const auto = !!state.autoHorario;
  const horas = state.workHours;
  const on = conectado(state);
  const enviado = useRef('');

  // Liga e desliga sozinho no horário (confere a cada minuto).
  useEffect(() => {
    if (!auto) return undefined;
    const tick = () => {
      const deve = emHorario(horas);
      if (deve !== !!state.available) dispatch({ type: 'SET_AVAILABLE', on: deve });
    };
    tick();
    const t = setInterval(tick, 60000);
    return () => clearInterval(t);
  }, [auto, horas, state.available]);

  // Conta real: o servidor guarda o horário e põe o prestador disponível mesmo com o app fechado.
  useEffect(() => {
    if (!on) return;
    const corpo = JSON.stringify({ auto, horario: horas });
    if (corpo === enviado.current) return;
    const t = setTimeout(() => {
      api('PUT', '/providers/me/horario', { auto, horario: horas })
        .then(() => {
          enviado.current = corpo;
          // Última posição conhecida (o servidor usa para mostrar o prestador perto dos clientes).
          if (auto) getDevicePoint().then((pt) => pt && api('POST', '/providers/me/location', { lat: pt.lat, lng: pt.lon, available: emHorario(horas) }).catch(() => {})).catch(() => {});
        })
        .catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [on, auto, horas]);

  const set = (day, patch) => dispatch({ type: 'AGENDA_HOURS', day, patch });
  const mexe = (day, campo, delta) => {
    const h = horas[day];
    const v = (((h[campo] + delta) % 24) + 24) % 24 || (campo === 'to' ? 24 : 0);
    if (v === h[campo === 'to' ? 'from' : 'to']) return;
    set(day, { [campo]: v });
  };
  const agora = emHorario(horas);
  const resumo = horas.map((h, i) => (h.on ? `${WEEKDAYS_SHORT[i]} ${hh(h.from)}–${hh(h.to)}` : null)).filter(Boolean).join(' · ');

  return (
    <View style={st.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name="time-outline" size={22} color={colors.primary} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={st.title}>Ficar disponível sozinho no meu horário</Text>
          <Text style={st.muted}>
            {auto ? (agora ? '🟢 No horário agora: recebendo chamados e notificações' : '⚪ Fora do horário: sem chamados até o próximo turno') : 'Programe seus dias e horas. O celular começa a receber os chamados quando o turno começa, mesmo com o app fechado.'}
          </Text>
        </View>
        <Switch
          value={auto}
          onValueChange={(v) => {
            if (v && !horas.some((h) => h.on)) return Alert.alert('Escolha os dias', 'Marque pelo menos um dia de trabalho.');
            dispatch({ type: 'SET_AUTO_HORARIO', on: v });
          }}
          trackColor={{ true: colors.primary }}
        />
      </View>
      <TouchableOpacity onPress={() => setAberto((x) => !x)} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
        <Text style={{ color: colors.text, fontSize: 12.5, flex: 1 }} numberOfLines={aberto ? undefined : 2}>{resumo || 'Nenhum dia marcado'}</Text>
        <Text style={{ color: colors.primary, fontWeight: '800', marginLeft: 8 }}>{aberto ? 'Fechar' : 'Editar horário'}</Text>
      </TouchableOpacity>
      {aberto
        ? horas.map((h, i) => (
            <View key={i} style={st.dia}>
              <TouchableOpacity onPress={() => set(i, { on: !h.on })} style={[st.diaBtn, h.on && st.diaOn]} accessibilityLabel={`${WEEKDAYS_SHORT[i]}: ${h.on ? 'trabalho' : 'folga'}`}>
                <Text style={{ color: h.on ? '#fff' : colors.muted, fontWeight: '800', fontSize: 12 }}>{WEEKDAYS_SHORT[i]}</Text>
              </TouchableOpacity>
              {h.on ? (
                <>
                  <Passo label={hh(h.from)} onMenos={() => mexe(i, 'from', -1)} onMais={() => mexe(i, 'from', 1)} />
                  <Text style={st.muted}> às </Text>
                  <Passo label={hh(h.to)} onMenos={() => mexe(i, 'to', -1)} onMais={() => mexe(i, 'to', 1)} />
                  {h.to <= h.from ? <Text style={[st.muted, { marginLeft: 6 }]}>(dia seguinte)</Text> : null}
                </>
              ) : (
                <Text style={[st.muted, { marginLeft: 10 }]}>Folga</Text>
              )}
            </View>
          ))
        : null}
    </View>
  );
}

function Passo({ label, onMenos, onMais }) {
  return (
    <View style={st.passo}>
      <TouchableOpacity onPress={onMenos} hitSlop={6} accessibilityLabel="Uma hora antes"><Ionicons name="remove" size={16} color={colors.primary} /></TouchableOpacity>
      <Text style={{ color: colors.text, fontWeight: '800', marginHorizontal: 6, minWidth: 30, textAlign: 'center' }}>{label}</Text>
      <TouchableOpacity onPress={onMais} hitSlop={6} accessibilityLabel="Uma hora depois"><Ionicons name="add" size={16} color={colors.primary} /></TouchableOpacity>
    </View>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12, ...soft },
  title: { color: colors.text, fontWeight: '800', fontSize: 14.5 },
  muted: { color: colors.muted, fontSize: 12.5 },
  dia: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  diaBtn: { width: 46, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', marginRight: 8 },
  diaOn: { backgroundColor: colors.primary },
  passo: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#EFE6CC', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5 },
});
