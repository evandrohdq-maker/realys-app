// Perfil › Shows e contratação: o artista monta a vitrine de contratação (cachês, onde
// atende, agenda, vídeos e tipos de evento), divulga com a arte pronta e responde os pedidos.
// Só para a classe Artistas (música, artes cênicas e artes visuais). Regras em src/artistShows.js.
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Text, TextInput } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { colors, brl } from '../theme';
import { Photo } from './ui';
import { BoostButton } from './Boost';
import { MonthCalendar, ShowPedidoCard, ShowStoryCard, openArtistShow, durText } from './ArtistBooking';
import {
  useShows, isArtistClass, blankProfile, saveMine, createPedido, storyCard, EVENT_TYPES, ATENDE, WEEK, SHOW_FEE_PCT, findCity, keyLabel, dayKey,
} from '../artistShows';
import { conectado } from '../serverShop';
import { salvarVitrine, sincronizarPedidos } from '../serverShows';

const STEPS = [
  ['vitrine', 'Vitrine'],
  ['caches', 'Cachês'],
  ['atende', 'Onde atende'],
  ['agenda', 'Agenda'],
  ['divulgar', 'Divulgar'],
  ['pedidos', 'Pedidos'],
];
const until = () => {
  const y = new Date().getFullYear();
  return [`${y}-12`, `${y + 1}-06`, `${y + 1}-12`, `${y + 2}-12`];
};
const untilLabel = (k) => `${k.slice(5)}/${k.slice(0, 4)}`;

export function ShowsPanel() {
  const { state, dispatch } = useStore();
  const shows = useShows();
  const social = state.myProfile && state.myProfile.social;
  const [draft, setDraft] = useState(null);
  const [step, setStep] = useState('vitrine');
  useEffect(() => {
    if (conectado(state)) sincronizarPedidos().catch(() => {});
  }, []);
  useEffect(() => {
    if (!draft) setDraft(shows.mine || blankProfile({ nome: state.user && state.user.name, cidade: state.myProfile.city, foto: state.myProfile.photo }));
  }, [shows.mine]);

  if (!isArtistClass(social)) {
    return (
      <View style={st.box}>
        <Text style={st.p}>A vitrine de shows é da classe Artistas: música (cantor, banda, DJ, MC…), artes cênicas (stand-up, dança, teatro) e artes visuais (grafite, pintura ao vivo…).</Text>
        <Text style={[st.p, { marginTop: 6 }]}>Sua classe hoje: {social ? social.cls : 'não definida'}. Troque em Editar perfil, ou marque aqui:</Text>
        <TouchableOpacity style={st.gold} onPress={() => dispatch({ type: 'SET_MY_PROFILE', profile: { social: { cls: 'musico', sub: 'cantor', extra: social && social.cls ? [social.cls] : [] } } })}>
          <Ionicons name="musical-notes" size={16} color="#120F1A" />
          <Text style={st.goldText}>Sou artista (Música)</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (!draft) return null;
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const setAt = (patch) => setDraft((d) => ({ ...d, atende: { ...d.atende, ...patch } }));
  const recebidos = shows.pedidos.filter((p) => p.lado === 'artista');
  const novos = recebidos.filter((p) => p.status === 'aguardando').length;

  const save = async (extra = {}) => {
    const next = { ...draft, ...extra };
    if (!next.nome.trim()) return Alert.alert('Nome artístico', 'Como você quer aparecer para quem contrata?');
    if (!(next.pacotes || []).length) return Alert.alert('Cachês', 'Cadastre pelo menos um show com valor.');
    if (!findCity(next.cidade)) Alert.alert('Cidade', `Não achei "${next.cidade}" na tabela de distâncias. A vitrine funciona, mas o deslocamento vai por orçamento. Use o formato "Passo Fundo - RS".`);
    setDraft(next);
    saveMine(next);
    if (conectado(state)) salvarVitrine(next).catch((e) => Alert.alert('Salvo só no celular', e.message));
    return true;
  };
  const toggleActive = (on) => save({ ativo: on }).then((ok) => ok && on && Alert.alert('Vitrine no ar 🎤', 'Você já aparece em Artistas › Contrate para o seu evento e no seu perfil, com os botões Contratar, Fazer orçamento e Entrar em contato.'));

  const pickVideo = async () => {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos', 'images'], quality: 0.8 });
      if (r.canceled || !r.assets || !r.assets[0]) return;
      const asset = r.assets[0];
      const v = { kind: asset.type === 'video' ? 'video' : 'foto', titulo: asset.type === 'video' ? 'Ao vivo' : 'Foto do show', capa: asset.type === 'video' ? null : asset.uri, uri: asset.uri };
      set({ vitrine: [...(draft.vitrine || []), v].slice(0, 8) });
    } catch (e) {
      Alert.alert('Galeria', 'Não deu para abrir a galeria.');
    }
  };

  return (
    <View>
      <View style={st.activeRow}>
        <View style={{ flex: 1 }}>
          <Text style={st.b}>{draft.ativo ? 'Aceitando contratação' : 'Vitrine desligada'}</Text>
          <Text style={st.small}>{draft.ativo ? 'Aparece para quem quer contratar' : 'Monte e ligue quando estiver pronta'}</Text>
        </View>
        <Switch value={!!draft.ativo} onValueChange={toggleActive} trackColor={{ true: colors.gold, false: colors.border }} thumbColor="#fff" />
      </View>

      <View style={st.steps}>
        {STEPS.map(([k, l]) => (
          <TouchableOpacity key={k} onPress={() => setStep(k)} style={st.step}>
            <Text style={[st.stepText, step === k && st.stepOn]} numberOfLines={1}>{l}{k === 'pedidos' && novos ? ` (${novos})` : ''}</Text>
            <View style={[st.bar, step === k && { backgroundColor: colors.primary }]} />
          </TouchableOpacity>
        ))}
      </View>

      {step === 'vitrine' ? (
        <View>
          <Field label="Nome artístico" value={draft.nome} onChange={(v) => set({ nome: v })} />
          <Field label="Estilo" value={draft.genero} onChange={(v) => set({ genero: v })} placeholder="Ex.: Rap e trap, Sertanejo, Stand-up" />
          <Field label="Sua cidade" value={draft.cidade} onChange={(v) => set({ cidade: v })} placeholder="Ex.: Passo Fundo - RS" />
          <Field label="Frase de chamada (a sua propaganda)" value={draft.frase} onChange={(v) => set({ frase: v.slice(0, 90) })} placeholder="Ex.: O rap que faz a sua formatura tremer" />
          <Text style={st.label}>Vídeos e fotos ao vivo</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {(draft.vitrine || []).map((v, i) => (
              <View key={i} style={st.thumbBox}>
                <Photo uri={v.capa} style={st.thumb} fallback={v.kind === 'video' ? '🎬' : '📷'} />
                <TextInput style={st.thumbTitle} value={v.titulo} onChangeText={(t) => set({ vitrine: draft.vitrine.map((x, j) => (j === i ? { ...x, titulo: t } : x)) })} />
                <TouchableOpacity style={st.x} onPress={() => set({ vitrine: draft.vitrine.filter((_, j) => j !== i) })} accessibilityLabel="Remover">
                  <Ionicons name="close" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={[st.thumbBox, st.add]} onPress={pickVideo} accessibilityLabel="Adicionar vídeo ou foto">
              <Ionicons name="add" size={24} color={colors.primary} />
              <Text style={st.small}>Vídeo ou foto</Text>
            </TouchableOpacity>
          </View>
          <Text style={st.label}>Tipos de evento</Text>
          <View style={st.tags}>
            {EVENT_TYPES.map((e) => {
              const on = (draft.eventos || []).includes(e);
              return (
                <TouchableOpacity key={e} style={[st.tag, on && st.tagOn]} onPress={() => set({ eventos: on ? draft.eventos.filter((x) => x !== e) : [...(draft.eventos || []), e] })}>
                  <Text style={[st.tagText, on && st.tagTextOn]}>{e}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Field label="Estrutura que você leva" value={draft.estrutura} onChange={(v) => set({ estrutura: v })} placeholder="Ex.: Som para até 200 pessoas, DJ próprio" />
        </View>
      ) : null}

      {step === 'caches' ? (
        <View>
          <Text style={st.small}>Cada show com o seu valor. Quem contrata não paga taxa; o Realyz fica com {SHOW_FEE_PCT}% do cachê só quando o show acontece.</Text>
          {(draft.pacotes || []).map((p, i) => {
            const up = (patch) => set({ pacotes: draft.pacotes.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
            return (
              <View key={p.id} style={st.pack}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput style={[st.input, { flex: 1 }]} value={p.nome} onChangeText={(t) => up({ nome: t })} placeholder="Nome do show" placeholderTextColor={colors.muted} />
                  <TouchableOpacity onPress={() => set({ pacotes: draft.pacotes.filter((_, j) => j !== i) })} style={{ marginLeft: 8 }} accessibilityLabel="Remover show">
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', marginTop: 6 }}>
                  <View style={{ flex: 1, marginRight: 6 }}>
                    <Text style={st.small}>Duração (min)</Text>
                    <TextInput style={st.input} value={String(p.duracao || '')} onChangeText={(t) => up({ duracao: parseInt(t, 10) || 0 })} keyboardType="number-pad" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.small}>Cachê (R$)</Text>
                    <TextInput style={st.input} value={String(p.valor || '')} onChangeText={(t) => up({ valor: parseFloat(t.replace(',', '.')) || 0 })} keyboardType="decimal-pad" />
                  </View>
                </View>
                <TextInput style={[st.input, { marginTop: 6 }]} value={p.desc} onChangeText={(t) => up({ desc: t })} placeholder="O que inclui (músicos, som, luz…)" placeholderTextColor={colors.muted} />
                <Text style={[st.small, { marginTop: 4 }]}>{durText(p.duracao)} · você recebe {brl((p.valor || 0) * (1 - SHOW_FEE_PCT / 100))}</Text>
              </View>
            );
          })}
          <TouchableOpacity style={st.outline} onPress={() => set({ pacotes: [...(draft.pacotes || []), { id: 'p' + Date.now(), nome: '', duracao: 60, valor: 0, desc: '' }] })}>
            <Ionicons name="add" size={16} color={colors.primary} />
            <Text style={st.outlineText}>Adicionar show</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {step === 'atende' ? (
        <View>
          {ATENDE.map((m) => {
            const on = draft.atende.modo === m.key;
            return (
              <TouchableOpacity key={m.key} style={[st.mode, on && st.modeOn]} onPress={() => setAt({ modo: m.key })}>
                <Ionicons name={m.icon} size={20} color={colors.text} />
                <Text style={[st.b, { marginLeft: 8, flex: 1 }]}>{m.label}</Text>
                <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={18} color={colors.primary} />
              </TouchableOpacity>
            );
          })}
          {draft.atende.modo === 'regiao' ? (
            <>
              <Text style={st.label}>Até quantos km de {String(draft.cidade).split(' - ')[0]}</Text>
              <View style={st.tags}>
                {[15, 30, 50, 100, 200].map((k) => (
                  <TouchableOpacity key={k} style={[st.tag, draft.atende.raioKm === k && st.tagOn]} onPress={() => setAt({ raioKm: k })}>
                    <Text style={[st.tagText, draft.atende.raioKm === k && st.tagTextOn]}>{k} km</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : null}
          {draft.atende.modo !== 'cidade' ? (
            <>
              <Field label="Deslocamento (R$ por km, ida e volta somadas)" value={String(draft.atende.porKm || '')} onChange={(v) => setAt({ porKm: parseFloat(v.replace(',', '.')) || 0 })} keyboard="decimal-pad" />
              {draft.atende.modo === 'viaja' ? (
                <View style={st.activeRow}>
                  <Text style={[st.p, { flex: 1 }]}>Hospedagem e alimentação por conta de quem contrata</Text>
                  <Switch value={!!draft.atende.hospedagem} onValueChange={(v) => setAt({ hospedagem: v })} trackColor={{ true: colors.gold, false: colors.border }} thumbColor="#fff" />
                </View>
              ) : null}
            </>
          ) : null}
        </View>
      ) : null}

      {step === 'agenda' ? (
        <View>
          <Text style={st.label}>Dias em que você toca</Text>
          <View style={st.tags}>
            {WEEK.map((w, i) => {
              const on = (draft.diasSemana || []).includes(i);
              return (
                <TouchableOpacity key={w} style={[st.tag, on && st.tagOn]} onPress={() => set({ diasSemana: on ? draft.diasSemana.filter((x) => x !== i) : [...(draft.diasSemana || []), i].sort() })}>
                  <Text style={[st.tagText, on && st.tagTextOn]}>{w}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={st.small}>Nenhum marcado = todos os dias.</Text>
          <Text style={st.label}>Agenda aberta até</Text>
          <View style={st.tags}>
            {until().map((k) => (
              <TouchableOpacity key={k} style={[st.tag, draft.agendaAte === k && st.tagOn]} onPress={() => set({ agendaAte: k })}>
                <Text style={[st.tagText, draft.agendaAte === k && st.tagTextOn]}>{untilLabel(k)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={st.label}>Toque num dia para bloquear ou liberar</Text>
          <MonthCalendar
            artist={draft}
            pedidos={shows.pedidos}
            onDay={(k) => {
              const b = draft.bloqueados || [];
              set({ bloqueados: b.includes(k) ? b.filter((x) => x !== k) : [...b, k] });
            }}
          />
          <Text style={st.small}>Shows fechados pelo Realyz ocupam o dia sozinhos.</Text>
        </View>
      ) : null}

      {step === 'divulgar' ? (
        <View>
          <Text style={st.p}>Sua arte de divulgação, pronta para os Now, com a sua marca e o link para contratar.</Text>
          <ShowStoryCard card={storyCard(draft)} style={{ marginTop: 10, width: '78%', alignSelf: 'center' }} />
          <TouchableOpacity style={[st.gold, { alignSelf: 'stretch', justifyContent: 'center' }]} onPress={() => { dispatch({ type: 'PUBLISH_STORY', item: { id: 'show' + Date.now(), text: '', showCard: storyCard(draft), time: 'agora', views: 0 } }); Alert.alert('Now publicado 📣', 'Sua vitrine de shows está nos seus Now.'); }}>
            <Ionicons name="add-circle" size={16} color="#120F1A" />
            <Text style={st.goldText}>Postar no meu Now</Text>
          </TouchableOpacity>
          <BoostButton target="artista" label="Impulsionar minha vitrine de shows" hint="Primeiro em Artistas e nas buscas por show, ou Now patrocinado." style={{ marginTop: 10 }} />
          <Text style={[st.small, { marginTop: 8 }]}>Show fechado: o pedido traz a arte com data e local, e vocês dois se comprometem a divulgar (você: anúncio e "é hoje"; quem contratou: 1 Now).</Text>
        </View>
      ) : null}

      {step === 'pedidos' ? (
        <View>
          {recebidos.length ? recebidos.map((p) => <ShowPedidoCard key={p.id} p={p} />) : <Text style={st.p}>Nenhum pedido ainda. Ligue a vitrine e divulgue nos Now.</Text>}
          {/* Demonstração: um cliente pedindo show para você. */}
          <TouchableOpacity
            style={[st.outline, { marginTop: 8 }]}
            onPress={() => {
              const d = new Date(Date.now() + 20 * 86400000);
              createPedido({ artista: { ...draft, id: 'me' }, tipo: Math.random() < 0.5 ? 'orcamento' : 'contratacao', pacote: draft.pacotes[0], data: dayKey(d), hora: '22:00', evento: 'Formatura', local: 'Clube Comercial', cidade: draft.cidade, publico: 180, mensagem: 'Oi! Formatura da turma de Direito, queremos 1 hora de show.', cliente: 'Ana Paula' });
            }}
          >
            <Ionicons name="flask-outline" size={16} color={colors.primary} />
            <Text style={st.outlineText}>Demonstração: receber um pedido</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', marginTop: 14 }}>
        <TouchableOpacity style={[st.outline, { flex: 1, marginRight: 8, marginTop: 0 }]} onPress={() => save().then((ok) => ok && openArtistShow('me'))}>
          <Ionicons name="eye-outline" size={16} color={colors.primary} />
          <Text style={st.outlineText}>Ver como o cliente vê</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[st.gold, { flex: 1, marginTop: 0, justifyContent: 'center' }]} onPress={() => save().then((ok) => ok && Alert.alert('Vitrine salva ✅'))}>
          <Text style={st.goldText}>Salvar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Field({ label, value, onChange, placeholder, keyboard }) {
  return (
    <>
      <Text style={st.label}>{label}</Text>
      <TextInput style={st.input} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.muted} keyboardType={keyboard} />
    </>
  );
}

const st = StyleSheet.create({
  box: { backgroundColor: colors.cardAlt, borderRadius: 14, padding: 12 },
  p: { color: colors.text, fontSize: 13, lineHeight: 18 },
  b: { color: colors.text, fontWeight: '800' },
  small: { color: colors.muted, fontSize: 12 },
  label: { color: colors.text, fontWeight: '700', fontSize: 13, marginTop: 12, marginBottom: 4 },
  input: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 9, color: colors.text },
  gold: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#F5C331', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, marginTop: 10 },
  goldText: { color: '#120F1A', fontWeight: '900', marginLeft: 6 },
  outline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: colors.borderStrong, paddingVertical: 11, marginTop: 10, backgroundColor: '#fff' },
  outlineText: { color: colors.primaryDark, fontWeight: '700', marginLeft: 6 },
  activeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 12, marginTop: 6, borderWidth: 1, borderColor: colors.border },
  steps: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, marginBottom: 4 },
  step: { alignItems: 'center', marginRight: 14, marginBottom: 6 },
  stepText: { color: colors.menu, fontWeight: '700', fontSize: 13 },
  stepOn: { color: colors.primary, fontWeight: '800' },
  bar: { width: 16, height: 3, borderRadius: 2, marginTop: 4, backgroundColor: 'transparent' },
  tags: { flexDirection: 'row', flexWrap: 'wrap' },
  tag: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.cardAlt, marginRight: 6, marginBottom: 6 },
  tagOn: { backgroundColor: '#F6EDD6', borderWidth: 1, borderColor: colors.gold },
  tagText: { color: colors.menu, fontSize: 12, fontWeight: '600' },
  tagTextOn: { color: colors.primaryDark, fontWeight: '800' },
  thumbBox: { width: '31%', marginRight: '2%', marginBottom: 8 },
  thumb: { width: '100%', aspectRatio: 1.4, borderRadius: 10 },
  thumbTitle: { fontSize: 11, color: colors.text, paddingVertical: 2 },
  x: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  add: { aspectRatio: 1.1, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  pack: { backgroundColor: '#fff', borderRadius: 14, padding: 10, marginTop: 8, borderWidth: 1, borderColor: colors.border },
  mode: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 12, marginTop: 8, borderWidth: 1.5, borderColor: colors.border },
  modeOn: { borderColor: colors.gold, backgroundColor: '#FFFBEF' },
});
