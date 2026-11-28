import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Em desenvolvimento, o backend roda no mesmo computador que o Metro. O host de onde o app
// baixou o bundle (ex.: "192.168.2.72:8081") é, portanto, o IP certo para a API, mesmo que
// o Wi-Fi tenha mudado depois que o .env foi gerado (o EXPO_PUBLIC_* fica gravado no bundle).
function hostDoDev() {
  if (!__DEV__) return null;
  if (Platform.OS === 'web') return typeof window !== 'undefined' ? window.location.hostname : null;
  const hostUri = Constants.expoConfig?.hostUri || Constants.expoGoConfig?.debuggerHost;
  return hostUri ? hostUri.split(':')[0] : null;
}

function urlDaApi(valorEnv, porta) {
  const host = hostDoDev();
  // Só IP ou localhost: com --tunnel o host é um domínio do túnel, onde o backend não está.
  if (host && /^(localhost|\d{1,3}(\.\d{1,3}){3})$/.test(host)) return `http://${host}:${porta}`;
  return valorEnv || `http://localhost:${porta}`;
}

export const config = {
  apiUrl: urlDaApi(process.env.EXPO_PUBLIC_API_URL, 3001),
  // API de ML (FastAPI em backend-ml/).
  mlApiUrl: urlDaApi(process.env.EXPO_PUBLIC_ML_API_URL, 8000),
};
