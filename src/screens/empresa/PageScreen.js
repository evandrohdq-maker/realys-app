import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../store';
import { colors, brl } from '../../theme';
import { Screen, Title, Card, Row, Input, Button, Badge } from '../../components/ui';
import { UPLOAD_PLANS, STORAGE_PLAN } from '../../extraData';
import { MY_COMPANY_ID } from '../../data';
import { profileById, mediaOf } from '../../components/CompanyProfile';

// Área empresarial › Página: a página pública da empresa (ou do artista) e o envio de músicas, vídeos e obras.
// Cada arquivo fica guardado no servidor do Realys, e esse espaço é pago.
export default function PageScreen() {
  const { state, dispatch } = useStore();
  const me = profileById(state, MY_COMPANY_ID);
  const [bio, setBio] = useState(me.bio);
  const [hours, setHours] = useState(me.hours || '');
  const [kind, setKind] = useState('musica');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [price, setPrice] = useState('');
  const plan = UPLOAD_PLANS[kind];
  const fee = state.mediaPlan ? 0 : plan.fee;
  const mine = mediaOf(state, MY_COMPANY_ID);

  const savePage = () => {
    dispatch({ type: 'SET_PAGE', page: { bio: bio.trim(), hours: hours.trim() } });
    Alert.alert('Página atualizada', 'Os clientes já veem a nova apresentação.');
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

  return (
    <Screen>
      <Title sub="O que os clientes veem quando abrem o seu perfil">Sua página</Title>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={styles.name}>{me.logo} {me.name}</Text>
          <Text style={styles.sub}>{me.followers + (state.following[MY_COMPANY_ID] ? 1 : 0)} seguidores</Text>
        </Row>
        <Text style={[styles.label, { marginTop: 10 }]}>Apresentação</Text>
        <Input value={bio} onChangeText={setBio} placeholder="Conte quem é a sua empresa" multiline />
        <Text style={styles.label}>Horário</Text>
        <Input value={hours} onChangeText={setHours} placeholder="Seg a sex, 9h às 18h" />
        <Row>
          <Button small title="Salvar página" onPress={savePage} />
          <View style={{ width: 8 }} />
          <Button small variant="outline" title="Ver como cliente" onPress={() => dispatch({ type: 'OPEN_COMPANY', id: MY_COMPANY_ID })} />
        </Row>
      </Card>

      <Text style={styles.h2}>Publicar música, vídeo ou obra</Text>
      <Text style={[styles.sub, { marginBottom: 10 }]}>Para artistas e empresas: o arquivo fica no servidor do Realys e aparece na sua página.</Text>

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
          <Text style={{ fontWeight: '800', color: fee ? colors.text : colors.success }}>{fee ? brl(fee) : 'Incluso no plano'}</Text>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { fontWeight: '800', color: colors.text },
  sub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  h2: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 8, marginBottom: 4 },
  kind: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginHorizontal: 3 },
  kindOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  kindText: { fontSize: 11, fontWeight: '700', color: colors.primary, marginTop: 3 },
  file: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: 12, padding: 12, marginBottom: 10 },
});
