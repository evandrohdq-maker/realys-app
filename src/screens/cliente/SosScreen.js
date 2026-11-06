import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Share, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, brl, soft } from '../../theme';
import { Screen, Title, Card, Row, Photo, Badge, Chip } from '../../components/ui';
import { emergencyNumbers, SOS_SEGMENTS, hospitals, specialists, SPECIALTIES, responders, MY_SPOT } from '../../extraData';
import { hasCallPermission, askCallPermission, confirmCall, demoCall, openRoute } from '../../phone';

const km = (v) => v.toFixed(1).replace('.', ',') + ' km';

// Socorro e saúde: emergência, hospitais mais próximos, especialistas médicos e ambulâncias.
export default function SosScreen({ explore }) {
  const [seg, setSeg] = useState('emergencia');
  const [spec, setSpec] = useState('Todos');
  const [canCall, setCanCall] = useState(false);

  useEffect(() => {
    if (explore && explore.seg && SOS_SEGMENTS.some((s) => s.key === explore.seg)) setSeg(explore.seg);
    if (explore && explore.specialty) setSpec(explore.specialty);
  }, [explore]);

  // Confere a permissão ao abrir e quando o cliente volta das configurações do Android.
  useEffect(() => {
    hasCallPermission().then(setCanCall);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && hasCallPermission().then(setCanCall));
    return () => sub.remove();
  }, []);

  const allow = async () => {
    const ok = await askCallPermission();
    setCanCall(ok);
    if (!ok) Alert.alert('Sem permissão', 'Tudo bem: quando você tocar em ligar, o Realys abre o discador com o número pronto.');
  };

  const shareLocation = () =>
    Share.share({ message: `🚨 Preciso de ajuda. Minha localização agora (GPS Realys): ${MY_SPOT}` }).catch(() => {});

  const docs = specialists.filter((d) => spec === 'Todos' || d.specialty === spec).sort((a, b) => a.distanceKm - b.distanceKm);

  return (
    <Screen>
      <Title sub="Emergência, hospitais mais próximos, médicos e ambulâncias">Socorro e saúde</Title>

      {!canCall ? (
        <Card style={styles.permCard}>
          <Row>
            <Ionicons name="call" size={20} color={colors.danger} />
            <Text style={styles.permTitle}>Ligar direto pelo Realys</Text>
          </Row>
          <Text style={styles.permText}>
            Permita ligações para pedir socorro com um toque. A ligação sai do seu próprio celular.
          </Text>
          <TouchableOpacity style={styles.permBtn} onPress={allow}>
            <Text style={styles.permBtnText}>Permitir ligações</Text>
          </TouchableOpacity>
        </Card>
      ) : (
        <View style={styles.okPill}>
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
          <Text style={styles.okText}>Ligações liberadas: o Realys liga direto</Text>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14, marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {SOS_SEGMENTS.map((s) => {
          const on = s.key === seg;
          return (
            <TouchableOpacity key={s.key} onPress={() => setSeg(s.key)} style={[styles.seg, on && styles.segOn]}>
              <Ionicons name={s.icon} size={16} color={on ? '#FFFFFF' : colors.danger} />
              <Text style={[styles.segText, on && { color: '#FFFFFF' }]}>{s.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {seg === 'emergencia' ? (
        <>
          <TouchableOpacity style={styles.sosBig} activeOpacity={0.85} onPress={() => confirmCall('o SAMU', '192')} accessibilityLabel="Ligar para o SAMU 192">
            <Ionicons name="medkit" size={34} color="#FFFFFF" />
            <View style={{ marginLeft: 14, flex: 1 }}>
              <Text style={styles.sosBigTitle}>SOS · SAMU 192</Text>
              <Text style={styles.sosBigHint}>Problema de saúde grave? Toque para ligar agora</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.grid}>
            {emergencyNumbers.filter((e) => e.key !== 'samu').map((e) => (
              <TouchableOpacity key={e.key} style={styles.emTile} onPress={() => confirmCall(e.label, e.number)} activeOpacity={0.85}>
                <View style={[styles.emIcon, { backgroundColor: e.color }]}>
                  <Ionicons name={e.icon} size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.emNum}>{e.number}</Text>
                <Text style={styles.emLabel}>{e.label}</Text>
                <Text style={styles.emHint}>{e.hint}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Card>
            <Row>
              <Ionicons name="location" size={18} color={colors.accent} />
              <Text style={{ fontWeight: '700', color: colors.text, marginLeft: 6, flex: 1 }}>Sua localização pelo GPS</Text>
            </Row>
            <Text style={{ color: colors.muted, marginTop: 4 }}>{MY_SPOT}</Text>
            <TouchableOpacity style={styles.shareBtn} onPress={shareLocation}>
              <Ionicons name="share-social-outline" size={16} color={colors.accent} />
              <Text style={{ color: colors.accent, fontWeight: '700', marginLeft: 6 }}>Enviar minha localização para alguém</Text>
            </TouchableOpacity>
          </Card>
          <Text style={styles.note}>Em risco de vida, ligue primeiro para o 192 (SAMU) ou 193 (Bombeiros). As ligações de emergência são gratuitas.</Text>
        </>
      ) : null}

      {seg === 'hospitais' ? (
        <>
          <Text style={styles.gpsLine}>📍 Mais próximos de você pelo GPS</Text>
          {[...hospitals].sort((a, b) => a.distanceKm - b.distanceKm).map((h) => (
            <Card key={h.id}>
              <Row>
                <Photo uri={h.photo} style={styles.hPhoto} fallback="🏥" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.name}>{h.name}</Text>
                  <Text style={styles.sub}>{h.type} · {h.network}</Text>
                  <Text style={styles.sub}>
                    {km(h.distanceKm)}
                    {h.waitMin != null ? ` · espera ~${h.waitMin} min` : ''}
                  </Text>
                </View>
              </Row>
              <Row style={{ marginTop: 8 }}>
                {h.open24 ? <Badge label="Aberto 24h" color={colors.success} /> : <Badge label="Horário comercial" color={colors.muted} />}
              </Row>
              <Row style={{ marginTop: 10 }}>
                <Action icon="call" label="Ligar" color={colors.danger} onPress={() => demoCall(h.name, h.phone)} />
                <Action icon="navigate" label="Rota" color={colors.accent} onPress={() => openRoute(h.name.replace(' (demo)', '') + ' São Paulo')} />
              </Row>
            </Card>
          ))}
        </>
      ) : null}

      {seg === 'especialistas' ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {['Todos', ...SPECIALTIES].map((s) => (
              <Chip key={s} label={s} active={spec === s} onPress={() => setSpec(s)} />
            ))}
          </ScrollView>
          {docs.length === 0 ? <Text style={styles.note}>Nenhum especialista desta área perto de você ainda.</Text> : null}
          {docs.map((d) => (
            <Card key={d.id}>
              <Row>
                <Photo uri={d.photo} style={styles.avatar} fallback="🩺" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.name}>
                    {d.name} · <Text style={{ color: colors.accent }}>★ {d.rating.toFixed(1).replace('.', ',')}</Text>
                  </Text>
                  <Text style={styles.sub}>{d.specialty} · {d.reg}</Text>
                  <Text style={styles.sub}>{km(d.distanceKm)} · consulta {brl(d.price)} · próximo horário {d.next}</Text>
                </View>
              </Row>
              <Row style={{ marginTop: 8, flexWrap: 'wrap' }}>
                {d.tele ? <Badge label="Teleconsulta" color={colors.accent} /> : null}
                {d.home ? <View style={{ marginLeft: 6 }}><Badge label="Atende em casa" color={colors.success} /></View> : null}
              </Row>
              <Row style={{ marginTop: 10 }}>
                <Action
                  icon="calendar"
                  label="Agendar"
                  color={colors.primary}
                  onPress={() => Alert.alert('Consulta pedida', `${d.name} recebeu seu pedido para ${d.next}. A confirmação chega nos seus Pedidos.`)}
                />
                {d.tele ? (
                  <Action icon="videocam" label="Teleconsulta" color={colors.accent} onPress={() => Alert.alert('Teleconsulta', `Chamada de vídeo com ${d.name} pelo Realys (demonstração).`)} />
                ) : null}
                <Action icon="call" label="Ligar" color={colors.danger} onPress={() => demoCall(d.name, '(11) 0000-0200')} />
              </Row>
            </Card>
          ))}
        </>
      ) : null}

      {seg === 'socorristas' ? (
        <>
          <Text style={styles.gpsLine}>📍 Prestadores de emergência com GPS ligado perto de você</Text>
          <Card style={{ borderColor: colors.danger, borderWidth: 1.5 }}>
            <Row>
              <Ionicons name="medkit" size={20} color={colors.danger} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.name}>SAMU 192 · público e gratuito</Text>
                <Text style={styles.sub}>Ambulância para emergências médicas</Text>
              </View>
              <Action icon="call" label="192" color={colors.danger} onPress={() => confirmCall('o SAMU', '192')} />
            </Row>
          </Card>
          {responders.map((r) => (
            <Card key={r.id}>
              <Row>
                <View style={styles.rIcon}>
                  <Ionicons name={r.icon} size={20} color={colors.danger} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.name}>{r.name}</Text>
                  <Text style={styles.sub}>{r.kind}</Text>
                  <Text style={styles.sub}>
                    {km(r.distanceKm)} · chega em ~{r.etaMin} min · {r.price} · ★ {r.rating.toFixed(1).replace('.', ',')}
                  </Text>
                </View>
              </Row>
              <Row style={{ marginTop: 10 }}>
                <Action icon="call" label="Ligar" color={colors.danger} onPress={() => demoCall(r.name, r.phone)} />
                <Action
                  icon="navigate-circle"
                  label="Chamar"
                  color={colors.primary}
                  onPress={() => Alert.alert('Pedido enviado', `${r.name} recebeu sua localização pelo GPS e está a caminho (demonstração).`)}
                />
              </Row>
            </Card>
          ))}
          <Text style={styles.note}>Empresas de ambulância, enfermagem e socorro: cadastre-se como prestador e ligue o GPS para aparecer aqui.</Text>
        </>
      ) : null}
    </Screen>
  );
}

function Action({ icon, label, color, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.action, { borderColor: color }]} activeOpacity={0.8}>
      <Ionicons name={icon} size={15} color={color} />
      <Text style={[styles.actionText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  permCard: { borderColor: colors.danger, borderWidth: 1.5, backgroundColor: '#FFF5F5' },
  permTitle: { fontWeight: '700', color: colors.text, marginLeft: 8, fontSize: 15 },
  permText: { color: colors.muted, marginTop: 6, fontSize: 13 },
  permBtn: { marginTop: 10, backgroundColor: colors.danger, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  permBtnText: { color: '#FFFFFF', fontWeight: '700' },
  okPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: 'rgba(30,158,99,0.1)', marginBottom: 12 },
  okText: { color: colors.success, fontWeight: '700', fontSize: 12, marginLeft: 5 },
  seg: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 38, borderRadius: 19, borderWidth: 1, borderColor: 'rgba(217,83,79,0.4)', backgroundColor: '#FFFFFF', marginRight: 8 },
  segOn: { backgroundColor: colors.danger, borderColor: colors.danger },
  segText: { marginLeft: 6, fontWeight: '700', color: colors.danger, fontSize: 13 },
  sosBig: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.danger, borderRadius: 20, padding: 18, marginBottom: 12, elevation: 6, shadowColor: colors.danger, shadowOpacity: 0.4, shadowRadius: 12 },
  sosBigTitle: { color: '#FFFFFF', fontWeight: '800', fontSize: 20 },
  sosBigHint: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  emTile: { width: '48.5%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, marginBottom: 10, ...soft },
  emIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  emNum: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 6 },
  emLabel: { fontWeight: '700', color: colors.text },
  emHint: { color: colors.muted, fontSize: 11, marginTop: 2 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  note: { color: colors.muted, fontSize: 12, marginTop: 4, marginBottom: 16 },
  gpsLine: { color: colors.accent, fontWeight: '700', marginBottom: 10 },
  hPhoto: { width: 64, height: 64, borderRadius: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  name: { fontWeight: '700', color: colors.text },
  sub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  rIcon: { width: 44, height: 44, borderRadius: 13, backgroundColor: 'rgba(217,83,79,0.1)', alignItems: 'center', justifyContent: 'center' },
  action: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7, marginRight: 8 },
  actionText: { fontWeight: '700', marginLeft: 5, fontSize: 13 },
});
