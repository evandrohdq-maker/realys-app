// Prestação de serviço, tudo no aplicativo (demonstração, sem servidor):
//  - Cadastro do prestador: tipo (pessoa física, MEI, CNPJ), documentos do titular, CNH e EAR conforme o serviço.
//  - Empresa: aceita o Termo de Responsabilidade e cadastra funcionários (subgrupo da empresa).
//  - Mandados de serviço: o funcionário aceita (biometria) e conclui (biometria), e a empresa responde pelo atendimento.
//  - Exemplos: perfis fictícios para testar cada regra.
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Switch, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { serviceTypes } from '../../data';
import { colors } from '../../theme';
import { Screen, Title, Card, Row, Button, Badge, Input, Chip, Section, Empty } from '../../components/ui';
import ScanFacial from '../../components/ScanFacial';
import TermoAdesaoModal from '../../components/TermoAdesaoModal';
import { TERMO_EMPRESA } from '../../termoAdesao';
import { getDevicePoint } from '../../geo';
import { REALYS_FEE_PCT } from '../../serviceVisits';
import { TIPOS_CADASTRO, CATEGORIAS_CNH, SERVICOS_CNH, SERVICOS_PASSAGEIROS, statusCadastro, docsFaltantes, hojeISO } from '../../prestacaoRegras';
import { EMPRESA_DEMO, FUNCIONARIOS_DEMO, MANDADOS_DEMO, EXEMPLOS_CADASTRO_DEMO } from '../../empresaDemo';

const SERVICOS_OPCOES = ['motoboy', 'motorista', 'carro', 'van', 'moto', 'frete', 'encanador', 'eletricista'];
const nomeServico = (k) => (serviceTypes.find((s) => s.key === k) || { label: k }).label;
const ABAS = [
  { key: 'cadastro', label: 'Meu cadastro' },
  { key: 'empresa', label: 'Empresa e funcionários' },
  { key: 'mandados', label: 'Mandados' },
  { key: 'exemplos', label: 'Exemplos' },
];

const CAD_VAZIO = { tipo: 'mei', servico: 'motoboy', cnpj: '', titular: { nome: '', numero: '', validade: '' }, cnh: { categoria: '', validade: '', ear: false } };

function Campo({ label, ...props }) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={styles.label}>{label}</Text>
      <Input {...props} autoCapitalize="none" />
    </View>
  );
}

function Faltas({ faltam }) {
  if (!faltam.length) return <Badge label="Documentação completa" color={colors.primaryDark} />;
  return (
    <View>
      <Badge label={`Faltam ${faltam.length} item(ns)`} color={colors.danger} />
      {faltam.map((f) => (
        <Text key={f} style={styles.falta}>• {f}</Text>
      ))}
    </View>
  );
}

// Campos de titular, CNH e EAR, usados pelo cadastro do prestador e pelos funcionários.
function DocumentosForm({ value, onChange, servico, tipo }) {
  const set = (campo, v) => onChange({ ...value, [campo]: v });
  const setT = (campo, v) => onChange({ ...value, titular: { ...value.titular, [campo]: v } });
  const setC = (campo, v) => onChange({ ...value, cnh: { ...value.cnh, [campo]: v } });
  return (
    <View>
      <Text style={styles.sub}>{tipo === 'cnpj' ? 'Documento de um dos sócios titulares' : 'Documento do titular'}</Text>
      <Text style={styles.dica}>Foto legível, documento inteiro e sem reflexo. Se não der para ler, a foto é recusada.</Text>
      <Campo label="Nome completo" value={value.titular.nome} onChangeText={(v) => setT('nome', v)} placeholder="Nome como no documento" />
      <Campo label="Número do documento" value={value.titular.numero} onChangeText={(v) => setT('numero', v)} placeholder="RG ou CNH" />
      <Campo label="Validade (AAAA-MM-DD, se houver)" value={value.titular.validade} onChangeText={(v) => setT('validade', v)} placeholder="2034-01-10" />
      {SERVICOS_CNH.includes(servico) ? (
        <View style={{ marginTop: 14 }}>
          <Text style={styles.sub}>CNH</Text>
          <Row style={{ flexWrap: 'wrap' }}>
            {CATEGORIAS_CNH.map((c) => (
              <Chip key={c} label={c} active={value.cnh.categoria === c} onPress={() => setC('categoria', c)} />
            ))}
          </Row>
          <Campo label="Validade da CNH (AAAA-MM-DD)" value={value.cnh.validade} onChangeText={(v) => setC('validade', v)} placeholder="2034-01-10" />
          {SERVICOS_PASSAGEIROS.includes(servico) ? (
            <Row style={{ justifyContent: 'space-between', marginTop: 10 }}>
              <Text style={[styles.label, { flex: 1, marginRight: 10 }]}>Autorização para atividade remunerada (EAR) na CNH, para levar passageiros</Text>
              <Switch value={!!value.cnh.ear} onValueChange={(v) => setC('ear', v)} />
            </Row>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function CadastroPanel() {
  const [cad, setCad] = useState(CAD_VAZIO);
  const [enviado, setEnviado] = useState(false);
  const st = statusCadastro(cad);
  const enviar = () => {
    setEnviado(true);
    Alert.alert('Cadastro pronto para análise', 'A aprovação final depende do servidor do Realys, que ainda não está ligado. Aqui fica como pronto.');
  };
  return (
    <View>
      <Section title="Tipo de cadastro">
        <Row style={{ flexWrap: 'wrap' }}>
          {TIPOS_CADASTRO.map((t) => (
            <Chip key={t.key} label={t.label} active={cad.tipo === t.key} onPress={() => setCad({ ...cad, tipo: t.key })} />
          ))}
        </Row>
      </Section>
      <Section title="Serviço que você presta">
        <Row style={{ flexWrap: 'wrap' }}>
          {SERVICOS_OPCOES.map((k) => (
            <Chip key={k} label={nomeServico(k)} active={cad.servico === k} onPress={() => setCad({ ...cad, servico: k })} />
          ))}
        </Row>
      </Section>
      <Card>
        {cad.tipo !== 'pf' ? (
          <Campo label={cad.tipo === 'mei' ? 'CNPJ do MEI' : 'CNPJ da empresa'} value={cad.cnpj} onChangeText={(v) => setCad({ ...cad, cnpj: v })} placeholder="00.000.000/0001-00" />
        ) : null}
        <DocumentosForm value={cad} onChange={setCad} servico={cad.servico} tipo={cad.tipo} />
      </Card>
      <Section title="Checagem do cadastro">
        <Card>
          <Faltas faltam={st.faltam} />
          <Button title={enviado ? 'Cadastro enviado' : 'Enviar para aprovação'} disabled={!st.completo || enviado} onPress={enviar} style={{ marginTop: 12 }} />
        </Card>
      </Section>
    </View>
  );
}

function EmpresaPanel({ aceita, setAceita, funcionarios, setFuncionarios }) {
  const [termoAberto, setTermoAberto] = useState(false);
  const [novo, setNovo] = useState({ nome: '', servico: 'encanador', titular: { nome: '', numero: '', validade: '' }, cnh: { categoria: '', validade: '', ear: false } });
  const adicionar = () => {
    if (!novo.nome.trim()) return Alert.alert('Informe o nome do funcionário.');
    setFuncionarios([...funcionarios, { ...novo, id: 'f' + (funcionarios.length + 1) + '-' + Date.now() }]);
    setNovo({ nome: '', servico: 'encanador', titular: { nome: '', numero: '', validade: '' }, cnh: { categoria: '', validade: '', ear: false } });
  };
  return (
    <View>
      <Section title="Empresa">
        <Card>
          <Text style={styles.nome}>{EMPRESA_DEMO.nome}</Text>
          <Text style={styles.dica}>CNPJ {EMPRESA_DEMO.cnpj}</Text>
          <Text style={styles.dica}>Sócios titulares: {EMPRESA_DEMO.socios.map((s) => s.nome).join(', ')}. Basta o documento de um deles.</Text>
        </Card>
      </Section>
      <Section title="Termo de Responsabilidade">
        <Card>
          <Text style={styles.dica}>A empresa responde pelos atendimentos feitos pelos funcionários em seu nome, inclusive por perda, extravio ou dano a bens do cliente.</Text>
          <Row style={{ marginTop: 10, flexWrap: 'wrap' }}>
            <Button title="Ler o termo" variant="outline" small onPress={() => setTermoAberto(true)} style={{ marginRight: 8, marginTop: 6 }} />
            <Button title={aceita ? 'Termo aceito ✓' : 'Aceitar o termo'} variant={aceita ? 'light' : 'primary'} small onPress={() => setAceita(!aceita)} style={{ marginTop: 6 }} />
          </Row>
        </Card>
        <TermoAdesaoModal visible={termoAberto} onClose={() => setTermoAberto(false)} termo={TERMO_EMPRESA} />
      </Section>
      <Section title="Funcionários da empresa">
        {funcionarios.map((f) => {
          const faltam = docsFaltantes({ tipo: 'pf', servico: f.servico, titular: f.titular, cnh: f.cnh });
          return (
            <Card key={f.id}>
              <Text style={styles.nome}>{f.nome}</Text>
              <Text style={styles.dica}>Atende como: {nomeServico(f.servico)}</Text>
              <View style={{ marginTop: 8 }}><Faltas faltam={faltam} /></View>
            </Card>
          );
        })}
        {!funcionarios.length ? <Empty text="Nenhum funcionário cadastrado." /> : null}
        <Card>
          <Text style={styles.sub}>Novo funcionário</Text>
          <Campo label="Nome" value={novo.nome} onChangeText={(v) => setNovo({ ...novo, nome: v })} placeholder="Nome completo" />
          <Row style={{ flexWrap: 'wrap', marginTop: 10 }}>
            {SERVICOS_OPCOES.map((k) => (
              <Chip key={k} label={nomeServico(k)} active={novo.servico === k} onPress={() => setNovo({ ...novo, servico: k })} />
            ))}
          </Row>
          <View style={{ marginTop: 10 }}>
            <DocumentosForm value={novo} onChange={setNovo} servico={novo.servico} tipo="pf" />
          </View>
          <Button title="Adicionar funcionário" onPress={adicionar} style={{ marginTop: 12 }} />
        </Card>
      </Section>
    </View>
  );
}

// Prazo: 24 horas, contadas a partir do aceite do mandado. Dentro desse prazo o prestador finaliza
// com o QR Code do cliente e faz a biometria, que libera o repasse. Fora do prazo, vai para revisão.
const PRAZO_MS = 24 * 3600 * 1000;

function MandadosPanel({ aceita, funcionarios, mandados, setMandados }) {
  const [alvo, setAlvo] = useState(null); // { ordem, tipo: 'aceite' | 'finalizacao' }
  const [leitura, setLeitura] = useState({}); // código do QR digitado (demo), por mandado
  const mudar = (id, fn) => setMandados((lista) => lista.map((m) => (m.id === id ? fn(m) : m)));
  const anotar = (m, texto) => ({ ...m, registro: [...(m.registro || []), texto] });

  const registrar = async (payload) => {
    const { ordem, tipo } = alvo;
    setAlvo(null);
    const p = await getDevicePoint().catch(() => null);
    const local = p && p.lat != null ? `${Number(p.lat).toFixed(4)}, ${Number(p.lon).toFixed(4)}` : 'local não informado';
    const quando = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const agora = Date.now();
    mudar(ordem.id, (m) => {
      if (tipo === 'aceite') {
        const qr = 'QR-' + m.id.toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
        return anotar({ ...m, status: 'Aceito', prazo: agora + PRAZO_MS, qr }, `Aceite com biometria às ${quando}, em ${local}. Prazo para finalizar: 24 h. Responsável: ${EMPRESA_DEMO.nome}.`);
      }
      if (agora > m.prazo) {
        return anotar({ ...m, status: 'Vencido' }, `Biometria de conclusão fora do prazo de 24 h (às ${quando}). Sem repasse; vai para revisão.`);
      }
      const recebido = m.valor * (1 - REALYS_FEE_PCT / 100);
      return anotar({ ...m, status: 'Concluído', recebido }, `Conclusão com biometria às ${quando}, em ${local} (${payload.videos.length} vídeos, ${payload.photos.length} fotos). Repasse liberado: R$ ${recebido.toFixed(2)}.`);
    });
  };

  // Lê o QR Code do cliente (demo: o código digitado). Só finaliza dentro do prazo.
  const lerQr = (m) => {
    const codigo = (leitura[m.id] || '').trim().toUpperCase();
    if (codigo !== m.qr) return Alert.alert('QR não confere', 'Use o código do QR que aparece na tela do cliente.');
    if (Date.now() > m.prazo) {
      mudar(m.id, (x) => anotar({ ...x, status: 'Vencido' }, 'QR lido depois do prazo de 24 h. Vai para revisão.'));
      return Alert.alert('Prazo de 24 h vencido', 'O serviço não pode mais ser finalizado sem revisão.');
    }
    mudar(m.id, (x) => anotar({ ...x, status: 'Aguardando biometria' }, `Serviço finalizado com o QR do cliente. Faça a biometria até ${new Date(m.prazo).toLocaleString('pt-BR')} para receber.`));
  };

  if (!funcionarios.length) return <Empty text="Cadastre um funcionário para receber mandados." />;
  return (
    <View>
      {!aceita ? <Card><Text style={styles.dica}>Aceite o Termo de Responsabilidade na aba Empresa antes de colocar funcionários para atender.</Text></Card> : null}
      {mandados.map((m) => {
        const f = funcionarios.find((x) => x.id === m.funcionarioId) || funcionarios[0];
        const faltam = f ? docsFaltantes({ tipo: 'pf', servico: m.servico, titular: f.titular, cnh: f.cnh }) : ['Sem funcionário'];
        const pode = aceita && faltam.length === 0;
        const vencido = m.status !== 'Recebido' && m.status !== 'Concluído' && m.prazo && Date.now() > m.prazo;
        const exibido = vencido && m.status !== 'Vencido' ? 'Vencido' : m.status;
        return (
          <Card key={m.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={styles.nome}>{nomeServico(m.servico)} · {m.cliente}</Text>
              <Badge label={exibido} color={exibido === 'Concluído' ? colors.primaryDark : exibido === 'Vencido' ? colors.danger : colors.primary} />
            </Row>
            <Text style={styles.dica}>{m.endereco} · R$ {m.valor}</Text>
            <Text style={styles.dica}>Funcionário: {f ? f.nome : '—'} · Responsável: {EMPRESA_DEMO.nome}</Text>
            {m.prazo && m.status !== 'Concluído' ? <Text style={styles.dica}>Prazo: {new Date(m.prazo).toLocaleString('pt-BR')}</Text> : null}
            {m.recebido != null ? <Text style={styles.dica}>Repasse após taxa de {REALYS_FEE_PCT}%: R$ {m.recebido.toFixed(2)}</Text> : null}
            {m.status === 'Recebido' && faltam.length ? <View style={{ marginTop: 6 }}><Faltas faltam={faltam} /></View> : null}
            {m.status === 'Recebido' ? (
              <Button title="Aceitar mandado (biometria)" disabled={!pode} onPress={() => setAlvo({ ordem: m, tipo: 'aceite' })} style={{ marginTop: 10 }} />
            ) : null}
            {m.status === 'Aceito' && !vencido ? (
              <View style={{ marginTop: 10 }}>
                <View style={styles.aviso}>
                  <Text style={styles.avisoTexto}>Atenção: não mostre o QR Code nem o código de finalização ao prestador antes do serviço estar realmente concluído. Eles só devem ser apresentados ao final do atendimento.</Text>
                </View>
                <Text style={styles.dica}>Código do QR do cliente (demo): {m.qr}</Text>
                <Input value={leitura[m.id] || ''} onChangeText={(v) => setLeitura({ ...leitura, [m.id]: v })} placeholder="Leia o QR do cliente" style={{ marginTop: 6 }} autoCapitalize="characters" />
                <Button title="Finalizar com o QR do cliente" onPress={() => lerQr(m)} style={{ marginTop: 8 }} />
              </View>
            ) : null}
            {m.status === 'Aguardando biometria' && !vencido ? (
              <Button title="Fazer biometria para receber" onPress={() => setAlvo({ ordem: m, tipo: 'finalizacao' })} style={{ marginTop: 10 }} />
            ) : null}
            {(m.status === 'Aceito' || m.status === 'Aguardando biometria') && !vencido ? (
              <Button title="Simular prazo de 24 h vencido (teste)" variant="outline" small onPress={() => mudar(m.id, (x) => ({ ...x, prazo: Date.now() - 1000 }))} style={{ marginTop: 8 }} />
            ) : null}
            {(m.registro || []).map((r, i) => (
              <Text key={i} style={styles.registro}>{r}</Text>
            ))}
          </Card>
        );
      })}
      <ScanFacial
        visible={!!alvo}
        title={alvo && alvo.tipo === 'aceite' ? 'Biometria: aceite do mandado' : 'Biometria: recebimento'}
        onFrames={registrar}
        onClose={() => setAlvo(null)}
      />
      <Text style={styles.dica}>Demonstração: a biometria e o QR não são enviados ao servidor aqui. Com o servidor ligado, a checagem e o repasse são feitos de verdade.</Text>
    </View>
  );
}

function ExemplosPanel() {
  return (
    <View>
      <Text style={styles.dica}>Perfis fictícios para testar cada regra.</Text>
      {EXEMPLOS_CADASTRO_DEMO.map((e) => {
        const st = statusCadastro(e);
        return (
          <Card key={e.id}>
            <Text style={styles.nome}>{e.nome}</Text>
            <Text style={styles.dica}>{TIPOS_CADASTRO.find((t) => t.key === e.tipo).label} · {nomeServico(e.servico)}</Text>
            <View style={{ marginTop: 8 }}><Faltas faltam={st.faltam} /></View>
          </Card>
        );
      })}
    </View>
  );
}

export default function PrestacaoScreen({ onClose }) {
  const [aba, setAba] = useState('cadastro');
  const [aceita, setAceita] = useState(false);
  const [funcionarios, setFuncionarios] = useState(FUNCIONARIOS_DEMO);
  const [mandados, setMandados] = useState(MANDADOS_DEMO);
  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Title sub="Cadastro, empresa e mandados. Demonstração no aplicativo.">Prestação de serviço</Title>
        </View>
        <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityLabel="Fechar"><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
      </Row>
      <Row style={{ flexWrap: 'wrap', marginBottom: 8 }}>
        {ABAS.map((a) => (
          <Chip key={a.key} label={a.label} active={aba === a.key} onPress={() => setAba(a.key)} />
        ))}
      </Row>
      {aba === 'cadastro' ? <CadastroPanel /> : null}
      {aba === 'empresa' ? <EmpresaPanel aceita={aceita} setAceita={setAceita} funcionarios={funcionarios} setFuncionarios={setFuncionarios} /> : null}
      {aba === 'mandados' ? <MandadosPanel aceita={aceita} funcionarios={funcionarios} mandados={mandados} setMandados={setMandados} /> : null}
      {aba === 'exemplos' ? <ExemplosPanel /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  sub: { color: colors.text, fontWeight: '700', fontSize: 15, marginBottom: 4 },
  nome: { color: colors.text, fontWeight: '700', fontSize: 15 },
  dica: { color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 17 },
  falta: { color: colors.danger, fontSize: 13, marginTop: 4 },
  registro: { color: colors.text, fontSize: 12, marginTop: 8, lineHeight: 17 },
  aviso: { backgroundColor: colors.dangerLight || '#FDECEA', borderRadius: 10, padding: 10, marginBottom: 8 },
  avisoTexto: { color: colors.danger, fontSize: 12, fontWeight: '700', lineHeight: 17 },
});
