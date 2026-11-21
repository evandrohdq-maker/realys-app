// Mantém o app em dia com o servidor do Re@lys: catálogo (lojas e produtos de verdade),
// carteira e pedidos. Atualiza ao entrar, a cada minuto e na hora quando chega um aviso de pedido.
// Sem servidor configurado, não faz nada.
import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useStore } from '../store';
import { serverOn, connectEvents } from '../api';
import { usarConta } from '../serverAuth';
import { carregarCatalogo, carregarCarteira, carregarPedidos, conectado } from '../serverShop';

export default function ServerSync() {
  const { state, dispatch } = useStore();
  const uid = state.user && state.user.serverId;

  // Catálogo público: aparece mesmo para quem ainda não entrou.
  useEffect(() => {
    if (!serverOn()) return;
    carregarCatalogo(dispatch).catch(() => {});
    const t = setInterval(() => carregarCatalogo(dispatch).catch(() => {}), 120000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!conectado(state)) return;
    usarConta(state.user);
    const tudo = () => {
      carregarCarteira(dispatch).catch(() => {});
      carregarPedidos(dispatch).catch(() => {});
    };
    tudo();
    const t = setInterval(tudo, 60000);
    const stop = connectEvents((e) => {
      if (e.type !== 'order') return;
      tudo();
      // Loja: chegou pedido novo pelo Re@lys.
      if (e.buyer) Alert.alert('Novo pedido! 🛍️', `${e.buyer} fez um pedido de R$ ${Number(e.total || 0).toFixed(2).replace('.', ',')}. Veja em Painel da empresa › Pedidos do Re@lys.`);
    });
    return () => {
      clearInterval(t);
      stop();
    };
  }, [uid]);

  return null;
}
