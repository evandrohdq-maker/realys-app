// "Conheça o Realyz": no topo da Community, nas primeiras vezes que a pessoa entra.
// - O vídeo de apresentação (57 s), que abre em tela cheia.
// - O significado do app em slides (arrasta para o lado).
// - As notícias da construção do Realyz.
// Some quando a pessoa toca em "Já conheço" (fica guardado no aparelho) ou depois de 10 aberturas.
// O vídeo e a capa ficam no site (tools/site/paginas → realyz.com.br/apresentacao.mp4).
import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, ScrollView, StyleSheet, Image, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../responsive';
import { colors, soft } from '../theme';
import { openMedia } from './MediaViewer';

const SITE = 'https://realyz.com.br';
const VIDEO = SITE + '/apresentacao.mp4';
const CAPA = SITE + '/apresentacao.jpg';
const KEY = 'realys.conheca.v1';
const MAX_ABERTURAS = 10;

export const SLIDES = [
  { icon: 'person-circle-outline', t: 'Pessoas reais', x: 'Todo mundo confirma o rosto e o documento no cadastro. Aqui não entra perfil falso.' },
  { icon: 'briefcase-outline', t: 'Negócios reais', x: 'Lojas, restaurantes e prestadores verificados. O pagamento fica protegido até você receber.' },
  { icon: 'git-network-outline', t: 'Todo mundo conectado', x: 'Comida, mercado, lojas, serviços, corridas, imóveis, eventos e cursos num app só.' },
  { icon: 'sync-outline', t: 'Um ciclo de prosperidade', x: 'A loja vende, o motoboy entrega, o fornecedor fornece, o prestador é contratado. Todo mundo cresce junto.' },
  { icon: 'people-outline', t: 'Parcerias mais perto', x: 'Empresas, fornecedores e profissionais se encontram e fecham negócio, com contato protegido pelo Realyz.' },
  { icon: 'school-outline', t: 'Conhecimento que abre portas', x: 'Cursos e aulas de quem faz na prática. Aprender aqui vira trabalho aqui.' },
  { icon: 'phone-portrait-outline', t: 'Trabalho pelo celular', x: 'Você sabe fazer, alguém precisa. Como MEI ou numa vaga, seu talento é encontrado e contratado pelo celular.' },
];

// Notícias da construção do Realyz (as mais novas primeiro).
export const CONSTRUCAO = [
  { quando: 'Novembro de 2026', t: 'Pioneiros em Passo Fundo', x: '150 vagas para as primeiras empresas, prestadores, motoboys e motoristas. O Realyz abre ao público quando todas estiverem preenchidas.' },
  { quando: 'Novembro de 2026', t: 'Conversas com as pétalas da Lotus', x: 'Agora você sabe se a mensagem foi enviada, entregue e lida, mesmo com o app do seu amigo fechado.' },
  { quando: 'Novembro de 2026', t: 'O app funciona sem internet', x: 'O que você já viu fica guardado no celular. Curtidas e mensagens vão sozinhas quando a internet volta.' },
  { quando: 'Novembro de 2026', t: 'Servidor próprio no ar', x: 'Contas, publicações e conversas guardadas no servidor do Realyz, para o celular e para o site.' },
  { quando: 'Novembro de 2026', t: 'Biometria no cadastro', x: 'Confirmação do rosto com o documento: a base de tudo para não ter perfil falso nem golpe.' },
  { quando: 'Novembro de 2026', t: 'Lotus, a assistente', x: 'Diga "Lotus" e peça o que precisa: ela mostra as opções e só confirma quando você mandar.' },
];

export default function ConhecaRealyz() {
  const [mostrar, setMostrar] = useState(false);
  const [tudo, setTudo] = useState(false);
  const { width } = useWindowDimensions();
  const slideW = Math.min(300, Math.round(width * 0.72));

  useEffect(() => {
    let vivo = true;
    AsyncStorage.getItem(KEY)
      .then((t) => {
        const s = JSON.parse(t || '{}') || {};
        if (s.fechado || (s.vezes || 0) >= MAX_ABERTURAS) return;
        if (vivo) setMostrar(true);
        AsyncStorage.setItem(KEY, JSON.stringify({ ...s, vezes: (s.vezes || 0) + 1 })).catch(() => {});
      })
      .catch(() => vivo && setMostrar(true));
    return () => {
      vivo = false;
    };
  }, []);
  if (!mostrar) return null;

  const fechar = () => {
    setMostrar(false);
    AsyncStorage.getItem(KEY)
      .then((t) => AsyncStorage.setItem(KEY, JSON.stringify({ ...(JSON.parse(t || '{}') || {}), fechado: true })))
      .catch(() => {});
  };
  const assistir = () => openMedia([{ video: VIDEO, poster: CAPA, title: 'Realyz: estamos chegando em Passo Fundo', sub: 'Pessoas reais. Negócios reais.' }]);
  const noticias = tudo ? CONSTRUCAO : CONSTRUCAO.slice(0, 3);

  return (
    <View style={[st.box, soft]}>
      <View style={st.topo}>
        <Text style={st.kicker}>Bem-vindo ao Realyz</Text>
        <TouchableOpacity onPress={fechar} hitSlop={10} accessibilityLabel="Fechar a apresentação">
          <Ionicons name="close" size={20} color={colors.muted} />
        </TouchableOpacity>
      </View>

      {/* Vídeo de apresentação */}
      <TouchableOpacity style={st.video} onPress={assistir} activeOpacity={0.9} accessibilityLabel="Assistir o vídeo de apresentação do Realyz">
        <Image source={{ uri: CAPA }} style={st.capa} resizeMode="cover" />
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={st.titulo}>Entenda o Realyz em 1 minuto</Text>
          <Text style={st.texto}>Pessoas reais, negócios reais e uma cidade inteira conectada.</Text>
          <View style={st.play}>
            <Ionicons name="play" size={16} color={colors.onPrimary} />
            <Text style={st.playT}>Assistir</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Significado do app em slides */}
      <Text style={st.secao}>O que é o Realyz</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={slideW + 10} decelerationRate="fast" style={{ marginHorizontal: -14 }} contentContainerStyle={{ paddingHorizontal: 14 }}>
        {SLIDES.map((s, i) => (
          <View key={s.t} style={[st.slide, { width: slideW }, i === SLIDES.length - 1 && { marginRight: 0 }]}>
            <View style={st.slideTopo}>
              <View style={st.icone}>
                <Ionicons name={s.icon} size={20} color={colors.gold} />
              </View>
              <Text style={st.slideN}>{i + 1}/{SLIDES.length}</Text>
            </View>
            <Text style={st.slideT}>{s.t}</Text>
            <Text style={st.slideX}>{s.x}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Notícias da construção */}
      <Text style={st.secao}>A construção do Realyz</Text>
      {noticias.map((n, i) => (
        <View key={n.t} style={st.noticia}>
          <View style={st.linhaTempo}>
            <View style={st.bolinha} />
            {i < noticias.length - 1 ? <View style={st.traco} /> : null}
          </View>
          <View style={{ flex: 1, paddingBottom: 12 }}>
            <Text style={st.quando}>{n.quando}</Text>
            <Text style={st.nT}>{n.t}</Text>
            <Text style={st.texto}>{n.x}</Text>
          </View>
        </View>
      ))}
      <View style={st.rodape}>
        <TouchableOpacity onPress={() => setTudo((v) => !v)} hitSlop={8}>
          <Text style={st.link}>{tudo ? 'Ver menos' : `Ver todas (${CONSTRUCAO.length})`}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={fechar} hitSlop={8}>
          <Text style={[st.link, { color: colors.muted }]}>Já conheço o Realyz</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  box: { backgroundColor: colors.card, borderRadius: 20, padding: 14, marginTop: 10, marginBottom: 6 },
  topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  kicker: { color: colors.primaryDark, fontWeight: '800', fontSize: 12.5, letterSpacing: 0.5, textTransform: 'uppercase' },
  video: { flexDirection: 'row', alignItems: 'center' },
  capa: { width: 96, height: 170, borderRadius: 14, backgroundColor: colors.dark },
  titulo: { color: colors.text, fontWeight: '800', fontSize: 17 },
  texto: { color: colors.muted, fontSize: 13.5, lineHeight: 19, marginTop: 3 },
  play: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.primary, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 7, marginTop: 10 },
  playT: { color: colors.onPrimary, fontWeight: '800', marginLeft: 5 },
  secao: { color: colors.text, fontWeight: '800', fontSize: 15, marginTop: 16, marginBottom: 8 },
  slide: { backgroundColor: colors.dark, borderRadius: 16, padding: 16, marginRight: 10, minHeight: 150 },
  slideTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  icone: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  slideN: { color: 'rgba(251,248,241,0.5)', fontSize: 11.5, fontWeight: '700' },
  slideT: { color: colors.gold, fontWeight: '800', fontSize: 17 },
  slideX: { color: '#E9E2D3', fontSize: 13.5, lineHeight: 19, marginTop: 4 },
  noticia: { flexDirection: 'row' },
  linhaTempo: { width: 18, alignItems: 'center' },
  bolinha: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.gold, marginTop: 4 },
  traco: { flex: 1, width: 2, backgroundColor: colors.border, marginTop: 2 },
  quando: { color: colors.primaryDark, fontSize: 11.5, fontWeight: '700' },
  nT: { color: colors.text, fontWeight: '800', fontSize: 14.5, marginTop: 1 },
  rodape: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  link: { color: colors.primary, fontWeight: '800', fontSize: 13 },
});
