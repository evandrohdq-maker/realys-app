// Aba Páginas: descobrir páginas de outros usuários e cuidar das minhas.
// Só cria página quem é usuário (conta verificada). Cada página é assinada pelo dono ou anônima.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../store';
import { colors, soft } from '../../theme';
import { Screen, Title, Card, Row, Input, Button, Photo } from '../../components/ui';
import { PAGE_CATEGORIES, categoryOfPage, signatureOf, myPages, canCreatePage, MAX_PAGES, PAGE_RULES, pageNameProblem, slug } from '../../userPages';

const SEGS = [
  ['descobrir', 'Descobrir'],
  ['seguindo', 'Seguindo'],
  ['minhas', 'Minhas páginas'],
];

export function PageCard({ pg, onPress }) {
  const cat = categoryOfPage(pg.category);
  return (
    <TouchableOpacity style={st.card} activeOpacity={0.88} onPress={onPress} accessibilityLabel={`Abrir a página ${pg.name}`}>
      <Photo uri={pg.cover} style={st.cover} fallback="📄" />
      <View style={{ padding: 12 }}>
        <Text style={st.name} numberOfLines={1}>{pg.name}</Text>
        <Row style={{ marginTop: 3 }}>
          <Ionicons name={pg.anon ? 'eye-off-outline' : 'shield-checkmark'} size={13} color={pg.anon ? colors.muted : colors.primary} />
          <Text style={[st.sign, !pg.anon && { color: colors.primary }]} numberOfLines={1}>{signatureOf(pg)}</Text>
        </Row>
        <Text style={st.meta} numberOfLines={1}>{cat.label} · {pg.followers.toLocaleString('pt-BR')} seguidores</Text>
      </View>
    </TouchableOpacity>
  );
}

function NewPage({ onDone }) {
  const { state, dispatch } = useStore();
  const [name, setName] = useState('');
  const [about, setAbout] = useState('');
  const [category, setCategory] = useState('comunidade');
  const [anon, setAnon] = useState(false);
  const create = () => {
    const problem = pageNameProblem(name, anon, state);
    if (problem) return Alert.alert('Confira o nome', problem);
    if (!about.trim()) return Alert.alert('Conte do que é a página', 'Escreva uma frase sobre o assunto da página.');
    dispatch({ type: 'PAGE_CREATE', page: { name: name.trim(), handle: slug(name), about: about.trim(), category, anon, cover: `https://picsum.photos/seed/realys-pg-${slug(name)}/800/400` } });
    onDone();
  };
  return (
    <Card>
      <Text style={st.h}>Nova página</Text>
      <Text style={st.label}>Nome da página</Text>
      <Input value={name} onChangeText={setName} placeholder="Ex.: Receitas de família" maxLength={50} />
      <Text style={st.label}>Do que é a página</Text>
      <Input value={about} onChangeText={setAbout} placeholder="Uma frase sobre o assunto" maxLength={200} multiline />
      <Text style={st.label}>Assunto</Text>
      <View style={st.chips}>
        {PAGE_CATEGORIES.map((c) => (
          <TouchableOpacity key={c.key} onPress={() => setCategory(c.key)} style={[st.chip, category === c.key && st.chipOn]}>
            <Ionicons name={c.icon} size={13} color={category === c.key ? '#fff' : colors.primary} />
            <Text style={[st.chipText, category === c.key && { color: '#fff' }]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Row style={{ justifyContent: 'space-between', marginTop: 14 }}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={st.toggleTitle}>{anon ? 'Página anônima' : 'Assinada com meu nome verificado'}</Text>
          <Text style={st.small}>
            {anon ? 'Seu nome não aparece. A página mostra "dono verificado pelo Re@lys".' : `Aparece "Assinada por ${state.user ? state.user.name : 'você'} · verificado".`}
          </Text>
        </View>
        <Switch value={anon} onValueChange={setAnon} trackColor={{ true: colors.gold, false: colors.border }} thumbColor="#fff" accessibilityLabel="Publicar como anônimo" />
      </Row>
      <View style={st.rules}>
        {PAGE_RULES.map((r) => (
          <Text key={r} style={st.rule}>• {r}</Text>
        ))}
      </View>
      <Button title="Criar página" onPress={create} style={{ marginTop: 12 }} />
      <Button title="Cancelar" variant="dark" small onPress={onDone} style={{ marginTop: 8 }} />
    </Card>
  );
}

export default function PagesScreen({ explore }) {
  const { state, dispatch } = useStore();
  const [seg, setSeg] = useState('descobrir');
  const [cat, setCat] = useState(null);
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  // A Lotus e a busca abrem uma página direto ou a área "Minhas páginas".
  useEffect(() => {
    if (!explore) return;
    if (explore.pageId) dispatch({ type: 'OPEN_USER_PAGE', id: explore.pageId });
    if (explore.seg) setSeg(explore.seg);
    if (explore.create) {
      setSeg('minhas');
      setCreating(true);
    }
  }, [explore && explore.at]);

  const all = state.userPages || [];
  const term = slug(q);
  const others = all.filter((p) => p.ownerId !== 'me');
  const list =
    seg === 'minhas' ? myPages(state)
    : seg === 'seguindo' ? all.filter((p) => (state.followingPages || {})[p.id])
    : others.filter((p) => (!cat || p.category === cat) && (!term || slug(p.name + p.about).includes(term))).sort((a, b) => b.followers - a.followers);

  return (
    <Screen>
      <Title sub="Páginas criadas por usuários verificados: assinadas ou anônimas">Páginas</Title>
      <View style={st.segs}>
        {SEGS.map(([k, label]) => (
          <TouchableOpacity key={k} onPress={() => setSeg(k)} style={st.seg}>
            <Text style={[st.segText, seg === k && st.segOn]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {seg === 'descobrir' ? (
        <>
          <Input value={q} onChangeText={setQ} placeholder="Buscar páginas" />
          <View style={[st.chips, { marginTop: 10 }]}>
            <TouchableOpacity onPress={() => setCat(null)} style={[st.chip, !cat && st.chipOn]}>
              <Text style={[st.chipText, !cat && { color: '#fff' }]}>Todas</Text>
            </TouchableOpacity>
            {PAGE_CATEGORIES.filter((c) => others.some((p) => p.category === c.key)).map((c) => (
              <TouchableOpacity key={c.key} onPress={() => setCat(cat === c.key ? null : c.key)} style={[st.chip, cat === c.key && st.chipOn]}>
                <Text style={[st.chipText, cat === c.key && { color: '#fff' }]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : null}

      {seg === 'minhas' ? (
        creating ? (
          <NewPage onDone={() => setCreating(false)} />
        ) : (
          <Card>
            <Text style={st.h}>Suas páginas ({myPages(state).length} de {MAX_PAGES})</Text>
            <Text style={st.small}>Toda página fica dentro da sua conta. Você escolhe se ela sai assinada com seu nome verificado ou anônima.</Text>
            <Button
              title="Criar página"
              onPress={() => (canCreatePage(state) ? setCreating(true) : Alert.alert('Limite de páginas', `Cada usuário pode ter até ${MAX_PAGES} páginas.`))}
              style={{ marginTop: 10 }}
            />
          </Card>
        )
      ) : null}

      <View style={{ marginTop: 12 }}>
        {list.map((pg) => (
          <PageCard key={pg.id} pg={pg} onPress={() => dispatch({ type: 'OPEN_USER_PAGE', id: pg.id })} />
        ))}
        {!list.length && !creating ? (
          <Text style={[st.small, { textAlign: 'center', marginTop: 20 }]}>
            {seg === 'seguindo' ? 'Você ainda não segue nenhuma página.' : seg === 'minhas' ? 'Você ainda não criou nenhuma página.' : 'Nenhuma página encontrada.'}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

const st = StyleSheet.create({
  segs: { flexDirection: 'row', marginBottom: 12 },
  seg: { marginRight: 18, paddingVertical: 4 },
  segText: { color: colors.muted, fontSize: 15, fontWeight: '600' },
  segOn: { color: colors.primaryDark, fontWeight: '800' },
  card: { backgroundColor: colors.card, borderRadius: 18, marginBottom: 12, overflow: 'hidden', ...soft },
  cover: { width: '100%', height: 110 },
  name: { color: colors.text, fontSize: 16, fontWeight: '800' },
  sign: { color: colors.muted, fontSize: 12, marginLeft: 5, fontWeight: '600', flex: 1 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 3 },
  h: { color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 4 },
  label: { color: colors.text, fontSize: 13, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  small: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6, marginBottom: 6, backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.primaryDark, fontSize: 12, fontWeight: '600', marginLeft: 4 },
  toggleTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  rules: { backgroundColor: colors.cardAlt, borderRadius: 12, padding: 10, marginTop: 12 },
  rule: { color: colors.muted, fontSize: 12, lineHeight: 17 },
});
