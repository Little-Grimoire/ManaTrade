import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../theme';

export default function BotaoPrimario({ label, onPress, disabled, style }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ hovered, pressed }) => [
        styles.button,
        disabled && styles.disabled,
        hovered && styles.hover,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.greenStart,
  },
  disabled: { opacity: 0.45 },
  hover: { backgroundColor: theme.colors.greenEnd },
  pressed: { transform: [{ scale: 0.98 }] },
  text: { color: '#09110f', fontWeight: theme.typography.weight.bold },
});
