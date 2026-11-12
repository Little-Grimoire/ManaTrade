import Head from 'expo-router/head';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Cabecalho from '../../src/components/Cabecalho';
import BotaoPrimario from '../../src/components/BotaoPrimario';
import ChipFiltro from '../../src/components/ChipFiltro';
import { criarDeck, listarFormatos } from '../../src/services/decks';
import { theme } from '../../src/theme';

const descricaoFormato = (f) => {
  if (!f) return '';
  if (f.comandante) return `${f.maximo} cartas com o comandante, 1 cópia de cada (exceto terrenos básicos), cores do comandante.`;
  if (f.copias) return `Mínimo de ${f.minimo} cartas, até ${f.copias} cópias de cada (exceto terrenos básicos).`;
  return 'Sem regras de tamanho, cópias ou legalidade.';
};

export default function NovoDeck() {
  const [formatos, setFormatos] = useState([]);
  const [form, setForm] = useState({ nome: '', formato: 'commander', comandante: '', descricao: '' });
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const update = (k, v) => setForm((c) => ({ ...c, [k]: v }));

  useEffect(() => { listarFormatos().then(setFormatos).catch((e) => setErro(e.message)); }, []);
  const formato = formatos.find((f) => f.chave === form.formato);

  const salvar = async () => {
    if (!form.nome.trim()) { setErro('Dê um nome ao deck.'); return; }
    setErro(''); setEnviando(true);
    try {
      const deck = await criarDeck({
        nome: form.nome.trim(),
        formato: form.formato,
        descricao: form.descricao.trim() || undefined,
        comandante: formato?.comandante && form.comandante.trim() ? form.comandante.trim() : undefined,
      });
      router.replace(`/decks/${deck.id}`);
    } catch (e) { setErro(e.message); } finally { setEnviando(false); }
  };

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Head><title>Novo deck | ManaTrade</title></Head>
      <Cabecalho title="Novo deck" back />
      <Text style={styles.label}>Nome</Text>
      <TextInput value={form.nome} onChangeText={(v) => update('nome', v)} placeholder="Ex.: Elfos do Lathril" placeholderTextColor={theme.colors.textMuted} style={styles.input} />

      <Text style={styles.label}>Formato</Text>
      <View style={styles.linha}>{formatos.map((f) => <ChipFiltro key={f.chave} label={f.nome} active={form.formato === f.chave} onPress={() => update('formato', f.chave)} />)}</View>
      <Text style={styles.ajuda}>{descricaoFormato(formato)}</Text>

      {formato?.comandante && (
        <>
          <Text style={styles.label}>Comandante (opcional agora; aceita erros de digitação)</Text>
          <TextInput value={form.comandante} onChangeText={(v) => update('comandante', v)} placeholder="Ex.: Lathril, Blade of the Elves" placeholderTextColor={theme.colors.textMuted} style={styles.input} />
        </>
      )}

      <Text style={styles.label}>Descrição (opcional)</Text>
      <TextInput value={form.descricao} onChangeText={(v) => update('descricao', v)} multiline placeholder="Estratégia, ideias…" placeholderTextColor={theme.colors.textMuted} style={[styles.input, styles.area]} />

      {!!erro && <Text style={styles.erro}>{erro}</Text>}
      <BotaoPrimario label={enviando ? 'Criando…' : 'Criar deck'} onPress={salvar} disabled={enviando} />
      <Text style={styles.ajuda}>Depois de criar, você adiciona cartas digitando, colando uma lista ou pelo ManaScan.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({ page: { flexGrow: 1, maxWidth: 720, width: '100%', alignSelf: 'center', padding: theme.spacing.lg, gap: theme.spacing.sm }, label: { color: theme.colors.textMuted, marginTop: theme.spacing.sm }, ajuda: { color: theme.colors.textMuted, fontSize: theme.typography.small }, input: { minHeight: 48, color: theme.colors.text, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.sm, backgroundColor: theme.colors.surface, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm }, area: { minHeight: 96, textAlignVertical: 'top' }, linha: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }, erro: { color: theme.colors.danger } });
