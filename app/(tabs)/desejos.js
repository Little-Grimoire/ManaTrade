import Head from 'expo-router/head';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Cabecalho from '../../src/components/Cabecalho';
import EstadoErro from '../../src/components/EstadoErro';
import EstadoVazio from '../../src/components/EstadoVazio';
import Skeleton from '../../src/components/Skeleton';
import ListaItem from '../../src/components/ListaItem';
import { getCards } from '../../src/services/api';
import { theme } from '../../src/theme';

export default function Desejos() {
  const [cards, setCards] = useState([]);
  const [status, setStatus] = useState('loading');
  const load = async () => {
    setStatus('loading');
    try {
      setCards((await getCards()).slice(0, 6));
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  };
  useEffect(() => {
    load();
  }, []);
  const [alerts, setAlerts] = useState([true, true, true, true, true, true]);
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
        <title>Lista de desejos | ManaTrade</title>
      </Head>
      <Cabecalho title="Lista de desejos" />
      {cards.length ? (
        cards.map((card, index) => (
          <View key={card.id} style={styles.row}>
            <ListaItem
              title={card.name}
              subtitle={`Atual R$ ${card.price.toFixed(2)} · Alvo R$ ${(card.price * 0.88).toFixed(2)} · ${card.trend < 0 ? '↓ queda' : '↑ alta'}`}
              meta={`${card.trend}%`}
            />
            <Pressable
              accessibilityRole="button"
              style={styles.toggle}
              onPress={() =>
                setAlerts((items) => items.map((active, i) => (i === index ? !active : active)))
              }
            >
              <Text style={[styles.toggleText, alerts[index] && styles.active]}>
                {alerts[index] ? 'Alerta ativo' : 'Ativar alerta'}
              </Text>
            </Pressable>
          </View>
        ))
      ) : (
        <EstadoVazio titulo="Nenhum desejo" acao="Buscar cartas" />
      )}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    maxWidth: 1320,
    alignSelf: 'center',
    width: '100%',
    padding: theme.spacing.lg,
  },
  row: {
    paddingRight: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  toggle: { minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' },
  toggleText: { color: theme.colors.textMuted },
  active: { color: theme.colors.accent, fontWeight: theme.typography.weight.bold },
});
