// Administrador › Mercado: levantamento que a Lotus monta sozinha com o que empresas e clientes
// publicam (preços por setor, diferenças de preço, serviços, reputação, assuntos dos clientes),
// o que ela acabou de aprender, o que foi descartado como informação falsa e as regras de uso.
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../store';
import { colors, brl } from '../../theme';
import { Screen, Title, Card, Row, Stat, Empty } from '../../components/ui';
import { marketReport, KNOWLEDGE_RULES } from '../../lm/knowledge';
import { LOYALTY_RULES } from '../../loyalty';

const NIGHT = '#0B1124';
const per = (u) => (u && !['unidade', 'venda'].includes(u) ? ` /${u}` : '');

function Head({ icon, title, sub }) {
  return (
    <View style={{ marginTop: 16, marginBottom: 8 }}>
      <Row>
        <View style={styles.headIcon}>
          <Ionicons name={icon} size={15} color={colors.gold} />
        </View>
        <Text style={styles.h2}>{title}</Text>
      </Row>
      {sub ? <Text style={[styles.sub, { marginTop: 4 }]}>{sub}</Text> : null}
    </View>
  );
}

export default function AdminMarket() {
  const { state } = useStore();
  const [allSectors, setAllSectors] = useState(false);
  const m = useMemo(() => marketReport(state), [state]);
  const sectors = allSectors ? m.sectors : m.sectors.slice(0, 8);
  const maxCount = Math.max(1, ...m.sectors.map((x) => x.count));

  return (
    <Screen>
      <Title sub="Levantamento que a Lotus faz sozinha com tudo que é publicado no Realys">Mercado</Title>

      <View style={styles.hero}>
        <View style={styles.glowGold} />
        <View style={styles.glowBlue} />
        <Row>
          <Ionicons name="sparkles" size={18} color={colors.gold} />
          <Text style={styles.heroTitle}>Conhecimento da Lotus</Text>
        </Row>
        <Text style={styles.heroSub}>Atualiza sozinho a cada produto, preço, serviço, depoimento ou post publicado. Última atualização agora.</Text>
        <Row style={{ marginTop: 12 }}>
          {[
            [m.totals.facts, 'ofertas com preço'],
            [m.totals.companies, 'quem vende'],
            [m.totals.reviews, 'depoimentos'],
            [m.totals.posts, 'posts'],
          ].map(([v, l], i) => (
            <View key={l} style={[styles.heroStat, i > 0 && styles.heroSep]}>
              <Text style={styles.heroValue}>{v}</Text>
              <Text style={styles.heroLabel}>{l}</Text>
            </View>
          ))}
        </Row>
      </View>

      <Row style={{ marginHorizontal: -4, marginTop: 10 }}>
        <Stat label="Em promoção" value={String(m.promos.count)} color={colors.accent} />
        <Stat label="Lançamentos" value={String(m.launches)} color={colors.primary} />
        <Stat label="Falsas descartadas" value={String(m.discarded.count)} color={colors.danger} />
      </Row>

      <Head icon="flash-outline" title="Aprendeu agora" sub="O que foi publicado desde que o app abriu." />
      {!m.learned.length ? <Empty text="Nada novo ainda. Publique um produto ou depoimento e volte aqui." /> : null}
      {m.learned.slice(0, 8).map((l) => (
        <Card key={l.id}>
          <Row>
            <Text style={{ fontSize: 20, width: 30 }}>{l.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{l.text}</Text>
              {l.sub ? <Text style={styles.sub}>{l.sub}</Text> : null}
            </View>
          </Row>
        </Card>
      ))}

      <Head icon="stats-chart-outline" title="Preços por setor" sub="Preço médio e faixa de preço de cada setor, contando todas as ofertas do mesmo jeito (patrocínio não muda a conta)." />
      {sectors.map((x) => (
        <Card key={x.sector}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={[styles.name, { flex: 1 }]} numberOfLines={1}>{x.sector}</Text>
            <Text style={styles.avg}>{brl(x.stats.avg)}{per(x.stats.unit)}</Text>
          </Row>
          <Text style={styles.sub}>
            {x.count} {x.count === 1 ? 'oferta' : 'ofertas'} · de {brl(x.stats.min)} a {brl(x.stats.max)} · mais em conta: {x.stats.cheapest.seller || x.stats.cheapest.title}
          </Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${(x.count / maxCount) * 100}%` }]} />
          </View>
        </Card>
      ))}
      {m.sectors.length > 8 ? (
        <TouchableOpacity onPress={() => setAllSectors(!allSectors)} style={styles.more}>
          <Text style={{ color: colors.primary, fontWeight: '800' }}>{allSectors ? 'Mostrar menos' : `Ver todos os ${m.sectors.length} setores`}</Text>
        </TouchableOpacity>
      ) : null}

      <Head icon="swap-vertical-outline" title="Maiores diferenças de preço" sub="O mesmo tipo de produto em lojas diferentes." />
      {!m.spreads.length ? <Empty text="Ainda não há produtos iguais em lojas diferentes." /> : null}
      {m.spreads.map((x) => (
        <Card key={x.lead}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={styles.name}>{x.label}</Text>
            <Text style={{ color: colors.danger, fontWeight: '900' }}>+{x.stats.spreadPct}%</Text>
          </Row>
          <Text style={styles.sub}>
            {brl(x.stats.min)} ({x.stats.cheapest.seller}) até {brl(x.stats.max)} ({x.stats.priciest.seller}) · {x.stats.n} ofertas
          </Text>
        </Card>
      ))}

      <Head icon="construct-outline" title="Quanto os serviços cobram" sub="Média dos valores cadastrados pelos prestadores e especialistas." />
      {m.services.slice(0, 10).map((x) => (
        <Card key={x.sector}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={[styles.name, { flex: 1 }]}>{x.sector}</Text>
            <Text style={styles.avg}>{brl(x.stats.avg)}{per(x.stats.unit)}</Text>
          </Row>
          <Text style={styles.sub}>{x.count} {x.count === 1 ? 'profissional' : 'profissionais'} · de {brl(x.stats.min)} a {brl(x.stats.max)}</Text>
        </Card>
      ))}

      <Head icon="star-outline" title="Reputação das empresas" sub="Nota média dos depoimentos expostos de quem comprou." />
      {m.reputation.map((o) => (
        <Card key={o.companyId}>
          <Row>
            <Text style={{ fontSize: 20, width: 30 }}>{o.logo}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{o.name}</Text>
              <Text style={styles.sub}>{o.category} · {o.count} depoimentos</Text>
            </View>
            <Text style={{ color: colors.primary, fontWeight: '900' }}>★ {String(o.rating).replace('.', ',')}</Text>
          </Row>
        </Card>
      ))}

      <Head icon="chatbubbles-outline" title="O que os clientes mais comentam" sub="Palavras que mais aparecem nos posts públicos e depoimentos verificados." />
      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {m.talk.map(([w, n]) => (
            <View key={w} style={styles.word}>
              <Text style={styles.wordText}>{w}</Text>
              <Text style={styles.wordCount}>{n}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Head icon="close-circle-outline" title="Informação falsa descartada" sub="Classificada como fake news pela IA verificadora ou pela Moderação: saiu da plataforma e do conhecimento da Lotus. Ela guarda só a marcação, para avisar quem perguntar." />
      {m.discarded.flagged ? (
        <Card style={{ backgroundColor: '#FFF4DC', borderColor: '#E9CF95' }}>
          <Text style={{ color: colors.text }}>⚠️ {m.discarded.flagged} post(s) em verificação: a Lotus não aprende com eles até a Moderação decidir.</Text>
        </Card>
      ) : null}
      {!m.discarded.list.length ? <Empty text="Nenhuma informação falsa registrada." /> : null}
      {m.discarded.list.map((f) => (
        <Card key={f.id} style={{ borderColor: 'rgba(217,83,79,0.35)' }}>
          <Row>
            <Ionicons name="ban-outline" size={18} color={colors.danger} />
            <Text style={[styles.name, { flex: 1, marginLeft: 8 }]}>“{f.claim}”</Text>
          </Row>
          <Text style={styles.sub}>
            {f.source} · {f.at}{f.reason ? ` · ${f.reason}` : ''}{f.score ? ` · IA ${f.score}%` : ''}
          </Text>
        </Card>
      ))}

      <Head icon="pricetags-outline" title="Política de bônus do Clube Realys" sub="Calibrada com o Clube iFood, cartões fidelidade de restaurantes e cashback de mercado." />
      {LOYALTY_RULES.map((r) => (
        <Card key={r.title}>
          <Row style={{ alignItems: 'flex-start' }}>
            <Ionicons name={r.icon} size={18} color={colors.primary} style={{ marginTop: 1 }} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.name}>{r.title}</Text>
              <Text style={[styles.sub, { lineHeight: 17 }]}>{r.text}</Text>
            </View>
          </Row>
        </Card>
      ))}

      <Head icon="shield-checkmark-outline" title="Regras de uso do conhecimento" />
      <View style={styles.rules}>
        {KNOWLEDGE_RULES.map((r) => (
          <Row key={r.title} style={{ alignItems: 'flex-start', marginBottom: 12 }}>
            <Ionicons name={r.icon} size={18} color={colors.gold} style={{ marginTop: 1 }} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{r.title}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2, lineHeight: 17 }}>{r.text}</Text>
            </View>
          </Row>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { fontWeight: '800', color: colors.text },
  sub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  h2: { fontSize: 16, fontWeight: '800', color: colors.text, marginLeft: 8, flex: 1 },
  headIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: NIGHT, alignItems: 'center', justifyContent: 'center' },
  avg: { color: colors.primary, fontWeight: '900' },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.border, marginTop: 8, overflow: 'hidden' },
  fill: { height: 4, backgroundColor: colors.gold },
  more: { alignItems: 'center', paddingVertical: 8 },
  hero: { backgroundColor: NIGHT, borderRadius: 22, padding: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(226,182,73,0.45)' },
  glowGold: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(226,182,73,0.25)', top: -100, right: -60 },
  glowBlue: { position: 'absolute', width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(47,116,208,0.25)', bottom: -90, left: -50 },
  heroTitle: { color: '#FFFFFF', fontWeight: '900', fontSize: 17, marginLeft: 8 },
  heroSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 6, lineHeight: 17 },
  heroStat: { flex: 1, alignItems: 'center' },
  heroSep: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.14)' },
  heroValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  heroLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  word: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLight, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, marginRight: 6, marginBottom: 6 },
  wordText: { color: colors.primaryDark, fontWeight: '800', fontSize: 12 },
  wordCount: { color: colors.muted, fontSize: 11, marginLeft: 5 },
  rules: { backgroundColor: NIGHT, borderRadius: 20, padding: 16, paddingBottom: 6, borderWidth: 1, borderColor: 'rgba(226,182,73,0.45)' },
});
