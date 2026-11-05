import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, ROLE_LABELS } from '../theme';
import { serviceTypes } from '../data';
import { SHOP_SECTORS, SHOP_SECTOR_KEYS } from '../shopSectorsData';

// Ícones dos subgrupos de Eletrônicos, Vestuário e Utensílios domésticos no menu ⋮.
const GROUP_ION = {
  todos: 'grid-outline', celulares: 'phone-portrait-outline', informatica: 'laptop-outline', tvaudio: 'tv-outline', games: 'game-controller-outline', smarthome: 'bulb-outline', acessorios: 'watch-outline',
  feminino: 'woman-outline', masculino: 'man-outline', infantil: 'happy-outline', calcados: 'footsteps-outline', fitness: 'barbell-outline',
  cozinha: 'restaurant-outline', eletroportateis: 'flash-outline', mesa: 'wine-outline', cama: 'bed-outline', limpeza: 'sparkles-outline', organizacao: 'file-tray-stacked-outline',
  geladeiras: 'snow-outline', fogoes: 'flame-outline', lavadoras: 'water-outline', climatizacao: 'thermometer-outline', fornos: 'pizza-outline', lavaloucas: 'restaurant-outline', instalacao: 'construct-outline',
  presentes: 'gift-outline', papelaria: 'pencil-outline', pet: 'paw-outline', brinquedos: 'happy-outline', ferramentas: 'hammer-outline', festas: 'balloon-outline', esporte: 'football-outline', beleza: 'rose-outline',
  sala: 'tv-outline', quarto: 'bed-outline', cozinhamov: 'cafe-outline', escritorio: 'desktop-outline', externa: 'leaf-outline', decoracao: 'color-palette-outline', iluminacao: 'bulb-outline', tapetes: 'grid-outline',
};
const sectorClass = (k) => {
  const s = SHOP_SECTORS[k];
  return {
    key: k,
    title: s.title,
    hint: s.hint,
    icon: s.ion,
    subs: [
      ...s.groups.filter((g) => g.key !== 'todos').map((g) => ({ label: g.label, hint: s.title, icon: GROUP_ION[g.key] || s.ion, go: { tab: k, group: g.key } })),
      { label: 'Ver tudo', hint: `Todo o setor de ${s.title.toLowerCase()}`, icon: 'grid-outline', go: { tab: k, group: 'todos' } },
    ],
  };
};

// Classes do menu de três pontinhos (⋮). Cada uma abre uma sub-aba com os tipos.
// "go" diz para qual aba o app vai e com qual filtro.
export const CATEGORIES = [
  {
    key: 'restaurantes',
    title: 'Restaurantes',
    hint: 'Delivery, mesa e retirada',
    icon: 'restaurant-outline',
    subs: [
      { label: 'Pizzaria', hint: 'Forno e delivery', icon: 'pizza-outline', go: { tab: 'food', cat: 'Alimentação', q: 'pizza' } },
      { label: 'Hambúrguer', hint: 'Lanches e combos', icon: 'fast-food-outline', go: { tab: 'food', cat: 'Alimentação', q: 'burguer' } },
      { label: 'Japonesa', hint: 'Sushi, temaki e rodízio', icon: 'fish-outline', go: { tab: 'food', cat: 'Alimentação', q: 'sushi' } },
      { label: 'Brasileira', hint: 'Em breve', icon: 'flame-outline', soon: true, go: { tab: 'food', cat: 'Alimentação', q: '' } },
      { label: 'Bares e happy hour', hint: 'Chope, petiscos e música ao vivo', icon: 'beer-outline', go: { tab: 'food', cat: 'Bares', q: '' } },
      { label: 'Doces e cafés', hint: 'Cafeterias e docerias', icon: 'cafe-outline', go: { tab: 'food', cat: 'Doces e cafés', q: '' } },
      { label: 'Ver todos', hint: 'Abrir o Food', icon: 'grid-outline', go: { tab: 'food', cat: 'Todos', q: '' } },
    ],
  },
  {
    key: 'servicos',
    title: 'Prestação de serviços',
    hint: 'Profissionais perto de você e hotelaria',
    icon: 'construct-outline',
    subs: [
      ...serviceTypes.map((s) => ({ label: s.label, hint: s.group, icon: s.ion, go: { tab: 'servicos', service: s.key } })),
      // Hotelaria agora faz parte da prestação de serviços.
      { label: 'Hotéis', hint: 'Hotelaria · reserve a diária', icon: 'bed-outline', go: { tab: 'home', top: 'anuncios', kind: 'hotel' } },
      { label: 'Pousadas', hint: 'Hotelaria · praia, serra e campo', icon: 'leaf-outline', go: { tab: 'home', top: 'anuncios', kind: 'hotel' } },
    ],
  },
  {
    key: 'tecnologia',
    title: 'Tecnologia',
    hint: 'IA, robótica, apps e cursos',
    icon: 'hardware-chip-outline',
    subs: [
      { label: 'Inteligência artificial', hint: 'IA para empresas e para o campo', icon: 'sparkles-outline', go: { tab: 'tecnologia', seg: 'ia' } },
      { label: 'Robótica', hint: 'Kits, indústria e robôs agrícolas', icon: 'hardware-chip-outline', go: { tab: 'tecnologia', seg: 'robotica' } },
      { label: 'Apps e sistemas', hint: 'Gestão, apps e sites', icon: 'phone-portrait-outline', go: { tab: 'tecnologia', seg: 'apps' } },
      { label: 'Cursos e eventos', hint: 'IA, Arduino e hackathons', icon: 'school-outline', go: { tab: 'tecnologia', seg: 'cursos' } },
      { label: 'Desenvolvedores', hint: 'Contrate quem cria o seu app', icon: 'code-slash-outline', go: { tab: 'servicos', service: 'dev' } },
      { label: 'Agro é tech', hint: 'Tecnologia para o campo', icon: 'leaf-outline', go: { tab: 'tecnologia', seg: 'agrotech' } },
    ],
  },
  {
    key: 'agro',
    title: 'Agro',
    hint: 'Insumos, máquinas, agrônomos e produtores',
    icon: 'leaf-outline',
    subs: [
      { label: 'Grãos', hint: 'Soja, milho, trigo e silos', icon: 'nutrition-outline', go: { tab: 'agro', chain: 'graos' } },
      { label: 'Café', hint: 'Mudas, colheita e café especial', icon: 'cafe-outline', go: { tab: 'agro', chain: 'cafe' } },
      { label: 'Pecuária', hint: 'Gado, ração, leilão e veterinário', icon: 'paw-outline', go: { tab: 'agro', chain: 'pecuaria' } },
      { label: 'Hortifrúti', hint: 'Estufas, mudas e venda direta', icon: 'leaf-outline', go: { tab: 'agro', chain: 'horti' } },
      { label: 'Leite', hint: 'Ordenha, resfriador e coleta', icon: 'water-outline', go: { tab: 'agro', chain: 'leite' } },
      { label: 'Sementes e insumos', hint: 'Sementes, mudas e adubo', icon: 'flower-outline', go: { tab: 'agro', seg: 'insumos' } },
      { label: 'Máquinas', hint: 'Venda e aluguel de tratores', icon: 'construct-outline', go: { tab: 'agro', seg: 'maquinas' } },
      { label: 'Agrônomos', hint: 'Visita técnica perto de você', icon: 'person-outline', go: { tab: 'servicos', service: 'agronomo' } },
      { label: 'Veterinário rural', hint: 'Visita na fazenda', icon: 'medkit-outline', go: { tab: 'servicos', service: 'veterinario' } },
      { label: 'Drone agrícola', hint: 'Pulverização por hectare', icon: 'airplane-outline', go: { tab: 'servicos', service: 'droneagro' } },
      { label: 'Direto do produtor', hint: 'Café, hortifrúti e laticínios', icon: 'basket-outline', go: { tab: 'agro', seg: 'producao' } },
      { label: 'Agro é tech', hint: 'Drones, sensores e IA', icon: 'hardware-chip-outline', go: { tab: 'agro', seg: 'agrotech' } },
    ],
  },
  // Setores do Shop com subgrupos, como o Agro.
  ...SHOP_SECTOR_KEYS.map(sectorClass),
  {
    key: 'socorro',
    title: 'Socorro e saúde',
    hint: 'SOS, hospitais, médicos e ambulâncias',
    icon: 'medkit-outline',
    subs: [
      { label: 'Emergência SOS', hint: 'SAMU 192, Bombeiros 193, Polícia 190', icon: 'alert-circle-outline', go: { tab: 'socorro', seg: 'emergencia' } },
      { label: 'Hospitais próximos', hint: 'Pronto-socorro, UPA e clínicas', icon: 'business-outline', go: { tab: 'socorro', seg: 'hospitais' } },
      { label: 'Especialistas médicos', hint: 'Consulta e teleconsulta', icon: 'medkit-outline', go: { tab: 'socorro', seg: 'especialistas' } },
      { label: 'Ambulâncias e socorristas', hint: 'Particulares com GPS', icon: 'pulse-outline', go: { tab: 'socorro', seg: 'socorristas' } },
    ],
  },
  {
    key: 'transporte',
    title: 'Transporte público',
    hint: 'Ônibus e metrô com GPS, entre cidades e estados',
    icon: 'bus-outline',
    subs: [
      { label: 'Na cidade', hint: 'Ônibus e metrô municipais', icon: 'bus-outline', go: { tab: 'transporte', scope: 'municipal' } },
      { label: 'Entre cidades', hint: 'Linhas intermunicipais', icon: 'git-compare-outline', go: { tab: 'transporte', scope: 'intermunicipal' } },
      { label: 'Entre estados', hint: 'Viagens interestaduais', icon: 'map-outline', go: { tab: 'transporte', scope: 'interestadual' } },
    ],
  },
  {
    key: 'lojas',
    title: 'Lojas',
    hint: 'Físicas e com envio para todo o Brasil',
    icon: 'bag-handle-outline',
    subs: [
      { label: 'Mercado', hint: 'Compras do dia', icon: 'cart-outline', go: { tab: 'loja', cat: 'Mercado', q: '' } },
      { label: 'Vestuário', hint: 'Roupas, calçados e acessórios', icon: 'shirt-outline', go: { tab: 'vestuario', group: 'todos' } },
      { label: 'Eletrônicos', hint: 'Celulares, TV, games e informática', icon: 'phone-portrait-outline', go: { tab: 'eletronicos', group: 'todos' } },
      { label: 'Utensílios domésticos', hint: 'Cozinha, cama e banho, limpeza', icon: 'home-outline', go: { tab: 'casa', group: 'todos' } },
      { label: 'Eletrodomésticos', hint: 'Geladeira, fogão, lavadora, ar', icon: 'snow-outline', go: { tab: 'eletrodomesticos', group: 'todos' } },
      { label: 'Móveis e decoração', hint: 'Sala, quarto, escritório, decoração', icon: 'bed-outline', go: { tab: 'moveis', group: 'todos' } },
      { label: 'Vários', hint: 'Presentes, pet, papelaria, brinquedos…', icon: 'apps-outline', go: { tab: 'varios', group: 'todos' } },
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
    key: 'eventos',
    title: 'Festas, eventos e noite',
    hint: 'Casas noturnas, shows, salões e serviços',
    icon: 'musical-notes-outline',
    subs: [
      { label: 'Festas promocionais', hint: 'Descontos, listas VIP e 2 por 1', icon: 'flame-outline', go: { tab: 'home', top: 'eventos', group: 'festa-promo' } },
      { label: 'Promoções da noite', hint: 'Happy hour, rodízios e combos', icon: 'megaphone-outline', go: { tab: 'home', top: 'eventos', group: 'promo-anuncio' } },
      { label: 'Casas noturnas e shows', hint: 'Ingressos', icon: 'sparkles-outline', go: { tab: 'home', top: 'eventos', group: 'shows' } },
      { label: 'Salões e espaços', hint: 'Reserve a data', icon: 'home-outline', go: { tab: 'home', top: 'eventos', group: 'espacos' } },
      { label: 'DJ e som', hint: 'Para a sua festa', icon: 'musical-notes-outline', go: { tab: 'servicos', service: 'dj' } },
      { label: 'Fotógrafo', hint: 'Fotos e filmagem', icon: 'camera-outline', go: { tab: 'servicos', service: 'fotografo' } },
      { label: 'Buffet e garçom', hint: 'Comida e bebida', icon: 'wine-outline', go: { tab: 'servicos', service: 'buffet' } },
      { label: 'Decoração', hint: 'Balões e mesa temática', icon: 'balloon-outline', go: { tab: 'servicos', service: 'decoracao' } },
      { label: 'Lives da noite', hint: 'Ao vivo das casas', icon: 'radio-outline', go: { tab: 'home', top: 'lives', live: 'noite' } },
    ],
  },
  {
    key: 'artistas',
    title: 'Artistas',
    hint: 'Músicas em MP3, vídeos e obras',
    icon: 'musical-notes-outline',
    subs: [
      { label: 'Músicas', hint: 'Ouça e baixe em MP3', icon: 'musical-note-outline', go: { tab: 'artistas', art: 'musica' } },
      { label: 'Vídeos', hint: 'Clipes e apresentações', icon: 'videocam-outline', go: { tab: 'artistas', art: 'video' } },
      { label: 'Obras e exposições', hint: 'Pinturas e artes à venda', icon: 'color-palette-outline', go: { tab: 'artistas', art: 'obra' } },
      { label: 'Todos os artistas', hint: 'Páginas dos artistas', icon: 'people-outline', go: { tab: 'artistas', art: 'todos' } },
      { label: 'Publicar meu trabalho', hint: 'Área empresarial › Página', icon: 'cloud-upload-outline', go: { tab: 'pagina' } },
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
    key: 'empregos',
    title: 'Empregos e vagas',
    hint: 'Vagas de empresas verificadas perto de você',
    icon: 'briefcase-outline',
    subs: [
      { label: 'Vagas perto de mim', hint: 'Todas as áreas', icon: 'location-outline', go: { tab: 'vagas', area: 'todas', seg: 'vagas' } },
      { label: 'Comércio', hint: 'Lojas e mercados', icon: 'storefront-outline', go: { tab: 'vagas', area: 'Comércio', seg: 'vagas' } },
      { label: 'Alimentação', hint: 'Restaurantes e lanchonetes', icon: 'restaurant-outline', go: { tab: 'vagas', area: 'Alimentação', seg: 'vagas' } },
      { label: 'Serviços e logística', hint: 'Entregas, motoristas e mais', icon: 'cube-outline', go: { tab: 'vagas', area: 'Logística', seg: 'vagas' } },
      { label: 'Minhas candidaturas', hint: 'Acompanhe as vagas que você se candidatou', icon: 'document-text-outline', go: { tab: 'vagas', seg: 'minhas' } },
      { label: 'Anunciar vaga (RH)', hint: 'Área empresarial › RH', icon: 'megaphone-outline', go: { tab: 'rh' } },
    ],
  },
  {
    key: 'social',
    title: 'Comunidade e lives',
    hint: 'Posts, mensagens, vídeo e lives',
    icon: 'people-outline',
    subs: [
      { label: 'Comunidade', hint: 'Posts de pessoas reais', icon: 'chatbox-ellipses-outline', go: { tab: 'stories', seg: 'posts' } },
      { label: 'Mensagens', hint: 'Conversas e chamadas de vídeo', icon: 'mail-outline', go: { tab: 'stories', seg: 'msgs' } },
      { label: 'Contatos', hint: 'Sua lista de contatos', icon: 'person-add-outline', go: { tab: 'stories', seg: 'contatos' } },
      { label: 'Lives', hint: 'Assista ou abra a sua', icon: 'radio-outline', go: { tab: 'home', top: 'lives' } },
      { label: 'Stories', hint: 'O dia a dia de quem está no Realys', icon: 'aperture-outline', go: { tab: 'stories' } },
      { label: 'Date', hint: 'Relacionamentos com quem passa perto', icon: 'heart-outline', go: { tab: 'encontros' } },
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
      { label: 'RH e vagas', hint: 'Anunciar vagas e ver candidatos', icon: 'people-outline', go: { tab: 'rh' } },
      { label: 'Página da empresa', hint: 'Perfil público, músicas e vídeos', icon: 'albums-outline', go: { tab: 'pagina' } },
    ],
  },
];

const ROLE_ICON = { cliente: 'person-outline', empresa: 'storefront-outline', prestador: 'construct-outline', fornecedor: 'cube-outline', admin: 'shield-checkmark-outline' };

export default function CategoryMenu({ visible, onClose, onPick, roles = [], activeRole, onRole }) {
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
              {/* Cabeçalho do menu: escolher como usar o app (Usuário, Empresa, Prestador…). */}
              <View style={styles.head}>
                <Text style={styles.kicker}>ACESSAR COMO</Text>
                <TouchableOpacity onPress={onClose} style={styles.iconBtn} accessibilityLabel="Fechar">
                  <Ionicons name="close" size={18} color={colors.text} />
                </TouchableOpacity>
              </View>
              <View style={styles.roles}>
                {roles.map((r) => {
                  const on = r === activeRole;
                  return (
                    <TouchableOpacity key={r} onPress={() => onRole && onRole(r)} style={[styles.role, on && styles.roleOn]} accessibilityLabel={`Usar como ${ROLE_LABELS[r]}`}>
                      <Ionicons name={ROLE_ICON[r] || 'person-outline'} size={15} color={on ? colors.onPrimary : colors.primary} />
                      <Text style={[styles.roleTxt, on && { color: colors.onPrimary }]}>{ROLE_LABELS[r]}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={[styles.head, { marginTop: 4 }]}>
                <Text style={styles.kicker}>EXPLORAR REALYS</Text>
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
  roles: { flexDirection: 'row', flexWrap: 'wrap', paddingBottom: 10, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  role: { flexDirection: 'row', alignItems: 'center', height: 34, paddingHorizontal: 12, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(168,121,10,0.45)', backgroundColor: 'rgba(168,121,10,0.08)', marginRight: 6, marginBottom: 6 },
  roleOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleTxt: { color: colors.primary, fontWeight: '800', fontSize: 12, marginLeft: 5 },
  backdrop: { flex: 1, backgroundColor: 'rgba(31,42,68,0.35)', alignItems: 'flex-end', paddingTop: 90, paddingHorizontal: 12 },
  panel: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(168,121,10,0.3)',
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
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: 'rgba(168,121,10,0.1)',
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
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  tileTitle: { color: colors.text, fontWeight: '700', fontSize: 13, marginTop: 6 },
  tileHint: { color: colors.muted, fontSize: 11, marginTop: 2 },
});
