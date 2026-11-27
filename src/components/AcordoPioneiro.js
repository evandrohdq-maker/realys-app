// Acordo de Pioneiro na hora do cadastro (app e site).
//
// Depois de criar a conta pelo link do vendedor (ou ao entrar numa conta que tem vaga de pioneiro sem
// acordo assinado), abre a tela do Acordo:
//   1) quem vai assinar: "Sou o titular" ou "O titular está em outro lugar";
//   2) titular aqui: confirma o rosto (cadastro biométrico, ou conferência se já tem) e assina;
//   3) titular longe (ou computador sem câmera): gera o link de 24 h, com QR Code, botão do WhatsApp e
//      copiar; a tela fica "Aguardando o titular…" e muda sozinha quando ele assinar;
//   4) assinado: número de Pioneiro, PDF do acordo e uma cópia em Perfil › Documentos.
// Também mostra a fatura do mês quando houver (pagar com o saldo da carteira).
import React, { useEffect, useRef, useState } from 'react';
import { View, Modal, ScrollView, TouchableOpacity, StyleSheet, Platform, Linking, Share, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from '../responsive';
import { useStore } from '../store';
import { api, serverOn, connectEvents } from '../api';
import { colors, soft } from '../theme';
import BiometriaScreen from '../screens/BiometriaScreen';
import FaceCheck from './FaceCheck';
import { qrMatriz } from '../qr';
import { lerIntencao, limparIntencao, acordoHtml, numPioneiro, fmtData, fmtReais } from '../pioneiro';

function QR({ texto, tamanho = 220 }) {
  let m = null;
  try {
    m = qrMatriz(texto);
  } catch (e) {
    return null;
  }
  const n = m.length + 8; // 4 módulos de borda branca de cada lado
  const px = Math.max(2, Math.floor(tamanho / n));
  return (
    <View style={{ width: px * n, height: px * n, padding: px * 4, backgroundColor: '#fff', alignSelf: 'center', borderRadius: 12 }}>
      {/* Cada linha vira poucos blocos (trechos pretos seguidos), para não desenhar milhares de quadradinhos. */}
      {m.map((linha, y) => {
        const trechos = [];
        for (let x = 0; x < linha.length; ) {
          let k = x;
          while (k < linha.length && linha[k] === linha[x]) k++;
          trechos.push([linha[x], k - x]);
          x = k;
        }
        return (
          <View key={y} style={{ flexDirection: 'row', height: px }}>
            {trechos.map(([on, w], i) => (
              <View key={i} style={{ width: w * px, height: px, backgroundColor: on ? '#000' : '#fff' }} />
            ))}
          </View>
        );
      })}
    </View>
  );
}

async function baixarPdf(s) {
  const html = acordoHtml(s);
  if (Platform.OS === 'web') {
    const w = window.open('', '_blank');
    if (!w) return Alert.alert('PDF do acordo', 'Libere as janelas do navegador para baixar o PDF.');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 400);
    return;
  }
  const Print = require('expo-print');
  const Sharing = require('expo-sharing');
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Acordo de Pioneiro', UTI: 'com.adobe.pdf' });
}

export default function AcordoPioneiro() {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const me = state.user && state.user.serverId;
  const [s, setS] = useState(null); // situação do pioneiro (servidor)
  const [aberto, setAberto] = useState(false);
  const [modo, setModo] = useState('escolher'); // escolher | aqui | longe | pronto
  const [bio, setBio] = useState(null);
  const [bioOpen, setBioOpen] = useState(false);
  const [face, setFace] = useState(false);
  const [link, setLink] = useState(null);
  const [whats, setWhats] = useState('');
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');
  const salvoNoPerfil = useRef(false);

  const carregar = async () => {
    try {
      const r = await api('GET', '/pioneiros/meu');
      if (!r || !r.pioneiro) return setS(null);
      setS(r);
      if (!r.assinado) setAberto(true);
      return r;
    } catch (e) {}
  };
  const carregarBio = () => api('GET', '/biometria').then(setBio).catch(() => setBio({ status: 'sem_consentimento' }));

  // Ao entrar: reserva a vaga do link do vendedor (se tiver) e vê se há acordo para assinar.
  useEffect(() => {
    if (!me || !serverOn()) return undefined;
    let vivo = true;
    (async () => {
      const intencao = await lerIntencao();
      if (intencao && intencao.area) {
        try {
          await api('POST', '/pioneiros/entrar', intencao);
        } catch (e) {
          if (vivo) Alert.alert('Vaga de Pioneiro', e.message);
        }
        limparIntencao();
      }
      if (vivo) carregar();
    })();
    const stop = connectEvents((e) => e.type === 'pioneiro' && carregar());
    return () => {
      vivo = false;
      stop();
    };
  }, [me]);
  useEffect(() => {
    if (aberto) carregarBio();
  }, [aberto]);
  // Esperando o titular a distância: confere a cada 4 s se ele já assinou.
  useEffect(() => {
    if (modo !== 'longe' || !link) return undefined;
    const t = setInterval(() => carregar().then((r) => r && r.assinado && setModo('pronto')), 4000);
    return () => clearInterval(t);
  }, [modo, link]);
  // Assinado: guarda uma cópia em Perfil › Documentos.
  useEffect(() => {
    if (!s || !s.assinado || salvoNoPerfil.current) return;
    salvoNoPerfil.current = true;
    const { API_URL } = require('../api');
    dispatch({
      type: 'DOC_SAVE',
      doc: {
        id: 'pioneiro-' + s.pioneiro.id,
        kind: 'contrato',
        type: 'pioneiro',
        createdAt: s.assinado.em,
        fields: { clausulas: s.acordo.clausulas.map(([t, c]) => `${t}: ${Array.isArray(c) ? c.join(' ') : c}`) },
        parties: [
          { role: 'Realyz', name: 'Realyz', signedAt: s.assinado.em, method: 'realys' },
          { role: 'Pioneiro', name: s.pioneiro.nome, doc: s.pioneiro.cnpj || '', signedAt: s.assinado.em, method: 'realys' },
        ],
        hash: s.assinado.hash,
        verifyCode: s.assinado.codigo,
        verifyUrl: API_URL + '/v/' + s.assinado.codigo,
      },
    });
  }, [s && s.assinado]);

  if (!s || !s.pioneiro) return null;
  const titulo = s.acordo.titulo;
  const status = bio ? bio.status : null;
  const empresa = s.pioneiro.grupo === 'empresa';

  const assinar = async () => {
    setBusy(true);
    setErro('');
    try {
      const r = await api('POST', '/pioneiros/meu/assinar', { aparelho: Platform.OS === 'web' ? 'Site (navegador)' : 'App Android' });
      setS(r);
      setModo('pronto');
    } catch (e) {
      setErro(e.message);
    } finally {
      setBusy(false);
    }
  };
  const assinarAqui = () => {
    if (status === 'aprovado') return setFace(true); // confere o rosto agora e assina
    if (status === 'em_analise') return assinar(); // acabou de enviar o rosto
    setBioOpen(true); // ainda não tem: faz o cadastro do rosto
  };
  const gerarLink = async () => {
    setBusy(true);
    setErro('');
    try {
      setLink(await api('POST', '/pioneiros/meu/link-titular', { whatsapp: whats || undefined }));
      setModo('longe');
    } catch (e) {
      setErro(e.message);
    } finally {
      setBusy(false);
    }
  };
  const copiar = () => {
    if (Platform.OS === 'web' && navigator.clipboard) return navigator.clipboard.writeText(link.url).then(() => Alert.alert('Link copiado', 'Cole na conversa com o titular.'));
    Share.share({ message: link.url }).catch(() => {});
  };

  // Fatura aberta (depois do lançamento): um aviso pequeno, fora da tela do acordo.
  const aberta = s.assinado && (s.faturas || []).find((f) => f.status === 'aberta');
  const pagar = async (f) => {
    try {
      setS(await api('POST', `/pioneiros/faturas/${f.id}/pagar`));
      Alert.alert('Fatura paga', 'Obrigado! Seu Pacote Pioneiro segue ativo.');
    } catch (e) {
      Alert.alert('Fatura do Pacote Pioneiro', e.code === 'saldo_insuficiente' ? `${e.message}\n\nNo Perfil, abra a Carteira e deposite por Pix.` : e.message);
    }
  };

  return (
    <>
      {aberta && !aberto ? (
        <TouchableOpacity style={[st.fatura, soft, { top: insets.top + 56 }, s.suspenso && { borderColor: colors.danger }]} onPress={() => pagar(aberta)} activeOpacity={0.9}>
          <Ionicons name="receipt-outline" size={18} color={s.suspenso ? colors.danger : colors.primaryDark} />
          <Text style={st.faturaT} numberOfLines={2}>
            {s.suspenso ? 'Pacote Pioneiro suspenso · ' : ''}Fatura do mês {aberta.mes}: {fmtReais(aberta.valor)}, vence {fmtData(aberta.venceEm)}. Toque para pagar.
          </Text>
        </TouchableOpacity>
      ) : null}

      <Modal visible={aberto} animationType="slide" onRequestClose={() => setAberto(false)}>
        <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
          <View style={st.head}>
            <Ionicons name="ribbon-outline" size={22} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={st.h1} numberOfLines={1}>{titulo}</Text>
              <Text style={st.sub} numberOfLines={1}>{s.pioneiro.nome} · {s.pioneiro.areaNome}</Text>
            </View>
            {modo !== 'pronto' ? (
              <TouchableOpacity onPress={() => setAberto(false)} hitSlop={10} accessibilityLabel="Fechar e assinar depois">
                <Text style={{ color: colors.muted, fontWeight: '700' }}>Depois</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
            {modo === 'pronto' || s.assinado ? (
              <View style={[st.card, soft, { alignItems: 'center' }]}>
                <Ionicons name="checkmark-circle" size={54} color={colors.success} />
                <Text style={[st.h1, { marginTop: 8, textAlign: 'center' }]}>Bem-vindo, Pioneiro {numPioneiro(s.pioneiro.numero)}!</Text>
                <Text style={[st.p, { textAlign: 'center' }]}>
                  {empresa ? 'Acordo assinado. Nada é cobrado antes do lançamento: a primeira fatura sai no fim do 1º mês depois que o Realyz abrir ao público.' : 'Termo assinado. Seus benefícios de pioneiro começam com a sua primeira entrega ou corrida.'}
                </Text>
                <Text style={[st.p, { textAlign: 'center' }]}>Código de conferência: {s.assinado ? s.assinado.codigo : ''}</Text>
                <TouchableOpacity style={st.btn} onPress={() => baixarPdf(s).catch(() => {})}>
                  <Ionicons name="download-outline" size={18} color={colors.onPrimary} />
                  <Text style={st.btnT}>Baixar o PDF do acordo</Text>
                </TouchableOpacity>
                <Text style={st.mini}>Uma cópia também fica em Perfil › Documentos.</Text>
                <TouchableOpacity style={[st.btn2, { marginTop: 14 }]} onPress={() => setAberto(false)}>
                  <Text style={st.btn2T}>Continuar no Realyz</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* O texto do acordo */}
                <View style={[st.card, soft]}>
                  {s.acordo.clausulas.map(([t, c]) => (
                    <View key={t} style={{ marginBottom: 12 }}>
                      <Text style={st.ct}>{t}</Text>
                      {Array.isArray(c) ? c.map((x) => <Text key={x} style={st.li}>• {x}</Text>) : <Text style={st.p}>{c}</Text>}
                    </View>
                  ))}
                  <Text style={st.mini}>Versão {s.acordo.versao}</Text>
                </View>

                {erro ? <Text style={st.erro}>{erro}</Text> : null}

                {modo === 'escolher' ? (
                  <View style={[st.card, soft]}>
                    <Text style={st.ct}>{empresa ? 'Quem assina é o titular do CNPJ' : 'Assinatura com o seu rosto'}</Text>
                    <Text style={st.p}>{empresa ? 'A assinatura é feita com a confirmação do rosto e do documento do dono da empresa.' : 'Confirme o seu rosto para assinar o termo.'}</Text>
                    <TouchableOpacity style={st.btn} onPress={() => setModo('aqui')}>
                      <Ionicons name="person-circle-outline" size={18} color={colors.onPrimary} />
                      <Text style={st.btnT}>{empresa ? 'Sou o titular: assinar agora' : 'Assinar agora'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={st.btn2} onPress={() => setModo('link')}>
                      <Ionicons name="paper-plane-outline" size={17} color={colors.primaryDark} />
                      <Text style={st.btn2T}>{empresa ? 'O titular está em outro lugar' : 'Fazer pelo celular (QR Code)'}</Text>
                    </TouchableOpacity>
                    {Platform.OS === 'web' ? <Text style={st.mini}>No computador sem câmera, escolha a segunda opção: aparece um QR Code para fazer pelo celular.</Text> : null}
                  </View>
                ) : null}

                {modo === 'aqui' ? (
                  <View style={[st.card, soft]}>
                    <Text style={st.ct}>Confirmar o rosto e assinar</Text>
                    <Text style={st.p}>
                      {status === 'aprovado' ? 'Seu rosto já está cadastrado. Confirme agora para assinar.' : status === 'em_analise' ? 'Seu rosto e documento foram enviados. Toque para assinar.' : 'Primeiro, o cadastro do rosto com o documento (leva uns 2 minutos). Depois, a assinatura.'}
                    </Text>
                    <TouchableOpacity style={[st.btn, busy && { opacity: 0.6 }]} onPress={busy ? undefined : assinarAqui}>
                      {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Ionicons name="scan-outline" size={18} color={colors.onPrimary} />}
                      <Text style={st.btnT}>{status === 'em_analise' ? 'Assinar o acordo' : status === 'aprovado' ? 'Confirmar o rosto e assinar' : 'Cadastrar o rosto'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setModo('escolher')} style={{ marginTop: 10, alignSelf: 'center' }}>
                      <Text style={st.link}>Voltar</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {modo === 'link' ? (
                  <View style={[st.card, soft]}>
                    <Text style={st.ct}>Enviar para o titular</Text>
                    <Text style={st.p}>O link vale por 24 horas e uma vez só. Ele faz a biometria e assina do celular dele.</Text>
                    <TextInput value={whats} onChangeText={setWhats} placeholder="WhatsApp do titular, com DDD" placeholderTextColor={colors.muted} keyboardType="phone-pad" style={st.input} />
                    <TouchableOpacity style={[st.btn, busy && { opacity: 0.6 }]} onPress={busy ? undefined : gerarLink}>
                      {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Ionicons name="link-outline" size={18} color={colors.onPrimary} />}
                      <Text style={st.btnT}>Gerar o link</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setModo('escolher')} style={{ marginTop: 10, alignSelf: 'center' }}>
                      <Text style={st.link}>Voltar</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {modo === 'longe' && link ? (
                  <View style={[st.card, soft]}>
                    <Text style={st.ct}>Aponte a câmera do celular</Text>
                    <Text style={st.p}>Ou envie o link para o titular. Esta tela atualiza sozinha quando ele assinar.</Text>
                    <View style={{ marginVertical: 12 }}>
                      <QR texto={link.url} />
                    </View>
                    <TouchableOpacity style={st.btn} onPress={() => Linking.openURL(link.whatsappUrl).catch(() => {})}>
                      <Ionicons name="logo-whatsapp" size={18} color={colors.onPrimary} />
                      <Text style={st.btnT}>Enviar pelo WhatsApp</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={st.btn2} onPress={copiar}>
                      <Ionicons name="copy-outline" size={17} color={colors.primaryDark} />
                      <Text style={st.btn2T}>Copiar o link</Text>
                    </TouchableOpacity>
                    <View style={st.aguardando}>
                      <ActivityIndicator color={colors.primary} />
                      <Text style={[st.p, { marginLeft: 10, marginTop: 0 }]}>Aguardando o titular… (vale até {new Date(link.expiraEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} de {fmtData(link.expiraEm)})</Text>
                    </View>
                  </View>
                ) : null}
              </>
            )}
          </ScrollView>
        </View>
        <BiometriaScreen
          visible={bioOpen}
          onClose={() => {
            setBioOpen(false);
            api('GET', '/biometria')
              .then((b) => {
                setBio(b);
                // Acabou de enviar o rosto e o documento: já assina.
                if (b && (b.status === 'em_analise' || b.status === 'aprovado') && status !== b.status) {
                  if (b.status === 'em_analise') assinar();
                  else setFace(true);
                }
              })
              .catch(() => {});
          }}
        />
        <FaceCheck
          visible={face}
          purpose="contrato"
          refId={s.pioneiro.id}
          title="Confirme o rosto para assinar"
          onDone={(ok) => {
            setFace(false);
            if (ok) assinar();
          }}
          onClose={() => setFace(false)}
        />
      </Modal>
    </>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  h1: { color: colors.text, fontWeight: '800', fontSize: 17 },
  sub: { color: colors.muted, fontSize: 12.5 },
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 16, marginBottom: 14 },
  ct: { color: colors.text, fontWeight: '800', fontSize: 15, marginBottom: 4 },
  p: { color: colors.text, fontSize: 14, lineHeight: 20, marginTop: 2 },
  li: { color: colors.text, fontSize: 14, lineHeight: 20, marginTop: 3, paddingLeft: 4 },
  mini: { color: colors.muted, fontSize: 12, marginTop: 8, textAlign: 'center' },
  erro: { color: colors.danger, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 24, paddingVertical: 13, marginTop: 14, alignSelf: 'stretch' },
  btnT: { color: colors.onPrimary, fontWeight: '800', fontSize: 15, marginLeft: 8 },
  btn2: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 24, paddingVertical: 12, marginTop: 10, borderWidth: 1.5, borderColor: colors.primary, alignSelf: 'stretch' },
  btn2T: { color: colors.primaryDark, fontWeight: '800', fontSize: 14.5, marginLeft: 7 },
  link: { color: colors.primary, fontWeight: '800' },
  input: { borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 14, paddingHorizontal: 14, height: 46, marginTop: 12, color: colors.text, fontSize: 15, backgroundColor: '#fff' },
  aguardando: { flexDirection: 'row', alignItems: 'center', marginTop: 16, backgroundColor: colors.cardAlt, borderRadius: 14, padding: 12 },
  fatura: { position: 'absolute', left: 12, right: 12, zIndex: 50, elevation: 50, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 12, borderWidth: 1.5, borderColor: colors.gold },
  faturaT: { flex: 1, color: colors.text, fontWeight: '700', fontSize: 13, marginLeft: 8 },
});
