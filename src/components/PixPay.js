import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { Alert } from 'react-native';
import { conectado } from '../serverShop';
import { api } from '../api';
import { Image } from 'react-native';
import { colors, brl } from '../theme';
import { useScreenSharePause } from '../screenShare';

// Compra sem saldo suficiente: em vez de "saldo insuficiente", abre uma janela com QR Code Pix.
// Duas opções: pagar o valor inteiro no Pix, ou usar o saldo que já tem na plataforma e pagar só o
// restante no Pix. O Pix vira saldo Realyz (fica salvo na plataforma) e a compra segue na hora.
// Uso: askPix({ amount, available, label, onPaid }) em qualquer tela; o <PixPayHost /> fica no App.
let listener = null;
export function askPix(req) {
  if (listener) listener({ ...req, at: Date.now() });
}

// QR de demonstração: desenho no formato de QR Code (na versão final o QR Pix é gerado pelo banco
// parceiro, com o valor e a chave do Realyz).
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
  const [dep, setDep] = useState(null); // depósito no servidor (cobrança Pix de verdade)
  useScreenSharePause(!!req, 'pix');
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
  // Conta ligada ao servidor: ao abrir o QR, gera a cobrança Pix de verdade; depois confere sozinho a cada 4 s.
  const realOn = conectado(state);
  useEffect(() => {
    if (!req || !mode || !realOn || dep) return;
    const tot = +Number(req.amount).toFixed(2);
    const av = Math.max(0, Math.min(+Number(req.available || 0).toFixed(2), tot));
    const valor = mode === 'saldo' ? +(tot - av).toFixed(2) : tot;
    let vivo = true;
    api('POST', '/wallet/deposit', { amount: valor, method: 'pix' })
      .then((d) => vivo && setDep(d))
      .catch((e) => vivo && Alert.alert('Pix não gerado', e.message));
    return () => {
      vivo = false;
    };
  }, [req, mode, realOn]);
  const conferirRef = React.useRef(null);
  useEffect(() => {
    if (!dep || dep.status !== 'pendente') return;
    const t = setInterval(() => conferirRef.current && conferirRef.current(false), 4000);
    return () => clearInterval(t);
  }, [dep && dep.id, dep && dep.status]);
  if (!req) return null;
  const close = () => {
    setReq(null);
    setDep(null);
  };
  const total = +Number(req.amount).toFixed(2);
  const avail = Math.max(0, Math.min(+Number(req.available || 0).toFixed(2), total));
  const pixValue = mode === 'saldo' ? +(total - avail).toFixed(2) : total;
  const demoCode = `00020126580014BR.GOV.BCB.PIX0136realys-pagamentos5204000053039865406${pixValue.toFixed(2)}5802BR5906REALYS6009SAO PAULO62070503***`;
  const real = conectado(state);
  const code = real ? (dep && dep.pix ? dep.pix.copiaECola : dep && dep.status === 'confirmado' ? 'Depósito de teste: o valor já entrou na sua carteira.' : 'Gerando o Pix…') : demoCode;
  // Conta ligada ao servidor: o Pix é uma cobrança de verdade na conta do Realyz (ou, na fase de testes, entra na hora).
  const concluir = (w) => {
    if (w) dispatch({ type: 'SERVER_WALLET', balance: w.balance, giftCredits: w.giftCredits });
    const done = req.onPaid;
    setReq(null);
    setDep(null);
    setTimeout(() => done && done(), 50);
  };
  const conferir = async (manual) => {
    if (!dep) return;
    if (dep.status === 'confirmado') return concluir(dep.wallet);
    try {
      const d = await api('GET', `/wallet/deposits/${dep.id}`);
      if (d.status === 'confirmado') return concluir(d.wallet);
      if (d.status === 'recusado') {
        setDep(null);
        return Alert.alert('Pix expirou', 'O tempo para pagar acabou. Gere um novo Pix.');
      }
      if (manual) Alert.alert('Ainda não chegou', 'O banco ainda não confirmou o Pix. Assim que confirmar, a compra continua sozinha.');
    } catch (e) {
      if (manual) Alert.alert('Não consegui conferir', e.message);
    }
  };
  conferirRef.current = conferir;
  const paid = () => {
    if (real) return conferir(true);
    setBusy(true);
    const done = req.onPaid;
    setTimeout(() => {
      dispatch({ type: 'WALLET_DEPOSIT', amount: pixValue, method: 'Pix' });
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
                    {brl(avail)} do saldo Realyz + <Text style={{ fontWeight: '800', color: colors.text }}>{brl(total - avail)}</Text> no Pix
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
                  {real && dep && dep.pix && dep.pix.imagem ? (
                    <Image source={{ uri: dep.pix.imagem.startsWith('data:') ? dep.pix.imagem : `data:image/png;base64,${dep.pix.imagem}` }} style={{ width: 180, height: 180 }} />
                  ) : real ? (
                    <Ionicons name="qr-code-outline" size={120} color="#0B1124" />
                  ) : (
                    <QrView seed={code + req.at} />
                  )}
                </View>
                <Text style={styles.value}>{brl(pixValue)}</Text>
                <Text style={[styles.optSub, { textAlign: 'center' }]}>
                  {mode === 'saldo' ? `+ ${brl(avail)} do seu saldo Realyz` : 'Valor inteiro no Pix'} · o Pix vira saldo Realyz e paga a compra na hora
                </Text>
              </View>
              <Text style={styles.copyLabel}>Pix copia e cola</Text>
              <Text style={styles.copy} selectable numberOfLines={2}>
                {code}
              </Text>
              <TouchableOpacity style={[styles.payBtn, busy && { opacity: 0.7 }]} onPress={paid} disabled={busy} activeOpacity={0.85}>
                {busy ? <ActivityIndicator color="#0B1124" /> : <Ionicons name="checkmark-circle-outline" size={18} color="#0B1124" />}
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.payText}>{busy ? 'Confirmando o Pix…' : real && dep && dep.status === 'confirmado' ? 'Continuar' : 'Já fiz o Pix'}</Text>
              </TouchableOpacity>
              {avail > 0 ? (
                <TouchableOpacity onPress={() => setMode(null)} style={{ alignSelf: 'center', marginTop: 8 }}>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.muted, fontWeight: '700', fontSize: 12 }}>Trocar forma de pagamento</Text>
                </TouchableOpacity>
              ) : null}
              {real ? (
                <Text style={styles.demo}>Copie o código e pague no app do seu banco. Quando o banco confirmar, a compra continua sozinha.</Text>
              ) : (
                <Text style={styles.demo}>Demonstração: o QR é ilustrativo. Na versão final o Pix é gerado pelo banco parceiro e confirmado sozinho.</Text>
              )}
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
