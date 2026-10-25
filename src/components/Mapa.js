import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

export default function Mapa({ stores = [] }) {
  return <View style={styles.map}><Text style={styles.icon}>MAPA</Text><Text style={styles.text}>{stores.length} lojas próximas</Text></View>;
}
const styles = StyleSheet.create({ map: { height: 260, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' }, icon: { color: theme.colors.accent, fontWeight: theme.typography.weight.bold }, text: { color: theme.colors.textMuted, marginTop: theme.spacing.sm } });
