import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { colors, fonts } from '@/theme';

interface CampoProps extends TextInputProps {
  error?: string;
  contenedor?: StyleProp<ViewStyle>;
}

/** Campo de texto de los mockups: borde gris claro, radio 8, placeholder #828282. */
export function Campo({ error, contenedor, style, ...props }: CampoProps) {
  const [foco, setFoco] = useState(false);
  return (
    <View style={contenedor}>
      <TextInput
        placeholderTextColor={colors.placeholder}
        {...props}
        onFocus={(e) => {
          setFoco(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFoco(false);
          props.onBlur?.(e);
        }}
        style={[styles.campo, foco && styles.foco, !!error && styles.conError, style]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export interface Opcion<T extends string> {
  valor: T;
  etiqueta: string;
}

/** Selector desplegable con el mismo estilo que el campo (Especie, Raza). */
export function Selector<T extends string>({
  valor,
  opciones,
  placeholder,
  onCambio,
  titulo,
  contenedor,
  error,
}: {
  valor: T | null;
  opciones: Opcion<T>[];
  placeholder: string;
  onCambio: (v: T) => void;
  titulo: string;
  contenedor?: StyleProp<ViewStyle>;
  error?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const elegido = opciones.find((o) => o.valor === valor);

  return (
    <View style={contenedor}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={titulo}
        onPress={() => setAbierto(true)}
        style={[styles.campo, styles.selector, !!error && styles.conError]}>
        <Text numberOfLines={1} style={[styles.selectorTexto, !elegido && { color: colors.placeholder }]}>
          {elegido?.etiqueta ?? placeholder}
        </Text>
        <Feather name="chevron-down" size={22} color={colors.subtle} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={abierto} transparent animationType="fade" onRequestClose={() => setAbierto(false)}>
        <Pressable style={styles.velo} onPress={() => setAbierto(false)}>
          <Pressable style={styles.hoja}>
            <Text style={styles.hojaTitulo}>{titulo}</Text>
            <FlatList
              data={opciones}
              keyExtractor={(o) => o.valor}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onCambio(item.valor);
                    setAbierto(false);
                  }}
                  style={({ pressed }) => [styles.opcion, pressed && { backgroundColor: colors.surfaceAlt }]}>
                  <Text style={styles.opcionTexto}>{item.etiqueta}</Text>
                  {item.valor === valor ? <Feather name="check" size={18} color={colors.text} /> : null}
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  campo: {
    height: 40,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.black,
  },
  foco: { borderColor: colors.subtle },
  conError: { borderColor: colors.danger },
  error: { color: colors.danger, fontFamily: fonts.regular, fontSize: 12, marginTop: 4 },
  selector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectorTexto: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.black },
  velo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  hoja: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: '70%',
  },
  hojaTitulo: { fontFamily: fonts.semibold, fontSize: 16, paddingHorizontal: 20, marginBottom: 8, color: colors.black },
  opcion: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSoft,
  },
  opcionTexto: { fontFamily: fonts.regular, fontSize: 15, color: colors.black },
});
