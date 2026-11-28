import { Tabs, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../src/components/Tipografia';
import { Ionicons } from '@expo/vector-icons';
import { useBreakpoint } from '../../src/hooks/useBreakpoint';
import { useAuth } from '../../src/contexts/AuthContext';
import { theme } from '../../src/theme';

const tabs = [
  { name: 'index', title: 'Início', icon: 'compass-outline' },
  { name: 'biblioteca', title: 'Biblioteca', icon: 'albums-outline', soJogador: true },
  { name: 'manuscan', title: 'ManaScan', icon: 'scan-outline', center: true },
  { name: 'desejos', title: 'Desejos', icon: 'heart-outline', soJogador: true },
  { name: 'perfil', title: 'Perfil', icon: 'person-outline' },
];

export default function TabLayout() {
  const { isWide } = useBreakpoint();
  const router = useRouter();
  const { perfil } = useAuth();
  // Coleção, decks e desejos são do jogador: para loja e admin a API responde 403, então as abas somem.
  const visivel = (tab) => !tab.soJogador || perfil === 'usuario';
  return <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: theme.colors.background }, tabBarActiveTintColor: theme.colors.goldBright, tabBarInactiveTintColor: theme.colors.onLeather, tabBarLabelStyle: { fontFamily: theme.fonts.bodyMedium, fontSize: 12 }, tabBarStyle: isWide ? { display: 'none' } : { height: 72, backgroundColor: theme.colors.leather, borderTopWidth: 1, borderTopColor: theme.colors.border }, tabBarItemStyle: { minWidth: 64 } }} tabBar={isWide ? (props) => <Sidebar state={props.state} router={router} visiveis={tabs.filter(visivel)} /> : undefined}>{tabs.map((tab) => <Tabs.Screen key={tab.name} name={tab.name} options={{ href: visivel(tab) ? undefined : null, title: tab.title, tabBarLabel: tab.title, tabBarIcon: ({ color, size }) => <Ionicons name={tab.icon} size={tab.center ? 30 : size} color={color} />, tabBarAccessibilityLabel: tab.title }} />)}</Tabs>;
}

function Sidebar({ state, router, visiveis }) {
  return <View style={styles.sidebar}><Pressable style={styles.brand} onPress={() => router.replace('/(tabs)')}><Text style={styles.brandText}>ManaTrade</Text></Pressable>{visiveis.map((tab) => { const selected = state.routes[state.index]?.name === tab.name; return <Pressable key={tab.name} accessibilityRole="button" accessibilityLabel={tab.title} onPress={() => router.replace(`/(tabs)/${tab.name === 'index' ? '' : tab.name}`)} style={({ hovered, pressed }) => [styles.item, tab.center && styles.scan, selected && styles.selected, hovered && styles.hover, pressed && styles.pressed]}><Ionicons name={tab.icon} size={tab.center ? 28 : 22} color={tab.center ? theme.colors.leather : selected ? theme.colors.goldBright : theme.colors.onLeather} /><Text style={[styles.label, tab.center && styles.scanLabel, selected && styles.selectedLabel]}>{tab.title}</Text></Pressable>; })}</View>;
}
const styles = StyleSheet.create({ sidebar: { position: 'absolute', zIndex: 10, left: 0, top: 0, bottom: 0, width: 118, paddingVertical: theme.spacing.lg, alignItems: 'center', gap: theme.spacing.sm, backgroundColor: theme.colors.leather, borderRightWidth: 1, borderRightColor: theme.colors.border }, brand: { height: 44, justifyContent: 'center', marginBottom: theme.spacing.md }, brandText: { color: theme.colors.goldBright, fontFamily: theme.fonts.title, fontSize: 20, letterSpacing: 1, textTransform: 'uppercase' }, item: { width: 94, minHeight: 62, alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: theme.radius.sm }, selected: { backgroundColor: theme.colors.leatherRaised }, hover: { backgroundColor: theme.colors.leatherHover }, pressed: { opacity: 0.8 }, label: { color: theme.colors.onLeather, fontSize: 13 }, selectedLabel: { color: theme.colors.goldBright }, scan: { width: 82, height: 82, minHeight: 82, borderRadius: 41, backgroundColor: theme.colors.goldBright, borderWidth: 2, borderColor: theme.colors.gold, marginVertical: theme.spacing.sm }, scanLabel: { color: theme.colors.leather, fontWeight: theme.typography.weight.bold } });
