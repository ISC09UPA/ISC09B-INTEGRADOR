import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { alimentadoresApi, gatewaysApi } from '@/api/endpoints';
import type { GatewayClaveResponse, GatewayDto, MiembroDto, RolAlimentador } from '@/api/types';
import { Boton } from '@/components/Buttons';
import { CabeceraTitulo } from '@/components/Headers';
import { Campo, Selector } from '@/components/Inputs';
import { Screen } from '@/components/Screen';
import { TextoError } from '@/components/Ui';
import { useAlimentador } from '@/context/AlimentadorContext';
import { useAuth } from '@/context/AuthContext';
import { colors, fonts } from '@/theme';

const ROLES: { valor: RolAlimentador; etiqueta: string }[] = [
  { valor: 'Dueno', etiqueta: 'Dueño · configura todo' },
  { valor: 'Cuidador', etiqueta: 'Cuidador · consulta y dispensa' },
];

/**
 * Ajustes (engrane de inicio): alimentadores, alta de Raspberry Pi y alimentador, miembros y cerrar sesión.
 * GET/POST /api/gateways, GET/POST /api/alimentadores, GET/POST/DELETE /api/alimentadores/{id}/miembros, POST /api/auth/logout.
 */
export default function SettingsScreen() {
  const { usuario, cerrarSesion } = useAuth();
  const { alimentadores, alimentador, esDueno, seleccionarAlimentador, recargarAlimentadores } = useAlimentador();

  const [gateways, setGateways] = useState<GatewayDto[]>([]);
  const [formulario, setFormulario] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [clave, setClave] = useState<GatewayClaveResponse | null>(null);
  const [gatewayElegido, setGatewayElegido] = useState<string | null>(null);
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [kcal, setKcal] = useState('3.6');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [miembros, setMiembros] = useState<MiembroDto[]>([]);
  const [emailMiembro, setEmailMiembro] = useState('');
  const [rolMiembro, setRolMiembro] = useState<RolAlimentador>('Cuidador');
  const [errorMiembro, setErrorMiembro] = useState<string | null>(null);

  const cargarGateways = useCallback(() => gatewaysApi.listar().then(setGateways).catch(() => undefined), []);

  useEffect(() => {
    cargarGateways();
  }, [cargarGateways]);

  useEffect(() => {
    if (!alimentador) return;
    alimentadoresApi.miembros(alimentador.id).then(setMiembros).catch(() => setMiembros([]));
  }, [alimentador]);

  useEffect(() => {
    if (!alimentadores.length) setFormulario(true);
  }, [alimentadores.length]);

  const registrarGateway = async () => {
    setError(null);
    if (!/^[a-zA-Z0-9_-]+$/.test(deviceId.trim())) return setError('El ID solo admite letras, números, guion y guion bajo.');
    setGuardando(true);
    try {
      const r = await gatewaysApi.crear(deviceId.trim());
      setClave(r);
      setGatewayElegido(r.deviceId);
      await cargarGateways();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  };

  const crearAlimentador = async () => {
    setError(null);
    const k = Number(kcal.replace(',', '.'));
    if (!/^[a-zA-Z0-9_-]+$/.test(codigo.trim())) return setError('El código del ESP32 solo admite letras, números, guion y guion bajo.');
    if (!nombre.trim()) return setError('Escribe un nombre para el dispensador.');
    if (!(k >= 1 && k <= 6)) return setError('Las kcal por gramo deben estar entre 1 y 6.');
    setGuardando(true);
    try {
      const creado = await alimentadoresApi.crear({
        codigo: codigo.trim(),
        nombre: nombre.trim(),
        kcalPorGramo: k,
        gatewayDeviceId: gatewayElegido,
        zonaHoraria: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
      });
      await recargarAlimentadores();
      seleccionarAlimentador(creado.id);
      setFormulario(false);
      setCodigo('');
      setNombre('');
      setClave(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  };

  const agregarMiembro = async () => {
    if (!alimentador) return;
    setErrorMiembro(null);
    try {
      const m = await alimentadoresApi.agregarMiembro(alimentador.id, { email: emailMiembro.trim(), rol: rolMiembro });
      setMiembros((l) => [...l, m]);
      setEmailMiembro('');
    } catch (e) {
      setErrorMiembro((e as Error).message);
    }
  };

  const quitarMiembro = async (m: MiembroDto) => {
    if (!alimentador) return;
    try {
      await alimentadoresApi.quitarMiembro(alimentador.id, m.usuarioId);
      setMiembros((l) => l.filter((x) => x.usuarioId !== m.usuarioId));
    } catch (e) {
      setErrorMiembro((e as Error).message);
    }
  };

  return (
    <Screen fondo={colors.bg} contenido={styles.contenido}>
      <CabeceraTitulo titulo="Ajustes" />

      <View style={styles.bloque}>
        <Text style={styles.etiqueta}>Sesión</Text>
        <View style={styles.tarjeta}>
          <Text style={styles.nombre}>{usuario?.nombre}</Text>
          <Pressable onPress={cerrarSesion} style={styles.salir} accessibilityRole="button">
            <Feather name="log-out" size={18} color={colors.danger} />
            <Text style={styles.salirTexto}>Cerrar sesión</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.bloque}>
        <Text style={styles.etiqueta}>Mis dispensadores</Text>
        {alimentadores.length ? (
          <View style={styles.tarjeta}>
            {alimentadores.map((a, i) => (
              <Pressable
                key={a.id}
                onPress={() => seleccionarAlimentador(a.id)}
                style={[styles.fila, i === alimentadores.length - 1 && { borderBottomWidth: 0 }]}
                accessibilityRole="button">
                <View style={{ flex: 1 }}>
                  <Text style={styles.filaTitulo}>{a.nombre}</Text>
                  <Text style={styles.filaSub}>
                    {a.codigo} · {a.miRol === 'Dueno' ? 'Dueño' : 'Cuidador'} · {a.estado.enLinea ? 'en línea' : 'sin conexión'}
                  </Text>
                </View>
                {a.id === alimentador?.id ? <Feather name="check" size={20} color={colors.text} /> : null}
              </Pressable>
            ))}
          </View>
        ) : null}
        {!formulario ? (
          <Pressable onPress={() => setFormulario(true)} style={styles.agregar} accessibilityRole="button">
            <Feather name="plus" size={20} color={colors.text} />
            <Text style={styles.agregarTexto}>Agregar dispensador</Text>
          </Pressable>
        ) : (
          <View style={[styles.tarjeta, styles.formulario]}>
            <Text style={styles.paso}>1. Raspberry Pi (gateway)</Text>
            {gateways.length ? (
              <Selector
                titulo="Raspberry Pi"
                placeholder="Elige una Raspberry Pi"
                valor={gatewayElegido}
                opciones={gateways.map((g) => ({ valor: g.deviceId, etiqueta: g.deviceId }))}
                onCambio={setGatewayElegido}
              />
            ) : null}
            <View style={styles.filaCampos}>
              <Campo contenedor={{ flex: 1 }} placeholder="ID nuevo, p. ej. pi-casa" value={deviceId} onChangeText={setDeviceId} autoCapitalize="none" />
              <Boton titulo="Registrar" onPress={registrarGateway} deshabilitado={!deviceId.trim() || guardando} />
            </View>
            {clave ? (
              <View style={styles.clave}>
                <Text style={styles.claveTitulo}>Clave de {clave.deviceId} (solo se muestra esta vez)</Text>
                <Text selectable style={styles.claveValor}>
                  {clave.clave}
                </Text>
                <Text style={styles.filaSub}>Cópiala en la configuración de la Raspberry Pi (X-Device-Key).</Text>
              </View>
            ) : null}

            <Text style={styles.paso}>2. Dispensador (ESP32)</Text>
            <Campo placeholder="Código del ESP32, p. ej. feeder01" value={codigo} onChangeText={setCodigo} autoCapitalize="none" />
            <Campo placeholder="Nombre, p. ej. Cocina" value={nombre} onChangeText={setNombre} />
            <Campo placeholder="Kcal por gramo del alimento" value={kcal} onChangeText={setKcal} keyboardType="decimal-pad" />
            <TextoError mensaje={error} />
            <Boton titulo="Crear dispensador" onPress={crearAlimentador} cargando={guardando} />
            {alimentadores.length ? (
              <Pressable onPress={() => setFormulario(false)} style={styles.cancelar}>
                <Text style={styles.filaSub}>Cancelar</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>

      {alimentador && esDueno ? (
        <View style={styles.bloque}>
          <Text style={styles.etiqueta}>Personas con acceso a {alimentador.nombre}</Text>
          <View style={styles.tarjeta}>
            {miembros.map((m) => (
              <View key={m.usuarioId} style={styles.fila}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.filaTitulo}>{m.nombre}</Text>
                  <Text style={styles.filaSub}>
                    {m.email} · {m.rol === 'Dueno' ? 'Dueño' : 'Cuidador'}
                  </Text>
                </View>
                {m.usuarioId !== usuario?.id ? (
                  <Pressable onPress={() => quitarMiembro(m)} hitSlop={8} accessibilityLabel={`Quitar a ${m.nombre}`}>
                    <Feather name="x" size={18} color={colors.muted} />
                  </Pressable>
                ) : null}
              </View>
            ))}
            <View style={[styles.formulario, { paddingTop: 12 }]}>
              <Campo placeholder="correo@dominio.com" value={emailMiembro} onChangeText={setEmailMiembro} autoCapitalize="none" keyboardType="email-address" />
              <Selector titulo="Rol" placeholder="Rol" valor={rolMiembro} opciones={ROLES} onCambio={setRolMiembro} />
              <TextoError mensaje={errorMiembro} />
              <Boton titulo="Invitar" onPress={agregarMiembro} deshabilitado={!emailMiembro.trim()} />
            </View>
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  contenido: { paddingBottom: 32 },
  bloque: { paddingHorizontal: 20, marginBottom: 20 },
  etiqueta: { fontFamily: fonts.jakartaBold, fontSize: 15, color: colors.text, marginBottom: 8 },
  tarjeta: { backgroundColor: colors.white, borderRadius: 20, borderWidth: 1, borderColor: colors.borderSoft, padding: 16 },
  nombre: { fontFamily: fonts.jakartaBold, fontSize: 17, color: colors.text },
  salir: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  salirTexto: { fontFamily: fonts.jakartaSemibold, fontSize: 14, color: colors.danger },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  filaTitulo: { fontFamily: fonts.jakartaSemibold, fontSize: 15, color: colors.text },
  filaSub: { fontFamily: fonts.jakarta, fontSize: 12, color: colors.muted, marginTop: 1 },
  agregar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#A6A6A6',
    marginTop: 10,
  },
  agregarTexto: { fontFamily: fonts.jakartaSemibold, fontSize: 15, color: colors.text },
  formulario: { gap: 10, marginTop: 10 },
  paso: { fontFamily: fonts.jakartaBold, fontSize: 14, color: colors.text, marginTop: 4 },
  filaCampos: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  clave: { backgroundColor: colors.surfaceAlt, borderRadius: 12, padding: 12, gap: 4 },
  claveTitulo: { fontFamily: fonts.jakartaSemibold, fontSize: 12, color: colors.text },
  claveValor: { fontFamily: fonts.medium, fontSize: 13, color: colors.black },
  cancelar: { alignItems: 'center', paddingVertical: 6 },
});
