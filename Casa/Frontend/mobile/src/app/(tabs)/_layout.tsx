import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CasaProvider } from '@/lib/casa';
import { tacto } from '@/lib/haptics';
import { colors } from '@/lib/theme';

const ICONOS: Record<string, { on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap; titulo: string }> = {
  index: { on: 'home', off: 'home-outline', titulo: 'Casa' },
  actividad: { on: 'pulse', off: 'pulse-outline', titulo: 'Actividad' },
  camara: { on: 'scan', off: 'scan-outline', titulo: 'Cámara' },
  ajustes: { on: 'options', off: 'options-outline', titulo: 'Ajustes' },
};

/** Barra flotante. `props` viene de expo-router (react-navigation). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Barra(props: any) {
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 12, paddingHorizontal: 16 }}
    >
      <View
        style={{
          flexDirection: 'row',
          height: 66,
          borderRadius: 33,
          padding: 6,
          backgroundColor: 'rgba(16,19,21,0.96)',
          borderWidth: 1,
          borderColor: colors.line,
          boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
        }}
      >
        {props.state.routes.map((route: { key: string; name: string }, i: number) => {
          const meta = ICONOS[route.name];
          if (!meta) return null;
          const enfocada = props.state.index === i;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: enfocada }}
              onPress={() => {
                const e = props.navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!enfocada && !e.defaultPrevented) {
                  tacto.toque();
                  props.navigation.navigate(route.name);
                }
              }}
              style={{
                flex: enfocada ? 1.7 : 1,
                borderRadius: 27,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 7,
                backgroundColor: enfocada ? colors.lime : 'transparent',
              }}
            >
              <Ionicons name={enfocada ? meta.on : meta.off} size={22} color={enfocada ? '#0A1200' : colors.mute} />
              {enfocada ? <Text style={{ color: '#0A1200', fontWeight: '800', fontSize: 13 }}>{meta.titulo}</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <CasaProvider>
      <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }} tabBar={(props) => <Barra {...props} />}>
        <Tabs.Screen name="index" options={{ title: 'Casa' }} />
        <Tabs.Screen name="actividad" options={{ title: 'Actividad' }} />
        <Tabs.Screen name="camara" options={{ title: 'Cámara' }} />
        <Tabs.Screen name="ajustes" options={{ title: 'Ajustes' }} />
      </Tabs>
    </CasaProvider>
  );
}
