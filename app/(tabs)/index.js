import Head from 'expo-router/head';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import CardCapa from '../../src/components/CardCapa';
import ChipFiltro from '../../src/components/ChipFiltro';
import Cabecalho from '../../src/components/Cabecalho';
import EstadoErro from '../../src/components/EstadoErro';
import EstadoVazio from '../../src/components/EstadoVazio';
import Skeleton from '../../src/components/Skeleton';
import ListaItem from '../../src/components/ListaItem';
import { getCards, getStores, getEvents } from '../../src/services/api';
import { useBreakpoint } from '../../src/hooks/useBreakpoint';
import { theme } from '../../src/theme';

export default function Inicio() {
  const { columns, isWide } = useBreakpoint();
  const [state, setState] = useState({ loading: true, error: false, cards: [], stores: [], events: [] });
  const [filter, setFilter] = useState('Todos');
  const [query, setQuery] = useState('');
  const load = async () => { setState((s) => ({ ...s, loading: true, error: false })); try { const [cards, stores, events] = await Promise.all([getCards(), getStores(), getEvents()]); setState({ loading: false, error: false, cards, stores, events }); } catch { setState((s) => ({ ...s, loading: false, error: true })); } };
  useEffect(() => { load(); }, []);
  const visible = state.cards.filter((item) => (filter === 'Todos' || item.game.startsWith(filter)) && item.name.toLowerCase().includes(query.toLowerCase()));
  if (state.loading) return <ScrollView contentContainerStyle={styles.page}><Head><title>Início | ManaTrade</title></Head><Cabecalho title="Descobrir" /><Skeleton height={52} /><Skeleton height={260} /></ScrollView>;
  if (state.error) return <EstadoErro onRetry={load} />;
  if (!visible.length) return <ScrollView contentContainerStyle={styles.page}><Cabecalho title="Descobrir" /><EstadoVazio titulo="Nenhuma carta encontrada" texto="Altere os filtros ou a busca." acao="Limpar filtros" onPress={() => { setFilter('Todos'); setQuery(''); }} /></ScrollView>;
  return <ScrollView contentContainerStyle={[styles.page, isWide && styles.pageWide]}><Head><title>Início | ManaTrade</title></Head><Cabecalho title="Descobrir" subtitle="Mercado, coleção e eventos em um só lugar" /><TextInput value={query} onChangeText={setQuery} placeholder="Buscar carta, edição ou jogo" placeholderTextColor={theme.colors.textMuted} style={styles.search} /><View style={styles.filters}>{['Todos','Magic','Pokémon','Yu-Gi-Oh!','Lorcana'].map((item) => <ChipFiltro key={item} label={item} active={filter === item} onPress={() => setFilter(item)} />)}</View><Section title="Em alta"><View style={[styles.grid, { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }]}>{visible.slice(0, columns).map((item) => <CardCapa key={item.id} item={item} onPress={() => router.push(`/carta/${item.id}`)} />)}</View></Section><Section title="Anúncios perto de você"><View>{state.stores.slice(0, 3).map((store) => <ListaItem key={store.id} title={store.name} subtitle={`${store.distance} · ${store.hours}`} meta={store.consign ? 'Consignação' : undefined} onPress={() => router.push(`/loja/${store.id}`)} />)}</View></Section><Section title="Eventos nas lojas parceiras"><View>{state.events.slice(0, 3).map((event) => <ListaItem key={event.id} title={event.title} subtitle={`${event.store} · ${event.game}`} meta={event.date} onPress={() => router.push('/comunidade')} />)}</View></Section></ScrollView>;
}
function Section({ title, children }) { return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>; }
const styles = StyleSheet.create({ page: { flexGrow: 1, maxWidth: 1320, alignSelf: 'center', width: '100%', padding: theme.spacing.lg, paddingLeft: theme.spacing.xxl }, pageWide: { paddingLeft: 142 }, search: { minHeight: 48, color: theme.colors.text, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, paddingHorizontal: theme.spacing.md }, filters: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginVertical: theme.spacing.lg }, grid: { display: 'grid', gap: theme.spacing.lg, width: '100%', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }, section: { gap: theme.spacing.md, marginBottom: theme.spacing.xxl }, sectionTitle: { color: theme.colors.text, fontSize: theme.typography.h2, fontWeight: theme.typography.weight.bold } });
