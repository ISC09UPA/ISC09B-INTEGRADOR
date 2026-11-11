import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme';

import { Logo, MarcaCirculo } from './Brand';
import { Boton, LogoGoogle } from './Buttons';
import { Screen } from './Screen';
import { TextoError } from './Ui';

/** Estructura compartida por Log in y Sign in (mismo mockup, distintos campos). */
export function AuthForm({
  titulo,
  subtitulo,
  campos,
  enlace,
  onContinuar,
  cargando,
  error,
  aviso,
  onGoogle,
}: {
  titulo: string;
  subtitulo: string;
  campos: ReactNode;
  enlace: ReactNode;
  onContinuar: () => void;
  cargando: boolean;
  error?: string | null;
  aviso?: string | null;
  onGoogle: () => void;
}) {
  return (
    <KeyboardAvoidingView style={styles.raiz} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contenido={styles.contenido}>
        <View style={styles.cabecera}>
          <MarcaCirculo size={168} />
          <Logo size={26} style={styles.logo} />
          <Text style={styles.titulo}>{titulo}</Text>
          <Text style={styles.subtitulo}>{subtitulo}</Text>
        </View>

        <View style={styles.campos}>{campos}</View>
        <View style={styles.enlace}>{enlace}</View>

        <TextoError mensaje={error} />
        <Boton titulo="Continuar" onPress={onContinuar} cargando={cargando} style={styles.continuar} />

        <View style={styles.separador}>
          <View style={styles.linea} />
          <Text style={styles.o}>o</Text>
          <View style={styles.linea} />
        </View>

        <Boton
          titulo="Continuar con Google"
          variante="gris"
          onPress={onGoogle}
          icono={<LogoGoogle size={20} />}
          texto={styles.google}
        />
        {aviso ? <Text style={styles.aviso}>{aviso}</Text> : null}

        <Text style={styles.terminos}>
          Al hacer clic en continuar, aceptas nuestros <Text style={styles.terminosNegro}>Términos de servicio</Text> y{' '}
          <Text style={styles.terminosNegro}>Política de privacidad</Text>
        </Text>
      </Screen>
    </KeyboardAvoidingView>
  );
}

export const authStyles = StyleSheet.create({
  enlaceTexto: { fontFamily: fonts.regular, fontSize: 12, color: colors.black },
  enlaceAzul: { color: colors.link },
});

const styles = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colors.white },
  contenido: { paddingHorizontal: 24, paddingTop: 4, paddingBottom: 32, maxWidth: 480, width: '100%', alignSelf: 'center' },
  cabecera: { alignItems: 'center' },
  logo: { marginTop: 8 },
  titulo: { fontFamily: fonts.semibold, fontSize: 16, color: colors.black, marginTop: 6, textAlign: 'center' },
  subtitulo: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.black,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 230,
  },
  campos: { gap: 16, marginTop: 14 },
  enlace: { marginTop: 16, marginBottom: 6 },
  continuar: { marginTop: 18 },
  separador: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 18 },
  linea: { flex: 1, height: 1, backgroundColor: colors.borderSoft },
  o: { fontFamily: fonts.regular, fontSize: 14, color: colors.subtle },
  google: { color: colors.black },
  aviso: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 8 },
  terminos: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.subtle,
    textAlign: 'center',
    marginTop: 18,
  },
  terminosNegro: { color: colors.black },
});
