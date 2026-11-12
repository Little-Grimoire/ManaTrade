import Head from 'expo-router/head';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Cabecalho from '../../src/components/Cabecalho';
import BotaoPrimario from '../../src/components/BotaoPrimario';
import BotaoSecundario from '../../src/components/BotaoSecundario';
import ChipFiltro from '../../src/components/ChipFiltro';
import EstadoErro from '../../src/components/EstadoErro';
import ModalConfirmacao from '../../src/components/ModalConfirmacao';
import Quantidade from '../../src/components/Quantidade';
import Skeleton from '../../src/components/Skeleton';
import {
  adicionarCartaNoDeck, alterarQuantidadeNoDeck, atualizarDeck, excluirDeck, importarLista, listaDoDeckOficial,
  listarFormatos, obterDeck, removerCartaDoDeck,
} from '../../src/services/decks';
import { getExampleDeck, listExampleDecks } from '../../src/services/mlApi';
import { theme } from '../../src/theme';

const ORDEM_CATEGORIAS = ['Criaturas', 'Planeswalkers', 'Mágicas instantâneas', 'Feitiços', 'Artefatos', 'Encantamentos', 'Batalhas', 'Outros', 'Terrenos'];

export default function DeckDetalhe() {
  const { id } = useLocalSearchParams();
  const [deck, setDeck] = useState(null);
  const [status, setStatus] = useState('loading');
  const [erro, setErro] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, texto }
  const [nomeCarta, setNomeCarta] = useState('');
  const [nomeComandante, setNomeComandante] = useState('');
  const [painel, setPainel] = useState(null); // 'importar' | 'oficial' | 'editar'
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  const load = useCallback(async () => {
    try { setDeck(await obterDeck(id)); setStatus('ready'); } catch (e) { setErro(e.message); setStatus('error'); }
  }, [id]);
  // Recarrega ao voltar do ManaScan (a carta escaneada já foi adicionada no servidor).
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Executa uma ação que devolve o deck atualizado.
  const executar = async (acao, sucesso) => {
    setOcupado(true); setMsg(null);
    try {
      const r = await acao();
      setDeck(r.deck || r);
      if (sucesso) setMsg({ ok: true, texto: typeof sucesso === 'function' ? sucesso(r) : sucesso });
      return true;
    } catch (e) { setMsg({ ok: false, texto: e.message }); return false; } finally { setOcupado(false); }
  };

  const adicionar = async () => {
    const nome = nomeCarta.trim();
    if (!nome) return;
    if (await executar(() => adicionarCartaNoDeck(id, { nome }), 'Carta adicionada.')) setNomeCarta('');
  };

  const definirComandante = async () => {
    const nome = nomeComandante.trim();
    if (!nome) return;
    if (await executar(() => atualizarDeck(id, { comandante: nome }), 'Comandante definido.')) setNomeComandante('');
  };

  const escanear = () => router.push({ pathname: '/(tabs)/manuscan', params: { deckId: String(id), deckNome: deck.nome } });

  if (status === 'loading') return <View style={styles.page}><Skeleton height={120} /><Skeleton height={320} /></View>;
  if (status === 'error') return <EstadoErro texto={erro} onRetry={() => { setStatus('loading'); load(); }} />;

  const { validacao, estatisticas } = deck;
  const usaComandante = deck.formato === 'commander';
  const grupos = ORDEM_CATEGORIAS
    .map((cat) => ({ cat, itens: deck.cartas.filter((c) => c.categoria === cat) }))
    .filter((g) => g.itens.length);
  const tamanho = validacao.maximo ? `${validacao.total}/${validacao.maximo}` : validacao.minimo ? `${validacao.total}/${validacao.minimo}+` : `${validacao.total}`;

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={theme.colors.accent} />}>
      <Head><title>{`${deck.nome} | ManaTrade`}</title></Head>
      <Cabecalho title={deck.nome} subtitle={`${deck.formatoNome} · ${tamanho} cartas`} back />
      {!!deck.descricao && <Text style={styles.muted}>{deck.descricao}</Text>}

      {/* Situação do deck pelas regras do formato */}
      <View style={[styles.box, { borderColor: validacao.valido ? theme.colors.greenEnd : theme.colors.warning }]}>
        <Text style={[styles.boxTitle, { color: validacao.valido ? theme.colors.greenEnd : theme.colors.warning }]}>
          {validacao.valido ? `Deck válido para ${deck.formatoNome}` : 'O deck ainda não está pronto'}
        </Text>
        {validacao.problemas.map((p) => <Text key={p} style={styles.texto}>• {p}</Text>)}
        <Text style={styles.muted}>Na sua coleção: {estatisticas.possuidas} de {estatisticas.total} cartas</Text>
      </View>

      {/* Comandante */}
      {usaComandante && (
        <View style={styles.box}>
          <Text style={styles.boxTitle}>Comandante</Text>
          {deck.comandante ? (
            <View style={styles.linhaTopo}>
              {!!deck.comandante.imagem_url && <Image source={{ uri: deck.comandante.imagem_url }} style={styles.cmdImg} accessibilityLabel={deck.comandante.nome} />}
              <View style={styles.flex}>
                <Text style={styles.nome}>{deck.comandante.nome}</Text>
                <Text style={styles.muted}>{deck.comandante.tipo}</Text>
                <Text style={styles.muted}>Identidade de cor: {deck.comandante.identidade_cor || 'incolor'}</Text>
                <Text style={deck.comandanteNaColecao ? styles.tem : styles.falta}>{deck.comandanteNaColecao ? 'Na sua coleção' : 'Não está na sua coleção'}</Text>
              </View>
            </View>
          ) : <Text style={styles.muted}>Nenhum comandante definido.</Text>}
          <View style={styles.linha}>
            <TextInput value={nomeComandante} onChangeText={setNomeComandante} onSubmitEditing={definirComandante} placeholder={deck.comandante ? 'Trocar comandante' : 'Nome do comandante'} placeholderTextColor={theme.colors.textMuted} style={[styles.input, styles.flex]} />
            <Botao label="Definir" onPress={definirComandante} disabled={ocupado} />
          </View>
        </View>
      )}

      {/* Adicionar cartas */}
      <View style={styles.box}>
        <Text style={styles.boxTitle}>Adicionar cartas</Text>
        <View style={styles.linha}>
          <TextInput value={nomeCarta} onChangeText={setNomeCarta} onSubmitEditing={adicionar} placeholder="Nome da carta (aceita erros de digitação)" placeholderTextColor={theme.colors.textMuted} style={[styles.input, styles.flex]} />
          <Botao label="Adicionar" onPress={adicionar} disabled={ocupado} destaque />
        </View>
        <View style={styles.linha}>
          <Botao label="Escanear com o ManaScan" onPress={escanear} />
          <Botao label="Colar lista" onPress={() => setPainel(painel === 'importar' ? null : 'importar')} ativo={painel === 'importar'} />
          {usaComandante && <Botao label="Deck oficial" onPress={() => setPainel(painel === 'oficial' ? null : 'oficial')} ativo={painel === 'oficial'} />}
        </View>
        {ocupado && <ActivityIndicator color={theme.colors.accent} />}
        {!!msg && <Text style={{ color: msg.ok ? theme.colors.greenEnd : theme.colors.danger }}>{msg.texto}</Text>}
        {painel === 'importar' && <PainelImportar deckId={id} executar={executar} fechar={() => setPainel(null)} />}
        {painel === 'oficial' && <PainelOficial deckId={id} executar={executar} fechar={() => setPainel(null)} />}
      </View>

      {/* Estatísticas */}
      {!!deck.cartas.length && <Estatisticas estatisticas={estatisticas} />}

      {/* Lista agrupada por tipo */}
      {grupos.map(({ cat, itens }) => (
        <View key={cat} style={styles.grupo}>
          <Text style={styles.grupoTitulo}>{cat} ({itens.reduce((s, i) => s + i.quantidade, 0)})</Text>
          {itens.map((item) => (
            <View key={item.carta.id} style={styles.cartaLinha}>
              <View style={styles.flex}>
                <Text style={styles.cartaNome}>{item.carta.nome} <Text style={styles.muted}>{item.carta.custo_mana || ''}</Text></Text>
                <Text style={item.naColecao >= item.quantidade ? styles.tem : styles.falta}>
                  {item.naColecao ? `Você tem ${item.naColecao}` : 'Não está na coleção'}
                </Text>
                {item.problemas.map((p) => <Text key={p} style={styles.problema}>⚠ {p}</Text>)}
              </View>
              <Quantidade
                valor={item.quantidade}
                desabilitado={ocupado}
                onAlterar={(q) => executar(() => alterarQuantidadeNoDeck(id, item.carta.id, q))}
                onRemover={() => executar(() => removerCartaDoDeck(id, item.carta.id), `${item.carta.nome} removida.`)}
              />
            </View>
          ))}
        </View>
      ))}

      {/* Editar e excluir */}
      <View style={styles.linha}>
        <Botao label="Editar deck" onPress={() => setPainel(painel === 'editar' ? null : 'editar')} ativo={painel === 'editar'} />
        <Botao label="Excluir deck" perigo onPress={() => setConfirmarExclusao(true)} />
      </View>
      {painel === 'editar' && <PainelEditar deck={deck} executar={executar} fechar={() => setPainel(null)} />}

      <ModalConfirmacao
        visible={confirmarExclusao}
        title="Excluir deck?"
        message={`"${deck.nome}" e a lista de cartas serão apagados. As cartas da sua coleção não são afetadas.`}
        confirmLabel="Excluir"
        onCancel={() => setConfirmarExclusao(false)}
        onConfirm={async () => {
          setConfirmarExclusao(false);
          try { await excluirDeck(id); router.replace({ pathname: '/(tabs)/biblioteca', params: { aba: 'decks' } }); } catch (e) { setMsg({ ok: false, texto: e.message }); }
        }}
      />
    </ScrollView>
  );
}

// ---------- partes da tela ----------

function Botao({ label, onPress, disabled, destaque, perigo, ativo }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.botao, (destaque || ativo) && styles.botaoDestaque, perigo && styles.botaoPerigo, (pressed || disabled) && { opacity: 0.7 }]}>
      <Text style={[styles.botaoTexto, (destaque || ativo) && { color: theme.colors.background }, perigo && { color: theme.colors.danger }]}>{label}</Text>
    </Pressable>
  );
}

function PainelImportar({ deckId, executar, fechar }) {
  const [lista, setLista] = useState('');
  const [substituir, setSubstituir] = useState(false);
  const importar = async () => {
    const ok = await executar(() => importarLista(deckId, lista, substituir), (r) => (r.naoEncontradas.length
      ? `Importado. Não encontradas (confira o nome em inglês): ${r.naoEncontradas.join(', ')}`
      : 'Lista importada.'));
    if (ok) { setLista(''); fechar(); }
  };
  return (
    <View style={styles.painel}>
      <Text style={styles.muted}>Uma carta por linha. Aceita listas do Moxfield, Archidekt, MTG Arena e EDHREC (nomes em inglês). Linhas em "Commander" definem o comandante.</Text>
      <TextInput value={lista} onChangeText={setLista} multiline placeholder={'Commander\n1 Lathril, Blade of the Elves\n\nDeck\n1 Sol Ring\n4 Lightning Bolt\n30 Forest'} placeholderTextColor={theme.colors.textMuted} style={[styles.input, styles.area]} />
      <View style={styles.linha}>
        <ChipFiltro label="Substituir as cartas atuais" active={substituir} onPress={() => setSubstituir(!substituir)} />
        <Botao label="Importar" destaque onPress={importar} disabled={!lista.trim()} />
      </View>
    </View>
  );
}

// Decks oficiais de Commander vêm da API de ML (mesma base usada no treino do modelo).
function PainelOficial({ deckId, executar, fechar }) {
  const [oficiais, setOficiais] = useState(null);
  const [filtro, setFiltro] = useState('');
  const [erro, setErro] = useState('');
  useEffect(() => { listExampleDecks().then(setOficiais).catch((e) => setErro(e.message)); }, []);
  const escolher = async (deckOficial) => {
    try {
      const completo = await getExampleDeck(deckOficial.deck_id);
      const ok = await executar(() => importarLista(deckId, listaDoDeckOficial(completo), true), `Deck "${completo.name}" importado.`);
      if (ok) fechar();
    } catch (e) { setErro(e.message); }
  };
  if (erro) return <Text style={styles.problema}>{erro}</Text>;
  if (!oficiais) return <ActivityIndicator color={theme.colors.accent} />;
  const visiveis = oficiais.filter((d) => d.deck_name.toLowerCase().includes(filtro.toLowerCase())).slice(0, 20);
  return (
    <View style={styles.painel}>
      <Text style={styles.muted}>Substitui as cartas do deck pela lista oficial escolhida.</Text>
      <TextInput value={filtro} onChangeText={setFiltro} placeholder="Filtrar decks oficiais" placeholderTextColor={theme.colors.textMuted} style={styles.input} />
      {visiveis.map((d) => (
        <Pressable key={d.deck_id} accessibilityRole="button" onPress={() => escolher(d)} style={({ hovered, pressed }) => [styles.oficial, (hovered || pressed) && styles.oficialHover]}>
          <Text style={styles.cartaNome}>{d.deck_name}</Text>
          <Text style={styles.muted}>{d.release_date}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function PainelEditar({ deck, executar, fechar }) {
  const [formatos, setFormatos] = useState([]);
  const [form, setForm] = useState({ nome: deck.nome, formato: deck.formato, descricao: deck.descricao || '' });
  useEffect(() => { listarFormatos().then(setFormatos).catch(() => {}); }, []);
  const salvar = async () => {
    const ok = await executar(() => atualizarDeck(deck.id, { nome: form.nome.trim(), formato: form.formato, descricao: form.descricao.trim() || null }), 'Deck atualizado.');
    if (ok) fechar();
  };
  return (
    <View style={styles.painel}>
      <TextInput value={form.nome} onChangeText={(v) => setForm((c) => ({ ...c, nome: v }))} placeholder="Nome" placeholderTextColor={theme.colors.textMuted} style={styles.input} />
      <View style={styles.linha}>{formatos.map((f) => <ChipFiltro key={f.chave} label={f.nome} active={form.formato === f.chave} onPress={() => setForm((c) => ({ ...c, formato: f.chave }))} />)}</View>
      {deck.formato === 'commander' && form.formato !== 'commander' && <Text style={styles.problema}>Ao sair do Commander, o comandante é removido do deck.</Text>}
      <TextInput value={form.descricao} onChangeText={(v) => setForm((c) => ({ ...c, descricao: v }))} multiline placeholder="Descrição" placeholderTextColor={theme.colors.textMuted} style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]} />
      <BotaoPrimario label="Salvar alterações" onPress={salvar} />
      <BotaoSecundario label="Cancelar" onPress={fechar} />
    </View>
  );
}

function Estatisticas({ estatisticas }) {
  const valores = Object.values(estatisticas.curva);
  const maior = Math.max(1, ...valores);
  return (
    <View style={styles.box}>
      <Text style={styles.boxTitle}>Estatísticas</Text>
      <View style={styles.linha}>
        {Object.entries(estatisticas.porTipo).map(([tipo, n]) => <Text key={tipo} style={styles.chipInfo}>{tipo}: {n}</Text>)}
      </View>
      <Text style={styles.muted}>Curva de mana (sem terrenos)</Text>
      <View style={styles.curva}>
        {Object.entries(estatisticas.curva).map(([cmc, n]) => (
          <View key={cmc} style={styles.coluna}>
            <Text style={styles.colunaValor}>{n || ''}</Text>
            <View style={[styles.barra, { height: 4 + (n / maior) * 72 }]} />
            <Text style={styles.muted}>{cmc}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({ page: { flexGrow: 1, maxWidth: 960, width: '100%', alignSelf: 'center', padding: theme.spacing.lg, gap: theme.spacing.md }, box: { gap: theme.spacing.sm, padding: theme.spacing.lg, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }, boxTitle: { color: theme.colors.text, fontSize: theme.typography.h3, fontWeight: theme.typography.weight.bold }, texto: { color: theme.colors.text }, muted: { color: theme.colors.textMuted, fontSize: theme.typography.small }, linha: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.sm }, linhaTopo: { flexDirection: 'row', gap: theme.spacing.md }, flex: { flex: 1, minWidth: 160 }, input: { minHeight: 48, color: theme.colors.text, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.sm, backgroundColor: theme.colors.background, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm }, area: { minHeight: 180, textAlignVertical: 'top' }, cmdImg: { width: 96, height: 134, borderRadius: theme.radius.sm }, nome: { color: theme.colors.text, fontSize: theme.typography.h3, fontWeight: theme.typography.weight.bold }, tem: { color: theme.colors.greenEnd, fontSize: theme.typography.small }, falta: { color: theme.colors.textMuted, fontSize: theme.typography.small }, problema: { color: theme.colors.warning, fontSize: theme.typography.small }, painel: { gap: theme.spacing.sm, paddingTop: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border }, oficial: { padding: theme.spacing.md, borderRadius: theme.radius.sm, backgroundColor: theme.colors.background }, oficialHover: { backgroundColor: theme.colors.surfaceRaised }, grupo: { gap: 2 }, grupoTitulo: { color: theme.colors.accent, fontWeight: theme.typography.weight.bold, marginTop: theme.spacing.sm }, cartaLinha: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border }, cartaNome: { color: theme.colors.text, fontWeight: theme.typography.weight.medium }, botao: { minHeight: 44, justifyContent: 'center', paddingHorizontal: theme.spacing.md, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border }, botaoDestaque: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }, botaoPerigo: { borderColor: theme.colors.danger }, botaoTexto: { color: theme.colors.text, fontWeight: theme.typography.weight.bold }, chipInfo: { color: theme.colors.text, paddingHorizontal: theme.spacing.sm, paddingVertical: 4, borderRadius: theme.radius.pill, backgroundColor: theme.colors.background, fontSize: theme.typography.small }, curva: { flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.sm, height: 110 }, coluna: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 2 }, colunaValor: { color: theme.colors.text, fontSize: theme.typography.small }, barra: { width: '70%', borderRadius: 4, backgroundColor: theme.colors.accent } });
