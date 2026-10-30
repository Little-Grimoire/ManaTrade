import Head from 'expo-router/head';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Cabecalho from '../../src/components/Cabecalho';
import BotaoPrimario from '../../src/components/BotaoPrimario';
import ListaItem from '../../src/components/ListaItem';
import { stores, events } from '../../src/mocks/dados';
import { theme } from '../../src/theme';

export default function LojaDetalhe() {
  const { id } = useLocalSearchParams();
  const store = stores.find((item) => item.id === id) || stores[0];
  const [participating, setParticipating] = useState(false);
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Head>
        <title>{store.name} | ManaTrade</title>
      </Head>
      <Cabecalho title={store.name} back />
      <View style={styles.info}>
        <Text style={styles.badge}>{store.consign ? 'Aceita consignação' : 'Loja parceira'}</Text>
        <Text style={styles.text}>
          {store.distance} · {store.hours}
        </Text>
        <Text style={styles.text}>Jogos: {store.games.join(', ')}</Text>
        <Text style={styles.rating}>Avaliação 4,8 · 126 avaliações</Text>
      </View>
      <Text style={styles.title}>Eventos</Text>
      {events
        .filter((item) => item.store === store.name)
        .map((item) => (
          <ListaItem
            key={item.id}
            title={item.title}
            subtitle={`${item.date} · ${item.game}`}
            meta={participating ? 'Confirmado' : undefined}
          />
        ))}
      <View style={styles.actions}>
        <BotaoPrimario label="Consignar cartas aqui" />
        <BotaoPrimario
          label={participating ? 'Participação confirmada' : 'Vou participar'}
          onPress={() => setParticipating(true)}
        />
      </View>
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
  info: {
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
  },
  badge: { color: theme.colors.accent, fontWeight: theme.typography.weight.bold },
  text: { color: theme.colors.textMuted },
  rating: { color: theme.colors.text },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.h2,
    fontWeight: theme.typography.weight.bold,
    marginVertical: theme.spacing.lg,
  },
  actions: { gap: theme.spacing.sm, marginTop: theme.spacing.xl },
});
