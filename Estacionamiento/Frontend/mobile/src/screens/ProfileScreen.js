import { View, Text, ScrollView, Pressable, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Cargando } from '../components/EstadoCarga';
import { auth, historial } from '../api';
import { useCarga } from '../hooks/useCarga';
import { hora, horasMinutos, mesCorto, cajonCorto } from '../utils/formato';
import { colors, radius } from '../theme';

/** usuario: el UsuarioDto que llegó en el login ({ id, nombre, correo, rol, placas }). */
export default function ProfileScreen({ usuario, onLogout, onOpenSlot }) {
  // Se vuelve a pedir para tener las placas al día (el admin pudo ligar una después del login).
  const yo = useCarga(() => auth.yo(), []);
  const actual = useCarga(() => historial.actual(), []);
  const resumen = useCarga(() => historial.resumen(), []);

  const datos = yo.datos ?? usuario;
  const acceso = actual.datos; // AccesoActualDto o null si no tiene auto dentro
  const initial = datos.nombre.charAt(0).toUpperCase();

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Mi perfil</Text>

      {/* Tarjeta de usuario */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{datos.nombre}</Text>
          <Text style={styles.userEmail}>{datos.correo}</Text>
        </View>
        <View style={styles.roleChip}>
          <Text style={styles.roleText}>{datos.rol}</Text>
        </View>
      </View>

      {/* Mis vehículos */}
      <Text style={styles.section}>{datos.placas.length > 1 ? 'Mis vehículos' : 'Mi vehículo'}</Text>
      {yo.cargando && !yo.datos ? (
        <Cargando />
      ) : datos.placas.length === 0 ? (
        <SinVehiculo correo={datos.correo} />
      ) : (
        datos.placas.map((placa) => {
          const dentro = acceso?.placa === placa;
          const estacionado = dentro && acceso.cajon !== null;
          return (
            <Pressable
              key={placa}
              style={styles.card}
              onPress={estacionado ? () => onOpenSlot?.(acceso.cajon) : undefined}
            >
              <View style={styles.vehicleRow}>
                <View style={[styles.vehicleIcon, dentro && styles.vehicleIconInside]}>
                  <Ionicons name="car-outline" size={22} color={colors.green900} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.plate}>{placa}</Text>
                  <Text style={styles.meta}>
                    {!dentro
                      ? 'Fuera'
                      : estacionado
                        ? `Dentro · Cajón ${acceso.cajon} desde ${hora(acceso.horaEntrada)}`
                        : `Dentro desde ${hora(acceso.horaEntrada)} · aún sin cajón`}
                  </Text>
                </View>
                {estacionado && <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />}
              </View>
            </Pressable>
          );
        })
      )}

      {/* Resumen del mes */}
      {resumen.datos && (
        <View style={styles.statsRow}>
          <Stat value={resumen.datos.visitas} label={`visitas en ${mesCorto(resumen.datos.mes)}`} />
          <Stat value={horasMinutos(resumen.datos.minutosPromedio)} label="h promedio" />
          <Stat value={cajonCorto(resumen.datos.cajonFrecuente)} label="cajón frecuente" />
        </View>
      )}

      {/* Notificaciones: planeadas (necesitan notificaciones push en el back). */}
      <Text style={styles.section}>Notificaciones · Próximamente</Text>
      <View style={[styles.list, styles.disabled]}>
        <SettingRow
          icon="notifications-outline"
          title="Lugar libre"
          subtitle="Avisarme cuando se libere un cajón"
        />
        <SettingRow
          icon="exit-outline"
          title="Salida registrada"
          subtitle="Avisarme cuando la cámara lea mi placa al salir"
          last
        />
      </View>

      {/* Cerrar sesión */}
      <Pressable style={styles.logout} onPress={onLogout}>
        <Ionicons name="log-out-outline" size={18} color={colors.red} />
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}

function Stat({ value, label }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/** Sin placas ligadas: el admin tiene que dar de alta el vehículo con el correo de esta cuenta. */
function SinVehiculo({ correo }) {
  return (
    <View style={[styles.card, styles.emptyCard]}>
      <Ionicons name="car-outline" size={28} color={colors.inkSoft} />
      <Text style={styles.emptyTitle}>Aún no tienes vehículo registrado</Text>
      <Text style={styles.emptyText}>
        Pídele al administrador que dé de alta tu placa con el correo {correo}. Así verás dónde está
        tu auto y tu historial.
      </Text>
    </View>
  );
}

// Los switches quedan apagados hasta que existan las notificaciones push.
function SettingRow({ icon, title, subtitle, last }) {
  return (
    <View style={[styles.settingRow, !last && styles.rowBorder]}>
      <View style={styles.settingIcon}>
        <Ionicons name={icon} size={18} color={colors.green900} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.meta}>{subtitle}</Text>
      </View>
      <Switch
        value={false}
        disabled
        trackColor={{ false: colors.border, true: colors.green700 }}
        thumbColor="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 60, gap: 14 },
  title: { fontSize: 26, fontWeight: '800', color: colors.ink },
  section: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.inkSoft,
    marginTop: 4,
  },

  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.green900,
    borderRadius: radius.lg,
    padding: 18,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.green700,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '800', color: colors.green900 },
  userName: { fontSize: 18, fontWeight: '800', color: '#fff' },
  userEmail: { fontSize: 12, color: colors.green100, marginTop: 2 },
  roleChip: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vehicleIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.green50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleIconInside: { backgroundColor: colors.green700 },
  plate: { fontSize: 16, fontWeight: '800', letterSpacing: 0.5, color: colors.ink },
  meta: { fontSize: 12, color: colors.inkSoft, marginTop: 2 },
  emptyCard: { alignItems: 'center', gap: 8, padding: 20 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: 'center', color: colors.inkSoft },
  disabled: { opacity: 0.55 },

  statsRow: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.ink },
  statLabel: { fontSize: 11, color: colors.inkSoft, marginTop: 2 },

  list: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.green50 },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.green50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTitle: { fontSize: 14, fontWeight: '700', color: colors.ink },

  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.red,
    backgroundColor: colors.surface,
  },
  logoutText: { fontSize: 15, fontWeight: '800', color: colors.red },
});
