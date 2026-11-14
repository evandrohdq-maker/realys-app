// Aba Lives (topo da Community): classes e subclasses, com destaque e engajamento.
// - Todas: a live em destaque, o "Em alta", as classes para explorar e a agenda.
// - Uma classe (ex.: Gamers): cabeçalho com "Seguir", subclasses, missão do dia (pontos),
//   destaque, Em alta, agenda com "Lembrar", criadores em alta e produtos da loja ligados à classe.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../../store';
import { soft, colors, brl } from '../../../theme';
import { Screen, Photo } from '../../../components/ui';
import { upcomingLives } from '../../../homeData';
import { LIVE_CATS, catOf, subOf, liveScore, missionId, LIVE_MISSION_POINTS, LIVE_MISSION_SECS } from '../../../liveData';
import { HostChip, useOpenHost } from '../../../components/HostChip';
import { allLives } from '../../../components/LiveBits';
import { shopSectorItems } from '../../../shopSectorsData';
import { useRealLives } from '../../../components/LiveVideo';

const fmt = (n) => Math.round(n).toLocaleString('pt-BR');
const rank = (a, b) => (b.mine ? 1 : 0) - (a.mine ? 1 : 0) || (b.sponsored ? 1 : 0) - (a.sponsored ? 1 : 0) || liveScore(b) - liveScore(a);

export default function LivesTab({ filter, setFilter, onWatch, onGoLive, navigate }) {
  const { state, dispatch } = useStore();
  const openHost = useOpenHost();
  const f = filter === 'aulas' ? 'cursos' : filter;
  const [sub, setSub] = useState('todas');
  useEffect(() => setSub('todas'), [f]);

  const every = allLives(state);
  // Lives no ar de verdade (servidor do Re@lys), quando houver servidor.
  const real = useRealLives(true);
  const cat = f === 'todas' ? null : catOf(f);
  const inCat = cat ? every.filter((l) => l.cat === cat.key) : every;
  const list = inCat.filter((l) => sub === 'todas' || l.sub === sub).sort(rank);
  const hero = list[0];
  // Em alta: por engajamento (assistindo + presentes + curtidas), sem o patrocinado furar a fila.
  const hot = list.slice(1).sort((a, b) => liveScore(b) - liveScore(a)).slice(0, 3);
  const rest = list.slice(1).filter((l) => !hot.includes(l));
  const agenda = upcomingLives.filter((u) => (!cat || u.cat === cat.key) && (sub === 'todas' || u.sub === sub)).slice(0, cat ? 6 : 4);
  const watching = inCat.reduce((n, l) => n + (l.viewers || 0), 0);
  const follows = state.liveFollows || [];
  const reminders = state.liveReminders || {};

  return (
    <Screen>
      <TouchableOpacity style={styles.goLiveCard} onPress={onGoLive} activeOpacity={0.9}>
        <View style={styles.goLiveIcon}>
          <Ionicons name="radio" size={22} color="#fff" />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>Abrir minha live</Text>
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>Escolha a classe e a subclasse: quem segue recebe o aviso na hora</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </TouchableOpacity>

      {real.length ? (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15, marginBottom: 6 }}>🔴 Ao vivo agora no Re@lys</Text>
          {real.map((l) => (
            <TouchableOpacity key={l.id} onPress={() => onWatch(l)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 8 }}>
              <Ionicons name="radio" size={20} color="#FF3B5C" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>{l.title}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>{l.host} · {l.viewers} assistindo</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {/* Classes */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, marginBottom: 12 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {[{ key: 'todas', label: 'Todas', icon: 'radio-outline' }, ...LIVE_CATS].map((c) => {
          const on = c.key === f;
          const n = c.key === 'todas' ? 0 : every.filter((l) => l.cat === c.key).length;
          return (
            <TouchableOpacity key={c.key} style={[styles.chip, on && styles.chipOn]} onPress={() => setFilter(c.key)} accessibilityLabel={`Lives: ${c.label}`}>
              <Ionicons name={c.icon} size={15} color={on ? colors.onPrimary : colors.primary} />
              <Text style={[styles.chipText, on && { color: colors.onPrimary }]}>{c.label}</Text>
              {n ? <View style={[styles.chipDot, on && { backgroundColor: '#fff' }]} /> : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {cat ? (
        <>
          {/* Cabeçalho da classe */}
          <View style={[styles.classHead, { borderColor: cat.tint + '40', backgroundColor: cat.tint + '10' }]}>
            <View style={[styles.classIcon, { backgroundColor: cat.tint }]}>
              <Ionicons name={cat.icon.replace('-outline', '')} size={24} color="#fff" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.classTitle}>{cat.title}</Text>
              <Text style={styles.classHint}>{cat.hint}</Text>
              <Text style={[styles.classStats, { color: cat.tint }]}>
                {inCat.length ? `${inCat.length} ao vivo · ${fmt(watching)} assistindo` : 'Ninguém ao vivo agora'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.followBtn, follows.includes(cat.key) ? { backgroundColor: colors.card, borderColor: cat.tint } : { backgroundColor: cat.tint, borderColor: cat.tint }]}
              onPress={() => dispatch({ type: 'TOGGLE_LIVE_FOLLOW', cat: cat.key })}
              accessibilityLabel={follows.includes(cat.key) ? `Deixar de seguir ${cat.label}` : `Seguir ${cat.label}`}
            >
              <Ionicons name={follows.includes(cat.key) ? 'notifications' : 'add'} size={14} color={follows.includes(cat.key) ? cat.tint : '#fff'} />
              <Text style={{ color: follows.includes(cat.key) ? cat.tint : '#fff', fontWeight: '800', fontSize: 12, marginLeft: 3 }}>{follows.includes(cat.key) ? 'Seguindo' : 'Seguir'}</Text>
            </TouchableOpacity>
          </View>

          {/* Subclasses */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, marginBottom: 12 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {[{ key: 'todas', label: 'Tudo' }, ...cat.subs].map((s) => {
              const on = s.key === sub;
              const n = s.key === 'todas' ? 0 : inCat.filter((l) => l.sub === s.key).length;
              return (
                <TouchableOpacity key={s.key} style={[styles.subChip, on && { backgroundColor: cat.tint + '1A' }]} onPress={() => setSub(s.key)}>
                  <Text style={[styles.subText, on && { color: cat.tint, fontWeight: '800' }]}>{s.label}</Text>
                  {n ? <Text style={[styles.subCount, { color: cat.tint }]}> {n}</Text> : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Mission cat={cat} done={!!(state.adRewards || {})[missionId(cat.key)]} />
        </>
      ) : null}

      {hero ? (
        <>
          <SectionHead title={cat ? 'Em destaque' : 'Em destaque agora'} />
          <LiveCard l={hero} big onWatch={onWatch} openHost={openHost} />
        </>
      ) : (
        <View style={styles.empty}>
          <Ionicons name="radio-outline" size={30} color={colors.muted} />
          <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 6 }}>
            Ninguém ao vivo {sub !== 'todas' && cat ? `em ${subOf(cat.key, sub).label}` : 'aqui'} agora.
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={onGoLive}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>Abrir a primeira live</Text>
          </TouchableOpacity>
        </View>
      )}

      {hot.length ? (
        <>
          <SectionHead title="Em alta" right="assistindo + presentes" />
          {hot.map((l, i) => (
            <TouchableOpacity key={l.id} style={styles.hotRow} onPress={() => onWatch(l)} activeOpacity={0.85} accessibilityLabel={`Em alta ${i + 1}: ${l.title}`}>
              <Text style={[styles.hotRank, i === 0 && { color: colors.gold }]}>{i + 1}</Text>
              <Photo uri={l.photo} style={styles.hotPhoto} fallback="🎥" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.hotTitle} numberOfLines={2}>{l.title}</Text>
                <Text style={styles.hotMeta} numberOfLines={1}>
                  {l.host} · {(subOf(l.cat, l.sub) || catOf(l.cat)).label}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', marginLeft: 6 }}>
                <View style={styles.liveMini}><Text style={styles.liveMiniText}>AO VIVO</Text></View>
                <Text style={styles.hotViewers}>{fmt(l.viewers)}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </>
      ) : null}

      {!cat ? (
        <>
          <SectionHead title="Explorar classes" />
          <View style={styles.grid}>
            {LIVE_CATS.map((c) => {
              const n = every.filter((l) => l.cat === c.key).length;
              return (
                <TouchableOpacity key={c.key} style={styles.tile} onPress={() => setFilter(c.key)} activeOpacity={0.85} accessibilityLabel={c.label}>
                  <View style={[styles.tileIcon, { backgroundColor: c.tint + '1A' }]}>
                    <Ionicons name={c.icon} size={18} color={c.tint} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.tileTitle} numberOfLines={1}>{c.label}</Text>
                    <Text style={[styles.tileMeta, n ? { color: '#E5484D' } : null]} numberOfLines={1}>{n ? `${n} ao vivo` : c.hint}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      ) : null}

      {agenda.length ? (
        <>
          <SectionHead title="Vem aí" right="toque em Lembrar" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, marginBottom: 14 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {agenda.map((u) => {
              const on = !!reminders[u.id];
              return (
                <View key={u.id} style={styles.upCard}>
                  <Photo uri={u.photo} style={styles.upPhoto} fallback="📅" />
                  <View style={{ padding: 10 }}>
                    <Text style={styles.upWhen}>{u.when}</Text>
                    <Text style={styles.upTitle} numberOfLines={2}>{u.title}</Text>
                    <Text style={styles.hotMeta} numberOfLines={1}>{u.host}</Text>
                    {u.prize ? <Text style={styles.upPrize} numberOfLines={1}>🏆 {u.prize}</Text> : null}
                    <TouchableOpacity style={[styles.remindBtn, on && styles.remindOn]} onPress={() => dispatch({ type: 'TOGGLE_LIVE_REMIND', id: u.id })} accessibilityLabel={on ? 'Lembrete ativado' : 'Lembrar'}>
                      <Ionicons name={on ? 'notifications' : 'notifications-outline'} size={13} color={on ? '#fff' : colors.primary} />
                      <Text style={{ color: on ? '#fff' : colors.primary, fontWeight: '800', fontSize: 12, marginLeft: 4 }}>{on ? 'Vou lembrar' : 'Lembrar'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </>
      ) : null}

      {rest.length ? <SectionHead title="Ao vivo agora" /> : null}
      {rest.map((l) => (
        <LiveCard key={l.id} l={l} onWatch={onWatch} openHost={openHost} />
      ))}

      {cat ? <Creators lives={inCat} openHost={openHost} tint={cat.tint} /> : null}
      {cat && cat.shop ? <ShopStrip shop={cat.shop} navigate={navigate} /> : null}
    </Screen>
  );
}

// Missão do dia da classe: assistir 3 minutos dá pontos Re@lys.
function Mission({ cat, done }) {
  return (
    <View style={[styles.mission, done && { borderColor: colors.success + '55', backgroundColor: colors.success + '0D' }]}>
      <Ionicons name={done ? 'checkmark-circle' : 'flag-outline'} size={20} color={done ? colors.success : colors.primary} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.missionTitle}>{done ? 'Missão do dia concluída' : 'Missão do dia'}</Text>
        <Text style={styles.missionText}>
          {done ? `Você ganhou ${LIVE_MISSION_POINTS} pontos Re@lys. Volte amanhã!` : `Assista ${LIVE_MISSION_SECS / 60} min de lives de ${cat.label} e ganhe ${LIVE_MISSION_POINTS} pontos Re@lys`}
        </Text>
      </View>
      <Text style={[styles.missionPts, done && { color: colors.success }]}>+{LIVE_MISSION_POINTS}</Text>
    </View>
  );
}

function LiveCard({ l, big, onWatch, openHost }) {
  const sub = subOf(l.cat, l.sub);
  return (
    <TouchableOpacity style={styles.liveCard} onPress={() => onWatch(l)} activeOpacity={0.9}>
      <Photo uri={l.photo} style={[styles.livePhoto, big && { height: 210 }]} fallback="🎥" />
      <View style={styles.liveOverlay}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
          <View style={styles.liveTag}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>AO VIVO</Text>
          </View>
          <View style={styles.liveViewers}>
            <Ionicons name="eye" size={12} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', marginLeft: 4 }}>{fmt(l.viewers)}</Text>
          </View>
          {l.gifts ? (
            <View style={styles.liveViewers}>
              <Ionicons name="gift" size={11} color={colors.gold} />
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', marginLeft: 4 }}>{l.gifts}</Text>
            </View>
          ) : null}
          {l.sponsored ? (
            <View style={[styles.liveViewers, { backgroundColor: colors.sponsored }]}>
              <Text style={{ color: colors.onPrimary, fontSize: 10, fontWeight: '700' }}>PATROCINADO</Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={{ padding: 12 }}>
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: big ? 16 : 15 }}>{l.mine ? 'Você está ao vivo · ' : ''}{l.title}</Text>
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>
          {catOf(l.cat).label}{sub ? ` · ${sub.label}` : l.tag ? ` · ${l.tag}` : ''}{l.verifiedNews ? ' · canal verificado' : ''}
        </Text>
        <HostChip live={l} onOpen={openHost} />
      </View>
    </TouchableOpacity>
  );
}

// Criadores em alta da classe: quem mais engaja aparece primeiro; tocar abre o perfil.
function Creators({ lives, openHost, tint }) {
  const seen = {};
  const hosts = [...lives].sort((a, b) => liveScore(b) - liveScore(a)).filter((l) => (seen[l.host] ? false : (seen[l.host] = true))).slice(0, 8);
  if (hosts.length < 2) return null;
  return (
    <>
      <SectionHead title="Criadores em alta" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, marginBottom: 14 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {hosts.map((l, i) => (
          <TouchableOpacity key={l.id} style={styles.creator} onPress={() => openHost(l)} activeOpacity={0.85} accessibilityLabel={`Perfil de ${l.host}`}>
            <View style={[styles.creatorRing, { borderColor: i === 0 ? colors.gold : tint }]}>
              <Text style={[styles.creatorInitial, { color: tint }]}>{l.host.replace(/^(Profa?\.|Pra\.)\s*/, '').charAt(0)}</Text>
            </View>
            <Text style={styles.creatorName} numberOfLines={1}>{l.host}</Text>
            <Text style={styles.creatorMeta}>{fmt(l.viewers)} ao vivo</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </>
  );
}

// Produtos da loja ligados à classe (ex.: Gamers → Games). Tocar leva até o setor no Shop.
function ShopStrip({ shop, navigate }) {
  const items = shopSectorItems.filter((it) => it.sector === shop.sector && (!shop.groups.length || (it.groups || []).some((g) => shop.groups.includes(g)))).slice(0, 8);
  if (!items.length) return null;
  const go = () => navigate && navigate(shop.go);
  return (
    <>
      <SectionHead title={shop.label} right="ver no Shop" onRight={go} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, marginBottom: 14 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {items.map((it) => (
          <TouchableOpacity key={it.id} style={styles.prod} onPress={go} activeOpacity={0.85} accessibilityLabel={it.title}>
            <Photo uri={it.photo} style={styles.prodPhoto} fallback={it.icon} />
            {it.sponsored ? <Text style={styles.prodAd}>Patrocinado</Text> : null}
            <Text style={styles.prodTitle} numberOfLines={2}>{it.title}</Text>
            <Text style={styles.prodPrice}>{it.price ? brl(it.price) : 'Sob orçamento'}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </>
  );
}

function SectionHead({ title, right, onRight }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {right ? (
        <TouchableOpacity disabled={!onRight} onPress={onRight}>
          <Text style={{ color: onRight ? colors.primary : colors.muted, fontWeight: '600', fontSize: 12 }}>{right}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  goLiveCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,59,92,0.5)', padding: 12, marginBottom: 14 },
  goLiveIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#FF3B5C', alignItems: 'center', justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', height: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: colors.cardAlt, marginRight: 8 },
  chipOn: { backgroundColor: colors.primary },
  chipText: { color: colors.text, fontWeight: '600', fontSize: 12, marginLeft: 6 },
  chipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E5484D', marginLeft: 6 },
  classHead: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1, padding: 12, marginBottom: 10 },
  classIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  classTitle: { color: colors.text, fontWeight: '800', fontSize: 17 },
  classHint: { color: colors.muted, fontSize: 12, marginTop: 1 },
  classStats: { fontSize: 12, fontWeight: '800', marginTop: 4 },
  followBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7, marginLeft: 8 },
  subChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, marginRight: 4 },
  subText: { color: colors.muted, fontWeight: '600', fontSize: 13 },
  subCount: { fontSize: 12, fontWeight: '800' },
  mission: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLight, borderRadius: 16, borderWidth: 1, borderColor: colors.gold + '66', padding: 12, marginBottom: 14 },
  missionTitle: { color: colors.text, fontWeight: '800', fontSize: 13 },
  missionText: { color: colors.muted, fontSize: 12, marginTop: 1 },
  missionPts: { color: colors.primary, fontWeight: '900', fontSize: 16, marginLeft: 8 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 4 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  liveCard: { backgroundColor: colors.card, borderRadius: 20, overflow: 'hidden', marginBottom: 14, ...soft },
  livePhoto: { width: '100%', height: 170 },
  liveOverlay: { position: 'absolute', left: 10, top: 10, right: 10 },
  liveTag: { backgroundColor: '#FF3B5C', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  liveViewers: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(3,5,10,0.65)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 6 },
  hotRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 8, marginBottom: 8, ...soft },
  hotRank: { width: 24, textAlign: 'center', color: colors.muted, fontWeight: '900', fontSize: 20 },
  hotPhoto: { width: 64, height: 64, borderRadius: 12, marginLeft: 4 },
  hotTitle: { color: colors.text, fontWeight: '700', fontSize: 13 },
  hotMeta: { color: colors.muted, fontSize: 11, marginTop: 2 },
  hotViewers: { color: colors.text, fontWeight: '800', fontSize: 12, marginTop: 4 },
  liveMini: { backgroundColor: '#FF3B5C', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 },
  liveMiniText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8 },
  tile: { width: '48.5%', flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 10, marginBottom: 8, ...soft },
  tileIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  tileTitle: { color: colors.text, fontWeight: '700', fontSize: 13 },
  tileMeta: { color: colors.muted, fontSize: 11, marginTop: 1 },
  upCard: { width: 200, backgroundColor: colors.card, borderRadius: 18, overflow: 'hidden', marginRight: 10, marginBottom: 4, ...soft },
  upPhoto: { width: '100%', height: 96 },
  upWhen: { color: '#E5484D', fontWeight: '800', fontSize: 11 },
  upTitle: { color: colors.text, fontWeight: '700', fontSize: 13, marginTop: 2 },
  upPrize: { color: colors.primaryDark, fontSize: 11, fontWeight: '700', marginTop: 3 },
  remindBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: 12, borderWidth: 1, borderColor: colors.primary, paddingHorizontal: 9, paddingVertical: 5, marginTop: 8 },
  remindOn: { backgroundColor: colors.primary },
  creator: { width: 84, alignItems: 'center', marginRight: 8 },
  creatorRing: { width: 60, height: 60, borderRadius: 30, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  creatorInitial: { fontSize: 22, fontWeight: '900' },
  creatorName: { color: colors.text, fontSize: 11, fontWeight: '700', marginTop: 5, textAlign: 'center' },
  creatorMeta: { color: colors.muted, fontSize: 10 },
  prod: { width: 130, marginRight: 10 },
  prodPhoto: { width: 130, height: 96, borderRadius: 14 },
  prodAd: { color: colors.sponsored, fontSize: 10, fontWeight: '800', marginTop: 5 },
  prodTitle: { color: colors.text, fontSize: 12, fontWeight: '700', marginTop: 4 },
  prodPrice: { color: colors.primaryDark, fontSize: 13, fontWeight: '800', marginTop: 2 },
  empty: { alignItems: 'center', backgroundColor: colors.card, borderRadius: 20, padding: 18, marginBottom: 14, ...soft },
  emptyBtn: { backgroundColor: '#FF3B5C', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 9, marginTop: 10 },
});
