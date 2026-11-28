import Head from 'expo-router/head';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import Mapa from '../src/components/Mapa';
import Cabecalho from '../src/components/Cabecalho';
import ChipFiltro from '../src/components/ChipFiltro';
import ListaItem from '../src/components/ListaItem';
import BotaoSecundario from '../src/components/BotaoSecundario';
import EstadoErro from '../src/components/EstadoErro';
import EstadoVazio from '../src/components/EstadoVazio';
import Skeleton from '../src/components/Skeleton';
import { distanciaKm, enderecoDaLoja, formatarDistancia, listarLojas } from '../src/services/lojas';
import { theme } from '../src/theme';

// RF06: lojas aprovadas, com distância a partir da localização do aparelho (expo-location).
export default function Lojas() {
  const [lojas, setLojas] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [erro, setErro] = useState('');
  const [view, setView] = useState('lista');
  const [refreshing, setRefreshing] = useState(false);
  const [posicao, setPosicao] = useState(null); // { latitude, longitude }
  const [local, setLocal] = useState('idle'); // idle | buscando | ok | negada | erro

  const carregar = useCallback(async () => {
    try { setErro(''); setLojas(await listarLojas()); setStatus('ready'); } catch (e) { setErro(e.message); setStatus('error'); }
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const puxar = async () => { setRefreshing(true); await carregar(); setRefreshing(false); };

  // Pede a permissão só quando o usuário toca no botão. Negada: a lista continua, em ordem alfabética.
  const usarLocalizacao = async () => {
    setLocal('buscando');
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) { setLocal('negada'); return; }
      const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setPosicao({ latitude: coords.latitude, longitude: coords.longitude });
      setLocal('ok');
    } catch { setLocal('erro'); }
  };

  const ordenadas = useMemo(() => {
    const comDistancia = lojas.map((l) => ({
      ...l,
      km: posicao && l.latitude != null && l.longitude != null ? distanciaKm(posicao, l) : null,
    }));
    if (!posicao) return comDistancia;
    return comDistancia.sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity));
  }, [lojas, posicao]);

  if (status === 'loading') return <View style={styles.page}><Skeleton height={260} /></View>;
  if (status === 'error') return <View style={styles.page}><Cabecalho title="Lojas parceiras" back /><EstadoErro texto={erro} onRetry={() => { setStatus('loading'); carregar(); }} /></View>;

  const abrir = (loja) => router.push({ pathname: '/loja/[id]', params: { id: loja.id, distancia: loja.km != null ? formatarDistancia(loja.km) : '' } });

  return (
    <ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={puxar} tintColor={theme.colors.accent} />}>
      <Head><title>Lojas parceiras | ManaTrade</title></Head>
      <Cabecalho title="Lojas parceiras" subtitle="Onde consignar e encontrar cartas" back />

      <View style={styles.row}>
        <ChipFiltro label="Lista" active={view === 'lista'} onPress={() => setView('lista')} />
        <ChipFiltro label="Mapa" active={view === 'mapa'} onPress={() => setView('mapa')} />
      </View>

      {local !== 'ok' && (
        <BotaoSecundario label={local === 'buscando' ? 'Obtendo localização…' : 'Ordenar pela minha localização'} onPress={local === 'buscando' ? undefined : usarLocalizacao} />
      )}
      {local === 'negada' && <Text style={styles.aviso}>Permissão de localização negada. As lojas aparecem em ordem alfabética; para ver a distância, libere a localização nas configurações do aparelho.</Text>}
      {local === 'erro' && <Text style={styles.aviso}>Não foi possível obter sua localização (GPS desligado?). As lojas aparecem em ordem alfabética.</Text>}
      {local === 'ok' && <Text style={styles.ok}>Ordenadas pela distância até você.</Text>}

      {!ordenadas.length ? (
        <EstadoVazio titulo="Nenhuma loja parceira ainda" texto="As lojas aparecem aqui depois de aprovadas pelo administrador." />
      ) : view === 'mapa' ? (
        <Mapa lojas={ordenadas} posicao={posicao} onSelecionar={abrir} />
      ) : (
        <View style={styles.lista}>
          {ordenadas.map((loja) => (
            <ListaItem
              key={loja.id}
              title={loja.nome}
              subtitle={[enderecoDaLoja(loja), loja.horario, loja.aceita_consignacao ? 'Aceita consignação' : null].filter(Boolean).join('\n')}
              meta={loja.km != null ? formatarDistancia(loja.km) : '›'}
              onPress={() => abrir(loja)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, maxWidth: 1320, width: '100%', alignSelf: 'center', padding: theme.spacing.lg, gap: theme.spacing.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  lista: { marginTop: theme.spacing.sm },
  aviso: { color: theme.colors.warning },
  ok: { color: theme.colors.greenEnd },
});
