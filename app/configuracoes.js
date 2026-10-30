import Head from 'expo-router/head';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Cabecalho from '../src/components/Cabecalho';
import ChipFiltro from '../src/components/ChipFiltro';
import BotaoPrimario from '../src/components/BotaoPrimario';
import ModalConfirmacao from '../src/components/ModalConfirmacao';
import { useAuth } from '../src/contexts/AuthContext';
import { theme } from '../src/theme';
export default function Configuracoes() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    name: user?.name || 'Jonathan Silva',
    email: user?.email || '',
  });
  const [games, setGames] = useState(['Magic', 'Pokémon']);
  const [notifications, setNotifications] = useState(true);
  const [privateProfile, setPrivateProfile] = useState(false);
  const [saved, setSaved] = useState(false);
  const toggle = (value) =>
    setGames((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Head>
        <title>Configurações | ManaTrade</title>
      </Head>
      <Cabecalho title="Configurações" back />
      <View style={styles.section}>
        <Text style={styles.title}>Perfil</Text>
        {[
          ['name', 'Nome'],
          ['email', 'E-mail'],
        ].map(([key, label]) => (
          <View key={key}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
              value={profile[key]}
              onChangeText={(value) => setProfile((current) => ({ ...current, [key]: value }))}
              style={styles.input}
            />
          </View>
        ))}
      </View>
      <View style={styles.section}>
        <Text style={styles.title}>Jogos favoritos</Text>
        <View style={styles.row}>
          {['Magic', 'Pokémon', 'Yu-Gi-Oh!', 'Lorcana'].map((item) => (
            <ChipFiltro
              key={item}
              label={item}
              active={games.includes(item)}
              onPress={() => toggle(item)}
            />
          ))}
        </View>
      </View>
      <View style={styles.section}>
        <Setting label="Notificações" value={notifications} onChange={setNotifications} />
        <Setting label="Perfil privado" value={privateProfile} onChange={setPrivateProfile} />
      </View>
      <BotaoPrimario
        label={saved ? 'Alterações salvas' : 'Salvar alterações'}
        onPress={() => setSaved(true)}
      />
    </ScrollView>
  );
}
function Setting({ label, value, onChange }) {
  return (
    <View style={styles.setting}>
      <Text style={styles.settingText}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        thumbColor={value ? theme.colors.accent : theme.colors.textMuted}
        trackColor={{ false: theme.colors.border, true: '#2f6f93' }}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  section: {
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.h3,
    fontWeight: theme.typography.weight.bold,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.small,
    marginBottom: theme.spacing.xs,
  },
  input: {
    minHeight: 48,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  setting: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingText: { color: theme.colors.text, fontWeight: theme.typography.weight.medium },
});
