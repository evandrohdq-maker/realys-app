// Peças de engajamento entre os lados (dados e regras em src/engage.js).
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { colors, brl, soft } from '../theme';
import { Card, Row, Badge, BarChart } from './ui';
import { suppliers } from '../data';
import {
  installFor, scoreOf, SCORE_TIERS, SCORE_BENEFITS, REVERSE_KINDS, OPEN_REQUESTS, sampleOffers, GROUP_BUYS, groupPrice,
  UNMET_SERVICES, UNMET_PRODUCTS, SUB_PLANS, subPrice, subPlan, LOTUS_NUDGES, ORIGINS, INTEL, INTEL_PLAN,
} from '../engage';

const go = (dispatch, to) => dispatch({ type: 'NAV_REQUEST', go: to });

function Head({ icon, title, sub, color = colors.primary, right }) {
  return (
    <View style={styles.head}>
      <View style={[styles.headIcon, { backgroundColor: color + '1A' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.headTitle}>{title}</Text>
        {sub ? <Text style={styles.headSub}>{sub}</Text> : null}
      </View>
      {right}
    </View>
  );
}

// ───────────── 1. Produto + serviço ─────────────
// names: nomes dos produtos (carrinho, produto aberto). Mostra a instalação certa para cada um.
export function InstallSuggest({ names, onGo, dark }) {
  const { state, dispatch } = useStore();
  const seen = {};
  const list = (names || [])
    .map((n) => ({ name: n, rule: installFor(n) }))
    .filter((x) => x.rule && !seen[x.rule.service] && (seen[x.rule.service] = true));
  if (!list.length) return null;
  return (
    <View style={[styles.install, dark && { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(226,182,73,0.4)' }]}>
      {list.map(({ name, rule }) => {
        const near = (state.providers || []).filter((p) => p.service === rule.service).length;
        return (
          <Row key={rule.service} style={{ alignItems: 'center', marginVertical: 4 }}>
            <Ionicons name="construct" size={18} color={colors.gold} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[styles.installTitle, dark && { color: '#fff' }]}>{rule.label}</Text>
              <Text style={[styles.installSub, dark && { color: 'rgba(255,255,255,0.7)' }]} numberOfLines={2}>
                Para: {name} · {near ? `${near} prestador${near > 1 ? 'es' : ''} verificado${near > 1 ? 's' : ''} perto` : 'prestadores verificados'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.installBtn}
              onPress={() => {
                if (onGo) onGo();
                go(dispatch, { tab: 'servicos', service: rule.service });
              }}
              accessibilityLabel={`${rule.label} para ${name}`}
            >
              <Text style={styles.installBtnText}>Pedir</Text>
            </TouchableOpacity>
          </Row>
        );
      })}
    </View>
  );
}

// ───────────── 8. Selo de origem ─────────────
export function OriginSeal({ productId, storeName }) {
  const o = ORIGINS[productId];
  if (!o) return null;
  const sup = suppliers.find((s) => s.id === o.supplierId);
  const steps = [o.from, sup ? `🚚 ${sup.name}` : null, `🏪 ${storeName || 'Loja Realys'}`, '🙋 Você'].filter(Boolean);
  return (
    <View style={styles.origin}>
      <Row style={{ alignItems: 'center', marginBottom: 6 }}>
        <Ionicons name="git-commit-outline" size={16} color={colors.success} />
        <Text style={styles.originTitle}>Selo de origem Realys</Text>
      </Row>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
        {steps.map((st, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.originStep}>{st}</Text>
            {i < steps.length - 1 ? <Ionicons name="arrow-forward" size={12} color={colors.muted} style={{ marginHorizontal: 3 }} /> : null}
          </View>
        ))}
      </View>
      {o.note ? <Text style={styles.originNote}>{o.note}</Text> : null}
      <Text style={styles.originNote}>Toda a cadeia tem CNPJ ou ID biométrico verificado no Realys.</Text>
    </View>
  );
}

// ───────────── 2. Score Realys ─────────────
const ROLE_SCORE = { cliente: 'usuario', prestador: 'prestador', empresa: 'empresa', fornecedor: 'fornecedor', admin: 'usuario' };
export function ScoreCard({ role }) {
  const { state } = useStore();
  const [open, setOpen] = useState(false);
  const r = ROLE_SCORE[role || state.activeRole] || 'usuario';
  const sc = scoreOf(state, r);
  const pct = Math.min(1, sc.score / 1000);
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={() => setOpen(!open)} style={[styles.card, { borderColor: sc.tier.color + '55' }]} accessibilityLabel={`Score Realys ${sc.score}, nível ${sc.tier.label}`}>
      <Row style={{ alignItems: 'center' }}>
        <View style={[styles.scoreRing, { borderColor: sc.tier.color }]}>
          <Text style={[styles.scoreNum, { color: sc.tier.color }]}>{sc.score}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headTitle}>Score Realys</Text>
          <Row style={{ alignItems: 'center', marginTop: 2 }}>
            <Ionicons name={sc.tier.icon} size={14} color={sc.tier.color} />
            <Text style={{ color: sc.tier.color, fontWeight: '800', marginLeft: 4 }}>{sc.tier.label}</Text>
          </Row>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: sc.tier.color }]} />
          </View>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
      </Row>
      <Text style={styles.scoreBenefit}>✓ {sc.benefit}</Text>
      {sc.next ? <Text style={styles.headSub}>Faltam {sc.next.min - sc.score} pontos para {sc.next.label}: {SCORE_BENEFITS[r][sc.next.key].toLowerCase()}</Text> : null}
      {open ? (
        <View style={{ marginTop: 8 }}>
          <Text style={styles.small}>Uma reputação só, que vale em todo o Realys: como usuário, prestador, empresa e fornecedor.</Text>
          {sc.factors.map((f) => (
            <Row key={f.label} style={{ justifyContent: 'space-between', marginTop: 6 }}>
              <Text style={[styles.small, { flex: 1, color: colors.text }]}>{f.label}</Text>
              <Text style={{ fontWeight: '800', fontSize: 12, color: f.pts >= 0 ? colors.success : colors.danger }}>{f.pts >= 0 ? '+' : ''}{f.pts}</Text>
            </Row>
          ))}
          <Text style={[styles.small, { marginTop: 10, fontWeight: '700', color: colors.text }]}>O que cada nível libera</Text>
          {SCORE_TIERS.slice().reverse().map((t) => (
            <Text key={t.key} style={[styles.small, { marginTop: 3 }, t.key === sc.tier.key && { color: t.color, fontWeight: '800' }]}>
              {t.label} ({t.min}+): {SCORE_BENEFITS[r][t.key]}
            </Text>
          ))}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

// ───────────── 3. Pedido ao contrário ─────────────
// Postar o que precisa e receber propostas. kinds: quais tipos a pessoa pode postar.
export function ReversePost({ kinds = ['servico', 'produto'], title = 'Peça e receba propostas' }) {
  const { state, dispatch } = useStore();
  const [kind, setKind] = useState(kinds[0]);
  const [text, setText] = useState('');
  const [deadline, setDeadline] = useState('');
  const [budget, setBudget] = useState('');
  const mine = state.reverseRequests.filter((r) => kinds.includes(r.kind));
  // Demonstração: as propostas chegam alguns segundos depois de postar.
  useEffect(() => {
    const waiting = mine.filter((r) => r.status === 'aberto' && !r.offers.length);
    if (!waiting.length) return;
    const t = setTimeout(() => waiting.forEach((r) => dispatch({ type: 'REVERSE_OFFERS', id: r.id, offers: sampleOffers(r.kind, r.text) })), 3500);
    return () => clearTimeout(t);
  }, [mine.length, mine.map((r) => r.offers.length).join()]);
  const post = () => {
    if (text.trim().length < 6) return Alert.alert('Conte o que precisa', 'Escreva em uma frase o que você precisa.');
    dispatch({ type: 'REVERSE_POST', kind, text: text.trim(), deadline: deadline.trim() || 'Sem pressa', budget: Number(budget.replace(',', '.')) || null });
    setText('');
    setDeadline('');
    setBudget('');
    Alert.alert('Pedido publicado', `Os ${REVERSE_KINDS[kind].who} verificados perto de você já podem mandar propostas. Você escolhe a melhor.`);
  };
  return (
    <View style={styles.card}>
      <Head icon="megaphone-outline" title={title} sub={`Diga o que precisa e os ${REVERSE_KINDS[kind].who} disputam com propostas`} />
      {kinds.length > 1 ? (
        <Row style={{ marginTop: 8 }}>
          {kinds.map((k) => (
            <TouchableOpacity key={k} style={[styles.pill, kind === k && styles.pillOn]} onPress={() => setKind(k)}>
              <Ionicons name={REVERSE_KINDS[k].icon} size={13} color={kind === k ? '#fff' : colors.primary} />
              <Text style={[styles.pillText, kind === k && { color: '#fff' }]}>{REVERSE_KINDS[k].label}</Text>
            </TouchableOpacity>
          ))}
        </Row>
      ) : null}
      <TextInput style={styles.input} placeholder={REVERSE_KINDS[kind].ask} placeholderTextColor={colors.muted} value={text} onChangeText={setText} multiline />
      <Row>
        <TextInput style={[styles.input, { flex: 1, marginRight: 6 }]} placeholder="Prazo (ex.: amanhã)" placeholderTextColor={colors.muted} value={deadline} onChangeText={setDeadline} />
        <TextInput style={[styles.input, { flex: 1 }]} placeholder="Orçamento (opcional)" placeholderTextColor={colors.muted} value={budget} onChangeText={setBudget} keyboardType="numeric" />
      </Row>
      <TouchableOpacity style={styles.mainBtn} onPress={post}>
        <Text style={styles.mainBtnText}>Publicar pedido</Text>
      </TouchableOpacity>

      {mine.map((r) => (
        <View key={r.id} style={styles.req}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[styles.installTitle, { flex: 1 }]} numberOfLines={2}>{r.text}</Text>
            <Badge label={r.status === 'fechado' ? 'Fechado' : r.offers.length ? `${r.offers.length} propostas` : 'Aguardando'} color={r.status === 'fechado' ? colors.success : colors.accent} />
          </Row>
          <Text style={styles.small}>{REVERSE_KINDS[r.kind].label} · {r.deadline}{r.budget ? ` · até ${brl(r.budget)}` : ''}</Text>
          {r.offers.map((o, i) => {
            const won = r.status === 'fechado' && r.accepted === i;
            if (r.status === 'fechado' && !won) return null;
            return (
              <View key={i} style={[styles.offer, won && { borderColor: colors.success }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.installTitle}>{o.from}</Text>
                  <Text style={styles.small}>{o.note} · {o.eta}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.price}>{brl(o.price)}</Text>
                  {r.status === 'aberto' ? (
                    <TouchableOpacity
                      style={styles.smallBtn}
                      onPress={() =>
                        Alert.alert('Aceitar proposta', `${o.from} por ${brl(o.price)}?`, [
                          { text: 'Cancelar', style: 'cancel' },
                          { text: 'Aceitar', onPress: () => dispatch({ type: 'REVERSE_ACCEPT', id: r.id, index: i }) },
                        ])
                      }
                    >
                      <Text style={styles.smallBtnText}>Aceitar</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={{ color: colors.success, fontWeight: '800', fontSize: 11 }}>Combine no chat</Text>
                  )}
                </View>
              </View>
            );
          })}
          {r.status === 'aberto' ? (
            <TouchableOpacity onPress={() => dispatch({ type: 'REVERSE_CANCEL', id: r.id })}>
              <Text style={[styles.small, { color: colors.danger, marginTop: 6 }]}>Cancelar pedido</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ))}
    </View>
  );
}

// Pedidos abertos de outras pessoas, para prestador ou fornecedor mandar proposta.
export function OpenRequests({ kind, service }) {
  const { state, dispatch } = useStore();
  const [draft, setDraft] = useState({});
  const all = OPEN_REQUESTS.filter((r) => r.kind === kind);
  // Os da profissão do prestador vêm primeiro; se não houver nenhum, mostra todos.
  const list = service ? all.slice().sort((a, b) => (b.service === service) - (a.service === service)) : all;
  if (!list.length) return null;
  return (
    <View style={styles.card}>
      <Head icon="flash-outline" title={kind === 'b2b' ? 'Empresas pedindo propostas' : 'Pedidos abertos perto de você'} sub="Mande sua proposta: quem responde rápido fecha mais" color={colors.accent} />
      {list.map((r) => {
        const sent = state.reverseSent[r.id];
        const d = draft[r.id] || '';
        return (
          <View key={r.id} style={styles.req}>
            <Text style={styles.installTitle}>{r.text}</Text>
            <Text style={styles.small}>{r.who} · {r.area} · {r.deadline}{r.budget ? ` · até ${brl(r.budget)}` : ''} · {r.offers + (sent ? 1 : 0)} propostas</Text>
            {sent ? (
              <Text style={{ color: colors.success, fontWeight: '800', fontSize: 12, marginTop: 6 }}>✓ Proposta enviada: {brl(sent.price)}</Text>
            ) : (
              <Row style={{ alignItems: 'center', marginTop: 6 }}>
                <TextInput style={[styles.input, { flex: 1, marginTop: 0, marginRight: 6 }]} placeholder="Seu preço (R$)" placeholderTextColor={colors.muted} keyboardType="numeric" value={d} onChangeText={(t) => setDraft({ ...draft, [r.id]: t })} />
                <TouchableOpacity
                  style={styles.smallBtn}
                  onPress={() => {
                    const v = Number(String(d).replace(',', '.'));
                    if (!(v > 0)) return Alert.alert('Coloque o preço', 'Digite o valor da sua proposta.');
                    dispatch({ type: 'REVERSE_SEND', id: r.id, price: v });
                  }}
                >
                  <Text style={styles.smallBtnText}>Enviar</Text>
                </TouchableOpacity>
              </Row>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ───────────── 4. Compra coletiva ─────────────
export function GroupBuys() {
  const { state, dispatch } = useStore();
  return (
    <View style={styles.card}>
      <Head icon="people-circle-outline" title="Compra coletiva" sub="Junte seu pedido com outros comerciantes e pague preço de atacado. Só cobra quando o grupo fecha." color={colors.success} />
      {GROUP_BUYS.map((g) => {
        const mineQty = state.groupJoins[g.id] || 0;
        const total = g.total + mineQty;
        const price = groupPrice(g, total);
        const next = g.tiers.find((t) => total < t.qty);
        const top = g.tiers[g.tiers.length - 1].qty;
        const join = (qty) => dispatch({ type: 'GROUP_JOIN', id: g.id, qty });
        return (
          <View key={g.id} style={styles.req}>
            <Row style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 24, marginRight: 8 }}>{g.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.installTitle}>{g.item}</Text>
                <Text style={styles.small}>{g.supplier} · {g.area} · fecha {g.closes}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.price}>{brl(price)}</Text>
                <Text style={[styles.small, { textDecorationLine: 'line-through' }]}>{brl(g.price)}</Text>
              </View>
            </Row>
            <View style={styles.bar}>
              <View style={[styles.barFill, { width: `${Math.min(100, (total / top) * 100)}%`, backgroundColor: colors.success }]} />
            </View>
            <Text style={styles.small}>
              {total} {g.unit}s · {g.members + (mineQty ? 1 : 0)} comerciantes
              {next ? ` · faltam ${next.qty - total} para ${brl(next.price)}` : ' · menor preço atingido!'}
            </Text>
            {mineQty ? (
              <Row style={{ alignItems: 'center', marginTop: 8 }}>
                <Text style={{ color: colors.success, fontWeight: '800', flex: 1 }}>Você está com {mineQty} {g.unit}s · {brl(mineQty * price)}</Text>
                <TouchableOpacity style={styles.qBtn} onPress={() => join(Math.max(0, mineQty - g.minEach))}>
                  <Ionicons name="remove" size={16} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.qBtn} onPress={() => join(mineQty + g.minEach)}>
                  <Ionicons name="add" size={16} color={colors.text} />
                </TouchableOpacity>
              </Row>
            ) : (
              <TouchableOpacity style={[styles.mainBtn, { backgroundColor: colors.success }]} onPress={() => join(g.minEach)}>
                <Text style={styles.mainBtnText}>Entrar no grupo ({g.minEach} {g.unit}s)</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ───────────── 5. Demanda escondida ─────────────
export function UnmetServices() {
  const { state, dispatch } = useStore();
  const mine = state.myProvider && state.myProvider.service;
  const list = UNMET_SERVICES.slice().sort((a, b) => (b.service === mine) - (a.service === mine)).slice(0, 3);
  return (
    <View style={[styles.card, { borderColor: 'rgba(229,72,77,0.35)' }]}>
      <Head icon="eye-outline" title="Demanda escondida" sub="Procuraram perto de você nas últimas 24 h e não acharam" color="#E5484D" />
      {list.map((u) => (
        <Row key={u.service} style={{ alignItems: 'center', marginTop: 8 }}>
          <Text style={styles.bigNum}>{u.count}</Text>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.installTitle}>{u.label}{u.service === mine ? ' · sua profissão' : ''}</Text>
            <Text style={styles.small}>{u.area} · mais procurado {u.peak}</Text>
          </View>
        </Row>
      ))}
      {!state.available ? (
        <TouchableOpacity style={styles.mainBtn} onPress={() => dispatch({ type: 'TOGGLE_AVAILABLE' })}>
          <Text style={styles.mainBtnText}>Ligar o GPS e aparecer agora</Text>
        </TouchableOpacity>
      ) : (
        <Text style={[styles.small, { marginTop: 8, color: colors.success, fontWeight: '700' }]}>Você está disponível. Um boost coloca você no topo dessas buscas.</Text>
      )}
    </View>
  );
}
export function UnmetProducts({ onAdd }) {
  return (
    <View style={[styles.card, { borderColor: 'rgba(229,72,77,0.35)' }]}>
      <Head icon="eye-outline" title="Procuraram e não acharam" sub="Buscas sem resultado perto da sua loja nas últimas 24 h" color="#E5484D" />
      {UNMET_PRODUCTS.map((u) => (
        <Row key={u.term} style={{ alignItems: 'center', marginTop: 8 }}>
          <Text style={styles.bigNum}>{u.count}</Text>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.installTitle}>{u.term}</Text>
            <Text style={styles.small}>{u.trend}</Text>
          </View>
        </Row>
      ))}
      {onAdd ? (
        <TouchableOpacity style={styles.mainBtn} onPress={onAdd}>
          <Text style={styles.mainBtnText}>Cadastrar esses produtos</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ───────────── 6. Assinaturas ─────────────
export function Subscriptions() {
  const { state, dispatch } = useStore();
  const subs = state.subscriptions;
  const has = (id) => subs.some((x) => x.planId === id);
  const nextText = (ts) => {
    const d = new Date(ts);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  return (
    <View>
      {subs.length ? (
        <View style={styles.card}>
          <Head icon="repeat" title="Suas assinaturas" sub="Cobra sozinho no saldo (ou Pix) a cada entrega. Pause ou cancele quando quiser." />
          {subs.map((x) => {
            const p = subPlan(x.planId);
            if (!p) return null;
            return (
              <View key={x.id} style={styles.req}>
                <Row style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 22, marginRight: 8 }}>{p.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.installTitle}>{p.title}</Text>
                    <Text style={styles.small}>{p.who} · {brl(subPrice(p))} {x.status === 'ativa' ? `· próxima ${nextText(x.next)}` : '· pausada'}</Text>
                  </View>
                </Row>
                <Row style={{ marginTop: 6 }}>
                  <TouchableOpacity onPress={() => dispatch({ type: 'SUB_TOGGLE', id: x.id })}>
                    <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 12, marginRight: 16 }}>{x.status === 'ativa' ? 'Pausar' : 'Retomar'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      Alert.alert('Cancelar assinatura', p.title, [
                        { text: 'Manter', style: 'cancel' },
                        { text: 'Cancelar', style: 'destructive', onPress: () => dispatch({ type: 'SUB_CANCEL', id: x.id }) },
                      ])
                    }
                  >
                    <Text style={{ color: colors.danger, fontWeight: '800', fontSize: 12 }}>Cancelar</Text>
                  </TouchableOpacity>
                </Row>
              </View>
            );
          })}
        </View>
      ) : null}
      <View style={styles.card}>
        <Head icon="repeat" title="Assine e esqueça" sub="O que você pede sempre, chegando sozinho e mais barato" />
        {SUB_PLANS.map((p) => (
          <Row key={p.id} style={[styles.req, { alignItems: 'center' }]}>
            <Text style={{ fontSize: 22, marginRight: 8 }}>{p.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.installTitle}>{p.title}</Text>
              <Text style={styles.small}>{p.who}</Text>
              <Text style={styles.small}>
                <Text style={{ textDecorationLine: 'line-through' }}>{brl(p.price)}</Text> <Text style={{ color: colors.success, fontWeight: '800' }}>{brl(subPrice(p))} (-{p.off}%)</Text>
              </Text>
            </View>
            {has(p.id) ? (
              <Badge label="Assinado" color={colors.success} />
            ) : (
              <TouchableOpacity
                style={styles.smallBtn}
                onPress={() =>
                  Alert.alert('Assinar', `${p.title} por ${brl(subPrice(p))} a cada ${p.every} dias. A primeira chega amanhã.`, [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Assinar', onPress: () => dispatch({ type: 'SUB_START', planId: p.id }) },
                  ])
                }
              >
                <Text style={styles.smallBtnText}>Assinar</Text>
              </TouchableOpacity>
            )}
          </Row>
        ))}
      </View>
    </View>
  );
}

// ───────────── 7. Lotus avisa antes ─────────────
export function LotusNudges() {
  const { state, dispatch } = useStore();
  const subbed = (id) => state.subscriptions.some((x) => x.planId === id);
  const list = LOTUS_NUDGES.filter((n) => !state.nudgesDismissed[n.id] && !(n.plan && subbed(n.plan)));
  if (!list.length) return null;
  return (
    <View style={{ marginBottom: 12 }}>
      <Row style={{ alignItems: 'center', marginBottom: 6 }}>
        <Text style={{ fontSize: 14 }}>🪷</Text>
        <Text style={[styles.headTitle, { marginLeft: 6, fontSize: 14 }]}>A Lotus lembrou</Text>
      </Row>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {list.map((n) => (
          <View key={n.id} style={styles.nudge}>
            <Row style={{ alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 22 }}>{n.icon}</Text>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.installTitle} numberOfLines={2}>{n.title}</Text>
                <Text style={styles.small} numberOfLines={2}>{n.text}</Text>
              </View>
              <TouchableOpacity onPress={() => dispatch({ type: 'NUDGE_DISMISS', id: n.id })} accessibilityLabel="Dispensar lembrete" style={{ padding: 2 }}>
                <Ionicons name="close" size={16} color={colors.muted} />
              </TouchableOpacity>
            </Row>
            <TouchableOpacity style={[styles.smallBtn, { alignSelf: 'flex-start', marginTop: 8 }]} onPress={() => go(dispatch, n.go)}>
              <Text style={styles.smallBtnText}>{n.cta}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ───────────── 9. Painel de inteligência ─────────────
export function IntelPanel() {
  const { state, dispatch } = useStore();
  const on = state.intelPlan;
  const subscribe = () => {
    if (state.wallet < INTEL_PLAN.price) return Alert.alert('Saldo insuficiente', `O plano custa ${brl(INTEL_PLAN.price)} por mês. Adicione saldo no Caixa.`);
    Alert.alert(INTEL_PLAN.name, `${brl(INTEL_PLAN.price)} por mês, descontado do saldo. Cancele quando quiser.`, [
      { text: 'Agora não', style: 'cancel' },
      { text: 'Assinar', onPress: () => dispatch({ type: 'INTEL_PLAN', on: true }) },
    ]);
  };
  return (
    <View style={[styles.card, { borderColor: colors.accent + '55' }]}>
      <Head icon="analytics-outline" title="Inteligência do bairro" sub={`${INTEL.area} · dados juntos e anônimos`} color={colors.accent} right={on ? <Badge label="Ativo" color={colors.success} /> : null} />
      <Text style={[styles.small, { marginTop: 8, fontWeight: '700', color: colors.text }]}>O que o bairro mais procura</Text>
      {INTEL.topSearches.slice(0, on ? 6 : 2).map((t, i) => (
        <Row key={t.term} style={{ justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={[styles.small, { color: colors.text, flex: 1 }]}>{i + 1}. {t.term}</Text>
          <Text style={styles.small}>{t.count.toLocaleString('pt-BR')} · <Text style={{ color: colors.success, fontWeight: '800' }}>{t.trend}</Text></Text>
        </Row>
      ))}
      {on ? (
        <>
          <Text style={[styles.small, { marginTop: 12, marginBottom: 6, fontWeight: '700', color: colors.text }]}>Horários com mais gente comprando</Text>
          <BarChart data={INTEL.hours} height={110} />
          <Row style={{ marginTop: 10 }}>
            <View style={styles.kpi}>
              <Text style={styles.small}>Ticket médio da região</Text>
              <Text style={styles.price}>{brl(INTEL.ticket.area)}</Text>
            </View>
            <View style={styles.kpi}>
              <Text style={styles.small}>Seu ticket médio</Text>
              <Text style={[styles.price, { color: colors.danger }]}>{brl(INTEL.ticket.mine)}</Text>
            </View>
          </Row>
          <Text style={[styles.small, { marginTop: 10, fontWeight: '700', color: colors.text }]}>Quem compra no bairro</Text>
          {INTEL.audience.map((x) => (
            <Row key={x.label} style={{ alignItems: 'center', marginTop: 4 }}>
              <Text style={[styles.small, { width: 92 }]}>{x.label}</Text>
              <View style={[styles.bar, { flex: 1, marginTop: 0 }]}>
                <View style={[styles.barFill, { width: `${x.pct}%`, backgroundColor: colors.accent }]} />
              </View>
              <Text style={[styles.small, { width: 34, textAlign: 'right' }]}>{x.pct}%</Text>
            </Row>
          ))}
          <Text style={[styles.small, { marginTop: 10, fontWeight: '700', color: colors.text }]}>Dicas da Lotus</Text>
          {INTEL.tips.map((t) => (
            <Text key={t} style={[styles.small, { marginTop: 4 }]}>💡 {t}</Text>
          ))}
          <TouchableOpacity onPress={() => dispatch({ type: 'INTEL_PLAN', on: false })}>
            <Text style={[styles.small, { color: colors.danger, marginTop: 10 }]}>Cancelar plano</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={[styles.small, { marginTop: 8 }]}>🔒 Ranking completo, horários de pico do bairro, ticket médio da região, público e dicas da Lotus.</Text>
          <TouchableOpacity style={[styles.mainBtn, { backgroundColor: colors.accent }]} onPress={subscribe}>
            <Text style={styles.mainBtnText}>Liberar tudo · {brl(INTEL_PLAN.price)}/mês</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: colors.border, ...soft },
  head: { flexDirection: 'row', alignItems: 'center' },
  headIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headTitle: { color: colors.text, fontWeight: '800', fontSize: 15 },
  headSub: { color: colors.muted, fontSize: 12, marginTop: 1 },
  small: { color: colors.muted, fontSize: 12 },
  install: { backgroundColor: colors.primaryLight, borderRadius: 14, borderWidth: 1, borderColor: colors.gold + '66', padding: 10, marginVertical: 8 },
  installTitle: { color: colors.text, fontWeight: '700', fontSize: 13 },
  installSub: { color: colors.muted, fontSize: 11, marginTop: 1 },
  installBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, marginLeft: 8 },
  installBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  origin: { backgroundColor: '#EEF7F1', borderRadius: 14, borderWidth: 1, borderColor: '#BFE3CC', padding: 10, marginVertical: 8 },
  originTitle: { color: colors.success, fontWeight: '800', fontSize: 12, marginLeft: 6 },
  originStep: { color: colors.text, fontSize: 12, fontWeight: '600' },
  originNote: { color: colors.muted, fontSize: 11, marginTop: 4 },
  scoreRing: { width: 64, height: 64, borderRadius: 32, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  scoreNum: { fontSize: 20, fontWeight: '900' },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.cardAlt, marginTop: 6, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  scoreBenefit: { color: colors.text, fontWeight: '700', fontSize: 12, marginTop: 10 },
  pill: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: colors.primary, paddingHorizontal: 10, paddingVertical: 5, marginRight: 6 },
  pillOn: { backgroundColor: colors.primary },
  pillText: { color: colors.primary, fontWeight: '700', fontSize: 12, marginLeft: 4 },
  input: { backgroundColor: colors.bg, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 9, color: colors.text, marginTop: 8, fontSize: 14 },
  mainBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 11, alignItems: 'center', marginTop: 10 },
  mainBtnText: { color: '#fff', fontWeight: '800' },
  req: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 10 },
  offer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 9, marginTop: 6 },
  price: { color: colors.primaryDark, fontWeight: '900', fontSize: 15 },
  smallBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, marginTop: 4 },
  smallBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  qBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  bigNum: { color: '#E5484D', fontWeight: '900', fontSize: 20, width: 40, textAlign: 'center' },
  nudge: { width: 250, backgroundColor: colors.card, borderRadius: 16, padding: 12, marginRight: 10, borderWidth: 1, borderColor: colors.gold + '55', ...soft },
  kpi: { flex: 1, backgroundColor: colors.bg, borderRadius: 12, padding: 10, marginRight: 6 },
});
