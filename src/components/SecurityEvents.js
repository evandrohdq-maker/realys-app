// Avisos do servidor sobre segurança (só com o servidor no ar):
//  - "caso-urgente": este profissional de plantão é o mais perto de uma vítima;
//  - "conta-bloqueada": a central confirmou chamada falsa;
//  - "alerta" (administradores): novo alerta chega na central na hora.
import { useEffect } from 'react';
import { Alert, Linking } from 'react-native';
import { useStore } from '../store';
import { connectEvents, serverOn } from '../api';

export default function SecurityEvents() {
  const { state, dispatch } = useStore();
  const uid = state.user && state.user.id;
  useEffect(() => {
    if (!uid || !serverOn()) return;
    return connectEvents((e) => {
      const d = e.data || {};
      if (e.type === 'caso-urgente') {
        const l = d.local || {};
        Alert.alert(`🚨 ${d.tipo || 'Pedido de socorro'} · ${d.protocolo}`, `${d.aviso || ''}\n${l.endereco || ''}${d.distanciaKm != null ? `\nA ${String(d.distanciaKm).replace('.', ',')} km de você.` : ''}`, [
          { text: 'Fechar', style: 'cancel' },
          l.lat != null ? { text: 'Abrir rota', onPress: () => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lon}`).catch(() => {}) } : null,
        ].filter(Boolean));
      }
      if (e.type === 'conta-bloqueada') dispatch({ type: 'LOAD_BLOCK', block: { at: Date.now(), reason: d.motivo || 'Chamada de emergência falsa', wallet: state.wallet } });
      if (e.type === 'alerta' || e.type === 'alerta-local' || e.type === 'alerta-acompanhado') dispatch({ type: 'CENTRAL_EVENT', event: e.type, alerta: d });
    });
  }, [uid]);
  return null;
}
