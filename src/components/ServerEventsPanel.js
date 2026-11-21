// Painel da empresa: eventos de verdade (servidor do Realyz).
// Publicar evento com preço e lotação, ver as vendas e conferir os ingressos na portaria pelo código.
// O Realyz fica com 8% de cada ingresso (mínimo R$ 1,99), descontado do valor da empresa.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Alert, TouchableOpacity } from 'react-native';
import { Text } from '../responsive';
import { useStore } from '../store';
import { api } from '../api';
import { colors, brl } from '../theme';
import { Card, Row, Button, Badge, Input } from './ui';
import { conectado, carregarCarteira } from '../serverShop';
import { carregarEventos } from '../serverEvents';

const toNum = (t) => Number(String(t || '').replace(/[^\d,.]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
const VAZIO = { title: '', when: '', place: '', city: 'Passo Fundo - RS', price: '', capacity: '', detail: '' };

export default function ServerEventsPanel() {
  const { state, dispatch } = useStore();
  const on = conectado(state) && (state.user.roles || []).includes('empresa');
  const [list, setList] = useState(null);
  const [novo, setNovo] = useState(false);
  const [f, setF] = useState(VAZIO);
  const [codigo, setCodigo] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api('GET', '/events/mine').then(setList).catch(() => setList([])), []);
  useEffect(() => {
    if (on) load();
  }, [on]);
  if (!on) return null;

  const publicar = async () => {
    if (f.title.trim().length < 3) return Alert.alert('Nome do evento', 'Escreva o nome do evento.');
    if (!f.when.trim()) return Alert.alert('Quando?', 'Informe o dia e a hora (ex.: Sáb 22/11 · 22h).');
    if (!f.place.trim()) return Alert.alert('Onde?', 'Informe o local.');
    if (!toNum(f.capacity)) return Alert.alert('Lotação', 'Quantos ingressos estão à venda?');
    setBusy(true);
    try {
      await api('POST', '/events', { title: f.title.trim(), detail: f.detail.trim(), when: f.when.trim(), place: f.place.trim(), city: f.city.trim(), price: toNum(f.price), capacity: Math.round(toNum(f.capacity)) });
      setF(VAZIO);
      setNovo(false);
      load();
      carregarEventos(dispatch).catch(() => {});
      Alert.alert('Evento publicado 🎉', 'Ele já aparece em Eventos para todo mundo no Realyz.');
    } catch (e) {
      Alert.alert('Evento não publicado', e.message);
    } finally {
      setBusy(false);
    }
  };

  const conferir = async () => {
    const c = codigo.trim().toUpperCase();
    if (!c) return;
    try {
      const r = await api('POST', `/tickets/${encodeURIComponent(c)}/entrada`);
      setCodigo('');
      Alert.alert('Entrada liberada ✅', `${r.buyer} · ${r.title}`);
      load();
    } catch (e) {
      Alert.alert('Ingresso recusado', e.message);
    }
  };

  const campo = (k, ph, extra = {}) => <Input placeholder={ph} value={f[k]} onChangeText={(v) => setF({ ...f, [k]: v })} style={{ marginTop: 8 }} {...extra} />;

  return (
    <Card>
      <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ fontWeight: '800', color: colors.text, fontSize: 16 }}>🎟️ Eventos e ingressos</Text>
        <TouchableOpacity onPress={() => setNovo(!novo)} accessibilityLabel="Publicar evento">
          <Text style={{ color: colors.primary, fontWeight: '700' }}>{novo ? 'Fechar' : 'Publicar evento'}</Text>
        </TouchableOpacity>
      </Row>
      {novo ? (
        <View style={{ marginBottom: 8 }}>
          {campo('title', 'Nome do evento (ex.: Sertanejo ao vivo)')}
          {campo('when', 'Quando (ex.: Sáb 22/11 · 22h)')}
          {campo('place', 'Local (endereço ou nome da casa)')}
          {campo('city', 'Cidade')}
          <Row>
            <Input style={{ flex: 1, marginTop: 8, marginRight: 8 }} placeholder="Preço (R$, 0 = grátis)" keyboardType="decimal-pad" value={f.price} onChangeText={(v) => setF({ ...f, price: v })} />
            <Input style={{ flex: 1, marginTop: 8 }} placeholder="Lotação" keyboardType="number-pad" value={f.capacity} onChangeText={(v) => setF({ ...f, capacity: v })} />
          </Row>
          {campo('detail', 'Detalhes (atrações, promoção, lista VIP...)')}
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6 }}>O Realyz fica com 8% de cada ingresso vendido (no mínimo R$ 1,99). O resto entra no seu saldo na hora da venda.</Text>
          <Button title={busy ? 'Publicando…' : 'Publicar no Realyz'} onPress={publicar} disabled={busy} style={{ marginTop: 10 }} />
        </View>
      ) : null}

      <Row style={{ marginTop: 4 }}>
        <Input style={{ flex: 1, marginRight: 8 }} placeholder="Portaria: código do ingresso (RZ...)" autoCapitalize="characters" value={codigo} onChangeText={setCodigo} />
        <Button small title="Conferir" onPress={conferir} />
      </Row>

      {list && !list.length && !novo ? <Text style={{ color: colors.muted, marginTop: 10 }}>Nenhum evento ainda. Publique o primeiro e venda ingressos pelo Realyz.</Text> : null}
      {(list || []).map((e) => (
        <View key={e.id} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text numberOfLines={1} style={{ fontWeight: '700', color: colors.text, flex: 1 }}>{e.title}</Text>
            <Badge label={e.status === 'aberto' ? 'Vendendo' : e.status === 'esgotado' ? 'Esgotado' : 'Encerrado'} color={e.status === 'aberto' ? colors.success : colors.primary} />
          </Row>
          <Text style={{ color: colors.muted, fontSize: 12.5 }}>{e.when} · {e.place}</Text>
          <Text style={{ color: colors.text, fontSize: 13, marginTop: 2 }}>
            {e.sold} de {e.capacity} vendidos · {brl(e.price)} cada · você recebeu {brl(e.revenue || 0)}
          </Text>
        </View>
      ))}
    </Card>
  );
}
