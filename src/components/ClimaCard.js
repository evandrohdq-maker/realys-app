// Clima de verdade no local do usuário (aba Clima das Notícias): agora, próximas horas e 7 dias.
// compact: só uma linha (para a aba Destaques).
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../responsive';
import { colors, soft } from '../theme';
import { getForecast, iconeDoCodigo } from '../weather';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const nomeDia = (iso, i) => (i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : DIAS[new Date(iso + 'T12:00:00').getDay()]);

export default function ClimaCard({ compact, onOpen }) {
  const [f, setF] = useState(null);
  const [estado, setEstado] = useState('carregando'); // carregando | ok | sem
  const carregar = (force) => {
    setEstado((e) => (f ? e : 'carregando'));
    getForecast({ force })
      .then((x) => {
        setF(x);
        setEstado(x ? 'ok' : 'sem');
      })
      .catch(() => setEstado('sem'));
  };
  useEffect(() => carregar(false), []);

  if (estado === 'carregando' && !f) return compact ? null : <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />;
  if (!f) {
    return compact ? null : (
      <View style={st.card}>
        <Text style={st.meta}>Não consegui ver o clima agora. Ligue a localização do celular para o Realyz e toque em atualizar.</Text>
        <TouchableOpacity onPress={() => carregar(true)} style={{ marginTop: 8 }} accessibilityLabel="Atualizar o clima">
          <Text style={{ color: colors.primary, fontWeight: '800' }}>Atualizar</Text>
        </TouchableOpacity>
      </View>
    );
  }
  const hoje = f.dias[0];
  if (compact) {
    return (
      <TouchableOpacity style={st.linha} onPress={onOpen} activeOpacity={0.85} accessibilityLabel="Ver o clima">
        <Ionicons name={iconeDoCodigo(f.agora.code, f.agora.isDay)} size={20} color={colors.primary} />
        <Text style={st.linhaText} numberOfLines={1}>
          <Text style={{ fontWeight: '800', color: colors.text }}>{f.agora.temp}°</Text> {f.agora.desc}{hoje ? ` · ${hoje.max}°/${hoje.min}°` : ''}{hoje && hoje.chuva >= 30 ? ` · chuva ${hoje.chuva}%` : ''}{f.cidade ? ` · ${f.cidade.split(' - ')[0]}` : ''}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={colors.muted} />
      </TouchableOpacity>
    );
  }
  return (
    <View style={st.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name={iconeDoCodigo(f.agora.code, f.agora.isDay)} size={46} color={colors.primary} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={st.temp}>{f.agora.temp}°</Text>
          <Text style={st.desc}>{f.agora.desc}{f.cidade ? ` · ${f.cidade}` : ''}</Text>
        </View>
        <TouchableOpacity onPress={() => carregar(true)} accessibilityLabel="Atualizar o clima" style={{ padding: 6 }}>
          <Ionicons name="refresh" size={20} color={colors.muted} />
        </TouchableOpacity>
      </View>
      <Text style={[st.meta, { marginTop: 6 }]}>
        Sensação {f.agora.sensacao}° · Umidade {f.agora.umidade}% · Vento {f.agora.vento} km/h{hoje ? ` · Sol ${hoje.nascer}–${hoje.por}` : ''}{hoje && hoje.uv != null ? ` · UV ${Math.round(hoje.uv)}` : ''}
      </Text>

      <Text style={st.h}>Próximas horas</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {f.horas.map((h, i) => (
          <View key={i} style={st.hora}>
            <Text style={st.meta}>{i === 0 ? 'Agora' : h.hora}</Text>
            <Ionicons name={iconeDoCodigo(h.code, true)} size={20} color={colors.primary} style={{ marginVertical: 4 }} />
            <Text style={st.horaT}>{h.temp}°</Text>
            {h.chuva >= 20 ? <Text style={[st.meta, { color: '#2F74D0' }]}>{h.chuva}%</Text> : null}
          </View>
        ))}
      </ScrollView>

      <Text style={st.h}>Próximos 7 dias</Text>
      {f.dias.map((d, i) => (
        <View key={d.data} style={[st.dia, i > 0 && st.diaLinha]}>
          <Text style={st.diaNome}>{nomeDia(d.data, i)}</Text>
          <Ionicons name={iconeDoCodigo(d.code, true)} size={20} color={colors.primary} />
          <Text style={[st.meta, { flex: 1, marginLeft: 8 }]} numberOfLines={1}>{d.desc}{d.chuva >= 20 ? ` · ${d.chuva}%` : ''}</Text>
          <Text style={st.diaT}>{d.max}°</Text>
          <Text style={[st.diaT, { color: colors.muted, marginLeft: 8 }]}>{d.min}°</Text>
        </View>
      ))}
      <Text style={[st.meta, { marginTop: 8, fontSize: 11 }]}>Previsão Open-Meteo para a sua localização. Alertas oficiais do INMET na aba Alertas.</Text>
    </View>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 14, marginBottom: 14, ...soft },
  temp: { color: colors.text, fontSize: 38, fontWeight: '900', lineHeight: 42 },
  desc: { color: colors.text, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 12.5 },
  h: { color: colors.text, fontWeight: '800', fontSize: 15, marginTop: 14, marginBottom: 6 },
  hora: { alignItems: 'center', width: 58 },
  horaT: { color: colors.text, fontWeight: '800' },
  dia: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  diaLinha: { borderTopWidth: 1, borderTopColor: colors.border },
  diaNome: { color: colors.text, fontWeight: '700', width: 66 },
  diaT: { color: colors.text, fontWeight: '800' },
  linha: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 10, ...soft },
  linhaText: { flex: 1, color: colors.muted, marginLeft: 8 },
});
