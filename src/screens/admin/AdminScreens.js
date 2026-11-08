import React, { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { serverOn } from '../../api';
import { videoStatus } from '../../video';

// Avisos de contratação: o que ainda precisa ser contratado para o Realys funcionar de verdade.
function HireNotices() {
  const [video, setVideo] = useState(null);
  useEffect(() => {
    videoStatus(true).then(setVideo).catch(() => setVideo({ on: false }));
  }, []);
  const app = serverOn();
  const items = [
    {
      done: app,
      title: 'Servidor do app (contas, carteira, pedidos)',
      text: 'VPS Ubuntu (ex.: Hetzner CX22 na Europa, ~€ 4 a 6/mês). Instalação: server/deploy/setup-ubuntu.sh. Depois, colocar o endereço em app.json → extra.apiUrl.',
    },
    {
      done: !!(video && video.on),
      title: 'Servidor de vídeo (lives e chamadas)',
      text: 'Hetzner CX22 ou CAX11 na Alemanha/Finlândia: ~€ 4 a 10/mês com 20 TB de tráfego incluídos (~44 mil horas de live assistidas). Pode ser a mesma VPS do app na fase de testes. Passo a passo: server/deploy/video/LEIA-ME.md.',
    },
    { done: app, title: 'Domínio', text: 'Ex.: api.seudominio.com.br e video.seudominio.com.br apontando para as VPS (registro A).' },
  ];
  if (items.every((i) => i.done)) return null;
  return (
    <Section title="⚠️ Avisos: contratação">
      {items.map((i) => (
        <Card key={i.title} style={{ borderColor: i.done ? '#1E9E63' : '#C77D12', borderWidth: 1 }}>
          <Row>
            <Ionicons name={i.done ? 'checkmark-circle' : 'alert-circle'} size={20} color={i.done ? '#1E9E63' : '#C77D12'} />
            <Text style={{ color: colors.text, fontWeight: '800', marginLeft: 8, flex: 1 }}>{i.title}</Text>
            <Badge label={i.done ? 'Contratado' : 'Contratar'} color={i.done ? '#1E9E63' : '#C77D12'} />
          </Row>
          {!i.done ? <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6, lineHeight: 17 }}>{i.text}</Text> : null}
        </Card>
      ))}
      <Text style={{ color: colors.muted, fontSize: 11, marginBottom: 8 }}>Até contratar, lives e chamadas seguem no modo demonstração.</Text>
    </Section>
  );
}
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useStore } from '../../store';
import { platformStats } from '../../data';
import { ORDER_FEE_PCT, SERVICE_FEE_PCT, GIFT_FEE_PCT, GIFT_FUND_SPLIT, orderFee, splitGiftFees } from '../../fees';
import { colors, brl } from '../../theme';
import { Screen, Title, Card, Row, Stat, Button, Badge, Section, Chip, Empty, BarChart } from '../../components/ui';

const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// Visão geral de toda a plataforma.
export function AdminOverview() {
  const { state, dispatch } = useStore();
  const openReports = state.reports.filter((r) => r.status === 'aberta').length;
  const pending = state.signups.filter((s) => s.status === 'pendente').length;
  const s = platformStats;
  // Caixa do mês: valores de demonstração + o que aconteceu nesta sessão do app.
  const orderFeesMonth = 6120 + (state.orders || []).reduce((n, o) => n + orderFee(o.total), 0);
  const serviceFeesMonth = 2340 + (state.visits || []).reduce((n, v) => n + (v.split ? v.split.realys : 0), 0);
  const giftFeesMonth = 1180 + state.giftFees;
  const giftSplit = splitGiftFees(giftFeesMonth);
  return (
    <Screen>
      <Title sub="Controle geral da plataforma Realys">Administração</Title>
      <HireNotices />

      {/* Chave de segurança dos motoristas: alerta silencioso com GPS e dados da corrida. */}
      {(state.panicAlerts || []).length ? (
        <Section title="🚨 Alertas de segurança">
          {state.panicAlerts.map((x) => (
            <Card key={x.id} style={{ borderColor: '#C0392B', borderWidth: 1.5 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={{ color: '#C0392B', fontWeight: '800', flex: 1 }}>{x.kind === 'coacao' ? '⚠️ Coação · ' : ''}{x.who}{x.plate ? ` · placa ${x.plate}` : ''}</Text>
                <Badge label={new Date(x.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} color="#C0392B" />
              </Row>
              {x.vehicle ? <Text style={{ color: colors.text, fontSize: 13, marginTop: 2 }}>{x.vehicle}</Text> : null}
              {x.ride ? (
                <Text style={{ color: colors.text, fontSize: 13, marginTop: 4 }}>
                  Corrida{x.ride.client ? ` com ${x.ride.client}` : ''}{x.ride.from ? ` · embarque em ${x.ride.from}` : ''}{x.ride.to ? ` → ${x.ride.to}` : ''}
                </Text>
              ) : null}
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                {x.point ? `📍 ${x.point.lat.toFixed(5)}, ${x.point.lon.toFixed(5)}` : '📍 buscando localização…'}
                {x.called190 ? ' · ligação para o 190 feita do celular dele' : ''}
              </Text>
              {x.what ? <Text style={{ color: colors.text, fontSize: 13, marginTop: 4 }}>{x.what}</Text> : null}
              {x.address ? <Text style={{ color: colors.text, fontSize: 13, marginTop: 2 }}>🏠 {x.address}</Text> : null}
              {x.status === 'aberto' ? (
                <Row style={{ marginTop: 10 }}>
                  <TouchableOpacity onPress={() => dispatch({ type: 'PANIC_REAL', id: x.id })} style={{ marginRight: 18 }}>
                    <Text style={{ color: colors.primary, fontWeight: '700' }}>Atendido (era real)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      Alert.alert('Chamada falsa?', 'Use só quando a polícia ou a segurança confirmar que foi brincadeira ou teste. A conta é bloqueada e o saldo fica retido.', [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Confirmar chamada falsa', style: 'destructive', onPress: () => dispatch({ type: 'PANIC_FALSE', id: x.id }) },
                      ])
                    }
                  >
                    <Text style={{ color: colors.danger, fontWeight: '700' }}>Chamada falsa</Text>
                  </TouchableOpacity>
                </Row>
              ) : (
                <Text style={{ color: x.status === 'falso' ? colors.danger : colors.success, fontWeight: '700', marginTop: 8 }}>
                  {x.status === 'falso' ? 'Chamada falsa · conta bloqueada e saldo retido' : 'Atendido'}
                </Text>
              )}
            </Card>
          ))}
        </Section>
      ) : null}

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
        <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 10 }}>Novos cadastros por dia</Text>
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

      <Card style={{ backgroundColor: '#FFF4DC', borderColor: '#E9CF95' }}>
        <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 4 }}>⚠️ Precisa da sua atenção</Text>
        <Text style={{ color: colors.text }}>• {openReports} denúncias abertas (aba Moderação)</Text>
        <Text style={{ color: colors.text }}>• {pending} cadastros aguardando aprovação (aba Cadastros)</Text>
        <Text style={{ color: colors.text }}>• {(state.disputes || []).filter((d) => d.status === 'em análise').length + 3} casos da Garantia Realys em análise (prazo de 48 h)</Text>
        <Text style={{ color: colors.text }}>• {(state.newsReports || []).length + 4} relatos de moradores esperando moderação (Notícias e Alertas)</Text>
      </Card>

      <Section title="Receita por fonte (mês)">
        {[
          [`Taxas sobre pedidos (${ORDER_FEE_PCT}%)`, orderFeesMonth],
          [`Taxas de contratação de serviços (${SERVICE_FEE_PCT}% da visita)`, serviceFeesMonth],
          ['Taxa de proteção Realys (R$ 0,99 por pedido)', 4210 + (state.protectionFees || 0)],
          [`Presentes: parte do Realys (${GIFT_FUND_SPLIT.realys}% da taxa)`, giftSplit.realys],
          ['Planos mensais de empresas', 21840],
          ['Vídeos avulsos e vídeos longos', 7310],
          ['Patrocínio na busca', 8420],
          ['Taxas de negócios B2B', 3710],
        ].map(([label, v]) => (
          <Card key={label}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, flex: 1 }}>{label}</Text>
              <Text style={{ fontWeight: '700', color: colors.success }}>{brl(v)}</Text>
            </Row>
          </Card>
        ))}
      </Section>

      {/* Taxa dos presentes (10%) dividida: parte para o fundo de doações, parte para os projetos e o lucro do Realys. */}
      <Section title="Taxa de presentes: divisão">
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text, flex: 1, fontWeight: '700' }}>Total das taxas de presentes ({GIFT_FEE_PCT}%)</Text>
            <Text style={{ fontWeight: '800', color: colors.text }}>{brl(giftFeesMonth)}</Text>
          </Row>
        </Card>
        <Card style={{ backgroundColor: '#EEF7F1', borderColor: '#BFE3CC' }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text, flex: 1, fontWeight: '700' }}>Fundo de doações ({GIFT_FUND_SPLIT.doacoes}%)</Text>
            <Text style={{ fontWeight: '800', color: colors.success }}>{brl(giftSplit.doacoes)}</Text>
          </Row>
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6, lineHeight: 17 }}>
            Fica separado no caixa, reservado para projetos sociais de parceiros e do próprio Realys.
          </Text>
        </Card>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text, flex: 1, fontWeight: '700' }}>Projetos e lucro do Realys ({GIFT_FUND_SPLIT.realys}%)</Text>
            <Text style={{ fontWeight: '800', color: colors.primary }}>{brl(giftSplit.realys)}</Text>
          </Row>
        </Card>
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
          <Text style={{ color: colors.text, fontWeight: '700' }}>{r.target}</Text>
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
              <Text style={{ color: colors.text, flex: 1, fontWeight: '600' }}>⛔ {b}</Text>
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
            <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>{g.name}</Text>
            <Badge
              label={g.status}
              color={g.status === 'aprovado' ? colors.success : g.status === 'recusado' ? colors.danger : colors.accent}
            />
          </Row>
          <Text style={{ color: colors.muted, marginTop: 2 }}>{g.type}</Text>
          <Text style={{ color: colors.text, marginTop: 4 }}>{g.doc}</Text>
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
