import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MY_PARKING } from '../data/mock';
import { HISTORY_STATS } from '../data/history';
import { colors, radius } from '../theme';

export default function ProfileScreen({ name = 'Usuario', email, onLogout, onOpenSlot }) {
  // Preferencias locales. Después se guardan en la API.
  const [notifyFree, setNotifyFree] = useState(true);
  const [notifyExit, setNotifyExit] = useState(true);

  const inside = MY_PARKING.exitTime === null;
  const initial = name.charAt(0).toUpperCase();

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Mi perfil</Text>

      {/* Tarjeta de usuario */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{name}</Text>
          {email ? <Text style={styles.userEmail}>{email}</Text> : null}
        </View>
        <View style={styles.roleChip}>
          <Text style={styles.roleText}>Usuario</Text>
        </View>
      </View>

      {/* Mi vehículo */}
      <Text style={styles.section}>Mi vehículo</Text>
      <Pressable
        style={styles.card}
        onPress={inside ? () => onOpenSlot?.(MY_PARKING.slot) : undefined}
      >
        <View style={styles.vehicleRow}>
          <View style={[styles.vehicleIcon, inside && styles.vehicleIconInside]}>
            <Ionicons name="car-outline" size={22} color={colors.green900} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.plate}>{MY_PARKING.plate}</Text>
            <Text style={styles.meta}>
              {MY_PARKING.vehicle} ·{' '}
              {inside
                ? `Dentro · Cajón ${MY_PARKING.slot} desde ${MY_PARKING.entryTime}`
                : 'Fuera'}
            </Text>
          </View>
          {inside && <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />}
        </View>
      </Pressable>

      {/* Resumen del mes */}
      <View style={styles.statsRow}>
        <Stat value={HISTORY_STATS.visits} label={`visitas en ${HISTORY_STATS.month}`} />
        <Stat value={HISTORY_STATS.avgTime} label="h promedio" />
        <Stat value={HISTORY_STATS.favoriteSlot} label="cajón frecuente" />
      </View>

      {/* Notificaciones */}
      <Text style={styles.section}>Notificaciones</Text>
      <View style={styles.list}>
        <SettingRow
          icon="notifications-outline"
          title="Lugar libre"
          subtitle="Avisarme cuando se libere un cajón"
          value={notifyFree}
          onChange={setNotifyFree}
        />
        <SettingRow
          icon="exit-outline"
          title="Salida registrada"
          subtitle="Avisarme cuando la cámara lea mi placa al salir"
          value={notifyExit}
          onChange={setNotifyExit}
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

function SettingRow({ icon, title, subtitle, value, onChange, last }) {
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
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.green700 }}
        thumbColor="#fff"
        activeThumbColor="#fff"
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
