import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

export default function SeloCondicao({ value = 'NM' }) {
  return (
    <View style={[styles.badge, value === 'NM' && styles.good, value === 'HP' && styles.poor]}>
      <Text style={styles.text}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 38,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    backgroundColor: theme.colors.warning,
  },
  good: { backgroundColor: '#3d8e63' },
  poor: { backgroundColor: theme.colors.danger },
  text: {
    color: theme.colors.text,
    fontSize: theme.typography.small,
    fontWeight: theme.typography.weight.bold,
  },
});
