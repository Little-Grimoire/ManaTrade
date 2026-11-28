import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { formatarDistancia } from '../services/lojas';
import { theme } from '../theme';

// Mapa das lojas (Android/iOS). Só aparecem as lojas com latitude/longitude cadastradas.
export default function Mapa({ lojas = [], posicao, onSelecionar }) {
  const comLocal = lojas.filter((l) => l.latitude != null && l.longitude != null);
  if (!comLocal.length) {
    return <View style={[styles.map, styles.vazio]}><Text style={styles.texto}>Nenhuma loja com localização cadastrada.</Text></View>;
  }
  const centro = posicao || comLocal[0];
  return (
    <View style={styles.map}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={{ latitude: centro.latitude, longitude: centro.longitude, latitudeDelta: 0.08, longitudeDelta: 0.08 }}
        showsUserLocation={!!posicao}
      >
        {comLocal.map((loja) => (
          <Marker
            key={loja.id}
            coordinate={{ latitude: loja.latitude, longitude: loja.longitude }}
            title={loja.nome}
            description={loja.km != null ? `${formatarDistancia(loja.km)} · toque para abrir` : 'Toque para abrir'}
            onCalloutPress={() => onSelecionar?.(loja)}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  map: { height: 360, borderRadius: theme.radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  vazio: { alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg },
  texto: { color: theme.colors.textMuted, textAlign: 'center' },
});
