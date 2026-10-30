import Head from 'expo-router/head';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import BotaoSecundario from '../../src/components/BotaoSecundario';
import CardCapa from '../../src/components/CardCapa';
import ModalConfirmacao from '../../src/components/ModalConfirmacao';
import { useAuth } from '../../src/contexts/AuthContext';
import { cards } from '../../src/mocks/dados';
import { theme } from '../../src/theme';

export default function Perfil() {
  const { user, signOut } = useAuth();
  const [confirm, setConfirm] = useState(false);
  const logout = async () => {
    setConfirm(false);
    await signOut();
    router.replace('/auth/login');
  };
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Head>
        <title>Perfil | ManaTrade</title>
      </Head>
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.slice(0, 1) || 'M'}</Text>
        </View>
        <View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.subtitle}>Nível 18 · 7.640 XP</Text>
        </View>
      </View>
      <View style={styles.stats}>
        {[
          ['128', 'Cartas'],
          ['R$ 18.420', 'Valor'],
          ['23', 'Vendas'],
        ].map(([value, label]) => (
          <View key={label} style={styles.stat}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.title}>Vitrine</Text>
      <View style={styles.grid}>
        {cards.slice(0, 3).map((card) => (
          <CardCapa key={card.id} item={card} compact />
        ))}
      </View>
      <Text style={styles.title}>Conquistas</Text>
      <View style={styles.badges}>
        <Text style={styles.badge}>Set completo</Text>
        <Text style={styles.badge}>Primeira rara</Text>
        <Text style={styles.badge}>4,9 avaliações</Text>
      </View>
      <BotaoSecundario label="Configurações" onPress={() => router.push('/configuracoes')} />
      <BotaoSecundario label="Sair" danger onPress={() => setConfirm(true)} />
      <ModalConfirmacao
        visible={confirm}
        title="Sair da conta?"
        message="Sua sessão será encerrada neste dispositivo."
        confirmLabel="Sair"
        onConfirm={logout}
        onCancel={() => setConfirm(false)}
      />
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    maxWidth: 1320,
    alignSelf: 'center',
    width: '100%',
    gap: theme.spacing.lg,
    padding: theme.spacing.lg,
  },
  profile: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
  },
  avatarText: {
    color: theme.colors.background,
    fontSize: 32,
    fontWeight: theme.typography.weight.bold,
  },
  name: {
    color: theme.colors.text,
    fontSize: theme.typography.title,
    fontWeight: theme.typography.weight.bold,
  },
  subtitle: { color: theme.colors.textMuted },
  stats: { flexDirection: 'row', gap: theme.spacing.sm },
  stat: {
    flex: 1,
    minWidth: 96,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
  },
  statValue: {
    color: theme.colors.accent,
    fontSize: theme.typography.h3,
    fontWeight: theme.typography.weight.bold,
  },
  statLabel: { color: theme.colors.textMuted, fontSize: theme.typography.small },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.h2,
    fontWeight: theme.typography.weight.bold,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  badge: {
    minHeight: 44,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.pill,
    textAlignVertical: 'center',
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
});
