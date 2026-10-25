import { Platform } from 'react-native';

export async function registrarNotificacoes() {
  if (Platform.OS === 'web') return null;
  const Notifications = await import('expo-notifications');
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}
