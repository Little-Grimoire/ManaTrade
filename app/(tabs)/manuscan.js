import Head from 'expo-router/head';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Cabecalho from '../../src/components/Cabecalho';
import BotaoPrimario from '../../src/components/BotaoPrimario';
import BotaoSecundario from '../../src/components/BotaoSecundario';
import EstadoErro from '../../src/components/EstadoErro';
import Skeleton from '../../src/components/Skeleton';
import SeloCondicao from '../../src/components/SeloCondicao';
import { theme } from '../../src/theme';

export default function ManaScan() {
  const [state, setState] = useState('idle');
  const [result, setResult] = useState({ name: 'The One Ring', edition: 'The Lord of the Rings', condition: 'NM', price: '310' });
  const [error, setError] = useState('');

  const analyze = () => {
    setState('loading');
    setTimeout(() => setState('result'), 900);
  };
  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setError('Libere o acesso à biblioteca de fotos nas configurações do dispositivo.'); setState('error'); return; }
    const photo = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!photo.canceled) analyze();
  };
  const openCamera = async () => {
    if (Platform.OS === 'web') { setError('A câmera não está disponível nesta sessão web. Use o arquivo da galeria.'); setState('permission'); return; }
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) { setError('O acesso à câmera foi negado. Libere a câmera nas configurações do dispositivo.'); setState('permission'); return; }
    const photo = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!photo.canceled) analyze();
  };
  const update = (field, value) => setResult((current) => ({ ...current, [field]: value }));

  return <ScrollView contentContainerStyle={styles.page}><Head><title>ManaScan | ManaTrade</title></Head><Cabecalho title="ManaScan" subtitle="Identifique uma carta pela imagem" />{state === 'loading' ? <View style={styles.loading}><Skeleton height={320} /><View style={styles.loadingRow}><Skeleton width="32%" height={44} /><Skeleton width="32%" height={44} /><Skeleton width="32%" height={44} /></View></View> : state === 'permission' ? <View style={styles.panel}><Text style={styles.eyebrow}>PERMISSÃO NECESSÁRIA</Text><Text style={styles.title}>{error}</Text><BotaoSecundario label="Abrir configurações do dispositivo" onPress={() => setState('idle')} /><BotaoPrimario label="Enviar foto da galeria" onPress={pickImage} /></View> : state === 'error' ? <EstadoErro texto={error || 'Não identificamos a carta.'} onRetry={() => setState('idle')} /> : state === 'result' ? <View style={styles.panel}><Text style={styles.eyebrow}>RESULTADO DA IA</Text><Text style={styles.title}>Dados sugeridos</Text>{['name','edition','price'].map((field) => <View key={field}><Text style={styles.label}>{{ name:'Nome', edition:'Edição', price:'Preço justo (R$)' }[field]}</Text><TextInput value={result[field]} onChangeText={(value) => update(field, value)} style={styles.input} /></View>) }<View style={styles.conditionRow}>{['NM','SP','MP','HP'].map((condition) => <Pressable key={condition} onPress={() => update('condition', condition)} style={[styles.condition, result.condition === condition && styles.conditionActive]}><SeloCondicao value={condition} /></Pressable>)}</View><View style={styles.actions}><BotaoPrimario label="Anunciar" onPress={() => setState('idle')} /><BotaoSecundario label="Adicionar à biblioteca" onPress={() => setState('idle')} /><BotaoSecundario label="Consignar" onPress={() => setState('idle')} /></View></View> : <View style={styles.scan}><View style={styles.frame}><Text style={styles.frameText}>Enquadre a carta</Text></View><View style={styles.actions}><BotaoPrimario label="Capturar com a câmera" onPress={openCamera} /><BotaoSecundario label="Enviar foto da galeria" onPress={pickImage} /><BotaoSecundario label="Simular resultado" onPress={analyze} /></View></View>}</ScrollView>;
}
const styles = StyleSheet.create({ page: { flexGrow: 1, maxWidth: 960, width: '100%', alignSelf: 'center', padding: theme.spacing.lg }, panel: { gap: theme.spacing.md, width: '100%', maxWidth: 540, alignSelf: 'center', padding: theme.spacing.xl, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }, loading: { gap: theme.spacing.lg, width: '100%', maxWidth: 540, alignSelf: 'center' }, loadingRow: { flexDirection: 'row', justifyContent: 'space-between' }, scan: { alignItems: 'center' }, frame: { width: '100%', maxWidth: 360, aspectRatio: 5 / 7, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.lg, borderWidth: 2, borderColor: theme.colors.accent, backgroundColor: '#10283a' }, frameText: { color: theme.colors.textMuted }, actions: { width: '100%', maxWidth: 540, gap: theme.spacing.sm, marginTop: theme.spacing.lg }, eyebrow: { color: theme.colors.accent, fontSize: theme.typography.small, fontWeight: theme.typography.weight.bold }, title: { color: theme.colors.text, fontSize: theme.typography.h2, fontWeight: theme.typography.weight.bold }, label: { color: theme.colors.textMuted, marginBottom: theme.spacing.xs }, input: { minHeight: 48, color: theme.colors.text, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.sm, backgroundColor: theme.colors.background, paddingHorizontal: theme.spacing.md }, conditionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }, condition: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border }, conditionActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.surfaceRaised } });
