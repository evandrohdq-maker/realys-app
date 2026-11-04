import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Share, Alert, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../store';
import { colors } from '../../theme';
import { Screen, Title } from '../../components/ui';
import { VERSION_LABEL } from '../../updates';

// Situação de cada parte do app na demonstração.
export const STATUS = {
  demo: { label: 'Funciona na demo', color: '#1E9E63' },
  simulado: { label: 'Só visual (simulado)', color: '#C77D12' },
  servidor: { label: 'Precisa de servidor', color: '#D9534F' },
};

// Mapa de todo o sistema: perfil, tela, o que faz, situação e para onde ir.
export const SYSTEM_MAP = [
  {
    group: 'Entrada e geral',
    items: [
      { key: 'login', name: 'Tela de entrada', desc: 'Usuário, CPF ou CNPJ + biometria do celular', status: 'simulado', why: 'Conta e documento ainda não são conferidos num servidor' },
      { key: 'menu', name: 'Menu ⋮ de categorias', desc: 'Classes e sub-abas que levam às telas', status: 'demo', role: 'cliente', tab: 'home' },
      { key: 'voz', name: 'Assistente de voz "Realys"', desc: 'Pesquisa por voz e palavra de ativação "Realys" (Perfil → mãos livres)', status: 'demo', why: 'Com a tela bloqueada ainda não funciona' },
      { key: 'update', name: 'Atualização automática', desc: 'Avisa e baixa o APK novo do GitHub', status: 'demo' },
    ],
  },
  {
    group: 'Cliente',
    items: [
      { key: 'c-stories', name: 'Stories', desc: 'Página própria (botão Stories): ver, responder, criar o seu; patrocinados com botão de oferta', status: 'simulado', role: 'cliente', tab: 'stories', why: 'Stories de verdade (foto da câmera, 24 h no ar) precisam de servidor' },
      { key: 'c-enc', name: 'Encontros', desc: 'Relacionamentos: termos e status (casados não participam), perfil de namoro opcional com % completo, radar por GPS, curtir/passar, match, conversa, denunciar', status: 'simulado', role: 'cliente', tab: 'encontros', why: 'Radar de verdade e notificações precisam do servidor e do GPS em segundo plano' },
      { key: 'c-shop', name: 'Início › Shop', desc: 'Destaques e lojas (patrocinadas primeiro)', status: 'demo', role: 'cliente', tab: 'home', top: 'shop' },
      { key: 'c-promo', name: 'Início › Promoções', desc: 'Ofertas com desconto', status: 'demo', role: 'cliente', tab: 'home', top: 'promo' },
      { key: 'c-ads', name: 'Início › Anúncios', desc: 'Imóveis, aluguel de carros e máquinas, hotéis, festas e noite, cursos e faculdades online', status: 'demo', role: 'cliente', tab: 'home', top: 'anuncios', why: 'Criar anúncio de verdade precisa de servidor' },
      { key: 'c-com', name: 'Início › Comunidade', desc: 'Posts, mensagens, contatos e chamada de vídeo', status: 'simulado', role: 'cliente', tab: 'home', top: 'comunidade', why: 'Mensagens não saem do celular; vídeo é só visual' },
      { key: 'c-lives', name: 'Início › Lives', desc: 'Assistir e abrir live, inclusive aulas ao vivo', status: 'simulado', role: 'cliente', tab: 'home', top: 'lives', why: 'Precisa de servidor de vídeo e da câmera' },
      { key: 'c-loja', name: 'Loja', desc: 'Busca, carrinho e pagamento com saldo Realys', status: 'demo', role: 'cliente', tab: 'loja', why: 'Pagamento real e moeda Realys ainda não existem' },
      { key: 'c-serv', name: 'Serviços', desc: 'Casa, veículos, festas e eventos (DJ, fotógrafo, buffet, decoração) e aulas: mapa, contratar, orçamento, perfil e GPS', status: 'simulado', role: 'cliente', tab: 'servicos', why: 'Mapa e GPS são ilustrativos, sem localização real' },
      { key: 'c-ped', name: 'Pedidos', desc: 'Acompanhar compras e chamados', status: 'demo', role: 'cliente', tab: 'pedidos' },
    ],
  },
  {
    group: 'Empresa (CNPJ)',
    items: [
      { key: 'e-painel', name: 'Painel', desc: 'Vendas, gráficos e alertas da IA', status: 'demo', role: 'empresa', tab: 'painel' },
      { key: 'e-est', name: 'Estoque', desc: 'Produtos ligados à vitrine e venda no balcão', status: 'demo', role: 'empresa', tab: 'estoque' },
      { key: 'e-caixa', name: 'Fluxo de caixa', desc: 'Entradas, saídas e projeção', status: 'demo', role: 'empresa', tab: 'caixa' },
      { key: 'e-b2b', name: 'Negócios B2B', desc: 'Compras com proposta de desconto e propostas recebidas de fornecedores (aceitar, recusar, contrapropor)', status: 'demo', role: 'empresa', tab: 'negocios' },
    ],
  },
  {
    group: 'Prestador e fornecedor',
    items: [
      { key: 'p-trab', name: 'Prestador › Trabalhar', desc: 'Cadastro de funções e preços, GPS e pedidos', status: 'simulado', role: 'prestador', tab: 'prestar', why: 'GPS ligado não usa a localização real' },
      { key: 'f-prop', name: 'Fornecedor › Propostas', desc: 'Destacar produtos, cadastrar produto, enviar proposta direto para empresas e responder pedidos', status: 'demo', role: 'fornecedor', tab: 'propostas' },
    ],
  },
  {
    group: 'Administração',
    items: [
      { key: 'a-geral', name: 'Visão geral', desc: 'Usuários, empresas, receita', status: 'simulado', role: 'admin', tab: 'geral', why: 'Números são de exemplo' },
      { key: 'a-mod', name: 'Moderação', desc: 'Denúncias e alertas da IA', status: 'demo', role: 'admin', tab: 'moderacao' },
      { key: 'a-cad', name: 'Cadastros', desc: 'Aprovar empresas, prestadores e fornecedores', status: 'demo', role: 'admin', tab: 'cadastros' },
    ],
  },
];

export const NEXT_STEPS = [
  'Servidor na nuvem com banco de dados e login real',
  'Biometria facial ligada a documento e consulta de CNPJ',
  'Pagamentos reais e moeda Realys (validação jurídica)',
  'Mapa e GPS em tempo real',
  'Mensagens, chamada de vídeo e lives de verdade',
  'IA verificadora de fake news',
  'Publicação na Google Play',
];

const fmtDate = (iso) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes()
  ).padStart(2, '0')}`;
};

// Caixa para escrever uma anotação sobre uma tela.
export function NoteModal({ visible, where, onClose }) {
  const { dispatch } = useStore();
  const [text, setText] = useState('');
  const save = () => {
    if (!text.trim()) return;
    dispatch({ type: 'ADD_NOTE', note: { where, text: text.trim() } });
    setText('');
    onClose();
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.noteCard} onPress={() => {}}>
          <Text style={styles.noteTitle}>Anotar mudança</Text>
          <View style={styles.wherePill}>
            <Ionicons name="location-outline" size={13} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700', marginLeft: 4 }}>{where}</Text>
          </View>
          <TextInput
            style={styles.noteInput}
            placeholder="O que deve mudar nesta tela?"
            placeholderTextColor={colors.muted}
            value={text}
            onChangeText={setText}
            multiline
            autoFocus
          />
          <View style={{ flexDirection: 'row', marginTop: 12 }}>
            <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={onClose}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnMain]} onPress={save}>
              <Text style={{ color: colors.onPrimary, fontWeight: '800' }}>Salvar anotação</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function AdminSystem({ openArea }) {
  const { state, dispatch } = useStore();
  const [noteFor, setNoteFor] = useState(null);
  const [filter, setFilter] = useState('todos');
  const all = SYSTEM_MAP.flatMap((g) => g.items);
  const count = (st) => all.filter((i) => i.status === st).length;
  const notesOf = (name) => state.notes.filter((n) => n.where === name);
  const open = state.notes.filter((n) => !n.done).length;

  const share = () => {
    if (!state.notes.length) return Alert.alert('Sem anotações', 'Anote nas telas usando o botão de lápis.');
    const text =
      `Realys · anotações do administrador (${VERSION_LABEL})\n\n` +
      state.notes
        .map((n) => `${n.done ? '[feito]' : '[ ]'} ${n.where} (${fmtDate(n.at)})\n   ${n.text}`)
        .join('\n\n');
    Share.share({ message: text });
  };

  return (
    <Screen>
      <Title sub="Todas as telas do Realys, a situação de cada uma e as suas anotações">Mapa do sistema</Title>

      <View style={styles.statusRow}>
        {Object.entries(STATUS).map(([k, s]) => {
          const on = filter === k;
          return (
            <TouchableOpacity key={k} style={[styles.statusBox, on && { borderColor: s.color }]} onPress={() => setFilter(on ? 'todos' : k)}>
              <Text style={{ color: s.color, fontSize: 22, fontWeight: '900' }}>{count(k)}</Text>
              <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>{s.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.notesHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.h2}>Anotações</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            {open} pendente(s) · {state.notes.length - open} feita(s) · ficam salvas no celular
          </Text>
        </View>
        <TouchableOpacity style={styles.shareBtn} onPress={share}>
          <Ionicons name="share-social-outline" size={16} color={colors.onPrimary} />
          <Text style={{ color: colors.onPrimary, fontWeight: '800', marginLeft: 6, fontSize: 13 }}>Enviar</Text>
        </TouchableOpacity>
      </View>
      {!state.notes.length ? (
        <View style={styles.tip}>
          <Ionicons name="create-outline" size={18} color={colors.primary} />
          <Text style={{ color: colors.text, fontSize: 13, marginLeft: 8, flex: 1 }}>
            Navegue pelo app e toque no botão de lápis (canto inferior esquerdo) em qualquer tela para anotar o que mudar. Ou use
            "Anotar" em cada item abaixo.
          </Text>
        </View>
      ) : null}
      {state.notes.map((n) => (
        <View key={n.id} style={[styles.note, n.done && { opacity: 0.55 }]}>
          <TouchableOpacity onPress={() => dispatch({ type: 'TOGGLE_NOTE', id: n.id })} accessibilityLabel={n.done ? 'Marcar como pendente' : 'Marcar como feito'}>
            <Ionicons name={n.done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={n.done ? colors.success : colors.muted} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>
              {n.where} · {fmtDate(n.at)}
            </Text>
            <Text style={{ color: colors.text, marginTop: 3, textDecorationLine: n.done ? 'line-through' : 'none' }}>{n.text}</Text>
          </View>
          <TouchableOpacity onPress={() => dispatch({ type: 'DELETE_NOTE', id: n.id })} accessibilityLabel="Apagar anotação">
            <Ionicons name="trash-outline" size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>
      ))}

      {SYSTEM_MAP.map((g) => {
        const items = g.items.filter((i) => filter === 'todos' || i.status === filter);
        if (!items.length) return null;
        return (
          <View key={g.group} style={{ marginTop: 18 }}>
            <Text style={styles.group}>{g.group}</Text>
            {items.map((i) => {
              const st = STATUS[i.status];
              const nNotes = notesOf(i.name).filter((n) => !n.done).length;
              return (
                <View key={i.key} style={styles.item}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.dot, { backgroundColor: st.color }]} />
                    <Text style={styles.itemName}>{i.name}</Text>
                    {nNotes ? (
                      <View style={styles.noteCount}>
                        <Text style={{ color: colors.onPrimary, fontSize: 10, fontWeight: '800' }}>{nNotes}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.itemDesc}>{i.desc}</Text>
                  <Text style={[styles.itemStatus, { color: st.color }]}>
                    {st.label}
                    {i.why ? ` · ${i.why}` : ''}
                  </Text>
                  <View style={{ flexDirection: 'row', marginTop: 10 }}>
                    {i.role ? (
                      <TouchableOpacity style={[styles.smallBtn, styles.smallMain]} onPress={() => openArea(i.role, i.tab, i.top)}>
                        <Ionicons name="open-outline" size={14} color={colors.onPrimary} />
                        <Text style={{ color: colors.onPrimary, fontWeight: '800', fontSize: 12, marginLeft: 5 }}>Abrir tela</Text>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity style={styles.smallBtn} onPress={() => setNoteFor(i.name)}>
                      <Ionicons name="create-outline" size={14} color={colors.text} />
                      <Text style={{ color: colors.text, fontWeight: '600', fontSize: 12, marginLeft: 5 }}>Anotar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        );
      })}

      <View style={{ marginTop: 18 }}>
        <Text style={styles.group}>Falta para a versão real</Text>
        {NEXT_STEPS.map((s) => (
          <View key={s} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Ionicons name="server-outline" size={14} color={colors.danger} />
            <Text style={{ color: colors.text, fontSize: 13, marginLeft: 8 }}>{s}</Text>
          </View>
        ))}
      </View>

      <NoteModal visible={!!noteFor} where={noteFor || ''} onClose={() => setNoteFor(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', marginHorizontal: -4, marginBottom: 16 },
  statusBox: {
    flex: 1,
    marginHorizontal: 4,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  notesHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  h2: { color: colors.text, fontSize: 17, fontWeight: '800' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', height: 38, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.primary },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(168,121,10,0.45)',
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  group: { color: colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  item: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 8 },
  dot: { width: 9, height: 9, borderRadius: 5, marginRight: 8 },
  itemName: { color: colors.text, fontWeight: '700', fontSize: 15, flexShrink: 1 },
  noteCount: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginLeft: 8, paddingHorizontal: 4 },
  itemDesc: { color: colors.muted, fontSize: 12, marginTop: 4 },
  itemStatus: { fontSize: 11, marginTop: 4, fontWeight: '600' },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EADFC8',
    marginRight: 8,
  },
  smallMain: { backgroundColor: colors.primary, borderColor: colors.primary },
  backdrop: { flex: 1, backgroundColor: 'rgba(31,42,68,0.35)', justifyContent: 'center', padding: 20 },
  noteCard: { backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(168,121,10,0.35)', padding: 18 },
  noteTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  wherePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(168,121,10,0.1)',
    marginTop: 8,
    marginBottom: 12,
  },
  noteInput: {
    minHeight: 110,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    color: colors.text,
    padding: 12,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  btn: { flex: 1, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnGhost: { borderWidth: 1, borderColor: colors.border, marginRight: 10 },
  btnMain: { backgroundColor: colors.primary },
});
