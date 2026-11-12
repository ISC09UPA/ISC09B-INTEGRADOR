import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { mascotasApi } from '@/api/endpoints';
import type { VisitaDto } from '@/api/types';
import { CabeceraTitulo } from '@/components/Headers';
import { Screen } from '@/components/Screen';
import { Aviso, Cargador, TextoError } from '@/components/Ui';
import { useAlimentador } from '@/context/AlimentadorContext';
import { colors, fonts } from '@/theme';
import { fechaCorta, horaDeFecha, inicioDelDia } from '@/utils/format';

/** Identificaciones previas: visitas de los últimos 7 días de todas las mascotas (GET /api/mascotas/{id}/visitas). */
export default function IdentificationsScreen() {
  const { mascotas, ultimaVisita } = useAlimentador();
  const [visitas, setVisitas] = useState<VisitaDto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    const desde = inicioDelDia(new Date(Date.now() - 6 * 86_400_000)).toISOString();
    Promise.all(mascotas.map((m) => mascotasApi.visitas(m.id, desde)))
      .then((listas) => {
        if (!vivo) return;
        setVisitas(listas.flat().sort((a, b) => Date.parse(b.iniciadaEn) - Date.parse(a.iniciadaEn)));
      })
      .catch((e) => vivo && setError((e as Error).message))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, [mascotas, ultimaVisita]);

  return (
    <Screen fondo={colors.bg} contenido={styles.contenido}>
      <CabeceraTitulo titulo="Identificaciones" />
      {cargando ? <Cargador /> : null}
      <TextoError mensaje={error} />
      {!cargando && !visitas.length ? (
        <Aviso icono="camera" titulo="Sin identificaciones" texto="Aquí aparecerán las visitas que el alimentador reconozca." />
      ) : null}
      <View style={styles.lista}>
        {visitas.map((v) => {
          const m = mascotas.find((x) => x.id === v.mascotaId);
          const confianza = Math.round(v.confianza * (v.confianza <= 1 ? 100 : 1));
          return (
            <Pressable
              key={v.id}
              style={({ pressed }) => [styles.fila, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              onPress={() =>
                router.push({ pathname: '/resultado', params: { visitaId: String(v.id), mascotaId: String(v.mascotaId ?? '') } })
              }>
              <View style={styles.icono}>
                <MaterialCommunityIcons name={v.clase === 'Gato' ? 'cat' : v.clase === 'Perro' ? 'dog' : 'paw-outline'} size={22} color={colors.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.nombre}>{m?.nombre ?? 'Sin identificar'}</Text>
                <Text style={styles.detalle}>
                  {v.clase} · {confianza} % · {fechaCorta(v.iniciadaEn)}, {horaDeFecha(v.iniciadaEn)}
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.muted} />
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  contenido: { paddingBottom: 24 },
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
  icono: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.chip, alignItems: 'center', justifyContent: 'center' },
  nombre: { fontFamily: fonts.jakartaBold, fontSize: 15, color: colors.text },
  detalle: { fontFamily: fonts.jakarta, fontSize: 12, color: colors.muted, marginTop: 2 },
});
