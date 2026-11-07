import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { authStyles } from './authStyles';
import {
  onlyDigits,
  formatCpf,
  formatCnpj,
  formatPhone,
  validCpf,
  validCnpj,
  validEmail,
  cleanUsername,
  usernameProblem,
  passwordProblem,
  createAccount,
  ageFromBirth,
  confirmBiometric,
} from '../accounts';
import TermoAdesaoModal from '../components/TermoAdesaoModal';
import { ProfileQuiz } from '../components/SocialClass';
import { classifyProfile } from '../socialClasses';

// Cadastro de clientes (CPF) e empresas (CNPJ). A biometria confirma que é uma pessoa real
// antes de criar a conta.
export default function SignupForm({ onDone, onGoLogin }) {
  const [kind, setKind] = useState('pessoa'); // pessoa | empresa
  const [name, setName] = useState('');
  const [doc, setDoc] = useState('');
  const [birth, setBirth] = useState(''); // DD/MM/AAAA: o Realys é só para maiores de 18
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [terms, setTerms] = useState(false);
  const [termoOpen, setTermoOpen] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [quiz, setQuiz] = useState({ about: '', work: '', hobbies: [] }); // questionário do perfil social
  const refs = { doc: useRef(), username: useRef(), email: useRef(), phone: useRef(), password: useRef(), confirm: useRef() };
  const next = (k) => () => refs[k].current && refs[k].current.focus();

  const empresa = kind === 'empresa';
  const docDigits = onlyDigits(doc);
  const docFull = docDigits.length === (empresa ? 14 : 11);
  const docOk = empresa ? validCnpj(doc) : validCpf(doc);

  const switchKind = (k) => {
    setKind(k);
    setDoc('');
  };

  const problems = () => {
    if (name.trim().length < 3) return empresa ? 'Digite o nome da empresa.' : 'Digite seu nome completo.';
    if (!empresa && name.trim().split(/\s+/).length < 2) return 'Digite nome e sobrenome.';
    if (!docOk) return empresa ? 'CNPJ inválido. Confira os números.' : 'CPF inválido. Confira os números.';
    if (!empresa) {
      const age = ageFromBirth(birth);
      if (age == null) return 'Digite sua data de nascimento (dia/mês/ano).';
      if (age < 18) return 'O Realys é só para maiores de 18 anos.';
    }
    const u = usernameProblem(username);
    if (u) return u;
    if (!validEmail(email)) return 'Digite um e-mail válido.';
    if (onlyDigits(phone).length < 10) return 'Digite o celular com DDD.';
    const p = passwordProblem(password);
    if (p) return p;
    if (password !== confirm) return 'As senhas não são iguais.';
    if (!terms) return 'Para continuar, leia e aceite o Termo de Adesão.';
    return null;
  };

  const submit = async () => {
    const err = problems();
    if (err) return Alert.alert('Confira o cadastro', err);
    setBusy(true);
    try {
      const bio = await confirmBiometric('Confirme sua biometria para criar a conta Realys');
      if (bio === 'falhou') return Alert.alert('Biometria não confirmada', 'A conta só é criada depois de confirmar que é você.');
      // Pessoa: o perfil social sai do questionário (Gamer, Artista, Estudante...).
      const social = empresa ? null : quiz.manual && quiz.social ? quiz.social : classifyProfile(`${quiz.about} ${quiz.work}`, quiz.hobbies);
      const { account, error } = await createAccount({ kind, name, doc, username, email, phone, password, birth: empresa ? null : birth, social, about: empresa ? '' : quiz.about, work: empresa ? '' : quiz.work });
      if (error) return Alert.alert('Não foi possível cadastrar', error);
      Alert.alert(
        'Conta criada!',
        bio === 'sem'
          ? `Bem-vindo ao Realys, ${account.name.split(' ')[0]}. Este celular não tem biometria cadastrada: cadastre a digital ou o rosto nas configurações para a verificação completa.`
          : `Bem-vindo ao Realys, ${account.name.split(' ')[0]}. Sua identidade foi confirmada pela biometria.`,
        [{ text: 'Entrar', onPress: () => onDone(account, remember) }]
      );
    } finally {
      setBusy(false);
    }
  };

  const Field = ({ icon, label, children, help, ok }) => (
    <View style={{ marginTop: 14 }}>
      <Text style={authStyles.label}>{label}</Text>
      <View style={[authStyles.field, ok === false && { borderColor: colors.danger }, ok === true && { borderColor: colors.success }]}>
        <Ionicons name={icon} size={20} color={colors.muted} />
        {children}
        {ok === true ? <Ionicons name="checkmark-circle" size={20} color={colors.success} /> : null}
      </View>
      {help ? <Text style={[authStyles.hint, ok === false && { color: colors.danger }]}>{help}</Text> : null}
    </View>
  );

  const userProblem = username ? usernameProblem(username) : null;

  return (
    <View style={authStyles.panel}>
      <Text style={authStyles.label}>Tipo de conta</Text>
      <View style={styles.kinds}>
        {[
          ['pessoa', 'person-outline', 'Pessoa', 'CPF · cliente e prestador'],
          ['empresa', 'business-outline', 'Empresa', 'CNPJ · loja e fornecedor'],
        ].map(([k, icon, title, sub]) => (
          <TouchableOpacity key={k} style={[styles.kind, kind === k && styles.kindOn]} onPress={() => switchKind(k)} activeOpacity={0.85}>
            <Ionicons name={icon} size={22} color={kind === k ? colors.primary : colors.muted} />
            <Text style={[styles.kindTitle, kind === k && { color: colors.primary }]}>{title}</Text>
            <Text style={styles.kindSub}>{sub}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Os campos são chamados como função para o teclado não fechar a cada letra. */}
      {Field({
        icon: empresa ? 'storefront-outline' : 'person-outline',
        label: empresa ? 'Nome da empresa' : 'Nome completo',
        children: (
          <TextInput
            style={authStyles.input}
            placeholder={empresa ? 'Como a empresa aparece no Realys' : 'Seu nome e sobrenome'}
            placeholderTextColor={colors.muted}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={next('doc')}
          />
        ),
      })}

      {Field({
        icon: 'card-outline',
        label: empresa ? 'CNPJ' : 'CPF',
        ok: docFull ? docOk : undefined,
        help: docFull && !docOk ? `${empresa ? 'CNPJ' : 'CPF'} inválido. Confira os números.` : 'Usado só para confirmar que a conta é real.',
        children: (
          <TextInput
            ref={refs.doc}
            style={authStyles.input}
            placeholder={empresa ? '00.000.000/0000-00' : '000.000.000-00'}
            placeholderTextColor={colors.muted}
            value={doc}
            onChangeText={(v) => setDoc(empresa ? formatCnpj(onlyDigits(v)) : formatCpf(onlyDigits(v)))}
            keyboardType="number-pad"
            returnKeyType="next"
            onSubmitEditing={next('username')}
          />
        ),
      })}

      {empresa
        ? null
        : Field({
            icon: 'calendar-outline',
            label: 'Data de nascimento',
            ok: birth.length === 10 ? ageFromBirth(birth) >= 18 : undefined,
            help:
              birth.length === 10 && ageFromBirth(birth) == null
                ? 'Data inválida.'
                : birth.length === 10 && ageFromBirth(birth) < 18
                ? 'O Realys é só para maiores de 18 anos.'
                : 'O Realys é só para maiores de 18 anos.',
            children: (
              <TextInput
                style={authStyles.input}
                placeholder="DD/MM/AAAA"
                placeholderTextColor={colors.muted}
                value={birth}
                onChangeText={(v) => {
                  const d = v.replace(/\D/g, '').slice(0, 8);
                  setBirth([d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean).join('/'));
                }}
                keyboardType="number-pad"
                maxLength={10}
                returnKeyType="next"
              />
            ),
          })}

      {Field({
        icon: 'at-outline',
        label: 'Usuário',
        ok: username ? !userProblem : undefined,
        help: userProblem || (username ? `Você também pode entrar com @${cleanUsername(username)}` : 'Seu nome na rede, ex.: maria.silva'),
        children: (
          <TextInput
            ref={refs.username}
            style={authStyles.input}
            placeholder="maria.silva"
            placeholderTextColor={colors.muted}
            value={username}
            onChangeText={(v) => setUsername(v.replace(/\s/g, '').toLowerCase())}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={next('email')}
          />
        ),
      })}

      {Field({
        icon: 'mail-outline',
        label: 'E-mail',
        children: (
          <TextInput
            ref={refs.email}
            style={authStyles.input}
            placeholder="voce@email.com"
            placeholderTextColor={colors.muted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            returnKeyType="next"
            onSubmitEditing={next('phone')}
          />
        ),
      })}

      {Field({
        icon: 'call-outline',
        label: 'Celular',
        children: (
          <TextInput
            ref={refs.phone}
            style={authStyles.input}
            placeholder="(11) 98765-4321"
            placeholderTextColor={colors.muted}
            value={phone}
            onChangeText={(v) => setPhone(formatPhone(v))}
            keyboardType="phone-pad"
            returnKeyType="next"
            onSubmitEditing={next('password')}
          />
        ),
      })}

      {Field({
        icon: 'lock-closed-outline',
        label: 'Senha',
        help: 'Mínimo de 8 caracteres, com letras e números.',
        ok: password ? !passwordProblem(password) : undefined,
        children: (
          <>
            <TextInput
              ref={refs.password}
              style={authStyles.input}
              placeholder="Crie uma senha"
              placeholderTextColor={colors.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              autoCapitalize="none"
              autoComplete="password-new"
              returnKeyType="next"
              onSubmitEditing={next('confirm')}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)} hitSlop={8} style={{ marginRight: 6 }}>
              <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
            </TouchableOpacity>
          </>
        ),
      })}

      {Field({
        icon: 'lock-closed-outline',
        label: 'Confirmar senha',
        ok: confirm ? confirm === password : undefined,
        help: confirm && confirm !== password ? 'As senhas não são iguais.' : null,
        children: (
          <TextInput
            ref={refs.confirm}
            style={authStyles.input}
            placeholder="Repita a senha"
            placeholderTextColor={colors.muted}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry={!showPass}
            autoCapitalize="none"
            returnKeyType="done"
          />
        ),
      })}

      {/* Questionário do perfil social (só para pessoas; empresas têm perfil empresarial). */}
      {empresa ? null : <ProfileQuiz value={quiz} onChange={setQuiz} />}

      <TouchableOpacity style={authStyles.check} onPress={() => setTerms(!terms)} activeOpacity={0.8}>
        <Ionicons name={terms ? 'checkbox' : 'square-outline'} size={22} color={terms ? colors.primary : colors.muted} />
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={authStyles.checkText}>Li e aceito o Termo de Adesão ao Realys</Text>
          <Text style={authStyles.checkSub}>Uma pessoa, uma conta. Inclui as regras de reconhecimento facial e de documentos.</Text>
          <TouchableOpacity onPress={() => setTermoOpen(true)} hitSlop={8} accessibilityLabel="Ler o termo de adesão">
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12, marginTop: 4 }}>Ler o termo completo ›</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
      <TermoAdesaoModal visible={termoOpen} onClose={() => setTermoOpen(false)} />

      <TouchableOpacity style={authStyles.check} onPress={() => setRemember(!remember)} activeOpacity={0.8}>
        <Ionicons name={remember ? 'checkbox' : 'square-outline'} size={22} color={remember ? colors.primary : colors.muted} />
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={authStyles.checkText}>Salvar usuário neste aparelho</Text>
          <Text style={authStyles.checkSub}>Desmarque se o celular é compartilhado e você não quer ficar salvo nele.</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={[authStyles.btn, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy} activeOpacity={0.85}>
        <Ionicons name="finger-print" size={20} color={colors.onPrimary} />
        <Text style={authStyles.btnText}>{busy ? 'Criando conta…' : 'Criar conta com biometria'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={authStyles.link} onPress={onGoLogin}>
        <Text style={authStyles.linkText}>Já tem conta? Entrar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  kinds: { flexDirection: 'row', marginHorizontal: -4 },
  kind: {
    flex: 1,
    marginHorizontal: 4,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  kindOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  kindTitle: { color: colors.text, fontWeight: '700', fontSize: 15, marginTop: 6 },
  kindSub: { color: colors.muted, fontSize: 11, marginTop: 2 },
});
