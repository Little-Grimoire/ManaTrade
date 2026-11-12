import Head from 'expo-router/head';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Cabecalho from '../../src/components/Cabecalho';
import BotaoPrimario from '../../src/components/BotaoPrimario';
import ChipFiltro from '../../src/components/ChipFiltro';
import EstadoErro from '../../src/components/EstadoErro';
import EstadoVazio from '../../src/components/EstadoVazio';
import ModalConfirmacao from '../../src/components/ModalConfirmacao';
import Skeleton from '../../src/components/Skeleton';
import { PRIORIDADES, adicionarDesejo, atualizarDesejo, listarDesejos, removerDesejo } from '../../src/services/desejos';
import { theme } from '../../src/theme';

const ROTULO_PRIORIDADE = Object.fromEntries(PRIORIDADES.map((p) => [p.valor, p.rotulo]));
const ORDEM_PRIORIDADE = { alta: 0, media: 1, baixa: 2 };
const usd = (v) => `US$ ${Number(v).toFixed(2)}`;

// "2,50" ou "2.50" -> 2.5; vazio -> null; inválido -> NaN
const lerPreco = (texto) => {
  const t = String(texto ?? '').trim().replace(',', '.');
  return t ? Number(t) : null;
};

export default function Desejos() {
  const [desejos, setDesejos] = useState([]);
  const [status, setStatus] = useState('loading');
  const [erro, setErro] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [novo, setNovo] = useState({ nome: '', preco: '', prioridade: 'media' });
  const [msgNovo, setMsgNovo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [editando, setEditando] = useState(null); // { id, prioridade, preco, observacao }
  const [msgEdicao, setMsgEdicao] = useState('');
  const [removendo, setRemovendo] = useState(null); // desejo a confirmar

  const load = useCallback(async () => {
    try {
      setDesejos(await listarDesejos());
      setStatus('ready');
    } catch (e) {
      setErro(e.message);
      setStatus('error');
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const puxarParaAtualizar = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const adicionar = async () => {
    if (!novo.nome.trim()) { setMsgNovo({ ok: false, texto: 'Digite o nome da carta.' }); return; }
    const preco = lerPreco(novo.preco);
    if (Number.isNaN(preco)) { setMsgNovo({ ok: false, texto: 'Preço máximo inválido.' }); return; }
    setEnviando(true); setMsgNovo(null);
    try {
      const criado = await adicionarDesejo({ nome: novo.nome.trim() }, { prioridade: novo.prioridade, preco_maximo_usd: preco });
      setDesejos((atual) => [criado, ...atual]);
      setNovo({ nome: '', preco: '', prioridade: 'media' });
      setMsgNovo({ ok: true, texto: `${criado.carta.nome} adicionada.` });
    } catch (e) {
      setMsgNovo({ ok: false, texto: e.message });
    } finally { setEnviando(false); }
  };

  const abrirEdicao = (d) => {
    setMsgEdicao('');
    setEditando({ id: d.id, prioridade: d.prioridade, preco: d.preco_maximo_usd != null ? String(Number(d.preco_maximo_usd)) : '', observacao: d.observacao || '' });
  };

  const salvarEdicao = async () => {
    const preco = lerPreco(editando.preco);
    if (Number.isNaN(preco)) { setMsgEdicao('Preço máximo inválido.'); return; }
    try {
      const atualizado = await atualizarDesejo(editando.id, { prioridade: editando.prioridade, preco_maximo_usd: preco, observacao: editando.observacao.trim() || null });
      setDesejos((atual) => atual.map((d) => (d.id === atualizado.id ? atualizado : d)));
      setEditando(null);
    } catch (e) { setMsgEdicao(e.message); }
  };

  const confirmarRemocao = async () => {
    const alvo = removendo;
    setRemovendo(null);
    try {
      await removerDesejo(alvo.id);
      setDesejos((atual) => atual.filter((d) => d.id !== alvo.id));
    } catch (e) { setErro(e.message); setStatus('error'); }
  };

  if (status === 'loading') return <View style={styles.page}><Skeleton height={160} /><Skeleton height={260} /></View>;
  if (status === 'error') return <EstadoErro texto={erro} onRetry={() => { setStatus('loading'); load(); }} />;

  const ordenados = [...desejos].sort((a, b) => ORDEM_PRIORIDADE[a.prioridade] - ORDEM_PRIORIDADE[b.prioridade]);

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={puxarParaAtualizar} tintColor={theme.colors.accent} />}>
      <Head><title>Lista de desejos | ManaTrade</title></Head>
      <Cabecalho title="Lista de desejos" subtitle={desejos.length ? `${desejos.length} ${desejos.length === 1 ? 'carta procurada' : 'cartas procuradas'}` : 'Cartas que você está procurando'} />

      <View style={styles.box}>
        <Text style={styles.boxTitle}>Adicionar carta</Text>
        <Text style={styles.label}>Nome da carta (em inglês; aceita erros de digitação)</Text>
        <TextInput value={novo.nome} onChangeText={(v) => setNovo((c) => ({ ...c, nome: v }))} onSubmitEditing={adicionar} placeholder="Ex.: Sol Ring" placeholderTextColor={theme.colors.textMuted} style={styles.input} />
        <Text style={styles.label}>Pago no máximo (US$, opcional)</Text>
        <TextInput value={novo.preco} onChangeText={(v) => setNovo((c) => ({ ...c, preco: v }))} keyboardType="decimal-pad" placeholder="Ex.: 2.50" placeholderTextColor={theme.colors.textMuted} style={styles.input} />
        <Text style={styles.label}>Prioridade</Text>
        <View style={styles.row}>{PRIORIDADES.map((p) => <ChipFiltro key={p.valor} label={p.rotulo} active={novo.prioridade === p.valor} onPress={() => setNovo((c) => ({ ...c, prioridade: p.valor }))} />)}</View>
        {!!msgNovo && <Text style={{ color: msgNovo.ok ? theme.colors.greenEnd : theme.colors.danger }}>{msgNovo.texto}</Text>}
        <BotaoPrimario label={enviando ? 'Buscando carta…' : 'Adicionar à lista'} onPress={adicionar} disabled={enviando} />
      </View>

      {!ordenados.length ? (
        <EstadoVazio titulo="Nenhum desejo" texto="Adicione acima ou pelo ManaScan as cartas que você procura." />
      ) : ordenados.map((d) => {
        const ref = d.carta.preco_usd != null ? Number(d.carta.preco_usd) : null;
        const max = d.preco_maximo_usd != null ? Number(d.preco_maximo_usd) : null;
        const dentroDoPreco = ref != null && max != null && ref <= max;
        const emEdicao = editando?.id === d.id;
        return (
          <View key={d.id} style={styles.item}>
            <View style={styles.itemTop}>
              {d.carta.imagem_url ? <Image source={{ uri: d.carta.imagem_url }} style={styles.thumb} accessibilityLabel={d.carta.nome} /> : <View style={[styles.thumb, styles.thumbVazio]} />}
              <View style={styles.copy}>
                <Text style={styles.nome}>{d.carta.nome}</Text>
                {!!d.carta.edicao && <Text style={styles.muted}>{d.carta.edicao}</Text>}
                <Text style={styles.muted}>
                  {ref != null ? `Referência ${usd(ref)}` : 'Sem preço de referência'}{max != null ? ` · Máximo ${usd(max)}` : ''}
                </Text>
                <View style={styles.tags}>
                  <Text style={[styles.tag, d.prioridade === 'alta' && styles.tagAlta]}>Prioridade {ROTULO_PRIORIDADE[d.prioridade].toLowerCase()}</Text>
                  {dentroDoPreco && <Text style={[styles.tag, styles.tagOk]}>Dentro do seu preço</Text>}
                </View>
                {!!d.observacao && <Text style={styles.obs}>{d.observacao}</Text>}
              </View>
            </View>

            {emEdicao ? (
              <View style={styles.edicao}>
                <View style={styles.row}>{PRIORIDADES.map((p) => <ChipFiltro key={p.valor} label={p.rotulo} active={editando.prioridade === p.valor} onPress={() => setEditando((c) => ({ ...c, prioridade: p.valor }))} />)}</View>
                <Text style={styles.label}>Pago no máximo (US$)</Text>
                <TextInput value={editando.preco} onChangeText={(v) => setEditando((c) => ({ ...c, preco: v }))} keyboardType="decimal-pad" placeholder="Sem limite" placeholderTextColor={theme.colors.textMuted} style={styles.input} />
                <Text style={styles.label}>Observação</Text>
                <TextInput value={editando.observacao} onChangeText={(v) => setEditando((c) => ({ ...c, observacao: v }))} maxLength={255} placeholder="Ex.: só a versão foil" placeholderTextColor={theme.colors.textMuted} style={styles.input} />
                {!!msgEdicao && <Text style={styles.erro}>{msgEdicao}</Text>}
                <View style={styles.acoes}>
                  <Acao label="Salvar" destaque onPress={salvarEdicao} />
                  <Acao label="Cancelar" onPress={() => setEditando(null)} />
                </View>
              </View>
            ) : (
              <View style={styles.acoes}>
                <Acao label="Editar" onPress={() => abrirEdicao(d)} />
                <Acao label="Remover" perigo onPress={() => setRemovendo(d)} />
              </View>
            )}
          </View>
        );
      })}

      <ModalConfirmacao visible={!!removendo} title="Remover da lista?" message={removendo ? `${removendo.carta.nome} sairá da sua lista de desejos.` : ''} confirmLabel="Remover" onConfirm={confirmarRemocao} onCancel={() => setRemovendo(null)} />
    </ScrollView>
  );
}

function Acao({ label, onPress, destaque, perigo }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.acao, destaque && styles.acaoDestaque, perigo && styles.acaoPerigo, pressed && { opacity: 0.8 }]}>
      <Text style={[styles.acaoTexto, destaque && { color: theme.colors.background }, perigo && { color: theme.colors.danger }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({ page: { flexGrow: 1, maxWidth: 960, alignSelf: 'center', width: '100%', padding: theme.spacing.lg, gap: theme.spacing.lg }, box: { gap: theme.spacing.sm, padding: theme.spacing.lg, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }, boxTitle: { color: theme.colors.text, fontSize: theme.typography.h3, fontWeight: theme.typography.weight.bold }, label: { color: theme.colors.textMuted, fontSize: theme.typography.small }, input: { minHeight: 48, color: theme.colors.text, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.sm, backgroundColor: theme.colors.background, paddingHorizontal: theme.spacing.md }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }, item: { gap: theme.spacing.md, padding: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }, itemTop: { flexDirection: 'row', gap: theme.spacing.md }, thumb: { width: 72, height: 100, borderRadius: theme.radius.sm }, thumbVazio: { backgroundColor: theme.colors.background }, copy: { flex: 1, gap: 2 }, nome: { color: theme.colors.text, fontSize: theme.typography.h3, fontWeight: theme.typography.weight.bold }, muted: { color: theme.colors.textMuted, fontSize: theme.typography.small }, obs: { color: theme.colors.text, fontStyle: 'italic', marginTop: theme.spacing.xs }, tags: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs, marginTop: theme.spacing.xs }, tag: { paddingHorizontal: theme.spacing.sm, paddingVertical: 2, borderRadius: theme.radius.pill, overflow: 'hidden', fontSize: theme.typography.small, color: theme.colors.textMuted, borderWidth: 1, borderColor: theme.colors.border }, tagAlta: { color: theme.colors.warning, borderColor: theme.colors.warning }, tagOk: { color: theme.colors.greenEnd, borderColor: theme.colors.greenEnd }, edicao: { gap: theme.spacing.sm }, erro: { color: theme.colors.danger }, acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }, acao: { minHeight: 44, minWidth: 96, alignItems: 'center', justifyContent: 'center', paddingHorizontal: theme.spacing.md, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border }, acaoDestaque: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }, acaoPerigo: { borderColor: theme.colors.danger }, acaoTexto: { color: theme.colors.text, fontWeight: theme.typography.weight.bold } });
