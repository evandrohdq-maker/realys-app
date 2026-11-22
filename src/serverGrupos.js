// Canais de grupo de verdade (Arena Gamer, Hub de Negócios): com conta real, a mensagem vai para o
// servidor e chega para todo mundo do canal. Enquanto o canal está aberto, o app confere a cada 4 s.
// O servidor guarda no máximo as últimas 2.000 mensagens de cada canal e limpa o canal todo mês.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './responsive';
import { api, serverOn } from './api';
import { salvarConversa } from './salvarConversas';

const limpa = (s) => String(s || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
export const chaveGrupo = (tipo, grupo, canal) => `${tipo}:${limpa(grupo)}:${limpa(canal)}`;

export function useGrupoMsgs(chave) {
  const [msgs, setMsgs] = useState([]);
  const ultimo = useRef(0);
  const on = !!chave && serverOn();
  const load = useCallback(() => {
    if (!on) return;
    api('GET', `/grupos/${encodeURIComponent(chave)}/msgs?depois=${ultimo.current}`)
      .then((l) => {
        if (!l || !l.length) return;
        ultimo.current = l[l.length - 1].at;
        setMsgs((x) => [...x, ...l.filter((m) => !x.some((y) => y.id === m.id))].slice(-500));
      })
      .catch(() => {});
  }, [chave, on]);
  useEffect(() => {
    setMsgs([]);
    ultimo.current = 0;
    if (!on) return undefined;
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [chave, on]);
  const enviar = (text) => api('POST', `/grupos/${encodeURIComponent(chave)}/msgs`, { text }).then((m) => setMsgs((x) => [...x, m]));
  return { on, msgs, enviar, recarregar: load };
}

// Faixa do canal: do dia 24 em diante, o aviso da limpeza; sempre, o botão de salvar o canal.
export function GrupoAviso({ chave, nome, cor = '#7A5A20' }) {
  if (!chave || !serverOn()) return null;
  const aviso = new Date().getDate() >= 24;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: aviso ? '#FBF1E1' : 'transparent', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8 }}>
      {aviso ? <Ionicons name="time-outline" size={16} color={cor} /> : null}
      <Text style={{ flex: 1, color: cor, fontSize: 12, marginLeft: aviso ? 6 : 0 }} numberOfLines={2}>
        {aviso ? 'No dia 1º, as mensagens antigas deste canal saem do Realyz.' : 'Canais guardam as últimas 2.000 mensagens e são limpos todo mês.'}
      </Text>
      <TouchableOpacity onPress={() => salvarConversa(`/grupos/${encodeURIComponent(chave)}/exportar?nome=${encodeURIComponent(nome || '')}`, `canal-${nome || 'grupo'}`)} accessibilityLabel="Salvar canal">
        <Text style={{ color: '#B8860B', fontWeight: '800', fontSize: 12.5, marginLeft: 8 }}>Salvar canal</Text>
      </TouchableOpacity>
    </View>
  );
}
