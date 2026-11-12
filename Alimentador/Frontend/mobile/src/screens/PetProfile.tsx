import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { mascotasApi } from '@/api/endpoints';
import type { MascotaDto, NivelActividad } from '@/api/types';
import { Boton } from '@/components/Buttons';
import { CabeceraCentrada } from '@/components/Headers';
import { Selector } from '@/components/Inputs';
import { CamposRacion, elegirFoto, FilaPesoEdad } from '@/components/PetForm';
import { Screen } from '@/components/Screen';
import { Aviso, Cargador, TextoError } from '@/components/Ui';
import { useAlimentador } from '@/context/AlimentadorContext';
import { RAZAS } from '@/data/razas';
import { colors, fonts } from '@/theme';

function numero(texto: string): number {
  return Number(texto.replace(',', '.').trim());
}

function confirmar(titulo: string, mensaje: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(globalThis.confirm?.(`${titulo}\n\n${mensaje}`) ?? false);
  return new Promise((resolve) =>
    Alert.alert(titulo, mensaje, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Dar de baja', style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

/** Mockup "Pet Profile": GET/PUT/DELETE /api/mascotas/{id}. */
export default function PetProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const mascotaId = Number(id);
  const { mascotas, extras, guardarExtrasMascota, esDueno, recargarMascotas } = useAlimentador();

  const [mascota, setMascota] = useState<MascotaDto | null>(mascotas.find((m) => m.id === mascotaId) ?? null);
  const [cargando, setCargando] = useState(!mascota);
  const [error, setError] = useState<string | null>(null);

  const [peso, setPeso] = useState('');
  const [edad, setEdad] = useState('');
  const [actividad, setActividad] = useState<NivelActividad>('Moderado');
  const [esterilizado, setEsterilizado] = useState(false);
  const [comidas, setComidas] = useState(2);
  const [guardando, setGuardando] = useState(false);

  const extra = extras[mascotaId];

  const llenar = (m: MascotaDto) => {
    setMascota(m);
    setPeso(m.pesoKg.toFixed(2));
    setEdad(String(Math.round((m.edadMeses / 12) * 10) / 10));
    setActividad(m.nivelActividad);
    setEsterilizado(m.esterilizado);
    setComidas(m.comidasPorDia);
  };

  useEffect(() => {
    let vivo = true;
    mascotasApi
      .obtener(mascotaId)
      .then((m) => vivo && llenar(m))
      .catch((e) => vivo && setError((e as Error).message))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, [mascotaId]);

  if (cargando && !mascota) {
    return (
      <Screen>
        <CabeceraCentrada titulo="Perfil de mascota" />
        <Cargador />
      </Screen>
    );
  }
  if (!mascota) {
    return (
      <Screen>
        <CabeceraCentrada titulo="Perfil de mascota" />
        <Aviso icono="alert-circle" titulo="No se encontró la mascota" texto={error ?? undefined} />
      </Screen>
    );
  }

  const pesoKg = numero(peso);
  const edadMeses = Math.round(numero(edad) * 12);
  const cambios =
    Math.abs(pesoKg - mascota.pesoKg) > 0.001 ||
    edadMeses !== mascota.edadMeses ||
    actividad !== mascota.nivelActividad ||
    esterilizado !== mascota.esterilizado ||
    comidas !== mascota.comidasPorDia;

  const guardar = async () => {
    if (!(pesoKg > 0 && pesoKg <= 100)) return setError('El peso debe estar entre 0.1 y 100 kg.');
    if (!(edadMeses >= 0 && edadMeses <= 300)) return setError('La edad debe estar entre 0 y 25 años.');
    setGuardando(true);
    setError(null);
    try {
      const m = await mascotasApi.actualizar(mascota.id, {
        nombre: mascota.nombre,
        especie: mascota.especie,
        pesoKg,
        edadMeses,
        nivelActividad: actividad,
        esterilizado,
        comidasPorDia: comidas,
        etiquetaRfid: mascota.etiquetaRfid,
      });
      llenar(m);
      await recargarMascotas();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  };

  const darDeBaja = async () => {
    if (!(await confirmar(`¿Dar de baja a ${mascota.nombre}?`, 'Su historial se conserva, pero el alimentador dejará de servirle.'))) return;
    try {
      await mascotasApi.eliminar(mascota.id);
      await recargarMascotas();
      router.back();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const cambiarFoto = async () => {
    const uri = await elegirFoto();
    if (uri) await guardarExtrasMascota(mascota.id, { fotoUri: uri });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contenido={{ paddingBottom: 32 }}>
        <CabeceraCentrada titulo="Perfil de mascota" />

        <View style={styles.fotoZona}>
          <Pressable onPress={cambiarFoto} style={styles.marco} accessibilityRole="button" accessibilityLabel="Cambiar foto">
            {extra?.fotoUri ? (
              <Image source={{ uri: extra.fotoUri }} style={styles.foto} contentFit="cover" />
            ) : (
              <View style={[styles.foto, styles.sinFoto]}>
                <Feather name="camera" size={36} color={colors.subtle} />
                <Text style={styles.sinFotoTexto}>Agregar foto</Text>
              </View>
            )}
          </Pressable>
        </View>

        <View style={styles.dato}>
          <Text style={styles.datoEtiqueta}>Nombre:</Text>
          <Text style={styles.datoValor} numberOfLines={1}>
            {mascota.nombre}
          </Text>
        </View>
        <View style={styles.dato}>
          <Text style={styles.datoEtiqueta}>Especie:</Text>
          <Text style={styles.datoValor}>{mascota.especie}</Text>
        </View>
        <View style={styles.dato}>
          <Text style={styles.datoEtiqueta}>Raza:</Text>
          <View style={{ flex: 1 }}>
            <Selector
              titulo="Raza"
              placeholder="Sin raza registrada"
              valor={extra?.raza ?? null}
              opciones={RAZAS[mascota.especie].map((r) => ({ valor: r, etiqueta: r }))}
              onCambio={(r) => guardarExtrasMascota(mascota.id, { raza: r })}
            />
          </View>
        </View>

        <FilaPesoEdad peso={peso} edad={edad} onPeso={setPeso} onEdad={setEdad} placeholderPeso="0.00 Kg" placeholderEdad="00 años" />

        {esDueno ? (
          <CamposRacion
            actividad={actividad}
            onActividad={setActividad}
            esterilizado={esterilizado}
            onEsterilizado={setEsterilizado}
            comidas={comidas}
            onComidas={setComidas}
          />
        ) : null}

        <View style={styles.racion}>
          <Text style={styles.racionTitulo}>Ración recomendada</Text>
          <Text style={styles.racionTexto}>
            {Math.round(mascota.gramosPorDiaRecomendados)} g al día · {Math.round(mascota.gramosPorComida)} g por comida
            {mascota.ajustePorcentaje ? ` · ajuste ${mascota.ajustePorcentaje > 0 ? '+' : ''}${mascota.ajustePorcentaje.toFixed(0)} %` : ''}
          </Text>
        </View>

        <View style={styles.acciones}>
          <TextoError mensaje={error} />
          {esDueno && cambios ? <Boton titulo="Guardar cambios" onPress={guardar} cargando={guardando} style={styles.boton} /> : null}
          {esDueno ? (
            <Pressable onPress={darDeBaja} style={styles.baja} accessibilityRole="button">
              <Text style={styles.bajaTexto}>Dar de baja</Text>
            </Pressable>
          ) : null}
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fotoZona: { alignItems: 'center', paddingVertical: 26, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  marco: { width: 200, height: 200, borderRadius: 30, backgroundColor: colors.homeCard, padding: 10 },
  foto: { flex: 1, borderRadius: 22, backgroundColor: colors.white, overflow: 'hidden' },
  sinFoto: { alignItems: 'center', justifyContent: 'center', gap: 6 },
  sinFotoTexto: { fontFamily: fonts.medium, fontSize: 13, color: colors.subtle },
  dato: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 82,
    paddingHorizontal: 38,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    gap: 16,
  },
  datoEtiqueta: { width: 96, fontFamily: fonts.bold, fontSize: 20, color: colors.black },
  datoValor: { flex: 1, fontFamily: fonts.regular, fontSize: 20, color: colors.black },
  racion: { paddingHorizontal: 26, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: colors.borderSoft, gap: 4 },
  racionTitulo: { fontFamily: fonts.semibold, fontSize: 13, color: colors.black },
  racionTexto: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  acciones: { paddingHorizontal: 16, paddingTop: 20, gap: 12 },
  boton: { height: 52, borderRadius: 10 },
  baja: { alignItems: 'center', paddingVertical: 10 },
  bajaTexto: { fontFamily: fonts.medium, fontSize: 14, color: colors.danger },
});
