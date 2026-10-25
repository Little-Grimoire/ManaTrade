import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

export default function CardCapa({ item, onPress, compact = false }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ hovered, pressed }) => [styles.card, compact && styles.compact, hovered && styles.hover, pressed && styles.pressed]}>
      <Image source={{ uri: item.image }} style={[styles.image, compact && styles.imageCompact]} />
      <View style={styles.body}>
        <Text numberOfLines={1} style={styles.name}>{item.name || item.title}</Text>
        {!!item.edition && <Text numberOfLines={1} style={styles.meta}>{item.edition}</Text>}
        <Text style={styles.price}>R$ {Number(item.price).toFixed(2)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: 170, minHeight: 286, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' }, compact: { width: 138, minHeight: 235 }, hover: { borderColor: theme.colors.accent, transform: [{ translateY: -2 }] }, pressed: { opacity: 0.85 },
  image: { width: '100%', height: 190 }, imageCompact: { height: 150 }, body: { flex: 1, padding: theme.spacing.md, gap: theme.spacing.xs }, name: { color: theme.colors.text, fontSize: theme.typography.h3, fontWeight: theme.typography.weight.bold }, meta: { color: theme.colors.textMuted, fontSize: theme.typography.small }, price: { marginTop: 'auto', color: theme.colors.accent, fontWeight: theme.typography.weight.bold },
});
