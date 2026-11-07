import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { colors, brl } from '../theme';

// Compra sem saldo suficiente: em vez de "saldo insuficiente", abre uma janela com QR Code Pix.
// Duas opções: pagar o valor inteiro no Pix, ou usar o saldo que já tem na plataforma e pagar só o
// restante no Pix. O Pix vira saldo Realys (fica salvo na plataforma) e a compra segue na hora.
// Uso: askPix({ amount, available, label, onPaid }) em qualquer tela; o <PixPayHost /> fica no App.
let listener = null;
export function askPix(req) {
  if (listener) listener({ ...req, at: Date.now() });
}

// QR de demonstração: desenho no formato de QR Code (na versão final o QR Pix é gerado pelo banco
// parceiro, com o valor e a chave do Realys).
const N = 29;
function qrMatrix(seed) {
  let h = 2166136261;
  for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0), h / 4294967296);
  const m = [...Array(N)].map(() => [...Array(N)].map(() => rnd() < 0.48));
  const finder = (r0, c0) => {
    for (let r = -1; r < 8; r++)
      for (let c = -1; c < 8; c++) {
        const rr = r0 + r;
        const cc = c0 + c;
        if (rr < 0 || cc < 0 || rr >= N || cc >= N) continue;
        const edge = r === 0 || r === 6 || c === 0 || c === 6;
        const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        m[rr][cc] = r >= 0 && r <= 6 && c >= 0 && c <= 6 && (edge || core);
      }
  };
  finder(0, 0);
  finder(0, N - 7);
  finder(N - 7, 0);
  for (let i = 8; i < N - 8; i++) m[6][i] = m[i][6] = i % 2 === 0;
  return m;
}
function QrView({ seed, size = 210 }) {
  const m = qrMatrix(seed);
  const cell = size / N;
  return (
    <View style={{ width: size, height: size, backgroundColor: '#fff' }}>
      {m.map((row, r) => {
        // junta quadradinhos pretos vizinhos numa barra só (bem menos desenhos na tela)
        const runs = [];
        let c = 0;
        while (c < N) {
          if (!row[c]) {
            c++;
            continue;
          }
          const s = c;
          while (c < N && row[c]) c++;
          runs.push([s, c - s]);
        }
        return runs.map(([s, len]) => (
          <View key={r + '-' + s} style={{ position: 'absolute', top: r * cell, left: s * cell, width: len * cell + 0.5, height: cell + 0.5, backgroundColor: '#0B1124' }} />
        ));
      })}
    </View>
  );
}

export function PixPayHost() {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const [req, setReq] = useState(null);
  const [mode, setMode] = useState(null); // 'tudo' | 'saldo'
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    listener = (r) => {
      setReq(r);
      setBusy(false);
      // sem saldo nenhum: vai direto para o QR do valor inteiro
      setMode(r.available > 0 ? null : 'tudo');
    };
    return () => {
      listener = null;
    };
  }, []);
  if (!req) return null;
  const close = () => setReq(null);
  const total = +Number(req.amount).toFixed(2);
  const avail = Math.max(0, Math.min(+Number(req.available || 0).toFixed(2), total));
  const pixValue = mode === 'saldo' ? +(total - avail).toFixed(2) : total;
  const code = `00020126580014BR.GOV.BCB.PIX0136realys-pagamentos5204000053039865406${pixValue.toFixed(2)}5802BR5906REALYS6009SAO PAULO62070503***`;
  const paid = () => {
    setBusy(true);
    setTimeout(() => {
      dispatch({ type: 'WALLET_DEPOSIT', amount: pixValue, method: 'Pix' });
      const done = req.onPaid;
      setReq(null);
      setTimeout(() => done && done(), 50);
    }, 1200);
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <View style={styles.back}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={close} />
        <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
          <View style={styles.grip} />
          <View style={styles.head}>
            <View style={styles.pixIcon}>
              <Ionicons name="qr-code" size={18} color="#0B1124" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.title}>Pagar com Pix</Text>
              <Text style={styles.sub} numberOfLines={1}>
                {req.label || 'Sua compra'} · {brl(total)}
              </Text>
            </View>
            <TouchableOpacity onPress={close} style={styles.x} accessibilityLabel="Fechar">
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {!mode ? (
            <>
              <Text style={styles.ask}>Como você quer pagar?</Text>
              <TouchableOpacity style={styles.opt} onPress={() => setMode('saldo')} activeOpacity={0.85}>
                <Ionicons name="wallet-outline" size={22} color={colors.gold} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.optTitle}>Usar meu saldo + Pix</Text>
                  <Text style={styles.optSub}>
                    {brl(avail)} do saldo Realys + <Text style={{ fontWeight: '800', color: colors.text }}>{brl(total - avail)}</Text> no Pix
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.opt} onPress={() => setMode('tudo')} activeOpacity={0.85}>
                <Ionicons name="qr-code-outline" size={22} color={colors.gold} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.optTitle}>Pagar o valor inteiro no Pix</Text>
                  <Text style={styles.optSub}>
                    <Text style={{ fontWeight: '800', color: colors.text }}>{brl(total)}</Text> no Pix · seu saldo de {brl(avail)} continua guardado
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={{ alignItems: 'center', marginTop: 6 }}>
                <View style={styles.qrBox}>
                  <QrView seed={code + req.at} />
                </View>
                <Text style={styles.value}>{brl(pixValue)}</Text>
                <Text style={[styles.optSub, { textAlign: 'center' }]}>
                  {mode === 'saldo' ? `+ ${brl(avail)} do seu saldo Realys` : 'Valor inteiro no Pix'} · o Pix vira saldo Realys e paga a compra na hora
                </Text>
              </View>
              <Text style={styles.copyLabel}>Pix copia e cola</Text>
              <Text style={styles.copy} selectable numberOfLines={2}>
                {code}
              </Text>
              <TouchableOpacity style={[styles.payBtn, busy && { opacity: 0.7 }]} onPress={paid} disabled={busy} activeOpacity={0.85}>
                {busy ? <ActivityIndicator color="#0B1124" /> : <Ionicons name="checkmark-circle-outline" size={18} color="#0B1124" />}
                <Text style={styles.payText}>{busy ? 'Confirmando o Pix…' : 'Já fiz o Pix'}</Text>
              </TouchableOpacity>
              {avail > 0 ? (
                <TouchableOpacity onPress={() => setMode(null)} style={{ alignSelf: 'center', marginTop: 8 }}>
                  <Text style={{ color: colors.muted, fontWeight: '700', fontSize: 12 }}>Trocar forma de pagamento</Text>
                </TouchableOpacity>
              ) : null}
              <Text style={styles.demo}>Demonstração: o QR é ilustrativo. Na versão final o Pix é gerado pelo banco parceiro e confirmado sozinho.</Text>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  back: { flex: 1, backgroundColor: 'rgba(6,10,24,0.45)' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 18, paddingTop: 8 },
  grip: { alignSelf: 'center', width: 44, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 10 },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  pixIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 17, fontWeight: '800' },
  sub: { color: colors.muted, fontSize: 12 },
  x: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  ask: { color: colors.text, fontWeight: '800', marginTop: 8, marginBottom: 8 },
  opt: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(226,182,73,0.45)' },
  optTitle: { color: colors.text, fontWeight: '800', fontSize: 14 },
  optSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  qrBox: { padding: 12, backgroundColor: '#fff', borderRadius: 18, borderWidth: 2, borderColor: colors.gold },
  value: { color: colors.text, fontSize: 24, fontWeight: '900', marginTop: 8 },
  copyLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1, marginTop: 12 },
  copy: { color: colors.text, fontSize: 11, backgroundColor: colors.card, borderRadius: 10, padding: 8, marginTop: 4 },
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gold, borderRadius: 16, paddingVertical: 14, marginTop: 12 },
  payText: { color: '#0B1124', fontWeight: '900', fontSize: 15, marginLeft: 6 },
  demo: { color: colors.muted, fontSize: 10.5, textAlign: 'center', marginTop: 10 },
});
