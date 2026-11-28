import Head from 'expo-router/head';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Cabecalho from '../../src/components/Cabecalho';
import BotaoPrimario from '../../src/components/BotaoPrimario';
import BotaoSecundario from '../../src/components/BotaoSecundario';
import ListaItem from '../../src/components/ListaItem';
import EstadoErro from '../../src/components/EstadoErro';
import EstadoVazio from '../../src/components/EstadoVazio';
import Skeleton from '../../src/components/Skeleton';
import { useAuth } from '../../src/contexts/AuthContext';
import { acervoDaLoja, enderecoDaLoja, obterLoja } from '../../src/services/lojas';
import { listarColecao } from '../../src/services/colecao';
import { criarConsignacao } from '../../src/services/consignacoes';
import { theme } from '../../src/theme';

const reais = (v) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`;

// Loja (parâmetros: id e, se a lista calculou, a distância). Mostra o acervo e permite consignar.
export default function LojaDetalhe() {
  const { id, distancia } = useLocalSearchParams();
  const { perfil } = useAuth();
  const [loja, setLoja] = useState(null);
  const [acervo, setAcervo] = useState([]);
  const [status, setStatus] = useState('loading');
  const [erro, setErro] = useState('');
  const [consignando, setConsignando] = useState(false);

  const carregar = useCallback(async () => {
    setStatus('loading');
    try {
      const [l, a] = await Promise.all([obterLoja(id), acervoDaLoja(id)]);
      setLoja(l); setAcervo(a); setStatus('ready');
    } catch (e) { setErro(e.message); setStatus('error'); }
  }, [id]);
  useEffect(() => { carregar(); }, [carregar]);

  if (status === 'loading') return <View style={styles.page}><Skeleton height={200} /><Skeleton height={260} /></View>;
  if (status === 'error') return <View style={styles.page}><Cabecalho title="Loja" back /><EstadoErro texto={erro} onRetry={carregar} /></View>;

  const podeConsignar = perfil === 'usuario' && loja.aceita_consignacao;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Head><title>{`${loja.nome} | ManaTrade`}</title></Head>
      <Cabecalho title={loja.nome} subtitle={distancia ? `${distancia} de você` : undefined} back />

      <View style={styles.info}>
        <Text style={styles.badge}>{loja.aceita_consignacao ? 'Aceita consignação' : 'Não está aceitando consignações'}</Text>
        {!!enderecoDaLoja(loja) && <Text style={styles.text}>{enderecoDaLoja(loja)}</Text>}
        {!!loja.horario && <Text style={styles.text}>{loja.horario}</Text>}
        {!!loja.telefone && <Text style={styles.text}>{loja.telefone}</Text>}
        {!!loja.descricao && <Text style={styles.descricao}>{loja.descricao}</Text>}
      </View>

      {podeConsignar && (consignando
        ? <FormConsignacao loja={loja} onCancelar={() => setConsignando(false)} />
        : <BotaoPrimario label="Consignar uma carta nesta loja" onPress={() => setConsignando(true)} />)}

      <Text style={styles.title}>À venda na loja</Text>
      {acervo.length ? acervo.map((item) => (
        <ListaItem
          key={item.id}
          title={item.carta?.nome || 'Carta'}
          subtitle={[item.carta?.edicao, item.condicao, item.foil ? 'Foil' : null, `${item.quantidade} un.`, item.consignacao_id ? 'Consignada' : null].filter(Boolean).join(' · ')}
          meta={reais(item.preco)}
        />
      )) : <EstadoVazio titulo="Acervo vazio" texto="Esta loja ainda não cadastrou cartas à venda." />}
    </ScrollView>
  );
}

// Escolhe um item da coleção, a quantidade e o preço pedido; o backend valida e cria a consignação.
function FormConsignacao({ loja, onCancelar }) {
  const [itens, setItens] = useState(null);
  const [erroLista, setErroLista] = useState('');
  const [item, setItem] = useState(null);
  const [quantidade, setQuantidade] = useState('1');
  const [preco, setPreco] = useState('');
  const [observacao, setObservacao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => { listarColecao().then(setItens).catch((e) => setErroLista(e.message)); }, []);

  const enviar = async () => {
    const valor = Number(preco.replace(',', '.'));
    const qtd = Number(quantidade);
    if (!item) return setErro('Escolha uma carta da sua coleção.');
    if (!Number.isInteger(qtd) || qtd < 1 || qtd > item.quantidade) return setErro(`Quantidade entre 1 e ${item.quantidade}.`);
    if (!(valor > 0)) return setErro('Informe o preço pedido (ex.: 25,90).');
    setEnviando(true); setErro('');
    try {
      await criarConsignacao({ loja_id: loja.id, item_colecao_id: item.id, quantidade: qtd, preco_pedido: valor, observacao: observacao.trim() || undefined });
      router.push('/consignacoes');
    } catch (e) { setErro(e.message); } finally { setEnviando(false); }
  };

  if (erroLista) return <View style={styles.form}><Text style={styles.erro}>{erroLista}</Text><BotaoSecundario label="Fechar" onPress={onCancelar} /></View>;
  if (!itens) return <View style={styles.form}><ActivityIndicator color={theme.colors.accent} /></View>;
  if (!itens.length) {
    return (
      <View style={styles.form}>
        <Text style={styles.text}>Sua coleção está vazia. Adicione cartas pela Biblioteca ou pelo ManaScan para consigná-las.</Text>
        <BotaoSecundario label="Fechar" onPress={onCancelar} />
      </View>
    );
  }

  return (
    <View style={styles.form}>
      <Text style={styles.formTitle}>Consignar em {loja.nome}</Text>
      <Text style={styles.label}>Carta da sua coleção</Text>
      <View style={styles.opcoes}>
        {itens.map((i) => (
          <Pressable key={i.id} onPress={() => { setItem(i); setQuantidade('1'); }} style={[styles.opcao, item?.id === i.id && styles.opcaoAtiva]}>
            <Text style={styles.opcaoNome}>{i.carta?.nome}</Text>
            <Text style={styles.opcaoMeta}>{[i.condicao, i.foil ? 'Foil' : null, `${i.quantidade}x`, i.carta?.preco_usd ? `ref. US$ ${i.carta.preco_usd}` : null].filter(Boolean).join(' · ')}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.linha}>
        <View style={styles.campo}>
          <Text style={styles.label}>Quantidade</Text>
          <TextInput value={quantidade} onChangeText={setQuantidade} keyboardType="number-pad" style={styles.input} />
        </View>
        <View style={styles.campo}>
          <Text style={styles.label}>Preço pedido (R$)</Text>
          <TextInput value={preco} onChangeText={setPreco} keyboardType="decimal-pad" placeholder="25,90" placeholderTextColor={theme.colors.textMuted} style={styles.input} />
        </View>
      </View>
      <Text style={styles.label}>Mensagem para a loja (opcional)</Text>
      <TextInput value={observacao} onChangeText={setObservacao} multiline style={[styles.input, styles.multiline]} />
      {!!erro && <Text style={styles.erro}>{erro}</Text>}
      <BotaoPrimario label={enviando ? 'Enviando…' : 'Enviar para a loja'} disabled={enviando} onPress={enviar} />
      <BotaoSecundario label="Cancelar" onPress={onCancelar} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, maxWidth: 1320, width: '100%', alignSelf: 'center', padding: theme.spacing.lg, gap: theme.spacing.md },
  info: { gap: theme.spacing.sm, padding: theme.spacing.lg, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface },
  badge: { color: theme.colors.accent, fontWeight: theme.typography.weight.bold },
  text: { color: theme.colors.textMuted },
  descricao: { color: theme.colors.text, marginTop: theme.spacing.xs },
  title: { color: theme.colors.text, fontSize: theme.typography.h2, fontWeight: theme.typography.weight.bold, marginTop: theme.spacing.lg },
  form: { gap: theme.spacing.sm, padding: theme.spacing.lg, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.accent, backgroundColor: theme.colors.surface },
  formTitle: { color: theme.colors.text, fontSize: theme.typography.h3, fontWeight: theme.typography.weight.bold },
  label: { color: theme.colors.textMuted, fontSize: theme.typography.small },
  opcoes: { gap: theme.spacing.xs },
  opcao: { padding: theme.spacing.md, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.background },
  opcaoAtiva: { borderColor: theme.colors.accent, backgroundColor: theme.colors.surfaceRaised },
  opcaoNome: { color: theme.colors.text, fontWeight: theme.typography.weight.bold },
  opcaoMeta: { color: theme.colors.textMuted, fontSize: theme.typography.small },
  linha: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md },
  campo: { flex: 1, minWidth: 130, gap: theme.spacing.xs },
  input: { minHeight: 48, color: theme.colors.text, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.sm, backgroundColor: theme.colors.background, paddingHorizontal: theme.spacing.md },
  multiline: { minHeight: 72, paddingTop: theme.spacing.sm, textAlignVertical: 'top' },
  erro: { color: theme.colors.danger },
});
