import { useState } from 'react';
import Head from 'expo-router/head';
import { Link, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import BotaoPrimario from '../../src/components/BotaoPrimario';
import ChipFiltro from '../../src/components/ChipFiltro';
import { useAuth } from '../../src/contexts/AuthContext';
import { theme } from '../../src/theme';

// Perfis que podem ser escolhidos no cadastro. Admin não se cadastra pelo app.
const PERFIS = [
  { valor: 'usuario', rotulo: 'Jogador', ajuda: 'Organize sua coleção e decks e consigne cartas em lojas.' },
  { valor: 'loja', rotulo: 'Loja', ajuda: 'Publique seu acervo e receba consignações. A loja aparece no app depois da aprovação do administrador.' },
];

const CAMPOS_CONTA = [
  ['nome', 'Nome', { autoCapitalize: 'words', autoComplete: 'name' }],
  ['email', 'E-mail', { autoCapitalize: 'none', keyboardType: 'email-address', autoComplete: 'email' }],
  ['senha', 'Senha (mínimo 6 caracteres)', { secureTextEntry: true, autoComplete: 'new-password' }],
  ['confirmar', 'Confirmar senha', { secureTextEntry: true, autoComplete: 'new-password' }],
];

const CAMPOS_LOJA = [
  ['nome', 'Nome da loja', { autoCapitalize: 'words' }],
  ['endereco', 'Endereço', { autoCapitalize: 'words' }],
  ['cidade', 'Cidade', { autoCapitalize: 'words' }],
  ['uf', 'UF', { autoCapitalize: 'characters', maxLength: 2 }],
  ['horario', 'Horário de funcionamento (ex.: Seg–Sáb, 13h–21h)', {}],
  ['telefone', 'Telefone', { keyboardType: 'phone-pad' }],
];

export default function Cadastro() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ nome: '', email: '', senha: '', confirmar: '', perfil: 'usuario' });
  const [loja, setLoja] = useState({ nome: '', endereco: '', cidade: '', uf: '', horario: '', telefone: '' });
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateLoja = (key, value) => setLoja((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    if (!form.nome.trim() || !form.email.includes('@')) { setError('Informe nome e e-mail.'); return; }
    if (form.senha.length < 6 || form.senha !== form.confirmar) { setError('As senhas devem ser iguais e ter pelo menos 6 caracteres.'); return; }
    if (form.perfil === 'loja' && (!loja.nome.trim() || !loja.endereco.trim())) { setError('Informe o nome e o endereço da loja.'); return; }

    const dados = { nome: form.nome.trim(), email: form.email.trim(), senha: form.senha, perfil: form.perfil };
    if (form.perfil === 'loja') {
      // Envia só os campos preenchidos.
      dados.loja = Object.fromEntries(Object.entries(loja).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v));
    }

    setError(''); setSending(true);
    try {
      await signUp(dados);
      router.replace('/(tabs)');
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const perfilAtual = PERFIS.find((p) => p.valor === form.perfil);

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Head><title>Criar conta | ManaTrade</title></Head>
      <View style={styles.card}>
        <Text style={styles.title}>Criar conta</Text>

        <Text style={styles.label}>Você é</Text>
        <View style={styles.row}>
          {PERFIS.map((p) => <ChipFiltro key={p.valor} label={p.rotulo} active={form.perfil === p.valor} onPress={() => update('perfil', p.valor)} />)}
        </View>
        <Text style={styles.help}>{perfilAtual.ajuda}</Text>

        {CAMPOS_CONTA.map(([key, label, props]) => (
          <View key={key}>
            <Text style={styles.label}>{label}</Text>
            <TextInput value={form[key]} onChangeText={(value) => update(key, value)} placeholderTextColor={theme.colors.textMuted} style={styles.input} {...props} />
          </View>
        ))}

        {form.perfil === 'loja' && (
          <>
            <Text style={styles.section}>Dados da loja</Text>
            {CAMPOS_LOJA.map(([key, label, props]) => (
              <View key={key}>
                <Text style={styles.label}>{label}</Text>
                <TextInput value={loja[key]} onChangeText={(value) => updateLoja(key, value)} placeholderTextColor={theme.colors.textMuted} style={styles.input} {...props} />
              </View>
            ))}
          </>
        )}

        {!!error && <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>}
        <BotaoPrimario label={sending ? 'Criando conta…' : 'Criar conta'} onPress={submit} disabled={sending} />
        <Link href="/auth/login" style={styles.link}>Já tenho conta</Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({ page: { flexGrow: 1, alignItems: 'center', padding: theme.spacing.lg, backgroundColor: theme.colors.background }, card: { width: '100%', maxWidth: 480, gap: theme.spacing.md, padding: theme.spacing.xl, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.lg }, title: { color: theme.colors.text, fontSize: theme.typography.title, fontWeight: theme.typography.weight.bold }, section: { color: theme.colors.text, fontSize: theme.typography.h3, fontWeight: theme.typography.weight.bold, marginTop: theme.spacing.sm }, label: { color: theme.colors.textMuted, fontSize: theme.typography.small, marginBottom: theme.spacing.xs }, help: { color: theme.colors.textMuted, fontSize: theme.typography.small }, input: { width: '100%', minHeight: 48, color: theme.colors.text, paddingHorizontal: theme.spacing.md, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.background }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }, error: { color: theme.colors.danger }, link: { minHeight: 44, color: theme.colors.accent, textAlign: 'center', paddingTop: theme.spacing.md } });
