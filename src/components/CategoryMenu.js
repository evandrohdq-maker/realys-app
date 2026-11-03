import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { serviceTypes } from '../data';

// Classes do menu de três pontinhos (⋮). Cada uma abre uma sub-aba com os tipos.
// "go" diz para qual aba o app vai e com qual filtro.
export const CATEGORIES = [
  {
    key: 'restaurantes',
    title: 'Restaurantes',
    hint: 'Delivery, mesa e retirada',
    icon: 'restaurant-outline',
    subs: [
      { label: 'Pizzaria', hint: 'Forno e delivery', icon: 'pizza-outline', go: { tab: 'loja', cat: 'Alimentação', q: 'pizza' } },
      { label: 'Hambúrguer', hint: 'Lanches e combos', icon: 'fast-food-outline', go: { tab: 'loja', cat: 'Alimentação', q: 'burguer' } },
      { label: 'Japonesa', hint: 'Em breve', icon: 'fish-outline', soon: true, go: { tab: 'loja', cat: 'Alimentação', q: '' } },
      { label: 'Brasileira', hint: 'Em breve', icon: 'flame-outline', soon: true, go: { tab: 'loja', cat: 'Alimentação', q: '' } },
      { label: 'Doces e cafés', hint: 'Em breve', icon: 'cafe-outline', soon: true, go: { tab: 'loja', cat: 'Alimentação', q: '' } },
      { label: 'Ver todos', hint: 'Todos os restaurantes', icon: 'grid-outline', go: { tab: 'loja', cat: 'Alimentação', q: '' } },
    ],
  },
  {
    key: 'servicos',
    title: 'Serviços gerais',
    hint: 'Profissionais perto de você',
    icon: 'construct-outline',
    subs: serviceTypes.map((s) => ({ label: s.label, hint: s.group, icon: s.ion, go: { tab: 'servicos', service: s.key } })),
  },
  {
    key: 'lojas',
    title: 'Lojas',
    hint: 'Físicas e com envio para todo o Brasil',
    icon: 'bag-handle-outline',
    subs: [
      { label: 'Mercado', hint: 'Compras do dia', icon: 'cart-outline', go: { tab: 'loja', cat: 'Mercado', q: '' } },
      { label: 'Moda', hint: 'Roupas e calçados', icon: 'shirt-outline', go: { tab: 'loja', cat: 'Roupas', q: '' } },
      { label: 'Eletrônicos', hint: 'Celulares e acessórios', icon: 'phone-portrait-outline', go: { tab: 'loja', cat: 'Eletrônicos', q: '' } },
      { label: 'Promoções', hint: 'Ofertas relâmpago', icon: 'pricetags-outline', go: { tab: 'home', top: 'promo' } },
      { label: 'Ver todas', hint: 'Todas as lojas', icon: 'storefront-outline', go: { tab: 'loja', cat: 'Todos', q: '' } },
    ],
  },
  {
    key: 'imoveis',
    title: 'Imóveis',
    hint: 'Venda e locação',
    icon: 'business-outline',
    subs: [
      { label: 'Comprar', hint: 'Imóveis à venda', icon: 'home-outline', go: { tab: 'home', top: 'anuncios', kind: 'imovel-venda' } },
      { label: 'Alugar', hint: 'Imóveis para locação', icon: 'key-outline', go: { tab: 'home', top: 'anuncios', kind: 'imovel-aluguel' } },
    ],
  },
  {
    key: 'locacao',
    title: 'Aluguel de veículos e máquinas',
    hint: 'Carros, vans, máquinas e equipamentos',
    icon: 'car-sport-outline',
    subs: [
      { label: 'Carros e vans', hint: 'Por dia ou por semana', icon: 'car-sport-outline', go: { tab: 'home', top: 'anuncios', kind: 'carro-aluguel' } },
      { label: 'Máquinas e equipamentos', hint: 'Obra, terraplanagem, andaimes', icon: 'construct-outline', go: { tab: 'home', top: 'anuncios', kind: 'maquina-aluguel' } },
    ],
  },
  {
    key: 'hotelaria',
    title: 'Hotelaria',
    hint: 'Hotéis, pousadas e diárias',
    icon: 'bed-outline',
    subs: [
      { label: 'Hotéis', hint: 'Reserve a diária', icon: 'business-outline', go: { tab: 'home', top: 'anuncios', kind: 'hotel' } },
      { label: 'Pousadas', hint: 'Praia, serra e campo', icon: 'leaf-outline', go: { tab: 'home', top: 'anuncios', kind: 'hotel' } },
    ],
  },
  {
    key: 'eventos',
    title: 'Festas, eventos e noite',
    hint: 'Casas noturnas, shows, salões e serviços',
    icon: 'musical-notes-outline',
    subs: [
      { label: 'Casas noturnas e shows', hint: 'Ingressos', icon: 'sparkles-outline', go: { tab: 'home', top: 'anuncios', kind: 'evento' } },
      { label: 'Salões e espaços', hint: 'Reserve a data', icon: 'home-outline', go: { tab: 'home', top: 'anuncios', kind: 'evento' } },
      { label: 'DJ e som', hint: 'Para a sua festa', icon: 'musical-notes-outline', go: { tab: 'servicos', service: 'dj' } },
      { label: 'Fotógrafo', hint: 'Fotos e filmagem', icon: 'camera-outline', go: { tab: 'servicos', service: 'fotografo' } },
      { label: 'Buffet e garçom', hint: 'Comida e bebida', icon: 'wine-outline', go: { tab: 'servicos', service: 'buffet' } },
      { label: 'Decoração', hint: 'Balões e mesa temática', icon: 'balloon-outline', go: { tab: 'servicos', service: 'decoracao' } },
      { label: 'Lives da noite', hint: 'Ao vivo das casas', icon: 'radio-outline', go: { tab: 'home', top: 'lives', live: 'noite' } },
    ],
  },
  {
    key: 'aulas',
    title: 'Aulas e cursos',
    hint: 'Professores, cursos e faculdades online',
    icon: 'school-outline',
    subs: [
      { label: 'Professor particular', hint: 'Online ou presencial', icon: 'school-outline', go: { tab: 'servicos', service: 'professor' } },
      { label: 'Personal trainer', hint: 'Treino em casa ou no parque', icon: 'barbell-outline', go: { tab: 'servicos', service: 'personal' } },
      { label: 'Cursos online', hint: 'Com certificado', icon: 'laptop-outline', go: { tab: 'home', top: 'anuncios', kind: 'curso' } },
      { label: 'Faculdades online', hint: 'Graduação e pós EAD', icon: 'library-outline', go: { tab: 'home', top: 'anuncios', kind: 'curso' } },
      { label: 'Aulas ao vivo', hint: 'Nas lives', icon: 'radio-outline', go: { tab: 'home', top: 'lives', live: 'aulas' } },
    ],
  },
  {
    key: 'social',
    title: 'Comunidade e lives',
    hint: 'Posts, mensagens, vídeo e lives',
    icon: 'people-outline',
    subs: [
      { label: 'Comunidade', hint: 'Posts de pessoas reais', icon: 'chatbox-ellipses-outline', go: { tab: 'home', top: 'comunidade', seg: 'posts' } },
      { label: 'Mensagens', hint: 'Conversas e chamadas de vídeo', icon: 'mail-outline', go: { tab: 'home', top: 'comunidade', seg: 'msgs' } },
      { label: 'Contatos', hint: 'Sua lista de contatos', icon: 'person-add-outline', go: { tab: 'home', top: 'comunidade', seg: 'contatos' } },
      { label: 'Lives', hint: 'Assista ou abra a sua', icon: 'radio-outline', go: { tab: 'home', top: 'lives' } },
    ],
  },
  {
    key: 'empresa',
    title: 'Área empresarial',
    hint: 'Para CNPJ: estoque, caixa e negócios',
    icon: 'stats-chart-outline',
    subs: [
      { label: 'Painel', hint: 'Vendas e alertas', icon: 'speedometer-outline', go: { tab: 'painel' } },
      { label: 'Estoque', hint: 'Produtos e entradas', icon: 'file-tray-stacked-outline', go: { tab: 'estoque' } },
      { label: 'Fluxo de caixa', hint: 'Entradas e saídas', icon: 'wallet-outline', go: { tab: 'caixa' } },
      { label: 'Negociações', hint: 'Descontos entre empresas', icon: 'swap-horizontal-outline', go: { tab: 'negocios' } },
    ],
  },
];

export default function CategoryMenu({ visible, onClose, onPick }) {
  const [cat, setCat] = useState(null);
  useEffect(() => {
    if (!visible) setCat(null);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => (cat ? setCat(null) : onClose())}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.panel} onPress={() => {}}>
          {!cat ? (
            <>
              <View style={styles.head}>
                <Text style={styles.kicker}>EXPLORAR REALYS</Text>
                <TouchableOpacity onPress={onClose} style={styles.iconBtn} accessibilityLabel="Fechar">
                  <Ionicons name="close" size={18} color={colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 520 }}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity key={c.key} style={styles.row} onPress={() => setCat(c)} activeOpacity={0.8}>
                  <View style={styles.rowIcon}>
                    <Ionicons name={c.icon} size={21} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{c.title}</Text>
                    <Text style={styles.rowHint}>{c.hint}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </TouchableOpacity>
              ))}
              </ScrollView>
            </>
          ) : (
            <>
              <View style={styles.head}>
                <TouchableOpacity onPress={() => setCat(null)} style={styles.iconBtn} accessibilityLabel="Voltar">
                  <Ionicons name="arrow-back" size={18} color={colors.text} />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.subTitle}>{cat.title}</Text>
                  <Text style={styles.rowHint}>Que tipo você está procurando?</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.iconBtn} accessibilityLabel="Fechar">
                  <Ionicons name="close" size={18} color={colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={styles.grid}>
                {cat.subs.map((s) => (
                  <TouchableOpacity key={s.label} style={styles.tile} onPress={() => onPick(s.go)} activeOpacity={0.8}>
                    <Ionicons name={s.icon} size={20} color={colors.primary} />
                    <Text style={styles.tileTitle}>{s.label}</Text>
                    <Text style={[styles.tileHint, s.soon && { color: colors.accent }]}>{s.hint}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(3,5,10,0.7)', alignItems: 'flex-end', paddingTop: 90, paddingHorizontal: 12 },
  panel: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#0D1320',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(59,232,255,0.3)',
    padding: 14,
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  kicker: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.6 },
  iconBtn: { width: 38, height: 38, borderRadius: 11, backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#101828',
    marginBottom: 8,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: 'rgba(59,232,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowTitle: { color: colors.text, fontWeight: '700', fontSize: 15 },
  rowHint: { color: colors.muted, fontSize: 12, marginTop: 2 },
  subTitle: { color: colors.text, fontWeight: '800', fontSize: 17 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tile: {
    width: '48.5%',
    minHeight: 92,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#101828',
    marginBottom: 8,
  },
  tileTitle: { color: colors.text, fontWeight: '700', fontSize: 13, marginTop: 6 },
  tileHint: { color: colors.muted, fontSize: 11, marginTop: 2 },
});
