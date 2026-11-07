import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Easing, Alert, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, soft } from '../../theme';
import { Photo } from '../../components/ui';
import { arrivalCode, ratingText } from '../../providerInfo';
import { useStore } from '../../store';

const STEPS = ['Aceito', 'A caminho', 'Chegou', 'Em serviço'];
const DEMO_SECONDS = 30; // na demonstração o trajeto inteiro leva 30 segundos

// Acompanhar o prestador pelo GPS até a casa do cliente.
export default function TrackingScreen({ call, visible, onClose, onOpenProfile }) {
  const { dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const W = Dimensions.get('window').width;
  const H = Math.round(Dimensions.get('window').height * 0.52);
  const progress = useRef(new Animated.Value(0)).current;
  const [frac, setFrac] = useState(0);
  const [started, setStarted] = useState(false);

  // Caminho (rua) do prestador até a casa, em pontos da tela.
  const path = [
    { x: W * 0.16, y: H * 0.82 },
    { x: W * 0.42, y: H * 0.68 },
    { x: W * 0.55, y: H * 0.45 },
    { x: W * 0.78, y: H * 0.26 },
  ];

  useEffect(() => {
    if (!visible || !call) return;
    progress.setValue(0);
    setFrac(0);
    setStarted(false);
    const id = progress.addListener(({ value }) => setFrac(value));
    Animated.timing(progress, {
      toValue: 1,
      duration: DEMO_SECONDS * 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
    return () => {
      progress.removeAllListeners();
      progress.stopAnimation();
    };
  }, [visible, call && call.id]);

  if (!call) return null;
  const p = call.provider;
  const first = p.name.split(' ')[0];
  const arrived = frac >= 0.999;
  const eta = Math.max(1, Math.ceil(call.eta * (1 - frac)));
  const stage = started ? 3 : arrived ? 2 : 1;

  const inputRange = [0, 1 / 3, 2 / 3, 1];
  const tx = progress.interpolate({ inputRange, outputRange: path.map((pt) => pt.x - 24) });
  const ty = progress.interpolate({ inputRange, outputRange: path.map((pt) => pt.y - 24) });

  // Pontinhos da rota
  const dots = [];
  for (let s = 0; s < path.length - 1; s++) {
    for (let i = 0; i < 8; i++) {
      const t = i / 8;
      dots.push({ x: path[s].x + (path[s + 1].x - path[s].x) * t, y: path[s].y + (path[s + 1].y - path[s].y) * t });
    }
  }

  const cancel = () =>
    Alert.alert('Cancelar o pedido?', `${first} será avisado na hora.`, [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Cancelar pedido', style: 'destructive', onPress: onClose },
    ]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={[styles.map, { height: H }]}>
          {Array.from({ length: Math.ceil(W / 28) }).map((_, i) => (
            <View key={'v' + i} style={[styles.gridV, { left: i * 28 }]} />
          ))}
          {Array.from({ length: Math.ceil(H / 28) }).map((_, i) => (
            <View key={'h' + i} style={[styles.gridH, { top: i * 28 }]} />
          ))}
          <View style={[styles.road, { top: H * 0.58, transform: [{ rotate: '-10deg' }] }]} />
          <View style={[styles.road, { top: H * 0.3, height: 8, transform: [{ rotate: '6deg' }] }]} />
          <View style={[styles.roadV, { left: W * 0.6, height: H + 60, transform: [{ rotate: '12deg' }] }]} />

          {dots.map((d, i) => (
            <View key={i} style={[styles.routeDot, { left: d.x - 2, top: d.y - 2 }]} />
          ))}

          <View style={[styles.home, { left: path[3].x - 18, top: path[3].y - 18 }]}>
            <Ionicons name="home" size={18} color="#120A2E" />
          </View>

          <Animated.View style={[styles.mover, { transform: [{ translateX: tx }, { translateY: ty }] }]}>
            <Ionicons name={call.serviceKey === 'motorista' ? 'car-sport' : call.serviceKey === 'motoboy' ? 'bicycle' : 'navigate'} size={22} color={colors.onPrimary} />
          </Animated.View>

          <View style={[styles.topBar, { top: insets.top + 12 }]}>
            <TouchableOpacity style={styles.roundBtn} onPress={onClose} accessibilityLabel="Voltar">
              <Ionicons name="arrow-back" size={20} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.live}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>GPS ao vivo</Text>
            </View>
            <TouchableOpacity
              style={styles.roundBtn}
              accessibilityLabel="Compartilhar trajeto"
              onPress={() => Alert.alert('Trajeto compartilhado', 'Quem você escolher acompanha o trajeto em tempo real.')}
            >
              <Ionicons name="share-outline" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
          <View style={styles.handle} />
          <View style={styles.etaRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.small}>
                {started ? `${first} está trabalhando` : arrived ? `${first} chegou · confira o código` : `${first} está a caminho · chega em`}
              </Text>
              <Text style={styles.eta}>{started ? 'Em serviço' : arrived ? 'Na sua porta' : `~${eta} min`}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.codeLabel}>CÓDIGO DE CHEGADA</Text>
              <Text style={styles.code}>{arrivalCode(call.id)}</Text>
            </View>
          </View>

          <View style={styles.steps}>
            {STEPS.map((s, i) => (
              <View key={s} style={{ flex: 1, marginHorizontal: 3 }}>
                <View style={[styles.stepBar, i <= stage && styles.stepBarOn]} />
                <Text style={[styles.stepText, i <= stage && { color: colors.text }, i === stage && { fontWeight: '700' }]}>{s}</Text>
              </View>
            ))}
          </View>

          <View style={styles.provider}>
            <Photo uri={p.photo} style={styles.avatar} fallback="🧑" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.pName}>{p.name}</Text>
                <Ionicons name="shield-checkmark" size={14} color={colors.primary} style={{ marginLeft: 6 }} />
              </View>
              <Text style={styles.pMeta} numberOfLines={1}>
                <Text style={{ color: colors.accent, fontWeight: '700' }}>★ {ratingText(p.rating)}</Text> · {call.serviceLabel}
                {p.vehicle ? ` · ${p.vehicle}` : ''}
              </Text>
              {p.plate ? <Text style={styles.plate}>Placa {p.plate}</Text> : null}
              {call.forOther ? (
                <Text style={styles.pMeta} numberOfLines={2}>
                  👤 Para {call.forOther.name} · buscar em {call.from}
                  {call.to && call.to !== '-' ? ` → ${call.to}` : ''}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity style={styles.profileBtn} onPress={() => onOpenProfile(p)}>
              <Ionicons name="person-outline" size={15} color={colors.primary} />
              <Text style={styles.profileText}>Ver perfil</Text>
            </TouchableOpacity>
          </View>

          {arrived && !started ? (
            <TouchableOpacity style={[styles.mainBtn, { marginBottom: 10 }]} onPress={() => setStarted(true)}>
              <Text style={styles.mainText}>Código conferido · iniciar serviço</Text>
            </TouchableOpacity>
          ) : null}
          {started ? (
            <TouchableOpacity
              style={[styles.mainBtn, { marginBottom: 10 }]}
              onPress={() => {
                // Concluído: a avaliação abre sozinha.
                dispatch({ type: 'FINISH_CALL', id: call.id });
                onClose();
              }}
            >
              <Text style={styles.mainText}>Concluir e pagar pelo Realys</Text>
            </TouchableOpacity>
          ) : null}

          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity
              style={[styles.action, { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => Alert.alert(`Ligando para ${first}`, 'A ligação passa pela Realys: o seu número fica protegido.')}
            >
              <Ionicons name="call" size={16} color={colors.onPrimary} />
              <Text style={[styles.actionText, { color: colors.onPrimary }]}>Ligar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.action} onPress={() => Alert.alert('Mensagem', `Conversa com ${first} aberta no chat do Realys.`)}>
              <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.text} />
              <Text style={styles.actionText}>Mensagem</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.action, { borderColor: 'rgba(255,138,128,0.5)', marginRight: 0 }]} onPress={cancel}>
              <Text style={[styles.actionText, { color: colors.danger }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  map: { backgroundColor: '#FFFFFF', overflow: 'hidden' },
  gridV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(168,121,10,0.06)' },
  gridH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(168,121,10,0.06)' },
  road: { position: 'absolute', left: -40, right: -40, height: 12, backgroundColor: '#F5EFE2' },
  roadV: { position: 'absolute', top: -30, width: 12, backgroundColor: '#F5EFE2' },
  routeDot: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary },
  home: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#6C5CE7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C5CE7',
    shadowOpacity: 0.7,
    shadowRadius: 14,
    elevation: 8,
  },
  mover: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.9,
    shadowRadius: 16,
    elevation: 10,
  },
  topBar: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  live: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(168,121,10,0.4)',
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginRight: 8 },
  liveText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  sheet: {
    flex: 1,
    marginTop: -28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderColor: 'rgba(168,121,10,0.3)',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#F0E9DA', marginBottom: 12 },
  etaRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 14 },
  small: { color: colors.muted, fontSize: 12 },
  eta: { color: colors.text, fontSize: 30, fontWeight: '700', marginTop: 2 },
  codeLabel: { color: colors.muted, fontSize: 10, letterSpacing: 1 },
  code: { color: colors.primary, fontSize: 21, fontWeight: '700', letterSpacing: 4, marginTop: 2 },
  steps: { flexDirection: 'row', marginHorizontal: -3, marginBottom: 14 },
  stepBar: { height: 4, borderRadius: 2, backgroundColor: '#F5EFE2' },
  stepBarOn: { backgroundColor: colors.primary },
  stepText: { color: '#6E7891', fontSize: 11, marginTop: 6 },
  provider: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    ...soft,
  },
  avatar: { width: 50, height: 50, borderRadius: 16 },
  pName: { color: colors.text, fontWeight: '700', fontSize: 15 },
  pMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  plate: { color: colors.text, fontWeight: '700', fontSize: 12, letterSpacing: 1, marginTop: 2 },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(168,121,10,0.55)',
  },
  profileText: { color: colors.primary, fontWeight: '700', fontSize: 13, marginLeft: 6 },
  mainBtn: { height: 48, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  mainText: { color: colors.onPrimary, fontWeight: '700' },
  action: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F0E9DA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  actionText: { color: colors.text, fontWeight: '600', fontSize: 13, marginLeft: 6 },
});
