import { useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, ActivityIndicator, StyleSheet } from 'react-native';
import { MensajeError } from './EstadoCarga';
import { colors, radius } from '../theme';

// Igual que Placa.LongitudMinima del back (se cuentan solo letras y números).
const MIN_CARACTERES = 5;

/**
 * Modal para escribir o corregir una placa. Lo usan Vehículos, Alertas y Escáner.
 * onGuardar(placa) puede ser async: si lanza un error, su mensaje se muestra en el modal.
 */
export default function PlacaModal({ visible, titulo = 'Corregir placa', inicial = '', onCancel, onGuardar }) {
  const [placa, setPlaca] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  const valida = placa.replace(/[^A-Z0-9]/gi, '').length >= MIN_CARACTERES;

  const guardar = async () => {
    if (!valida || guardando) return;
    setGuardando(true);
    setError(null);
    try {
      await onGuardar(placa.trim());
    } catch (err) {
      setError(err.message); // 400 placa inválida, 409 placa de otro vehículo
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onShow={() => {
        setPlaca(inicial);
        setError(null);
      }}
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{titulo}</Text>
          <Text style={styles.fieldLabel}>Placa</Text>
          <TextInput
            style={styles.input}
            placeholder="ABC-123-A"
            placeholderTextColor={colors.inkSoft}
            autoCapitalize="characters"
            autoCorrect={false}
            value={placa}
            onChangeText={(t) => setPlaca(t.toUpperCase())}
          />
          <MensajeError mensaje={error} />
          <View style={styles.sheetActions}>
            <Pressable style={styles.action} onPress={onCancel}>
              <Text style={styles.actionText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[styles.action, styles.actionDark, (!valida || guardando) && { opacity: 0.4 }]}
              disabled={!valida || guardando}
              onPress={guardar}
            >
              {guardando ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={[styles.actionText, styles.actionTextDark]}>Guardar</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl - 8,
    padding: 20,
    gap: 10,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.ink, marginBottom: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: colors.inkSoft },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    letterSpacing: 1,
    color: colors.ink,
  },
  sheetActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  action: {
    minWidth: 76,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  actionDark: { backgroundColor: colors.green900, borderColor: colors.green900 },
  actionText: { fontSize: 12, fontWeight: '800', color: colors.ink },
  actionTextDark: { color: '#fff' },
});
