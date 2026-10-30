import { StyleSheet, Text } from 'react-native';
import { theme } from '../theme';

export default function PrecoTag({ value, tone = 'accent' }) {
  return (
    <Text style={[styles.tag, tone === 'muted' && styles.muted]}>
      R$ {Number(value || 0).toFixed(2)}
    </Text>
  );
}
const styles = StyleSheet.create({
  tag: {
    color: theme.colors.accent,
    fontSize: theme.typography.h3,
    fontWeight: theme.typography.weight.bold,
  },
  muted: { color: theme.colors.textMuted },
});
