// Painel do prestador: chamados de clientes de verdade, pelo servidor do Realyz.
// 1. Cadastro: tipo de serviço, o que faz, preço e taxa de visita (o prestador define).
// 2. Ficar disponível: o app manda a posição do GPS e o prestador aparece para quem está perto.
// 3. Chamados: aceitar ou recusar (recusar devolve a taxa ao cliente e não pune), a caminho, chegou, concluído.
// Aceitar e concluir pedem a confirmação do rosto quando o servidor exige.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Alert, TouchableOpacity, StyleSheet } from 'react-native';
import { Text, TextInput } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { api, connectEvents } from '../api';
import { getDevicePoint } from '../geo';
import { colors, brl } from '../theme';
import { Card, Row, Button, Badge, Input, Chip } from './ui';
import FaceCheck from './FaceCheck';
import { profConfig, buscarProfissoes, profissaoPorKey, infoProfissao } from '../providerSegments';
import ProfissaoBusca, { FuncoesTags, ProfissaoInfo, MeiGuia } from './ProfissaoBusca';
import { conectado, carregarCarteira } from '../serverShop';
import { rolesDoServidor } from '../serverAuth';

const NEXT = { Solicitado: 'Aceito', Aceito: 'A caminho', 'A caminho': 'Chegou', Chegou: 'Concluído' };
const LABEL = { Aceito: 'Aceitar', 'A caminho': 'Estou a caminho', Chegou: 'Cheguei', Concluído: 'Serviço concluído' };
const toNum = (t) => Number(String(t || '').replace(/[^\d,.]/g, '').replace(/\./g, '').replace(',', '.')) || 0;

export default function ServerProviderPanel() {
  const { state, dispatch } = useStore();
  const me = state.user && state.user.serverId;
  const on = conectado(state);
  const [perfil, setPerfil] = useState(undefined); // undefined = carregando; null = ainda não cadastrado
  const [calls, setCalls] = useState([]);
  const [face, setFace] = useState(null);
  // A profissão principal vem do perfil (escolhida no cadastro); as outras só pelo botão "Adicionar outra profissão".
  const profDoPerfil = () => {
    const soc = state.myProfile && state.myProfile.social;
    if (soc && soc.prof) return soc.prof;
    const m = buscarProfissoes((state.myProfile && state.myProfile.profession) || '', 1)[0];
    return m ? m.key : null;
  };
  const novoForm = () => {
    const service = profDoPerfil();
    const c = profConfig(service);
    return { service, outros: [], functions: [], novaFuncao: '', price: '', priceUnit: c.units[0], visitFee: '', visitFeeFiel: '', vehicle: '' };
  };
  const [form, setForm] = useState(novoForm);
  const [addOutra, setAddOutra] = useState(false);
  const [trocando, setTrocando] = useState(false);
  const [mei, setMei] = useState(false);
  // O perfil carregou depois: a profissão dele entra sozinha no cadastro.
  useEffect(() => {
    if (form.service || perfil) return;
    const k = profDoPerfil();
    if (k) setForm((f) => ({ ...f, service: k, priceUnit: profConfig(k).units[0] }));
  }, [state.myProfile && state.myProfile.social, state.myProfile && state.myProfile.profession, perfil]);
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
    if (!form.service) return Alert.alert('Sua profissão', 'Digite e escolha a sua profissão.');
    const functions = form.functions;
    if (!functions.length) return Alert.alert('O que você faz?', 'Toque nas sugestões ou escreva o que você faz.');
    // Em branco = a combinar (preço que só sai depois de ver o serviço). Motorista e motoboy seguem a tarifa.
    if (!toNum(form.price) && /motorista|motoboy/.test(form.service)) return Alert.alert('Seu preço', 'Informe quanto você cobra.');
    setBusy(true);
    try {
      const p = await api('PUT', '/providers/me', {
        service: form.service, outros: form.outros, functions, price: toNum(form.price) || 0, priceUnit: form.priceUnit,
        visitFee: form.visitFee ? toNum(form.visitFee) : undefined, vehicle: form.vehicle || undefined,
        // Cliente fiel (opcional): visita mais barata para quem volta pelo Realyz.
        visitFeeFiel: form.visitFeeFiel ? toNum(form.visitFeeFiel) : null,
      });
      setPerfil(p);
      setEditing(false);
      // Primeiro cadastro (ex.: empresa que passou a prestar serviço): o perfil de prestador entra no
      // botão de troca na hora, sem sair da conta.
      api('GET', '/me')
        .then((me) => dispatch({ type: 'SET_USER_ROLES', roles: rolesDoServidor(me.user), trabalho: me.user.trabalho || [] }))
        .catch(() => {});
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
  // O formulário segue a profissão: só as cobranças e os campos dela.
  const cfg = profConfig(form.service);
  const prof = form.service ? infoProfissao(form.service) : null;
  const escolherProf = (p) => {
    if (!p || !p.key) return setForm({ ...form, service: null });
    const c = profConfig(p.key);
    setTrocando(false);
    setForm({ ...form, service: p.key, outros: form.outros.filter((x) => x !== p.key), priceUnit: c.units.includes(form.priceUnit) ? form.priceUnit : c.units[0], visitFee: c.visit ? form.visitFee : '', vehicle: c.vehicle ? form.vehicle : '' });
  };

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
          <Text style={{ color: colors.muted, marginBottom: 10 }}>
            {perfil === null ? 'Complete seu cadastro de prestador para receber chamados de clientes de verdade.' : 'Atualize seu cadastro.'}
          </Text>

          <Text style={ps.h}>Sua profissão</Text>
          {prof && !trocando ? (
            <View style={ps.prof}>
              <Text style={{ fontSize: 26 }}>{prof.icon || '🧰'}</Text>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={ps.profNome} numberOfLines={1}>{prof.label}</Text>
                <Text style={ps.small} numberOfLines={1}>{perfil ? prof.group : `Do seu perfil · ${prof.group}`}</Text>
              </View>
              <TouchableOpacity onPress={() => setTrocando(true)} accessibilityLabel="Trocar profissão" style={{ padding: 6 }}>
                <Text style={ps.link}>Trocar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ProfissaoBusca value={null} onPick={escolherProf} autoFocus={trocando} />
          )}
          {prof && !trocando ? <ProfissaoInfo profKey={form.service} onMei={() => setMei(true)} /> : null}
          <MeiGuia visible={mei} onClose={() => setMei(false)} profKey={form.service} />

          {form.outros.map((k) => {
            const o = infoProfissao(k);
            return o ? (
              <View key={k} style={[ps.prof, ps.outra]}>
                <Text style={{ fontSize: 20 }}>{o.icon || '🧰'}</Text>
                <Text style={[ps.profNome, { flex: 1, marginLeft: 10, fontSize: 14 }]} numberOfLines={1}>{o.label}</Text>
                <TouchableOpacity onPress={() => setForm({ ...form, outros: form.outros.filter((x) => x !== k) })} accessibilityLabel={`Tirar ${o.label}`} style={{ padding: 4 }}>
                  <Ionicons name="close" size={18} color={colors.muted} />
                </TouchableOpacity>
              </View>
            ) : null;
          })}
          {addOutra ? (
            <View style={{ marginTop: 8 }}>
              <ProfissaoBusca
                value={null}
                autoFocus
                placeholder="Digite a outra profissão"
                onPick={(p) => {
                  setAddOutra(false);
                  if (p && p.key && p.key !== form.service && !form.outros.includes(p.key)) setForm({ ...form, outros: [...form.outros, p.key].slice(0, 4) });
                }}
              />
            </View>
          ) : prof && form.outros.length < 4 ? (
            <TouchableOpacity onPress={() => setAddOutra(true)} style={ps.add} accessibilityLabel="Adicionar outra profissão">
              <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
              <Text style={[ps.link, { marginLeft: 6 }]}>Adicionar outra profissão</Text>
            </TouchableOpacity>
          ) : null}

          {prof ? (
            <>
              <Text style={ps.h}>O que você faz</Text>
              <FuncoesTags keys={[form.service, ...form.outros]} value={form.functions} onChange={(functions) => setForm({ ...form, functions })} />

              <Text style={ps.h}>Quanto você cobra</Text>
              <View style={ps.wrap}>
                {cfg.units.map((u) => {
                  const on = form.priceUnit === u;
                  return (
                    <TouchableOpacity key={u} onPress={() => setForm({ ...form, priceUnit: u })} style={[ps.unit, on && ps.unitOn]} accessibilityLabel={`por ${u}`}>
                      <Text numberOfLines={1} style={[ps.unitText, on && { color: colors.onPrimary }]}>por {u}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Row style={{ marginTop: 4 }}>
                <Input style={{ flex: 1, marginRight: cfg.visit ? 8 : 0 }} placeholder={cfg.price} keyboardType="decimal-pad" value={form.price} onChangeText={(v) => setForm({ ...form, price: v })} />
                {cfg.visit ? <Input style={{ flex: 1 }} placeholder="Taxa de visita (R$)" keyboardType="decimal-pad" value={form.visitFee} onChangeText={(v) => setForm({ ...form, visitFee: v })} /> : null}
              </Row>
              {cfg.visit ? (
                <View style={{ marginTop: 8 }}>
                  <Input placeholder="Visita para cliente fiel (R$) · opcional" keyboardType="decimal-pad" value={form.visitFeeFiel} onChangeText={(v) => setForm({ ...form, visitFeeFiel: v })} />
                  <Text style={{ color: colors.muted, fontSize: 11.5, marginTop: 3 }}>Quem já fez serviço com você pelo Realyz paga este valor na visita. A taxa do Realyz continua sobre a visita normal.</Text>
                </View>
              ) : null}
              {cfg.vehicle ? <Input style={{ marginTop: 8 }} placeholder="Seu veículo (modelo, cor, placa, cadeirinha…)" value={form.vehicle} onChangeText={(v) => setForm({ ...form, vehicle: v })} /> : null}
              {cfg.note ? <Text style={[ps.small, { marginTop: 8 }]}>{cfg.note}</Text> : null}
              {cfg.visit ? <Text style={[ps.small, { marginTop: 8 }]}>A taxa de visita é sua: o cliente paga ao pedir, fica retida e é liberada quando ele confirma a visita. O Realyz fica com 15% dela.</Text> : null}

              {/* Como o cliente vai ver. */}
              <View style={ps.preview}>
                <Text style={ps.previewKicker}>COMO O CLIENTE VÊ VOCÊ</Text>
                <Text style={ps.profNome} numberOfLines={1}>{prof.icon} {prof.label}{form.outros.length ? ` + ${form.outros.length}` : ''}</Text>
                <Text style={ps.small} numberOfLines={2}>{form.functions.length ? form.functions.slice(0, 4).join(' · ') : 'Marque o que você faz'}</Text>
                <Text style={[ps.profNome, { color: colors.primaryDark, fontSize: 14, marginTop: 4 }]}>{toNum(form.price) ? `${brl(toNum(form.price))} por ${form.priceUnit}` : 'A combinar (preço depois de ver o serviço)'}</Text>
              </View>
              <Button title={busy ? 'Salvando…' : 'Salvar cadastro'} onPress={salvar} disabled={busy} style={{ marginTop: 12 }} />
            </>
          ) : null}
        </View>
      ) : perfil ? (
        <View>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text, flex: 1 }} numberOfLines={2}>
              {perfil.service} · {perfil.price ? `${brl(perfil.price)} por ${perfil.priceUnit}` : (perfil.visitFee ? 'a combinar na visita' : 'a combinar no orçamento')}{perfil.visitFee ? ` · visita ${brl(perfil.visitFee)}` : ''}{perfil.visitFeeFiel ? ` · cliente fiel ${brl(perfil.visitFeeFiel)}` : ''}
            </Text>
            <TouchableOpacity onPress={() => { setForm({ service: perfil.service, outros: perfil.outros || [], functions: perfil.functions || [], novaFuncao: '', price: String(perfil.price).replace('.', ','), priceUnit: perfil.priceUnit, visitFee: perfil.visitFee ? String(perfil.visitFee).replace('.', ',') : '', visitFeeFiel: perfil.visitFeeFiel ? String(perfil.visitFeeFiel).replace('.', ',') : '', vehicle: perfil.vehicle || '' }); setTrocando(false); setAddOutra(false); setEditing(true); }}>
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

const ps = StyleSheet.create({
  h: { color: colors.text, fontWeight: '800', fontSize: 15, marginTop: 14, marginBottom: 8 },
  small: { color: colors.muted, fontSize: 12.5 },
  link: { color: colors.primary, fontWeight: '800' },
  prof: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: '#FFFBEF' },
  outra: { marginTop: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', paddingVertical: 9 },
  profNome: { color: colors.text, fontWeight: '800', fontSize: 15 },
  add: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  unit: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', marginRight: 6, marginBottom: 6 },
  unitOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  unitText: { color: colors.text, fontWeight: '700', fontSize: 13 },
  preview: { marginTop: 14, padding: 12, borderRadius: 14, backgroundColor: colors.cardAlt },
  previewKicker: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 4 },
});
