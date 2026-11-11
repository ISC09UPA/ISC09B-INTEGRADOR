import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors } from '@/theme';

interface Props {
  children: ReactNode;
  fondo?: string;
  scroll?: boolean;
  contenido?: StyleProp<ViewStyle>;
  /** Bordes con área segura; en pestañas la barra inferior ya cubre el borde de abajo. */
  edges?: Edge[];
  refrescando?: boolean;
  alRefrescar?: () => void;
  pie?: ReactNode;
}

/** Contenedor de pantalla con área segura y scroll opcional. */
export function Screen({
  children,
  fondo = colors.white,
  scroll = true,
  contenido,
  edges = ['top', 'bottom'],
  refrescando,
  alRefrescar,
  pie,
}: Props) {
  return (
    <SafeAreaView style={[styles.raiz, { backgroundColor: fondo }]} edges={edges}>
      {scroll ? (
        <ScrollView
          style={styles.raiz}
          contentContainerStyle={[styles.contenido, contenido]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            alRefrescar ? <RefreshControl refreshing={!!refrescando} onRefresh={alRefrescar} /> : undefined
          }>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.raiz, contenido]}>{children}</View>
      )}
      {pie}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1 },
  contenido: { flexGrow: 1 },
});
