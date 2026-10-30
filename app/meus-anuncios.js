import Head from 'expo-router/head';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Cabecalho from '../src/components/Cabecalho';
import BotaoPrimario from '../src/components/BotaoPrimario';
import EstadoErro from '../src/components/EstadoErro';
import EstadoVazio from '../src/components/EstadoVazio';
import Skeleton from '../src/components/Skeleton';
import ListaItem from '../src/components/ListaItem';
import { getAds } from '../src/services/api';
import { theme } from '../src/theme';

export default function MeusAnuncios() {
  const [ads, setAds] = useState([]);
  const [status, setStatus] = useState('loading');
  const load = async () => {
    setStatus('loading');
    try {
      setAds(await getAds());
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  };
  useEffect(() => {
    load();
  }, []);
  if (status === 'loading')
    return (
      <View style={styles.page}>
        <Skeleton height={260} />
      </View>
    );
  if (status === 'error') return <EstadoErro onRetry={load} />;
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Head>
        <title>Meus anúncios | ManaTrade</title>
      </Head>
      <Cabecalho
        title="Meus anúncios"
        back
        action={<BotaoPrimario label="Novo anúncio" onPress={() => router.push('/anuncio/novo')} />}
      />
      {ads.length ? (
        ads.map((ad) => (
          <ListaItem
            key={ad.id}
            title={ad.title}
            subtitle={`${ad.condition} · Quantidade ${ad.qty}`}
            meta={`${ad.status} · R$ ${ad.price}`}
            onPress={() => router.push(`/anuncio/${ad.id}`)}
          />
        ))
      ) : (
        <EstadoVazio
          titulo="Sem anúncios"
          acao="Criar anúncio"
          onPress={() => router.push('/anuncio/novo')}
        />
      )}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    maxWidth: 1320,
    width: '100%',
    alignSelf: 'center',
    padding: theme.spacing.lg,
  },
});
