import Head from 'expo-router/head';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Cabecalho from '../../src/components/Cabecalho';
import BotaoPrimario from '../../src/components/BotaoPrimario';
import BotaoSecundario from '../../src/components/BotaoSecundario';
import ChipFiltro from '../../src/components/ChipFiltro';
import EstadoErro from '../../src/components/EstadoErro';
import Skeleton from '../../src/components/Skeleton';
import { ocrAvailable, ocrCandidateLines } from '../../src/services/ocr';
import { fuzzyCard } from '../../src/services/scryfall';
import { evaluateInDecks, matchCardName, scanCard } from '../../src/services/mlApi';
import { adicionarCartaNoDeck, deckParaAvaliacao, listarDecks, obterDeck } from '../../src/services/decks';
import { CONDICOES, adicionarNaColecao } from '../../src/services/colecao';
import { adicionarDesejo } from '../../src/services/desejos';
import { theme } from '../../src/theme';

const VERDICT = {
  improves: { label: 'MELHORA O DECK', color: theme.colors.greenEnd },
  no_improvement: { label: 'NÃO MELHORA', color: theme.colors.warning },
  illegal: { label: 'NÃO PODE ENTRAR', color: theme.colors.danger },
  already_in_deck: { label: 'JÁ ESTÁ NO DECK', color: theme.colors.textMuted },
  error: { label: 'SEM AVALIAÇÃO', color: theme.colors.textMuted },
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
  const [escolha, setEscolha] = useState(null); // { decks: [...] } escolha do deck para adicionar
  const [evaluation, setEvaluation] = useState(null); // { results: [...] } | { error } | { aviso, criarDeck }
  const [evaluating, setEvaluating] = useState(false);
  const [alternativas, setAlternativas] = useState([]); // outros nomes lidos na foto
  const [focada, setFocada] = useState(false); // a câmera só fica ligada com a aba visível

  const avaliacaoAtual = useRef(0); // ignora respostas de uma carta anterior

  useFocusEffect(useCallback(() => { setFocada(true); return () => setFocada(false); }, []));

  // ---------- identificação ----------

  // Foto -> API de ML (/scan: OCR + catálogo) -> dados da carta no Scryfall -> avaliação nos decks.
  // Se o servidor de OCR não responder, a web ainda tenta o OCR no navegador (Tesseract.js).
  const identify = async (asset) => {
    setState('loading'); setError('');
    try {
      let nomes = [];
      let falhaServidor = null;
      if (asset.base64 || asset.uri?.startsWith('data:')) {
        setStep('Identificando a carta…');
        try {
          const { candidates } = await scanCard(asset.base64 || asset.uri);
          nomes = candidates.map((c) => c.name);
        } catch (e) { falhaServidor = e; }
      }
      if (!nomes.length && ocrAvailable) {
        setStep('Lendo o texto da carta (OCR no navegador)…');
        nomes = await ocrCandidateLines(asset.uri).catch(() => []);
      }
      setStep('Buscando a carta no Scryfall…');
      let falhaScryfall = null;
      for (let i = 0; i < nomes.length; i++) {
        const card = await fuzzyCard(nomes[i]).catch((e) => { falhaScryfall = e; return null; });
        if (card) { showCard(card, nomes.slice(i + 1).filter((n) => n !== card.name).slice(0, 3)); return; }
      }
      setError(falhaScryfall ? `${falhaScryfall.message} Digite o nome da carta abaixo.`
        : falhaServidor && !nomes.length
        ? `${falhaServidor.message} Digite o nome da carta abaixo.`
        : 'Não conseguimos ler o nome da carta. Tente outra foto (boa luz, carta reta) ou digite o nome.');
      setState('manual');
    } catch (e) { setError(e.message); setState('manual'); }
  };

  const showCard = (card, outras = []) => {
    setResult(card); // { id, name, edition, image, typeLine, colorIdentity, priceUsd, mlData }
    setAlternativas(outras);
    setCondicao('NM'); setFoil(false); setAviso(null); setEscolha(null); setEvaluation(null);
    setState('result');
    avaliarNosDecks(card);
  };

  // "Não é essa carta?": troca pelo próximo nome lido na foto.
  const trocarCarta = async (nome) => {
    setOcupado(true);
    const card = await fuzzyCard(nome).catch(() => null);
    setOcupado(false);
    if (card) showCard(card, alternativas.filter((n) => n !== nome));
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
    const photo = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, base64: true });
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

  // Abre a lista de decks para escolher onde adicionar.
  const escolherDeck = async () => {
    setOcupado(true); setAviso(null);
    try {
      const decks = await listarDecks();
      if (!decks.length) setAviso({ ok: false, texto: 'Você ainda não tem decks.', criarDeck: true });
      else setEscolha({ decks });
    } catch (e) { setAviso({ ok: false, texto: e.message }); } finally { setOcupado(false); }
  };

  // Classificação pelo modelo de ML (backend-ml): a carta, com os dados do Scryfall, é avaliada
  // contra TODOS os decks Commander do usuário de uma vez. Resultado ordenado: positivos primeiro.
  const avaliarNosDecks = async (card = result) => {
    const minha = ++avaliacaoAtual.current;
    const atual = () => minha === avaliacaoAtual.current;
    setEvaluating(true); setEvaluation(null);
    try {
      const commander = (await listarDecks()).filter((d) => d.formato === 'commander');
      if (!commander.length) {
        if (atual()) setEvaluation({ aviso: 'Crie um deck Commander para saber se esta carta serve para ele.', criarDeck: true });
        return;
      }
      const decks = await Promise.all(commander.map((d) => obterDeck(d.id)));
      const pendentes = [];
      const avaliaveis = [];
      for (const d of decks) {
        if (!d.comandante) pendentes.push({ deck_id: d.id, deck_name: d.nome, verdict: 'error', message: 'Defina o comandante para avaliar.' });
        else if (!d.cartas.length) pendentes.push({ deck_id: d.id, deck_name: d.nome, verdict: 'error', message: 'O deck ainda não tem cartas.' });
        else avaliaveis.push({ id: d.id, name: d.nome, ...deckParaAvaliacao(d) });
      }
      const resposta = avaliaveis.length ? await evaluateInDecks(card.mlData || { name: card.name }, avaliaveis) : { results: [] };
      if (atual()) setEvaluation({ results: [...resposta.results, ...pendentes] });
    } catch (e) {
      if (atual()) setEvaluation({ error: e.status === 401 ? 'Entre na sua conta para avaliar a carta nos seus decks.' : e.message });
    } finally { if (atual()) setEvaluating(false); }
  };

  const sairModoDeck = () => router.setParams({ deckId: '', deckNome: '' });
  const positivos = evaluation?.results?.filter((r) => r.verdict === 'improves') || [];

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
          {!!alternativas.length && (
            <View style={styles.linha}>
              <Text style={styles.small}>Não é essa?</Text>
              {alternativas.map((n) => <ChipFiltro key={n} label={n} active={false} onPress={() => trocarCarta(n)} />)}
            </View>
          )}

          <View style={styles.evalBox}>
            <Text style={styles.eyebrow}>PARA OS SEUS DECKS COMMANDER</Text>
            {evaluating ? (
              <View style={styles.linha}><ActivityIndicator color={theme.colors.accent} /><Text style={styles.label}>O modelo está avaliando a carta nos seus decks…</Text></View>
            ) : evaluation?.error ? (
              <View style={{ gap: theme.spacing.sm }}>
                <Text style={styles.warn}>{evaluation.error}</Text>
                <BotaoSecundario label="Tentar de novo" onPress={() => avaliarNosDecks()} />
              </View>
            ) : evaluation?.aviso ? (
              <View style={{ gap: theme.spacing.sm }}>
                <Text style={styles.label}>{evaluation.aviso}</Text>
                {evaluation.criarDeck && <BotaoSecundario label="Criar deck" onPress={() => router.push('/decks/novo')} />}
              </View>
            ) : evaluation?.results && (
              <View style={{ gap: theme.spacing.sm }}>
                <Text style={styles.verdictText}>
                  {positivos.length ? `Carta positiva para ${positivos.length} de ${evaluation.results.length} deck(s)` : 'Não melhora nenhum dos seus decks'}
                </Text>
                {evaluation.results.map((r) => {
                  const v = VERDICT[r.verdict] || VERDICT.error;
                  return (
                    <View key={String(r.deck_id)} style={[styles.verdict, { borderColor: v.color }]}>
                      <Text style={[styles.eyebrow, { color: v.color }]}>{v.label} · {r.deck_name}</Text>
                      <Text style={styles.label}>{r.message}</Text>
                      {r.candidate?.score != null && <Text style={styles.small}>Adequação: {(r.candidate.score * 100).toFixed(0)}%{r.remove?.score != null ? ` · ${r.remove.name}: ${(r.remove.score * 100).toFixed(0)}%` : ''} · margem δ = {r.delta}</Text>}
                      {!!r.unknown?.length && <Text style={styles.small}>Não reconhecidas no deck: {r.unknown.slice(0, 5).join(', ')}</Text>}
                      {r.verdict === 'improves' && !modoDeck && <Link label={`Adicionar ao deck ${r.deck_name}`} onPress={() => addDeck(r.deck_id, r.deck_name)} />}
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {modoDeck && <BotaoPrimario label={ocupado ? 'Adicionando…' : `Adicionar ao deck ${deckNome}`} disabled={ocupado} onPress={() => addDeck(deckId, deckNome)} />}

          <View style={styles.secao}>
            <Text style={styles.label}>Condição da sua cópia (para a biblioteca)</Text>
            <View style={styles.linha}>
              {CONDICOES.map((c) => <ChipFiltro key={c} label={c} active={condicao === c} onPress={() => setCondicao(c)} />)}
              <ChipFiltro label="Foil" active={foil} onPress={() => setFoil(!foil)} />
            </View>
            <BotaoSecundario label="Adicionar à biblioteca" onPress={addColecao} />
            {!modoDeck && <BotaoSecundario label="Adicionar a um deck" onPress={escolherDeck} />}
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
              <Text style={styles.label}>Adicionar em qual deck?</Text>
              {escolha.decks.map((d) => (
                <Pressable key={d.id} accessibilityRole="button" onPress={() => addDeck(d.id, d.nome)} style={({ hovered, pressed }) => [styles.deckOpcao, (hovered || pressed) && styles.deckOpcaoHover]}>
                  <Text style={styles.deckNome}>{d.nome}</Text>
                  <Text style={styles.small}>{d.formatoNome} · {d.total} cartas{d.comandante ? ` · ${d.comandante.nome}` : ''}</Text>
                </Pressable>
              ))}
              <Link label="Cancelar" onPress={() => setEscolha(null)} />
            </View>
          )}

          <BotaoSecundario label="Escanear outra carta" onPress={() => setState('idle')} />
        </View>
      ) : (
        <View style={styles.scan}>
          <Scanner ativa={focada && state === 'idle'} onFoto={identify} />
          <View style={styles.actions}>
            <BotaoSecundario label="Enviar foto da galeria" onPress={pickImage} />
            <BotaoSecundario label="Digitar o nome da carta" onPress={() => { setError(''); setState('manual'); }} />
            {!modoDeck && <BotaoSecundario label="Meus decks" onPress={() => router.push({ pathname: '/(tabs)/biblioteca', params: { aba: 'decks' } })} />}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// Câmera ao vivo dentro do app (expo-camera): enquadra a carta e tira a foto sem sair do ManaScan.
function Scanner({ ativa, onFoto }) {
  const [permissao, pedirPermissao] = useCameraPermissions();
  const camera = useRef(null);
  const [pronta, setPronta] = useState(false);
  const [capturando, setCapturando] = useState(false);

  const capturar = async () => {
    if (!camera.current || capturando) return;
    setCapturando(true);
    try {
      const foto = await camera.current.takePictureAsync({ quality: 0.6, base64: true, shutterSound: false });
      onFoto(foto);
    } catch (e) {
      Alert.alert?.('Não foi possível tirar a foto', e.message);
    } finally { setCapturando(false); }
  };

  if (!permissao) return <View style={styles.frame}><ActivityIndicator color={theme.colors.accent} /></View>;
  if (!permissao.granted) {
    return (
      <View style={[styles.frame, styles.frameVazio]}>
        <Text style={styles.frameText}>O ManaScan usa a câmera para reconhecer a carta.</Text>
        {permissao.canAskAgain
          ? <BotaoPrimario label="Permitir câmera" onPress={pedirPermissao} />
          : <Text style={styles.small}>Acesso negado. Libere a câmera nas configurações do aparelho, ou envie uma foto da galeria.</Text>}
      </View>
    );
  }
  return (
    <View style={{ width: '100%', maxWidth: 360, gap: theme.spacing.md }}>
      <View style={[styles.frame, styles.frameCamera]}>
        {ativa && <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" onCameraReady={() => setPronta(true)} />}
        <View pointerEvents="none" style={styles.mira}>
          <View style={styles.miraNome} />
          <Text style={styles.miraTexto}>Enquadre a carta · nome no topo</Text>
        </View>
      </View>
      <BotaoPrimario label={capturando ? 'Capturando…' : 'Capturar carta'} disabled={!pronta || capturando || !ativa} onPress={capturar} />
    </View>
  );
}

function Link({ label, onPress }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={styles.link}><Text style={styles.linkTexto}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({ page: { flexGrow: 1, maxWidth: 960, width: '100%', alignSelf: 'center', padding: theme.spacing.lg }, panel: { gap: theme.spacing.md, width: '100%', maxWidth: 540, alignSelf: 'center', padding: theme.spacing.xl, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }, faixa: { gap: theme.spacing.xs, width: '100%', maxWidth: 540, alignSelf: 'center', padding: theme.spacing.md, marginBottom: theme.spacing.md, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.accent }, faixaTexto: { color: theme.colors.text }, loading: { gap: theme.spacing.lg, width: '100%', maxWidth: 540, alignSelf: 'center' }, step: { color: theme.colors.accent, textAlign: 'center' }, scan: { alignItems: 'center' }, frame: { width: '100%', maxWidth: 360, aspectRatio: 5 / 7, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, borderRadius: theme.radius.lg, borderWidth: 2, borderColor: theme.colors.accent, backgroundColor: '#10283a' }, frameText: { color: theme.colors.textMuted, textAlign: 'center' }, frameVazio: { padding: theme.spacing.lg }, frameCamera: { overflow: 'hidden', backgroundColor: '#000' }, mira: { ...StyleSheet.absoluteFillObject, margin: theme.spacing.md, borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)', borderRadius: theme.radius.md, justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.sm }, miraNome: { width: '100%', height: '12%', borderWidth: 1, borderStyle: 'dashed', borderColor: theme.colors.accent, borderRadius: theme.radius.sm }, miraTexto: { color: '#fff', fontSize: theme.typography.small, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: theme.spacing.sm, borderRadius: theme.radius.sm }, actions: { width: '100%', maxWidth: 540, gap: theme.spacing.sm, marginTop: theme.spacing.lg }, secao: { gap: theme.spacing.sm, paddingTop: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border }, linha: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }, eyebrow: { color: theme.colors.accent, fontSize: theme.typography.small, fontWeight: theme.typography.weight.bold }, title: { color: theme.colors.text, fontSize: theme.typography.h2, fontWeight: theme.typography.weight.bold }, label: { color: theme.colors.textMuted }, small: { color: theme.colors.textMuted, fontSize: theme.typography.small }, ok: { color: theme.colors.greenEnd }, warn: { color: theme.colors.warning }, input: { minHeight: 48, color: theme.colors.text, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.sm, backgroundColor: theme.colors.background, paddingHorizontal: theme.spacing.md }, cardImage: { width: '100%', height: 340, borderRadius: theme.radius.md }, deckOpcao: { padding: theme.spacing.md, borderRadius: theme.radius.sm, backgroundColor: theme.colors.background }, deckOpcaoHover: { backgroundColor: theme.colors.surfaceRaised }, deckNome: { color: theme.colors.text, fontWeight: theme.typography.weight.bold }, evalBox: { gap: theme.spacing.sm, marginTop: theme.spacing.sm }, verdict: { gap: theme.spacing.xs, padding: theme.spacing.md, borderWidth: 2, borderRadius: theme.radius.md, backgroundColor: theme.colors.background }, verdictText: { color: theme.colors.text, fontSize: theme.typography.h3, fontWeight: theme.typography.weight.bold }, link: { minHeight: 36, justifyContent: 'center' }, linkTexto: { color: theme.colors.accent, fontWeight: theme.typography.weight.bold } });
