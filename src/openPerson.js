// Tocar no nome (ou na foto) de alguém em qualquer lugar do app: stories, Reels, feed, depoimentos,
// Arena... Um caminho só para todos:
//  - pessoa da rede → abre o perfil (src/components/People.js › UserProfileModal). Se for amigo, abre o
//    perfil completo; se não for, abre só a prévia, com o botão de adicionar.
//  - empresa ou artista → abre a página da empresa.
//  - prestador de serviço → abre só a PRÉVIA do perfil de trabalho (sem adicionar, sem contato direto:
//    serviço só se contrata pelo Realyz).
//  - eu mesmo → vai para a aba Perfil.
import { Alert } from 'react-native';
import { useStore } from './store';
import { memberById, memberByName } from './people';
import { artists } from './extraData';

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Quem é: { kind: 'me' | 'member' | 'company' | null, id }.
export function resolvePerson(state, { id, name } = {}) {
  const myName = state.user && state.user.name;
  if (id === 'me' || (name && myName && norm(name) === norm(myName))) return { kind: 'me' };
  const pv = (state.providers || []).find((x) => (id && x.id === id) || (name && norm(x.name) === norm(name)));
  if (pv) return { kind: 'provider', id: pv.id };
  const m = (id && memberById(id)) || (name && memberByName(name));
  if (m) return { kind: 'member', id: m.id };
  const co =
    (state.stores || []).find((x) => (id && x.id === id) || (name && norm(x.name) === norm(name))) ||
    artists.find((a) => (id && a.id === id) || (name && norm(a.name) === norm(name)));
  if (co) return { kind: 'company', id: co.id };
  return { kind: null };
}

export function useOpenPerson() {
  const { state, dispatch } = useStore();
  return (who, { onLeave } = {}) => {
    const r = resolvePerson(state, who);
    if (r.kind === 'provider') return dispatch({ type: 'PREVIEW_PROVIDER', id: r.id }), true;
    if (r.kind === 'member') return dispatch({ type: 'OPEN_PROFILE', id: r.id }), true;
    if (r.kind === 'company') {
      onLeave && onLeave();
      return dispatch({ type: 'OPEN_COMPANY', id: r.id }), true;
    }
    if (r.kind === 'me') {
      onLeave && onLeave();
      return dispatch({ type: 'NAV_REQUEST', go: { tab: 'perfil' } }), true;
    }
    Alert.alert(who && who.name ? who.name : 'Perfil', 'Essa pessoa ainda não tem um perfil aberto no Realyz.');
    return false;
  };
}
