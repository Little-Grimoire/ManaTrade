import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Tipografia';
import { formatarDistancia } from '../services/lojas';
import { theme } from '../theme';

// Na web o react-native-maps não funciona: cada loja abre a localização no OpenStreetMap.
export default function Mapa({ lojas = [], onSelecionar }) {
  const comLocal = lojas.filter((l) => l.latitude != null && l.longitude != null);
  if (!comLocal.length) {
    return <View style={styles.box}><Text style={styles.muted}>Nenhuma loja com localização cadastrada.</Text></View>;
  }
  return (
    <View style={styles.box}>
      <Text style={styles.muted}>No navegador o mapa interativo não está disponível. Abra a localização de cada loja:</Text>
      {comLocal.map((loja) => (
        <View key={loja.id} style={styles.linha}>
          <Pressable onPress={() => onSelecionar?.(loja)} style={styles.nome}>
            <Text style={styles.titulo}>{loja.nome}</Text>
            {loja.km != null && <Text style={styles.muted}>{formatarDistancia(loja.km)}</Text>}
          </Pressable>
          <Pressable accessibilityRole="link" onPress={() => Linking.openURL(`https://www.openstreetmap.org/?mlat=${loja.latitude}&mlon=${loja.longitude}#map=17/${loja.latitude}/${loja.longitude}`)}>
            <Text style={styles.link}>Ver no mapa ↗</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: theme.spacing.md, padding: theme.spacing.lg, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  linha: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingTop: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border },
  nome: { flex: 1 },
  titulo: { color: theme.colors.text, fontWeight: theme.typography.weight.bold },
  muted: { color: theme.colors.textMuted },
  link: { color: theme.colors.accent, fontWeight: theme.typography.weight.bold },
});
