// Perfil do usuário em dois sistemas:
//  • Vida social (fotos, vídeos, destaques, depoimentos) — mostrar para todos, só amigos ou só para mim.
//  • Estúdio (portfólio de trabalhos e criações: música, vídeo, arte, foto, projeto) — cada criação
//    escolhe onde aparece: no Social, no Portfólio e/ou na parte Empresarial (página do CNPJ).
// Também: editar o perfil e o "modo invisível" (não expor o perfil para ninguém).
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, TextInput, Switch, Alert, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { colors } from '../theme';
import { Photo } from './ui';

// ---------- Ícone futurista: núcleo com brilho, anel e um ponto em órbita ----------
export function FutureIcon({ name, size = 46, color = colors.primary, glow = colors.gold, active, spin }) {
  const rot = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!spin && !active) return undefined;
    const a = Animated.loop(Animated.timing(rot, { toValue: 1, duration: 5200, easing: Easing.linear, useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [spin, active]);
  const rotate = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const ring = size + 10;
  return (
    <View style={{ width: ring, height: ring, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: ring,
          height: ring,
          borderRadius: ring / 2,
          borderWidth: 1,
          borderColor: active ? color : 'rgba(168,121,10,0.28)',
          borderStyle: 'dashed',
          transform: [{ rotate }],
        }}
      >
        <View style={{ position: 'absolute', top: -3, left: ring / 2 - 3, width: 6, height: 6, borderRadius: 3, backgroundColor: active ? colors.accent : glow }} />
      </Animated.View>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: active ? color : '#FFF8E6',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          shadowColor: glow,
          shadowOpacity: 0.7,
          shadowRadius: 10,
          elevation: active ? 8 : 4,
          borderWidth: 1,
          borderColor: active ? color : 'rgba(226,182,73,0.6)',
        }}
      >
        <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: active ? 'rgba(255,255,255,0.12)' : 'rgba(226,182,73,0.25)', top: -size * 0.45, left: -size * 0.3 }} />
        <View style={{ position: 'absolute', width: size * 0.7, height: size * 0.7, borderRadius: size, backgroundColor: 'rgba(47,116,208,0.16)', bottom: -size * 0.3, right: -size * 0.25 }} />
        <Ionicons name={name} size={size * 0.46} color={active ? '#FFFFFF' : color} />
      </View>
    </View>
  );
}

// ---------- Quem pode ver ----------
export const AUDIENCES = [
  { key: 'todos', label: 'Todos', icon: 'planet', hint: 'Qualquer pessoa do Realys' },
  { key: 'amigos', label: 'Só amigos', icon: 'people-circle', hint: 'Só quem é seu amigo' },
  { key: 'eu', label: 'Só eu', icon: 'lock-closed', hint: 'Fica guardado, ninguém vê' },
];
export const audienceLabel = (k) => (AUDIENCES.find((a) => a.key === k) || AUDIENCES[0]).label;

// Pode ver? (visitante vendo o perfil de alguém)
export function canSee(audience, isFriend, exposed = true) {
  if (!exposed) return false;
  if (audience === 'eu') return false;
  if (audience === 'amigos') return !!isFriend;
  return true;
}

function AudiencePicker({ value, onChange }) {
  return (
    <View style={styles.audRow}>
      {AUDIENCES.map((a) => {
        const on = value === a.key;
        return (
          <TouchableOpacity key={a.key} onPress={() => onChange(a.key)} style={[styles.aud, on && styles.audOn]} activeOpacity={0.85} accessibilityLabel={`${a.label}: ${a.hint}`}>
            <FutureIcon name={on ? a.icon : `${a.icon}-outline`} size={34} active={on} />
            <Text style={[styles.audLabel, on && { color: colors.primaryDark }]}>{a.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function PrivacyPanel() {
  const { state, dispatch } = useStore();
  const p = state.privacy;
  const set = (privacy) => dispatch({ type: 'SET_PRIVACY', privacy });
  return (
    <View>
      <View style={styles.exposeRow}>
        <FutureIcon name={p.exposed ? 'eye' : 'eye-off'} size={38} active={p.exposed} spin />
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={styles.h3}>{p.exposed ? 'Perfil exposto' : 'Modo invisível'}</Text>
          <Text style={styles.small}>
            {p.exposed ? 'As pessoas encontram e veem seu perfil, conforme as escolhas abaixo.' : 'Ninguém vê seu perfil agora. Você continua usando tudo no Realys normalmente.'}
          </Text>
        </View>
        <Switch
          value={p.exposed}
          onValueChange={(on) => set({ exposed: on })}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#FFFFFF"
          accessibilityLabel="Expor meu perfil"
        />
      </View>
      <View style={[!p.exposed && { opacity: 0.4 }]} pointerEvents={p.exposed ? 'auto' : 'none'}>
        <Text style={styles.label}>Vida social</Text>
        <Text style={styles.small}>Fotos, vídeos, destaques e depoimentos.</Text>
        <AudiencePicker value={p.social} onChange={(v) => set({ social: v })} />
        <Text style={[styles.label, { marginTop: 14 }]}>Estúdio e portfólio</Text>
        <Text style={styles.small}>Seus trabalhos e criações: músicas, vídeos, artes e projetos.</Text>
        <AudiencePicker value={p.portfolio} onChange={(v) => set({ portfolio: v })} />
      </View>
    </View>
  );
}

// ---------- Editar perfil ----------
async function pickImage() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permissão necessária', 'Autorize o Realys a ver suas fotos para escolher a foto do perfil.');
    return null;
  }
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
  if (res.canceled || !res.assets || !res.assets.length) return null;
  return res.assets[0].uri;
}

export function ProfileEditor({ visible, onClose }) {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const [f, setF] = useState(state.myProfile);
  useEffect(() => {
    if (visible) setF(state.myProfile);
  }, [visible]);
  const field = (k) => ({ value: f[k] || '', onChangeText: (v) => setF({ ...f, [k]: v }) });
  const save = () => {
    const handle = String(f.handle || '').trim().toLowerCase().replace(/[^a-z0-9._]/g, '');
    dispatch({ type: 'SET_MY_PROFILE', profile: { ...f, handle, bio: (f.bio || '').trim(), city: (f.city || '').trim(), profession: (f.profession || '').trim() } });
    onClose();
  };
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <View style={styles.modalHead}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn} accessibilityLabel="Cancelar">
            <Ionicons name="close" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Editar perfil</Text>
          <TouchableOpacity onPress={save} style={styles.saveBtn} accessibilityLabel="Salvar perfil">
            <Text style={{ color: colors.onPrimary, fontWeight: '900' }}>Salvar</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }} keyboardShouldPersistTaps="handled">
          <TouchableOpacity
            style={{ alignSelf: 'center', alignItems: 'center' }}
            onPress={async () => {
              const uri = await pickImage();
              if (uri) setF({ ...f, photo: uri });
            }}
            accessibilityLabel="Trocar foto do perfil"
          >
            <View style={styles.avatarRing}>
              {f.photo ? <Photo uri={f.photo} style={styles.avatar} /> : <Text style={{ fontSize: 36, fontWeight: '900', color: colors.primary }}>{(state.user.name || '?')[0]}</Text>}
              <View style={styles.camBadge}>
                <Ionicons name="camera" size={14} color="#FFFFFF" />
              </View>
            </View>
            <Text style={{ color: colors.primary, fontWeight: '800', marginTop: 8 }}>Trocar foto</Text>
          </TouchableOpacity>

          <Text style={styles.label}>Nome</Text>
          <View style={[styles.input, { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardAlt }]}>
            <Text style={{ flex: 1, color: colors.text, fontSize: 15 }}>{state.user.name}</Text>
            <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
          </View>
          <Text style={styles.small}>O nome vem do documento e da biometria, por isso não muda aqui. É o que garante que no Realys só tem gente real.</Text>

          <Text style={styles.label}>Usuário</Text>
          <View style={[styles.input, { flexDirection: 'row', alignItems: 'center' }]}>
            <Text style={{ color: colors.muted, fontSize: 15 }}>@</Text>
            <TextInput {...field('handle')} placeholder="seu.usuario" placeholderTextColor={colors.muted} autoCapitalize="none" style={{ flex: 1, color: colors.text, fontSize: 15 }} />
          </View>
          <Text style={styles.label}>Profissão ou o que você faz</Text>
          <TextInput {...field('profession')} placeholder="Ex.: fotógrafa, cantor, designer, confeiteira" placeholderTextColor={colors.muted} style={styles.input} />
          <Text style={styles.label}>Cidade</Text>
          <TextInput {...field('city')} placeholder="Ex.: São Paulo - SP" placeholderTextColor={colors.muted} style={styles.input} />
          <Text style={styles.label}>Sobre você</Text>
          <TextInput {...field('bio')} placeholder="Conte um pouco sobre você e o seu trabalho" placeholderTextColor={colors.muted} multiline maxLength={220} style={[styles.input, { height: 100, textAlignVertical: 'top', paddingTop: 12 }]} />
          <Text style={styles.label}>Link (site, loja, contato)</Text>
          <TextInput {...field('links')} placeholder="www.meusite.com.br" placeholderTextColor={colors.muted} autoCapitalize="none" style={styles.input} />

          <View style={styles.divider} />
          <Text style={[styles.h3, { marginBottom: 8 }]}>Quem vê o seu perfil</Text>
          <PrivacyPanel />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ---------- Estúdio: criar e organizar conteúdos ----------
export const CREATION_KINDS = [
  { key: 'musica', label: 'Música', icon: 'musical-notes', hint: 'Faixa em MP3' },
  { key: 'video', label: 'Vídeo', icon: 'videocam', hint: 'Clipe, aula, making of' },
  { key: 'arte', label: 'Arte', icon: 'color-palette', hint: 'Pintura, ilustração, design' },
  { key: 'foto', label: 'Foto', icon: 'aperture', hint: 'Ensaios e trabalhos' },
  { key: 'projeto', label: 'Projeto', icon: 'cube', hint: 'Portfólio de um trabalho' },
];
const kindOf = (k) => CREATION_KINDS.find((x) => x.key === k) || CREATION_KINDS[4];

export const DESTS = [
  { key: 'social', label: 'Social', icon: 'people', hint: 'No seu perfil da Comunidade' },
  { key: 'portfolio', label: 'Portfólio', icon: 'briefcase', hint: 'Na vitrine profissional do perfil' },
  { key: 'empresa', label: 'Empresarial', icon: 'business', hint: 'Na página da sua empresa (CNPJ)' },
];

function CreationComposer({ visible, kind, onClose }) {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const hasCompany = state.user.roles.includes('empresa');
  const k = kindOf(kind);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [media, setMedia] = useState(null); // { uri, name }
  const [dest, setDest] = useState({ social: true, portfolio: true, empresa: false });
  useEffect(() => {
    if (!visible) return;
    setTitle('');
    setDesc('');
    setMedia(null);
    setDest({ social: kind !== 'projeto', portfolio: true, empresa: false });
  }, [visible, kind]);

  const pick = async () => {
    if (kind === 'musica') {
      // Na demonstração a faixa é simulada; na versão final abre o seletor de arquivos MP3 do celular.
      const base = (title.trim() || 'minha-faixa').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');
      return setMedia({ uri: null, name: `${base}.mp3` });
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permissão necessária', 'Autorize o Realys a ver suas fotos e vídeos.');
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: kind === 'video' ? ['videos'] : ['images'], quality: 0.85 });
    if (res.canceled || !res.assets || !res.assets.length) return;
    const a = res.assets[0];
    setMedia({ uri: a.uri, name: a.fileName || (kind === 'video' ? 'video.mp4' : 'imagem.jpg') });
  };

  const save = () => {
    if (!title.trim()) return Alert.alert('Falta o título', `Dê um nome para a sua ${k.label.toLowerCase()}.`);
    if (!dest.social && !dest.portfolio && !dest.empresa) return Alert.alert('Onde vai aparecer?', 'Escolha pelo menos um lugar: Social, Portfólio ou Empresarial.');
    dispatch({
      type: 'ADD_CREATION',
      item: {
        id: 'cr' + Date.now(),
        kind,
        title: title.trim(),
        desc: desc.trim(),
        cover: media && media.uri && kind !== 'video' ? media.uri : `https://picsum.photos/seed/realys-studio-${Date.now()}/600/600`,
        file: media ? media.name : null,
        video: kind === 'video' && media ? media.uri : null,
        dest,
        at: Date.now(),
      },
    });
    onClose(true);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={() => onClose(false)}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <View style={styles.modalHead}>
          <TouchableOpacity onPress={() => onClose(false)} style={styles.iconBtn} accessibilityLabel="Cancelar">
            <Ionicons name="close" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Nova {k.label.toLowerCase()}</Text>
          <TouchableOpacity onPress={save} style={styles.saveBtn} accessibilityLabel="Publicar">
            <Text style={{ color: colors.onPrimary, fontWeight: '900' }}>Publicar</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.drop} onPress={pick} activeOpacity={0.85}>
            {media && media.uri && kind !== 'video' ? (
              <Photo uri={media.uri} style={{ width: '100%', height: '100%' }} />
            ) : (
              <View style={{ alignItems: 'center' }}>
                <FutureIcon name={media ? 'checkmark' : k.icon} size={56} active={!!media} spin />
                <Text style={{ color: colors.text, fontWeight: '800', marginTop: 10 }}>{media ? media.name : kind === 'musica' ? 'Escolher a faixa' : kind === 'video' ? 'Escolher o vídeo' : 'Escolher a imagem'}</Text>
                <Text style={styles.small}>{k.hint}</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.label}>Título</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder={kind === 'musica' ? 'Nome da música' : kind === 'projeto' ? 'Ex.: Identidade visual da Padaria Sol' : 'Dê um nome'} placeholderTextColor={colors.muted} style={styles.input} />
          <Text style={styles.label}>Descrição</Text>
          <TextInput value={desc} onChangeText={setDesc} placeholder="Conte como foi feito, para quem, técnicas usadas…" placeholderTextColor={colors.muted} multiline style={[styles.input, { height: 90, textAlignVertical: 'top', paddingTop: 12 }]} />

          <Text style={[styles.label, { marginTop: 18 }]}>Onde vai aparecer</Text>
          <Text style={styles.small}>Você pode mudar depois. Toque para ligar ou desligar cada lugar.</Text>
          {DESTS.map((d) => {
            const locked = d.key === 'empresa' && !hasCompany;
            const on = !!dest[d.key] && !locked;
            return (
              <TouchableOpacity
                key={d.key}
                style={[styles.destRow, on && styles.destOn, locked && { opacity: 0.5 }]}
                activeOpacity={0.85}
                onPress={() => (locked ? Alert.alert('Parte empresarial', 'Para mostrar na página de uma empresa, cadastre um CNPJ no login.') : setDest({ ...dest, [d.key]: !dest[d.key] }))}
              >
                <FutureIcon name={on ? d.icon : `${d.icon}-outline`} size={34} active={on} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.h3}>{d.label}</Text>
                  <Text style={styles.small}>{locked ? 'Só para contas com CNPJ' : d.hint}</Text>
                </View>
                <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={on ? colors.primary : colors.muted} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

// Uma criação na lista do Estúdio, com os lugares onde aparece (toque para ligar/desligar).
function CreationCard({ c, owner }) {
  const { state, dispatch } = useStore();
  const hasCompany = state.user && state.user.roles.includes('empresa');
  const k = kindOf(c.kind);
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row' }}>
        <View style={styles.cover}>
          <Photo uri={c.cover} style={{ width: '100%', height: '100%' }} />
          <View style={styles.coverTag}>
            <Ionicons name={k.icon} size={12} color="#FFFFFF" />
          </View>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.kTag}>{k.label.toUpperCase()}</Text>
          <Text style={styles.h3} numberOfLines={2}>{c.title}</Text>
          {c.desc ? <Text style={styles.small} numberOfLines={2}>{c.desc}</Text> : null}
        </View>
        {owner ? (
          <TouchableOpacity
            onPress={() =>
              Alert.alert('Apagar criação', `Apagar "${c.title}" do Estúdio?`, [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Apagar', style: 'destructive', onPress: () => dispatch({ type: 'REMOVE_CREATION', id: c.id }) },
              ])
            }
            style={{ padding: 4 }}
            accessibilityLabel="Apagar criação"
          >
            <Ionicons name="trash-outline" size={18} color={colors.muted} />
          </TouchableOpacity>
        ) : null}
      </View>
      {owner ? (
        <View style={{ flexDirection: 'row', marginTop: 10 }}>
          {DESTS.filter((d) => d.key !== 'empresa' || hasCompany).map((d) => {
            const on = !!(c.dest && c.dest[d.key]);
            return (
              <TouchableOpacity
                key={d.key}
                onPress={() => dispatch({ type: 'UPDATE_CREATION', id: c.id, patch: { dest: { [d.key]: !on } } })}
                style={[styles.chip, on && styles.chipOn]}
                accessibilityLabel={`${on ? 'Tirar de' : 'Mostrar em'} ${d.label}`}
              >
                <Ionicons name={on ? d.icon : `${d.icon}-outline`} size={13} color={on ? '#FFFFFF' : colors.primaryDark} />
                <Text style={[styles.chipTxt, on && { color: '#FFFFFF' }]}>{d.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

// Estúdio no Perfil: criar e separar o que vai para o Social, o Portfólio e a parte Empresarial.
export function StudioPanel() {
  const { state } = useStore();
  const [kind, setKind] = useState(null);
  const [filter, setFilter] = useState('todos');
  const list = state.creations.filter((c) => filter === 'todos' || (c.dest && c.dest[filter]));
  const count = (k) => state.creations.filter((c) => c.dest && c.dest[k]).length;
  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 6 }}>
        {CREATION_KINDS.map((k) => (
          <TouchableOpacity key={k.key} onPress={() => setKind(k.key)} style={styles.createTile} activeOpacity={0.85} accessibilityLabel={`Criar ${k.label}`}>
            <FutureIcon name={k.icon} size={44} />
            <Text style={styles.createLabel}>{k.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {state.creations.length ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8, marginBottom: 8 }}>
            {[{ key: 'todos', label: `Tudo ${state.creations.length}` }, ...DESTS.filter((d) => d.key !== 'empresa' || state.user.roles.includes('empresa')).map((d) => ({ key: d.key, label: `${d.label} ${count(d.key)}` }))].map((t) => (
              <TouchableOpacity key={t.key} onPress={() => setFilter(t.key)} style={[styles.filter, filter === t.key && styles.filterOn]}>
                <Text style={[styles.filterTxt, filter === t.key && { color: '#FFFFFF' }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {list.map((c) => (
            <CreationCard key={c.id} c={c} owner />
          ))}
          {!list.length ? <Text style={styles.small}>Nada aqui ainda.</Text> : null}
        </>
      ) : (
        <View style={styles.empty}>
          <Ionicons name="rocket-outline" size={22} color={colors.primary} />
          <Text style={[styles.small, { flex: 1, marginLeft: 8, marginBottom: 0 }]}>
            Toque em um tipo acima para criar. Cada criação pode ir para o Social, para o seu Portfólio{state.user.roles.includes('empresa') ? ' e para a página da sua empresa' : ''}.
          </Text>
        </View>
      )}
      <CreationComposer visible={!!kind} kind={kind || 'projeto'} onClose={() => setKind(null)} />
    </View>
  );
}

// Grade de criações para mostrar no perfil (Social ou Portfólio).
export function CreationsGrid({ items, emptyText }) {
  if (!items.length) return <Text style={styles.small}>{emptyText}</Text>;
  return (
    <View>
      {items.map((c) => (
        <CreationCard key={c.id} c={c} />
      ))}
    </View>
  );
}

// Aviso de perfil fechado para quem visita.
export function LockedPanel({ name, audience, exposed }) {
  const first = (name || '').split(' ')[0];
  const text = !exposed
    ? `${first} deixou o perfil invisível por enquanto.`
    : audience === 'amigos'
    ? `${first} mostra a vida social só para amigos. Envie uma solicitação de amizade para ver.`
    : `${first} deixou esta parte do perfil só para si.`;
  return (
    <View style={styles.locked}>
      <FutureIcon name={audience === 'amigos' && exposed ? 'people-circle' : 'lock-closed'} size={52} spin />
      <Text style={[styles.h3, { marginTop: 10, textAlign: 'center' }]}>Perfil reservado</Text>
      <Text style={[styles.small, { textAlign: 'center' }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  h3: { color: colors.text, fontWeight: '800', fontSize: 15 },
  small: { color: colors.muted, fontSize: 12, lineHeight: 17, marginBottom: 4 },
  label: { color: colors.text, fontWeight: '800', marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 14, height: 48, color: colors.text, fontSize: 15 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 20 },

  exposeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFDF6', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(226,182,73,0.5)', padding: 12, marginBottom: 6 },
  audRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  aud: { flex: 1, alignItems: 'center', paddingVertical: 10, marginHorizontal: 3, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  audOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  audLabel: { color: colors.text, fontWeight: '800', fontSize: 12, marginTop: 4 },

  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { color: colors.text, fontWeight: '900', fontSize: 18 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  saveBtn: { height: 38, borderRadius: 19, paddingHorizontal: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarRing: { width: 104, height: 104, borderRadius: 52, borderWidth: 3, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight },
  avatar: { width: 94, height: 94, borderRadius: 47 },
  camBadge: { position: 'absolute', bottom: 2, right: 2, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' },

  createTile: { width: 82, alignItems: 'center', marginRight: 6 },
  createLabel: { color: colors.text, fontWeight: '800', fontSize: 12, marginTop: 4 },
  filter: { height: 32, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, justifyContent: 'center', marginRight: 8 },
  filterOn: { backgroundColor: colors.text, borderColor: colors.text },
  filterTxt: { color: colors.text, fontWeight: '700', fontSize: 12 },
  card: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 10, marginBottom: 10 },
  cover: { width: 72, height: 72, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.cardAlt },
  coverTag: { position: 'absolute', left: 5, bottom: 5, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(31,42,68,0.7)', alignItems: 'center', justifyContent: 'center' },
  kTag: { color: colors.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  chip: { flexDirection: 'row', alignItems: 'center', height: 30, paddingHorizontal: 10, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(168,121,10,0.35)', backgroundColor: colors.primaryLight, marginRight: 6 },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipTxt: { color: colors.primaryDark, fontWeight: '800', fontSize: 12, marginLeft: 4 },
  empty: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLight, borderRadius: 14, padding: 12, marginTop: 8 },
  drop: { height: 200, borderRadius: 22, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(168,121,10,0.5)', backgroundColor: '#FFFDF6', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  destRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 10, marginTop: 8 },
  destOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  locked: { alignItems: 'center', backgroundColor: '#FFFDF6', borderRadius: 22, borderWidth: 1, borderColor: 'rgba(226,182,73,0.5)', padding: 22, marginTop: 14 },
});
