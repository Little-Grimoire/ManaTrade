import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

export default function Mapa({ stores = [] }) {
  return (
    <View style={styles.map}>
      <View style={styles.grid}>
        <Text style={styles.marker}>●</Text>
      </View>
      <Text style={styles.text}>{stores.length} lojas nesta região</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  map: {
    height: 260,
    borderRadius: theme.radius.lg,
    backgroundColor: '#152638',
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: theme.spacing.lg,
  },
  grid: {
    position: 'absolute',
    width: '140%',
    height: '140%',
    transform: [{ rotate: '-12deg' }],
    borderWidth: 1,
    borderColor: '#294259',
  },
  marker: {
    position: 'absolute',
    left: '52%',
    top: '48%',
    color: theme.colors.accent,
    fontSize: 28,
  },
  text: {
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
  },
});
