import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { mascotasApi } from '@/api/endpoints';
import type { Especie, NivelActividad } from '@/api/types';
import { Boton } from '@/components/Buttons';
import { CabeceraCentrada } from '@/components/Headers';
import { Campo, Selector } from '@/components/Inputs';
import { CamposRacion, FilaFormulario, FilaPesoEdad, SubirFoto } from '@/components/PetForm';
import { Screen } from '@/components/Screen';
import { Aviso, TextoError } from '@/components/Ui';
import { useAlimentador } from '@/context/AlimentadorContext';
import { RAZAS } from '@/data/razas';
import { colors } from '@/theme';

const ESPECIES: { valor: Especie; etiqueta: string }[] = [
  { valor: 'Perro', etiqueta: 'Perro' },
  { valor: 'Gato', etiqueta: 'Gato' },
];

function numero(texto: string): number {
  return Number(texto.replace(',', '.').trim());
}

/** Mockup "Pet Register": POST /api/alimentadores/{id}/mascotas. */
export default function PetRegister() {
  const { alimentador, mascotas, esDueno, recargarMascotas, seleccionarMascota, guardarExtrasMascota } = useAlimentador();

  const [nombre, setNombre] = useState('');
  const [especie, setEspecie] = useState<Especie | null>(null);
  const [raza, setRaza] = useState<string | null>(null);
  const [peso, setPeso] = useState('');
  const [edad, setEdad] = useState('');
  const [actividad, setActividad] = useState<NivelActividad>('Moderado');
  const [esterilizado, setEsterilizado] = useState(false);
  const [comidas, setComidas] = useState(2);
  const [foto, setFoto] = useState<string | null>(null);

  const [errores, setErrores] = useState<Record<string, string | undefined>>({});
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const registrar = async () => {
    if (!alimentador) return;
    const pesoKg = numero(peso);
    const anios = numero(edad);
    const nuevos: Record<string, string | undefined> = {
      nombre: nombre.trim() ? undefined : 'Escribe su nombre.',
      especie: especie ? undefined : 'Elige perro o gato.',
      peso: pesoKg > 0 && pesoKg <= 100 ? undefined : '0.1 a 100 kg',
      edad: edad.trim() && anios >= 0 && anios <= 25 ? undefined : '0 a 25 años',
    };
    setErrores(nuevos);
    if (Object.values(nuevos).some(Boolean) || !especie) return;

    setGuardando(true);
    setError(null);
    try {
      const creada = await mascotasApi.crear(alimentador.id, {
        nombre: nombre.trim(),
        especie,
        pesoKg,
        edadMeses: Math.round(anios * 12),
        nivelActividad: actividad,
        esterilizado,
        comidasPorDia: comidas,
        etiquetaRfid: null,
      });
      await guardarExtrasMascota(creada.id, { raza: raza ?? undefined, fotoUri: foto ?? undefined });
      await recargarMascotas();
      seleccionarMascota(creada.id);
      router.replace(`/mascota/${creada.id}`);
    } catch (e) {
      const err = e as ApiError;
      if (err instanceof ApiError && err.problema?.errors) {
        setErrores({ nombre: err.campo('Nombre'), peso: err.campo('PesoKg'), edad: err.campo('EdadMeses') });
      }
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const bloqueado = !alimentador || !esDueno || mascotas.length >= 3;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        contenido={styles.contenido}
        pie={
          bloqueado ? null : (
            <View style={styles.pie}>
              <TextoError mensaje={error} />
              <Boton titulo="¡Registrar mascota!" onPress={registrar} cargando={guardando} style={styles.registrar} texto={styles.registrarTexto} />
            </View>
          )
        }>
        <CabeceraCentrada titulo="Registro de mascotas" />

        {bloqueado ? (
          <Aviso
            icono="alert-circle"
            titulo={!alimentador ? 'Primero configura tu alimentador' : !esDueno ? 'Solo el dueño puede registrar mascotas' : 'Ya tienes 3 mascotas'}
            texto={mascotas.length >= 3 ? 'El alimentador admite un máximo de 3 mascotas.' : undefined}
          />
        ) : (
          <>
            <FilaFormulario etiqueta="Nombre">
              <Campo placeholder="Greta... Chacho..." value={nombre} onChangeText={setNombre} error={errores.nombre} accessibilityLabel="Nombre" />
            </FilaFormulario>
            <FilaFormulario etiqueta="Especie">
              <Selector
                titulo="Especie"
                placeholder="Perro... Gato..."
                valor={especie}
                opciones={ESPECIES}
                error={errores.especie}
                onCambio={(v) => {
                  setEspecie(v);
                  setRaza(null);
                }}
              />
            </FilaFormulario>
            <FilaFormulario etiqueta="Raza">
              <Selector
                titulo="Raza"
                placeholder="Chihuahua... Gato persa..."
                valor={raza}
                opciones={(especie ? RAZAS[especie] : [...RAZAS.Perro, ...RAZAS.Gato.slice(1)]).map((r) => ({ valor: r, etiqueta: r }))}
                onCambio={setRaza}
              />
            </FilaFormulario>
            <FilaPesoEdad peso={peso} edad={edad} onPeso={setPeso} onEdad={setEdad} errorPeso={errores.peso} errorEdad={errores.edad} />
            <CamposRacion
              actividad={actividad}
              onActividad={setActividad}
              esterilizado={esterilizado}
              onEsterilizado={setEsterilizado}
              comidas={comidas}
              onComidas={setComidas}
            />
            <SubirFoto uri={foto} onCambio={setFoto} />
          </>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  contenido: { paddingBottom: 16 },
  pie: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    backgroundColor: colors.white,
    gap: 4,
  },
  registrar: { height: 52, borderRadius: 10 },
  registrarTexto: { fontSize: 16 },
});
