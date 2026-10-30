import Head from 'expo-router/head';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Cabecalho from '../src/components/Cabecalho';
import BotaoPrimario from '../src/components/BotaoPrimario';
import BotaoSecundario from '../src/components/BotaoSecundario';
import ModalConfirmacao from '../src/components/ModalConfirmacao';
import EstadoErro from '../src/components/EstadoErro';
import EstadoVazio from '../src/components/EstadoVazio';
import Skeleton from '../src/components/Skeleton';
import ListaItem from '../src/components/ListaItem';
import { getProposals } from '../src/services/api';
import { theme } from '../src/theme';
export default function Propostas() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');
  const [confirm, setConfirm] = useState(null);
  const load = async () => {
    setStatus('loading');
    try {
      setItems(await getProposals());
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
        <title>Propostas | ManaTrade</title>
      </Head>
      <Cabecalho title="Propostas" back />
      {items.length ? (
        items.map((item) => (
          <View key={item.id} style={styles.item}>
            <ListaItem
              title={item.card}
              subtitle={`${item.direction === 'recebida' ? 'Recebida de' : 'Enviada para'} ${item.from}`}
              meta={`R$ ${item.offer}`}
            />
            {item.direction === 'recebida' && (
              <View style={styles.actions}>
                <BotaoPrimario label="Aceitar" />
                <BotaoSecundario label="Contraproposta" />
                <BotaoSecundario label="Recusar" danger onPress={() => setConfirm(item)} />
              </View>
            )}
          </View>
        ))
      ) : (
        <EstadoVazio titulo="Sem propostas" />
      )}
      <ModalConfirmacao
        visible={!!confirm}
        title="Recusar proposta?"
        message={`A proposta de R$ ${confirm?.offer || 0} será recusada.`}
        confirmLabel="Recusar"
        onConfirm={() => setConfirm(null)}
        onCancel={() => setConfirm(null)}
      />
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
  item: {
    marginBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
});
