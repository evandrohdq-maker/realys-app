import PostActions from '../../components/PostActions';
import FollowedStores from '../../components/FollowedStores';
import { addOrChoose, openProduct } from '../../components/ProductSheet';
import React, { useState } from 'react';
import FeedVideo from '../../components/FeedVideo';
import PeopleSuggestions from '../../components/PeopleSuggestions';
import ReelsStrip from '../../components/ReelsStrip';
import { PeopleSearchModal } from '../../components/People';
import { COMMUNITY_CLIPS, SHOP_CLIPS, FOOD_CLIPS } from '../../adsData';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '../../responsive';
import { useStore } from '../../store';
import { colors, brl, soft } from '../../theme';
import { Screen, Photo, Badge, Row, Button } from '../../components/ui';
import { memberByName } from '../../people';

export default function FeedScreen({ goTo, navigate }) {
  const { state, dispatch } = useStore();
  const [people, setPeople] = useState(false);
  // De vez em quando, no meio dos posts: sugestões de amizade e uma faixa de Reels (como no Instagram).
  const reels = [...COMMUNITY_CLIPS, ...SHOP_CLIPS, ...FOOD_CLIPS];
  const extra = (i) =>
    i === 0 ? <PeopleSuggestions onSeeAll={() => setPeople(true)} /> : i === 2 ? <ReelsStrip reels={reels} /> : i === 5 ? <PeopleSuggestions offset={10} onSeeAll={() => setPeople(true)} /> : null;
  const n = state.posts.length;

  return (
    <Screen>
      {/* Lojas do Realyz: tocar abre a página da loja (as seguidas primeiro). */}
      <FollowedStores />

      {state.posts.map((p, i) => {
        const product = p.productId ? state.products.find((x) => x.id === p.productId) : null;
        return (
          <React.Fragment key={p.id}>
          <View style={styles.post}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                const m = memberByName(p.author);
                if (m) return dispatch({ type: 'OPEN_PROFILE', id: m.id });
                if (p.storeId) dispatch({ type: 'OPEN_COMPANY', id: p.storeId });
              }}
              accessibilityLabel={`Ver perfil de ${p.author}`}
            >
            <Row style={{ padding: 12 }}>
              <View style={styles.avatar}>
                <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>{p.author[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Row>
                  <Text style={styles.author}>{p.author}</Text>
                  {p.verified ? <Text style={styles.verified}> ✔ verificado</Text> : null}
                </Row>
                <Text style={styles.meta}>{p.sponsored ? 'Patrocinado' : p.type === 'video' ? 'Vídeo curto' : 'Foto'}</Text>
              </View>
              {p.sponsored ? <Badge label="Patrocinado" color={colors.sponsored} /> : null}
            </Row>
            </TouchableOpacity>

            <View>
              {p.type === 'video' && p.video ? (
                <FeedVideo source={p.video} poster={p.image} style={styles.image} />
              ) : (
                <Photo uri={p.image} style={styles.image} />
              )}
            </View>

            <View style={{ padding: 12 }}>
              <PostActions post={p} author={p.author} />
              <Text style={styles.text}>{p.text}</Text>

              {product ? (
                <View style={styles.productBar}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', color: colors.text }}>{product.name}</Text>
                    <Text style={{ color: colors.primary, fontWeight: '700' }}>{brl(product.price)}</Text>
                  </View>
                  <Button
                    small
                    title="Comprar"
                    onPress={() => {
                      if (addOrChoose(dispatch, product)) goTo('loja');
                    }}
                  />
                </View>
              ) : null}
            </View>
          </View>
          {extra(i)}
          {i === n - 1 && n < 3 ? extra(2) : null}
          </React.Fragment>
        );
      })}

      <PeopleSearchModal visible={people} onClose={() => setPeople(false)} navigate={navigate} />

      <View style={styles.trust}>
        <Text style={{ fontWeight: '700', color: colors.primaryDark }}>🛡️ Feed protegido</Text>
        <Text style={{ color: colors.text, fontSize: 13, marginTop: 4 }}>
          Todos os perfis são verificados por biometria. A IA do Realyz confere as notícias com fontes reais e quem
          espalhar fake news comprovada é bloqueado.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  story: { alignItems: 'center', marginRight: 14, width: 66 },
  storyRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 3,
    borderColor: colors.primary,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyName: { fontSize: 11, marginTop: 4, color: colors.text },
  post: { backgroundColor: colors.card, borderRadius: 16, marginBottom: 14, overflow: 'hidden', ...soft },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  author: { fontWeight: '700', color: colors.text },
  verified: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  meta: { fontSize: 11, color: colors.muted },
  image: { width: '100%', aspectRatio: 1 },
  play: {
    position: 'absolute',
    top: '42%',
    left: '42%',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  action: { marginRight: 18, color: colors.text, fontWeight: '600' },
  text: { color: colors.text, lineHeight: 20 },
  productBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
  },
  trust: { backgroundColor: colors.primaryLight, borderRadius: 14, padding: 14 },
});
