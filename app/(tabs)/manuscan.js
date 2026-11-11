import Head from 'expo-router/head';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Cabecalho from '../../src/components/Cabecalho';
import BotaoPrimario from '../../src/components/BotaoPrimario';
import BotaoSecundario from '../../src/components/BotaoSecundario';
import EstadoErro from '../../src/components/EstadoErro';
import Skeleton from '../../src/components/Skeleton';
import SeloCondicao from '../../src/components/SeloCondicao';
import { ocrAvailable, ocrCandidateLines } from '../../src/services/ocr';
import { fuzzyCard } from '../../src/services/scryfall';
import { evaluateCard, matchCardName, scanWithLlm } from '../../src/services/mlApi';
import { loadDeck } from '../../src/services/decks';
import { theme } from '../../src/theme';

const VERDICT = {
  improves: { label: 'MELHORA O DECK', color: theme.colors.greenEnd },
  no_improvement: { label: 'NÃO MELHORA', color: theme.colors.warning },
  illegal: { label: 'NÃO PODE ENTRAR', color: theme.colors.danger },
  already_in_deck: { label: 'JÁ ESTÁ NO DECK', color: theme.colors.textMuted },
};

export default function ManaScan() {
  const [state, setState] = useState('idle');
  const [result, setResult] = useState({ name: '', edition: '', condition: 'NM', price: '' });
  const [error, setError] = useState('');
  const [manualName, setManualName] = useState('');
  const [step, setStep] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const [evaluating, setEvaluating] = useState(false);

  // Identificação: OCR (web) ou LLM multimodal (mobile) -> fuzzy matching no Scryfall
  const identify = async (asset) => {
    setState('loading'); setEvaluation(null); setError('');
    try {
      let candidates = [];
      if (ocrAvailable) {
        setStep('Lendo o texto da carta (OCR)…');
        candidates = await ocrCandidateLines(asset.uri);
      } else if (asset.base64) {
        setStep('Identificando a carta com IA…');
        try { const r = await scanWithLlm(asset.base64, asset.mimeType || 'image/jpeg'); candidates = [r.raw_text, ...r.matches.map((m) => m.name)]; } catch { candidates = []; }
      }
      setStep('Buscando no Scryfall…');
      for (const c of candidates) {
        const card = await fuzzyCard(c).catch(() => null);
        if (card) { showCard(card); return; }
      }
      setError('Não conseguimos ler o nome da carta. Digite o nome abaixo.'); setState('manual');
    } catch (e) { setError(e.message); setState('manual'); }
  };
  const showCard = (card) => {
    setResult({ name: card.name, edition: card.edition || '', image: card.image, typeLine: card.typeLine, condition: 'NM',
      price: card.priceUsd ? (Number(card.priceUsd) * 5.5).toFixed(2) : '' });
    setState('result');
  };
  const searchManual = async () => {
    if (!manualName.trim()) return;
    setState('loading'); setStep('Buscando no Scryfall…');
    try {
      let card = await fuzzyCard(manualName);
      if (!card) { const local = await matchCardName(manualName).catch(() => []); if (local[0]) card = await fuzzyCard(local[0].name); }
      if (card) showCard(card); else { setError(`Nenhuma carta encontrada para "${manualName}".`); setState('manual'); }
    } catch (e) { setError(e.message); setState('manual'); }
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setError('Libere o acesso à biblioteca de fotos nas configurações do dispositivo.'); setState('error'); return; }
    const photo = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, base64: !ocrAvailable });
    if (!photo.canceled) identify(photo.assets[0]);
  };
  const openCamera = async () => {
    if (Platform.OS === 'web') { setError('A câmera não está disponível nesta sessão web. Use o arquivo da galeria.'); setState('permission'); return; }
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) { setError('O acesso à câmera foi negado. Libere a câmera nas configurações do dispositivo ou digite o nome da carta.'); setState('permission'); return; }
    const photo = await ImagePicker.launchCameraAsync({ quality: 0.7, base64: true });
    if (!photo.canceled) identify(photo.assets[0]);
  };
  const update = (field, value) => setResult((current) => ({ ...current, [field]: value }));

  // Avaliação carta × deck (modelo de ML do TP via backend-ml)
  const evaluate = async () => {
    setEvaluating(true); setEvaluation(null);
    try {
      const deck = await loadDeck();
      if (!deck) { setEvaluation({ error: 'Você ainda não tem um deck salvo.', needsDeck: true }); return; }
      setEvaluation({ ...(await evaluateCard({ commander: deck.commander, deck: deck.deck, candidate: result.name })), deckName: deck.name });
    } catch (e) { setEvaluation({ error: e.message }); } finally { setEvaluating(false); }
  };

  const verdict = evaluation && VERDICT[evaluation.verdict];
  return <ScrollView contentContainerStyle={styles.page}><Head><title>ManaScan | ManaTrade</title></Head><Cabecalho title="ManaScan" subtitle="Identifique uma carta e veja se ela serve no seu deck" />
    {state === 'loading' ? <View style={styles.loading}><Text style={styles.step}>{step}</Text><Skeleton height={320} /><View style={styles.loadingRow}><Skeleton width="32%" height={44} /><Skeleton width="32%" height={44} /><Skeleton width="32%" height={44} /></View></View>
    : state === 'permission' ? <View style={styles.panel}><Text style={styles.eyebrow}>PERMISSÃO NECESSÁRIA</Text><Text style={styles.title}>{error}</Text><BotaoPrimario label="Enviar foto da galeria" onPress={pickImage} /><BotaoSecundario label="Digitar o nome da carta" onPress={() => { setError(''); setState('manual'); }} /></View>
    : state === 'error' ? <EstadoErro texto={error || 'Não identificamos a carta.'} onRetry={() => setState('idle')} />
    : state === 'manual' ? <View style={styles.panel}><Text style={styles.eyebrow}>IDENTIFICAÇÃO MANUAL</Text>{!!error && <Text style={styles.warn}>{error}</Text>}<Text style={styles.label}>Nome da carta (em inglês; aceita erros de digitação)</Text><TextInput value={manualName} onChangeText={setManualName} onSubmitEditing={searchManual} placeholder="Ex.: Lightning Bolt" placeholderTextColor={theme.colors.textMuted} style={styles.input} /><BotaoPrimario label="Buscar" onPress={searchManual} /><BotaoSecundario label="Voltar" onPress={() => setState('idle')} /></View>
    : state === 'result' ? <View style={styles.panel}><Text style={styles.eyebrow}>CARTA IDENTIFICADA</Text>
        {!!result.image && <Image source={{ uri: result.image }} style={styles.cardImage} resizeMode="contain" accessibilityLabel={result.name} />}
        <Text style={styles.title}>{result.name}</Text>{!!result.typeLine && <Text style={styles.label}>{result.typeLine}</Text>}
        {['edition', 'price'].map((field) => <View key={field}><Text style={styles.label}>{{ edition: 'Edição', price: 'Preço de referência (R$)' }[field]}</Text><TextInput value={result[field]} onChangeText={(value) => update(field, value)} style={styles.input} /></View>)}
        <View style={styles.conditionRow}>{['NM', 'SP', 'MP', 'HP'].map((condition) => <Pressable key={condition} onPress={() => update('condition', condition)} style={[styles.condition, result.condition === condition && styles.conditionActive]}><SeloCondicao value={condition} /></Pressable>)}</View>
        <View style={styles.evalBox}>
          <BotaoPrimario label={evaluating ? 'Avaliando…' : 'Avaliar no meu deck'} disabled={evaluating} onPress={evaluate} />
          {evaluation?.error ? <View style={{ gap: theme.spacing.sm }}><Text style={styles.warn}>{evaluation.error}</Text>{evaluation.needsDeck && <BotaoSecundario label="Montar / importar deck" onPress={() => router.push('/deck')} />}</View>
          : evaluation && <View style={[styles.verdict, { borderColor: verdict?.color }]}>
              <Text style={[styles.eyebrow, { color: verdict?.color }]}>{verdict?.label} · {evaluation.deckName}</Text>
              <Text style={styles.verdictText}>{evaluation.message}</Text>
              {evaluation.candidate?.score != null && <Text style={styles.label}>Adequação de {evaluation.candidate.name}: {(evaluation.candidate.score * 100).toFixed(0)}%{evaluation.remove?.score != null ? ` · ${evaluation.remove.name}: ${(evaluation.remove.score * 100).toFixed(0)}%` : ''} · margem δ = {evaluation.delta}</Text>}
              {!!evaluation.weakest?.length && <Text style={styles.small}>Mais fracas do deck: {evaluation.weakest.map((w) => w.name).join(', ')}</Text>}
              {!!evaluation.unknown?.length && <Text style={styles.small}>Não reconhecidas no deck: {evaluation.unknown.slice(0, 5).join(', ')}</Text>}
            </View>}
        </View>
        <View style={styles.actions}><BotaoSecundario label="Anunciar" onPress={() => setState('idle')} /><BotaoSecundario label="Adicionar à biblioteca" onPress={() => setState('idle')} /><BotaoSecundario label="Escanear outra" onPress={() => setState('idle')} /></View></View>
    : <View style={styles.scan}><View style={styles.frame}><Text style={styles.frameText}>Enquadre a carta</Text><Text style={styles.small}>{ocrAvailable ? 'OCR no navegador' : 'Identificação por IA'}</Text></View>
        <View style={styles.actions}><BotaoPrimario label="Capturar com a câmera" onPress={openCamera} /><BotaoSecundario label="Enviar foto da galeria" onPress={pickImage} /><BotaoSecundario label="Digitar o nome da carta" onPress={() => { setError(''); setState('manual'); }} /><BotaoSecundario label="Meu deck" onPress={() => router.push('/deck')} /></View></View>}
  </ScrollView>;
}
const styles = StyleSheet.create({ page: { flexGrow: 1, maxWidth: 960, width: '100%', alignSelf: 'center', padding: theme.spacing.lg }, panel: { gap: theme.spacing.md, width: '100%', maxWidth: 540, alignSelf: 'center', padding: theme.spacing.xl, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }, loading: { gap: theme.spacing.lg, width: '100%', maxWidth: 540, alignSelf: 'center' }, loadingRow: { flexDirection: 'row', justifyContent: 'space-between' }, step: { color: theme.colors.accent, textAlign: 'center' }, scan: { alignItems: 'center' }, frame: { width: '100%', maxWidth: 360, aspectRatio: 5 / 7, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, borderRadius: theme.radius.lg, borderWidth: 2, borderColor: theme.colors.accent, backgroundColor: '#10283a' }, frameText: { color: theme.colors.textMuted }, actions: { width: '100%', maxWidth: 540, gap: theme.spacing.sm, marginTop: theme.spacing.lg }, eyebrow: { color: theme.colors.accent, fontSize: theme.typography.small, fontWeight: theme.typography.weight.bold }, title: { color: theme.colors.text, fontSize: theme.typography.h2, fontWeight: theme.typography.weight.bold }, label: { color: theme.colors.textMuted, marginBottom: theme.spacing.xs }, small: { color: theme.colors.textMuted, fontSize: theme.typography.small }, warn: { color: theme.colors.warning }, input: { minHeight: 48, color: theme.colors.text, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.sm, backgroundColor: theme.colors.background, paddingHorizontal: theme.spacing.md }, conditionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }, condition: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border }, conditionActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.surfaceRaised }, cardImage: { width: '100%', height: 340, borderRadius: theme.radius.md }, evalBox: { gap: theme.spacing.sm, marginTop: theme.spacing.sm }, verdict: { gap: theme.spacing.xs, padding: theme.spacing.md, borderWidth: 2, borderRadius: theme.radius.md, backgroundColor: theme.colors.background }, verdictText: { color: theme.colors.text, fontSize: theme.typography.h3, fontWeight: theme.typography.weight.bold } });
