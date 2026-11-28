import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { observarConexao } from '../services/cacheLocal';
import { theme } from '../theme';

// Faixa no topo quando o servidor não responde e as telas mostram os dados salvos no aparelho.
export default function AvisoOffline() {
  const [offline, setOffline] = useState(null);
  const insets = useSafeAreaInsets();
  useEffect(() => observarConexao(setOffline), []);
  if (!offline) return null;
  const quando = new Date(offline.salvoEm);
  const hora = quando.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  return (
    <View style={[styles.faixa, { paddingTop: insets.top + theme.spacing.xs }]} accessibilityRole="alert">
      <Text style={styles.texto}>Sem conexão com o servidor · mostrando dados salvos em {hora}. Alterações ficam indisponíveis.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  faixa: { backgroundColor: theme.colors.warning, paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xs },
  texto: { color: theme.colors.background, fontSize: theme.typography.small, fontWeight: theme.typography.weight.medium, textAlign: 'center' },
});
