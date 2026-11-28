// Buscas recentes (como no Instagram): o que a pessoa procurou por último fica na busca, com um X para
// tirar cada uma e "Limpar tudo". Fica só neste celular, separado por conta.
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MAX = 15;
const chave = (dono) => 'rz:buscas-recentes:' + (dono || 'anon');
let cache = { dono: null, lista: [] };
const subs = new Set();
const avisa = () => subs.forEach((fn) => fn(cache.lista));

async function carregar(dono) {
  if (cache.dono === dono) return cache.lista;
  let lista = [];
  try {
    lista = JSON.parse((await AsyncStorage.getItem(chave(dono))) || '[]');
  } catch (e) {}
  cache = { dono, lista: Array.isArray(lista) ? lista : [] };
  avisa();
  return cache.lista;
}
function gravar(dono, lista) {
  cache = { dono, lista };
  avisa();
  AsyncStorage.setItem(chave(dono), JSON.stringify(lista)).catch(() => {});
}

// item: { texto } (uma busca digitada) ou { texto, sub, foto, abrir } (um perfil aberto pela busca).
export async function guardarBusca(dono, item) {
  const texto = String((item && item.texto) || '').trim();
  if (!texto) return;
  const lista = await carregar(dono);
  const igual = (x) => x.texto.toLowerCase() === texto.toLowerCase() && (x.abrir || null) === (item.abrir || null);
  gravar(dono, [{ ...item, texto, at: Date.now() }, ...lista.filter((x) => !igual(x))].slice(0, MAX));
}
export function tirarBusca(dono, at) {
  gravar(dono, cache.lista.filter((x) => x.at !== at));
}
export function limparBuscas(dono) {
  gravar(dono, []);
}

export function useBuscasRecentes(dono) {
  const [lista, setLista] = useState(cache.dono === dono ? cache.lista : []);
  useEffect(() => {
    subs.add(setLista);
    carregar(dono).then(setLista);
    return () => subs.delete(setLista);
  }, [dono]);
  return lista;
}
