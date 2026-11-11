import Head from 'expo-router/head';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Cabecalho from '../src/components/Cabecalho';
import BotaoPrimario from '../src/components/BotaoPrimario';
import BotaoSecundario from '../src/components/BotaoSecundario';
import EstadoErro from '../src/components/EstadoErro';
import { clearDeck, loadDeck, parseDecklist, saveDeck } from '../src/services/decks';
import { getExampleDeck, listExampleDecks } from '../src/services/mlApi';
import { theme } from '../src/theme';

export default function MeuDeck() {
  const [name, setName] = useState('');
  const [commander, setCommander] = useState('');
  const [list, setList] = useState('');
  const [examples, setExamples] = useState(null);
  const [filter, setFilter] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadDeck().then((d) => { if (d) { setName(d.name || ''); setCommander(d.commander.join('\n')); setList(d.deck.join('\n')); } }); }, []);

  const save = async () => {
    const deck = parseDecklist(list);
    const cmd = commander.split('\n').map((c) => c.trim()).filter(Boolean);
    if (!cmd.length) { setError('Informe o comandante.'); return; }
    if (deck.length < 10) { setError('Cole pelo menos 10 cartas (uma por linha, ex.: "1 Sol Ring").'); return; }
    setError(''); await saveDeck({ name: name || 'Meu deck', commander: cmd, deck }); setStatus(`Deck salvo: ${deck.length} cartas.`);
  };
  const openExamples = async () => {
    setLoading(true); setError('');
    try { setExamples(await listExampleDecks()); } catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  const importDeck = async (id) => {
    setLoading(true); setError('');
    try {
      const d = await getExampleDeck(id);
      setName(d.name); setCommander(d.commander.join('\n')); setList(d.deck.join('\n')); setExamples(null);
      await saveDeck(d); setStatus(`Importado e salvo: ${d.name} (${d.deck.length} cartas).`);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  const remove = async () => { await clearDeck(); setName(''); setCommander(''); setList(''); setStatus('Deck apagado.'); };

  const shown = (examples || []).filter((d) => d.deck_name.toLowerCase().includes(filter.toLowerCase())).slice(0, 30);
  return <ScrollView contentContainerStyle={styles.page}>
    <Head><title>Meu deck | ManaTrade</title></Head>
    <Cabecalho title="Meu deck Commander" subtitle="Usado para avaliar cartas escaneadas" back />
    {!!error && <EstadoErro texto={error} onRetry={() => setError('')} />}
    {!!status && <Text style={styles.status}>{status}</Text>}
    <Text style={styles.label}>Nome</Text>
    <TextInput value={name} onChangeText={setName} placeholder="Ex.: Elfos do Lathril" placeholderTextColor={theme.colors.textMuted} style={styles.input} />
    <Text style={styles.label}>Comandante(s) — um por linha</Text>
    <TextInput value={commander} onChangeText={setCommander} multiline placeholder="Atraxa, Praetors' Voice" placeholderTextColor={theme.colors.textMuted} style={[styles.input, { minHeight: 56 }]} />
    <Text style={styles.label}>Lista (99 cartas)</Text>
    <TextInput value={list} onChangeText={setList} multiline placeholder={'1 Sol Ring\n1 Arcane Signet\n30 Forest'} placeholderTextColor={theme.colors.textMuted} style={[styles.input, styles.area]} />
    <View style={styles.actions}>
      <BotaoPrimario label="Salvar deck" onPress={save} />
      <BotaoSecundario label="Importar deck oficial" onPress={openExamples} />
      <BotaoSecundario label="Apagar deck" danger onPress={remove} />
    </View>
    {loading && <ActivityIndicator color={theme.colors.accent} style={{ marginTop: theme.spacing.lg }} />}
    {examples && <View style={styles.panel}>
      <TextInput value={filter} onChangeText={setFilter} placeholder="Filtrar decks oficiais" placeholderTextColor={theme.colors.textMuted} style={styles.input} />
      {shown.map((d) => <Pressable key={d.deck_id} onPress={() => importDeck(d.deck_id)} style={({ hovered }) => [styles.item, hovered && styles.hover]}>
        <Text style={styles.itemTitle}>{d.deck_name}</Text><Text style={styles.itemMeta}>{d.release_date}</Text></Pressable>)}
    </View>}
  </ScrollView>;
}
const styles = StyleSheet.create({ page: { flexGrow: 1, maxWidth: 720, width: '100%', alignSelf: 'center', padding: theme.spacing.lg, gap: theme.spacing.sm }, label: { color: theme.colors.textMuted, marginTop: theme.spacing.sm }, input: { minHeight: 48, color: theme.colors.text, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.sm, backgroundColor: theme.colors.surface, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm }, area: { minHeight: 220, textAlignVertical: 'top' }, actions: { gap: theme.spacing.sm, marginTop: theme.spacing.lg }, status: { color: theme.colors.greenEnd }, panel: { marginTop: theme.spacing.lg, gap: theme.spacing.xs }, item: { padding: theme.spacing.md, borderRadius: theme.radius.sm, backgroundColor: theme.colors.surface }, hover: { backgroundColor: theme.colors.surfaceRaised }, itemTitle: { color: theme.colors.text, fontWeight: theme.typography.weight.medium }, itemMeta: { color: theme.colors.textMuted, fontSize: theme.typography.small } });
