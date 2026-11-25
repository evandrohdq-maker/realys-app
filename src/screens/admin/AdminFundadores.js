// Administrador › Cadastros › Fundadores: quem pediu vaga pelo site (realyz.com.br/fundador.html e
// /entregador.html), as vagas por área e a etapa de cada um. Ao marcar "Fechou", a pessoa ganha o
// número de fundador (nº 001, 002...). Link de cada vendedor: realyz.com.br/fundador.html?v=NOME.
import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../responsive';
import { api, serverOn } from '../../api';
import { useStore } from '../../store';
import { colors, soft } from '../../theme';

const ETAPAS = [
  ['novo', 'Novos'],
  ['contato', 'Em conversa'],
  ['fechado', 'Fecharam'],
  ['desistiu', 'Desistiram'],
];
const numFund = (n) => `nº ${String(n).padStart(3, '0')}`;
const fone = (w) => {
  const d = String(w || '').replace(/\D/g, '');
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : d;
};

export default function AdminFundadores() {
  const { state } = useStore();
  const leitura = !!(state.user && state.user.readOnly);
  const [d, setD] = useState(null);
  const [erro, setErro] = useState(null);
  const [etapa, setEtapa] = useState('novo');
  const [aberto, setAberto] = useState(true);
  const carregar = () =>
    api('GET', '/admin/fundadores')
      .then((r) => (setD(r), setErro(null)))
      .catch((e) => setErro(e.message));
  useEffect(() => {
    if (serverOn()) carregar();
  }, []);
  if (!serverOn()) return null;

  const mudar = (f, status) => {
    if (leitura) return Alert.alert('Acesso de analista', 'Você pode ver os fundadores, mas mudar a etapa é com o administrador.');
    api('POST', `/admin/fundadores/${f.id}`, { status })
      .then((r) => {
        if (r.numero && status === 'fechado') Alert.alert('Fundador confirmado 🎉', `${f.nome} é o Fundador ${numFund(r.numero)}.`);
        carregar();
      })
      .catch((e) => Alert.alert('Fundadores', e.message));
  };
  const areas = (d && d.areas) || [];
  const nomeArea = (id) => (areas.find((a) => a.id === id) || {}).label || id;
  const tot = (g) => areas.filter((a) => a.grupo === g).reduce((s, a) => ({ meta: s.meta + a.meta, f: s.f + a.fechados }), { meta: 0, f: 0 });
  const emp = tot('empresa');
  const ent = tot('entregador');
  const lista = ((d && d.lista) || []).filter((f) => f.status === etapa);

  return (
    <View style={st.box}>
      <TouchableOpacity style={st.head} onPress={() => setAberto((v) => !v)} accessibilityLabel="Fundadores do piloto">
        <Ionicons name="ribbon-outline" size={20} color={colors.primary} />
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={st.titulo}>Fundadores do piloto</Text>
          <Text style={st.sub} numberOfLines={1}>{d ? `Empresas ${emp.f}/${emp.meta} · Entregadores ${ent.f}/${ent.meta}` : erro || 'Carregando…'}</Text>
        </View>
        <Ionicons name={aberto ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
      </TouchableOpacity>
      {aberto && d ? (
        <>
          {areas.map((a) => (
            <View key={a.id} style={st.area}>
              <Text style={st.areaNome} numberOfLines={1}>{a.label}</Text>
              <Text style={[st.areaN, a.restantes === 0 && { color: colors.success }]}>{a.fechados}/{a.meta}</Text>
            </View>
          ))}
          <View style={st.etapas}>
            {ETAPAS.map(([k, l]) => {
              const n = d.lista.filter((f) => f.status === k).length;
              return (
                <TouchableOpacity key={k} style={[st.etapa, etapa === k && st.etapaOn]} onPress={() => setEtapa(k)}>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: etapa === k ? colors.text : colors.menu, fontWeight: etapa === k ? '800' : '700', fontSize: 12.5 }}>{l} {n ? `(${n})` : ''}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {lista.map((f) => (
            <View key={f.id} style={st.item}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={st.nome} numberOfLines={1}>{f.nome}</Text>
                {f.numero ? <Text style={st.numero}>{numFund(f.numero)}</Text> : null}
              </View>
              <Text style={st.sub} numberOfLines={1}>{nomeArea(f.area)}{f.responsavel && f.responsavel !== f.nome ? ` · ${f.responsavel}` : ''}</Text>
              <Text style={st.sub} numberOfLines={1}>{fone(f.whatsapp)}{f.cnpj ? ` · CNPJ ${f.cnpj}` : ''}{f.vendedor ? ` · vendedor: ${f.vendedor}` : ''}</Text>
              {f.obs ? <Text style={st.obs} numberOfLines={2}>{f.obs}</Text> : null}
              <View style={st.acoes}>
                <TouchableOpacity style={st.acao} onPress={() => Linking.openURL(`https://wa.me/55${String(f.whatsapp).replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '')}`)} accessibilityLabel={`Chamar ${f.nome} no WhatsApp`}>
                  <Ionicons name="logo-whatsapp" size={16} color={colors.success} />
                  <Text style={[st.acaoT, { color: colors.success }]}>Chamar</Text>
                </TouchableOpacity>
                {ETAPAS.filter(([k]) => k !== f.status).map(([k, l]) => (
                  <TouchableOpacity key={k} style={st.acao} onPress={() => mudar(f, k)}>
                    <Text style={st.acaoT}>{k === 'fechado' ? 'Fechou' : k === 'contato' ? 'Em conversa' : k === 'desistiu' ? 'Desistiu' : 'Novo'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
          {!lista.length ? <Text style={st.vazio}>Ninguém nesta etapa.</Text> : null}
        </>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  box: { backgroundColor: colors.card, borderRadius: 16, padding: 12, marginBottom: 12, ...soft },
  head: { flexDirection: 'row', alignItems: 'center' },
  titulo: { color: colors.text, fontWeight: '800', fontSize: 15 },
  sub: { color: colors.muted, fontSize: 12.5 },
  area: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 4 },
  areaNome: { flex: 1, color: colors.text, fontSize: 13 },
  areaN: { color: colors.primaryDark, fontWeight: '800', fontSize: 13, marginLeft: 8 },
  etapas: { flexDirection: 'row', marginTop: 10, marginBottom: 6 },
  etapa: { flex: 1, minHeight: 34, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent', paddingHorizontal: 2 },
  etapaOn: { borderBottomColor: colors.primary },
  item: { borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 9 },
  nome: { flex: 1, color: colors.text, fontWeight: '800' },
  numero: { color: colors.primaryDark, fontWeight: '800', fontSize: 12, marginLeft: 6 },
  obs: { color: colors.text, fontSize: 12.5, marginTop: 2 },
  acoes: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  acao: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1, borderColor: colors.borderStrong, marginRight: 6, marginTop: 4 },
  acaoT: { color: colors.text, fontSize: 12, fontWeight: '700', marginLeft: 3 },
  vazio: { color: colors.muted, textAlign: 'center', paddingVertical: 12 },
});
