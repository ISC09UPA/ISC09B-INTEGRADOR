import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { mascotasApi } from '@/api/endpoints';
import type { VisitaDto } from '@/api/types';
import { CabeceraTitulo } from '@/components/Headers';
import { Screen } from '@/components/Screen';
import { Barra, Cargador, TextoError } from '@/components/Ui';
import { useAlimentador } from '@/context/AlimentadorContext';
import { fichaDeRaza } from '@/data/razas';
import { colors, fonts } from '@/theme';
import { fechaCorta, horaDeFecha } from '@/utils/format';

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <View style={styles.dato}>
      <Text style={styles.datoTitulo}>{titulo}</Text>
      <Text style={styles.datoValor}>{valor}</Text>
    </View>
  );
}

/**
 * Mockup "ScanResults".
 * - Con `visitaId` y `mascotaId`: muestra la identificación que hizo el alimentador
 *   (GET /api/mascotas/{id}/visitas: clase detectada y confianza).
 * - Con `foto`: la foto recién tomada; el usuario elige la mascota y se guarda como su foto de perfil.
 */
export default function ScanResults() {
  const params = useLocalSearchParams<{ foto?: string; visitaId?: string; mascotaId?: string }>();
  const { mascotas, mascota: seleccionada, extras, guardarExtrasMascota } = useAlimentador();

  const [visita, setVisita] = useState<VisitaDto | null>(null);
  const [cargando, setCargando] = useState(!!params.visitaId);
  const [error, setError] = useState<string | null>(null);
  const [elegidaId, setElegidaId] = useState<number | null>(params.mascotaId ? Number(params.mascotaId) : (seleccionada?.id ?? null));
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!params.visitaId || !params.mascotaId) return;
    let vivo = true;
    const desde = new Date(Date.now() - 30 * 86_400_000).toISOString();
    mascotasApi
      .visitas(Number(params.mascotaId), desde)
      .then((lista) => {
        if (!vivo) return;
        const v = lista.find((x) => x.id === Number(params.visitaId)) ?? null;
        setVisita(v);
        if (!v) setError('No se encontró la identificación.');
      })
      .catch((e) => vivo && setError((e as Error).message))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, [params.visitaId, params.mascotaId]);

  const mascota = mascotas.find((m) => m.id === elegidaId) ?? null;
  const raza = mascota ? extras[mascota.id]?.raza : undefined;
  const especie = visita?.clase === 'Gato' ? 'Gato' : visita?.clase === 'Perro' ? 'Perro' : (mascota?.especie ?? 'Perro');
  const ficha = fichaDeRaza(especie, raza);
  const foto = params.foto ?? (mascota ? extras[mascota.id]?.fotoUri : undefined);
  const confianza = visita ? Math.round(visita.confianza * (visita.confianza <= 1 ? 100 : 1)) : null;

  const etiqueta = visita
    ? visita.clase === 'Nada'
      ? 'Sin animal'
      : `${visita.clase} detectado`
    : 'Foto capturada';

  const guardar = async () => {
    if (!mascota || !params.foto) return;
    setGuardando(true);
    try {
      await guardarExtrasMascota(mascota.id, { fotoUri: params.foto });
      router.replace(`/mascota/${mascota.id}`);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Screen fondo={colors.bg} contenido={styles.contenido}>
      <CabeceraTitulo titulo="Resultado" />

      <View style={styles.imagen}>
        {foto ? (
          <Image source={{ uri: foto }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <MaterialCommunityIcons name="paw-outline" size={56} color={colors.subtle} />
        )}
        <View style={styles.etiqueta}>
          <Text style={styles.etiquetaTexto}>{etiqueta}</Text>
        </View>
      </View>

      {cargando ? <Cargador /> : null}
      <TextoError mensaje={error} />

      <View style={styles.tarjeta}>
        {visita ? (
          <>
            <View style={styles.filaTitulo}>
              <Text style={styles.titulo} numberOfLines={2}>
                {mascota ? (raza ? `${mascota.nombre} · ${raza}` : mascota.nombre) : visita.clase}
              </Text>
              <Text style={styles.porcentaje}>{confianza} %</Text>
            </View>
            <Barra valor={confianza} color={colors.text} alto={9} style={{ marginTop: 14 }} />
            <Text style={styles.nota}>
              Confianza del resultado · {fechaCorta(visita.iniciadaEn)}, {horaDeFecha(visita.iniciadaEn)} · comió{' '}
              {Math.round(visita.consumidoG)} g de {Math.round(visita.dispensadoG)} g
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.titulo}>{mascota ? mascota.nombre : '¿Quién es?'}</Text>
            <Text style={styles.nota}>
              Elige a qué mascota pertenece la foto. El alimentador la identifica por su cuenta en cada visita.
            </Text>
            <View style={styles.chips}>
              {mascotas.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => setElegidaId(m.id)}
                  style={[styles.chip, m.id === elegidaId && styles.chipActivo]}
                  accessibilityRole="button">
                  <Text style={[styles.chipTexto, m.id === elegidaId && { color: colors.white }]}>{m.nombre}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </View>

      <Text style={styles.seccion}>Ficha de la raza</Text>
      <View style={styles.rejilla}>
        <Dato titulo="Alimentación" valor={mascota ? `${Math.round(mascota.gramosPorDiaRecomendados)} g al día en ${mascota.comidasPorDia} comidas` : ficha.alimentacion} />
        <Dato titulo="Hábitat" valor={ficha.habitat} />
        <Dato titulo="Tamaño" valor={ficha.tamano} />
        <Dato titulo="Esperanza de vida" valor={ficha.esperanzaVida} />
        <Dato titulo="Temperamento" valor={ficha.temperamento} />
        <Dato titulo="Cuidados básicos" valor={ficha.cuidados} />
      </View>

      <View style={styles.botones}>
        {params.foto ? (
          <Pressable
            onPress={guardar}
            disabled={!mascota || guardando}
            style={[styles.principal, (!mascota || guardando) && { opacity: 0.5 }]}
            accessibilityRole="button">
            <Text style={styles.principalTexto}>{guardando ? 'Guardando…' : 'Guardar en mi mascota'}</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => router.navigate('/historial')} style={styles.principal} accessibilityRole="button">
            <Text style={styles.principalTexto}>Ver historial</Text>
          </Pressable>
        )}
        <Pressable onPress={() => router.navigate('/camara')} style={styles.secundario} accessibilityRole="button">
          <Text style={styles.secundarioTexto}>Tomar otra foto</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  contenido: { paddingBottom: 24 },
  imagen: {
    height: 200,
    marginHorizontal: 20,
    borderRadius: 32,
    backgroundColor: colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  etiqueta: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  etiquetaTexto: { fontFamily: fonts.jakartaSemibold, fontSize: 13, color: colors.white },
  tarjeta: {
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginHorizontal: 20,
    marginTop: 18,
    padding: 20,
  },
  filaTitulo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  titulo: { flex: 1, fontFamily: fonts.jakartaBold, fontSize: 24, color: colors.text, letterSpacing: -0.5 },
  porcentaje: { fontFamily: fonts.jakartaBold, fontSize: 20, color: colors.text },
  nota: { fontFamily: fonts.jakarta, fontSize: 13, lineHeight: 17, color: colors.muted, marginTop: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8 },
  chipActivo: { backgroundColor: colors.camButton, borderColor: colors.camButton },
  chipTexto: { fontFamily: fonts.jakartaSemibold, fontSize: 14, color: colors.text },
  seccion: { fontFamily: fonts.jakartaBold, fontSize: 17, color: colors.text, marginHorizontal: 20, marginTop: 24, marginBottom: 12 },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20 },
  dato: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: 14,
    gap: 4,
  },
  datoTitulo: { fontFamily: fonts.jakarta, fontSize: 12, color: colors.muted },
  datoValor: { fontFamily: fonts.jakartaBold, fontSize: 14, lineHeight: 18, color: colors.text },
  botones: { paddingHorizontal: 20, marginTop: 28, gap: 10 },
  principal: { backgroundColor: colors.primary, borderRadius: 20, height: 54, alignItems: 'center', justifyContent: 'center' },
  principalTexto: { fontFamily: fonts.jakartaBold, fontSize: 16, color: colors.white },
  secundario: {
    backgroundColor: colors.white,
    borderRadius: 20,
    height: 50,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secundarioTexto: { fontFamily: fonts.jakartaSemibold, fontSize: 15, color: colors.text },
});
