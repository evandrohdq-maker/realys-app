import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, Animated, Easing, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, brl, soft } from '../theme';
import { serviceType, priceText } from '../store';
import { Photo } from './ui';
import { reviewsCount, jobsDone, kmText, ratingText, sampleReviews, etaMin } from '../providerInfo';
import { isVisitService, visitFee } from '../serviceVisits';

// Prévia do perfil de TRABALHO do prestador, aberta ao tocar num resultado da Lotus
// ou da pesquisa. Só mostra dados: não tem mensagem, telefone nem orçamento.
// Na Lotus, o único contato é "Chamar pela Lotus" (passa pela plataforma e é taxado).
// Na pesquisa (sem onCall), é só para analisar: nenhum botão de contato.
export default function ProviderPreview({ provider: p, onClose, onCall }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!p) return;
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [p && p.id]);
  if (!p) return null;

  const type = serviceType(p.service) || { label: 'Prestador', ion: 'person-outline' };
  const byVisit = isVisitService(p.service);
  const review = sampleReviews(p)[0];
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={[styles.dim, !onCall && styles.dimFull]} onPress={onClose} accessibilityLabel="Fechar prévia" />
      <Animated.View style={[styles.card, { opacity: anim, transform: [{ translateY }] }]}>
        <View style={styles.headRow}>
          <Text style={styles.tag}>PRÉVIA DO PERFIL DE TRABALHO</Text>
          <TouchableOpacity onPress={onClose} style={styles.close} accessibilityLabel="Fechar prévia">
            <Ionicons name="close" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flexGrow: 0 }}>
          <View style={styles.top}>
            <Photo uri={p.photo} style={styles.avatar} fallback="🧑" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.name}>{p.name}</Text>
              <Text style={styles.role}>
                {type.label}
                {p.vehicle ? ` · ${p.vehicle}` : ''}
              </Text>
              <View style={styles.verified}>
                <Ionicons name="shield-checkmark" size={12} color={colors.primary} />
                <Text style={styles.verifiedTxt}>ID biométrico verificado</Text>
              </View>
            </View>
          </View>

          <View style={styles.stats}>
            <Stat value={`★ ${ratingText(p.rating)}`} label={`${reviewsCount(p)} avaliações`} color={colors.accent} />
            <Stat value={String(jobsDone(p))} label="serviços feitos" />
            <Stat value={kmText(p.distanceKm)} label={`~${etaMin(p)} min`} />
          </View>

          <Text style={styles.section}>O que faz</Text>
          <View style={styles.funcs}>
            {p.functions.map((f) => (
              <View key={f} style={styles.func}>
                <Ionicons name={type.ion || 'flash-outline'} size={12} color={colors.primary} />
                <Text style={styles.funcTxt}>{f}</Text>
              </View>
            ))}
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Valor cobrado</Text>
            <Text style={styles.price}>{priceText(p)}</Text>
          </View>
          {byVisit ? (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Taxa de visita</Text>
              <Text style={styles.price}>{brl(visitFee(p))}</Text>
            </View>
          ) : null}

          <Text style={styles.section}>Trabalhos</Text>
          <View style={styles.photos}>
            {[0, 1, 2].map((i) => (
              <Photo key={i} uri={`https://picsum.photos/seed/${p.id}-${i}/300/300`} style={styles.photo} fallback="🛠️" />
            ))}
          </View>

          {review ? (
            <View style={styles.review}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 12 }}>{review.who}</Text>
                <Text style={{ color: colors.accent, fontSize: 12 }}>{'★'.repeat(review.stars) + '☆'.repeat(5 - review.stars)}</Text>
              </View>
              <Text style={styles.reviewTxt}>{review.text}</Text>
            </View>
          ) : null}

          <View style={styles.notice}>
            <Ionicons name="lock-closed-outline" size={12} color={colors.muted} />
            <Text style={styles.noticeTxt}>
              {onCall ? 'O contato com o prestador é feito pela Lotus, dentro do Realys.' : 'Prévia só para analisar. Para contratar, volte à lista ou peça pela Lotus.'}
            </Text>
          </View>
        </ScrollView>

        {onCall ? (
          <TouchableOpacity style={styles.callBtn} onPress={() => onCall(p)} accessibilityLabel={`Chamar ${p.name} pela Lotus`}>
            <Ionicons name="sparkles" size={15} color={colors.onPrimary} />
            <Text style={styles.callTxt}>Chamar {p.name.split(' ')[0]} pela Lotus</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.backBtn} onPress={onClose} accessibilityLabel="Voltar aos resultados">
            <Ionicons name="arrow-back" size={15} color={colors.text} />
            <Text style={styles.backTxt}>Voltar aos resultados</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

// Versão para usar fora da Lotus (pesquisa, lista de serviços): abre por cima da tela,
// e o botão voltar do celular fecha só a prévia.
export function ProviderPreviewModal({ provider, onClose }) {
  return (
    <Modal visible={!!provider} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <ProviderPreview provider={provider} onClose={onClose} />
    </Modal>
  );
}

function Stat({ value, label, color = colors.text }) {
  return (
    <View style={styles.stat}>
      <Text style={{ color, fontSize: 15, fontWeight: '700' }}>{value}</Text>
      <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 10, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(16,22,40,0.28)', borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  dimFull: { borderTopLeftRadius: 0, borderTopRightRadius: 0, backgroundColor: 'rgba(16,22,40,0.4)' },
  card: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    maxHeight: '86%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(226,182,73,0.45)',
    ...soft,
    elevation: 30,
  },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  tag: { color: colors.accent, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  close: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  top: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  name: { color: colors.text, fontSize: 17, fontWeight: '800' },
  role: { color: colors.muted, fontSize: 12, marginTop: 2 },
  verified: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  verifiedTxt: { color: colors.primary, fontSize: 11, fontWeight: '600', marginLeft: 4 },
  stats: { flexDirection: 'row', marginTop: 14 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 8, marginHorizontal: 3, borderRadius: 14, backgroundColor: colors.bg },
  section: { color: colors.text, fontWeight: '700', fontSize: 13, marginTop: 14, marginBottom: 6 },
  funcs: { flexDirection: 'row', flexWrap: 'wrap' },
  func: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: 'rgba(168,121,10,0.08)', marginRight: 6, marginBottom: 6 },
  funcTxt: { color: colors.text, fontSize: 12, marginLeft: 4 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  priceLabel: { color: colors.muted, fontSize: 12 },
  price: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  photos: { flexDirection: 'row' },
  photo: { flex: 1, aspectRatio: 1, borderRadius: 12, marginRight: 6, overflow: 'hidden' },
  review: { marginTop: 12, padding: 10, borderRadius: 14, backgroundColor: colors.bg },
  reviewTxt: { color: colors.text, fontSize: 12, marginTop: 4, lineHeight: 17 },
  notice: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  noticeTxt: { color: colors.muted, fontSize: 11, marginLeft: 5, flex: 1 },
  callBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 12 },
  callTxt: { color: colors.onPrimary, fontWeight: '700', marginLeft: 6 },
  backBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, backgroundColor: colors.bg, borderRadius: 16, paddingVertical: 12 },
  backTxt: { color: colors.text, fontWeight: '700', marginLeft: 6 },
});
