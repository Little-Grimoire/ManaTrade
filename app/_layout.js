import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import AvisoOffline from '../src/components/AvisoOffline';
import { theme } from '../src/theme';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed/700Bold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_400Regular_Italic } from '@expo-google-fonts/inter/400Regular_Italic';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';

function RootNavigation() {
  const { authenticated, loading } = useAuth();
  // Espaço da barra de status / recorte da câmera, para nada ficar atrás deles (0 na web).
  const { top } = useSafeAreaInsets();
  const segments = useSegments();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!loading) setReady(true);
  }, [loading]);

  useEffect(() => {
    if (!ready) return;
    const inAuth = segments[0] === 'auth';
    if (!authenticated && segments[0] !== 'auth') router.replace('/auth/login');
    if (authenticated && inAuth) router.replace('/(tabs)');
  }, [authenticated, ready, segments, router]);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingTop: top, backgroundColor: theme.colors.background }}>
      <AvisoOffline />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  // Fontes do tema (Barlow Condensed nos títulos, Inter no texto). Se falharem, segue com a do sistema.
  const [fontesProntas, erroFontes] = useFonts({ BarlowCondensed_700Bold, Inter_400Regular, Inter_400Regular_Italic, Inter_600SemiBold, Inter_700Bold });
  if (!fontesProntas && !erroFontes) return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <RootNavigation />
    </AuthProvider>
  );
}
