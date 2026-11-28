import { Pressable, StyleSheet } from 'react-native';
import { Text } from './Tipografia';
import { theme } from '../theme';

export default function BotaoSecundario({ label, onPress, danger, style }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ hovered, pressed }) => [styles.button, danger && styles.danger, hovered && styles.hover, pressed && styles.pressed, style]}><Text style={[styles.text, danger && styles.dangerText]}>{label}</Text></Pressable>;
}
const styles = StyleSheet.create({ button: { minHeight: 48, borderRadius: theme.radius.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }, danger: { borderColor: theme.colors.danger }, hover: { borderColor: theme.colors.accent }, pressed: { opacity: 0.8 }, text: { color: theme.colors.accent, fontFamily: theme.fonts.title, fontSize: 18, letterSpacing: 1.2, textTransform: 'uppercase' }, dangerText: { color: theme.colors.danger } });
