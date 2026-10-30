import { Tabs, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBreakpoint } from '../../src/hooks/useBreakpoint';
import { theme } from '../../src/theme';

const tabs = [
  { name: 'index', title: 'Início', icon: 'compass-outline' },
  { name: 'biblioteca', title: 'Biblioteca', icon: 'albums-outline' },
  { name: 'manuscan', title: 'ManaScan', icon: 'scan-outline', center: true },
  { name: 'desejos', title: 'Desejos', icon: 'heart-outline' },
  { name: 'perfil', title: 'Perfil', icon: 'person-outline' },
];

export default function TabLayout() {
  const { isWide } = useBreakpoint();
  const router = useRouter();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.colors.background },
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: isWide
          ? { display: 'none' }
          : {
              height: 72,
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.border,
            },
        tabBarItemStyle: { minWidth: 64 },
      }}
      tabBar={isWide ? (props) => <Sidebar state={props.state} router={router} /> : undefined}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarLabel: tab.title,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={tab.icon} size={tab.center ? 30 : size} color={color} />
            ),
            tabBarAccessibilityLabel: tab.title,
          }}
        />
      ))}
    </Tabs>
  );
}

function Sidebar({ state, router }) {
  return (
    <View style={styles.sidebar}>
      <Pressable style={styles.brand} onPress={() => router.replace('/(tabs)')}>
        <Text style={styles.brandText}>ManaTrade</Text>
      </Pressable>
      {tabs.map((tab) => {
        const selected = state.routes[state.index]?.name === tab.name;
        return (
          <Pressable
            key={tab.name}
            accessibilityRole="button"
            accessibilityLabel={tab.title}
            onPress={() => router.replace(`/(tabs)/${tab.name === 'index' ? '' : tab.name}`)}
            style={({ hovered, pressed }) => [
              styles.item,
              tab.center && styles.scan,
              selected && styles.selected,
              hovered && styles.hover,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name={tab.icon}
              size={tab.center ? 28 : 22}
              color={
                tab.center
                  ? theme.colors.background
                  : selected
                    ? theme.colors.accent
                    : theme.colors.textMuted
              }
            />
            <Text
              style={[
                styles.label,
                tab.center && styles.scanLabel,
                selected && styles.selectedLabel,
              ]}
            >
              {tab.title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
const styles = StyleSheet.create({
  sidebar: {
    position: 'absolute',
    zIndex: 10,
    left: 0,
    top: 0,
    bottom: 0,
    width: 118,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
  },
  brand: { height: 44, justifyContent: 'center', marginBottom: theme.spacing.md },
  brandText: {
    color: theme.colors.accent,
    fontWeight: theme.typography.weight.bold,
    fontSize: theme.typography.h3,
  },
  item: {
    width: 94,
    minHeight: 62,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: theme.radius.sm,
  },
  selected: { backgroundColor: '#223447' },
  hover: { backgroundColor: '#2a4055' },
  pressed: { opacity: 0.8 },
  label: { color: theme.colors.textMuted, fontSize: 12 },
  selectedLabel: { color: theme.colors.accent },
  scan: {
    width: 82,
    height: 82,
    minHeight: 82,
    borderRadius: 41,
    backgroundColor: theme.colors.accent,
    marginVertical: theme.spacing.sm,
  },
  scanLabel: { color: theme.colors.background, fontWeight: theme.typography.weight.bold },
});
