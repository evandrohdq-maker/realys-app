import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useStore, myProducts } from '../../store';
import { colors, brl } from '../../theme';
import { Screen, Title, Card, Row, Input, Button, Badge, Photo } from '../../components/ui';
import { UPLOAD_PLANS, STORAGE_PLAN } from '../../extraData';
import { MY_COMPANY_ID } from '../../data';
import { profileById, mediaOf } from '../../components/CompanyProfile';
import { Stars, reviewer } from '../../components/BusinessPage';
import { SECTORS, SERVE_MODES, GALLERY_TYPES, businessOf, showcaseOf } from '../../companyBusiness';

const NIGHT = '#0B1124';
const MAX_SHOWCASE = 6;

// Chip de escolha (setor, segmento, modo de atender).
function Pick({ label, on, onPress, icon, small }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.pick, small && styles.pickSmall, on && styles.pickOn]} activeOpacity={0.8}>
      {icon ? <Ionicons name={icon} size={small ? 12 : 14} color={on ? NIGHT : colors.primary} style={{ marginRight: 4 }} /> : null}
      <Text style={[styles.pickText, small && { fontSize: 11 }, on && { color: NIGHT }]}>{label}</Text>
      {on && small ? <Ionicons name="checkmark" size={12} color={NIGHT} style={{ marginLeft: 3 }} /> : null}
    </TouchableOpacity>
  );
}

function Head({ icon, title, sub }) {
  return (
    <View style={{ marginTop: 14, marginBottom: 8 }}>
      <Row>
        <View style={styles.headIcon}>
          <Ionicons name={icon} size={15} color={colors.gold} />
        </View>
        <Text style={styles.h2Inline}>{title}</Text>
      </Row>
      {sub ? <Text style={[styles.sub, { marginTop: 4 }]}>{sub}</Text> : null}
    </View>
  );
}

// Área empresarial › Página: monta a página pública da empresa: apresentação, onde atua e os
// segmentos de cada área, onde atende, vitrine, depoimentos expostos, vídeos de propaganda e,
// opcionalmente, músicas, vídeos e obras (o arquivo fica no servidor do Realys, e esse espaço é pago).
export default function PageScreen() {
  const { state, dispatch } = useStore();
  const me = profileById(state, MY_COMPANY_ID);
  const biz = businessOf(state, MY_COMPANY_ID);
  const [bio, setBio] = useState(me.bio);
  const [hours, setHours] = useState(me.hours || '');
  const [tagline, setTagline] = useState(biz.tagline || '');
  const [serves, setServes] = useState(biz.serves || '');
  const [team, setTeam] = useState(biz.team || '');
  const [address, setAddress] = useState(biz.address || '');
  const [contact, setContact] = useState(biz.contact || '');
  const [photoType, setPhotoType] = useState('equipe');
  const [caption, setCaption] = useState('');
  const [openSector, setOpenSector] = useState(Object.keys(biz.sectors || {})[0] || null);
  const [custom, setCustom] = useState('');
  const [adTitle, setAdTitle] = useState('');
  const [adFile, setAdFile] = useState(null);
  const [showMedia, setShowMedia] = useState(false);
  const [kind, setKind] = useState('musica');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [price, setPrice] = useState('');
  const plan = UPLOAD_PLANS[kind];
  const fee = state.mediaPlan ? 0 : plan.fee;
  const adFee = state.mediaPlan ? 0 : UPLOAD_PLANS.video.fee;
  const mine = mediaOf(state, MY_COMPANY_ID);
  const products = myProducts(state);
  const showcase = showcaseOf(state, MY_COMPANY_ID).map((x) => x.id);
  const sectors = biz.sectors || {};
  const modes = biz.modes || [];
  const pendingReviews = biz.reviews.filter((rv) => rv.who === 'me' && !rv.shown && !(state.myBusiness && state.myBusiness.reviewShown && rv.id in state.myBusiness.reviewShown));

  const setBiz = (patch) => dispatch({ type: 'SET_BUSINESS', patch });

  const savePage = () => {
    dispatch({ type: 'SET_PAGE', page: { bio: bio.trim(), hours: hours.trim() } });
    setBiz({ tagline: tagline.trim(), serves: serves.trim(), team: team.trim(), address: address.trim(), contact: contact.trim() });
    Alert.alert('Página atualizada', 'Os clientes já veem a nova apresentação.');
  };

  // Onde atua: liga/desliga a área; cada área tem os seus segmentos.
  const toggleSector = (k) => {
    const next = { ...sectors };
    if (next[k]) delete next[k];
    else next[k] = [];
    setBiz({ sectors: next });
    setOpenSector(next[k] ? k : Object.keys(next)[0] || null);
  };
  const toggleSegment = (k, sg) => {
    const list = sectors[k] || [];
    setBiz({ sectors: { ...sectors, [k]: list.includes(sg) ? list.filter((x) => x !== sg) : [...list, sg] } });
  };
  const addCustom = () => {
    const sg = custom.trim();
    if (!sg || !openSector) return;
    const list = sectors[openSector] || [];
    if (!list.includes(sg)) setBiz({ sectors: { ...sectors, [openSector]: [...list, sg] } });
    setCustom('');
  };
  const toggleMode = (k) => setBiz({ modes: modes.includes(k) ? modes.filter((x) => x !== k) : [...modes, k] });

  // Galeria empresarial: só fotos da empresa (equipe, produtos, estrutura). Não é perfil social.
  const addPhoto = async () => {
    let uri = null;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return Alert.alert('Permissão necessária', 'Autorize o Realys a ver suas fotos para montar a galeria da empresa.');
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (res.canceled || !res.assets || !res.assets[0]) return;
      uri = res.assets[0].uri;
    } catch (e) {
      return Alert.alert('Não deu para abrir a galeria', 'Tente de novo em instantes.');
    }
    const m = state.myBusiness || {};
    setBiz({ newPhotos: [{ id: 'gp' + Date.now(), type: photoType, photo: uri, caption: caption.trim() }, ...(m.newPhotos || [])] });
    setCaption('');
  };
  const removePhoto = (ph) => {
    const m = state.myBusiness || {};
    setBiz({ newPhotos: (m.newPhotos || []).filter((x) => x.id !== ph.id), removedPhotos: { ...(m.removedPhotos || {}), [ph.id]: true } });
  };

  // Vitrine: até 6 produtos em destaque, na ordem em que foram escolhidos.
  const toggleShowcase = (id) => {
    if (showcase.includes(id)) return setBiz({ showcase: showcase.filter((x) => x !== id) });
    if (showcase.length >= MAX_SHOWCASE) return Alert.alert('Vitrine cheia', `A vitrine mostra até ${MAX_SHOWCASE} produtos. Tire um para colocar outro.`);
    setBiz({ showcase: [...showcase, id] });
  };

  // Depoimentos: a empresa escolhe quais ficam expostos na página.
  const toggleReview = (rv) => setBiz({ reviewShown: { ...((state.myBusiness && state.myBusiness.reviewShown) || {}), [rv.id]: !rv.shown } });

  // Propagandas: vídeo simulado na demonstração (na versão final abre o seletor de arquivos).
  const pickAd = () => {
    const base = (adTitle.trim() || 'propaganda').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');
    setAdFile({ name: base + '.mp4', size: Math.round(20 + Math.random() * 180), length: `0:${String(15 + Math.round(Math.random() * 3) * 15).padStart(2, '0')}` });
  };
  const uploadAd = () => {
    if (!adTitle.trim()) return Alert.alert('Falta o título', 'Dê um nome para a propaganda.');
    if (!adFile) return Alert.alert('Falta o vídeo', 'Escolha o arquivo .mp4 da propaganda.');
    if (adFee > state.wallet) return Alert.alert('Saldo insuficiente', 'Adicione saldo Realys para pagar o servidor.');
    const go = () => {
      dispatch({
        type: 'AD_UPLOAD',
        fee: adFee,
        ad: { id: 'ad' + Date.now(), title: adTitle.trim(), length: adFile.length, views: 0, cover: `https://picsum.photos/seed/realys-ad-${Date.now()}/640/360`, file: adFile.name },
      });
      setAdTitle('');
      setAdFile(null);
      Alert.alert('Propaganda publicada ✅', 'O vídeo já aparece na guia Propagandas da sua página.');
    };
    if (!adFee) return go();
    Alert.alert('Pagar o servidor', `Guardar "${adFile.name}" (${adFile.size} MB) custa ${brl(adFee)}. Pagar com saldo Realys?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Pagar e publicar', onPress: go },
    ]);
  };
  const removeAd = (ad) => {
    const m = state.myBusiness || {};
    setBiz({ newAds: (m.newAds || []).filter((x) => x.id !== ad.id), removedAds: { ...(m.removedAds || {}), [ad.id]: true } });
  };

  // Na demonstração o arquivo é simulado; na versão final abre o seletor de arquivos do celular.
  const pick = () => {
    const [a, b] = plan.sizeMb;
    const size = Math.round(a + Math.random() * (b - a));
    const base = (title.trim() || 'meu-arquivo').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');
    setFile({ name: base + plan.ext, size });
  };

  const upload = () => {
    if (!title.trim()) return Alert.alert('Falta o título', 'Dê um nome para a faixa, vídeo ou obra.');
    if (!file) return Alert.alert('Falta o arquivo', `Escolha o arquivo ${plan.ext}.`);
    if (fee > state.wallet) return Alert.alert('Saldo insuficiente', 'Adicione saldo Realys para pagar o servidor.');
    const value = Number(String(price).replace(',', '.')) || 0;
    const go = () => {
      dispatch({
        type: 'MEDIA_UPLOAD',
        fee,
        item: {
          id: 'mm' + Date.now(),
          ownerId: MY_COMPANY_ID,
          kind,
          title: title.trim(),
          length: kind === 'obra' ? 'foto da obra' : kind === 'video' ? `${file.size} MB` : '3:30',
          plays: 0,
          price: value,
          cover: `https://picsum.photos/seed/realys-up-${Date.now()}/400/300`,
          file: file.name,
        },
      });
      setTitle('');
      setFile(null);
      setPrice('');
      Alert.alert('Publicado ✅', 'Seu conteúdo já aparece na sua página para todos os clientes.');
    };
    if (!fee) return go();
    Alert.alert('Pagar o servidor', `Guardar "${file.name}" (${file.size} MB) custa ${brl(fee)}. Pagar com saldo Realys?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Pagar e publicar', onPress: go },
    ]);
  };

  const subscribe = () => {
    if (STORAGE_PLAN.price > state.wallet) return Alert.alert('Saldo insuficiente', 'Adicione saldo Realys para assinar.');
    Alert.alert(STORAGE_PLAN.label, `${brl(STORAGE_PLAN.price)} ${STORAGE_PLAN.detail}. Assinar?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Assinar', onPress: () => dispatch({ type: 'MEDIA_PLAN', price: STORAGE_PLAN.price }) },
    ]);
  };

  const sectorKeys = Object.keys(sectors);

  return (
    <Screen>
      <Title sub="O que os clientes veem quando abrem a página da sua empresa">Sua página</Title>

      {/* Prévia no estilo da página */}
      <View style={styles.preview}>
        <View style={styles.previewGlowGold} />
        <View style={styles.previewGlowBlue} />
        <Row>
          <View style={styles.previewLogo}>
            <Text style={{ fontSize: 26 }}>{me.logo}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.previewName}>{me.name}</Text>
            <Text style={styles.previewTag} numberOfLines={1}>{tagline || 'Escreva o slogan da sua empresa'}</Text>
            <Text style={styles.previewSub}>
              {me.followers + (state.following[MY_COMPANY_ID] ? 1 : 0)} seguidores · {sectorKeys.length} áreas · {biz.reviews.filter((x) => x.shown).length} depoimentos
            </Text>
          </View>
        </Row>
        <TouchableOpacity style={styles.previewBtn} onPress={() => dispatch({ type: 'OPEN_COMPANY', id: MY_COMPANY_ID })}>
          <Ionicons name="eye-outline" size={16} color={NIGHT} />
          <Text style={styles.previewBtnText}>Ver como cliente</Text>
        </TouchableOpacity>
      </View>

      <Head icon="id-card-outline" title="Apresentação" />
      <Card>
        <Text style={styles.label}>Slogan</Text>
        <Input value={tagline} onChangeText={setTagline} placeholder="Ex.: O mercado do bairro, agora na palma da mão" />
        <Text style={styles.label}>Sobre a empresa</Text>
        <Input value={bio} onChangeText={setBio} placeholder="Conte quem é a sua empresa" multiline />
        <Text style={styles.label}>Horário</Text>
        <Input value={hours} onChangeText={setHours} placeholder="Seg a sex, 9h às 18h" />
        <Text style={styles.label}>Equipe</Text>
        <Input value={team} onChangeText={setTeam} placeholder="Ex.: 18 colaboradores" />
        <Text style={styles.label}>Endereço</Text>
        <Input value={address} onChangeText={setAddress} placeholder="Rua, número · bairro, cidade" />
        <Text style={styles.label}>Atendimento (horário e telefone comercial)</Text>
        <Input value={contact} onChangeText={setContact} placeholder="Seg a sáb, 8h às 18h · (11) 0000-0000" />
        <Text style={styles.label}>Onde atende</Text>
        <Input value={serves} onChangeText={setServes} placeholder="Ex.: Vila Mariana e região · entrega em até 1 h" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
          {SERVE_MODES.map((m) => (
            <Pick key={m.key} small icon={m.icon} label={m.label} on={modes.includes(m.key)} onPress={() => toggleMode(m.key)} />
          ))}
        </View>
        <Button small title="Salvar apresentação" onPress={savePage} />
      </Card>

      <Head icon="images-outline" title={`Galeria da empresa (${(biz.gallery || []).length})`} sub="Fotos da equipe, dos produtos e da estrutura. A página é um perfil empresarial: nada de fotos pessoais." />
      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 }}>
          {GALLERY_TYPES.map((t) => (
            <Pick key={t.key} small icon={t.icon} label={t.label} on={photoType === t.key} onPress={() => setPhotoType(t.key)} />
          ))}
        </View>
        <Input value={caption} onChangeText={setCaption} placeholder={photoType === 'equipe' ? 'Ex.: Equipe da entrega' : photoType === 'produtos' ? 'Ex.: Linha de cafés especiais' : 'Ex.: Nossa loja na Vila Mariana'} />
        <Button small title="Escolher foto do celular" onPress={addPhoto} />
        <View style={[styles.gGrid, { marginTop: 10 }]}>
          {(biz.gallery || []).map((ph) => (
            <View key={ph.id} style={styles.gItem}>
              <Photo uri={ph.photo} style={styles.gImg} fallback="🏢" />
              <Text style={styles.gTag}>{(GALLERY_TYPES.find((t) => t.key === ph.type) || {}).label}</Text>
              <TouchableOpacity onPress={() => removePhoto(ph)} style={styles.gDel} accessibilityLabel="Remover foto">
                <Ionicons name="close" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </Card>

      <Head icon="grid-outline" title="Onde a empresa atua" sub="Escolha as áreas em que você trabalha. Em cada uma, marque os segmentos que descrevem a sua empresa." />
      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {SECTORS.map((sec) => (
            <Pick key={sec.key} icon={sec.icon} label={sec.label} on={!!sectors[sec.key]} onPress={() => toggleSector(sec.key)} />
          ))}
        </View>
      </Card>
      {sectorKeys.map((k) => {
        const sec = SECTORS.find((x) => x.key === k);
        if (!sec) return null;
        const open = openSector === k;
        const list = sectors[k] || [];
        const extra = list.filter((sg) => !sec.segments.includes(sg));
        return (
          <Card key={k} style={open ? { borderColor: colors.gold, borderWidth: 1.5 } : null}>
            <TouchableOpacity onPress={() => setOpenSector(open ? null : k)} activeOpacity={0.8}>
              <Row>
                <Ionicons name={sec.icon} size={18} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.name}>{sec.label}</Text>
                  <Text style={styles.sub} numberOfLines={1}>{list.length ? list.join(' · ') : 'Nenhum segmento marcado'}</Text>
                </View>
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
              </Row>
            </TouchableOpacity>
            {open ? (
              <>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
                  {[...sec.segments, ...extra].map((sg) => (
                    <Pick key={sg} small label={sg} on={list.includes(sg)} onPress={() => toggleSegment(k, sg)} />
                  ))}
                </View>
                <Row style={{ marginTop: 4 }}>
                  <View style={{ flex: 1 }}>
                    <Input value={custom} onChangeText={setCustom} placeholder="Outro segmento" onSubmitEditing={addCustom} />
                  </View>
                  <TouchableOpacity onPress={addCustom} style={styles.plus} accessibilityLabel="Adicionar segmento">
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </Row>
              </>
            ) : null}
          </Card>
        );
      })}

      <Head icon="sparkles-outline" title={`Vitrine (${showcase.length}/${MAX_SHOWCASE})`} sub="Toque na estrela para pôr o produto em destaque. O primeiro aparece grande no topo da página." />
      <Card>
        {products.length === 0 ? <Text style={styles.sub}>Cadastre produtos no Estoque para montar a vitrine.</Text> : null}
        {products.map((x) => {
          const on = showcase.includes(x.id);
          return (
            <TouchableOpacity key={x.id} style={styles.prodRow} onPress={() => toggleShowcase(x.id)} activeOpacity={0.8}>
              <Text style={{ fontSize: 22, width: 32 }}>{x.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{x.name}</Text>
                <Text style={styles.sub}>{brl(x.price)} · {x.stock} em estoque</Text>
              </View>
              {on ? <Text style={styles.order}>{showcase.indexOf(x.id) + 1}º</Text> : null}
              <Ionicons name={on ? 'star' : 'star-outline'} size={22} color={on ? colors.gold : colors.muted} />
            </TouchableOpacity>
          );
        })}
      </Card>

      <Head icon="chatbubbles-outline" title="Depoimentos de quem comprou" sub="Escolha quais depoimentos ficam expostos na sua página. Só clientes com compra verificada podem escrever." />
      {pendingReviews.length ? <Badge label={`${pendingReviews.length} novo(s) para aprovar`} color={colors.accent} /> : null}
      {biz.reviews.map((rv) => {
        const who = reviewer(state, rv);
        return (
          <Card key={rv.id} style={rv.shown ? { borderColor: colors.success } : null}>
            <Row>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{who.name}</Text>
                <Row style={{ marginTop: 2 }}>
                  <Stars value={rv.stars} size={12} />
                  <Text style={[styles.sub, { marginLeft: 6, marginTop: 0 }]}>{rv.time}{rv.product ? ` · ${rv.product}` : ''}</Text>
                </Row>
              </View>
              <TouchableOpacity onPress={() => toggleReview(rv)} style={[styles.expose, rv.shown && styles.exposeOn]}>
                <Ionicons name={rv.shown ? 'eye' : 'eye-off-outline'} size={14} color={rv.shown ? '#FFFFFF' : colors.muted} />
                <Text style={[styles.exposeText, rv.shown && { color: '#FFFFFF' }]}>{rv.shown ? 'Exposto' : 'Oculto'}</Text>
              </TouchableOpacity>
            </Row>
            <Text style={{ color: colors.text, marginTop: 8, lineHeight: 19 }}>“{rv.text}”</Text>
          </Card>
        );
      })}

      <Head icon="videocam-outline" title="Vídeos de propaganda" sub="Aparecem na guia Propagandas da sua página. O vídeo fica guardado no servidor do Realys." />
      <Card>
        <Input value={adTitle} onChangeText={setAdTitle} placeholder="Título da propaganda" />
        <TouchableOpacity style={styles.file} onPress={pickAd}>
          <Ionicons name={adFile ? 'film' : 'folder-open-outline'} size={20} color={colors.primary} />
          <Text style={{ color: adFile ? colors.text : colors.primary, fontWeight: '700', marginLeft: 8, flex: 1 }} numberOfLines={1}>
            {adFile ? `${adFile.name} · ${adFile.size} MB · ${adFile.length}` : 'Escolher vídeo .mp4 (até 1 GB)'}
          </Text>
        </TouchableOpacity>
        <Button title={adFee ? `Pagar ${brl(adFee)} e publicar` : 'Publicar propaganda'} onPress={uploadAd} />
      </Card>
      {(biz.ads || []).map((ad) => (
        <Card key={ad.id}>
          <Row>
            <Ionicons name="megaphone-outline" size={20} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.name} numberOfLines={1}>{ad.title}</Text>
              <Text style={styles.sub}>{ad.length} · {ad.views} visualizações</Text>
            </View>
            <TouchableOpacity onPress={() => removeAd(ad)} accessibilityLabel="Remover propaganda">
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </TouchableOpacity>
          </Row>
        </Card>
      ))}

      <TouchableOpacity onPress={() => setShowMedia(!showMedia)} activeOpacity={0.8}>
        <Head icon="musical-notes-outline" title={`Música, vídeo e obra (opcional) ${showMedia ? '▲' : '▼'}`} sub="Para artistas e empresas que vendem conteúdo: o arquivo fica no servidor do Realys e aparece na guia Músicas." />
      </TouchableOpacity>

      {showMedia ? (
        <>
          <Card style={state.mediaPlan ? { borderColor: colors.success, borderWidth: 1.5 } : null}>
            <Row>
              <Ionicons name="cloud-outline" size={20} color={state.mediaPlan ? colors.success : colors.primary} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.name}>{STORAGE_PLAN.label}</Text>
                <Text style={styles.sub}>{brl(STORAGE_PLAN.price)} {STORAGE_PLAN.detail}</Text>
              </View>
              {state.mediaPlan ? <Badge label="Ativo" color={colors.success} /> : <Button small title="Assinar" onPress={subscribe} />}
            </Row>
            {!state.mediaPlan ? <Text style={[styles.sub, { marginTop: 8 }]}>Ou pague só por envio: MP3 {brl(UPLOAD_PLANS.musica.fee)} · vídeo {brl(UPLOAD_PLANS.video.fee)} · foto de obra {brl(UPLOAD_PLANS.obra.fee)}</Text> : null}
          </Card>

          <Card>
            <Row style={{ marginBottom: 10 }}>
              {Object.entries(UPLOAD_PLANS).map(([k, p]) => {
                const on = k === kind;
                return (
                  <TouchableOpacity key={k} onPress={() => { setKind(k); setFile(null); }} style={[styles.kind, on && styles.kindOn]}>
                    <Ionicons name={p.icon} size={18} color={on ? colors.onPrimary : colors.primary} />
                    <Text style={[styles.kindText, on && { color: colors.onPrimary }]}>{p.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </Row>
            <Input value={title} onChangeText={setTitle} placeholder={kind === 'obra' ? 'Nome da obra' : kind === 'video' ? 'Título do vídeo' : 'Nome da faixa'} />
            <TouchableOpacity style={styles.file} onPress={pick}>
              <Ionicons name={file ? 'document-attach' : 'folder-open-outline'} size={20} color={colors.primary} />
              <Text style={{ color: file ? colors.text : colors.primary, fontWeight: '700', marginLeft: 8, flex: 1 }} numberOfLines={1}>
                {file ? `${file.name} · ${file.size} MB` : `Escolher arquivo ${plan.ext} (${plan.limit})`}
              </Text>
            </TouchableOpacity>
            <Input value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder={kind === 'obra' ? 'Preço da obra (R$)' : 'Preço para baixar (R$) · vazio = grátis'} />
            <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={styles.sub}>Custo do servidor</Text>
              <Text style={{ fontWeight: '700', color: fee ? colors.text : colors.success }}>{fee ? brl(fee) : 'Incluso no plano'}</Text>
            </Row>
            <Button title={fee ? `Pagar ${brl(fee)} e publicar` : 'Publicar'} onPress={upload} />
          </Card>

          <Text style={styles.h2}>Seus conteúdos ({mine.length})</Text>
          {mine.length === 0 ? <Text style={styles.sub}>Nada publicado ainda.</Text> : null}
          {mine.map((m) => (
            <Card key={m.id}>
              <Row>
                <Ionicons name={UPLOAD_PLANS[m.kind].icon} size={20} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.name}>{m.title}</Text>
                  <Text style={styles.sub}>
                    {m.file} · {m.price ? brl(m.price) : 'grátis'} · {m.plays} plays
                  </Text>
                </View>
                <TouchableOpacity onPress={() => dispatch({ type: 'MEDIA_REMOVE', id: m.id })} accessibilityLabel="Remover">
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </TouchableOpacity>
              </Row>
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { fontWeight: '700', color: colors.text },
  sub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  h2: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 8, marginBottom: 4 },
  h2Inline: { fontSize: 16, fontWeight: '700', color: colors.text, marginLeft: 8, flex: 1 },
  headIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: NIGHT, alignItems: 'center', justifyContent: 'center' },
  kind: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginHorizontal: 3 },
  kindOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  kindText: { fontSize: 11, fontWeight: '700', color: colors.primary, marginTop: 3 },
  file: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: 12, padding: 12, marginBottom: 10 },

  preview: { backgroundColor: NIGHT, borderRadius: 22, padding: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(226,182,73,0.45)' },
  previewGlowGold: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(226,182,73,0.28)', top: -90, right: -60 },
  previewGlowBlue: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(47,116,208,0.28)', bottom: -80, left: -50 },
  previewLogo: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#FFFDF8', borderWidth: 2, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  previewName: { color: '#FFFFFF', fontWeight: '800', fontSize: 18 },
  previewTag: { color: colors.gold, fontWeight: '700', fontSize: 12, marginTop: 2 },
  previewSub: { color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 4 },
  previewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gold, borderRadius: 12, paddingVertical: 9, marginTop: 14 },
  previewBtnText: { color: NIGHT, fontWeight: '800', marginLeft: 6 },

  pick: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(168,121,10,0.35)', backgroundColor: 'rgba(251,241,214,0.5)', marginRight: 6, marginBottom: 6 },
  pickSmall: { paddingHorizontal: 9, paddingVertical: 5 },
  pickOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  pickText: { color: colors.primaryDark, fontWeight: '700', fontSize: 12 },
  plus: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 8, marginBottom: 10 },

  gGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gItem: { width: '31.5%', marginBottom: 8, borderRadius: 12, overflow: 'hidden' },
  gImg: { width: '100%', height: 90 },
  gTag: { position: 'absolute', left: 4, bottom: 4, backgroundColor: 'rgba(11,17,36,0.75)', color: colors.gold, fontSize: 9, fontWeight: '800', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6, overflow: 'hidden' },
  gDel: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(217,83,79,0.9)', alignItems: 'center', justifyContent: 'center' },
  prodRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  order: { color: colors.primary, fontWeight: '800', marginRight: 8 },
  expose: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 9, paddingVertical: 5 },
  exposeOn: { backgroundColor: colors.success, borderColor: colors.success },
  exposeText: { color: colors.muted, fontWeight: '700', fontSize: 11, marginLeft: 4 },
});
