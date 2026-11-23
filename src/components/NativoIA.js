// Realyz nativo de IA (app e site, pelo servidor):
//  - PlanosIA: plano da empresa/prestador (Grátis, Realyz, Pro), uso do atendente e pedido de plano.
//  - PainelInteligencia: vendas, visitas, atendente, buscas em alta, demanda escondida, preço contra o
//    mercado e horários de pico (o plano decide até onde o painel olha).
//  - ProtecaoAdmin e PedidosPlanoAdmin: fila da Proteção Realyz (golpe e fake news) e pedidos de plano.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Alert } from 'react-native';
import { Text } from '../responsive';
import { useStore } from '../store';
import { api, serverOn } from '../api';
import { colors, brl } from '../theme';
import { Card, Row, Button, Badge, Chip, Stat, BarChart, Empty } from './ui';
import { conectado } from '../serverShop';

const vendeNoServidor = (state) => {
  const roles = (state.user && state.user.roles) || [];
  return conectado(state) && (roles.includes('empresa') || roles.includes('prestador'));
};
const dataBr = (t) => (t ? new Date(t).toLocaleDateString('pt-BR') : '');
const NOME_PLANO = { gratis: 'Grátis', realyz: 'Realyz', pro: 'Pro' };

function Barrinha({ valor, max }) {
  const pct = Math.max(0, Math.min(1, max ? valor / max : 0));
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.border, marginTop: 6, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: 8, backgroundColor: pct > 0.9 ? colors.danger : colors.primary }} />
    </View>
  );
}

// ───────────── Planos ─────────────
export function PlanosIA() {
  const { state } = useStore();
  const on = vendeNoServidor(state);
  const [d, setD] = useState(null);
  const [aberto, setAberto] = useState(false);
  const [anual, setAnual] = useState(false);
  const load = useCallback(() => api('GET', '/planos/meu').then(setD).catch(() => {}), []);
  useEffect(() => {
    if (on) load();
  }, [on]);
  if (!on || !d) return null;
  const a = d.atual;
  const pedir = async (plano) => {
    try {
      const r = await api('POST', '/planos/pedir', { plano, ciclo: anual ? 'anual' : 'mensal' });
      setD(r);
      Alert.alert('Pedido recebido ✅', r.aviso);
    } catch (e) {
      Alert.alert('Não deu certo', e.message);
    }
  };
  const situacao = a.teste
    ? `Teste grátis com tudo do Pro até ${dataBr(a.ate)}`
    : a.status === 'ativo'
    ? `Ativo até ${dataBr(a.ate)}${a.ciclo === 'anual' ? ' (anual)' : ''}`
    : 'Plano Grátis';
  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '800', color: colors.text, fontSize: 16 }}>✨ Seu plano: {a.nome}</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>{situacao}</Text>
        </View>
        <Badge label="Proteção grátis" color={colors.success} />
      </Row>
      <Text style={{ color: colors.text, fontSize: 13, marginTop: 10 }}>
        Atendente de IA: {d.uso.respostas} de {d.uso.limite.toLocaleString('pt-BR')} respostas neste mês
      </Text>
      <Barrinha valor={d.uso.respostas} max={d.uso.limite} />
      {a.pedido ? (
        <Text style={{ color: colors.primary, fontSize: 12.5, marginTop: 8 }}>
          Pedido do plano {NOME_PLANO[a.pedido.plano]} ({a.pedido.ciclo}) aguardando o pagamento abrir.
        </Text>
      ) : null}
      <Button small variant="light" title={aberto ? 'Fechar os planos' : 'Ver os planos'} onPress={() => setAberto(!aberto)} style={{ marginTop: 10, alignSelf: 'flex-start' }} />
      {aberto ? (
        <View style={{ marginTop: 10 }}>
          <Row style={{ marginBottom: 8 }}>
            <Chip label="Mensal" active={!anual} onPress={() => setAnual(false)} />
            <Chip label="Anual (paga 75%)" active={anual} onPress={() => setAnual(true)} />
          </Row>
          {d.planos.map((p) => {
            const atual = p.id === a.id && !a.teste;
            const preco = p.mensal === 0 ? 'R$ 0' : anual ? `${brl(p.anual)} por ano` : `${brl(p.mensal)} por mês`;
            return (
              <View key={p.id} style={{ borderWidth: 1, borderColor: p.id === 'pro' ? colors.accent : colors.border, borderRadius: 14, padding: 12, marginBottom: 8 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={{ fontWeight: '800', color: colors.text, fontSize: 15 }}>{p.nome}</Text>
                  <Text style={{ fontWeight: '800', color: colors.primary }}>{preco}</Text>
                </Row>
                {p.beneficios.map((b) => (
                  <Text key={b} style={{ color: colors.text, fontSize: 12.5, marginTop: 3 }}>✓ {b}</Text>
                ))}
                {p.id !== 'gratis' ? (
                  atual ? (
                    <Badge label="Seu plano" color={colors.success} />
                  ) : (
                    <Button small title={`Quero o ${p.nome}`} onPress={() => pedir(p.id)} style={{ marginTop: 8, alignSelf: 'flex-start' }} />
                  )
                ) : null}
              </View>
            );
          })}
          <Text style={{ color: colors.muted, fontSize: 12 }}>A Proteção Realyz contra golpe e fake news é grátis para todos, em qualquer plano.</Text>
        </View>
      ) : null}
    </Card>
  );
}

// ───────────── Painel de inteligência ─────────────
const HORAS = ['0h', '3h', '6h', '9h', '12h', '15h', '18h', '21h'];
const porFaixa = (h) => HORAS.map((label, i) => ({ label, value: h.slice(i * 3, i * 3 + 3).reduce((s, x) => s + x, 0) }));

export function PainelInteligencia() {
  const { state } = useStore();
  const on = vendeNoServidor(state);
  const [dias, setDias] = useState(null);
  const [p, setP] = useState(null);
  useEffect(() => {
    if (!on) return;
    api('GET', `/inteligencia/painel${dias ? `?dias=${dias}` : ''}`).then(setP).catch(() => {});
  }, [on, dias]);
  if (!on || !p) return null;
  const titulo = (t) => <Text style={{ fontWeight: '700', color: colors.text, marginTop: 14, marginBottom: 4 }}>{t}</Text>;
  const lista = (itens, render) => (itens && itens.length ? itens.map(render) : <Text style={{ color: colors.muted, fontSize: 12.5 }}>Ainda sem dados neste período.</Text>);
  return (
    <Card>
      <Text style={{ fontWeight: '800', color: colors.text, fontSize: 16 }}>📊 Painel de inteligência</Text>
      <Text style={{ color: colors.muted, fontSize: 12 }}>Números de verdade do Realyz. Plano {p.plano.nome}: até {p.diasMax} dias.</Text>
      <Row style={{ marginTop: 8, flexWrap: 'wrap' }}>
        {[7, 30, 90].map((d) => (
          <Chip key={d} label={`${d} dias`} active={p.dias === d} onPress={() => (d <= p.diasMax ? setDias(d) : Alert.alert('Mais tempo no painel', d === 30 ? 'O painel de 30 dias está nos planos Realyz e Pro.' : 'O painel de 90 dias está no plano Pro.'))} />
        ))}
      </Row>

      <Row style={{ flexWrap: 'wrap', marginTop: 6 }}>
        {p.vendas ? <Stat label="Pedidos" value={String(p.vendas.pedidos)} /> : null}
        {p.vendas ? <Stat label="Faturamento" value={brl(p.vendas.faturamento)} /> : null}
        {p.vendas ? <Stat label="Ticket médio" value={brl(p.vendas.ticketMedio)} /> : null}
        {p.chamados ? <Stat label="Chamados" value={String(p.chamados.recebidos)} /> : null}
        {p.chamados ? <Stat label="Concluídos" value={String(p.chamados.concluidos)} /> : null}
        <Stat label="Visitas ao perfil" value={String(p.visitas)} />
      </Row>

      {titulo('🤖 Atendente de IA')}
      <Text style={{ color: colors.text, fontSize: 13 }}>
        {p.atendente.conversas} conversas · {p.atendente.emNegociacao} em negociação · {p.atendente.comEquipe} com a equipe
      </Text>

      {p.maisVendidos ? (
        <>
          {titulo('🏆 Mais vendidos')}
          {lista(p.maisVendidos, (x) => (
            <Row key={x.nome} style={{ justifyContent: 'space-between', marginTop: 2 }}>
              <Text numberOfLines={1} style={{ color: colors.text, flex: 1 }}>{x.nome}</Text>
              <Text style={{ color: colors.muted }}>{x.qtd} un · {brl(x.valor)}</Text>
            </Row>
          ))}
        </>
      ) : null}

      {p.buscasEmAlta ? (
        <>
          {titulo('🔎 O que estão buscando no Realyz')}
          {lista(p.buscasEmAlta, (x) => (
            <Row key={x.termo} style={{ justifyContent: 'space-between', marginTop: 2 }}>
              <Text style={{ color: colors.text }}>{x.termo}</Text>
              <Text style={{ color: colors.muted }}>{x.vezes}x</Text>
            </Row>
          ))}
          {titulo('💡 Procuram e não acham (oportunidade)')}
          {lista(p.demandaEscondida, (x) => (
            <Row key={x.termo} style={{ justifyContent: 'space-between', marginTop: 2 }}>
              <Text style={{ color: colors.text }}>{x.termo}</Text>
              <Text style={{ color: colors.success, fontWeight: '700' }}>{x.vezes}x sem resultado</Text>
            </Row>
          ))}
        </>
      ) : null}

      {p.precoMercado ? (
        <>
          {titulo('💲 Seu preço contra o mercado')}
          {lista(p.precoMercado, (x) => (
            <View key={x.nome} style={{ marginTop: 4 }}>
              <Text numberOfLines={1} style={{ color: colors.text, fontWeight: '600' }}>{x.nome}</Text>
              <Text style={{ fontSize: 12.5, color: x.diferencaPct == null ? colors.muted : x.diferencaPct > 15 ? colors.danger : x.diferencaPct < -15 ? colors.primary : colors.success }}>
                {x.diferencaPct == null
                  ? `Seu: ${brl(x.seu)} · poucas lojas para comparar`
                  : `Seu: ${brl(x.seu)} · mercado: ${brl(x.mercado)} (${x.diferencaPct > 0 ? '+' : ''}${x.diferencaPct}%, ${x.lojas} lojas)`}
              </Text>
            </View>
          ))}
        </>
      ) : null}

      {p.pico ? (
        <>
          {titulo('⏰ Horários de pico das buscas')}
          <BarChart data={porFaixa(p.pico.buscas)} height={110} />
          {p.pico.pedidos ? (
            <>
              {titulo('⏰ Horários de pico dos seus pedidos')}
              <BarChart data={porFaixa(p.pico.pedidos)} height={110} />
            </>
          ) : null}
        </>
      ) : null}

      {p.bloqueado.length ? (
        <View style={{ backgroundColor: '#F6EDD6', borderRadius: 12, padding: 10, marginTop: 14 }}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>Libere mais no painel</Text>
          {p.bloqueado.map((b) => (
            <Text key={b.parte} style={{ color: colors.text, fontSize: 12.5, marginTop: 3 }}>🔒 {b.texto} · plano {NOME_PLANO[b.plano]}</Text>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

// ───────────── Administrador: Proteção Realyz ─────────────
const COR_TIPO = { golpe: colors.danger, fake: '#8E44AD', outro: colors.primary };
const NOME_TIPO = { golpe: 'Golpe', fake: 'Fake news', outro: 'Denúncia' };
const NOME_ALVO = { post: 'Publicação', product: 'Produto', user: 'Conta', live: 'Live' };

export function ProtecaoAdmin() {
  const [lista, setLista] = useState(null);
  const [filtro, setFiltro] = useState('abertas');
  const [tipo, setTipo] = useState('');
  const load = useCallback(() => {
    api('GET', `/admin/protecao?status=${filtro}${tipo ? `&tipo=${tipo}` : ''}`).then(setLista).catch(() => setLista(null));
  }, [filtro, tipo]);
  useEffect(() => {
    if (serverOn()) load();
  }, [load]);
  if (!serverOn() || !lista) return null;
  const decidir = (x, decisao) => {
    const go = () => api('POST', `/admin/protecao/${x.id}/${decisao}`).then(load).catch((e) => Alert.alert('Não deu certo', e.message));
    if (decisao === 'bloquear') Alert.alert('Bloquear a conta?', 'O conteúdo sai do ar e a conta de quem publicou é bloqueada.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Bloquear', style: 'destructive', onPress: go }]);
    else go();
  };
  return (
    <Card>
      <Text style={{ fontWeight: '800', color: colors.text, fontSize: 16 }}>🛡️ Proteção Realyz (servidor)</Text>
      <Text style={{ color: colors.muted, fontSize: 12 }}>O robô aponta golpe e fake news; quem decide é você.</Text>
      <Row style={{ marginTop: 8, flexWrap: 'wrap' }}>
        <Chip label="Abertas" active={filtro === 'abertas'} onPress={() => setFiltro('abertas')} />
        <Chip label="Resolvidas" active={filtro === 'resolvidas'} onPress={() => setFiltro('resolvidas')} />
        <Chip label="Tudo" active={!tipo} onPress={() => setTipo('')} />
        <Chip label="Golpe" active={tipo === 'golpe'} onPress={() => setTipo('golpe')} />
        <Chip label="Fake news" active={tipo === 'fake'} onPress={() => setTipo('fake')} />
      </Row>
      {!lista.length ? <Empty text="Nada na fila. 🙌" /> : null}
      {lista.map((x) => (
        <View key={x.id} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 10 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row>
              <Badge label={NOME_TIPO[x.tipo] || 'Denúncia'} color={COR_TIPO[x.tipo] || colors.primary} />
              <Text style={{ color: colors.muted, fontSize: 12, marginLeft: 6 }}>{NOME_ALVO[x.alvoTipo] || x.alvoTipo}</Text>
            </Row>
            {x.pontos ? <Text style={{ color: x.pontos >= 70 ? colors.danger : colors.muted, fontWeight: '700', fontSize: 12 }}>{x.pontos} pts</Text> : null}
          </Row>
          {x.alvo ? <Text numberOfLines={4} style={{ color: colors.text, marginTop: 6 }}>{x.alvo.texto || '(sem texto)'}</Text> : <Text style={{ color: colors.muted, marginTop: 6 }}>(conteúdo já apagado)</Text>}
          {x.alvo && x.alvo.autor ? <Text style={{ color: colors.muted, fontSize: 12 }}>por {x.alvo.autor.name}</Text> : null}
          <Text style={{ color: colors.text, fontSize: 12.5, marginTop: 4 }}>{x.quem}: {x.motivo}</Text>
          {x.parecer ? <Text style={{ color: '#8E44AD', fontSize: 12.5, marginTop: 2 }}>🤖 {x.parecer}</Text> : null}
          {x.denuncias ? <Text style={{ color: colors.muted, fontSize: 12 }}>{x.denuncias} denúncia(s) de pessoas</Text> : null}
          {x.status === 'aberta' ? (
            <Row style={{ marginTop: 8, flexWrap: 'wrap' }}>
              <Button small variant="dark" title={x.alvoTipo === 'post' ? 'Marcar como falso' : 'Tirar do ar'} onPress={() => decidir(x, 'procedente')} style={{ marginRight: 6, marginBottom: 6 }} />
              <Button small variant="danger" title="Bloquear conta" onPress={() => decidir(x, 'bloquear')} style={{ marginRight: 6, marginBottom: 6 }} />
              <Button small variant="outline" title="Está tudo certo" onPress={() => decidir(x, 'improcedente')} style={{ marginBottom: 6 }} />
            </Row>
          ) : (
            <Badge label={x.status === 'procedente' ? 'Confirmado' : 'Arquivado'} color={x.status === 'procedente' ? colors.danger : colors.success} />
          )}
        </View>
      ))}
    </Card>
  );
}

// ───────────── Administrador: pedidos de plano ─────────────
export function PedidosPlanoAdmin() {
  const [lista, setLista] = useState(null);
  const load = useCallback(() => api('GET', '/admin/planos').then(setLista).catch(() => setLista(null)), []);
  useEffect(() => {
    if (serverOn()) load();
  }, []);
  if (!serverOn() || !lista || !lista.length) return null;
  const ativar = (x) =>
    Alert.alert('Ativar o plano?', `Só ative depois de ver o pagamento de ${x.nome} no banco.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Ativar', onPress: () => api('POST', `/admin/planos/${x.userId}`, { plano: x.planoId, ciclo: x.ciclo }).then(load).catch((e) => Alert.alert('Não deu certo', e.message)) },
    ]);
  return (
    <Card>
      <Text style={{ fontWeight: '800', color: colors.text, fontSize: 16 }}>✨ Pedidos de plano</Text>
      {lista.map((x) => (
        <Row key={x.userId} style={{ justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{x.nome}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>Plano {x.plano} · {x.ciclo} · {dataBr(x.em)}</Text>
          </View>
          <Button small title="Ativar" onPress={() => ativar(x)} />
        </Row>
      ))}
    </Card>
  );
}
