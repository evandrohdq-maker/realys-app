import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Easing, Alert, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, soft } from '../theme';
import { Photo } from './ui';

// Acompanhar a entrega ao vivo: o motoboy, o entregador, o motorista ou o prestador aparece se
// movendo no mapa até você, com o tempo que falta para chegar. Quem presta serviço fica com o GPS
// ligado enquanto trabalha; aqui a posição é simulada (na versão final vem do GPS do celular dele).
//
// Props: visible, onClose, who { name, photo, vehicle, plate, rating }, kind ('motoboy' | 'motorista' |
// 'entregador' | 'prestador'), from (de onde sai), to (para onde vai), etaMin, trackId, onArrived.

const NIGHT = '#0B1124';
const GOLD = '#E2B649';
const KIND = {
  motoboy: { icon: 'bicycle', label: 'Motoboy', verb: 'está levando o seu pedido' },
  entregador: { icon: 'cube', label: 'Entregador', verb: 'está levando a sua compra' },
  motorista: { icon: 'car-sport', label: 'Motorista', verb: 'está indo até você' },
  prestador: { icon: 'construct', label: 'Prestador', verb: 'está a caminho do seu endereço' },
};
// Caminho no mapa (de 0 a 1): sai da loja (canto de cima) e chega na sua casa (canto de baixo).
const ROUTE = [
  [0.14, 0.16],
  [0.14, 0.42],
  [0.46, 0.42],
  [0.46, 0.66],
  [0.8, 0.66],
  [0.8, 0.84],
];
const segLen = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const TOTAL = ROUTE.slice(1).reduce((s, p, i) => s + segLen(ROUTE[i], p), 0);
function pointAt(t) {
  let d = Math.max(0, Math.min(1, t)) * TOTAL;
  for (let i = 1; i < ROUTE.length; i++) {
    const l = segLen(ROUTE[i - 1], ROUTE[i]);
    if (d <= l) {
      const k = l ? d / l : 0;
      return [ROUTE[i - 1][0] + (ROUTE[i][0] - ROUTE[i - 1][0]) * k, ROUTE[i - 1][1] + (ROUTE[i][1] - ROUTE[i - 1][1]) * k];
    }
    d -= l;
  }
  return ROUTE[ROUTE.length - 1];
}
// Na demonstração a viagem inteira leva uns 2 minutos (o tempo mostrado é o real estimado).
const DEMO_MS = 120000;
const started = {}; // trackId → início do acompanhamento (continua de onde estava ao reabrir)

export default function DeliveryTracker({ visible, onClose, who = {}, kind = 'motoboy', from = 'Loja', to = 'Seu endereço', etaMin = 15, trackId = 'x', onArrived }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [now, setNow] = useState(Date.now());
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    if (!started[trackId]) started[trackId] = Date.now();
    const id = setInterval(() => setNow(Date.now()), 500);
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => {
      clearInterval(id);
      loop.stop();
    };
  }, [visible, trackId]);
  if (!visible) return null;
  const k = KIND[kind] || KIND.motoboy;
  const t = Math.min(1, (now - (started[trackId] || now)) / DEMO_MS);
  const arrived = t >= 1;
  const left = Math.max(arrived ? 0 : 1, Math.ceil(etaMin * (1 - t)));
  const W = width - 32;
  const H = 300;
  const [px, py] = pointAt(t);
  const dot = (x, y) => ({ left: x * W, top: y * H });
  // linha do trajeto: pontinhos ao longo do caminho (dourado = falta, cinza = já passou)
  const dots = [...Array(46)].map((_, i) => {
    const s = i / 45;
    const [x, y] = pointAt(s);
    return { x, y, done: s <= t };
  });

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 8 }}>
        <View style={styles.head}>
          <TouchableOpacity onPress={onClose} style={styles.back} accessibilityLabel="Voltar">
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.title}>Acompanhar {kind === 'motorista' ? 'corrida' : kind === 'prestador' ? 'prestador' : 'entrega'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.liveDot} />
              <Text style={styles.live}>GPS ao vivo</Text>
            </View>
          </View>
        </View>

        <View style={[styles.map, { width: W, height: H }]}>
          {[0.28, 0.54, 0.76].map((y) => (
            <View key={'h' + y} style={[styles.street, { top: y * H, left: 0, right: 0, height: 9 }]} />
          ))}
          {[0.3, 0.62, 0.9].map((x) => (
            <View key={'v' + x} style={[styles.street, { left: x * W, top: 0, bottom: 0, width: 9 }]} />
          ))}
          <View style={[styles.park, { left: W * 0.55, top: H * 0.08, width: 90, height: 60 }]} />
          <View style={[styles.park, { left: W * 0.04, top: H * 0.6, width: 70, height: 70 }]} />
          {dots.map((d, i) => (
            <View key={i} style={[styles.routeDot, dot(d.x, d.y), { backgroundColor: d.done ? '#C8CCD6' : GOLD }]} />
          ))}
          {/* De onde sai e para onde vai */}
          <View style={[styles.pin, dot(ROUTE[0][0], ROUTE[0][1])]}>
            <Ionicons name="storefront" size={14} color="#fff" />
          </View>
          <View style={[styles.pin, styles.pinHome, dot(ROUTE[ROUTE.length - 1][0], ROUTE[ROUTE.length - 1][1])]}>
            <Ionicons name="home" size={14} color={NIGHT} />
          </View>
          {/* Quem está levando, se movendo */}
          <View style={[styles.mover, dot(px, py)]}>
            <Animated.View
              style={[
                styles.moverPulse,
                { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }] },
              ]}
            />
            <View style={styles.moverIcon}>
              <Ionicons name={k.icon} size={17} color={colors.primary} />
            </View>
          </View>
        </View>

        <View style={styles.eta}>
          {arrived ? (
            <>
              <Text style={styles.etaBig}>Chegou! 🎉</Text>
              <Text style={styles.etaSub}>{who.name || k.label} está no seu endereço</Text>
            </>
          ) : (
            <>
              <Text style={styles.etaBig}>
                {left} min
              </Text>
              <Text style={styles.etaSub}>
                {who.name || k.label} {k.verb}
              </Text>
            </>
          )}
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${Math.round(t * 100)}%` }]} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={styles.small} numberOfLines={1}>
              {from}
            </Text>
            <Text style={styles.small} numberOfLines={1}>
              {to}
            </Text>
          </View>
        </View>

        <View style={styles.who}>
          <Photo uri={who.photo} style={styles.whoPhoto} fallback="🛵" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ color: colors.text, fontWeight: '800' }}>
              {who.name || k.label}
              {who.rating ? <Text style={{ color: colors.accent }}> · ★ {String(who.rating).replace('.', ',')}</Text> : null}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              {k.label}
              {who.vehicle ? ` · ${who.vehicle}` : ''}
              {who.plate ? ` · ${who.plate}` : ''}
            </Text>
          </View>
          <TouchableOpacity style={styles.round} onPress={() => Alert.alert('Ligação pelo Re@lys', `Ligando para ${who.name || k.label}. O número dos dois fica protegido.`)} accessibilityLabel="Ligar">
            <Ionicons name="call" size={17} color={NIGHT} />
          </TouchableOpacity>
        </View>

        {arrived && onArrived ? (
          <TouchableOpacity style={styles.confirm} onPress={onArrived} activeOpacity={0.85}>
            <Ionicons name="checkmark-circle" size={18} color={NIGHT} />
            <Text style={styles.confirmText}>{kind === 'motorista' || kind === 'prestador' ? 'Confirmar que chegou' : 'Confirmar que recebi'}</Text>
          </TouchableOpacity>
        ) : null}
        <Text style={styles.note}>
          Quem presta serviço no Re@lys fica com o GPS ligado enquanto trabalha. Na demonstração o caminho é simulado.
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontWeight: '800', fontSize: 17 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E', marginRight: 5 },
  live: { color: '#16A34A', fontWeight: '800', fontSize: 11 },
  map: { alignSelf: 'center', backgroundColor: '#EEF1E8', borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: '#DDE3D3' },
  street: { position: 'absolute', backgroundColor: '#fff' },
  park: { position: 'absolute', backgroundColor: '#CDE8C4', borderRadius: 28 },
  routeDot: { position: 'absolute', width: 6, height: 6, borderRadius: 3, marginLeft: -3, marginTop: -3 },
  pin: { position: 'absolute', width: 28, height: 28, borderRadius: 14, marginLeft: -14, marginTop: -14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  pinHome: { backgroundColor: GOLD },
  mover: { position: 'absolute', width: 36, height: 36, marginLeft: -18, marginTop: -18, alignItems: 'center', justifyContent: 'center' },
  moverPulse: { position: 'absolute', width: 36, height: 36, borderRadius: 18, backgroundColor: GOLD },
  moverIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.primary },
  eta: { marginHorizontal: 16, marginTop: 12, backgroundColor: colors.card, borderRadius: 18, padding: 14, ...soft },
  etaBig: { color: colors.primary, fontWeight: '900', fontSize: 26 },
  etaSub: { color: colors.text, fontSize: 13, marginTop: 2 },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.cardAlt, marginTop: 10, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: GOLD },
  small: { color: colors.muted, fontSize: 10.5, maxWidth: '48%' },
  who: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 10, backgroundColor: colors.card, borderRadius: 16, padding: 10, ...soft },
  whoPhoto: { width: 46, height: 46, borderRadius: 23 },
  round: { width: 42, height: 42, borderRadius: 21, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center' },
  confirm: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, marginTop: 10, backgroundColor: GOLD, borderRadius: 16, paddingVertical: 13 },
  confirmText: { color: NIGHT, fontWeight: '900', marginLeft: 6 },
  note: { color: colors.muted, fontSize: 10.5, textAlign: 'center', marginHorizontal: 24, marginTop: 10 },
});
