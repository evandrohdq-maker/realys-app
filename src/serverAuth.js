// Conta no servidor do Realyz (api.realyz.com.br).
//
// O cadastro e a entrada continuam passando pelas telas de sempre; quando o servidor está ligado,
// a conta também é criada/aberta lá, e o app guarda a sessão daquela conta no cofre do Android.
// Sem servidor configurado, nada disso roda e o app segue no modo demonstração.
import * as ImagePicker from 'expo-image-picker';
import { serverOn, login as apiLogin, signup as apiSignup, verificarAparelho, setServerAccount, logout as apiLogout, ApiError } from './api';
import { TERMO_ADESAO_VERSAO } from './termoAdesao';

// Aparelho novo: o servidor pede uma foto do rosto para conferir com o cadastro (não refaz o cadastro).
async function fotoDoRosto() {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (perm.status !== 'granted') throw new ApiError(403, 'Libere a câmera para confirmar seu rosto neste aparelho.', 'biometria_aparelho');
  const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: false, cameraType: ImagePicker.CameraType.front });
  if (r.canceled) return null;
  return (await fetch(r.assets[0].uri)).arrayBuffer();
}

// Entra no servidor com usuário/CPF/CNPJ e senha. Devolve o usuário do servidor (ou null sem servidor).
export async function entrarNoServidor(loginText, password) {
  if (!serverOn()) return null;
  try {
    return await apiLogin(loginText, password);
  } catch (e) {
    if (e.code !== 'biometria_aparelho') throw e;
    const buf = await fotoDoRosto();
    if (!buf) throw new ApiError(403, 'Confirme seu rosto para entrar por este aparelho.', 'biometria_aparelho');
    const token = await verificarAparelho(loginText, buf);
    return apiLogin(loginText, password, 'Android', token);
  }
}

// Cria a conta no servidor com os dados do cadastro. Devolve o usuário do servidor (ou null sem servidor).
export async function cadastrarNoServidor(acc, password) {
  if (!serverOn()) return null;
  return apiSignup({
    kind: acc.kind === 'empresa' ? 'empresa' : 'pessoa',
    name: acc.name,
    doc: acc.doc,
    username: acc.username,
    email: acc.email,
    phone: acc.phone,
    password,
    nascimento: acc.kind === 'empresa' ? undefined : acc.birth,
    aceiteTermos: TERMO_ADESAO_VERSAO,
    socialClass: acc.social && acc.social.cls ? acc.social.cls : undefined,
    about: acc.about || '',
  });
}

// Conta que já existia só neste celular (antes do servidor): na próxima entrada com senha,
// ela é criada no servidor com os mesmos dados. Se já existe lá, só entra.
export async function entrarOuMigrar(loginText, password, acc) {
  try {
    return await entrarNoServidor(loginText, password);
  } catch (e) {
    if (e.status !== 401 || !acc) throw e;
    try {
      return await cadastrarNoServidor(acc, password);
    } catch (e2) {
      if (e2.status === 409) throw e; // já existe no servidor com outra senha: vale a mensagem do login
      throw e2;
    }
  }
}

// Troca a conta usada nas chamadas ao servidor (cada conta salva tem a sua sessão).
export const usarConta = (user) => setServerAccount(user && user.serverId);
export const sairDoServidor = () => (serverOn() ? apiLogout() : Promise.resolve());

// Conta que existe no servidor mas não neste celular (cadastrada em outro aparelho).
export function userFromServer(u) {
  const fmt = (d, n) => (n === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4'));
  const doc = String(u.doc || '');
  if (u.kind === 'empresa') return { id: u.id, serverId: u.id, name: u.name, username: u.username, verified: true, roles: ['empresa', 'fornecedor', 'cliente'], cnpj: fmt(doc, 14) };
  return { id: u.id, serverId: u.id, name: u.name, username: u.username, verified: true, roles: ['cliente', 'prestador'], cpf: fmt(doc, 11), cnpj: '12.345.678/0001-90', about: u.about || '' };
}
