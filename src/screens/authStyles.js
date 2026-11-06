import { StyleSheet } from 'react-native';
import { colors } from '../theme';

// Estilos comuns da entrada e do cadastro.
export const authStyles = StyleSheet.create({
  panel: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(168,121,10,0.25)',
    padding: 18,
  },
  label: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 10 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    paddingHorizontal: 14,
  },
  input: { flex: 1, color: colors.text, fontSize: 16, marginLeft: 10, paddingVertical: 0 },
  hint: { color: colors.muted, fontSize: 12, marginTop: 8 },
  check: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 16 },
  checkText: { color: colors.text, fontWeight: '700', fontSize: 14 },
  checkSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  btn: {
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  btnText: { color: colors.onPrimary, fontWeight: '700', fontSize: 16, marginLeft: 8 },
  link: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  linkText: { color: colors.accent, fontWeight: '700', fontSize: 14, marginLeft: 6 },
});
