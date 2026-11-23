import React, { useState, useEffect, useRef } from 'react';
import { KeyboardLift } from '../keyboard';
import { View, StyleSheet, Alert, ScrollView, TouchableOpacity, Platform, BackHandler, Image } from 'react-native';
import { Text, TextInput } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import * as Crypto from 'expo-crypto';
import { ADMIN_LOGIN, ANALYST_LOGIN } from '../data';
import { colors } from '../theme';
import {
  onlyDigits,
  formatCpf,
  formatCnpj,
  maskLogin,
  findAccount,
  checkPassword,
  userFromAccount,
  getSavedUsers,
  saveUser,
  touchSavedUser,
  forgetUser,
  confirmBiometric,
  savedKey,
} from '../accounts';
import SignupForm from './SignupForm';
import { entrarOuMigrar, entrarNoServidor, userFromServer, usarConta, rolesDoServidor } from '../serverAuth';
import { setServerId } from '../accounts';
import { serverOn, setCodigo2fa } from '../api';
import ScanFacial from '../components/ScanFacial';
import SupportCenter from '../components/SupportCenter';
import EsqueciSenha from '../components/EsqueciSenha';
import { authStyles } from './authStyles';
import { useScreenSharePause } from '../screenShare';

// Um campo só: usuário, CPF ou CNPJ. O tipo de acesso vem da própria conta.
function detect(value) {
  const v = value.trim();
  const d = onlyDigits(v);
  const numeric = v.length > 0 && /^[\d.\-\/\s]+$/.test(v);
  if (ADMIN_LOGIN.users.includes(v.toLowerCase())) return { kind: 'admin' };
  if (v.toLowerCase() === ANALYST_LOGIN.user) return { kind: 'analista' };
  if (numeric && d.length === 14) return { kind: 'cnpj', doc: formatCnpj(d) };
  if (numeric && d.length === 11) return { kind: 'cpf', doc: formatCpf(d) };
  if (numeric) return { kind: 'incompleto' };
  if (v.length >= 3) return { kind: 'usuario' };
  return { kind: 'vazio' };
}

// Contas de demonstração (não cadastradas neste celular): a conta define os acessos.
// CNPJ → empresa e fornecedor (e também cliente); CPF ou usuário → cliente e prestador.
function demoUser(value, info) {
  if (info.kind === 'cnpj') return { name: 'Minha Empresa', roles: ['empresa', 'fornecedor', 'cliente'], cnpj: info.doc };
  if (info.kind === 'cpf') return { name: 'Usuário Realyz', roles: ['cliente', 'prestador'], cpf: info.doc, cnpj: '12.345.678/0001-90' };
  const name = value.trim().replace(/^[@*]/, '');
  return { name: name.charAt(0).toUpperCase() + name.slice(1), roles: ['cliente', 'prestador'], cnpj: '12.345.678/0001-90' };
}

const KIND_ICON = { empresa: 'business-outline', fornecedor: 'cube-outline', cliente: 'person-outline' };

// initialMode e onBack: usados pelo site (a página de abertura abre direto em Entrar ou em Cadastre-se).
export default function LoginScreen({ initialMode, onBack } = {}) {
  useScreenSharePause(true, 'login');
  const [pendente, setPendente] = useState(null); // conta de aparelho novo: aguarda o reconhecimento facial
  const { dispatch } = useStore();
  const [mode, setMode] = useState(initialMode || 'entrar'); // entrar | cadastro
  const [help, setHelp] = useState(false); // suporte por mensagem, sem precisar entrar
  const [saved, setSaved] = useState([]);
  const [showForm, setShowForm] = useState(false); // com contas salvas, o formulário fica atrás de "Entrar com outra conta"
  const [value, setValue] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [esqueci, setEsqueci] = useState(false);
  const [pede2fa, setPede2fa] = useState(false); // conta com Google Authenticator: pede o código
  const [cod2fa, setCod2fa] = useState(''); // tela "Esqueci a senha"
  const passRef = useRef(null);
  const info = detect(value);

  // Voltar do celular: do Cadastro volta para Entrar; do formulário volta para as contas salvas.
  const backState = useRef({});
  backState.current = { mode, showForm, saved: saved.length };
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const b = backState.current;
      if (b.mode === 'cadastro') return setMode('entrar'), true;
      if (b.showForm && b.saved) return setShowForm(false), true;
      return false;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    getSavedUsers().then((list) => {
      setSaved(list);
      if (!list.length) setShowForm(true);
    });
  }, []);

  const onChange = (v) => {
    // Se a pessoa digita só números, formata como CPF ou CNPJ automaticamente.
    if (/^[\d.\-\/\s]*$/.test(v) && onlyDigits(v).length) {
      const d = onlyDigits(v);
      setValue(d.length > 11 ? formatCnpj(d) : formatCpf(d));
    } else setValue(v);
  };

  const hint = {
    vazio: '',
    incompleto: 'Continue digitando: CPF tem 11 números e CNPJ tem 14.',
    cpf: 'CPF reconhecido',
    cnpj: 'CNPJ reconhecido · acesso de empresa',
    usuario: 'Usuário',
    admin: 'Acesso do administrador',
    analista: 'Acesso de analista (só visualização)',
  }[info.kind];

  const login = async (user, loginText, keep) => {
    usarConta(user);
    if (keep) await saveUser(loginText, user).catch(() => {});
    dispatch({ type: 'LOGIN', user });
  };

  // Entrar digitando usuário e senha (e depois a biometria).
  const enter = async () => {
    if (info.kind === 'vazio' || info.kind === 'incompleto') {
      return Alert.alert('Confira o acesso', 'Digite seu usuário, CPF ou CNPJ.');
    }
    if (!password) {
      passRef.current && passRef.current.focus();
      return Alert.alert('Digite sua senha', 'A senha é pedida no primeiro acesso. Depois, se salvar o usuário, você entra só com a biometria.');
    }
    // Administrador e analista: entram pelo servidor (senha + Google Authenticator). Nada de senha no app.
    // Se a conta do servidor não for de admin/analista (ex.: mesmo nome de uma conta pessoal), segue a entrada normal.
    if ((info.kind === 'admin' || info.kind === 'analista') && serverOn()) {
      setBusy(true);
      try {
        setCodigo2fa(pede2fa ? cod2fa : null);
        const srv = await entrarNoServidor(value, password);
        const roles = (srv && srv.roles) || [];
        if (roles.includes('admin') || roles.includes('analista')) {
          const admin = roles.includes('admin');
          return dispatch({
            type: 'LOGIN',
            user: { name: admin ? 'Administrador' : 'Analista', roles: ['admin', 'cliente', 'empresa', 'prestador', 'fornecedor'], readOnly: !admin, serverId: srv.id, cnpj: '12.345.678/0001-90' },
          });
        }
      } catch (e) {
        if (e.code === 'codigo_2fa') {
          setPede2fa(true);
          return Alert.alert('Verificação em duas etapas', e.message);
        }
        if (e.status !== 401) return Alert.alert('Não foi possível entrar', e.message);
      } finally {
        setBusy(false);
      }
    }
    setBusy(true);
    try {
      const acc = await findAccount(value);
      let user;
      if (acc) {
        // Com o servidor, quem confere a senha é ele (a senha pode ter sido trocada pelo "Esqueci a senha").
        if (!serverOn() && !(await checkPassword(acc, password))) return Alert.alert('Não foi possível entrar', 'Usuário ou senha incorretos.');
        user = userFromAccount(acc);
      } else {
        user = demoUser(value, info); // conta de demonstração
      }
      // Servidor ligado: entra também no servidor (compras, carteira e pedidos de verdade).
      // Conta antiga só deste celular é criada lá na primeira entrada.
      let viaServidor = false;
      if (serverOn()) {
        try {
          setCodigo2fa(pede2fa ? cod2fa : null);
          const srv = await entrarOuMigrar(value, password, acc);
          viaServidor = !!srv;
          if (srv) {
            if (acc) {
              user = { ...user, serverId: srv.id };
              if (acc.serverId !== srv.id) await setServerId(acc.id, srv.id).catch(() => {});
            } else user = userFromServer(srv);
            // Os perfis (social, trabalho, empresa) vêm sempre do servidor.
            user = { ...user, roles: rolesDoServidor(srv), trabalho: srv.trabalho || [] };
          }
        } catch (e) {
          // Sem internet: entra no modo do celular (demonstração) e tenta o servidor na próxima entrada.
          // Conta com Google Authenticator: mostra o campo do código e espera a pessoa digitar.
          if (e.code === 'codigo_2fa') {
            setPede2fa(true);
            return Alert.alert('Verificação em duas etapas', e.message);
          }
          // As contas moram só no servidor (o mesmo banco para o app e o site). Sem servidor, não entra:
          // nada de conta "só neste celular", que depois não aparece para ninguém.
          if (e.status === 0) return Alert.alert('Sem ligação com o servidor', 'Confira a internet e tente de novo. Sua conta fica no servidor do Realyz, por isso é preciso estar conectado para entrar.');
          if (e.status === 401 && !acc) return Alert.alert('Não foi possível entrar', 'Usuário ou senha incorretos. Se ainda não tem conta, toque em "Cadastre-se".');
          return Alert.alert('Não foi possível entrar', e.message);
        }
      }
      // Aparelho já cadastrado (conta salva aqui): abre normal, sem biometria a cada entrada.
      // Conta sem biometria feita neste aparelho: a pessoa dona da conta faz o reconhecimento facial.
      const conhecido = (await getSavedUsers()).some((x) => x.key === savedKey(value));
      // No site não há o scan do aparelho: quem confere é o servidor (senha + rosto quando o navegador é novo).
      // Só pede o rosto aqui quando a conta TEM biometria e o servidor não conferiu (ele já confere o rosto
      // de aparelho novo). Conta sem biometria entra normal, no modo social: navega, publica e conversa,
      // e só faz a biometria quando for comprar ou contratar.
      if (!conhecido && Platform.OS !== 'web' && !viaServidor && user.verified !== false) return setPendente({ user, login: value, remember });
      await login(user, value, remember);
    } finally {
      setBusy(false);
    }
  };

  // Conta salva: um toque e a biometria.
  const quickEnter = async (s) => {
    setBusy(true);
    try {
      // Aparelho já cadastrado: entra direto, sem biometria. Serviços, compras e saques pedem biometria à parte.
      // Conta salva que nunca ligou no servidor: pede a senha uma vez para ligar (senão fica presa no modo do celular).
      if (serverOn() && !s.user.serverId && !s.user.readOnly && !(s.user.roles || []).includes('admin')) {
        setValue(s.login || s.key || '');
        setShowForm(true);
        return Alert.alert('Ligar sua conta ao Realyz', 'Digite sua senha uma vez para ligar esta conta ao servidor. Depois entra direto.');
      }
      await touchSavedUser(s.key).catch(() => {});
      usarConta(s.user);
      return dispatch({ type: 'LOGIN', user: s.user });
    } finally {
      setBusy(false);
    }
  };

  const remove = (s) =>
    Alert.alert('Remover deste aparelho?', `${s.user.name} vai precisar digitar usuário e senha da próxima vez. A conta continua existindo.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          const next = await forgetUser(s.key);
          setSaved(next);
          if (!next.length) setShowForm(true);
        },
      },
    ]);

  const openForm = () => {
    setValue('');
    setPassword('');
    setShowForm(true);
  };

  // Cadastro concluído: confirma a biometria (já feita no cadastro) e entra.
  const onSignedUp = async (account, keep) => {
    await login(userFromAccount(account), account.username, keep);
  };

  return (
    <KeyboardLift style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={{ alignSelf: 'flex-start', paddingVertical: 8, marginBottom: 8 }} accessibilityLabel="Voltar para a página inicial">
            <Text style={{ color: colors.muted, fontWeight: '700' }}>‹ Voltar</Text>
          </TouchableOpacity>
        ) : null}
        <View style={styles.brandBlock}>
          {/* Marca Realyz: o A unido à estrela dourada no fundo. */}
          <Image source={require('../../assets/wordmark-escuro.png')} style={styles.wordmark} resizeMode="contain" accessibilityLabel="Realyz" />
          <Text style={styles.headline}>Você no comando.</Text>
          <Text style={styles.tagline}>Pessoas reais. Negócios reais.</Text>
        </View>

        <View style={styles.tabs}>
          {[
            ['entrar', 'Entrar'],
            ['cadastro', 'Cadastre-se'],
          ].map(([k, label]) => (
            <TouchableOpacity key={k} style={[styles.tab, mode === k && styles.tabOn]} onPress={() => setMode(k)} activeOpacity={0.85}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.tabText, mode === k && styles.tabTextOn]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {mode === 'cadastro' ? (
          <SignupForm onDone={onSignedUp} onGoLogin={() => setMode('entrar')} />
        ) : !showForm && saved.length ? (
          <View style={styles.panel}>
            <Text style={styles.label}>Quem vai usar o Realyz?</Text>
            <Text style={styles.sub}>Contas salvas neste aparelho. Toque no seu nome para entrar.</Text>
            {saved.map((s) => {
              const icon = KIND_ICON[s.user.roles[0]] || 'person-outline';
              return (
                <TouchableOpacity key={s.key} style={styles.savedRow} onPress={() => quickEnter(s)} disabled={busy} activeOpacity={0.85}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{(s.user.name || '?')[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.savedName} numberOfLines={1}>{s.user.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                      <Ionicons name={icon} size={12} color={colors.muted} />
                      <Text style={styles.savedLogin}>{maskLogin(s.login)}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color={colors.primary} />
                  <TouchableOpacity onPress={() => remove(s)} style={styles.trash} hitSlop={8} accessibilityLabel={`Remover ${s.user.name} deste aparelho`}>
                    <Ionicons name="close" size={18} color={colors.muted} />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.otherBtn} onPress={openForm} activeOpacity={0.85}>
              <Ionicons name="person-add-outline" size={18} color={colors.primary} />
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.otherText}>Entrar com outra conta</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.panel}>
            <Text style={styles.label}>Usuário, CPF ou CNPJ</Text>
            <View style={styles.field}>
              <Ionicons name="person-outline" size={20} color={colors.muted} />
              <TextInput
                style={styles.input}
                placeholder="Digite seu usuário, CPF ou CNPJ"
                placeholderTextColor={colors.muted}
                value={value}
                testID="login_usuario"
                nativeID="login_usuario"
                onChangeText={onChange}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                returnKeyType="next"
                onSubmitEditing={() => passRef.current && passRef.current.focus()}
              />
            </View>
            {hint ? (
              <Text style={[styles.hint, (info.kind === 'cpf' || info.kind === 'cnpj') && { color: colors.primary }]}>{hint}</Text>
            ) : null}

            <Text style={[styles.label, { marginTop: 14 }]}>Senha</Text>
            <View style={styles.field}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.muted} />
              <TextInput
                ref={passRef}
                testID="login_senha"
                nativeID="login_senha"
                style={styles.input}
                placeholder="Sua senha"
                placeholderTextColor={colors.muted}
                secureTextEntry={!showPass}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                autoComplete="password"
                returnKeyType="go"
                onSubmitEditing={enter}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} hitSlop={8} accessibilityLabel={showPass ? 'Esconder senha' : 'Mostrar senha'}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
              </TouchableOpacity>
            </View>
            {pede2fa ? (
              <View style={[styles.field, { marginTop: 10 }]}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.muted} />
                <TextInput
                  style={styles.input}
                  value={cod2fa}
                  onChangeText={(v) => setCod2fa(v.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  placeholder="Código do Google Authenticator"
                  placeholderTextColor={colors.muted}
                  onSubmitEditing={enter}
                />
              </View>
            ) : null}

            {info.kind !== 'admin' && info.kind !== 'analista' ? (
              <TouchableOpacity style={styles.check} onPress={() => setRemember(!remember)} activeOpacity={0.8}>
                <Ionicons name={remember ? 'checkbox' : 'square-outline'} size={22} color={remember ? colors.primary : colors.muted} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.checkText}>Salvar usuário neste aparelho</Text>
                  <Text style={styles.checkSub}>Da próxima vez, é só tocar no seu nome.</Text>
                </View>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity testID="login_entrar" nativeID="login_entrar" style={[styles.btn, busy && { opacity: 0.6 }]} onPress={enter} disabled={busy} activeOpacity={0.85}>
              <Ionicons name="log-in-outline" size={20} color={colors.onPrimary} />
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.btnText}>{busy ? 'Verificando…' : 'Entrar'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.link} onPress={() => setEsqueci(true)} accessibilityLabel="Esqueci a senha">
              <Ionicons name="key-outline" size={16} color={colors.accent} />
              <Text numberOfLines={1} style={styles.linkText}>Esqueci a senha</Text>
            </TouchableOpacity>
            <EsqueciSenha
              visible={esqueci}
              loginInicial={value}
              onClose={() => setEsqueci(false)}
              onPronto={(l) => {
                setValue(l);
                setPassword('');
              }}
            />

            {saved.length ? (
              <TouchableOpacity style={styles.link} onPress={() => setShowForm(false)}>
                <Ionicons name="people-outline" size={16} color={colors.accent} />
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.linkText}>Voltar para as contas salvas ({saved.length})</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.link} onPress={() => setMode('cadastro')}>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.linkText}>Ainda não tem conta? Cadastre-se</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {/* Não consegue entrar? O suporte atende por mensagem, mesmo sem a pessoa estar na conta. */}
        <TouchableOpacity style={[styles.link, { marginTop: 14 }]} onPress={() => setHelp(true)} accessibilityLabel="Não consigo entrar. Falar com o suporte por mensagem">
          <Ionicons name="headset-outline" size={16} color={colors.muted} />
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.linkText, { color: colors.muted }]}>Não consigo entrar · Falar com o suporte</Text>
        </TouchableOpacity>
      </ScrollView>
      <SupportCenter visible={help} onClose={() => setHelp(false)} />
      <ScanFacial
        visible={!!pendente}
        title="Reconhecimento facial da conta"
        onFrames={async () => {
          const p = pendente;
          setPendente(null);
          if (p) await login(p.user, p.login, p.remember);
        }}
        onClose={() => setPendente(null)}
      />
    </KeyboardLift>
  );
}

const styles = StyleSheet.create({
  ...authStyles,
  wrap: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  brandBlock: { alignItems: 'center', marginBottom: 28 },
  mark: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(168,121,10,0.5)',
    backgroundColor: 'rgba(168,121,10,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 8,
  },
  wordmark: { width: 230, height: 71, marginBottom: 6 },
  logo: { fontSize: 36, fontWeight: '700', color: colors.text, letterSpacing: 8 },
  headline: { fontSize: 30, color: colors.text, fontWeight: '800', marginTop: 18, letterSpacing: -0.5, textAlign: 'center' },
  tagline: { fontSize: 17, color: colors.accent, fontWeight: '700', marginTop: 6 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.cardAlt,
    borderRadius: 16,
    padding: 4,
    marginBottom: 14,
  },
  tab: { flex: 1, minHeight: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: colors.card, borderWidth: 1, borderColor: 'rgba(168,121,10,0.35)' },
  tabText: { color: colors.muted, fontWeight: '700', fontSize: 15 },
  tabTextOn: { color: colors.primary },
  sub: { color: colors.muted, fontSize: 12, marginTop: -4, marginBottom: 12 },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    marginBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: colors.onPrimary, fontWeight: '800', fontSize: 18 },
  savedName: { color: colors.text, fontWeight: '700', fontSize: 16 },
  savedLogin: { color: colors.muted, fontSize: 12, marginLeft: 4 },
  trash: { marginLeft: 10, padding: 4 },
  otherBtn: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  otherText: { color: colors.primary, fontWeight: '700', fontSize: 15, marginLeft: 8 },
});
