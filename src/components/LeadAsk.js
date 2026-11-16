// Pedir orçamento: o cliente escreve o que precisa e o pedido chega como contato novo (lead)
// no CRM da empresa (aba Clientes). É a porta de entrada dos leads pela página da empresa.
import React, { useState } from 'react';
import { View, TouchableOpacity, Modal, Alert } from 'react-native';
import { Text, TextInput } from '../responsive';
import { useStore } from '../store';
import { colors } from '../theme';
import { MY_COMPANY_ID } from '../data';
import { crmCapture } from '../crm';

// Hook: devolve a função que abre a janela e a própria janela para pôr na tela.
export function useLeadAsk(company) {
  const { state } = useStore();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const send = () => {
    const t = text.trim();
    if (!t) return;
    // Na demonstração (um celular só), o pedido feito à minha própria empresa aparece no CRM dela.
    if (company && company.id === MY_COMPANY_ID) crmCapture({ client: state.user.name, text: t, origin: 'Página' });
    setText('');
    setOpen(false);
    Alert.alert('Pedido enviado ✅', `${company ? company.name : 'A empresa'} recebeu o seu pedido e responde pelo chat do Re@lys.`);
  };
  const modal = (
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(20,18,14,0.5)', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18 }}>
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 17 }}>Pedir orçamento</Text>
          <Text style={{ color: colors.muted, fontSize: 13, marginTop: 3 }}>Conte o que você precisa. {company ? company.name : 'A empresa'} responde por aqui.</Text>
          <TextInput value={text} onChangeText={setText} placeholder="Ex.: preciso de 20 cestas para sexta" placeholderTextColor={colors.muted} multiline maxLength={300} autoFocus style={{ borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, marginTop: 12, minHeight: 80, textAlignVertical: 'top' }} />
          <View style={{ flexDirection: 'row', marginTop: 12 }}>
            <TouchableOpacity style={{ flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardAlt, marginRight: 8 }} onPress={() => setOpen(false)}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.text, fontWeight: '700' }}>Voltar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.text }} onPress={send}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: '#fff', fontWeight: '800' }}>Enviar pedido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
  return { ask: () => setOpen(true), modal };
}
