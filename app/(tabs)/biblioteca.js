import Head from 'expo-router/head';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Cabecalho from '../../src/components/Cabecalho';
import BotaoPrimario from '../../src/components/BotaoPrimario';
import ChipFiltro from '../../src/components/ChipFiltro';
import EstadoErro from '../../src/components/EstadoErro';
import EstadoVazio from '../../src/components/EstadoVazio';
import ModalConfirmacao from '../../src/components/ModalConfirmacao';
import Quantidade from '../../src/components/Quantidade';
import Skeleton from '../../src/components/Skeleton';
import { CONDICOES, adicionarNaColecao, atualizarItemColecao, listarColecao, removerItemColecao } from '../../src/services/colecao';
import { listarDecks } from '../../src/services/decks';
import { useBreakpoint } from '../../src/hooks/useBreakpoint';
import { theme } from '../../src/theme';

const usd = (v) => `US$ ${Number(v).toFixed(2)}`;

export default function Biblioteca() {
  const params = useLocalSearchParams();
  const [aba, setAba] = useState(params.aba === 'decks' ? 'decks' : 'colecao');
  const { isWide } = useBreakpoint();

  // Permite abrir direto na aba de decks (ex.: atalho do Início ou do ManaScan).
  useEffect(() => { if (params.aba === 'decks' || params.aba === 'colecao') setAba(params.aba); }, [params.aba]);

  return (
    <View style={[styles.wrap, isWide && styles.wide]}>
      <Head><title>Biblioteca | ManaTrade</title></Head>
      <View style={styles.abas}>
        <ChipFiltro label="Coleção" active={aba === 'colecao'} onPress={() => setAba('colecao')} />
        <ChipFiltro label="Decks" active={aba === 'decks'} onPress={() => setAba('decks')} />
      </View>
      {aba === 'colecao' ? <Colecao /> : <Decks />}
    </View>
  );
}

// ---------------- Coleção ----------------

function Colecao() {
  const [itens, setItens] = useState([]);
  const [status, setStatus] = useState('loading');
  const [erro, setErro] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [busca, setBusca] = useState('');
  const [ordem, setOrdem] = useState('nome');
  const [novo, setNovo] = useState({ nome: '', quantidade: 1, condicao: 'NM', foil: false });
  const [msgNovo, setMsgNovo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [aberto, setAberto] = useState(null); // id do item em edição
  const [msgItem, setMsgItem] = useState('');
  const [removendo, setRemovendo] = useState(null);

  const load = useCallback(async () => {
    try { setItens(await listarColecao()); setStatus('ready'); } catch (e) { setErro(e.message); setStatus('error'); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const adicionar = async () => {
    if (!novo.nome.trim()) { setMsgNovo({ ok: false, texto: 'Digite o nome da carta.' }); return; }
    setEnviando(true); setMsgNovo(null);
    try {
      const item = await adicionarNaColecao({ nome: novo.nome.trim() }, { quantidade: novo.quantidade, condicao: novo.condicao, foil: novo.foil });
      setItens((atual) => [...atual.filter((i) => i.id !== item.id), item]);
      setNovo({ nome: '', quantidade: 1, condicao: 'NM', foil: false });
      setMsgNovo({ ok: true, texto: `${item.carta.nome} adicionada (${item.quantidade} no total nesta condição).` });
    } catch (e) { setMsgNovo({ ok: false, texto: e.message }); } finally { setEnviando(false); }
  };

  const atualizar = async (item, dados) => {
    setMsgItem('');
    try {
      const novoItem = await atualizarItemColecao(item.id, dados);
      setItens((atual) => atual.map((i) => (i.id === item.id ? novoItem : i)));
    } catch (e) { setMsgItem(e.message); }
  };

  const confirmarRemocao = async () => {
    const alvo = removendo; setRemovendo(null);
    try { await removerItemColecao(alvo.id); setItens((atual) => atual.filter((i) => i.id !== alvo.id)); setAberto(null); } catch (e) { setMsgItem(e.message); }
  };

  if (status === 'loading') return <View style={styles.page}><Skeleton height={160} /><Skeleton height={260} /></View>;
  if (status === 'error') return <EstadoErro texto={erro} onRetry={() => { setStatus('loading'); load(); }} />;

  const totalCartas = itens.reduce((s, i) => s + i.quantidade, 0);
  const valor = itens.reduce((s, i) => s + (Number(i.carta.preco_usd) || 0) * i.quantidade, 0);
  const filtro = busca.trim().toLowerCase();
  const visiveis = itens
    .filter((i) => !filtro || i.carta.nome.toLowerCase().includes(filtro))
    .sort((a, b) => (ordem === 'preco' ? (Number(b.carta.preco_usd) || 0) - (Number(a.carta.preco_usd) || 0) : a.carta.nome.localeCompare(b.carta.nome)));

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={theme.colors.accent} />}>
      <Cabecalho title="Coleção" subtitle={totalCartas ? `${totalCartas} ${totalCartas === 1 ? 'carta' : 'cartas'} · referência Scryfall ${usd(valor)}` : 'Suas cartas'} />

      <View style={styles.box}>
        <Text style={styles.boxTitle}>Adicionar carta</Text>
        <TextInput value={novo.nome} onChangeText={(v) => setNovo((c) => ({ ...c, nome: v }))} onSubmitEditing={adicionar} placeholder="Nome em inglês (aceita erros de digitação)" placeholderTextColor={theme.colors.textMuted} style={styles.input} />
        <View style={styles.linha}>
          <Quantidade valor={novo.quantidade} onAlterar={(q) => setNovo((c) => ({ ...c, quantidade: q }))} />
          {CONDICOES.map((c) => <ChipFiltro key={c} label={c} active={novo.condicao === c} onPress={() => setNovo((x) => ({ ...x, condicao: c }))} />)}
          <ChipFiltro label="Foil" active={novo.foil} onPress={() => setNovo((x) => ({ ...x, foil: !x.foil }))} />
        </View>
        {!!msgNovo && <Text style={{ color: msgNovo.ok ? theme.colors.greenEnd : theme.colors.danger }}>{msgNovo.texto}</Text>}
        <View style={styles.linha}>
          <BotaoPrimario label={enviando ? 'Buscando…' : 'Adicionar'} onPress={adicionar} disabled={enviando} style={styles.flex} />
          <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/manuscan')} style={styles.secundario}><Text style={styles.secundarioTexto}>Escanear</Text></Pressable>
        </View>
      </View>

      {!itens.length ? (
        <EstadoVazio titulo="Coleção vazia" texto="Adicione cartas acima ou identifique pelo ManaScan." />
      ) : (
        <>
          <View style={styles.linha}>
            <TextInput value={busca} onChangeText={setBusca} placeholder="Filtrar pelo nome" placeholderTextColor={theme.colors.textMuted} style={[styles.input, styles.flex]} />
            <Pressable accessibilityRole="button" onPress={() => setOrdem(ordem === 'nome' ? 'preco' : 'nome')} style={styles.secundario}><Text style={styles.secundarioTexto}>{ordem === 'nome' ? 'A–Z' : 'Preço'}</Text></Pressable>
          </View>
          {visiveis.map((item) => (
            <View key={item.id} style={styles.item}>
              <Pressable accessibilityRole="button" onPress={() => { setMsgItem(''); setAberto(aberto === item.id ? null : item.id); }} style={styles.itemTop}>
                {item.carta.imagem_url ? <Image source={{ uri: item.carta.imagem_url }} style={styles.thumb} /> : <View style={[styles.thumb, styles.thumbVazio]} />}
                <View style={styles.flex}>
                  <Text style={styles.nome}>{item.quantidade}× {item.carta.nome}</Text>
                  <Text style={styles.muted}>{[item.carta.edicao, item.condicao, item.foil && 'Foil'].filter(Boolean).join(' · ')}</Text>
                  {item.carta.preco_usd != null && <Text style={styles.preco}>{usd(item.carta.preco_usd)}</Text>}
                  {!!item.observacao && <Text style={styles.obs}>{item.observacao}</Text>}
                </View>
              </Pressable>
              {aberto === item.id && (
                <View style={styles.edicao}>
                  <View style={styles.linha}>
                    <Quantidade valor={item.quantidade} onAlterar={(q) => atualizar(item, { quantidade: q })} onRemover={() => setRemovendo(item)} />
                    {CONDICOES.map((c) => <ChipFiltro key={c} label={c} active={item.condicao === c} onPress={() => atualizar(item, { condicao: c })} />)}
                    <ChipFiltro label="Foil" active={item.foil} onPress={() => atualizar(item, { foil: !item.foil })} />
                  </View>
                  {!!msgItem && <Text style={styles.erro}>{msgItem}</Text>}
                  <Pressable accessibilityRole="button" onPress={() => setRemovendo(item)} style={styles.remover}><Text style={styles.removerTexto}>Remover da coleção</Text></Pressable>
                </View>
              )}
            </View>
          ))}
        </>
      )}
      <ModalConfirmacao visible={!!removendo} title="Remover da coleção?" message={removendo ? `${removendo.quantidade}× ${removendo.carta.nome} (${removendo.condicao}) sairá da coleção.` : ''} confirmLabel="Remover" onConfirm={confirmarRemocao} onCancel={() => setRemovendo(null)} />
    </ScrollView>
  );
}

// ---------------- Decks ----------------

function Decks() {
  const [decks, setDecks] = useState([]);
  const [status, setStatus] = useState('loading');
  const [erro, setErro] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setDecks(await listarDecks()); setStatus('ready'); } catch (e) { setErro(e.message); setStatus('error'); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (status === 'loading') return <View style={styles.page}><Skeleton height={100} /><Skeleton height={100} /></View>;
  if (status === 'error') return <EstadoErro texto={erro} onRetry={() => { setStatus('loading'); load(); }} />;

  return (
    <ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={theme.colors.accent} />}>
      <Cabecalho title="Decks" subtitle={decks.length ? `${decks.length} ${decks.length === 1 ? 'deck' : 'decks'}` : 'Commander, Pauper, Modern…'} action={<BotaoPrimario label="Novo deck" onPress={() => router.push('/decks/novo')} />} />
      {!decks.length ? (
        <EstadoVazio titulo="Nenhum deck" texto="Crie um deck e adicione cartas digitando, colando uma lista ou pelo ManaScan." acao="Criar deck" onPress={() => router.push('/decks/novo')} />
      ) : decks.map((d) => (
        <Pressable key={d.id} accessibilityRole="button" onPress={() => router.push(`/decks/${d.id}`)} style={({ hovered, pressed }) => [styles.item, styles.itemTop, (hovered || pressed) && styles.hover]}>
          {d.comandante?.imagem_url ? <Image source={{ uri: d.comandante.imagem_url }} style={styles.thumb} /> : <View style={[styles.thumb, styles.thumbVazio, styles.centro]}><Text style={styles.formatoSigla}>{d.formatoNome?.slice(0, 3)}</Text></View>}
          <View style={styles.flex}>
            <Text style={styles.nome}>{d.nome}</Text>
            <Text style={styles.muted}>{d.formatoNome}{d.comandante ? ` · ${d.comandante.nome}` : ''}</Text>
            <Text style={styles.muted}>{d.total}{d.maximo ? `/${d.maximo}` : d.minimo ? `/${d.minimo}+` : ''} cartas</Text>
            <Text style={[styles.status, { color: d.valido ? theme.colors.greenEnd : theme.colors.warning }]}>{d.valido ? 'Válido' : 'Incompleto ou com problemas'}</Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ wrap: { flex: 1 }, wide: { paddingLeft: 118 }, abas: { flexDirection: 'row', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg, maxWidth: 960, width: '100%', alignSelf: 'center' }, page: { flexGrow: 1, maxWidth: 960, alignSelf: 'center', width: '100%', padding: theme.spacing.lg, gap: theme.spacing.md }, box: { gap: theme.spacing.sm, padding: theme.spacing.lg, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }, boxTitle: { color: theme.colors.text, fontSize: theme.typography.h3, fontWeight: theme.typography.weight.bold }, input: { minHeight: 48, color: theme.colors.text, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.sm, backgroundColor: theme.colors.background, paddingHorizontal: theme.spacing.md }, linha: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.sm }, flex: { flex: 1 }, secundario: { minHeight: 48, justifyContent: 'center', paddingHorizontal: theme.spacing.lg, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border }, secundarioTexto: { color: theme.colors.text, fontWeight: theme.typography.weight.bold }, item: { gap: theme.spacing.sm, padding: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }, itemTop: { flexDirection: 'row', gap: theme.spacing.md }, hover: { borderColor: theme.colors.accent }, thumb: { width: 64, height: 89, borderRadius: theme.radius.sm }, thumbVazio: { backgroundColor: theme.colors.background }, centro: { alignItems: 'center', justifyContent: 'center' }, formatoSigla: { color: theme.colors.accent, fontWeight: theme.typography.weight.bold }, nome: { color: theme.colors.text, fontSize: theme.typography.h3, fontWeight: theme.typography.weight.bold }, muted: { color: theme.colors.textMuted, fontSize: theme.typography.small }, preco: { color: theme.colors.accent, fontWeight: theme.typography.weight.bold, marginTop: 2 }, obs: { color: theme.colors.text, fontStyle: 'italic' }, status: { fontWeight: theme.typography.weight.bold, marginTop: 2, fontSize: theme.typography.small }, edicao: { gap: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: theme.spacing.sm }, erro: { color: theme.colors.danger }, remover: { minHeight: 44, justifyContent: 'center' }, removerTexto: { color: theme.colors.danger, fontWeight: theme.typography.weight.bold } });
