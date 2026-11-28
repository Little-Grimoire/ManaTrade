import { Pressable, StyleSheet } from 'react-native';
import { Text } from './Tipografia';
import { theme } from '../theme';

// Botão principal: ferrugem com filete âmbar e letras condensadas em caixa-alta.
export default function BotaoPrimario({ label, onPress, disabled, style }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ hovered, pressed }) => [styles.button, disabled && styles.disabled, hovered && styles.hover, pressed && styles.pressed, style]}><Text style={styles.text}>{label}</Text></Pressable>;
}
const styles = StyleSheet.create({ button: { minHeight: 48, borderRadius: theme.radius.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: theme.spacing.lg, backgroundColor: theme.colors.primary, borderWidth: 1, borderColor: theme.colors.gold, ...theme.shadow.card }, disabled: { opacity: 0.45 }, hover: { backgroundColor: theme.colors.primaryHover }, pressed: { transform: [{ scale: 0.98 }] }, text: { color: theme.colors.onPrimary, fontFamily: theme.fonts.title, fontSize: 18, letterSpacing: 1.2, textTransform: 'uppercase' } });
