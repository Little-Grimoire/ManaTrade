import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Tipografia';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

export default function Cabecalho({ title, subtitle, back = false, action }) {
  return (
    <View style={styles.header}>
      {back && (
        <Pressable
          accessibilityLabel="Voltar"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>
      )}
      <View style={styles.copy}>
        {!!title && <Text style={styles.title}>{title}</Text>}
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        {!!title && <Ornamento />}
      </View>
      {action}
    </View>
  );
}

// Três marcas de garra seguidas de um filete que some: o separador do bestiário.
export function Ornamento({ style }) {
  return (
    <View style={[styles.ornamento, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.garras}>
        {[0, 1, 2].map((i) => <View key={i} style={[styles.garra, i === 1 && styles.garraMeio]} />)}
      </View>
      <View style={styles.filete} />
      <View style={[styles.filete, styles.fileteFim]} />
    </View>
  );
}
const styles = StyleSheet.create({ header: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, marginBottom: theme.spacing.lg }, copy: { flex: 1 }, back: { width: 44, height: 44, borderRadius: theme.radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }, title: { color: theme.colors.text, fontSize: theme.typography.title, fontWeight: theme.typography.weight.bold, letterSpacing: 0.8, textTransform: 'uppercase' }, subtitle: { color: theme.colors.textMuted, marginTop: 2 }, ornamento: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: theme.spacing.sm, maxWidth: 260 }, garras: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 2 }, garra: { width: 3, height: 14, borderRadius: 2, backgroundColor: theme.colors.gold, transform: [{ rotate: '22deg' }] }, garraMeio: { height: 18 }, filete: { flex: 1, height: 1, backgroundColor: theme.colors.gold, opacity: 0.5 }, fileteFim: { opacity: 0.15 } });
