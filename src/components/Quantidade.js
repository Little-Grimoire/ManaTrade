import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

// Controle "− n +". Com valor 1, o "−" chama onRemover (se informado).
export default function Quantidade({ valor, onAlterar, onRemover, desabilitado }) {
  const menos = () => (valor <= 1 ? onRemover?.() : onAlterar(valor - 1));
  return (
    <View style={styles.wrap}>
      <Pressable accessibilityRole="button" accessibilityLabel={valor <= 1 ? 'Remover' : 'Diminuir'} disabled={desabilitado || (valor <= 1 && !onRemover)} onPress={menos} style={({ pressed }) => [styles.botao, pressed && styles.pressed]}>
        <Text style={styles.sinal}>−</Text>
      </Pressable>
      <Text style={styles.valor}>{valor}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Aumentar" disabled={desabilitado} onPress={() => onAlterar(valor + 1)} style={({ pressed }) => [styles.botao, pressed && styles.pressed]}>
        <Text style={styles.sinal}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { flexDirection: 'row', alignItems: 'center', gap: 4 }, botao: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border }, pressed: { opacity: 0.7 }, sinal: { color: theme.colors.text, fontSize: 18, fontWeight: theme.typography.weight.bold }, valor: { minWidth: 28, textAlign: 'center', color: theme.colors.text, fontWeight: theme.typography.weight.bold } });
