// Trends: o que está em alta no Realyz agora. Abre pelo botão Trends (menu de cima, antes de Lives)
// e arrastando a página inicial para o lado (o outro lado continua abrindo os Reels).
//  - Em alta: os Reels e as publicações com mais curtidas e visualizações.
//  - IA: vídeos, animes e artes feitos com inteligência artificial (quem publica marca "Feito com IA").
//  - Assuntos: as #hashtags e palavras que mais aparecem nas publicações.
// Tudo contado do mesmo jeito para todo mundo: patrocínio não sobe ninguém no Trends.
import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Image, Modal, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../../responsive';
import { useStore } from '../../../store';
import { colors, soft } from '../../../theme';
import { Photo } from '../../../components/ui';
import { ReelsFeed } from '../../../components/Reels';
import { SHOP_CLIPS, FOOD_CLIPS, MERCADO_CLIPS, SERVICE_CLIPS, NEGOCIO_CLIPS, COMMUNITY_CLIPS } from '../../../adsData';

const SEGS = [
  { key: 'alta', label: 'Em alta', icon: 'flame-outline' },
  { key: 'ia', label: 'IA', icon: 'sparkles-outline' },
  { key: 'assuntos', label: 'Assuntos', icon: 'pricetag-outline' },
];
const fmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.', ',')} mil` : String(n || 0));
const pontos = (r) => (r.likes || 0) * 3 + (r.views || 0) + (r.comments || 0) * 5;
const PARADAS = new Set('para com que uma uns umas por mais muito pra pro dos das nos nas the and você voce hoje aqui agora esse essa isso tudo ainda sobre como quando'.split(' '));

export default function TrendsTab({ navigate }) {
  const { state } = useStore();
  const [seg, setSeg] = useState('alta');
  const [abrir, setAbrir] = useState(null); // { lista, start }
  const { width } = useWindowDimensions();
  const tile = Math.floor((Math.min(width, 720) - 32 - 12) / 3);

  const reels = useMemo(() => {
    const todos = [
      ...(state.myReels || []),
      ...COMMUNITY_CLIPS,
      ...SHOP_CLIPS.map((c) => ({ ...c, kind: 'shop' })),
      ...[...FOOD_CLIPS, ...MERCADO_CLIPS].map((c) => ({ ...c, kind: 'food' })),
      ...SERVICE_CLIPS,
      ...NEGOCIO_CLIPS,
    ];
    return todos.sort((a, b) => pontos(b) - pontos(a));
  }, [state.myReels]);
  const posts = useMemo(() => [...(state.communityPosts || [])].filter((p) => !p.flagged).sort((a, b) => pontos(b) - pontos(a)), [state.communityPosts]);
  const ia = useMemo(() => [...reels.filter((r) => r.ia), ...posts.filter((p) => p.ia)], [reels, posts]);
  const assuntos = useMemo(() => {
    const conta = {};
    const textos = [...posts.map((p) => p.text), ...reels.map((r) => r.title)];
    textos.forEach((t) => {
      const tags = String(t || '').match(/#[\p{L}\d_]{3,}/gu) || [];
      tags.forEach((h) => (conta[h.toLowerCase()] = (conta[h.toLowerCase()] || 0) + 2));
      String(t || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 5 && !PARADAS.has(w))
        .forEach((w) => (conta[w] = (conta[w] || 0) + 1));
    });
    return Object.entries(conta)
      .filter(([, n]) => n >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
  }, [posts, reels]);

  const Grade = ({ lista }) => (
    <View style={st.grade}>
      {lista.slice(0, 12).map((r, i) => (
        <TouchableOpacity key={r.id} style={[st.tile, { width: tile, height: Math.round(tile * 1.6) }]} onPress={() => setAbrir({ lista, start: i })} activeOpacity={0.9} accessibilityLabel={`Ver ${r.title}`}>
          {r.poster ? <Image source={r.poster} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <View style={[StyleSheet.absoluteFill, { backgroundColor: '#14120E' }]} />}
          <View style={st.rank}><Text style={st.rankText}>{i + 1}</Text></View>
          {r.ia ? <View style={st.iaTag}><Text style={st.iaTagText}>IA</Text></View> : null}
          <View style={st.tileFoot}>
            <Ionicons name="play" size={11} color="#fff" />
            <Text style={st.tileText}>{fmt(r.views)}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={st.segs}>
        {SEGS.map((s) => (
          <TouchableOpacity key={s.key} onPress={() => setSeg(s.key)} style={st.seg} accessibilityLabel={s.label}>
            <Ionicons name={s.icon} size={15} color={seg === s.key ? colors.primary : colors.muted} />
            <Text style={[st.segText, seg === s.key && { color: colors.primary, fontWeight: '800' }]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {seg === 'alta' ? (
        <>
          <Text style={st.h}>Reels em alta</Text>
          <Grade lista={reels} />
          {posts.length ? <Text style={st.h}>Publicações em alta</Text> : null}
          {posts.slice(0, 5).map((p, i) => (
            <View key={p.id} style={st.post}>
              <Text style={st.postRank}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={st.autor} numberOfLines={1}>{p.author}{p.ia ? '  · Feito com IA' : ''}</Text>
                <Text style={st.texto} numberOfLines={2}>{p.text}</Text>
                <Text style={st.meta}>♥ {fmt(p.likes)} · 💬 {fmt(p.comments)}</Text>
              </View>
              {p.image ? <Photo uri={p.image} style={st.postImg} fallback="🖼️" /> : null}
            </View>
          ))}
        </>
      ) : null}

      {seg === 'ia' ? (
        <>
          <Text style={st.sub}>Vídeos, animes e artes feitos com inteligência artificial pelo pessoal do Realyz.</Text>
          {ia.filter((x) => x.video).length ? <Grade lista={ia.filter((x) => x.video)} /> : null}
          {ia.filter((x) => !x.video).map((p) => (
            <View key={p.id} style={st.post}>
              <View style={{ flex: 1 }}>
                <Text style={st.autor} numberOfLines={1}>{p.author}</Text>
                <Text style={st.texto} numberOfLines={3}>{p.text}</Text>
              </View>
              {p.image ? <Photo uri={p.image} style={st.postImg} fallback="🖼️" /> : null}
            </View>
          ))}
          {!ia.length ? (
            <View style={st.vazio}>
              <Ionicons name="sparkles" size={30} color={colors.primary} />
              <Text style={[st.texto, { textAlign: 'center', marginTop: 8 }]}>Ainda não tem conteúdo de IA. Seja o primeiro: publique um Reel ou uma foto e marque "Feito com IA".</Text>
            </View>
          ) : null}
        </>
      ) : null}

      {seg === 'assuntos' ? (
        <>
          <Text style={st.sub}>O que o pessoal mais está falando no Realyz.</Text>
          {assuntos.map(([t, n], i) => (
            <View key={t} style={st.assunto}>
              <Text style={st.postRank}>{i + 1}</Text>
              <Text style={[st.autor, { flex: 1 }]}>{t.startsWith('#') ? t : t.charAt(0).toUpperCase() + t.slice(1)}</Text>
              <Text style={st.meta}>{n} {n === 1 ? 'menção' : 'menções'}</Text>
            </View>
          ))}
          {!assuntos.length ? <Text style={st.sub}>Ainda poucos assuntos. Eles aparecem aqui conforme o pessoal publica.</Text> : null}
        </>
      ) : null}

      <Modal visible={!!abrir} animationType="slide" onRequestClose={() => setAbrir(null)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          {abrir ? <ReelsFeed reels={abrir.lista} start={abrir.start} onClose={() => setAbrir(null)} /> : null}
          <TouchableOpacity onPress={() => setAbrir(null)} style={st.fechar} accessibilityLabel="Fechar">
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  segs: { flexDirection: 'row', marginBottom: 12 },
  seg: { flexDirection: 'row', alignItems: 'center', marginRight: 18, paddingVertical: 6 },
  segText: { color: colors.muted, fontWeight: '700', marginLeft: 5 },
  h: { color: colors.text, fontWeight: '800', fontSize: 16, marginTop: 6, marginBottom: 8 },
  sub: { color: colors.muted, fontSize: 13, marginBottom: 10 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3 },
  tile: { margin: 3, borderRadius: 10, overflow: 'hidden', backgroundColor: '#14120E' },
  rank: { position: 'absolute', top: 6, left: 6, minWidth: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  rankText: { color: '#F5C331', fontWeight: '900', fontSize: 12 },
  iaTag: { position: 'absolute', top: 6, right: 6, paddingHorizontal: 6, borderRadius: 8, backgroundColor: '#7B6CF6' },
  iaTagText: { color: '#fff', fontWeight: '900', fontSize: 11 },
  tileFoot: { position: 'absolute', bottom: 6, left: 6, flexDirection: 'row', alignItems: 'center' },
  tileText: { color: '#fff', fontWeight: '800', fontSize: 11, marginLeft: 3, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 3 },
  post: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, padding: 10, marginBottom: 8, ...soft },
  postRank: { color: colors.primary, fontWeight: '900', fontSize: 16, width: 26 },
  autor: { color: colors.text, fontWeight: '800' },
  texto: { color: colors.text, fontSize: 13.5, marginTop: 2 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  postImg: { width: 56, height: 56, borderRadius: 10, marginLeft: 8 },
  assunto: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  vazio: { alignItems: 'center', padding: 20, borderRadius: 14, backgroundColor: colors.card, marginTop: 8 },
  fechar: { position: 'absolute', top: 40, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
});
