// Arena: opções de uma pessoa, como no Discord.
// Volume só dela, silenciar a voz dela, ignorar, bloquear, adicionar amigo, convidar para chamada, mencionar, apelido,
// denunciar e, para dono ou moderador, tirar da voz e expulsar do servidor.
// Tudo vale só para mim e fica salvo no celular (src/arena.js › arenaPref).
import React, { useEffect, useState } from 'react';
import { KeyboardLift } from '../keyboard';
import { View, StyleSheet, TouchableOpacity, Modal, Alert, ScrollView } from 'react-native';
import { Text, TextInput } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { useArena, arenaPref, setArenaPref, arenaKick } from '../arena';
import { memberByName } from '../people';

const D = { text: '#1B1B1F', muted: '#7A7468', gold: '#B8860B', red: '#E5484D', line: '#EEE8D8', soft: '#F4F0E4', green: '#2FB463' };
const ROLE_LABEL = { dono: 'Dono', mod: 'Moderador', membro: 'Membro' };
const VOL_STEPS = [0, 25, 50, 75, 100, 125, 150, 175, 200];

function Row({ icon, label, sub, onPress, color = D.text, right }) {
  return (
    <TouchableOpacity style={st.row} onPress={onPress} activeOpacity={0.7} accessibilityLabel={label}>
      <Ionicons name={icon} size={20} color={color} style={{ width: 26 }} />
      <View style={{ flex: 1, marginLeft: 8 }}>
        <Text style={{ color, fontWeight: '700', fontSize: 15 }}>{label}</Text>
        {sub ? <Text style={{ color: D.muted, fontSize: 12, marginTop: 1 }}>{sub}</Text> : null}
      </View>
      {right}
    </TouchableOpacity>
  );
}
const Check = ({ on }) => <Ionicons name={on ? 'checkbox' : 'square-outline'} size={21} color={on ? D.gold : D.muted} />;

export default function ArenaUserSheet({ name, sv, me, myRole, onClose, onMention, onCall }) {
  useArena(); // redesenha quando as opções mudam
  const { state, dispatch } = useStore();
  const [note, setNote] = useState('');
  useEffect(() => {
    if (name) setNote(arenaPref(name).note || '');
  }, [name]);
  if (!name) return null;
  const pf = arenaPref(name);
  const mem = (sv && sv.members.find((x) => x.name === name)) || {};
  const person = memberByName(name); // perfil do Realyz, quando a pessoa tem
  const friendStore = person ? (state.friends || {})[person.id] : null;
  const friend = friendStore || pf.friend; // 'amigo' · 'enviado' · 'recebido' · null
  const canMod = (myRole === 'dono' || myRole === 'mod') && mem.role !== 'dono' && name !== me;
  const first = name.split(' ')[0];
  const set = (patch) => setArenaPref(name, patch);

  const addFriend = () => {
    if (friend === 'amigo') return Alert.alert('Vocês já são amigos', `${first} já está na sua lista de amigos.`);
    if (friend === 'enviado') {
      if (person) dispatch({ type: 'FRIEND', id: person.id, status: null });
      return set({ friend: null });
    }
    if (person) dispatch({ type: 'FRIEND', id: person.id, status: friendStore === 'recebido' ? 'amigo' : 'enviado' });
    set({ friend: friendStore === 'recebido' ? 'amigo' : 'enviado' });
  };
  const block = () => {
    if (pf.blocked) return set({ blocked: false });
    Alert.alert(`Bloquear ${first}?`, 'Você deixa de ver as mensagens e de ouvir essa pessoa na voz, e ela não consegue te chamar. Dá para desbloquear depois.', [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Bloquear', style: 'destructive', onPress: () => { set({ blocked: true, muted: true, friend: null }); if (person && friendStore) dispatch({ type: 'FRIEND', id: person.id, status: null }); onClose(); } },
    ]);
  };
  const report = () =>
    Alert.alert(`Denunciar ${first}`, 'Qual é o problema?', [
      ...['Ofensa ou assédio', 'Golpe ou venda por fora', 'Spam'].map((r) => ({ text: r, onPress: () => Alert.alert('Denúncia enviada ✅', 'A moderação do Realyz vai analisar. Obrigado por cuidar da Arena.') })),
      { text: 'Voltar', style: 'cancel' },
    ]);
  const kick = (voiceOnly) =>
    Alert.alert(voiceOnly ? `Tirar ${first} da voz?` : `Expulsar ${first} do servidor?`, voiceOnly ? 'A pessoa sai da sala de voz, mas continua no servidor.' : 'A pessoa sai do servidor e das salas de voz.', [
      { text: 'Voltar', style: 'cancel' },
      { text: voiceOnly ? 'Tirar da voz' : 'Expulsar', style: 'destructive', onPress: () => { arenaKick(sv.id, name, { voiceOnly }); onClose(); } },
    ]);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}><KeyboardLift style={{ flex: 1 }}>
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} activeOpacity={1} onPress={onClose} />
      <View style={st.sheet}>
        <ScrollView style={{ maxHeight: 540 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View style={st.avatar}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>{name.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ color: D.text, fontWeight: '800', fontSize: 17 }} numberOfLines={1}>
                {name} <Ionicons name="shield-checkmark" size={13} color={D.gold} />
              </Text>
              <Text style={{ color: D.muted, fontSize: 12.5 }} numberOfLines={1}>
                {ROLE_LABEL[mem.role] || 'Membro'}{mem.game ? ` · 🎮 ${mem.game}` : ''}{pf.note ? ` · "${pf.note}"` : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 6 }} accessibilityLabel="Fechar">
              <Ionicons name="close" size={22} color={D.muted} />
            </TouchableOpacity>
          </View>

          {/* Volume só dessa pessoa */}
          <View style={st.volBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name={pf.muted || pf.volume === 0 ? 'volume-mute' : 'volume-high'} size={18} color={pf.muted ? D.red : D.text} />
              <Text style={{ color: D.text, fontWeight: '700', marginLeft: 8, flex: 1 }}>Volume de {first}</Text>
              <Text style={{ color: pf.muted ? D.red : D.text, fontWeight: '800' }}>{pf.muted ? 'Silenciado' : `${pf.volume}%`}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
              <TouchableOpacity style={st.volBtn} onPress={() => set({ volume: Math.max(0, pf.volume - 25), muted: false })} accessibilityLabel="Diminuir o volume">
                <Ionicons name="remove" size={18} color={D.text} />
              </TouchableOpacity>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', height: 26, marginHorizontal: 8 }}>
                {VOL_STEPS.slice(1).map((v, i) => (
                  <TouchableOpacity key={v} style={{ flex: 1, height: 26, justifyContent: 'flex-end', paddingHorizontal: 2 }} onPress={() => set({ volume: v, muted: false })} accessibilityLabel={`Volume ${v}%`}>
                    <View style={{ height: 6 + i * 2.5, borderRadius: 3, backgroundColor: !pf.muted && pf.volume >= v ? (v > 100 ? D.gold : D.green) : D.line }} />
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={st.volBtn} onPress={() => set({ volume: Math.min(200, pf.volume + 25), muted: false })} accessibilityLabel="Aumentar o volume">
                <Ionicons name="add" size={18} color={D.text} />
              </TouchableOpacity>
            </View>
          </View>

          <Row icon={pf.muted ? 'volume-mute' : 'volume-mute-outline'} label="Silenciar" sub="Você deixa de ouvir a voz dessa pessoa" onPress={() => set({ muted: !pf.muted })} right={<Check on={pf.muted} />} />
          <Row icon="eye-off-outline" label="Ignorar" sub="As mensagens dela ficam recolhidas para você" onPress={() => set({ ignored: !pf.ignored })} right={<Check on={pf.ignored} />} />
          <Row
            icon={friend === 'amigo' ? 'people' : friend === 'enviado' ? 'time-outline' : 'person-add-outline'}
            label={friend === 'amigo' ? 'Amigos' : friend === 'enviado' ? 'Pedido enviado · cancelar' : friendStore === 'recebido' ? 'Aceitar pedido de amizade' : 'Adicionar amigo'}
            sub={friend === 'enviado' ? 'Aguardando a pessoa aceitar' : null}
            onPress={addFriend}
          />
          {onCall && !pf.blocked ? <Row icon="call-outline" label="Convidar para chamada" sub="Para a sua sala de voz ou numa chamada particular" color={D.green} onPress={() => onCall(name)} /> : null}
          <Row icon="at-outline" label="Mencionar" sub={`Escreve @${first} na conversa`} onPress={() => { onMention && onMention(name); onClose(); }} />
          {person ? <Row icon="person-circle-outline" label="Ver perfil" onPress={() => { onClose(); dispatch({ type: 'OPEN_PROFILE', id: person.id }); }} /> : null}

          <Text style={st.label}>Apelido ou nota (só você vê)</Text>
          <TextInput value={note} onChangeText={setNote} onEndEditing={() => set({ note: note.trim() })} onSubmitEditing={() => set({ note: note.trim() })} placeholder="Ex.: duo da ranqueada" placeholderTextColor={D.muted} maxLength={40} style={st.input} />

          {canMod ? (
            <>
              <Text style={st.label}>Moderação</Text>
              <Row icon="mic-off-outline" label="Tirar da voz" onPress={() => kick(true)} />
              <Row icon="exit-outline" label="Expulsar do servidor" color={D.red} onPress={() => kick(false)} />
            </>
          ) : null}

          <Row icon="flag-outline" label="Denunciar" color={D.red} onPress={report} />
          <Row icon="ban-outline" label={pf.blocked ? 'Desbloquear' : 'Bloquear'} color={D.red} onPress={block} />
        </ScrollView>
      </View>
    </KeyboardLift></Modal>
  );
}

const st = StyleSheet.create({
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 28 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: D.gold, alignItems: 'center', justifyContent: 'center' },
  volBox: { backgroundColor: D.soft, borderRadius: 14, padding: 12, marginBottom: 4 },
  volBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: D.line },
  label: { color: D.muted, fontSize: 12, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: D.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, color: D.text, marginBottom: 6 },
});
