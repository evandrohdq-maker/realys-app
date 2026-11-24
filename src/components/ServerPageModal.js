// Página de usuário no servidor, aberta por cima de qualquer tela (abrirPagina(id) de serverPaginas.js).
// Visitante: Seguir / Seguindo, deixar depoimento, curtir e comentar os posts (como ele ou como
// página dele). Dono: editor de post (texto + foto ou vídeo + música), editor da página (capa, foto,
// cores, letra, formato) e aprovação dos depoimentos (no Perfil, como os outros).
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Modal, ScrollView, TouchableOpacity, Alert, Switch, Share, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Text, TextInput } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardLift } from '../keyboard';
import { useStore } from '../store';
import { colors } from '../theme';
import { Photo, PostPhoto } from './ui';
import ThemeArt from './ThemeArt';
import { openMedia } from './MediaViewer';
import CommentsSheet, { tempoCurto } from './CommentsSheet';
import { ComoSheet, ComoChip, useEuAgora } from './PublicarComo';
import { MusicPicker, MusicSticker, StoryMusicPlayer } from './StoryMusic';
import { abrirEditor } from '../edicao';
import { PAGE_CATEGORIES, categoryOfPage, pageStyle, PAGE_ACCENTS, PAGE_BACKGROUNDS, PAGE_LAYOUTS } from '../userPages';
import {
  usePaginaAberta, fecharPagina, pagina as carregarPagina, postsDaPagina, depoimentosDaPagina, seguirPagina, editarPagina, apagarPagina,
  postarNaPagina, curtirPost, mandarDepoimento, comoPaginaId, full, pagarPagina,
} from '../serverPaginas';
import { GruposDaPagina } from './Grupos';

async function escolherMidia(soFoto) {
  try {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão necessária', 'Autorize o Realyz a ver suas fotos e vídeos.');
      return null;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: soFoto ? ['images'] : ['images', 'videos'], quality: 0.9, videoMaxDuration: 90 });
    if (res.canceled || !res.assets || !res.assets[0]) return null;
    const a = res.assets[0];
    return { uri: a.uri, video: a.type === 'video', secs: a.duration ? Math.round(a.duration / 1000) : 0 };
  } catch (e) {
    return null;
  }
}

// Botão "Seguir" / "Seguindo" (topo da página e de cada post de página).
export function SeguirBotao({ seguindo, onPress, claro, style }) {
  return (
    <TouchableOpacity onPress={onPress} style={[st.follow, seguindo ? st.followOn : st.followOff, claro && seguindo && { borderColor: 'rgba(255,255,255,0.8)' }, style]} accessibilityLabel={seguindo ? 'Deixar de seguir a página' : 'Seguir a página'}>
      <Text numberOfLines={1} style={[st.followT, seguindo ? { color: claro ? '#fff' : colors.text } : { color: '#fff' }]}>{seguindo ? 'Seguindo' : 'Seguir'}</Text>
    </TouchableOpacity>
  );
}

// Coração do post: toque = curte com quem estou agora; segurar = escolher quem curte.
export function CurtirBotao({ post, onChange, cor = colors.text }) {
  const [escolher, setEscolher] = useState(false);
  const pid = comoPaginaId();
  const cheio = pid ? (post.likedPaginas || []).includes(pid) : post.liked;
  const curtir = (forcar) => {
    curtirPost(post.serverId || post.id, forcar)
      .then((r) => onChange && onChange({ liked: r.liked, likedPaginas: r.likedPaginas, likes: r.likes }))
      .catch((e) => Alert.alert('Curtir', e.message));
  };
  return (
    <>
      <TouchableOpacity style={st.act} onPress={() => curtir()} onLongPress={() => setEscolher(true)} delayLongPress={350} hitSlop={6} accessibilityLabel={cheio ? 'Descurtir' : 'Curtir. Segure para escolher como curtir'}>
        <Ionicons name={cheio ? 'heart' : 'heart-outline'} size={24} color={cheio ? '#E0245E' : cor} />
        <Text style={[st.actT, { color: cor }]}>{post.likes || 0}</Text>
      </TouchableOpacity>
      <ComoSheet visible={escolher} onClose={() => setEscolher(false)} titulo="Curtir como" onPick={(id) => curtir(id || null)} />
    </>
  );
}

function PostDaPagina({ p, pg, th, onChange, onSeguir }) {
  const [cmts, setCmts] = useState(false);
  const [som, setSom] = useState(false);
  const T = th.tone;
  const media = full(p.media);
  const video = p.mediaType === 'video';
  return (
    <View style={[st.post, { backgroundColor: T.card, borderColor: T.line }]}>
      <View style={st.postHead}>
        <Photo uri={full(pg.photo || pg.cover)} style={st.postAv} fallback="📄" />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[st.postName, { color: T.text, fontFamily: th.family }]} numberOfLines={1}>{pg.name}</Text>
          {p.musica ? (
            <Text style={[st.postSub, { color: T.muted }]} numberOfLines={1}><Ionicons name="musical-notes" size={11} color={T.muted} /> {p.musica.artist} · {p.musica.title}</Text>
          ) : (
            <Text style={[st.postSub, { color: T.muted }]}>{tempoCurto(p.createdAt)}</Text>
          )}
        </View>
        {!pg.mine ? <SeguirBotao seguindo={pg.seguindo} onPress={onSeguir} /> : null}
      </View>
      {p.text ? <Text style={[st.postText, { color: T.text, fontFamily: th.family }]}>{p.text}</Text> : null}
      {media ? (
        <TouchableOpacity activeOpacity={0.92} onPress={() => openMedia([video ? { video: media, title: pg.name, sub: p.text } : { photo: media, title: pg.name, sub: p.text }])} accessibilityLabel={video ? 'Ver o vídeo' : 'Ver a foto'}>
          {video ? (
            <View style={[st.postImg, { backgroundColor: '#14120E', alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="play-circle" size={56} color={colors.gold} />
            </View>
          ) : (
            <PostPhoto uri={media} style={st.postImg} />
          )}
        </TouchableOpacity>
      ) : null}
      {p.musica ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
          <MusicSticker music={p.musica} onPress={() => setSom(!som)} />
          <TouchableOpacity onPress={() => setSom(!som)} style={{ marginLeft: 8 }} accessibilityLabel={som ? 'Pausar a música' : 'Tocar a música'}>
            <Ionicons name={som ? 'volume-high' : 'volume-mute'} size={22} color={T.text} />
          </TouchableOpacity>
          {som ? <StoryMusicPlayer music={p.musica} /> : null}
        </View>
      ) : null}
      <View style={st.acts}>
        <CurtirBotao post={p} cor={T.text} onChange={(x) => onChange({ ...p, ...x })} />
        <TouchableOpacity style={st.act} onPress={() => setCmts(true)} hitSlop={6} accessibilityLabel="Comentários">
          <Ionicons name="chatbubble-outline" size={22} color={T.text} />
          <Text style={[st.actT, { color: T.text }]}>{p.comments || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={st.act} onPress={() => Share.share({ message: `${pg.name} no Realyz: ${p.text || ''}\n\nrealyz.com.br` }).catch(() => {})} hitSlop={6} accessibilityLabel="Compartilhar">
          <Ionicons name="paper-plane-outline" size={22} color={T.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        {p.musica ? <Text style={[st.postSub, { color: T.muted }]}>{tempoCurto(p.createdAt)}</Text> : null}
      </View>
      <CommentsSheet visible={cmts} onClose={() => setCmts(false)} postId={p.id} onCount={(d) => onChange({ ...p, comments: Math.max(0, (p.comments || 0) + d) })} />
    </View>
  );
}

// Editor de post da página: texto, foto ou vídeo, e música (como no story).
function NovoPost({ pg, visible, onClose, onDone }) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [midia, setMidia] = useState(null);
  const [musica, setMusica] = useState(null);
  const [musicas, setMusicas] = useState(false);
  const [env, setEnv] = useState(false);
  useEffect(() => {
    if (visible) {
      setText('');
      setMidia(null);
      setMusica(null);
    }
  }, [visible]);
  const publicar = () => {
    if (!text.trim() && !midia) return Alert.alert('Novo post', 'Escreva algo ou escolha uma foto ou vídeo.');
    setEnv(true);
    postarNaPagina(pg.id, { text: text.trim(), uri: midia && midia.uri, video: midia && midia.video, musica })
      .then(() => {
        onDone();
        onClose();
      })
      .catch((e) => Alert.alert('Não foi publicado', e.message))
      .finally(() => setEnv(false));
  };
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardLift style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={[st.edHead, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={onClose} style={st.edClose} accessibilityLabel="Cancelar">
            <Ionicons name="close" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={st.edTitle} numberOfLines={1}>Novo post · {pg.name}</Text>
          <TouchableOpacity onPress={publicar} disabled={env} style={st.edSave} accessibilityLabel="Publicar">
            {env ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>Publicar</Text>}
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }} keyboardShouldPersistTaps="handled">
          <TextInput value={text} onChangeText={setText} placeholder="Escreva a legenda do post" placeholderTextColor={colors.muted} multiline maxLength={2200} style={[st.field, { minHeight: 110, textAlignVertical: 'top' }]} />
          {midia ? (
            <View style={{ marginTop: 12 }}>
              {midia.video ? (
                <View style={[st.postImg, { backgroundColor: '#14120E', alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="videocam" size={40} color={colors.gold} />
                  <Text style={{ color: '#fff', marginTop: 6 }}>Vídeo{midia.secs ? ` · ${midia.secs} s` : ''}</Text>
                </View>
              ) : (
                <Photo uri={midia.uri} style={st.postImg} />
              )}
              <TouchableOpacity onPress={() => setMidia(null)} style={st.tirar} accessibilityLabel="Tirar a mídia">
                <Ionicons name="close" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : null}
          {musica ? <MusicSticker music={musica} onPress={() => setMusicas(true)} style={{ marginTop: 12, alignSelf: 'flex-start' }} /> : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 14 }}>
            <TouchableOpacity style={st.tool} onPress={async () => { const m = await escolherMidia(false); if (m) setMidia(m); }} accessibilityLabel="Foto ou vídeo">
              <Ionicons name="images-outline" size={18} color={colors.text} />
              <Text style={st.toolT} numberOfLines={1}>Foto ou vídeo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.tool} onPress={() => { onClose(); abrirEditor({ paginaId: pg.id, titulo: text.trim() }); }} accessibilityLabel="Abrir o editor de vídeo">
              <Ionicons name="film-outline" size={18} color={colors.text} />
              <Text style={st.toolT} numberOfLines={1}>Editor de vídeo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.tool} onPress={() => setMusicas(true)} accessibilityLabel="Música">
              <Ionicons name="musical-notes-outline" size={18} color={colors.text} />
              <Text style={st.toolT} numberOfLines={1}>{musica ? 'Trocar música' : 'Música'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={st.hintS}>Todo post passa pela verificação do Realyz contra golpe e notícia falsa.</Text>
        </ScrollView>
        <MusicPicker visible={musicas} current={musica} videoSecs={midia && midia.video ? midia.secs : 0} onPick={(m) => { setMusica(m); setMusicas(false); }} onRemove={() => { setMusica(null); setMusicas(false); }} onClose={() => setMusicas(false)} />
      </KeyboardLift>
    </Modal>
  );
}

// Editor da página (estilo blog): nome, apresentação, assunto, capa, foto, cores e formato.
function EditarPagina({ pg, visible, onClose, onSaved, onDeleted }) {
  const insets = useSafeAreaInsets();
  const [f, setF] = useState(null);
  const [env, setEnv] = useState(false);
  useEffect(() => {
    if (visible) setF({ name: pg.name, about: pg.about || '', category: pg.category, anon: pg.anon, cover: null, photo: null, style: { ...{ accent: '#14120E', bg: 'claro', layout: 'cartoes' }, ...(pg.style || {}) } });
  }, [visible]);
  if (!f) return null;
  const th = pageStyle({ style: f.style });
  const salvar = () => {
    setEnv(true);
    editarPagina(pg.id, { name: f.name.trim(), about: f.about.trim(), category: f.category, anon: f.anon, style: f.style, ...(f.cover ? { cover: f.cover } : {}), ...(f.photo ? { photo: f.photo } : {}) })
      .then((x) => {
        onSaved(x);
        onClose();
      })
      .catch((e) => Alert.alert('Não foi salvo', e.message))
      .finally(() => setEnv(false));
  };
  const apagar = () =>
    Alert.alert('Apagar página?', 'A página e os posts somem para todos.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: () => apagarPagina(pg.id).then(onDeleted).catch((e) => Alert.alert('Apagar', e.message)) },
    ]);
  const Opt = ({ on, label, onPress }) => (
    <TouchableOpacity onPress={onPress} style={[st.opt, on && st.optOn]} accessibilityLabel={label}>
      <Text numberOfLines={1} style={[st.optT, on && { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
  );
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardLift style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={[st.edHead, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={onClose} style={st.edClose} accessibilityLabel="Cancelar">
            <Ionicons name="close" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={st.edTitle}>Editar página</Text>
          <TouchableOpacity onPress={salvar} disabled={env} style={st.edSave} accessibilityLabel="Salvar">
            {env ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>Salvar</Text>}
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }} keyboardShouldPersistTaps="handled">
          <View style={[st.pv, { backgroundColor: th.tone.bg, borderColor: th.tone.line }]}>
            {th.tone.art ? <ThemeArt theme={th.tone.art} /> : null}
            <Photo uri={f.cover || full(pg.cover)} style={{ width: '100%', height: 90 }} fallback="📄" />
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}>
              <Photo uri={f.photo || full(pg.photo || pg.cover)} style={{ width: 40, height: 40, borderRadius: 20 }} fallback="📄" />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={{ color: th.tone.text, fontWeight: '800', fontSize: 16, fontFamily: th.family }} numberOfLines={1}>{f.name || 'Nome da página'}</Text>
                <View style={{ height: 3, width: 40, borderRadius: 2, backgroundColor: th.accent, marginTop: 5 }} />
              </View>
            </View>
          </View>
          <View style={{ flexDirection: 'row', marginTop: 10 }}>
            <TouchableOpacity style={st.tool} onPress={async () => { const m = await escolherMidia(true); if (m) setF({ ...f, cover: m.uri }); }} accessibilityLabel="Trocar a capa">
              <Ionicons name="image-outline" size={16} color={colors.text} />
              <Text style={st.toolT}>Capa</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.tool} onPress={async () => { const m = await escolherMidia(true); if (m) setF({ ...f, photo: m.uri }); }} accessibilityLabel="Trocar a foto da página">
              <Ionicons name="person-circle-outline" size={16} color={colors.text} />
              <Text style={st.toolT}>Foto da página</Text>
            </TouchableOpacity>
          </View>
          <Text style={st.label}>Nome da página</Text>
          <TextInput value={f.name} onChangeText={(v) => setF({ ...f, name: v })} style={st.field} maxLength={50} />
          <Text style={st.label}>Apresentação</Text>
          <TextInput value={f.about} onChangeText={(v) => setF({ ...f, about: v })} style={[st.field, { minHeight: 70, textAlignVertical: 'top' }]} multiline maxLength={300} />
          <Text style={st.label}>Assunto</Text>
          <View style={st.wrap}>{PAGE_CATEGORIES.map((c) => <Opt key={c.key} on={f.category === c.key} label={c.label} onPress={() => setF({ ...f, category: c.key })} />)}</View>
          <Text style={st.label}>Cor de destaque</Text>
          <View style={st.wrap}>
            {PAGE_ACCENTS.map((c) => (
              <TouchableOpacity key={c} onPress={() => setF({ ...f, style: { ...f.style, accent: c } })} accessibilityLabel={`Cor ${c}`} style={[st.swatch, { backgroundColor: c, borderWidth: f.style.accent === c ? 3 : 1, borderColor: f.style.accent === c ? colors.text : colors.borderStrong }]} />
            ))}
          </View>
          <Text style={st.label}>Fundo e tema</Text>
          <View style={st.wrap}>{PAGE_BACKGROUNDS.map((b) => <Opt key={b.key} on={f.style.bg === b.key} label={b.label} onPress={() => setF({ ...f, style: { ...f.style, bg: b.key } })} />)}</View>
          <Text style={st.label}>Formato dos posts</Text>
          <View style={st.wrap}>{PAGE_LAYOUTS.map((l) => <Opt key={l.key} on={f.style.layout === l.key} label={l.label} onPress={() => setF({ ...f, style: { ...f.style, layout: l.key } })} />)}</View>
          <View style={[st.rowB, { marginTop: 16 }]}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{f.anon ? 'Página anônima' : 'Assinada com meu nome verificado'}</Text>
              <Text style={st.hintS}>{f.anon ? 'Seu nome não aparece em nada: posts, curtidas, comentários e depoimentos saem só com o nome da página.' : 'Aparece "Assinada por você · verificado".'}</Text>
            </View>
            <Switch value={f.anon} onValueChange={(v) => setF({ ...f, anon: v })} trackColor={{ true: colors.gold, false: colors.border }} thumbColor="#fff" accessibilityLabel="Página anônima" />
          </View>
          <TouchableOpacity onPress={apagar} style={{ marginTop: 24 }} accessibilityLabel="Apagar página">
            <Text style={{ color: colors.danger, fontWeight: '700' }}>Apagar página</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardLift>
    </Modal>
  );
}

// Escrever depoimento para a página (como eu ou como uma página minha).
function DepoimentoParaPagina({ pg, visible, onClose }) {
  const insets = useSafeAreaInsets();
  const { agora } = useEuAgora();
  const [text, setText] = useState('');
  const [env, setEnv] = useState(false);
  useEffect(() => {
    if (visible) setText('');
  }, [visible]);
  const enviar = () => {
    if (text.trim().length < 5) return Alert.alert('Depoimento', 'Escreva um pouco mais.');
    setEnv(true);
    mandarDepoimento({ toPaginaId: pg.id, text: text.trim() })
      .then(() => {
        Alert.alert('Depoimento enviado', `Aparece na página depois que ${pg.name} aceitar.`);
        onClose();
      })
      .catch((e) => Alert.alert('Depoimento', e.message))
      .finally(() => setEnv(false));
  };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={st.dBack}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <KeyboardLift style={[st.dSheet, { paddingBottom: 16 + insets.bottom }]}>
          <Text style={st.dTitle}>Depoimento para {pg.name}</Text>
          <View style={[st.rowB, { marginTop: 10 }]}>
            <Text style={{ color: colors.muted, fontSize: 12.5 }}>Publicar como</Text>
            <ComoChip size={30} mostrarNome />
          </View>
          <TextInput value={text} onChangeText={setText} placeholder={`O que você diria sobre ${pg.name}?`} placeholderTextColor={colors.muted} multiline maxLength={600} style={[st.field, { minHeight: 100, textAlignVertical: 'top', marginTop: 10 }]} />
          <Text style={st.hintS}>{agora.pagina ? `Vai com o nome da página ${agora.name}.` : 'Vai com o seu nome.'} Aparece na página depois que ela aceitar.</Text>
          <TouchableOpacity onPress={enviar} disabled={env} style={[st.big, { marginTop: 12 }]} accessibilityLabel="Enviar depoimento">
            {env ? <ActivityIndicator color="#fff" /> : <Text style={st.bigT}>Enviar depoimento</Text>}
          </TouchableOpacity>
        </KeyboardLift>
      </View>
    </Modal>
  );
}

export default function ServerPageModal() {
  const aberta = usePaginaAberta();
  const { dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const [pg, setPg] = useState(null);
  const [posts, setPosts] = useState([]);
  const [deps, setDeps] = useState([]);
  const [aba, setAba] = useState('posts');
  const [novo, setNovo] = useState(false);
  const [editar, setEditar] = useState(false);
  const [depo, setDepo] = useState(false);
  const [erro, setErro] = useState(null);
  const id = aberta && aberta.id;
  const recarregar = () => {
    if (!id) return;
    carregarPagina(id).then(setPg).catch((e) => setErro(e.message));
    postsDaPagina(id).then(setPosts).catch(() => {});
    depoimentosDaPagina(id).then(setDeps).catch(() => {});
  };
  useEffect(() => {
    setPg(null);
    setPosts([]);
    setDeps([]);
    setErro(null);
    setAba('posts');
    recarregar();
  }, [aberta && aberta.at]);
  if (!aberta) return null;
  const th = pageStyle(pg || {});
  const T = th.tone;
  const seguir = () =>
    seguirPagina(pg.id)
      .then((r) => {
        setPg({ ...pg, seguindo: r.seguindo, seguidores: r.seguidores });
        setPosts((l) => l.map((p) => ({ ...p, seguindo: r.seguindo })));
      })
      .catch((e) => Alert.alert('Seguir', e.message));
  const cat = pg ? categoryOfPage(pg.category) : null;
  return (
    <Modal visible animationType="slide" onRequestClose={fecharPagina} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: T.bg, paddingBottom: insets.bottom }}>
        {T.art ? <ThemeArt theme={T.art} /> : null}
        {!pg ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 }}>
            {erro ? <Text style={{ color: colors.text, textAlign: 'center' }}>{erro}</Text> : <ActivityIndicator color={colors.primary} />}
            <TouchableOpacity onPress={fecharPagina} style={{ marginTop: 18 }} accessibilityLabel="Fechar">
              <Text style={{ color: colors.primary, fontWeight: '800' }}>Fechar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView>
            <View>
              <Photo uri={full(pg.cover)} style={[st.cover, { marginTop: 0 }]} fallback="📄" />
              <TouchableOpacity onPress={fecharPagina} style={[st.close, { top: insets.top + 10 }]} accessibilityLabel="Fechar página">
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
              <View style={[st.avWrap, { backgroundColor: T.bg }]}>
                <Photo uri={full(pg.photo || pg.cover)} style={st.av} fallback="📄" />
              </View>
            </View>
            <View style={{ paddingHorizontal: 16, paddingTop: 44 }}>
              <Text style={[st.name, { color: T.text, fontFamily: th.family }]}>{pg.name}</Text>
              <Text style={[st.handle, { color: T.muted }]}>*{pg.handle} · {cat.label}</Text>
              <View style={[st.seal, { backgroundColor: T.card }]}>
                <Ionicons name={pg.anon ? 'eye-off-outline' : 'shield-checkmark'} size={14} color={pg.anon ? T.muted : th.accent} />
                <Text numberOfLines={1} style={[st.sealT, { color: T.text }]} onPress={pg.owner && !pg.mine ? () => { fecharPagina(); dispatch({ type: 'OPEN_PROFILE', id: pg.owner.id }); } : undefined}>
                  {pg.anon ? 'Página anônima · dono verificado pelo Realyz' : `Assinada por ${pg.owner ? pg.owner.name : ''} · verificado`}
                </Text>
              </View>
              {pg.about ? <Text style={[st.about, { color: T.text, fontFamily: th.family }]}>{pg.about}</Text> : null}
              {/* Dono: mensalidade da página (2ª em diante). Atrasada = não posta até pagar. */}
              {pg.mine && pg.plano && pg.plano.paga ? (
                pg.plano.status === 'atrasado' ? (
                  <View style={st.atraso}>
                    <Text style={{ color: '#8A5A0B', fontWeight: '700', flex: 1, fontSize: 12.5 }}>Mensalidade de R$ 14,90 vencida. Adicione saldo e pague para voltar a postar.</Text>
                    <TouchableOpacity onPress={() => pagarPagina(pg.id).then(setPg).catch((e) => Alert.alert('Mensalidade', e.message))} style={st.pagar} accessibilityLabel="Pagar mensalidade da página">
                      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12.5 }}>Pagar</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={[st.stat, { color: T.muted, marginTop: 8, fontSize: 12 }]}>Página paga · R$ 14,90 por mês · próxima cobrança em {new Date(pg.plano.pagoAte).toLocaleDateString('pt-BR')}</Text>
                )
              ) : pg.mine && pg.plano ? (
                <Text style={[st.stat, { color: T.muted, marginTop: 8, fontSize: 12 }]}>Sua página gratuita</Text>
              ) : null}
              <View style={st.stats}>
                <Text style={[st.stat, { color: T.text }]}><Text style={{ fontWeight: '800' }}>{posts.length}</Text> posts</Text>
                <Text style={[st.stat, { color: T.text }]}><Text style={{ fontWeight: '800' }}>{(pg.seguidores || 0).toLocaleString('pt-BR')}</Text> seguidores</Text>
                <Text style={[st.stat, { color: T.text }]}><Text style={{ fontWeight: '800' }}>{deps.length}</Text> depoimentos</Text>
              </View>
              <View style={{ flexDirection: 'row', marginTop: 12 }}>
                {pg.mine ? (
                  <>
                    <TouchableOpacity style={[st.big, { flex: 1, backgroundColor: th.accent }]} onPress={() => setNovo(true)} accessibilityLabel="Novo post">
                      <Text style={st.bigT} numberOfLines={1}>Novo post</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[st.bigLine, { flex: 1, marginLeft: 8, borderColor: T.line }]} onPress={() => setEditar(true)} accessibilityLabel="Editar página">
                      <Text style={[st.bigLineT, { color: T.text }]} numberOfLines={1}>Editar página</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <SeguirBotao seguindo={pg.seguindo} onPress={seguir} style={{ flex: 1, paddingVertical: 10 }} />
                    <TouchableOpacity style={[st.bigLine, { flex: 1, marginLeft: 8, borderColor: T.line }]} onPress={() => setDepo(true)} accessibilityLabel="Deixar depoimento">
                      <Text style={[st.bigLineT, { color: T.text }]} numberOfLines={1}>Deixar depoimento</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
              {/* Grupos da página (até 1000 pessoas, com moderação): cursos, propostas, estratégias. */}
              <GruposDaPagina pg={pg} dono={!!pg.mine} T={T} />
              <View style={[st.tabs, { borderBottomColor: T.line }]}>
                {[['posts', 'Posts'], ['deps', 'Depoimentos']].map(([k, l]) => (
                  <TouchableOpacity key={k} onPress={() => setAba(k)} style={[st.tab, aba === k && { borderBottomColor: th.accent }]} accessibilityLabel={l}>
                    <Text style={[st.tabT, { color: aba === k ? T.text : T.muted }]}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {aba === 'posts' ? (
                posts.length ? (
                  posts.map((p) => <PostDaPagina key={p.id} p={p} pg={pg} th={th} onSeguir={seguir} onChange={(np) => setPosts((l) => l.map((x) => (x.id === np.id ? np : x)))} />)
                ) : (
                  <Text style={[st.empty, { color: T.muted }]}>{pg.mine ? 'Faça o primeiro post da página: foto, vídeo e música.' : 'Ainda não tem posts.'}</Text>
                )
              ) : deps.length ? (
                deps.map((d) => (
                  <View key={d.id} style={[st.dep, { backgroundColor: T.card }]}>
                    <Photo uri={full(d.fromPhoto)} style={{ width: 34, height: 34, borderRadius: 17 }} fallback={d.fromPagina ? '📄' : '🙂'} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={{ color: T.text, fontWeight: '800' }} numberOfLines={1}>{d.fromName}{d.fromPagina ? <Text style={{ color: colors.primary, fontSize: 11.5 }}> · página</Text> : null}</Text>
                      <Text style={{ color: T.text, marginTop: 2, lineHeight: 19 }}>{d.text}</Text>
                      <Text style={{ color: T.muted, fontSize: 11.5, marginTop: 4 }}>{tempoCurto(d.createdAt)}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={[st.empty, { color: T.muted }]}>{pg.mine ? 'Os depoimentos que você aceitar no Perfil aparecem aqui.' : 'Seja o primeiro a deixar um depoimento.'}</Text>
              )}
              <View style={{ height: 30 }} />
            </View>
          </ScrollView>
        )}
        {pg && pg.mine ? <NovoPost pg={pg} visible={novo} onClose={() => setNovo(false)} onDone={recarregar} /> : null}
        {pg && pg.mine ? <EditarPagina pg={pg} visible={editar} onClose={() => setEditar(false)} onSaved={(x) => { setPg(x); recarregar(); }} onDeleted={fecharPagina} /> : null}
        {pg && !pg.mine ? <DepoimentoParaPagina pg={pg} visible={depo} onClose={() => setDepo(false)} /> : null}
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  cover: { width: '100%', height: 170 },
  close: { position: 'absolute', right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  avWrap: { position: 'absolute', left: 16, bottom: -38, borderRadius: 46, padding: 4 },
  av: { width: 80, height: 80, borderRadius: 40 },
  name: { fontSize: 22, fontWeight: '800' },
  handle: { fontSize: 13, marginTop: 4 },
  seal: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, marginTop: 10 },
  sealT: { fontSize: 12, fontWeight: '700', marginLeft: 5, flexShrink: 1 },
  about: { fontSize: 14, lineHeight: 20, marginTop: 10 },
  stats: { flexDirection: 'row', marginTop: 12 },
  stat: { marginRight: 16, fontSize: 13.5 },
  follow: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 7, alignItems: 'center', justifyContent: 'center' },
  followOff: { backgroundColor: colors.primary },
  followOn: { borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: 'transparent' },
  followT: { fontWeight: '800', fontSize: 14 },
  big: { backgroundColor: colors.text, borderRadius: 12, paddingVertical: 11, alignItems: 'center', justifyContent: 'center' },
  bigT: { color: '#fff', fontWeight: '800', fontSize: 14 },
  bigLine: { borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  bigLineT: { fontWeight: '800', fontSize: 14 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, marginTop: 18 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabT: { fontWeight: '800', fontSize: 14 },
  empty: { textAlign: 'center', marginTop: 24, fontSize: 13.5 },
  post: { borderRadius: 16, padding: 12, marginTop: 12, borderWidth: 1 },
  postHead: { flexDirection: 'row', alignItems: 'center' },
  postAv: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: colors.gold },
  postName: { fontWeight: '800', fontSize: 14.5 },
  postSub: { fontSize: 12, marginTop: 1 },
  postText: { fontSize: 14.5, lineHeight: 21, marginTop: 10 },
  postImg: { width: '100%', height: 260, borderRadius: 12, marginTop: 10 },
  acts: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  act: { flexDirection: 'row', alignItems: 'center', marginRight: 18 },
  actT: { marginLeft: 5, fontWeight: '700', fontSize: 13 },
  dep: { flexDirection: 'row', borderRadius: 14, padding: 12, marginTop: 10 },
  edHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  edTitle: { color: colors.text, fontWeight: '800', fontSize: 16, flex: 1, marginHorizontal: 10 },
  edClose: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardAlt },
  edSave: { backgroundColor: colors.text, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 8, minWidth: 80, alignItems: 'center' },
  field: { borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, color: colors.text, backgroundColor: colors.card },
  tirar: { position: 'absolute', top: 18, right: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  tool: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: colors.borderStrong, marginRight: 8, backgroundColor: colors.card },
  toolT: { color: colors.text, fontWeight: '700', fontSize: 13, marginLeft: 6 },
  hintS: { color: colors.muted, fontSize: 12, marginTop: 10, lineHeight: 17 },
  pv: { borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 16, marginBottom: 6 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  opt: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 14, backgroundColor: colors.cardAlt, marginRight: 6, marginBottom: 6 },
  optOn: { backgroundColor: colors.text },
  optT: { color: colors.text, fontWeight: '700', fontSize: 13 },
  swatch: { width: 34, height: 34, borderRadius: 17, marginRight: 10, marginBottom: 8 },
  rowB: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  atraso: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF4DC', borderRadius: 12, padding: 10, marginTop: 10 },
  pagar: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginLeft: 8 },
  dSheet: { backgroundColor: colors.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16 },
  dTitle: { color: colors.text, fontWeight: '800', fontSize: 16 },
});
