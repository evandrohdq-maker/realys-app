import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useStore } from '../../store';
import { colors, brl, soft } from '../../theme';
import { Screen, Photo, Badge, Row, Button } from '../../components/ui';
import { memberByName } from '../../people';

export default function FeedScreen({ goTo }) {
  const { state, dispatch } = useStore();

  return (
    <Screen>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
        {state.stores.map((s) => (
          <View key={s.id} style={styles.story}>
            <View style={[styles.storyRing, s.sponsored && { borderColor: colors.sponsored }]}>
              <Text style={{ color: colors.text, fontSize: 26 }}>{s.logo}</Text>
            </View>
            <Text numberOfLines={1} style={styles.storyName}>
              {s.name.split(' ')[0]}
            </Text>
          </View>
        ))}
      </ScrollView>

      {state.posts.map((p) => {
        const product = p.productId ? state.products.find((x) => x.id === p.productId) : null;
        const liked = !!state.liked[p.id];
        return (
          <View key={p.id} style={styles.post}>
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
              <Photo uri={p.image} style={styles.image} />
              {p.type === 'video' ? (
                <View style={styles.play}>
                  <Text style={{ color: '#fff', fontSize: 28 }}>▶</Text>
                </View>
              ) : null}
            </View>

            <View style={{ padding: 12 }}>
              <Row style={{ marginBottom: 8 }}>
                <TouchableOpacity onPress={() => dispatch({ type: 'TOGGLE_LIKE', id: p.id })}>
                  <Text style={styles.action}>
                    {liked ? '💚' : '🤍'} {p.likes + (liked ? 1 : 0)}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.action}>💬 {p.comments}</Text>
                <Text style={styles.action}>↗ Compartilhar</Text>
              </Row>
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
                      dispatch({ type: 'ADD_TO_CART', productId: product.id });
                      goTo('loja');
                    }}
                  />
                </View>
              ) : null}
            </View>
          </View>
        );
      })}

      <View style={styles.trust}>
        <Text style={{ fontWeight: '700', color: colors.primaryDark }}>🛡️ Feed protegido</Text>
        <Text style={{ color: colors.text, fontSize: 13, marginTop: 4 }}>
          Todos os perfis são verificados por biometria. A IA do Re@lys confere as notícias com fontes reais e quem
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
