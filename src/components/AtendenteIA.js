// Painel do Atendente IA (empresa ou prestador com a conta ligada ao servidor).
// 1. Ficha: o que a IA sabe (horário, entrega, pagamento, trocas, sobre, jeito de falar, perguntas frequentes).
// 2. Ligar/desligar e testar uma pergunta.
// 3. Conversas: as que a IA está atendendo e as que passou para a equipe (assumir, devolver, abrir).
// 4. Copiloto: sugere a próxima mensagem para quem fecha a venda; a pessoa revisa e envia.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Alert, TouchableOpacity, Switch } from 'react-native';
import { Text } from '../responsive';
import { useStore } from '../store';
import { api } from '../api';
import { colors } from '../theme';
import { Card, Row, Button, Badge, Input } from './ui';
import { conectado } from '../serverShop';
import { aCada } from '../ritmo';

const ETAPA = { novo: 'Novo contato', conversa: 'Em conversa', proposta: 'Proposta', negociacao: 'Negociação', fechado: 'Venda fechada' };
const CAMPOS = [
  ['horario', 'Horário (ex.: todos os dias, das 18h às 23h)'],
  ['entrega', 'Entrega e região (ex.: entregamos no Centro, até 5 km)'],
  ['pagamento', 'Pagamento (ex.: Pix e cartão pelo app)'],
  ['politicas', 'Trocas e garantia'],
  ['sobre', 'Sobre a empresa (o que vocês fazem de especial)'],
  ['tom', 'Jeito de falar (ex.: animado, formal, com emojis)'],
];

export default function AtendenteIA() {
  const { state, dispatch } = useStore();
  const roles = (state.user && state.user.roles) || [];
  const on = conectado(state) && (roles.includes('empresa') || roles.includes('prestador'));
  const [f, setF] = useState(null);
  const [aberto, setAberto] = useState(false);
  const [conv, setConv] = useState([]);
  const [teste, setTeste] = useState('');
  const [resp, setResp] = useState(null);
  const [sug, setSug] = useState(null); // { clientId, nome, texto }
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api('GET', '/ia/ficha').then(setF).catch(() => {});
    api('GET', '/ia/conversas').then(setConv).catch(() => {});
  }, []);
  useEffect(() => {
    if (!on) return;
    load();
    const t = aCada(() => api('GET', '/ia/conversas').then(setConv).catch(() => {}), 20000);
    return () => t.parar();
  }, [on]);
  if (!on || !f) return null;

  const salvar = async (patch = {}) => {
    setBusy(true);
    try {
      setF(await api('PUT', '/ia/ficha', { ...f, ...patch }));
    } catch (e) {
      Alert.alert('Ficha não salva', e.message);
    } finally {
      setBusy(false);
    }
  };
  const testar = async () => {
    if (!teste.trim()) return;
    try {
      setResp(await api('POST', '/ia/testar', { texto: teste.trim() }));
    } catch (e) {
      Alert.alert('Teste não feito', e.message);
    }
  };
  const acao = (c, qual) => api('POST', `/ia/conversas/${c.cliente.id}/${qual}`).then(load).catch((e) => Alert.alert('Não deu certo', e.message));
  const sugerir = async (c) => {
    try {
      const r = await api('POST', '/ia/sugestao', { clientId: c.cliente.id });
      setSug({ clientId: c.cliente.id, nome: c.cliente.name, texto: r.sugestao });
    } catch (e) {
      Alert.alert('Sem sugestão', e.message);
    }
  };
  const enviarSug = async () => {
    try {
      await api('POST', '/messages', { toId: sug.clientId, text: sug.texto });
      setSug(null);
      Alert.alert('Enviada ✅', 'A mensagem foi para o cliente.');
    } catch (e) {
      Alert.alert('Mensagem não enviada', e.message);
    }
  };
  const faq = f.faq || [];
  const humano = conv.filter((c) => c.estado === 'humano');

  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '800', color: colors.text, fontSize: 16 }}>🤖 Atendente IA</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>Responde seus clientes na hora, 24 h. Usa {f.modelo}.</Text>
          {f.uso ? <Text style={{ color: colors.muted, fontSize: 12 }}>Plano {f.plano.nome}: {f.uso.respostas} de {f.uso.limite.toLocaleString('pt-BR')} respostas neste mês</Text> : null}
        </View>
        <Switch value={f.ligado} onValueChange={(v) => salvar({ ligado: v })} disabled={busy} />
      </Row>
      {humano.length ? (
        <View style={{ backgroundColor: '#FFF2E0', borderRadius: 12, padding: 10, marginTop: 10 }}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>{humano.length} conversa{humano.length > 1 ? 's' : ''} esperando uma pessoa da equipe</Text>
        </View>
      ) : null}

      <TouchableOpacity onPress={() => setAberto(!aberto)} style={{ marginTop: 10 }}>
        <Text style={{ color: colors.primary, fontWeight: '700' }}>{aberto ? 'Fechar a ficha' : 'Editar o que a IA sabe'}</Text>
      </TouchableOpacity>
      {aberto ? (
        <View>
          {CAMPOS.map(([k, ph]) => (
            <Input key={k} placeholder={ph} value={f[k]} onChangeText={(v) => setF({ ...f, [k]: v })} style={{ marginTop: 8 }} multiline />
          ))}
          <Text style={{ fontWeight: '700', color: colors.text, marginTop: 12 }}>Perguntas frequentes</Text>
          {faq.map((x, i) => (
            <View key={i} style={{ marginTop: 6, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6 }}>
              <Input placeholder="Pergunta" value={x.q} onChangeText={(v) => setF({ ...f, faq: faq.map((y, j) => (j === i ? { ...y, q: v } : y)) })} />
              <Input placeholder="Resposta" value={x.a} onChangeText={(v) => setF({ ...f, faq: faq.map((y, j) => (j === i ? { ...y, a: v } : y)) })} style={{ marginTop: 6 }} multiline />
              <TouchableOpacity onPress={() => setF({ ...f, faq: faq.filter((_, j) => j !== i) })}>
                <Text style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>Remover</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={() => setF({ ...f, faq: [...faq, { q: '', a: '' }] })} style={{ marginTop: 8 }}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>+ Adicionar pergunta</Text>
          </TouchableOpacity>
          <Row style={{ justifyContent: 'space-between', marginTop: 12 }}>
            <Text style={{ color: colors.text, flex: 1 }}>A IA pode negociar desconto e orçamento</Text>
            <Switch value={f.iaNegocia} onValueChange={(v) => setF({ ...f, iaNegocia: v })} />
          </Row>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            {f.plano && !f.plano.podeNegociar ? 'Negociar pela IA está no plano Pro. No seu plano, a hora de negociar vem para você.' : 'Desligado (recomendado): na hora de negociar, a conversa vem para você.'}
          </Text>
          <Button title={busy ? 'Salvando…' : 'Salvar a ficha'} onPress={() => salvar()} disabled={busy} style={{ marginTop: 10 }} />
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6 }}>Os produtos e preços a IA lê sozinha do seu catálogo no Realyz. Ela nunca fecha venda nem cobra: o cliente confirma no app.</Text>
        </View>
      ) : null}

      <Text style={{ fontWeight: '700', color: colors.text, marginTop: 14 }}>Testar a IA</Text>
      <Row style={{ marginTop: 6 }}>
        <Input style={{ flex: 1, marginRight: 8 }} placeholder="Pergunte como um cliente (ex.: vocês entregam hoje?)" value={teste} onChangeText={setTeste} />
        <Button small title="Testar" onPress={testar} />
      </Row>
      {resp ? <Text style={{ color: colors.text, backgroundColor: '#F6EDD6', borderRadius: 12, padding: 10, marginTop: 8 }}>{resp.resposta}</Text> : null}

      {conv.length ? <Text style={{ fontWeight: '700', color: colors.text, marginTop: 14 }}>Conversas</Text> : null}
      {conv.slice(0, 20).map((c) => (
        <View key={c.cliente.id} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 6 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text numberOfLines={1} style={{ fontWeight: '700', color: colors.text, flex: 1 }}>{c.cliente.name}</Text>
            <Badge label={c.estado === 'ia' ? 'IA atendendo' : 'Com a equipe'} color={c.estado === 'ia' ? colors.success : colors.primary} />
          </Row>
          <Text style={{ color: colors.muted, fontSize: 12.5 }} numberOfLines={2}>{ETAPA[c.etapa] || c.etapa}{c.motivo ? ` · ${c.motivo}` : ''}{c.resumo ? ` · "${c.resumo}"` : ''}</Text>
          <Row style={{ marginTop: 6, flexWrap: 'wrap' }}>
            <Button small title="Abrir conversa" onPress={() => dispatch({ type: 'OPEN_SERVER_CHAT', userId: c.cliente.id, name: c.cliente.name })} />
            <View style={{ width: 6 }} />
            {!f.plano || f.plano.copiloto ? (
              <>
                <Button small variant="light" title="Sugerir resposta" onPress={() => sugerir(c)} />
                <View style={{ width: 6 }} />
              </>
            ) : null}
            <Button small variant="light" title={c.estado === 'ia' ? 'Assumir' : 'Devolver à IA'} onPress={() => acao(c, c.estado === 'ia' ? 'assumir' : 'devolver')} />
          </Row>
          {sug && sug.clientId === c.cliente.id ? (
            <View style={{ marginTop: 8 }}>
              <Input value={sug.texto} onChangeText={(v) => setSug({ ...sug, texto: v })} multiline />
              <Row style={{ marginTop: 6 }}>
                <Button small title="Enviar" onPress={enviarSug} />
                <View style={{ width: 6 }} />
                <Button small variant="light" title="Descartar" onPress={() => setSug(null)} />
              </Row>
            </View>
          ) : null}
        </View>
      ))}
    </Card>
  );
}
