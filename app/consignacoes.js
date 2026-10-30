import Head from 'expo-router/head';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Cabecalho from '../src/components/Cabecalho';
import EstadoErro from '../src/components/EstadoErro';
import EstadoVazio from '../src/components/EstadoVazio';
import Skeleton from '../src/components/Skeleton';
import { getConsignments } from '../src/services/api';
import { theme } from '../src/theme';
export default function Consignacoes() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');
  const load = async () => {
    setStatus('loading');
    try {
      setItems(await getConsignments());
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  };
  useEffect(() => {
    load();
  }, []);
  if (status === 'loading')
    return (
      <View style={styles.page}>
        <Skeleton height={260} />
      </View>
    );
  if (status === 'error') return <EstadoErro onRetry={load} />;
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Head>
        <title>Consignações | ManaTrade</title>
      </Head>
      <Cabecalho title="Consignações" back />
      {items.length ? (
        items.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.name}>{item.card}</Text>
            <Text style={styles.status}>{item.status}</Text>
            <View style={styles.timeline}>
              {['Enviada', 'Em análise', 'À venda', 'Vendida', 'Repasse pago'].map(
                (step, index) => (
                  <View key={step} style={styles.step}>
                    <View style={[styles.dot, index <= item.step && styles.done]} />
                    <Text style={[styles.stepText, index <= item.step && styles.doneText]}>
                      {step}
                    </Text>
                  </View>
                ),
              )}
            </View>
            <Text style={styles.value}>Repasse previsto: R$ {item.repasse.toFixed(2)}</Text>
          </View>
        ))
      ) : (
        <EstadoVazio titulo="Sem consignações" />
      )}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    maxWidth: 1320,
    width: '100%',
    alignSelf: 'center',
    padding: theme.spacing.lg,
  },
  card: {
    padding: theme.spacing.lg,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  name: {
    color: theme.colors.text,
    fontSize: theme.typography.h2,
    fontWeight: theme.typography.weight.bold,
  },
  status: { color: theme.colors.accent, marginTop: theme.spacing.sm },
  timeline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.lg,
    marginVertical: theme.spacing.xl,
  },
  step: { width: 92, gap: theme.spacing.sm },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: theme.colors.border },
  done: { backgroundColor: theme.colors.accent },
  stepText: { color: theme.colors.textMuted, fontSize: theme.typography.small },
  doneText: { color: theme.colors.text },
  value: { color: theme.colors.text, fontWeight: theme.typography.weight.bold },
});
