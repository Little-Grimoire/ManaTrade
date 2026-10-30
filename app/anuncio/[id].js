import Head from 'expo-router/head';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Cabecalho from '../../src/components/Cabecalho';
import BotaoPrimario from '../../src/components/BotaoPrimario';
import BotaoSecundario from '../../src/components/BotaoSecundario';
import ChipFiltro from '../../src/components/ChipFiltro';
import ModalConfirmacao from '../../src/components/ModalConfirmacao';
import { cards, anuncios } from '../../src/mocks/dados';
import { theme } from '../../src/theme';

export default function AnuncioForm() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const existing = anuncios.find((item) => item.id === id);
  const [confirm, setConfirm] = useState(false);
  const [card, setCard] = useState(existing?.title || cards[0].name);
  const [edition, setEdition] = useState(cards[0].edition);
  const [condition, setCondition] = useState(existing?.condition || 'NM');
  const [price, setPrice] = useState(String(existing?.price || cards[0].price));
  const [qty, setQty] = useState(String(existing?.qty || 1));
  const [description, setDescription] = useState('Carta revisada e protegida.');
  const fields = [
    ['Carta', card, setCard],
    ['Edição', edition, setEdition],
    ['Preço', price, setPrice],
    ['Quantidade', qty, setQty],
    ['Descrição', description, setDescription],
  ];
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Head>
        <title>{id === 'novo' ? 'Novo anúncio' : 'Editar anúncio'} | ManaTrade</title>
      </Head>
      <Cabecalho title={id === 'novo' ? 'Novo anúncio' : 'Editar anúncio'} back />
      <View style={styles.card}>
        {fields.map(([label, value, set]) => (
          <View key={label}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
              value={value}
              onChangeText={set}
              keyboardType={label === 'Preço' || label === 'Quantidade' ? 'numeric' : 'default'}
              multiline={label === 'Descrição'}
              style={[styles.input, label === 'Descrição' && styles.area]}
            />
          </View>
        ))}
        <Text style={styles.label}>Condição</Text>
        <View style={styles.row}>
          {['NM', 'SP', 'MP', 'HP'].map((item) => (
            <ChipFiltro
              key={item}
              label={item}
              active={condition === item}
              onPress={() => setCondition(item)}
            />
          ))}
        </View>
        <BotaoPrimario label="Salvar anúncio" onPress={() => router.replace('/meus-anuncios')} />
        {existing && (
          <BotaoSecundario label="Excluir anúncio" danger onPress={() => setConfirm(true)} />
        )}
        <View style={styles.photo}>
          <Text style={styles.photoText}>Adicionar fotos</Text>
        </View>
      </View>
      <ModalConfirmacao
        visible={confirm}
        title="Excluir anúncio?"
        message="Esta ação não poderá ser desfeita."
        confirmLabel="Excluir"
        onConfirm={() => router.replace('/meus-anuncios')}
        onCancel={() => setConfirm(false)}
      />
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: { flexGrow: 1, alignItems: 'center', padding: theme.spacing.lg },
  card: {
    width: '100%',
    maxWidth: 480,
    gap: theme.spacing.md,
    padding: theme.spacing.xl,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.small,
    marginBottom: theme.spacing.xs,
  },
  input: {
    minHeight: 48,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
  },
  area: { height: 100, paddingTop: theme.spacing.md, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: theme.spacing.sm },
  photo: {
    minHeight: 90,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: theme.colors.accent,
    borderRadius: theme.radius.sm,
  },
  photoText: { color: theme.colors.accent, fontWeight: theme.typography.weight.bold },
});
