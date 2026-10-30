import { useState } from 'react';
import Head from 'expo-router/head';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import BotaoPrimario from '../../src/components/BotaoPrimario';
import ChipFiltro from '../../src/components/ChipFiltro';
import { useAuth } from '../../src/contexts/AuthContext';
import { theme } from '../../src/theme';

export default function Cadastro() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm: '',
    profile: 'Colecionador',
  });
  const [games, setGames] = useState(['Magic']);
  const [error, setError] = useState('');
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const toggleGame = (game) =>
    setGames((current) =>
      current.includes(game) ? current.filter((item) => item !== game) : [...current, game],
    );
  const submit = async () => {
    if (
      !form.name.trim() ||
      !form.email.includes('@') ||
      form.password.length < 6 ||
      form.password !== form.confirm
    ) {
      setError('Confira nome, e-mail e senhas iguais com pelo menos 6 caracteres.');
      return;
    }
    await signIn(form);
    router.replace('/(tabs)');
  };
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Head>
        <title>Criar conta | ManaTrade</title>
      </Head>
      <View style={styles.card}>
        <Text style={styles.title}>Criar conta</Text>
        {['name', 'email', 'password', 'confirm'].map((key) => (
          <View key={key}>
            <Text style={styles.label}>
              {
                { name: 'Nome', email: 'E-mail', password: 'Senha', confirm: 'Confirmar senha' }[
                  key
                ]
              }
            </Text>
            <TextInput
              value={form[key]}
              onChangeText={(value) => update(key, value)}
              secureTextEntry={key === 'password' || key === 'confirm'}
              autoCapitalize={key === 'name' ? 'words' : 'none'}
              keyboardType={key === 'email' ? 'email-address' : 'default'}
              placeholderTextColor={theme.colors.textMuted}
              style={styles.input}
            />
          </View>
        ))}
        <Text style={styles.label}>Perfil</Text>
        <View style={styles.row}>
          {['Colecionador', 'Loja'].map((item) => (
            <ChipFiltro
              key={item}
              label={item}
              active={form.profile === item}
              onPress={() => update('profile', item)}
            />
          ))}
        </View>
        <Text style={styles.label}>TCGs de interesse</Text>
        <View style={styles.row}>
          {['Magic', 'Pokémon', 'Yu-Gi-Oh!', 'Lorcana'].map((item) => (
            <ChipFiltro
              key={item}
              label={item}
              active={games.includes(item)}
              onPress={() => toggleGame(item)}
            />
          ))}
        </View>
        {!!error && <Text style={styles.error}>{error}</Text>}
        <BotaoPrimario label="Criar conta" onPress={submit} />
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    gap: theme.spacing.md,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.title,
    fontWeight: theme.typography.weight.bold,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.small,
    marginBottom: theme.spacing.xs,
  },
  input: {
    width: '100%',
    minHeight: 48,
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  error: { color: theme.colors.danger },
});
