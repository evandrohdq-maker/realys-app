// Demonstração das novidades, dentro do aplicativo. Simulações: nada é enviado ao servidor.
import React, { useState } from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import PrestacaoScreen from './prestador/PrestacaoScreen';
import BiometriaScreen from './BiometriaScreen';
import ScanFacial from '../components/ScanFacial';
import TermoAdesaoModal from '../components/TermoAdesaoModal';
import LotusCartao from '../components/LotusCartao';
import { TERMO_EMPRESA } from '../termoAdesao';

const ITENS = [
  { k: 'prestacao', t: 'Prestação de serviço', d: 'Cadastro do prestador (MEI, CNPJ, CNH e EAR), empresa com funcionários, mandados com prazo de 24 h e exemplos fictícios.' },
  { k: 'termo_empresa', t: 'Termo da empresa prestadora', d: 'Responsabilidade da empresa pelos colaboradores e pelos atendimentos.' },
  { k: 'termo_adesao', t: 'Termo de adesão (versão 2)', d: 'Termo do aplicativo, com prazos de guarda, suporte, LGPD e disputas.' },
  { k: 'scan', t: 'Scan facial', d: 'Captura de 2 vídeos de 3 segundos e 2 fotos, com círculo de centralização.' },
  { k: 'biometria', t: 'Biometria facial', d: 'Cadastro e documento: legibilidade e reflexo da foto do documento.' },
  { k: 'cartao', t: 'Lotus: confirmação com botões', d: 'Finalizar serviço ou mexer em dinheiro só com toque em Confirmar, Recusar ou Depois.' },
];

const COMANDOS = [
  'abre meu carrinho',
  'quero ver meus pedidos',
  'me leva pras lives de tecnologia',
  'abre o cadastro de prestador',
  'quero fazer minha biometria',
  'finaliza com o código QR-… (abre o cartão)',
  'manda no chat: já estou chegando (pede sim ou não)',
  'volta',
];

export default function DemoScreen({ visible, onClose }) {
  const [aberto, setAberto] = useState(null);
  const demoCartao = {
    titulo: 'Finalizar serviço (exemplo)',
    texto: 'Ana Souza: encanador, valor R$ 120. Repasse após a taxa de 10%: R$ 108,00.',
    aviso: 'Só finalize depois que o serviço estiver concluído. Depois disso, faça a biometria dentro de 24 horas para receber.',
  };
  return (
    <Modal visible={!!visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.wrap}>
        <View style={styles.top}>
          <Text style={styles.title}>Demonstração do Realys</Text>
          <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityLabel="Fechar demonstração"><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
          <Text style={styles.aviso}>Simulações no aplicativo. Nada é enviado ao servidor; a checagem real depende dele.</Text>
          {ITENS.map((i) => (
            <TouchableOpacity key={i.k} onPress={() => setAberto(i.k)} activeOpacity={0.85} style={styles.card}>
              <Text style={styles.nome}>{i.t} ›</Text>
              <Text style={styles.desc}>{i.d}</Text>
            </TouchableOpacity>
          ))}
          <View style={styles.card}>
            <Text style={styles.nome}>Comandos de voz da Lotus (exemplos)</Text>
            {COMANDOS.map((c) => (
              <Text key={c} style={styles.desc}>• {c}</Text>
            ))}
          </View>
        </ScrollView>

        <Modal visible={aberto === 'prestacao'} animationType="slide" onRequestClose={() => setAberto(null)}>
          <View style={{ flex: 1, backgroundColor: colors.bg }}>
            <PrestacaoScreen onClose={() => setAberto(null)} />
          </View>
        </Modal>
        <TermoAdesaoModal visible={aberto === 'termo_adesao'} onClose={() => setAberto(null)} />
        <TermoAdesaoModal visible={aberto === 'termo_empresa'} onClose={() => setAberto(null)} termo={TERMO_EMPRESA} />
        <BiometriaScreen visible={aberto === 'biometria'} onClose={() => setAberto(null)} />
        <ScanFacial visible={aberto === 'scan'} title="Scan facial (simulação)" onFrames={() => setAberto(null)} onClose={() => setAberto(null)} />
        <LotusCartao cartao={aberto === 'cartao' ? { ...demoCartao, confirmar: () => {} } : null} onClose={() => setAberto(null)} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 56, paddingBottom: 12 },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  aviso: { color: colors.muted, fontSize: 12, marginBottom: 12, lineHeight: 17 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 14, marginBottom: 10 },
  nome: { color: colors.text, fontWeight: '700', fontSize: 15 },
  desc: { color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 17 },
});
