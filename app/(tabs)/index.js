import Head from 'expo-router/head';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Cabecalho from '../../src/components/Cabecalho';
import ListaItem from '../../src/components/ListaItem';
import { useAuth } from '../../src/contexts/AuthContext';
import { RESUMO_POR_PERFIL, ROTULO_PERFIL } from '../../src/services/auth';
import { useBreakpoint } from '../../src/hooks/useBreakpoint';
import { theme } from '../../src/theme';

// Atalhos do app para cada perfil. Só funcionalidades que existem de verdade.
const ATALHOS = {
  usuario: [
    { titulo: 'ManaScan', texto: 'Identificar uma carta e ver se ela melhora o seu deck', rota: '/(tabs)/manuscan' },
    { titulo: 'Coleção', texto: 'Suas cartas: quantidade, condição e foil', rota: '/(tabs)/biblioteca?aba=colecao' },
    { titulo: 'Decks', texto: 'Montar decks Commander, Pauper, Modern…', rota: '/(tabs)/biblioteca?aba=decks' },
  ],
  loja: [
    { titulo: 'Perfil da loja', texto: 'Dados da loja e situação da aprovação', rota: '/(tabs)/perfil' },
  ],
  admin: [
    { titulo: 'Perfil', texto: 'Resumo da plataforma', rota: '/(tabs)/perfil' },
  ],
};

const SUBTITULO = {
  usuario: 'Sua coleção, seus decks e suas consignações',
  loja: 'Acervo e consignações da sua loja',
  admin: 'Administração da plataforma',
};

export default function Inicio() {
  const { isWide } = useBreakpoint();
  const { user, refreshUser } = useAuth();

  // Atualiza os números ao voltar para esta aba.
  useFocusEffect(useCallback(() => { refreshUser().catch(() => {}); }, [refreshUser]));

  if (!user) return null;
  const resumo = user.resumo || {};
  const primeiroNome = user.nome?.split(' ')[0];

  return (
    <ScrollView contentContainerStyle={[styles.page, isWide && styles.pageWide]}>
      <Head><title>Início | ManaTrade</title></Head>
      <Cabecalho title={`Olá, ${primeiroNome}`} subtitle={`${ROTULO_PERFIL[user.perfil]} · ${SUBTITULO[user.perfil]}`} />

      <View style={styles.stats}>
        {(RESUMO_POR_PERFIL[user.perfil] || []).map(([chave, label]) => (
          <View key={chave} style={styles.stat}>
            <Text style={styles.statValue}>{resumo[chave] ?? '–'}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {user.perfil === 'loja' && user.loja && !user.loja.aprovada && (
        <Text style={styles.aviso}>Sua loja aguarda aprovação do administrador. Até lá ela não aparece para os jogadores.</Text>
      )}
      {user.perfil !== 'usuario' && (
        <Text style={styles.muted}>O painel {user.perfil === 'loja' ? 'da loja (acervo e consignações)' : 'administrativo'} será disponibilizado no site do ManaTrade.</Text>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Atalhos</Text>
        {(ATALHOS[user.perfil] || []).map((a) => (
          <ListaItem key={a.rota} title={a.titulo} subtitle={a.texto} meta="›" onPress={() => router.push(a.rota)} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({ page: { flexGrow: 1, maxWidth: 1320, alignSelf: 'center', width: '100%', padding: theme.spacing.lg, gap: theme.spacing.lg }, pageWide: { paddingLeft: 142 }, stats: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }, stat: { flex: 1, minWidth: 110, padding: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface }, statValue: { color: theme.colors.accent, fontSize: theme.typography.h3, fontWeight: theme.typography.weight.bold }, statLabel: { color: theme.colors.textMuted, fontSize: theme.typography.small }, aviso: { color: theme.colors.warning, fontWeight: theme.typography.weight.medium }, muted: { color: theme.colors.textMuted }, section: { gap: theme.spacing.sm }, sectionTitle: { color: theme.colors.text, fontSize: theme.typography.h2, fontWeight: theme.typography.weight.bold } });
