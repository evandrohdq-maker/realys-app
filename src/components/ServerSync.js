// Mantém o app em dia com o servidor do Realyz: catálogo (lojas e produtos de verdade),
// carteira e pedidos. Atualiza ao entrar, a cada minuto e na hora quando chega um aviso de pedido.
// Sem servidor configurado, não faz nada.
import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useStore } from '../store';
import { serverOn, connectEvents } from '../api';
import { usarConta } from '../serverAuth';
import { carregarCatalogo, carregarCarteira, carregarPedidos, conectado } from '../serverShop';
import { carregarPrestadores, carregarVisitas } from '../serverServices';
import { carregarEventos } from '../serverEvents';
import { loadServerTracks } from '../music';
import { aCada } from '../ritmo';

export default function ServerSync() {
  const { state, dispatch } = useStore();
  const uid = state.user && state.user.serverId;
  const stateRef = useRef(state);
  stateRef.current = state;

  // Catálogo público: aparece mesmo para quem ainda não entrou.
  useEffect(() => {
    if (!serverOn()) return;
    carregarCatalogo(dispatch).catch(() => {});
    carregarEventos(dispatch).catch(() => {});
    loadServerTracks().catch(() => {});
    const t = aCada(() => {
      carregarCatalogo(dispatch).catch(() => {});
      carregarEventos(dispatch).catch(() => {});
    }, 120000);
    return () => t.parar();
  }, []);

  useEffect(() => {
    if (!conectado(state)) return;
    usarConta(state.user);
    const tudo = () => {
      carregarCarteira(dispatch).catch(() => {});
      carregarPedidos(dispatch).catch(() => {});
      carregarVisitas(stateRef.current, dispatch).catch(() => {});
    };
    carregarPrestadores(dispatch).catch(() => {});
    const tp = aCada(() => carregarPrestadores(dispatch).catch(() => {}), 120000);
    tudo();
    const t = aCada(tudo, 60000);
    const stop = connectEvents((e) => {
      // Chamado de serviço mudou (aceitou, recusou...) ou chegou pagamento: atualiza visitas e carteira.
      if (e.type === 'call' || e.type === 'payment') return tudo();
      if (e.type !== 'order') return;
      tudo();
      // Loja: chegou pedido novo pelo Realyz.
      const d = e.data || {};
      if (d.buyer) Alert.alert('Novo pedido! 🛍️', `${d.buyer} fez um pedido de R$ ${Number(d.total || 0).toFixed(2).replace('.', ',')}. Veja em Painel da empresa › Pedidos do Realyz.`);
    });
    return () => {
      t.parar();
      tp.parar();
      stop();
    };
  }, [uid]);

  return null;
}
