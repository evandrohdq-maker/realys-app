// Peças das salas pagas e grátis, usadas na Arena Gamer e no Hub de Negócios:
//   PlanosSheet   – Grátis, Premium e Empresarial
//   SalaConfig    – senha, limite, exposta ou escondida, moderada, classes e painel personalizado
//   SalaPainel    – o painel personalizado (Empresarial) no topo da sala
//   ModeracaoSheet – admin e moderadores: mudar classe, silenciar, remover e banir
//   EntrarComId   – achar uma sala pelo ID (mesmo escondida) e entrar, com senha se tiver
//   SenhaSheet    – pede a senha antes de entrar
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert, Share, Linking, Switch } from 'react-native';
import { Text, TextInput } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import {
  SALA_PLANOS, LIMITES, PAINEL_CORES, FREE_SENHA_MAX, useSalaPlano, setSalaPlano, isPago, temPainel, ajustaCfg,
  cargoDe, ehAdmin, ehMod, podeEntrar, normId,
} from '../salaPlanos';

const brl = (v) => 'R$ ' + v.toFixed(2).replace('.', ',');

function Sheet({ open, onClose, title, children, footer }) {
  return (
    <Modal visible={!!open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={st.back}>
        <View style={st.sheet}>
          <View style={st.head}>
            <Text style={st.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Fechar" style={st.x}>
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ paddingBottom: 6 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer}
        </View>
      </View>
    </Modal>
  );
}

function Lock({ on, label }) {
  return on ? null : (
    <View style={st.lock}>
      <Ionicons name="lock-closed" size={11} color={colors.primaryDark} />
      <Text style={st.lockText}>{label}</Text>
    </View>
  );
}

// ---------- Planos ----------
export function PlanosSheet({ open, onClose }) {
  const plano = useSalaPlano();
  const pick = (p) => {
    if (p === plano) return;
    const P = SALA_PLANOS[p];
    Alert.alert(
      p === 'gratis' ? 'Voltar para o Grátis?' : `Assinar o ${P.label}?`,
      p === 'gratis'
        ? `Salas com senha voltam ao limite de ${FREE_SENHA_MAX} pessoas e as ferramentas de moderação saem.`
        : `${brl(P.price)} por mês (valor da demonstração). Cobrado da sua carteira Realyz.`,
      [{ text: 'Agora não', style: 'cancel' }, { text: p === 'gratis' ? 'Voltar' : 'Assinar', onPress: () => setSalaPlano(p) }]
    );
  };
  return (
    <Sheet open={open} onClose={onClose} title="Planos das salas">
      {Object.values(SALA_PLANOS).map((P) => {
        const on = P.id === plano;
        return (
          <TouchableOpacity key={P.id} onPress={() => pick(P.id)} style={[st.plan, on && st.planOn]} accessibilityLabel={`Plano ${P.label}`}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={st.planName}>{P.label}</Text>
              <Text style={st.planPrice}>{P.price ? `${brl(P.price)}/mês` : 'Grátis'}</Text>
              {on ? <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={{ marginLeft: 6 }} /> : null}
            </View>
            {P.feats.map((f) => (
              <Text key={f} style={st.planFeat}>• {f}</Text>
            ))}
          </TouchableOpacity>
        );
      })}
      <Text style={st.hint}>Premium vale para clientes e empresas. O Empresarial é o das empresas, com o painel personalizado.</Text>
    </Sheet>
  );
}

// ---------- Configuração ----------
export function SalaConfig({ open, cfg, nome, onSave, onClose }) {
  const plano = useSalaPlano();
  const [c, setC] = useState(cfg);
  const [planos, setPlanos] = useState(false);
  const [classe, setClasse] = useState('');
  useEffect(() => {
    if (open) setC(cfg);
  }, [open]);
  if (!c) return null;
  const pago = isPago(plano);
  const painel = temPainel(plano);
  const set = (patch) => setC((x) => ({ ...x, ...patch }));
  const setPainel = (patch) => setC((x) => ({ ...x, painel: { cor: PAINEL_CORES[0], boasVindas: '', regras: '', links: [], ...(x.painel || {}), ...patch } }));
  const locked = () => setPlanos(true);
  const share = () => Share.share({ message: `Entra na minha sala "${nome || 'Realyz'}" no Realyz. ID: ${c.id}${c.senha ? ' (peça a senha)' : ''}` }).catch(() => {});
  const save = () => {
    const out = ajustaCfg(c, plano);
    if (!pago && c.senha) Alert.alert('Sala com senha', `No plano grátis, sala com senha vai até ${FREE_SENHA_MAX} pessoas (um squad).`);
    onSave(out);
  };
  const link = (c.painel && c.painel.links && c.painel.links[0]) || { label: '', url: '' };
  return (
    <>
      <Sheet
        open={open && !planos}
        onClose={onClose}
        title={`Sala ${nome ? '· ' + nome : ''}`}
        footer={
          <TouchableOpacity style={st.ok} onPress={save} accessibilityLabel="Salvar sala">
            <Text style={st.okText}>Salvar</Text>
          </TouchableOpacity>
        }
      >
        <View style={st.idBox}>
          <View style={{ flex: 1 }}>
            <Text style={st.label}>ID da sala</Text>
            <Text style={st.idText}>{c.id}</Text>
          </View>
          <TouchableOpacity onPress={share} style={st.pill} accessibilityLabel="Compartilhar ID">
            <Ionicons name="share-social-outline" size={15} color={colors.text} />
            <Text style={st.pillText}>Enviar</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => setPlanos(true)} style={st.planRow} accessibilityLabel="Ver planos">
          <Ionicons name="diamond-outline" size={16} color={colors.primary} />
          <Text style={st.planRowText}>Plano: {SALA_PLANOS[plano].label}</Text>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>{pago ? 'Trocar' : 'Ver planos'}</Text>
        </TouchableOpacity>

        <Text style={st.label}>Senha (opcional)</Text>
        <TextInput value={c.senha} onChangeText={(t) => set({ senha: t.slice(0, 20) })} placeholder="Sem senha: qualquer um entra" placeholderTextColor={colors.muted} style={st.field} />
        {!pago ? <Text style={st.hint}>Grátis: com senha, no máximo {FREE_SENHA_MAX} pessoas (um squad).</Text> : null}

        <View style={st.rowBetween}>
          <Text style={st.label}>Limite de pessoas</Text>
          <Lock on={pago} label="Premium" />
        </View>
        <View style={st.chips}>
          {[0, ...LIMITES].filter((n) => n <= SALA_PLANOS[plano].max || n === 0).map((n) => {
            const on = (pago ? c.max : c.senha ? FREE_SENHA_MAX : 0) === n;
            return (
              <TouchableOpacity key={n} onPress={() => (pago ? set({ max: n }) : locked())} style={[st.chip, on && st.chipOn]}>
                <Text style={[st.chipText, on && st.chipTextOn]}>{n ? n : 'Sem limite'}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={st.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={st.switchLabel}>Exposta na busca</Text>
            <Text style={st.hint}>Desligada: a sala some da lista e só entra quem tiver o ID.</Text>
          </View>
          <Lock on={pago} label="Premium" />
          <Switch value={pago ? c.visivel : true} onValueChange={(v) => (pago ? set({ visivel: v }) : locked())} trackColor={{ true: colors.primary }} />
        </View>

        <View style={st.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={st.switchLabel}>Sala moderada</Text>
            <Text style={st.hint}>Admin e moderadores silenciam, removem e banem. Quem é banido não volta.</Text>
          </View>
          <Lock on={pago} label="Premium" />
          <Switch value={pago ? c.moderada : false} onValueChange={(v) => (pago ? set({ moderada: v }) : locked())} trackColor={{ true: colors.primary }} />
        </View>

        <View style={st.rowBetween}>
          <Text style={st.label}>Classes da sala</Text>
          <Lock on={pago} label="Premium" />
        </View>
        <Text style={st.hint}>Divida a sala em grupos (ex.: Professores, Alunos, Time A, Time B, VIP).</Text>
        <View style={st.chips}>
          {(c.classes || []).map((k) => (
            <View key={k} style={[st.chip, { flexDirection: 'row', alignItems: 'center' }]}>
              <Text style={st.chipText}>{k}</Text>
              {pago && !['Admin', 'Moderador', 'Membro'].includes(k) ? (
                <TouchableOpacity onPress={() => set({ classes: c.classes.filter((x) => x !== k) })} accessibilityLabel={`Tirar a classe ${k}`}>
                  <Ionicons name="close" size={13} color={colors.muted} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              ) : null}
            </View>
          ))}
        </View>
        {pago ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextInput value={classe} onChangeText={setClasse} placeholder="Nova classe" placeholderTextColor={colors.muted} style={[st.field, { flex: 1 }]} maxLength={20} />
            <TouchableOpacity
              style={[st.pill, { marginLeft: 8 }]}
              onPress={() => {
                const k = classe.trim();
                if (k && !c.classes.includes(k)) set({ classes: [...c.classes, k] });
                setClasse('');
              }}
            >
              <Ionicons name="add" size={15} color={colors.text} />
              <Text style={st.pillText}>Criar</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={[st.rowBetween, { marginTop: 14 }]}>
          <Text style={st.label}>Painel personalizado</Text>
          <Lock on={painel} label="Empresarial" />
        </View>
        {painel ? (
          <>
            <View style={st.chips}>
              {PAINEL_CORES.map((cor) => (
                <TouchableOpacity key={cor} onPress={() => setPainel({ cor })} style={[st.cor, { backgroundColor: cor }, c.painel && c.painel.cor === cor && st.corOn]} accessibilityLabel={`Cor ${cor}`} />
              ))}
            </View>
            <TextInput value={(c.painel && c.painel.boasVindas) || ''} onChangeText={(t) => setPainel({ boasVindas: t.slice(0, 140) })} placeholder="Mensagem de boas-vindas" placeholderTextColor={colors.muted} style={st.field} />
            <TextInput value={(c.painel && c.painel.regras) || ''} onChangeText={(t) => setPainel({ regras: t.slice(0, 400) })} placeholder="Regras da sala (uma por linha)" placeholderTextColor={colors.muted} style={[st.field, { minHeight: 70, textAlignVertical: 'top' }]} multiline />
            <View style={{ flexDirection: 'row' }}>
              <TextInput value={link.label} onChangeText={(t) => setPainel({ links: [{ ...link, label: t.slice(0, 30) }] })} placeholder="Botão (ex.: Catálogo)" placeholderTextColor={colors.muted} style={[st.field, { flex: 1, marginRight: 6 }]} />
              <TextInput value={link.url} onChangeText={(t) => setPainel({ links: [{ ...link, url: t.trim() }] })} placeholder="https://…" placeholderTextColor={colors.muted} autoCapitalize="none" style={[st.field, { flex: 1.3 }]} />
            </View>
            {c.painel ? <SalaPainel cfg={{ ...c, plano }} nome={nome} /> : null}
          </>
        ) : (
          <TouchableOpacity onPress={locked}>
            <Text style={st.hint}>Cor da sala, boas-vindas, regras e um botão fixo (catálogo, site, torneio). Toque para ver o Empresarial.</Text>
          </TouchableOpacity>
        )}
      </Sheet>
      <PlanosSheet open={open && planos} onClose={() => setPlanos(false)} />
    </>
  );
}

// ---------- Painel personalizado ----------
export function SalaPainel({ cfg, nome }) {
  const p = cfg && cfg.painel;
  if (!p || !temPainel(cfg.plano)) return null;
  const cor = p.cor || colors.primary;
  const links = (p.links || []).filter((l) => l.label && /^https?:\/\//.test(l.url || ''));
  if (!p.boasVindas && !p.regras && !links.length) return null;
  return (
    <View style={[st.painel, { borderColor: cor, backgroundColor: cor + '14' }]}>
      <View style={[st.painelBar, { backgroundColor: cor }]} />
      <View style={{ flex: 1, padding: 12 }}>
        {p.boasVindas ? <Text style={[st.painelTitle, { color: cor }]}>{p.boasVindas}</Text> : nome ? <Text style={[st.painelTitle, { color: cor }]}>{nome}</Text> : null}
        {p.regras
          ? p.regras.split('\n').filter((l) => l.trim()).slice(0, 6).map((l, i) => (
              <Text key={i} style={st.painelRule}>{i + 1}. {l.trim()}</Text>
            ))
          : null}
        {links.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
            {links.map((l) => (
              <TouchableOpacity key={l.url} onPress={() => Linking.openURL(l.url).catch(() => {})} style={[st.painelBtn, { backgroundColor: cor }]}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12.5 }}>{l.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ---------- Moderação ----------
// pessoas: nomes na sala. fallbackCargo(name): cargo antigo (ex.: dono da Arena vira Admin).
export function ModeracaoSheet({ open, onClose, cfg, pessoas, me, onCfg, onKick, fallbackCargo }) {
  const [quem, setQuem] = useState(null);
  if (!cfg) return null;
  const cargo = (n) => cargoDe(cfg, n, fallbackCargo && fallbackCargo(n));
  const souAdmin = cargo(me) === 'Admin';
  const souMod = souAdmin || cargo(me) === 'Moderador';
  const silenciado = (n) => (cfg.silenciados || []).includes(n);
  const mudaCargo = (n, k) => onCfg({ ...cfg, cargos: { ...(cfg.cargos || {}), [n]: k } });
  const silenciar = (n) => onCfg({ ...cfg, silenciados: silenciado(n) ? cfg.silenciados.filter((x) => x !== n) : [...(cfg.silenciados || []), n] });
  const banir = (n) =>
    Alert.alert(`Banir ${n}?`, 'A pessoa sai agora e não consegue voltar para esta sala.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Banir', style: 'destructive', onPress: () => { onCfg({ ...cfg, banidos: [...(cfg.banidos || []), n] }); onKick(n); setQuem(null); } },
    ]);
  const pode = (n) => n !== me && (souAdmin || (souMod && !['Admin', 'Moderador'].includes(cargo(n))));
  const porClasse = (cfg.classes || []).map((k) => ({ k, gente: pessoas.filter((n) => cargo(n) === k) })).filter((g) => g.gente.length);
  const semClasse = pessoas.filter((n) => !(cfg.classes || []).includes(cargo(n)));
  if (semClasse.length) porClasse.push({ k: 'Membro', gente: semClasse });
  return (
    <Sheet open={open} onClose={() => { setQuem(null); onClose(); }} title="Moderação da sala">
      {!cfg.moderada ? <Text style={st.hint}>Ligue "Sala moderada" nas configurações para usar silenciar e banir.</Text> : null}
      {porClasse.map((g) => (
        <View key={g.k}>
          <Text style={st.section}>{g.k.toUpperCase()} · {g.gente.length}</Text>
          {g.gente.map((n) => (
            <View key={n}>
              <TouchableOpacity style={st.person} onPress={() => pode(n) && setQuem(quem === n ? null : n)} activeOpacity={pode(n) ? 0.7 : 1}>
                <View style={st.av}><Text style={{ color: '#fff', fontWeight: '800' }}>{n[0]}</Text></View>
                <Text style={{ flex: 1, color: colors.text, fontWeight: '600' }} numberOfLines={1}>{n === me ? `${n} (você)` : n}</Text>
                {silenciado(n) ? <Ionicons name="mic-off" size={15} color="#E5484D" /> : null}
                {pode(n) ? <Ionicons name={quem === n ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted} style={{ marginLeft: 6 }} /> : null}
              </TouchableOpacity>
              {quem === n ? (
                <View style={st.actions}>
                  <Text style={st.label}>Classe</Text>
                  <View style={st.chips}>
                    {(cfg.classes || []).filter((k) => souAdmin || !['Admin', 'Moderador'].includes(k)).map((k) => (
                      <TouchableOpacity key={k} onPress={() => mudaCargo(n, k)} style={[st.chip, cargo(n) === k && st.chipOn]}>
                        <Text style={[st.chipText, cargo(n) === k && st.chipTextOn]}>{k}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {cfg.moderada ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      <TouchableOpacity style={st.pill} onPress={() => silenciar(n)}>
                        <Ionicons name={silenciado(n) ? 'mic-outline' : 'mic-off-outline'} size={15} color={colors.text} />
                        <Text style={st.pillText}>{silenciado(n) ? 'Liberar a voz' : 'Silenciar'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[st.pill, { marginLeft: 8 }]} onPress={() => { onKick(n); setQuem(null); }}>
                        <Ionicons name="exit-outline" size={15} color={colors.text} />
                        <Text style={st.pillText}>Remover</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[st.pill, { marginLeft: 8, borderColor: '#F3C4C6' }]} onPress={() => banir(n)}>
                        <Ionicons name="ban-outline" size={15} color="#E5484D" />
                        <Text style={[st.pillText, { color: '#E5484D' }]}>Banir</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ))}
      {(cfg.banidos || []).length && souAdmin ? (
        <>
          <Text style={st.section}>BANIDOS</Text>
          {cfg.banidos.map((n) => (
            <View key={n} style={st.person}>
              <Text style={{ flex: 1, color: colors.muted }}>{n}</Text>
              <TouchableOpacity onPress={() => onCfg({ ...cfg, banidos: cfg.banidos.filter((x) => x !== n) })}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>Desbanir</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      ) : null}
    </Sheet>
  );
}

// ---------- Senha ----------
// ask: { nome, cfg, pessoas, me, onOk }
export function SenhaSheet({ ask, onClose }) {
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  useEffect(() => {
    setSenha('');
    setErro('');
  }, [ask]);
  if (!ask) return null;
  const go = () => {
    const r = podeEntrar(ask.cfg, ask.pessoas, ask.me, senha);
    if (r.ok) {
      onClose();
      ask.onOk();
    } else setErro(r.why || 'Senha errada.');
  };
  return (
    <Sheet
      open
      onClose={onClose}
      title={`🔒 ${ask.nome || 'Sala com senha'}`}
      footer={
        <TouchableOpacity style={st.ok} onPress={go}>
          <Text style={st.okText}>Entrar</Text>
        </TouchableOpacity>
      }
    >
      <Text style={st.hint}>Esta sala tem senha. Peça para quem te convidou.</Text>
      <TextInput value={senha} onChangeText={setSenha} placeholder="Senha" placeholderTextColor={colors.muted} style={st.field} secureTextEntry autoFocus onSubmitEditing={go} />
      {erro ? <Text style={{ color: '#E5484D', marginTop: 4 }}>{erro}</Text> : null}
    </Sheet>
  );
}

// Tenta entrar: checa banido, lotação e senha. Devolve true se já entrou.
export function tentaEntrar({ cfg, pessoas, me, nome, onOk, askSenha }) {
  const r = podeEntrar(cfg, pessoas, me);
  if (r.ok) {
    onOk();
    return true;
  }
  if (r.pedeSenha) askSenha({ cfg, pessoas, me, nome, onOk });
  else Alert.alert('Não deu para entrar', r.why);
  return false;
}

// ---------- Entrar com ID ----------
// find(id) → { nome, cfg, pessoas, onOk } ou null
export function EntrarComId({ open, onClose, find, me }) {
  const [id, setId] = useState('');
  const [ask, setAsk] = useState(null);
  useEffect(() => {
    if (open) setId('');
  }, [open]);
  const go = () => {
    const v = normId(id);
    const f = v && find(v);
    if (!f) return Alert.alert('Sala não encontrada', 'Confira o ID (ex.: RZ-7K2Q9M). Salas escondidas também aparecem pelo ID.');
    onClose();
    tentaEntrar({ ...f, me, askSenha: setAsk });
  };
  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title="Entrar com ID"
        footer={
          <TouchableOpacity style={st.ok} onPress={go}>
            <Text style={st.okText}>Procurar</Text>
          </TouchableOpacity>
        }
      >
        <Text style={st.hint}>Toda sala tem um ID. Funciona também para salas que não aparecem na lista.</Text>
        <TextInput value={id} onChangeText={setId} placeholder="RZ-XXXXXX" placeholderTextColor={colors.muted} autoCapitalize="characters" style={st.field} onSubmitEditing={go} autoFocus />
      </Sheet>
      <SenhaSheet ask={ask} onClose={() => setAsk(null)} />
    </>
  );
}

export { ehAdmin, ehMod };

const st = StyleSheet.create({
  back: { flex: 1, backgroundColor: 'rgba(40,32,18,0.25)', justifyContent: 'center', padding: 16 },
  sheet: { backgroundColor: colors.card, borderRadius: 20, padding: 16, width: '100%', maxWidth: 480, alignSelf: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  title: { flex: 1, fontSize: 17, fontWeight: '800', color: colors.text },
  x: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  label: { color: colors.text, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  hint: { color: colors.muted, fontSize: 12, marginTop: 2, marginBottom: 4 },
  field: { backgroundColor: colors.bg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, marginBottom: 6, borderWidth: 1, borderColor: colors.border },
  idBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.border },
  idText: { fontSize: 20, fontWeight: '900', color: colors.primaryDark, letterSpacing: 1 },
  pill: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.card, marginTop: 6 },
  pillText: { marginLeft: 5, fontWeight: '700', color: colors.text, fontSize: 12.5 },
  planRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  planRowText: { flex: 1, marginLeft: 8, color: colors.text, fontWeight: '700' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  chip: { paddingVertical: 6, paddingHorizontal: 11, borderRadius: 999, borderWidth: 1, borderColor: colors.borderStrong, marginRight: 6, marginBottom: 6, backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.card, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: '600', fontSize: 12.5 },
  chipTextOn: { color: colors.primaryDark, fontWeight: '800' },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  switchLabel: { color: colors.text, fontWeight: '700' },
  lock: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLight, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, marginHorizontal: 6 },
  lockText: { marginLeft: 3, fontSize: 10.5, fontWeight: '800', color: colors.primaryDark },
  cor: { width: 28, height: 28, borderRadius: 14, marginRight: 8, marginBottom: 6 },
  corOn: { borderWidth: 3, borderColor: colors.text },
  ok: { marginTop: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 999, paddingVertical: 12, alignItems: 'center' },
  okText: { color: colors.primaryDark, fontWeight: '800' },
  plan: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 12, marginBottom: 10 },
  planOn: { borderColor: colors.primary },
  planName: { fontSize: 16, fontWeight: '900', color: colors.text, flex: 1 },
  planPrice: { fontWeight: '800', color: colors.primaryDark },
  planFeat: { color: colors.text, marginTop: 3, fontSize: 13 },
  painel: { flexDirection: 'row', borderWidth: 1, borderRadius: 14, overflow: 'hidden', marginVertical: 8 },
  painelBar: { width: 5 },
  painelTitle: { fontWeight: '900', fontSize: 14.5, marginBottom: 4 },
  painelRule: { color: colors.text, fontSize: 12.5, marginTop: 2 },
  painelBtn: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999, marginRight: 6, marginTop: 4 },
  section: { color: colors.muted, fontWeight: '800', fontSize: 11.5, marginTop: 12, marginBottom: 4 },
  person: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  av: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  actions: { backgroundColor: colors.bg, borderRadius: 12, padding: 10, marginBottom: 6 },
});
