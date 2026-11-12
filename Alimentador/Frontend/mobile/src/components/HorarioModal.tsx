import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import type { MascotaDto } from '@/api/types';
import { colors, fonts } from '@/theme';

import { BotonCircular } from './Buttons';
import { TextoError } from './Ui';

/** Hoja para agregar un horario: hora, minutos, a. m./p. m. y a qué mascota aplica. */
export function HorarioModal({
  visible,
  mascotas,
  mascotaInicial,
  onCerrar,
  onGuardar,
}: {
  visible: boolean;
  mascotas: MascotaDto[];
  mascotaInicial: number | null;
  onCerrar: () => void;
  onGuardar: (horas: number, minutos: number, mascotaId: number | null) => Promise<void>;
}) {
  const [hora, setHora] = useState(8);
  const [minutos, setMinutos] = useState(0);
  const [pm, setPm] = useState(false);
  const [mascotaId, setMascotaId] = useState<number | null>(mascotaInicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      const h24 = (hora % 12) + (pm ? 12 : 0);
      await onGuardar(h24, minutos, mascotaId);
      onCerrar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  };

  const opciones: { id: number | null; nombre: string }[] = [
    { id: null, nombre: 'Todas' },
    ...mascotas.map((m) => ({ id: m.id, nombre: m.nombre })),
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar}>
      <Pressable style={styles.velo} onPress={onCerrar}>
        <Pressable style={styles.hoja}>
          <Text style={styles.titulo}>Agregar comida</Text>

          <View style={styles.reloj}>
            <View style={styles.columna}>
              <BotonCircular icono="plus" etiqueta="Más horas" size={44} onPress={() => setHora((h) => (h % 12) + 1)} />
              <Text style={styles.numero}>{hora}</Text>
              <BotonCircular icono="minus" etiqueta="Menos horas" size={44} onPress={() => setHora((h) => (h <= 1 ? 12 : h - 1))} />
            </View>
            <Text style={styles.dosPuntos}>:</Text>
            <View style={styles.columna}>
              <BotonCircular icono="plus" etiqueta="Más minutos" size={44} onPress={() => setMinutos((m) => (m + 5) % 60)} />
              <Text style={styles.numero}>{String(minutos).padStart(2, '0')}</Text>
              <BotonCircular icono="minus" etiqueta="Menos minutos" size={44} onPress={() => setMinutos((m) => (m + 55) % 60)} />
            </View>
            <View style={styles.ampm}>
              {[false, true].map((valor) => (
                <Pressable
                  key={String(valor)}
                  onPress={() => setPm(valor)}
                  style={[styles.chip, pm === valor && styles.chipActivo]}
                  accessibilityRole="button">
                  <Text style={[styles.chipTexto, pm === valor && { color: colors.white }]}>{valor ? 'p. m.' : 'a. m.'}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {mascotas.length > 1 ? (
            <>
              <Text style={styles.subtitulo}>¿Para quién?</Text>
              <View style={styles.mascotas}>
                {opciones.map((o) => (
                  <Pressable
                    key={String(o.id)}
                    onPress={() => setMascotaId(o.id)}
                    style={[styles.chip, mascotaId === o.id && styles.chipActivo]}
                    accessibilityRole="button">
                    <Text style={[styles.chipTexto, mascotaId === o.id && { color: colors.white }]}>{o.nombre}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          <TextoError mensaje={error} />
          <Pressable onPress={guardar} disabled={guardando} style={[styles.guardar, guardando && { opacity: 0.6 }]} accessibilityRole="button">
            <Text style={styles.guardarTexto}>{guardando ? 'Guardando…' : 'Agregar'}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  velo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  hoja: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    gap: 14,
  },
  titulo: { fontFamily: fonts.jakartaBold, fontSize: 18, color: colors.text },
  reloj: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  columna: { alignItems: 'center', gap: 8 },
  numero: { fontFamily: fonts.jakartaBold, fontSize: 40, color: colors.text, minWidth: 64, textAlign: 'center' },
  dosPuntos: { fontFamily: fonts.jakartaBold, fontSize: 40, color: colors.text },
  ampm: { gap: 8, marginLeft: 8 },
  subtitulo: { fontFamily: fonts.jakartaSemibold, fontSize: 14, color: colors.muted },
  mascotas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActivo: { backgroundColor: colors.camButton, borderColor: colors.camButton },
  chipTexto: { fontFamily: fonts.jakartaSemibold, fontSize: 14, color: colors.text },
  guardar: { backgroundColor: colors.primary, borderRadius: 20, height: 52, alignItems: 'center', justifyContent: 'center' },
  guardarTexto: { fontFamily: fonts.jakartaBold, fontSize: 16, color: colors.white },
});
