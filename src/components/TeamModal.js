// Equipe: funcionários e classes (funções) da empresa, para o atendimento direcionado.
// Lista › tocar no nome abre uma tela só do funcionário, com todos os controles dele.
// Quem cria os perfis é o empresário: a empresa responde por eles e cada um precisa da biometria
// cadastrada para poder atender.
import React, { useEffect, useState } from 'react';
import { KeyboardLift } from '../keyboard';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView, Switch, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { colors, soft } from '../theme';
import ScanFacial from './ScanFacial';
import { CRM_ORIGINS } from '../crm';
import { useTeam, PERMS, roleOf, memberOf, memberPerms, roleAdd, roleUpdate, roleRemove, memberAdd, memberUpdate, memberRemove } from '../team';

function Head({ title, onBack }) {
  return (
    <View style={st.head}>
      <TouchableOpacity onPress={onBack} style={st.back} accessibilityLabel="Voltar">
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={st.title} numberOfLines={1}>{title}</Text>
    </View>
  );
}
const Toggle = ({ label, hint, value, onChange }) => (
  <View style={st.toggle}>
    <View style={{ flex: 1, marginRight: 10 }}>
      <Text style={{ color: colors.text, fontWeight: '700' }}>{label}</Text>
      {hint ? <Text style={{ color: colors.muted, fontSize: 12, marginTop: 1 }}>{hint}</Text> : null}
    </View>
    <Switch value={!!value} onValueChange={onChange} trackColor={{ true: colors.primary }} />
  </View>
);

export default function TeamModal({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const team = useTeam();
  const [seg, setSeg] = useState('equipe'); // equipe · classes
  const [memberId, setMemberId] = useState(null);
  const [roleId, setRoleId] = useState(null);
  const [adding, setAdding] = useState(false);
  const member = memberId ? memberOf(memberId) : null;
  const role = roleId ? roleOf(roleId) : null;
  const back = () => (member ? setMemberId(null) : role ? setRoleId(null) : adding ? setAdding(false) : onClose());

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={back}><KeyboardLift style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <Head title={member ? member.name : role ? `Classe: ${role.name}` : adding ? 'Novo funcionário' : 'Equipe'} onBack={back} />
        {member ? (
          <MemberEdit member={member} bottom={insets.bottom} onRemoved={() => setMemberId(null)} />
        ) : role ? (
          <RoleEdit role={role} bottom={insets.bottom} onRemoved={() => setRoleId(null)} />
        ) : adding ? (
          <MemberNew bottom={insets.bottom} onCreated={(m) => { setAdding(false); setMemberId(m.id); }} />
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 + insets.bottom }}>
            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
              {[['equipe', 'Funcionários'], ['classes', 'Classes']].map(([k, label]) => (
                <TouchableOpacity key={k} style={[st.seg, seg === k && st.segOn]} onPress={() => setSeg(k)}>
                  <Text numberOfLines={1} style={{ color: seg === k ? colors.text : colors.menu, fontWeight: seg === k ? '800' : '700' }}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {seg === 'equipe' ? (
              <>
                <Text style={st.note}>Toque no nome para abrir os controles do funcionário. Cliente novo vai sozinho para quem atende aquela origem e está mais livre.</Text>
                {team.members.map((m) => {
                  const r = roleOf(m.roleId);
                  return (
                    <TouchableOpacity key={m.id} style={st.row} onPress={() => setMemberId(m.id)} accessibilityLabel={`Editar ${m.name}`}>
                      <View style={st.avatar}><Text style={{ color: colors.text, fontWeight: '800' }}>{m.name.charAt(0)}</Text></View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={{ color: colors.text, fontWeight: '800' }} numberOfLines={1}>{m.name}</Text>
                        <Text style={{ color: colors.muted, fontSize: 12.5 }} numberOfLines={1}>{r ? r.name : 'Sem classe'}{!m.active ? ' · desligado' : m.receives ? ' · recebe clientes novos' : ''}</Text>
                      </View>
                      {m.bio ? <Ionicons name="shield-checkmark" size={17} color={colors.primary} /> : <Text style={st.warn}>Sem biometria</Text>}
                      <Ionicons name="chevron-forward" size={17} color={colors.muted} style={{ marginLeft: 6 }} />
                    </TouchableOpacity>
                  );
                })}
                {!team.members.length ? <Text style={st.empty}>Nenhum funcionário ainda.</Text> : null}
                <TouchableOpacity style={st.btn} onPress={() => setAdding(true)} accessibilityLabel="Novo funcionário">
                  <Ionicons name="person-add-outline" size={17} color="#fff" />
                  <Text numberOfLines={1} style={st.btnText}>Novo funcionário</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={st.note}>Classes são as funções da sua empresa. Estas são exemplos: renomeie, altere, apague ou crie as suas.</Text>
                {team.roles.map((r) => (
                  <TouchableOpacity key={r.id} style={st.row} onPress={() => setRoleId(r.id)} accessibilityLabel={`Editar a classe ${r.name}`}>
                    <Ionicons name="pricetag-outline" size={19} color={colors.menu} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={{ color: colors.text, fontWeight: '800' }} numberOfLines={1}>{r.name}</Text>
                      <Text style={{ color: colors.muted, fontSize: 12.5 }} numberOfLines={1}>{r.desc || 'Sem descrição'} · {team.members.filter((m) => m.roleId === r.id).length} pessoa(s)</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={17} color={colors.muted} />
                  </TouchableOpacity>
                ))}
                <NewRole onCreated={(r) => setRoleId(r.id)} />
              </>
            )}
          </ScrollView>
        )}
      </View>
    </KeyboardLift></Modal>
  );
}

function NewRole({ onCreated }) {
  const [name, setName] = useState('');
  return (
    <View style={{ flexDirection: 'row', marginTop: 6 }}>
      <TextInput value={name} onChangeText={setName} placeholder="Nome da nova classe (ex.: Estoque)" placeholderTextColor={colors.muted} maxLength={24} style={[st.field, { flex: 1, marginTop: 0 }]} />
      <TouchableOpacity style={[st.btn, { marginTop: 0, marginLeft: 8, paddingHorizontal: 16 }]} onPress={() => { const n = name.trim(); if (!n) return; setName(''); onCreated(roleAdd(n)); }} accessibilityLabel="Criar classe">
        <Text numberOfLines={1} style={[st.btnText, { marginLeft: 0 }]}>Criar</Text>
      </TouchableOpacity>
    </View>
  );
}

// Criar o perfil do funcionário (feito pelo empresário, que assume a responsabilidade por ele).
function MemberNew({ bottom, onCreated }) {
  const team = useTeam();
  const [name, setName] = useState('');
  const [roleId, setRoleId] = useState(team.roles[0] ? team.roles[0].id : null);
  const [ok, setOk] = useState(false);
  const create = () => {
    if (name.trim().length < 3) return Alert.alert('Falta o nome', 'Escreva o nome completo do funcionário.');
    if (!ok) return Alert.alert('Falta confirmar', 'Marque que a empresa é responsável por este funcionário.');
    const m = memberAdd(name.trim(), roleId);
    memberUpdate(m.id, { responsibleAt: Date.now(), bio: false, receives: false });
    onCreated(m);
  };
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 + bottom }} keyboardShouldPersistTaps="handled">
      <Text style={st.label}>Nome completo</Text>
      <TextInput value={name} onChangeText={setName} placeholder="Nome do funcionário" placeholderTextColor={colors.muted} maxLength={50} style={[st.field, { marginTop: 0 }]} />
      <Text style={st.label}>Classe</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {team.roles.map((r) => (
          <TouchableOpacity key={r.id} style={[st.chip, roleId === r.id && st.chipOn]} onPress={() => setRoleId(r.id)}>
            <Text numberOfLines={1} style={[st.chipText, roleId === r.id && { color: '#fff' }]}>{r.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={st.check} onPress={() => setOk(!ok)} activeOpacity={0.8} accessibilityLabel="A empresa é responsável por este funcionário">
        <Ionicons name={ok ? 'checkbox' : 'square-outline'} size={22} color={ok ? colors.primary : colors.muted} />
        <Text style={{ color: colors.text, flex: 1, marginLeft: 10, lineHeight: 19 }}>A empresa é responsável por este funcionário e pelo que ele fizer no atendimento pelo Realyz.</Text>
      </TouchableOpacity>
      <TouchableOpacity style={st.btn} onPress={create} accessibilityLabel="Criar perfil do funcionário">
        <Text numberOfLines={1} style={[st.btnText, { marginLeft: 0 }]}>Criar perfil</Text>
      </TouchableOpacity>
      <Text style={st.note}>Depois de criar, cadastre a biometria do funcionário. Sem ela, ele não atende clientes.</Text>
    </ScrollView>
  );
}

// Tela só do funcionário: todos os controles dele.
function MemberEdit({ member: m, bottom, onRemoved }) {
  const team = useTeam();
  const [name, setName] = useState(m.name);
  const [scan, setScan] = useState(false);
  useEffect(() => setName(m.name), [m.id]);
  const perms = memberPerms(m);
  const custom = !!m.perms;
  const setPerm = (key, v) => memberUpdate(m.id, { perms: { ...perms, [key]: v } });
  const toggleOrigin = (o) => memberUpdate(m.id, { origins: (m.origins || []).includes(o) ? m.origins.filter((x) => x !== o) : [...(m.origins || []), o] });
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 + bottom }} keyboardShouldPersistTaps="handled">
      {/* Biometria do funcionário */}
      <View style={[st.bio, m.bio && { borderColor: colors.primary }]}>
        <Ionicons name={m.bio ? 'shield-checkmark' : 'finger-print'} size={22} color={m.bio ? colors.primary : colors.text} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ color: colors.text, fontWeight: '800' }}>{m.bio ? 'Biometria cadastrada' : 'Biometria não cadastrada'}</Text>
          <Text style={{ color: colors.muted, fontSize: 12.5, marginTop: 1 }}>{m.bio ? `Perfil Realyz ${m.username ? `*${m.username}` : 'criado'}, ligado à empresa como funcionário.` : 'Sem a biometria, ele não pode atender clientes. Ao cadastrar, o perfil dele é criado e ligado à empresa.'}</Text>
        </View>
        {!m.bio ? (
          <TouchableOpacity style={st.small} onPress={() => setScan(true)} accessibilityLabel="Cadastrar a biometria do funcionário">
            <Text numberOfLines={1} style={{ color: '#fff', fontWeight: '800', fontSize: 12.5 }}>Cadastrar</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <ScanFacial
        visible={scan}
        title={`Biometria de ${m.name.split(' ')[0]}`}
        onClose={() => setScan(false)}
        onFrames={() => {
          setScan(false);
          // Com a biometria feita, nasce o perfil Realyz do funcionário, já ligado à empresa.
          const username = m.username || `${m.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '').slice(0, 18)}.${String(Date.now()).slice(-3)}`;
          memberUpdate(m.id, { bio: true, bioAt: Date.now(), username });
          Alert.alert('Biometria cadastrada ✅', `Perfil @${username} criado e ligado à empresa como funcionário. ${m.name.split(' ')[0]} já pode atender clientes.`);
        }}
      />

      <Text style={st.label}>Nome</Text>
      <TextInput value={name} onChangeText={setName} onEndEditing={() => name.trim() && memberUpdate(m.id, { name: name.trim() })} maxLength={50} style={[st.field, { marginTop: 0 }]} />

      <Text style={st.label}>Classe</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {team.roles.map((r) => (
          <TouchableOpacity key={r.id} style={[st.chip, m.roleId === r.id && st.chipOn]} onPress={() => memberUpdate(m.id, { roleId: r.id, perms: null })}>
            <Text numberOfLines={1} style={[st.chipText, m.roleId === r.id && { color: '#fff' }]}>{r.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={st.label}>Atendimento</Text>
      <View style={st.box}>
        <Toggle label="Ativo" hint="Desligado, ele não entra no atendimento" value={m.active} onChange={(v) => memberUpdate(m.id, { active: v })} />
        <Toggle label="Recebe clientes novos" hint={m.bio ? 'Entra na distribuição automática' : 'Liberado depois da biometria'} value={m.receives && m.bio} onChange={(v) => (m.bio ? memberUpdate(m.id, { receives: v }) : Alert.alert('Falta a biometria', 'Cadastre a biometria do funcionário para ele receber clientes.'))} />
      </View>
      <Text style={st.label}>Atende clientes que chegam por</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {CRM_ORIGINS.map((o) => {
          const on = (m.origins || []).includes(o);
          return (
            <TouchableOpacity key={o} style={[st.chip, on && st.chipOn]} onPress={() => toggleOrigin(o)}>
              <Text numberOfLines={1} style={[st.chipText, on && { color: '#fff' }]}>{o}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={st.hint}>{(m.origins || []).length ? 'Recebe primeiro os clientes dessas origens.' : 'Nenhuma marcada: atende de qualquer origem.'}</Text>

      <Text style={st.label}>O que pode fazer{custom ? ' (ajustado só para ele)' : ' (igual à classe)'}</Text>
      <View style={st.box}>
        {PERMS.map((p) => (
          <Toggle key={p.key} label={p.label} hint={p.hint} value={perms[p.key]} onChange={(v) => setPerm(p.key, v)} />
        ))}
      </View>
      {custom ? (
        <TouchableOpacity style={{ paddingVertical: 10, alignItems: 'center' }} onPress={() => memberUpdate(m.id, { perms: null })}>
          <Text style={{ color: colors.muted, fontWeight: '700' }}>Voltar às permissões da classe</Text>
        </TouchableOpacity>
      ) : null}

      <Text style={st.note}>A empresa é responsável por este funcionário e pelo que ele fizer no atendimento pelo Realyz.</Text>
      <TouchableOpacity style={{ paddingVertical: 16, alignItems: 'center' }} onPress={() => Alert.alert(`Tirar ${m.name} da equipe?`, 'Os atendimentos dele ficam sem responsável.', [{ text: 'Voltar', style: 'cancel' }, { text: 'Tirar', style: 'destructive', onPress: () => { memberRemove(m.id); onRemoved(); } }])}>
        <Text style={{ color: colors.danger || '#C0392B', fontWeight: '700' }}>Tirar da equipe</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// Tela da classe: renomear, descrever, permissões padrão e apagar.
function RoleEdit({ role: r, bottom, onRemoved }) {
  const [name, setName] = useState(r.name);
  const [desc, setDesc] = useState(r.desc || '');
  useEffect(() => { setName(r.name); setDesc(r.desc || ''); }, [r.id]);
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 + bottom }} keyboardShouldPersistTaps="handled">
      <Text style={st.label}>Nome da classe</Text>
      <TextInput value={name} onChangeText={setName} onEndEditing={() => name.trim() && roleUpdate(r.id, { name: name.trim() })} maxLength={24} style={[st.field, { marginTop: 0 }]} />
      <Text style={st.label}>O que essa classe faz</Text>
      <TextInput value={desc} onChangeText={setDesc} onEndEditing={() => roleUpdate(r.id, { desc: desc.trim() })} placeholder="Ex.: cuida do primeiro contato" placeholderTextColor={colors.muted} maxLength={60} style={[st.field, { marginTop: 0 }]} />
      <Text style={st.label}>Permissões padrão da classe</Text>
      <View style={st.box}>
        <Toggle label="Recebe clientes novos" hint="Vale para quem entrar nessa classe" value={r.receives} onChange={(v) => roleUpdate(r.id, { receives: v })} />
        {PERMS.map((p) => (
          <Toggle key={p.key} label={p.label} hint={p.hint} value={r.perms[p.key]} onChange={(v) => roleUpdate(r.id, { perms: { ...r.perms, [p.key]: v } })} />
        ))}
      </View>
      <TouchableOpacity style={{ paddingVertical: 16, alignItems: 'center' }} onPress={() => Alert.alert(`Apagar a classe "${r.name}"?`, 'Os funcionários dela continuam na equipe, sem classe.', [{ text: 'Voltar', style: 'cancel' }, { text: 'Apagar', style: 'destructive', onPress: () => { roleRemove(r.id); onRemoved(); } }])}>
        <Text style={{ color: colors.danger || '#C0392B', fontWeight: '700' }}>Apagar classe</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 8 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontWeight: '800', fontSize: 18, marginLeft: 2, flex: 1 },
  seg: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  segOn: { borderBottomColor: colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, padding: 12, marginBottom: 8, ...soft },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' },
  warn: { color: colors.primary, fontWeight: '800', fontSize: 11 },
  note: { color: colors.muted, fontSize: 12.5, lineHeight: 18, marginBottom: 10, marginTop: 6 },
  hint: { color: colors.muted, fontSize: 12, marginTop: 2 },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 20 },
  label: { color: colors.muted, fontWeight: '700', fontSize: 12, marginTop: 16, marginBottom: 6 },
  field: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, marginTop: 8 },
  chip: { paddingHorizontal: 12, minHeight: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', marginRight: 6, marginBottom: 6 },
  chipOn: { backgroundColor: colors.text, borderColor: colors.text },
  chipText: { color: colors.text, fontWeight: '700', fontSize: 12.5 },
  btn: { flexDirection: 'row', minHeight: 46, borderRadius: 12, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingHorizontal: 12 },
  btnText: { color: '#fff', fontWeight: '800', marginLeft: 6 },
  check: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 16 },
  box: { backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border },
  toggle: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  bio: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.borderStrong },
  small: { minHeight: 34, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' },
});
