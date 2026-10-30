import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

export default function ListaItem({ title, subtitle, meta, onPress, leading }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ hovered, pressed }) => [
        styles.row,
        hovered && styles.hover,
        pressed && styles.pressed,
      ]}
    >
      {leading && <View style={styles.leading}>{leading}</View>}
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {!!meta && <Text style={styles.meta}>{meta}</Text>}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: theme.spacing.md,
  },
  hover: { backgroundColor: theme.colors.surface },
  pressed: { opacity: 0.8 },
  leading: { width: 44, alignItems: 'center' },
  copy: { flex: 1 },
  title: { color: theme.colors.text, fontWeight: theme.typography.weight.bold },
  subtitle: { color: theme.colors.textMuted, marginTop: 3 },
  meta: { color: theme.colors.accent, fontWeight: theme.typography.weight.bold },
});
