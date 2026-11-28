import Head from 'expo-router/head';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Cabecalho from '../src/components/Cabecalho';
import EstadoErro from '../src/components/EstadoErro';
import EstadoVazio from '../src/components/EstadoVazio';
import Skeleton from '../src/components/Skeleton';
import { excluirNotificacao, listarNotificacoes, marcarComoLida, marcarTodasComoLidas } from '../src/services/notificacoes';
import { theme } from '../src/theme';

const GRUPOS = { consignacao: 'Consignações', chamado: 'Chamados', sistema: 'Avisos do ManaTrade' };

const quando = (n) => {
  const data = n.createdAt || n.created_at;
  return data ? new Date(data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
};

// RF10: avisos gerados pelo backend (mudança de status de consignação, resposta de chamado, sistema).
export default function Notificacoes() {
  const [itens, setItens] = useState([]);
  const [status, setStatus] = useState('loading');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const carregar = useCallback(async () => {
    try { setErro(''); setItens(await listarNotificacoes()); setStatus('ready'); } catch (e) { setErro(e.message); setStatus('error'); }
  }, []);
  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  const puxar = async () => { setRefreshing(true); await carregar(); setRefreshing(false); };

  // Atualiza a tela na hora e desfaz se o servidor recusar.
  const alterar = async (novoEstado, fn) => {
    const anterior = itens;
    setItens(novoEstado); setAviso('');
    try { await fn(); } catch (e) { setItens(anterior); setAviso(e.message); }
  };

  const abrir = (n) => {
    if (!n.lida) alterar(itens.map((i) => (i.id === n.id ? { ...i, lida: true } : i)), () => marcarComoLida(n.id));
    if (n.tipo === 'consignacao') router.push('/consignacoes');
  };
  const todasLidas = () => alterar(itens.map((i) => ({ ...i, lida: true })), marcarTodasComoLidas);
  const excluir = (n) => alterar(itens.filter((i) => i.id !== n.id), () => excluirNotificacao(n.id));

  if (status === 'loading') return <View style={styles.page}><Skeleton height={260} /></View>;
  if (status === 'error') return <View style={styles.page}><Cabecalho title="Notificações" back /><EstadoErro texto={erro} onRetry={() => { setStatus('loading'); carregar(); }} /></View>;

  const naoLidas = itens.filter((i) => !i.lida).length;
  const tipos = [...new Set(itens.map((i) => i.tipo))];

  return (
    <ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={puxar} tintColor={theme.colors.accent} />}>
      <Head><title>Notificações | ManaTrade</title></Head>
      <Cabecalho
        title="Notificações"
        subtitle={naoLidas ? `${naoLidas} não lida(s)` : 'Tudo em dia'}
        back
        action={naoLidas > 0 && <Pressable style={styles.mark} onPress={todasLidas}><Text style={styles.markText}>Marcar todas como lidas</Text></Pressable>}
      />
      {!!aviso && <Text style={styles.erro}>{aviso}</Text>}

      {itens.length ? tipos.map((tipo) => (
        <View key={tipo} style={styles.group}>
          <Text style={styles.groupTitle}>{GRUPOS[tipo] || tipo}</Text>
          {itens.filter((i) => i.tipo === tipo).map((n) => (
            <View key={n.id} style={[styles.item, !n.lida && styles.unread]}>
              <Pressable style={styles.copy} onPress={() => abrir(n)} accessibilityRole="button">
                <Text style={styles.title}>{n.titulo}</Text>
                {!!n.mensagem && <Text style={styles.msg}>{n.mensagem}</Text>}
                <Text style={styles.time}>{quando(n)}</Text>
              </Pressable>
              {!n.lida && <View style={styles.dot} />}
              <Pressable accessibilityLabel="Excluir notificação" onPress={() => excluir(n)} style={styles.lixo}>
                <Ionicons name="trash-outline" size={18} color={theme.colors.textMuted} />
              </Pressable>
            </View>
          ))}
        </View>
      )) : <EstadoVazio titulo="Sem notificações" texto="Você será avisado aqui quando uma consignação mudar de status." />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, maxWidth: 1320, width: '100%', alignSelf: 'center', padding: theme.spacing.lg },
  mark: { minHeight: 44, justifyContent: 'center' },
  markText: { color: theme.colors.accent, fontWeight: theme.typography.weight.bold },
  group: { marginBottom: theme.spacing.lg },
  groupTitle: { color: theme.colors.textMuted, fontSize: theme.typography.small, fontWeight: theme.typography.weight.bold, marginBottom: theme.spacing.sm },
  item: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, padding: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  unread: { backgroundColor: theme.colors.surface },
  copy: { flex: 1, gap: 2 },
  title: { color: theme.colors.text, fontWeight: theme.typography.weight.bold },
  msg: { color: theme.colors.text },
  time: { color: theme.colors.textMuted, fontSize: theme.typography.small },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.accent },
  lixo: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  erro: { color: theme.colors.danger, marginBottom: theme.spacing.md },
});
