import Head from 'expo-router/head';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Cabecalho from '../../src/components/Cabecalho';
import CardCapa from '../../src/components/CardCapa';
import SeloCondicao from '../../src/components/SeloCondicao';
import PrecoTag from '../../src/components/PrecoTag';
import BotaoPrimario from '../../src/components/BotaoPrimario';
import BotaoSecundario from '../../src/components/BotaoSecundario';
import ListaItem from '../../src/components/ListaItem';
import { cards } from '../../src/mocks/dados';
import { theme } from '../../src/theme';

export default function CartaDetalhe() {
  const { id } = useLocalSearchParams();
  const card = cards.find((item) => item.id === id) || cards[0];
  const [desired, setDesired] = useState(false);
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Head>
        <title>{card.name} | ManaTrade</title>
      </Head>
      <Cabecalho title={card.name} back />
      <View style={styles.hero}>
        <CardCapa item={card} />
        <View style={styles.summary}>
          <Text style={styles.game}>{card.game}</Text>
          <Text style={styles.meta}>
            {card.edition} · {card.rarity}
          </Text>
          <PrecoTag value={card.price} />
          <Text style={styles.avg}>Preço médio de mercado</Text>
          <SeloCondicao value={card.condition} />
        </View>
      </View>
      <Text style={styles.title}>Histórico de preço</Text>
      <View style={styles.chart}>
        <View style={[styles.point, { left: '10%', bottom: '22%' }]} />
        <View style={[styles.point, { left: '30%', bottom: '42%' }]} />
        <View style={[styles.point, { left: '52%', bottom: '34%' }]} />
        <View style={[styles.point, { left: '74%', bottom: '70%' }]} />
        <View
          style={[
            styles.line,
            { left: '10%', bottom: '25%', width: '64%', transform: [{ rotate: '-16deg' }] },
          ]}
        />
      </View>
      <Text style={styles.title}>Condições disponíveis</Text>
      <View style={styles.conditions}>
        {['NM', 'SP', 'MP', 'HP'].map((item) => (
          <SeloCondicao key={item} value={item} />
        ))}
      </View>
      <Text style={styles.title}>Anúncios à venda</Text>
      <ListaItem
        title="Colecionador JP"
        subtitle="Envio pelo ManaTrade"
        meta={`R$ ${card.price.toFixed(2)}`}
      />
      <ListaItem
        title="Arena Nexus"
        subtitle="Retirada na loja"
        meta={`R$ ${(card.price + 18).toFixed(2)}`}
      />
      <View style={styles.actions}>
        <BotaoPrimario label="Comprar / Fazer proposta" />
        <BotaoSecundario
          label={desired ? 'Remover dos desejos' : 'Adicionar aos desejos'}
          onPress={() => setDesired((current) => !current)}
        />
        <BotaoSecundario label="Consignar" />
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    maxWidth: 1320,
    alignSelf: 'center',
    width: '100%',
    padding: theme.spacing.lg,
  },
  hero: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xl },
  summary: { flexGrow: 1, maxWidth: 420, gap: theme.spacing.sm, justifyContent: 'center' },
  game: { color: theme.colors.accent, fontWeight: theme.typography.weight.bold },
  meta: { color: theme.colors.textMuted },
  avg: { color: theme.colors.textMuted, fontSize: theme.typography.small },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.h2,
    fontWeight: theme.typography.weight.bold,
    marginTop: theme.spacing.xxl,
    marginBottom: theme.spacing.md,
  },
  chart: {
    height: 180,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    position: 'relative',
    overflow: 'hidden',
  },
  point: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.accent,
    zIndex: 2,
  },
  line: {
    position: 'absolute',
    height: 2,
    backgroundColor: theme.colors.accent,
    transformOrigin: 'left center',
  },
  conditions: { flexDirection: 'row', gap: theme.spacing.sm },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xl,
  },
});
