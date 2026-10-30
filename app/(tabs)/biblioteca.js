import Head from 'expo-router/head';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Cabecalho from '../../src/components/Cabecalho';
import CardCapa from '../../src/components/CardCapa';
import ChipFiltro from '../../src/components/ChipFiltro';
import EstadoErro from '../../src/components/EstadoErro';
import EstadoVazio from '../../src/components/EstadoVazio';
import Skeleton from '../../src/components/Skeleton';
import ListaItem from '../../src/components/ListaItem';
import { getCards } from '../../src/services/api';
import { useBreakpoint } from '../../src/hooks/useBreakpoint';
import { theme } from '../../src/theme';

export default function Biblioteca() {
  const [cards, setCards] = useState([]);
  const [status, setStatus] = useState('loading');
  const [game, setGame] = useState('Magic');
  const [view, setView] = useState('grade');
  const [sort, setSort] = useState('name');
  const { columns, isWide } = useBreakpoint();
  const load = async () => {
    setStatus('loading');
    try {
      setCards(await getCards());
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  };
  useEffect(() => {
    load();
  }, []);
  const prefix = game === 'Magic' ? 'Magic' : game;
  const visible = cards
    .filter((card) => card.game.startsWith(prefix))
    .sort((a, b) => (sort === 'price' ? b.price - a.price : a.name.localeCompare(b.name)));
  if (status === 'loading')
    return (
      <View style={styles.page}>
        <Skeleton height={72} />
        <Skeleton height={260} />
      </View>
    );
  if (status === 'error') return <EstadoErro onRetry={load} />;
  return (
    <ScrollView contentContainerStyle={[styles.page, isWide && styles.wide]}>
      <Head>
        <title>Biblioteca | ManaTrade</title>
      </Head>
      <Cabecalho
        title="Biblioteca"
        subtitle={`Valor estimado: R$ ${visible.reduce((sum, card) => sum + card.price, 0).toFixed(2)}`}
      />
      <View style={styles.row}>
        {['Magic', 'Pokémon', 'Yu-Gi-Oh!', 'Lorcana'].map((item) => (
          <ChipFiltro
            key={item}
            label={item}
            active={game === item}
            onPress={() => setGame(item)}
          />
        ))}
      </View>
      <View style={styles.toolbar}>
        <Pressable
          onPress={() => setView(view === 'grade' ? 'lista' : 'grade')}
          style={styles.control}
        >
          <Text style={styles.controlText}>{view === 'grade' ? 'Lista' : 'Grade'}</Text>
        </Pressable>
        <Pressable
          onPress={() => setSort(sort === 'name' ? 'price' : 'name')}
          style={styles.control}
        >
          <Text style={styles.controlText}>Ordenar: {sort === 'name' ? 'Nome' : 'Preço'}</Text>
        </Pressable>
      </View>
      {visible.length ? (
        <>
          <View style={styles.progress}>
            <Text style={styles.progressText}>The Lord of the Rings · 42/295 cartas</Text>
            <View style={styles.track}>
              <View style={styles.fill} />
            </View>
          </View>
          {view === 'grade' ? (
            <View
              style={[styles.grid, { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }]}
            >
              {visible.map((card) => (
                <CardCapa key={card.id} item={card} />
              ))}
            </View>
          ) : (
            visible.map((card) => (
              <ListaItem
                key={card.id}
                title={card.name}
                subtitle={`${card.edition} · ${card.condition}`}
                meta={`R$ ${card.price.toFixed(2)}`}
              />
            ))
          )}
        </>
      ) : (
        <EstadoVazio titulo="Coleção vazia" texto="Adicione cartas pelo ManaScan." />
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
  wide: { paddingLeft: 142 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  toolbar: { flexDirection: 'row', gap: theme.spacing.sm, marginVertical: theme.spacing.lg },
  control: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
  },
  controlText: { color: theme.colors.text },
  progress: { marginBottom: theme.spacing.lg },
  progressText: { color: theme.colors.textMuted, marginBottom: theme.spacing.sm },
  track: {
    height: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.border,
    overflow: 'hidden',
  },
  fill: { width: '14%', height: '100%', backgroundColor: theme.colors.accent },
  grid: { display: 'grid', gap: theme.spacing.lg },
});
