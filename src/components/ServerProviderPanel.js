// Painel do prestador: chamados de clientes de verdade, pelo servidor do Realyz.
// 1. Cadastro: tipo de serviço, o que faz, preço e taxa de visita (o prestador define).
// 2. Ficar disponível: o app manda a posição do GPS e o prestador aparece para quem está perto.
// 3. Chamados: aceitar ou recusar (recusar devolve a taxa ao cliente e não pune), a caminho, chegou, concluído.
// Aceitar e concluir pedem a confirmação do rosto quando o servidor exige.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Alert, TouchableOpacity } from 'react-native';
import { Text } from '../responsive';
import { useStore } from '../store';
import { api, connectEvents } from '../api';
import { getDevicePoint } from '../geo';
import { colors, brl } from '../theme';
import { Card, Row, Button, Badge, Input, Chip } from './ui';
import FaceCheck from './FaceCheck';
import { serviceTypes } from '../data';
import { conectado, carregarCarteira } from '../serverShop';

const NEXT = { Solicitado: 'Aceito', Aceito: 'A caminho', 'A caminho': 'Chegou', Chegou: 'Concluído' };
const LABEL = { Aceito: 'Aceitar', 'A caminho': 'Estou a caminho', Chegou: 'Cheguei', Concluído: 'Serviço concluído' };
const UNITS = ['visita', 'hora', 'corrida', 'km', 'diária', 'serviço'];
const toNum = (t) => Number(String(t || '').replace(/[^\d,.]/g, '').replace(/\./g, '').replace(',', '.')) || 0;

export default function ServerProviderPanel() {
  const { state, dispatch } = useStore();
  const me = state.user && state.user.serverId;
  const on = conectado(state);
  const [perfil, setPerfil] = useState(undefined); // undefined = carregando; null = ainda não cadastrado
  const [calls, setCalls] = useState([]);
  const [face, setFace] = useState(null);
  const [form, setForm] = useState({ service: 'eletricista', functions: '', price: '', priceUnit: 'visita', visitFee: '', vehicle: '' });
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!me) return;
    api('GET', `/providers/${me}`).then(setPerfil).catch((e) => setPerfil(e.status === 404 ? null : undefined));
    api('GET', '/calls').then((l) => setCalls(l.filter((c) => c.providerId === me))).catch(() => {});
  }, [me]);
  useEffect(() => {
    if (!on) return;
    load();
    const t = setInterval(load, 30000);
    const stop = connectEvents((e) => {
      if (e.type !== 'call') return;
      load();
      const d = e.data || {};
      if (d.status === 'Solicitado' && d.providerId === me) Alert.alert('Novo chamado! 🔔', `${d.client} pediu ${d.service}${d.problem ? `: ${d.problem}` : ''}.`);
    });
    return () => {
      clearInterval(t);
      stop();
    };
  }, [on, me]);

  if (!on) return null;

  const salvar = async () => {
    const functions = form.functions.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);
    if (!functions.length) return Alert.alert('O que você faz?', 'Escreva pelo menos uma função, separadas por vírgula (ex.: Tomadas, Chuveiro).');
    if (!toNum(form.price)) return Alert.alert('Seu preço', 'Informe quanto você cobra.');
    setBusy(true);
    try {
      const p = await api('PUT', '/providers/me', {
        service: form.service, functions, price: toNum(form.price), priceUnit: form.priceUnit,
        visitFee: form.visitFee ? toNum(form.visitFee) : undefined, vehicle: form.vehicle || undefined,
      });
      setPerfil(p);
      setEditing(false);
    } catch (e) {
      Alert.alert('Cadastro não salvo', e.message);
    } finally {
      setBusy(false);
    }
  };

  const disponivel = async (quer) => {
    setBusy(true);
    try {
      const pt = await getDevicePoint();
      if (!pt) return Alert.alert('Ligue a localização', 'Para aparecer para quem está perto, o Realyz precisa do seu GPS.');
      await api('POST', '/providers/me/location', { lat: pt.lat, lng: pt.lon, available: quer });
      load();
    } catch (e) {
      if (e.code === 'verificacao_periodica') return setFace({ purpose: 'periodica', then: () => disponivel(quer) });
      Alert.alert('Não deu certo', e.message);
    } finally {
      setBusy(false);
    }
  };

  const mudar = async (c, status) => {
    try {
      await api('PATCH', `/calls/${c.id}`, { status });
      load();
      carregarCarteira(dispatch).catch(() => {});
    } catch (e) {
      if (e.code === 'verificacao_facial') return setFace({ purpose: status === 'Aceito' ? 'aceite' : 'finalizacao', refId: c.id, then: () => mudar(c, status) });
      Alert.alert('Chamado não atualizado', e.message);
    }
  };

  const abertos = calls.filter((c) => !['Concluído', 'Recusado', 'Cancelado'].includes(c.status));
  const tipos = serviceTypes.slice(0, 40);

  return (
    <Card>
      <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ fontWeight: '800', color: colors.text, fontSize: 16 }}>🔔 Chamados do Realyz</Text>
        <TouchableOpacity onPress={load} accessibilityLabel="Atualizar chamados">
          <Text style={{ color: colors.primary, fontWeight: '700' }}>Atualizar</Text>
        </TouchableOpacity>
      </Row>

      {perfil === null || editing ? (
        <View>
          <Text style={{ color: colors.muted, marginBottom: 8 }}>
            {perfil === null ? 'Faça seu cadastro de prestador para receber chamados de clientes de verdade.' : 'Atualize seu cadastro.'}
          </Text>
          <Text style={{ fontWeight: '700', color: colors.text, marginBottom: 4 }}>Tipo de serviço</Text>
          <Row style={{ flexWrap: 'wrap', marginBottom: 8 }}>
            {tipos.map((t) => (
              <View key={t.key} style={{ marginRight: 6, marginBottom: 6 }}>
                <Chip label={t.label} active={form.service === t.key} onPress={() => setForm({ ...form, service: t.key })} />
              </View>
            ))}
          </Row>
          <Input placeholder="O que você faz (ex.: Tomadas, Chuveiro, Disjuntor)" value={form.functions} onChangeText={(v) => setForm({ ...form, functions: v })} />
          <Row style={{ marginTop: 8 }}>
            <Input style={{ flex: 1, marginRight: 8 }} placeholder="Preço (R$)" keyboardType="decimal-pad" value={form.price} onChangeText={(v) => setForm({ ...form, price: v })} />
            <Input style={{ flex: 1 }} placeholder="Taxa de visita (R$)" keyboardType="decimal-pad" value={form.visitFee} onChangeText={(v) => setForm({ ...form, visitFee: v })} />
          </Row>
          <Row style={{ flexWrap: 'wrap', marginTop: 8 }}>
            {UNITS.map((u) => (
              <View key={u} style={{ marginRight: 6, marginBottom: 6 }}>
                <Chip label={`por ${u}`} active={form.priceUnit === u} onPress={() => setForm({ ...form, priceUnit: u })} />
              </View>
            ))}
          </Row>
          <Input style={{ marginTop: 4 }} placeholder="Veículo (motorista e motoboy: modelo, cor, cadeirinha...)" value={form.vehicle} onChangeText={(v) => setForm({ ...form, vehicle: v })} />
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6 }}>A taxa de visita é sua: o cliente paga ao pedir, fica retida e é liberada quando ele confirma a visita. O Realyz fica com 15% dela.</Text>
          <Button title={busy ? 'Salvando…' : 'Salvar cadastro'} onPress={salvar} disabled={busy} style={{ marginTop: 10 }} />
        </View>
      ) : perfil ? (
        <View>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text, flex: 1 }} numberOfLines={2}>
              {perfil.service} · {brl(perfil.price)} por {perfil.priceUnit}{perfil.visitFee ? ` · visita ${brl(perfil.visitFee)}` : ''}
            </Text>
            <TouchableOpacity onPress={() => { setForm({ service: perfil.service, functions: (perfil.functions || []).join(', '), price: String(perfil.price).replace('.', ','), priceUnit: perfil.priceUnit, visitFee: perfil.visitFee ? String(perfil.visitFee).replace('.', ',') : '', vehicle: perfil.vehicle || '' }); setEditing(true); }}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>Editar</Text>
            </TouchableOpacity>
          </Row>
          <Button
            title={busy ? 'Aguarde…' : perfil.available ? 'Disponível agora: toque para pausar' : 'Ficar disponível (liga o GPS)'}
            variant={perfil.available ? 'light' : 'primary'}
            onPress={() => disponivel(!perfil.available)}
            disabled={busy}
            style={{ marginTop: 10 }}
          />
          {perfil.available ? <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>Abra o app de tempos em tempos para manter sua posição atualizada.</Text> : null}
        </View>
      ) : (
        <Text style={{ color: colors.muted }}>Carregando…</Text>
      )}

      {calls.length ? <Text style={{ fontWeight: '700', color: colors.text, marginTop: 14 }}>{abertos.length ? `${abertos.length} em andamento` : 'Últimos chamados'}</Text> : null}
      {calls.slice(0, 15).map((c) => (
        <View key={c.id} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 6 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text numberOfLines={1} style={{ fontWeight: '700', color: colors.text, flex: 1 }}>{c.client}</Text>
            <Badge label={c.status} color={['Recusado', 'Cancelado'].includes(c.status) ? colors.danger : c.status === 'Concluído' ? colors.success : colors.primary} />
          </Row>
          <Text style={{ color: colors.muted, fontSize: 12.5 }} numberOfLines={3}>
            {[c.problem, c.address, c.when].filter(Boolean).join(' · ') || c.service}
          </Text>
          {c.visitFee ? (
            <Text style={{ color: colors.text, fontSize: 12.5, marginTop: 2 }}>
              Taxa de visita {brl(c.visitFee)} ({c.visitState === 'liberada' ? 'liberada para você' : c.visitState === 'devolvida' ? 'devolvida ao cliente' : 'retida até o cliente confirmar a visita'})
            </Text>
          ) : null}
          {NEXT[c.status] ? (
            <Row style={{ marginTop: 6 }}>
              <Button small title={LABEL[NEXT[c.status]]} onPress={() => mudar(c, NEXT[c.status])} />
              {c.status === 'Solicitado' ? (
                <>
                  <View style={{ width: 8 }} />
                  <Button small variant="light" title="Recusar" onPress={() => mudar(c, 'Recusado')} />
                </>
              ) : null}
            </Row>
          ) : null}
        </View>
      ))}
      <FaceCheck
        visible={!!face}
        purpose={face && face.purpose}
        refId={face && face.refId}
        title="Confirme seu rosto"
        onDone={(ok) => {
          const f = face;
          setFace(null);
          if (ok && f && f.then) f.then();
        }}
        onClose={() => setFace(null)}
      />
    </Card>
  );
}
