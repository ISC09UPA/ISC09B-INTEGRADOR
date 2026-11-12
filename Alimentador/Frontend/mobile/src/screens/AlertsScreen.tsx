import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { TipoAlerta } from '@/api/types';
import { CabeceraTitulo } from '@/components/Headers';
import { Screen } from '@/components/Screen';
import { Aviso, TextoError } from '@/components/Ui';
import { useAlimentador } from '@/context/AlimentadorContext';
import { colors, fonts } from '@/theme';
import { fechaCorta, horaDeFecha } from '@/utils/format';

const ICONOS: Record<TipoAlerta, ComponentProps<typeof Feather>['name']> = {
  NoHaComido: 'clock',
  BajaApetito: 'trending-down',
  Atasco: 'alert-octagon',
  TolvaBaja: 'archive',
  AlimentadorSinConexion: 'wifi-off',
  GatewaySinConexion: 'wifi-off',
  ConexionRestablecida: 'wifi',
};

/**
 * Alertas del alimentador (campana de inicio).
 * GET /api/alimentadores/{id}/alertas y PUT /api/alertas/{id}/leida; las nuevas llegan por SignalR (AlertaCreada).
 */
export default function AlertsScreen() {
  const { alertas, noLeidas, marcarLeida, recargar } = useAlimentador();
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  const leer = async (id: number) => {
    try {
      await marcarLeida(id);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const leerTodas = async () => {
    setError(null);
    try {
      await Promise.all(alertas.filter((a) => !a.leida).map((a) => marcarLeida(a.id)));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Screen
      fondo={colors.bg}
      contenido={styles.contenido}
      refrescando={refrescando}
      alRefrescar={async () => {
        setRefrescando(true);
        await recargar();
        setRefrescando(false);
      }}>
      <CabeceraTitulo
        titulo="Alertas"
        derecha={
          noLeidas ? (
            <Pressable onPress={leerTodas} hitSlop={8} accessibilityRole="button">
              <Text style={styles.todas}>Marcar todas</Text>
            </Pressable>
          ) : null
        }
      />
      <TextoError mensaje={error} />
      {!alertas.length ? <Aviso icono="bell" titulo="Sin alertas" texto="Aquí verás avisos de tolva baja, atascos y desconexiones." /> : null}
      <View style={styles.lista}>
        {alertas.map((a) => (
          <Pressable
            key={a.id}
            onPress={() => !a.leida && leer(a.id)}
            style={[styles.fila, !a.leida && styles.noLeida]}
            accessibilityRole="button"
            accessibilityState={{ selected: !a.leida }}>
            <View style={[styles.icono, !a.leida && { backgroundColor: colors.text }]}>
              <Feather name={ICONOS[a.tipo] ?? 'bell'} size={18} color={a.leida ? colors.text : colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.mensaje}>{a.mensaje}</Text>
              <Text style={styles.fecha}>
                {fechaCorta(a.ocurridaEn)} · {horaDeFecha(a.ocurridaEn)}
              </Text>
            </View>
            {!a.leida ? <View style={styles.punto} /> : null}
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  contenido: { paddingBottom: 24 },
  todas: { fontFamily: fonts.jakartaSemibold, fontSize: 13, color: colors.text, textDecorationLine: 'underline' },
  lista: { paddingHorizontal: 20, gap: 10 },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: 14,
  },
  noLeida: { borderColor: colors.text },
  icono: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.chip, alignItems: 'center', justifyContent: 'center' },
  mensaje: { fontFamily: fonts.jakartaSemibold, fontSize: 14, color: colors.text },
  fecha: { fontFamily: fonts.jakarta, fontSize: 12, color: colors.muted, marginTop: 2 },
  punto: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.danger },
});
