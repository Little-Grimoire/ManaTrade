import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../theme';

export default function ChipFiltro({ label, active, onPress }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed, hovered }) => [styles.chip, active && styles.active, (hovered || pressed) && styles.hover]}><Text style={[styles.text, active && styles.activeText]}>{label}</Text></Pressable>;
}
const styles = StyleSheet.create({ chip: { minHeight: 44, paddingHorizontal: theme.spacing.lg, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.pill, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }, active: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }, hover: { transform: [{ scale: 1.02 }] }, text: { color: theme.colors.text, fontWeight: theme.typography.weight.medium }, activeText: { color: theme.colors.background } });
