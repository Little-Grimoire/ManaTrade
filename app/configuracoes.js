import Head from 'expo-router/head';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Cabecalho from '../src/components/Cabecalho';
import BotaoPrimario from '../src/components/BotaoPrimario';
import { useAuth } from '../src/contexts/AuthContext';
import { ROTULO_PERFIL } from '../src/services/auth';
import { theme } from '../src/theme';

export default function Configuracoes() {
  const { user, updateUser, changePassword } = useAuth();
  const [dados, setDados] = useState({ nome: user?.nome || '', email: user?.email || '' });
  const [senhas, setSenhas] = useState({ atual: '', nova: '', confirmar: '' });
  const [msgDados, setMsgDados] = useState(null);
  const [msgSenha, setMsgSenha] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const salvarDados = async () => {
    setEnviando(true); setMsgDados(null);
    try {
      await updateUser({ nome: dados.nome.trim(), email: dados.email.trim() });
      setMsgDados({ ok: true, texto: 'Dados atualizados.' });
    } catch (e) {
      setMsgDados({ ok: false, texto: e.message });
    } finally { setEnviando(false); }
  };

  const salvarSenha = async () => {
    if (senhas.nova.length < 6 || senhas.nova !== senhas.confirmar) {
      setMsgSenha({ ok: false, texto: 'A nova senha deve ter pelo menos 6 caracteres e ser igual à confirmação.' }); return;
    }
    setEnviando(true); setMsgSenha(null);
    try {
      await changePassword(senhas.atual, senhas.nova);
      setSenhas({ atual: '', nova: '', confirmar: '' });
      setMsgSenha({ ok: true, texto: 'Senha alterada.' });
    } catch (e) {
      setMsgSenha({ ok: false, texto: e.message });
    } finally { setEnviando(false); }
  };

  const campo = (estado, setEstado, key, label, props = {}) => (
    <View key={key}>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={estado[key]} onChangeText={(v) => setEstado((c) => ({ ...c, [key]: v }))} placeholderTextColor={theme.colors.textMuted} style={styles.input} {...props} />
    </View>
  );
  const mensagem = (msg) => msg && <Text style={{ color: msg.ok ? theme.colors.greenEnd : theme.colors.danger }}>{msg.texto}</Text>;

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Head><title>Configurações | ManaTrade</title></Head>
      <Cabecalho title="Configurações" back />

      <View style={styles.section}>
        <Text style={styles.title}>Conta</Text>
        <Text style={styles.muted}>Perfil: {ROTULO_PERFIL[user?.perfil]} (definido no cadastro; só o administrador altera)</Text>
        {campo(dados, setDados, 'nome', 'Nome', { autoCapitalize: 'words' })}
        {campo(dados, setDados, 'email', 'E-mail', { autoCapitalize: 'none', keyboardType: 'email-address' })}
        {mensagem(msgDados)}
        <BotaoPrimario label="Salvar dados" onPress={salvarDados} disabled={enviando} />
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>Alterar senha</Text>
        {campo(senhas, setSenhas, 'atual', 'Senha atual', { secureTextEntry: true })}
        {campo(senhas, setSenhas, 'nova', 'Nova senha', { secureTextEntry: true })}
        {campo(senhas, setSenhas, 'confirmar', 'Confirmar nova senha', { secureTextEntry: true })}
        {mensagem(msgSenha)}
        <BotaoPrimario label="Alterar senha" onPress={salvarSenha} disabled={enviando} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({ page: { flexGrow: 1, maxWidth: 760, width: '100%', alignSelf: 'center', padding: theme.spacing.lg, gap: theme.spacing.lg }, section: { gap: theme.spacing.md, padding: theme.spacing.lg, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }, title: { color: theme.colors.text, fontSize: theme.typography.h3, fontWeight: theme.typography.weight.bold }, muted: { color: theme.colors.textMuted, fontSize: theme.typography.small }, label: { color: theme.colors.textMuted, fontSize: theme.typography.small, marginBottom: theme.spacing.xs }, input: { minHeight: 48, color: theme.colors.text, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.sm, backgroundColor: theme.colors.background, paddingHorizontal: theme.spacing.md } });
