import { useState } from 'react';
import Head from 'expo-router/head';
import { Link, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import BotaoPrimario from '../../src/components/BotaoPrimario';
import { useAuth } from '../../src/contexts/AuthContext';
import { theme } from '../../src/theme';

export default function Login() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const submit = async () => {
    if (!email.includes('@') || password.length < 6) {
      setError('Informe um e-mail válido e senha com 6 caracteres.');
      return;
    }
    await signIn({ email });
    router.replace('/(tabs)');
  };
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Head>
        <title>Entrar | ManaTrade</title>
      </Head>
      <View style={styles.card}>
        <Text style={styles.brand}>ManaTrade</Text>
        <Text style={styles.title}>Bem-vindo de volta</Text>
        <Text style={styles.label}>E-mail</Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="voce@email.com"
          placeholderTextColor={theme.colors.textMuted}
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />
        <Text style={styles.label}>Senha</Text>
        <TextInput
          secureTextEntry
          placeholder="Mínimo 6 caracteres"
          placeholderTextColor={theme.colors.textMuted}
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />
        {!!error && (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}
        <BotaoPrimario label="Entrar" onPress={submit} />
        <Link href="/auth/cadastro" style={styles.link}>
          Criar uma conta
        </Link>
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    minHeight: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    gap: theme.spacing.md,
    padding: theme.spacing.xxl,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  brand: { color: theme.colors.accent, fontWeight: theme.typography.weight.bold },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.title,
    fontWeight: theme.typography.weight.bold,
    marginBottom: theme.spacing.sm,
  },
  label: { color: theme.colors.textMuted, fontSize: theme.typography.small },
  input: {
    minHeight: 48,
    color: theme.colors.text,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
  },
  error: { color: theme.colors.danger },
  link: {
    minHeight: 44,
    color: theme.colors.accent,
    textAlign: 'center',
    paddingTop: theme.spacing.md,
  },
});
