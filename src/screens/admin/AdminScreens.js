import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { useStore } from '../../store';
import { platformStats } from '../../data';
import { colors, brl } from '../../theme';
import { Screen, Title, Card, Row, Stat, Button, Badge, Section, Chip, Empty, BarChart } from '../../components/ui';

const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// Visão geral de toda a plataforma.
export function AdminOverview() {
  const { state } = useStore();
  const openReports = state.reports.filter((r) => r.status === 'aberta').length;
  const pending = state.signups.filter((s) => s.status === 'pendente').length;
  const s = platformStats;
  return (
    <Screen>
      <Title sub="Controle geral da plataforma Realys">Administração</Title>

      <Row style={{ marginHorizontal: -4, marginBottom: 8 }}>
        <Stat label="Usuários verificados" value={fmt(s.users)} color={colors.primary} />
        <Stat label="Empresas (CNPJ)" value={fmt(s.companies)} />
      </Row>
      <Row style={{ marginHorizontal: -4, marginBottom: 8 }}>
        <Stat label="Prestadores" value={fmt(s.providers)} />
        <Stat label="Fornecedores" value={fmt(s.suppliers)} />
      </Row>
      <Row style={{ marginHorizontal: -4, marginBottom: 8 }}>
        <Stat label="Pedidos hoje" value={fmt(s.ordersToday)} />
        <Stat label="Movimentado hoje" value={brl(s.gmvToday)} color={colors.success} />
      </Row>
      <Row style={{ marginHorizontal: -4, marginBottom: 16 }}>
        <Stat label="Receita Realys (mês)" value={brl(s.revenueMonth)} color={colors.success} hint="planos, vídeos, patrocínios e taxas B2B" />
        <Stat label="Fakes bloqueados" value={fmt(s.blockedFakes + state.blocked.length)} color={colors.danger} />
      </Row>

      <Card>
        <Text style={{ fontWeight: '800', marginBottom: 10 }}>Novos cadastros por dia</Text>
        <BarChart
          data={[
            { label: 'Qua', value: 210 },
            { label: 'Qui', value: 245 },
            { label: 'Sex', value: 312 },
            { label: 'Sáb', value: 388 },
            { label: 'Dom', value: 290 },
            { label: 'Seg', value: 274 },
            { label: 'Hoje', value: 158 },
          ]}
        />
      </Card>

      <Card style={{ backgroundColor: '#231C10', borderColor: '#5C4520' }}>
        <Text style={{ fontWeight: '800', marginBottom: 4 }}>⚠️ Precisa da sua atenção</Text>
        <Text style={{ color: colors.text }}>• {openReports} denúncias abertas (aba Moderação)</Text>
        <Text style={{ color: colors.text }}>• {pending} cadastros aguardando aprovação (aba Cadastros)</Text>
      </Card>

      <Section title="Receita por fonte (mês)">
        {[
          ['Planos mensais de empresas', 21840],
          ['Vídeos avulsos e vídeos longos', 7310],
          ['Patrocínio na busca', 8420],
          ['Taxas de negócios B2B', 3710],
        ].map(([label, v]) => (
          <Card key={label}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ flex: 1 }}>{label}</Text>
              <Text style={{ fontWeight: '800', color: colors.success }}>{brl(v)}</Text>
            </Row>
          </Card>
        ))}
      </Section>
    </Screen>
  );
}

const KIND_COLOR = {
  'Fake news': colors.danger,
  Golpe: colors.danger,
  Prestador: colors.accent,
  'Conteúdo ofensivo': colors.sponsored,
};

// Denúncias e alertas da IA (fake news, golpes, conduta).
export function AdminModeration() {
  const { state, dispatch } = useStore();
  const [filter, setFilter] = useState('aberta');
  const list = state.reports.filter((r) => (filter === 'aberta' ? r.status === 'aberta' : r.status !== 'aberta'));
  return (
    <Screen>
      <Title sub="Denúncias de usuários e alertas da IA verificadora">Moderação</Title>
      <Row style={{ marginBottom: 12 }}>
        <Chip label="Abertas" active={filter === 'aberta'} onPress={() => setFilter('aberta')} />
        <Chip label="Resolvidas" active={filter !== 'aberta'} onPress={() => setFilter('resolvidas')} />
      </Row>
      {!list.length ? <Empty text="Nada por aqui." /> : null}
      {list.map((r) => (
        <Card key={r.id}>
          <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
            <Badge label={r.kind} color={KIND_COLOR[r.kind] || colors.primary} />
            <Text style={{ color: colors.muted, fontSize: 12 }}>{r.count} denúncia(s)</Text>
          </Row>
          <Text style={{ fontWeight: '800' }}>{r.target}</Text>
          <Text style={{ color: colors.text, marginTop: 4 }}>{r.detail}</Text>
          <Text style={{ marginTop: 6, fontSize: 12, color: r.aiScore >= 80 ? colors.danger : colors.muted, fontWeight: '700' }}>
            🤖 IA: {r.aiScore}% de chance de ser {r.kind === 'Fake news' ? 'falso' : 'irregular'}
          </Text>
          {r.status === 'aberta' ? (
            <Row style={{ marginTop: 10, flexWrap: 'wrap' }}>
              <Button small variant="danger" title="Bloquear conta" onPress={() => dispatch({ type: 'RESOLVE_REPORT', id: r.id, status: 'bloqueado' })} style={{ marginRight: 6, marginBottom: 6 }} />
              <Button small variant="dark" title="Remover post" onPress={() => dispatch({ type: 'RESOLVE_REPORT', id: r.id, status: 'removido' })} style={{ marginRight: 6, marginBottom: 6 }} />
              <Button small variant="outline" title="Arquivar" onPress={() => dispatch({ type: 'RESOLVE_REPORT', id: r.id, status: 'arquivada' })} style={{ marginBottom: 6 }} />
            </Row>
          ) : (
            <View style={{ marginTop: 8 }}>
              <Badge label={`Resolvida: ${r.status}`} color={colors.success} />
            </View>
          )}
        </Card>
      ))}

      <Section title="Contas bloqueadas">
        {!state.blocked.length ? <Empty text="Nenhuma conta bloqueada nesta sessão." /> : null}
        {state.blocked.map((b) => (
          <Card key={b}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ flex: 1, fontWeight: '600' }}>⛔ {b}</Text>
              <Button small variant="light" title="Desbloquear" onPress={() => dispatch({ type: 'UNBLOCK', name: b })} />
            </Row>
          </Card>
        ))}
      </Section>
    </Screen>
  );
}

// Aprovação de cadastros de empresas, prestadores e fornecedores.
export function AdminSignups() {
  const { state, dispatch } = useStore();
  return (
    <Screen>
      <Title sub="Biometria + consulta de CNPJ/MEI antes de liberar">Cadastros</Title>
      {state.signups.map((g) => (
        <Card key={g.id}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ fontWeight: '800', flex: 1 }}>{g.name}</Text>
            <Badge
              label={g.status}
              color={g.status === 'aprovado' ? colors.success : g.status === 'recusado' ? colors.danger : colors.accent}
            />
          </Row>
          <Text style={{ color: colors.muted, marginTop: 2 }}>{g.type}</Text>
          <Text style={{ marginTop: 4 }}>{g.doc}</Text>
          <Row style={{ marginTop: 6 }}>
            <Badge label={g.biometria ? '✔ Biometria ok' : '✖ Sem biometria'} color={g.biometria ? colors.success : colors.danger} />
            <View style={{ marginLeft: 6 }}>
              <Badge label={`Receita: ${g.receita}`} color={g.receita === 'Ativa' ? colors.success : colors.danger} />
            </View>
          </Row>
          {g.status === 'pendente' ? (
            <Row style={{ marginTop: 10 }}>
              <Button small title="Aprovar" onPress={() => dispatch({ type: 'REVIEW_SIGNUP', id: g.id, status: 'aprovado' })} style={{ marginRight: 6 }} />
              <Button small variant="danger" title="Recusar" onPress={() => dispatch({ type: 'REVIEW_SIGNUP', id: g.id, status: 'recusado' })} />
            </Row>
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}
