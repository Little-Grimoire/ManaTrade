import Head from 'expo-router/head';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Cabecalho from '../../src/components/Cabecalho';
import BotaoPrimario from '../../src/components/BotaoPrimario';
import BotaoSecundario from '../../src/components/BotaoSecundario';
import ChipFiltro from '../../src/components/ChipFiltro';
import EstadoErro from '../../src/components/EstadoErro';
import Skeleton from '../../src/components/Skeleton';
import { ocrAvailable, ocrCandidateLines } from '../../src/services/ocr';
import { fuzzyCard } from '../../src/services/scryfall';
import { evaluateCard, matchCardName } from '../../src/services/mlApi';
import { adicionarCartaNoDeck, deckParaAvaliacao, listarDecks, obterDeck } from '../../src/services/decks';
import { CONDICOES, adicionarNaColecao } from '../../src/services/colecao';
import { adicionarDesejo } from '../../src/services/desejos';
import { theme } from '../../src/theme';

const VERDICT = {
  improves: { label: 'MELHORA O DECK', color: theme.colors.greenEnd },
  no_improvement: { label: 'NÃO MELHORA', color: theme.colors.warning },
  illegal: { label: 'NÃO PODE ENTRAR', color: theme.colors.danger },
  already_in_deck: { label: 'JÁ ESTÁ NO DECK', color: theme.colors.textMuted },
};

export default function ManaScan() {
  // Quando aberto pela tela de um deck: /manuscan?deckId=1&deckNome=Elfos ("modo deck").
  const { deckId, deckNome } = useLocalSearchParams();
  const modoDeck = !!deckId;

  const [state, setState] = useState('idle'); // idle | loading | permission | error | manual | result
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [manualName, setManualName] = useState('');
  const [step, setStep] = useState('');
  const [condicao, setCondicao] = useState('NM');
  const [foil, setFoil] = useState(false);
  const [aviso, setAviso] = useState(null); // { ok, texto } resultado das ações
  const [ocupado, setOcupado] = useState(false);
  const [escolha, setEscolha] = useState(null); // { acao: 'adicionar' | 'avaliar', decks: [...] }
  const [evaluation, setEvaluation] = useState(null);
  const [evaluating, setEvaluating] = useState(false);

  // ---------- identificação ----------

  // OCR no navegador (web) -> busca aproximada no Scryfall. No celular: nome digitado.
  const identify = async (asset) => {
    setState('loading'); setError('');
    try {
      let candidates = [];
      if (ocrAvailable) {
        setStep('Lendo o texto da carta (OCR)…');
        candidates = await ocrCandidateLines(asset.uri);
      }
      setStep('Buscando no Scryfall…');
      for (const c of candidates) {
        const card = await fuzzyCard(c).catch(() => null);
        if (card) { showCard(card); return; }
      }
      setError(ocrAvailable ? 'Não conseguimos ler o nome da carta. Digite o nome abaixo.' : 'Digite o nome da carta fotografada.');
      setState('manual');
    } catch (e) { setError(e.message); setState('manual'); }
  };

  const showCard = (card) => {
    setResult(card); // { id, name, edition, image, typeLine, colorIdentity, priceUsd }
    setCondicao('NM'); setFoil(false); setAviso(null); setEscolha(null); setEvaluation(null);
    setState('result');
  };

  const searchManual = async () => {
    if (!manualName.trim()) return;
    setState('loading'); setStep('Buscando no Scryfall…');
    try {
      let card = await fuzzyCard(manualName);
      if (!card) { const local = await matchCardName(manualName).catch(() => []); if (local[0]) card = await fuzzyCard(local[0].name); }
      if (card) { setManualName(''); showCard(card); } else { setError(`Nenhuma carta encontrada para "${manualName}".`); setState('manual'); }
    } catch (e) { setError(e.message); setState('manual'); }
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setError('Libere o acesso à biblioteca de fotos nas configurações do dispositivo.'); setState('error'); return; }
    const photo = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!photo.canceled) identify(photo.assets[0]);
  };

  const openCamera = async () => {
    if (Platform.OS === 'web') { setError('A câmera não está disponível nesta sessão web. Use o arquivo da galeria.'); setState('permission'); return; }
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) { setError('O acesso à câmera foi negado. Libere a câmera nas configurações do dispositivo ou digite o nome da carta.'); setState('permission'); return; }
    const photo = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!photo.canceled) identify(photo.assets[0]);
  };

  // ---------- ações com a carta identificada ----------

  const cartaRef = () => ({ scryfall_id: result.id }); // o backend reaproveita o cache pelo id do Scryfall

  const acao = async (fn, sucesso) => {
    setOcupado(true); setAviso(null);
    try { await fn(); setAviso({ ok: true, texto: sucesso }); } catch (e) { setAviso({ ok: false, texto: e.message }); } finally { setOcupado(false); }
  };

  const addColecao = () => acao(
    () => adicionarNaColecao(cartaRef(), { condicao, foil }),
    `${result.name} (${condicao}${foil ? ', foil' : ''}) adicionada à biblioteca.`,
  );
  const addDesejos = () => acao(() => adicionarDesejo(cartaRef()), `${result.name} adicionada à lista de desejos.`);
  const addDeck = (id, nome) => acao(async () => { await adicionarCartaNoDeck(id, cartaRef()); setEscolha(null); }, `${result.name} adicionada ao deck ${nome}.`);

  // Abre a lista de decks para escolher (só Commander quando for avaliar com o ML).
  const escolherDeck = async (tipo) => {
    setOcupado(true); setAviso(null);
    try {
      let decks = await listarDecks();
      if (tipo === 'avaliar') decks = decks.filter((d) => d.formato === 'commander');
      if (!decks.length) {
        setAviso({ ok: false, texto: tipo === 'avaliar' ? 'Você ainda não tem um deck Commander. A avaliação usa o comandante e a lista do deck.' : 'Você ainda não tem decks.', criarDeck: true });
      } else if (tipo === 'avaliar' && decks.length === 1) {
        await avaliar(decks[0].id);
      } else {
        setEscolha({ acao: tipo, decks });
      }
    } catch (e) { setAviso({ ok: false, texto: e.message }); } finally { setOcupado(false); }
  };

  // Avaliação carta × deck Commander (modelo de ML do TP via backend-ml).
  const avaliar = async (id) => {
    setEscolha(null); setEvaluating(true); setEvaluation(null);
    try {
      const deck = await obterDeck(id);
      if (!deck.comandante) { setEvaluation({ error: `Defina o comandante do deck "${deck.nome}" para avaliar.` }); return; }
      if (!deck.cartas.length) { setEvaluation({ error: `O deck "${deck.nome}" ainda não tem cartas.` }); return; }
      setEvaluation({ ...(await evaluateCard({ ...deckParaAvaliacao(deck), candidate: result.name })), deckName: deck.nome });
    } catch (e) { setEvaluation({ error: e.message }); } finally { setEvaluating(false); }
  };

  const avaliarClique = async () => {
    // No modo deck, avalia direto no deck de origem (se for Commander).
    if (modoDeck) {
      const deck = await obterDeck(deckId).catch(() => null);
      if (deck?.formato === 'commander') { avaliar(deckId); return; }
    }
    escolherDeck('avaliar');
  };

  const sairModoDeck = () => router.setParams({ deckId: '', deckNome: '' });
  const verdict = evaluation && VERDICT[evaluation.verdict];

  // ---------- telas ----------

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Head><title>ManaScan | ManaTrade</title></Head>
      <Cabecalho title="ManaScan" subtitle={modoDeck ? `Adicionando cartas ao deck ${deckNome}` : 'Identifique uma carta e guarde na biblioteca, num deck ou nos desejos'} />

      {modoDeck && (
        <View style={styles.faixa}>
          <Text style={styles.faixaTexto}>Modo deck: as cartas identificadas vão para "{deckNome}".</Text>
          <View style={styles.linha}>
            <Link label="Voltar ao deck" onPress={() => router.navigate(`/decks/${deckId}`)} />
            <Link label="Sair do modo deck" onPress={sairModoDeck} />
          </View>
        </View>
      )}

      {state === 'loading' ? (
        <View style={styles.loading}><Text style={styles.step}>{step}</Text><Skeleton height={320} /></View>
      ) : state === 'permission' ? (
        <View style={styles.panel}>
          <Text style={styles.eyebrow}>PERMISSÃO NECESSÁRIA</Text>
          <Text style={styles.title}>{error}</Text>
          <BotaoPrimario label="Enviar foto da galeria" onPress={pickImage} />
          <BotaoSecundario label="Digitar o nome da carta" onPress={() => { setError(''); setState('manual'); }} />
        </View>
      ) : state === 'error' ? (
        <EstadoErro texto={error || 'Não identificamos a carta.'} onRetry={() => setState('idle')} />
      ) : state === 'manual' ? (
        <View style={styles.panel}>
          <Text style={styles.eyebrow}>IDENTIFICAÇÃO MANUAL</Text>
          {!!error && <Text style={styles.warn}>{error}</Text>}
          <Text style={styles.label}>Nome da carta (em inglês; aceita erros de digitação)</Text>
          <TextInput value={manualName} onChangeText={setManualName} onSubmitEditing={searchManual} autoFocus placeholder="Ex.: Lightning Bolt" placeholderTextColor={theme.colors.textMuted} style={styles.input} />
          <BotaoPrimario label="Buscar" onPress={searchManual} />
          <BotaoSecundario label="Voltar" onPress={() => setState('idle')} />
        </View>
      ) : state === 'result' ? (
        <View style={styles.panel}>
          <Text style={styles.eyebrow}>CARTA IDENTIFICADA</Text>
          {!!result.image && <Image source={{ uri: result.image }} style={styles.cardImage} resizeMode="contain" accessibilityLabel={result.name} />}
          <Text style={styles.title}>{result.name}</Text>
          {!!result.typeLine && <Text style={styles.label}>{result.typeLine}</Text>}
          <Text style={styles.label}>{[result.edition, result.priceUsd && `referência Scryfall US$ ${Number(result.priceUsd).toFixed(2)}`].filter(Boolean).join(' · ')}</Text>

          {modoDeck && <BotaoPrimario label={ocupado ? 'Adicionando…' : `Adicionar ao deck ${deckNome}`} disabled={ocupado} onPress={() => addDeck(deckId, deckNome)} />}

          <View style={styles.secao}>
            <Text style={styles.label}>Condição da sua cópia (para a biblioteca)</Text>
            <View style={styles.linha}>
              {CONDICOES.map((c) => <ChipFiltro key={c} label={c} active={condicao === c} onPress={() => setCondicao(c)} />)}
              <ChipFiltro label="Foil" active={foil} onPress={() => setFoil(!foil)} />
            </View>
            <BotaoSecundario label="Adicionar à biblioteca" onPress={addColecao} />
            {!modoDeck && <BotaoSecundario label="Adicionar a um deck" onPress={() => escolherDeck('adicionar')} />}
            <BotaoSecundario label="Adicionar aos desejos" onPress={addDesejos} />
          </View>

          {ocupado && <ActivityIndicator color={theme.colors.accent} />}
          {!!aviso && (
            <View style={{ gap: theme.spacing.sm }}>
              <Text style={aviso.ok ? styles.ok : styles.warn}>{aviso.texto}</Text>
              {aviso.ok && modoDeck && <BotaoSecundario label="Voltar ao deck" onPress={() => router.navigate(`/decks/${deckId}`)} />}
              {aviso.criarDeck && <BotaoSecundario label="Criar deck" onPress={() => router.push('/decks/novo')} />}
            </View>
          )}

          {!!escolha && (
            <View style={styles.secao}>
              <Text style={styles.label}>{escolha.acao === 'avaliar' ? 'Avaliar em qual deck Commander?' : 'Adicionar em qual deck?'}</Text>
              {escolha.decks.map((d) => (
                <Pressable key={d.id} accessibilityRole="button" onPress={() => (escolha.acao === 'avaliar' ? avaliar(d.id) : addDeck(d.id, d.nome))} style={({ hovered, pressed }) => [styles.deckOpcao, (hovered || pressed) && styles.deckOpcaoHover]}>
                  <Text style={styles.deckNome}>{d.nome}</Text>
                  <Text style={styles.small}>{d.formatoNome} · {d.total} cartas{d.comandante ? ` · ${d.comandante.nome}` : ''}</Text>
                </Pressable>
              ))}
              <Link label="Cancelar" onPress={() => setEscolha(null)} />
            </View>
          )}

          <View style={styles.evalBox}>
            <BotaoPrimario label={evaluating ? 'Avaliando…' : 'Avaliar em um deck Commander'} disabled={evaluating} onPress={avaliarClique} />
            {evaluation?.error ? <Text style={styles.warn}>{evaluation.error}</Text>
              : evaluation && (
                <View style={[styles.verdict, { borderColor: verdict?.color }]}>
                  <Text style={[styles.eyebrow, { color: verdict?.color }]}>{verdict?.label} · {evaluation.deckName}</Text>
                  <Text style={styles.verdictText}>{evaluation.message}</Text>
                  {evaluation.candidate?.score != null && <Text style={styles.label}>Adequação de {evaluation.candidate.name}: {(evaluation.candidate.score * 100).toFixed(0)}%{evaluation.remove?.score != null ? ` · ${evaluation.remove.name}: ${(evaluation.remove.score * 100).toFixed(0)}%` : ''} · margem δ = {evaluation.delta}</Text>}
                  {!!evaluation.weakest?.length && <Text style={styles.small}>Mais fracas do deck: {evaluation.weakest.map((w) => w.name).join(', ')}</Text>}
                  {!!evaluation.unknown?.length && <Text style={styles.small}>Não reconhecidas no deck: {evaluation.unknown.slice(0, 5).join(', ')}</Text>}
                </View>
              )}
          </View>

          <BotaoSecundario label="Escanear outra carta" onPress={() => setState('idle')} />
        </View>
      ) : (
        <View style={styles.scan}>
          <View style={styles.frame}><Text style={styles.frameText}>Enquadre a carta</Text><Text style={styles.small}>{ocrAvailable ? 'OCR no navegador' : 'Foto + nome digitado'}</Text></View>
          <View style={styles.actions}>
            <BotaoPrimario label="Capturar com a câmera" onPress={openCamera} />
            <BotaoSecundario label="Enviar foto da galeria" onPress={pickImage} />
            <BotaoSecundario label="Digitar o nome da carta" onPress={() => { setError(''); setState('manual'); }} />
            {!modoDeck && <BotaoSecundario label="Meus decks" onPress={() => router.push({ pathname: '/(tabs)/biblioteca', params: { aba: 'decks' } })} />}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function Link({ label, onPress }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={styles.link}><Text style={styles.linkTexto}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({ page: { flexGrow: 1, maxWidth: 960, width: '100%', alignSelf: 'center', padding: theme.spacing.lg }, panel: { gap: theme.spacing.md, width: '100%', maxWidth: 540, alignSelf: 'center', padding: theme.spacing.xl, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }, faixa: { gap: theme.spacing.xs, width: '100%', maxWidth: 540, alignSelf: 'center', padding: theme.spacing.md, marginBottom: theme.spacing.md, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.accent }, faixaTexto: { color: theme.colors.text }, loading: { gap: theme.spacing.lg, width: '100%', maxWidth: 540, alignSelf: 'center' }, step: { color: theme.colors.accent, textAlign: 'center' }, scan: { alignItems: 'center' }, frame: { width: '100%', maxWidth: 360, aspectRatio: 5 / 7, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, borderRadius: theme.radius.lg, borderWidth: 2, borderColor: theme.colors.accent, backgroundColor: '#10283a' }, frameText: { color: theme.colors.textMuted }, actions: { width: '100%', maxWidth: 540, gap: theme.spacing.sm, marginTop: theme.spacing.lg }, secao: { gap: theme.spacing.sm, paddingTop: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border }, linha: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }, eyebrow: { color: theme.colors.accent, fontSize: theme.typography.small, fontWeight: theme.typography.weight.bold }, title: { color: theme.colors.text, fontSize: theme.typography.h2, fontWeight: theme.typography.weight.bold }, label: { color: theme.colors.textMuted }, small: { color: theme.colors.textMuted, fontSize: theme.typography.small }, ok: { color: theme.colors.greenEnd }, warn: { color: theme.colors.warning }, input: { minHeight: 48, color: theme.colors.text, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.sm, backgroundColor: theme.colors.background, paddingHorizontal: theme.spacing.md }, cardImage: { width: '100%', height: 340, borderRadius: theme.radius.md }, deckOpcao: { padding: theme.spacing.md, borderRadius: theme.radius.sm, backgroundColor: theme.colors.background }, deckOpcaoHover: { backgroundColor: theme.colors.surfaceRaised }, deckNome: { color: theme.colors.text, fontWeight: theme.typography.weight.bold }, evalBox: { gap: theme.spacing.sm, marginTop: theme.spacing.sm }, verdict: { gap: theme.spacing.xs, padding: theme.spacing.md, borderWidth: 2, borderRadius: theme.radius.md, backgroundColor: theme.colors.background }, verdictText: { color: theme.colors.text, fontSize: theme.typography.h3, fontWeight: theme.typography.weight.bold }, link: { minHeight: 36, justifyContent: 'center' }, linkTexto: { color: theme.colors.accent, fontWeight: theme.typography.weight.bold } });
