// Avisos no estilo do Realys, no app inteiro (no lugar da caixa cinza do Android).
// - Aviso simples (sem escolha, como "No carrinho"): um cartão suave que aparece em cima e some
//   sozinho em poucos segundos. Tocar nele fecha na hora.
// - Pergunta com escolha ("Apagar?", "Ligar agora?"): caixa clara com os botões no padrão do app
//   (dourado = principal, vermelho = ação perigosa, cinza = cancelar).
// Funciona trocando o Alert.alert do React Native: todos os 200+ avisos do app mudam de uma vez.
// Abre por cima de qualquer tela, inclusive das janelas (Modal) já abertas.
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Modal, View, Text, TouchableOpacity, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

const nativeAlert = Alert.alert.bind(Alert);
let push = null; // ligado quando o SoftAlertHost está na tela
const queue = [];

// Ícone e cor pelo assunto do aviso.
const OK_RE = /(✅|pronto|salv|ativad|enviad|feito|sucesso|confirmad|adicionad|carrinho|assinad|concluíd|cadastrad)/i;
const BAD_RE = /(não |nao |erro|falh|bloquead|acima|falta|insuficiente|inválid|invalid|recusad|atenção|cuidado|sem )/i;
function toneOf(title, message) {
  const t = `${title || ''} ${message || ''}`;
  if (BAD_RE.test(title || '')) return { icon: 'alert-circle', color: '#C77D12', bg: '#FDF3E3' };
  if (OK_RE.test(t)) return { icon: 'checkmark-circle', color: '#1E9E63', bg: '#E7F6EE' };
  return { icon: 'information-circle', color: colors.primary, bg: colors.primaryLight };
}

export function softAlert(title, message, buttons, options) {
  const item = { id: Date.now() + Math.random(), title: String(title || ''), message: message != null ? String(message) : '', buttons: buttons || [], options: options || {} };
  if (!push) return nativeAlert(title, message, buttons, options);
  push(item);
}

// Troca o Alert.alert do app inteiro (chamado uma vez, no App.js).
export function installSoftAlert() {
  Alert.alert = softAlert;
}

// Vira cartão que some sozinho só quando não há escolha: sem botões ou com um único "OK".
// Botão único com outra ação ("Ver pedido", "Ativar") continua sendo caixa com botão.
const OK_ONLY = /^(ok|okay|entendi|beleza|certo|fechar|tudo bem|blz)\s*[.!]?$/i;
const isToast = (it) => !it.buttons.length || (it.buttons.length === 1 && OK_ONLY.test(String(it.buttons[0].text || 'ok').trim()));
const toastMs = (it) => Math.min(5200, 2000 + (it.title.length + it.message.length) * 28);

export function SoftAlertHost() {
  const insets = useSafeAreaInsets();
  const [cur, setCur] = useState(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);
  const curRef = useRef(null);
  curRef.current = cur;

  useEffect(() => {
    push = (it) => {
      queue.push(it);
      if (!curRef.current) next();
    };
    return () => {
      push = null;
    };
  }, []);

  const next = () => {
    const it = queue.shift() || null;
    setCur(it);
    anim.setValue(0);
    if (!it) return;
    Animated.timing(anim, { toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    clearTimeout(timer.current);
    if (isToast(it)) timer.current = setTimeout(() => close(it.buttons[0]), toastMs(it));
  };

  const close = (btn) => {
    clearTimeout(timer.current);
    const it = curRef.current;
    if (!it) return;
    Animated.timing(anim, { toValue: 0, duration: 150, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => {
      setCur(null);
      curRef.current = null;
      // A ação do botão roda depois de a caixa sair (pode abrir outra tela ou outro aviso).
      if (btn && btn.onPress) setTimeout(btn.onPress, 0);
      else if (!btn && it.options.onDismiss) setTimeout(it.options.onDismiss, 0);
      setTimeout(next, 30);
    });
  };

  if (!cur) return null;
  const tone = toneOf(cur.title, cur.message);
  const cancelBtn = cur.buttons.find((b) => b.style === 'cancel');
  const dismissable = isToast(cur) || cur.options.cancelable !== false;

  if (isToast(cur)) {
    const y = anim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] });
    return (
      <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={() => close(cur.buttons[0])}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close(cur.buttons[0])}>
          <Animated.View style={[st.toast, { top: insets.top + 12, opacity: anim, transform: [{ translateY: y }] }]}>
            <View style={[st.toastIcon, { backgroundColor: tone.bg }]}>
              <Ionicons name={tone.icon} size={22} color={tone.color} />
            </View>
            <View style={{ flex: 1 }}>
              {cur.title ? <Text style={st.toastTitle}>{cur.title}</Text> : null}
              {cur.message ? <Text style={st.toastMsg}>{cur.message}</Text> : null}
            </View>
          </Animated.View>
        </Pressable>
      </Modal>
    );
  }

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] });
  // Botões: cancelar em cinza à esquerda/embaixo; o principal dourado; perigoso em vermelho.
  const ordered = [...cur.buttons.filter((b) => b.style !== 'cancel'), ...(cancelBtn ? [cancelBtn] : [])];
  const stack = ordered.length > 2 || ordered.some((b) => String(b.text || '').length > 14);
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={() => dismissable && close(cancelBtn || null)}>
      <Animated.View style={[st.backdrop, { opacity: anim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => dismissable && cancelBtn && close(cancelBtn)} />
        <Animated.View style={[st.card, { transform: [{ scale }] }]}>
          <View style={[st.icon, { backgroundColor: tone.bg }]}>
            <Ionicons name={tone.icon} size={28} color={tone.color} />
          </View>
          {cur.title ? <Text style={st.title}>{cur.title}</Text> : null}
          {cur.message ? <Text style={st.msg}>{cur.message}</Text> : null}
          <View style={[st.btns, stack && { flexDirection: 'column' }]}>
            {ordered.map((b, i) => {
              const danger = b.style === 'destructive';
              const cancel = b.style === 'cancel';
              const main = !cancel && !danger && i === 0;
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => close(b)}
                  style={[st.btn, stack ? { marginTop: 8 } : { flex: 1, marginHorizontal: 4 }, main && st.btnMain, danger && st.btnDanger, cancel && st.btnCancel]}
                  accessibilityRole="button"
                >
                  <Text style={[st.btnText, (main || danger) && { color: '#fff' }, cancel && { color: colors.muted }]}>{b.text || 'OK'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const st = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#1F2A44',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  toastIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  toastTitle: { color: colors.text, fontWeight: '800', fontSize: 15 },
  toastMsg: { color: colors.muted, fontSize: 13.5, lineHeight: 19, marginTop: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(31,42,68,0.35)', alignItems: 'center', justifyContent: 'center', padding: 26 },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingTop: 22,
    paddingHorizontal: 20,
    paddingBottom: 16,
    alignItems: 'center',
    shadowColor: '#1F2A44',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  icon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  title: { color: colors.text, fontWeight: '800', fontSize: 18, textAlign: 'center' },
  msg: { color: colors.muted, fontSize: 14.5, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  btns: { flexDirection: 'row', alignSelf: 'stretch', marginTop: 18 },
  btn: { borderRadius: 14, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight },
  btnMain: { backgroundColor: colors.primary },
  btnDanger: { backgroundColor: '#D9534F' },
  btnCancel: { backgroundColor: '#F3F1EC' },
  btnText: { color: colors.primaryDark || colors.primary, fontWeight: '800', fontSize: 14.5 },
});
