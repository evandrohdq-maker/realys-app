// Sinal da mensagem no Realyz: pétalas da Lotus (no lugar dos risquinhos de outros apps).
//   reloginho        → escrita sem internet, vai quando a internet voltar
//   1 pétala         → enviada (chegou no servidor do Realyz)
//   2 pétalas        → entregue (chegou no celular da pessoa)
//   2 pétalas douradas → lida (a pessoa abriu a conversa)
import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

export const sinalDe = (m) => (m.pendente ? 'esperando' : m.readAt ? 'lida' : m.deliveredAt ? 'entregue' : 'enviada');
const NOMES = { esperando: 'Esperando a internet', enviada: 'Enviada', entregue: 'Entregue', lida: 'Lida' };

// escuro: em cima da bolha escura (minhas mensagens); claro: em cima do fundo claro (lista de conversas).
export default function Petalas({ m, sinal, escuro = true, size = 11, style }) {
  const s = sinal || sinalDe(m || {});
  const apagada = escuro ? 'rgba(251,248,241,0.62)' : colors.muted;
  const lida = escuro ? colors.gold : colors.primary;
  if (s === 'esperando') {
    return <Ionicons name="time-outline" size={size + 1} color={apagada} style={style} accessibilityLabel={NOMES[s]} />;
  }
  const cor = s === 'lida' ? lida : apagada;
  const w = Math.round(size * 0.62);
  // Pétala: folha com duas pontas arredondadas em cantos opostos.
  const petala = (ang, extra, espelho) => (
    <View
      style={[
        { width: w, height: size, backgroundColor: cor, borderTopLeftRadius: size, borderBottomRightRadius: size, borderTopRightRadius: 1.5, borderBottomLeftRadius: 1.5, transform: espelho ? [{ scaleX: -1 }, { rotate: `${ang}deg` }] : [{ rotate: `${ang}deg` }] },
        extra,
      ]}
    />
  );
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-end', height: size + 1 }, style]} accessible accessibilityLabel={NOMES[s]}>
      {s === 'enviada' ? petala(12) : (
        <>
          {petala(-18)}
          {petala(-18, { marginLeft: -Math.round(w * 0.35) }, true)}
        </>
      )}
    </View>
  );
}
