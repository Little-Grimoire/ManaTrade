import Head from 'expo-router/head';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Cabecalho from '../src/components/Cabecalho';
import BotaoPrimario from '../src/components/BotaoPrimario';
import BotaoSecundario from '../src/components/BotaoSecundario';
import ChipFiltro from '../src/components/ChipFiltro';
import ModalConfirmacao from '../src/components/ModalConfirmacao';
import EstadoErro from '../src/components/EstadoErro';
import EstadoVazio from '../src/components/EstadoVazio';
import Skeleton from '../src/components/Skeleton';
import { useAuth } from '../src/contexts/AuthContext';
import {
  ACOES_DA_LOJA, ENCERRADAS, ETAPAS, ROTULOS, atualizarConsignacao, excluirConsignacao, listarConsignacoes,
} from '../src/services/consignacoes';
import { theme } from '../src/theme';

const reais = (v) => (v == null ? '–' : `R$ ${Number(v).toFixed(2).replace('.', ',')}`);

// RF07. Jogador: acompanha, edita o preço enquanto pendente, cancela e exclui.
// Loja: aceita, recusa, coloca à venda, registra venda ou devolução. Admin: consulta e exclui.
export default function Consignacoes() {
  const { perfil } = useAuth();
  const [itens, setItens] = useState([]);
  const [status, setStatus] = useState('loading');
  const [erro, setErro] = useState('');
  const [filtro, setFiltro] = useState('ativas'); // ativas | encerradas
  const [refreshing, setRefreshing] = useState(false);
  const [confirmar, setConfirmar] = useState(null); // { titulo, mensagem, rotulo, acao }
  const [aviso, setAviso] = useState(null);

  const carregar = useCallback(async () => {
    try { setErro(''); setItens(await listarConsignacoes()); setStatus('ready'); } catch (e) { setErro(e.message); setStatus('error'); }
  }, []);
  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  const puxar = async () => { setRefreshing(true); await carregar(); setRefreshing(false); };

  // Executa uma alteração e recarrega a lista; erros do backend (ex.: transição inválida) aparecem no topo.
  const executar = async (fn, sucesso) => {
    setConfirmar(null); setAviso(null);
    try { await fn(); setAviso({ ok: true, texto: sucesso }); await carregar(); } catch (e) { setAviso({ ok: false, texto: e.message }); }
  };

  if (status === 'loading') return <View style={styles.page}><Skeleton height={160} /><Skeleton height={160} /></View>;
  if (status === 'error') return <View style={styles.page}><Cabecalho title="Consignações" back /><EstadoErro texto={erro} onRetry={() => { setStatus('loading'); carregar(); }} /></View>;

  const visiveis = itens.filter((c) => (filtro === 'ativas') !== ENCERRADAS.includes(c.status));
  const subtitulo = perfil === 'loja' ? 'Cartas que jogadores deixaram na sua loja' : perfil === 'admin' ? 'Todas as consignações da plataforma' : 'Cartas que você deixou para venda';

  return (
    <ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={puxar} tintColor={theme.colors.accent} />}>
      <Head><title>Consignações | ManaTrade</title></Head>
      <Cabecalho title="Consignações" subtitle={subtitulo} back />

      <View style={styles.row}>
        <ChipFiltro label="Em andamento" active={filtro === 'ativas'} onPress={() => setFiltro('ativas')} />
        <ChipFiltro label="Encerradas" active={filtro === 'encerradas'} onPress={() => setFiltro('encerradas')} />
      </View>
      {!!aviso && <Text style={aviso.ok ? styles.ok : styles.erro}>{aviso.texto}</Text>}

      {visiveis.length ? visiveis.map((c) => (
        <CartaoConsignacao key={c.id} c={c} perfil={perfil} executar={executar} setConfirmar={setConfirmar} />
      )) : (
        <EstadoVazio
          titulo={filtro === 'ativas' ? 'Nenhuma consignação em andamento' : 'Nenhuma consignação encerrada'}
          texto={perfil === 'usuario' && filtro === 'ativas' ? 'Escolha uma loja parceira e consigne uma carta da sua coleção.' : undefined}
          acao={perfil === 'usuario' && filtro === 'ativas' ? 'Ver lojas' : undefined}
          onPress={() => router.push('/lojas')}
        />
      )}

      <ModalConfirmacao
        visible={!!confirmar}
        title={confirmar?.titulo}
        message={confirmar?.mensagem}
        confirmLabel={confirmar?.rotulo}
        onConfirm={() => confirmar?.acao()}
        onCancel={() => setConfirmar(null)}
      />
    </ScrollView>
  );
}

function CartaoConsignacao({ c, perfil, executar, setConfirmar }) {
  const [editando, setEditando] = useState(false);
  const [preco, setPreco] = useState(String(c.preco_pedido ?? '').replace('.', ','));
  const [resposta, setResposta] = useState('');
  const souDono = perfil === 'usuario';
  const encerrada = ENCERRADAS.includes(c.status);
  const etapa = ETAPAS.indexOf(c.status);
  const nome = c.carta?.nome || 'Carta';

  const salvarPreco = () => {
    const valor = Number(preco.replace(',', '.'));
    if (!(valor > 0)) return;
    executar(() => atualizarConsignacao(c.id, { preco_pedido: valor }), `Preço de ${nome} atualizado.`);
    setEditando(false);
  };

  const mudarStatus = (acao) => {
    const corpo = { status: acao.status, ...(resposta.trim() && { resposta_loja: resposta.trim() }) };
    const fazer = () => executar(() => atualizarConsignacao(c.id, corpo), `${nome}: ${ROTULOS[acao.status]}.`);
    if (acao.perigo) setConfirmar({ titulo: `${acao.rotulo}?`, mensagem: `A consignação de ${nome} ficará como "${ROTULOS[acao.status]}".`, rotulo: acao.rotulo, acao: fazer });
    else fazer();
  };

  return (
    <View style={styles.card}>
      <View style={styles.topo}>
        <View style={{ flex: 1 }}>
          <Text style={styles.nome}>{nome}</Text>
          <Text style={styles.muted}>
            {[c.quantidade > 1 ? `${c.quantidade}x` : null, c.condicao, c.foil ? 'Foil' : null, perfil === 'usuario' ? c.loja?.nome : c.usuario?.nome].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <Text style={[styles.status, encerrada && c.status !== 'vendida' && styles.statusFim]}>{ROTULOS[c.status]}</Text>
      </View>

      {etapa >= 0 && (
        <View style={styles.timeline}>
          {ETAPAS.map((s, i) => (
            <View key={s} style={styles.step}>
              <View style={[styles.dot, i <= etapa && styles.done]} />
              <Text style={[styles.stepText, i <= etapa && styles.doneText]}>{ROTULOS[s]}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.valor}>Preço pedido: {reais(c.preco_pedido)}{c.preco_venda ? ` · venda: ${reais(c.preco_venda)}` : ''}</Text>
      {!!c.observacao && <Text style={styles.muted}>Mensagem: {c.observacao}</Text>}
      {!!c.resposta_loja && <Text style={styles.muted}>Resposta da loja: {c.resposta_loja}</Text>}

      {souDono && c.status === 'pendente' && (editando ? (
        <View style={styles.acoes}>
          <TextInput value={preco} onChangeText={setPreco} keyboardType="decimal-pad" style={styles.input} accessibilityLabel="Novo preço pedido" />
          <BotaoPrimario label="Salvar" onPress={salvarPreco} />
          <BotaoSecundario label="Cancelar" onPress={() => setEditando(false)} />
        </View>
      ) : (
        <View style={styles.acoes}>
          <BotaoSecundario label="Editar preço" onPress={() => setEditando(true)} />
          <BotaoSecundario label="Desistir" danger onPress={() => setConfirmar({ titulo: 'Desistir da consignação?', mensagem: `${nome} não será mais oferecida à loja.`, rotulo: 'Desistir', acao: () => executar(() => atualizarConsignacao(c.id, { status: 'cancelada' }), 'Consignação cancelada.') })} />
        </View>
      ))}

      {perfil === 'loja' && ACOES_DA_LOJA[c.status] && (
        <View style={styles.acoesLoja}>
          {c.status === 'pendente' && (
            <TextInput value={resposta} onChangeText={setResposta} placeholder="Resposta ao jogador (opcional)" placeholderTextColor={theme.colors.textMuted} style={[styles.input, { flex: 0 }]} />
          )}
          <View style={styles.acoes}>
            {ACOES_DA_LOJA[c.status].map((a) => (a.perigo
              ? <BotaoSecundario key={a.status} label={a.rotulo} danger onPress={() => mudarStatus(a)} />
              : <BotaoPrimario key={a.status} label={a.rotulo} onPress={() => mudarStatus(a)} />))}
          </View>
        </View>
      )}

      {((souDono && encerrada) || perfil === 'admin') && (
        <View style={styles.acoes}>
          <BotaoSecundario label="Excluir do histórico" danger onPress={() => setConfirmar({ titulo: 'Excluir consignação?', mensagem: `O registro de ${nome} será apagado.`, rotulo: 'Excluir', acao: () => executar(() => excluirConsignacao(c.id), 'Consignação excluída.') })} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, maxWidth: 1320, width: '100%', alignSelf: 'center', padding: theme.spacing.lg, gap: theme.spacing.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  card: { gap: theme.spacing.sm, padding: theme.spacing.lg, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  topo: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md },
  nome: { color: theme.colors.text, fontSize: theme.typography.h3, fontWeight: theme.typography.weight.bold },
  status: { color: theme.colors.accent, fontWeight: theme.typography.weight.bold },
  statusFim: { color: theme.colors.textMuted },
  muted: { color: theme.colors.textMuted },
  timeline: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md, marginVertical: theme.spacing.sm },
  step: { width: 72, gap: theme.spacing.xs },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: theme.colors.border },
  done: { backgroundColor: theme.colors.accent },
  stepText: { color: theme.colors.textMuted, fontSize: theme.typography.small },
  doneText: { color: theme.colors.text },
  valor: { color: theme.colors.text, fontWeight: theme.typography.weight.bold },
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, alignItems: 'center' },
  acoesLoja: { gap: theme.spacing.sm },
  input: { flex: 1, minWidth: 120, minHeight: 48, color: theme.colors.text, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.sm, backgroundColor: theme.colors.background, paddingHorizontal: theme.spacing.md },
  ok: { color: theme.colors.greenEnd },
  erro: { color: theme.colors.danger },
});
