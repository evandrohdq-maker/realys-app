// Arena Gamer: convidar para chamada.
//  - CallPersonSheet: abre ao SEGURAR o nome de alguém (membros, jogando agora, sala de voz) ou pela
//    opção "Convidar para chamada" da pessoa. Chama para a sala de voz em que estou, para outra sala
//    do servidor ou para uma chamada particular só de vocês dois.
//  - InviteSheet: botão de adicionar (👤+) do servidor. Convida amigos do Realyz e, para quem ainda não
//    tem o app, manda o link por fora (WhatsApp, SMS...): a pessoa baixa, se cadastra e cai na chamada.
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import { Text } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { useArena, arenaPref, joinArenaVoice, arenaGuestJoins, arenaPrivateCall } from '../arena';
import { members } from '../people';
import { shareCallInvite, makeCallInvite, inviteMessage } from '../callInvite';
import RealFriendsInvite from './RealFriendsInvite';
import { Photo } from './ui';

const D = { text: '#1B1B1F', muted: '#7A7468', gold: '#B8860B', line: '#EEE8D8', soft: '#F4F0E4', green: '#2FB463', red: '#E5484D' };
const first = (n) => String(n || '').split(' ')[0];
const ACCEPT_MS = 3500; // demonstração: o convidado aceita alguns segundos depois

// Salas de voz do servidor; a primeira é a que estou (se estiver numa deste servidor).
function useRooms(sv) {
  const { voice } = useArena();
  const rooms = sv ? sv.channels.filter((c) => c.kind === 'voice') : [];
  const mine = voice && voice.sid === (sv && sv.id) ? voice.cid : null;
  return { rooms: mine ? [...rooms.filter((c) => c.id === mine), ...rooms.filter((c) => c.id !== mine)] : rooms, mine };
}

function RoomChips({ rooms, value, onChange, mine }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
      {rooms.map((c) => {
        const on = c.id === value;
        return (
          <TouchableOpacity key={c.id} onPress={() => onChange(c.id)} style={[st.chip, on && st.chipOn]} activeOpacity={0.8} accessibilityLabel={`Sala ${c.name}`}>
            <Ionicons name="volume-high" size={14} color={on ? '#fff' : D.muted} />
            <Text numberOfLines={1} style={[st.chipTxt, on && { color: '#fff' }]}>
              {c.name}
              {c.id === mine ? ' · você está' : (c.inVoice || []).length ? ` · ${(c.inVoice || []).length}` : ''}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// Entra na sala (se ainda não estou) e, na demonstração, o convidado aceita e entra logo depois.
function callInto(sv, cid, me, names) {
  joinArenaVoice(sv.id, cid, me);
  names.forEach((n, i) => setTimeout(() => !arenaPref(n).blocked && arenaGuestJoins(sv.id, cid, n), ACCEPT_MS + i * 900));
}

export function CallPersonSheet({ name, sv, me, onClose }) {
  const insets = useSafeAreaInsets();
  const { rooms, mine } = useRooms(sv);
  const [cid, setCid] = useState(null);
  useEffect(() => {
    if (name) setCid(mine || (rooms[0] && rooms[0].id) || null);
  }, [name]);
  if (!name || !sv) return null;
  const f = first(name);
  const blocked = arenaPref(name).blocked;
  const room = rooms.find((c) => c.id === cid);
  const already = room && (room.inVoice || []).includes(name);

  const toRoom = () => {
    if (!room) return;
    if (already) return Alert.alert(`${f} já está na sala`, `${f} já está em ${room.name}.`);
    callInto(sv, room.id, me, [name]);
    onClose();
    Alert.alert('Convite enviado 🎧', `Chamamos ${f} para ${room.name}. Você já está na sala; quando ${f} aceitar, aparece na voz.`);
  };
  const privateCall = () => {
    const pcid = arenaPrivateCall(sv.id, me, name);
    setTimeout(() => !arenaPref(name).blocked && arenaGuestJoins(sv.id, pcid, name), ACCEPT_MS);
    onClose();
    Alert.alert(`Chamando ${f}… 📞`, `Abrimos uma chamada particular só de vocês dois. Quando ${f} aceitar, entra na sala.`);
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={st.dim} activeOpacity={1} onPress={onClose} accessibilityLabel="Fechar" />
      <View style={[st.sheet, { paddingBottom: 18 + insets.bottom }]}>
        <View style={st.grab} />
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <View style={st.avatar}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 17 }}>{name.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={st.title} numberOfLines={1}>Convidar {f} para chamada</Text>
            <Text style={{ color: D.muted, fontSize: 12.5 }} numberOfLines={1}>{sv.emoji} {sv.name}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={{ padding: 6 }} accessibilityLabel="Fechar">
            <Ionicons name="close" size={22} color={D.muted} />
          </TouchableOpacity>
        </View>

        {blocked ? (
          <Text style={{ color: D.red, marginVertical: 12 }}>Você bloqueou {f}. Desbloqueie nas opções da pessoa para chamar.</Text>
        ) : (
          <>
            {rooms.length ? (
              <>
                <Text style={st.label}>Sala de voz</Text>
                <RoomChips rooms={rooms} value={cid} onChange={setCid} mine={mine} />
                <TouchableOpacity style={[st.primary, already && { opacity: 0.5 }]} onPress={toRoom} activeOpacity={0.85} accessibilityLabel={`Chamar ${f} para a sala`}>
                  <Ionicons name="headset" size={18} color="#fff" />
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={st.primaryTxt}>
                    {already ? `${f} já está na sala` : `Chamar para ${room ? room.name : 'a sala'}`}
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}
            <TouchableOpacity style={st.line} onPress={privateCall} activeOpacity={0.85} accessibilityLabel={`Chamada particular com ${f}`}>
              <Ionicons name="call-outline" size={18} color={D.gold} />
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={st.lineTxt}>Chamada particular com {f}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Modal>
  );
}

export function InviteSheet({ open, sv, me, onClose }) {
  const insets = useSafeAreaInsets();
  const { state } = useStore();
  const { rooms, mine } = useRooms(sv);
  const [cid, setCid] = useState(null);
  const [sent, setSent] = useState({}); // nome → true (já convidado nesta abertura)
  const [link, setLink] = useState(null); // último link gerado
  useEffect(() => {
    if (!open) return;
    setCid(mine || (rooms[0] && rooms[0].id) || null);
    setSent({});
    setLink(null);
  }, [open]);
  if (!open || !sv) return null;
  const room = rooms.find((c) => c.id === cid);
  const inRoom = (n) => !!room && (room.inVoice || []).includes(n);
  const friends = members.filter((m) => state.friends[m.id] === 'amigo');

  const invite = (m) => {
    if (!room) return;
    callInto(sv, room.id, me, [m.name]);
    setSent((x) => ({ ...x, [m.name]: true }));
  };
  const sendLink = async () => {
    if (!room) return Alert.alert('Escolha a sala', 'Crie ou escolha uma sala de voz para mandar o convite.');
    joinArenaVoice(sv.id, room.id, me); // quem convida já fica esperando na sala
    const inv = await shareCallInvite({ sid: sv.id, cid: room.id, server: sv.name, room: room.name, host: me });
    setLink(inv);
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={st.dim} activeOpacity={1} onPress={onClose} accessibilityLabel="Fechar" />
      <View style={[st.sheet, { paddingBottom: 18 + insets.bottom }]}>
        <View style={st.grab} />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={st.title}>Convidar para a chamada</Text>
            <Text style={{ color: D.muted, fontSize: 12.5 }} numberOfLines={1}>{sv.emoji} {sv.name}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={{ padding: 6 }} accessibilityLabel="Fechar">
            <Ionicons name="close" size={22} color={D.muted} />
          </TouchableOpacity>
        </View>

        {rooms.length ? (
          <>
            <Text style={st.label}>Sala de voz</Text>
            <RoomChips rooms={rooms} value={cid} onChange={setCid} mine={mine} />
          </>
        ) : (
          <Text style={{ color: D.muted, marginVertical: 10 }}>Este servidor ainda não tem sala de voz. Crie uma em Canais de voz.</Text>
        )}

        {/* Fora do app: para quem ainda não tem o Realyz (ou não está na sua lista). */}
        <TouchableOpacity style={st.primary} onPress={sendLink} activeOpacity={0.85} accessibilityLabel="Enviar link da chamada por fora do app">
          <Ionicons name="link" size={18} color="#fff" />
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={st.primaryTxt}>Enviar link por fora do app</Text>
        </TouchableOpacity>
        <Text style={st.hint}>
          Manda por WhatsApp, SMS ou e-mail. Quem não tem o Realyz baixa o app, faz o cadastro com biometria e entra direto na chamada.
        </Text>
        {link ? (
          <View style={st.linkBox}>
            <Ionicons name="checkmark-circle" size={16} color={D.green} />
            <Text style={{ color: D.text, fontSize: 12.5, marginLeft: 6, flex: 1 }} numberOfLines={2}>
              Convite gerado · código <Text style={{ fontWeight: '800', letterSpacing: 1 }}>{link.code}</Text>
              {link.local ? ' · funciona entre quem já tem o app até o servidor entrar no ar' : ' · vale 24 h'}
            </Text>
          </View>
        ) : null}

        <ScrollView style={{ maxHeight: 340 }}>
          {/* Amigos de contas reais: o convite chega como mensagem (e notificação) para a pessoa. */}
          {room ? (
            <RealFriendsInvite
              makeText={async () => {
                joinArenaVoice(sv.id, room.id, me); // quem convida já fica esperando na sala
                const inv = await makeCallInvite({ sid: sv.id, cid: room.id, server: sv.name, room: room.name, host: me });
                return inviteMessage({ ...inv, host: me, room: room.name, server: sv.name });
              }}
            />
          ) : null}
          <Text style={[st.label, { marginTop: 14 }]}>Amigos de exemplo</Text>
          {friends.length ? (
            friends.map((m) => {
              const there = inRoom(m.name);
              const done = there || sent[m.name];
              return (
                <View key={m.id} style={st.row}>
                  <Photo uri={m.photo} style={{ width: 38, height: 38, borderRadius: 19 }} fallback="🙂" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ color: D.text, fontWeight: '700' }} numberOfLines={1}>{m.name}</Text>
                    <Text style={{ color: D.muted, fontSize: 12 }} numberOfLines={1}>{there ? 'Na sala' : sent[m.name] ? 'Convite enviado · aguardando' : `*${m.handle}`}</Text>
                  </View>
                  <TouchableOpacity disabled={!!done || !room} onPress={() => invite(m)} style={[st.small, done && st.smallDone]} accessibilityLabel={`Convidar ${m.name} para a chamada`}>
                    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[st.smallTxt, done && { color: D.muted }]}>{there ? 'Na sala' : sent[m.name] ? 'Enviado' : 'Convidar'}</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          ) : (
            <Text style={{ color: D.muted, fontSize: 13 }}>Você ainda não tem amigos no Realyz. Mande o link por fora do app.</Text>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  dim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 8 },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: D.line, marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: D.gold, alignItems: 'center', justifyContent: 'center' },
  title: { color: D.text, fontWeight: '800', fontSize: 17 },
  label: { color: D.muted, fontSize: 12, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: D.line, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12, marginRight: 8, backgroundColor: D.soft, maxWidth: 220 },
  chipOn: { backgroundColor: D.green, borderColor: D.green },
  chipTxt: { color: D.text, fontWeight: '700', fontSize: 13, marginLeft: 5, flexShrink: 1 },
  primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: D.green, borderRadius: 12, minHeight: 46, paddingHorizontal: 14, marginTop: 4 },
  primaryTxt: { color: '#fff', fontWeight: '800', marginLeft: 8, fontSize: 15, flexShrink: 1 },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: D.gold, borderRadius: 12, minHeight: 46, paddingHorizontal: 14, marginTop: 10 },
  lineTxt: { color: D.gold, fontWeight: '800', marginLeft: 8, fontSize: 15, flexShrink: 1 },
  hint: { color: D.muted, fontSize: 12, lineHeight: 17, marginTop: 6 },
  linkBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E6F6EC', borderRadius: 10, padding: 9, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: D.line },
  small: { borderRadius: 10, backgroundColor: D.gold, paddingHorizontal: 14, paddingVertical: 8, minWidth: 84, alignItems: 'center' },
  smallDone: { backgroundColor: D.soft },
  smallTxt: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
