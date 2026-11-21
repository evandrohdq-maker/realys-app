// Proteção das telas: se uma tela der erro, só ela mostra o aviso (o resto do app continua funcionando),
// com um botão para tentar de novo e outro para voltar ao início. O erro aparece no console para o conserto.
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../responsive';
import { colors } from '../theme';

export default class TelaSegura extends React.Component {
  constructor(props) {
    super(props);
    this.state = { erro: null };
  }
  static getDerivedStateFromError(erro) {
    return { erro };
  }
  componentDidCatch(erro, info) {
    console.error('[Realyz] Erro na tela', this.props.nome || '', erro && erro.message, info && info.componentStack ? info.componentStack.split('\n').slice(0, 6).join('\n') : '');
  }
  componentDidUpdate(prev) {
    // Trocou de tela: limpa o erro.
    if (prev.nome !== this.props.nome && this.state.erro) this.setState({ erro: null });
  }
  render() {
    if (!this.state.erro) return this.props.children;
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: colors.bg }}>
        <Ionicons name="construct-outline" size={42} color={colors.primary} />
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 12, textAlign: 'center' }}>Esta tela teve um problema</Text>
        <Text style={{ color: colors.muted, marginTop: 6, textAlign: 'center' }}>O resto do Realyz continua funcionando. Tente de novo ou volte ao início.</Text>
        <View style={{ flexDirection: 'row', marginTop: 18 }}>
          <TouchableOpacity onPress={() => this.setState({ erro: null })} style={{ paddingVertical: 11, paddingHorizontal: 18, borderRadius: 999, backgroundColor: colors.primary, marginRight: 10 }}>
            <Text style={{ color: colors.onPrimary, fontWeight: '800' }}>Tentar de novo</Text>
          </TouchableOpacity>
          {this.props.onInicio ? (
            <TouchableOpacity onPress={() => { this.setState({ erro: null }); this.props.onInicio(); }} style={{ paddingVertical: 11, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>Voltar ao início</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  }
}
