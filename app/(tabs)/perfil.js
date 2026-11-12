import Head from 'expo-router/head';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import BotaoSecundario from '../../src/components/BotaoSecundario';
import ModalConfirmacao from '../../src/components/ModalConfirmacao';
import { useAuth } from '../../src/contexts/AuthContext';
import { RESUMO_POR_PERFIL, ROTULO_PERFIL } from '../../src/services/auth';
import { theme } from '../../src/theme';

export default function Perfil() {
  const { user, signOut, refreshUser } = useAuth();
  const [confirm, setConfirm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const atualizar = useCallback(async () => {
    try { setError(''); await refreshUser(); } catch (e) { setError(e.message); }
  }, [refreshUser]);

  // Atualiza os números sempre que a aba é aberta.
  useFocusEffect(useCallback(() => { atualizar(); }, [atualizar]));

  const puxarParaAtualizar = async () => { setRefreshing(true); await atualizar(); setRefreshing(false); };
  const logout = async () => { setConfirm(false); await signOut(); router.replace('/auth/login'); };

  if (!user) return null;
  const resumo = user.resumo || {};
  const loja = user.loja;

  return (
    <ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={puxarParaAtualizar} tintColor={theme.colors.accent} />}>
      <Head><title>Perfil | ManaTrade</title></Head>

      <View style={styles.profile}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{user.nome?.slice(0, 1).toUpperCase()}</Text></View>
        <View style={styles.copy}>
          <Text style={styles.name}>{user.nome}</Text>
          <Text style={styles.subtitle}>{user.email}</Text>
          <Text style={styles.badge}>{ROTULO_PERFIL[user.perfil]}</Text>
        </View>
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      {user.perfil === 'loja' && (
        loja ? (
          <View style={styles.box}>
            <Text style={styles.boxTitle}>{loja.nome}</Text>
            <Text style={styles.muted}>{[loja.endereco, loja.cidade, loja.uf].filter(Boolean).join(' · ')}</Text>
            {!!loja.horario && <Text style={styles.muted}>{loja.horario}</Text>}
            <Text style={[styles.status, { color: loja.aprovada ? theme.colors.greenEnd : theme.colors.warning }]}>
              {loja.aprovada ? 'Loja aprovada: visível no app' : 'Aguardando aprovação do administrador'}
            </Text>
          </View>
        ) : (
          <Text style={styles.muted}>Nenhuma loja cadastrada nesta conta.</Text>
        )
      )}

      <View style={styles.stats}>
        {(RESUMO_POR_PERFIL[user.perfil] || []).map(([chave, label]) => (
          <View key={chave} style={styles.stat}>
            <Text style={styles.statValue}>{resumo[chave] ?? '–'}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <BotaoSecundario label={`Notificações${resumo.notificacoesNaoLidas ? ` (${resumo.notificacoesNaoLidas} novas)` : ''}`} onPress={() => router.push('/notificacoes')} />
      <BotaoSecundario label="Configurações da conta" onPress={() => router.push('/configuracoes')} />
      <BotaoSecundario label="Sair" danger onPress={() => setConfirm(true)} />
      <ModalConfirmacao visible={confirm} title="Sair da conta?" message="Sua sessão será encerrada neste dispositivo." confirmLabel="Sair" onConfirm={logout} onCancel={() => setConfirm(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({ page: { flexGrow: 1, maxWidth: 1320, alignSelf: 'center', width: '100%', gap: theme.spacing.lg, padding: theme.spacing.lg }, profile: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg }, copy: { flex: 1, gap: 2 }, avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accent }, avatarText: { color: theme.colors.background, fontSize: 32, fontWeight: theme.typography.weight.bold }, name: { color: theme.colors.text, fontSize: theme.typography.title, fontWeight: theme.typography.weight.bold }, subtitle: { color: theme.colors.textMuted }, badge: { alignSelf: 'flex-start', marginTop: theme.spacing.xs, paddingHorizontal: theme.spacing.md, paddingVertical: 4, borderRadius: theme.radius.pill, overflow: 'hidden', color: theme.colors.background, backgroundColor: theme.colors.accent, fontWeight: theme.typography.weight.bold, fontSize: theme.typography.small }, box: { gap: theme.spacing.xs, padding: theme.spacing.lg, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }, boxTitle: { color: theme.colors.text, fontSize: theme.typography.h3, fontWeight: theme.typography.weight.bold }, muted: { color: theme.colors.textMuted }, status: { marginTop: theme.spacing.xs, fontWeight: theme.typography.weight.bold }, error: { color: theme.colors.danger }, stats: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }, stat: { flex: 1, minWidth: 110, padding: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface }, statValue: { color: theme.colors.accent, fontSize: theme.typography.h3, fontWeight: theme.typography.weight.bold }, statLabel: { color: theme.colors.textMuted, fontSize: theme.typography.small } });
