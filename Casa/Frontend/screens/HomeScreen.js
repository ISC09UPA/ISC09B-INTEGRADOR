import {
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ActionButton, SectionTitle } from './components';
import { colors, styles } from './styles';

export default function HomeScreen({
  dashboard,
  email,
  biometricAvailable,
  biometricAccount,
  working,
  error,
  newPerson,
  onChangeNewPerson,
  onSignOut,
  onEnableBiometrics,
  onToggleSecurity,
  onOpenDoor,
  onToggleLight,
  onRemovePerson,
  onAddPerson,
}) {
  const { panel, people } = dashboard;
  const lights = Object.entries(panel.luces);
  const enabledLights = lights.filter(([, enabled]) => enabled).length;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <View>
          <Text style={styles.mutedText}>CasaLink</Text>
          <Text style={styles.title}>Mi casa</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onSignOut}>
          <Text style={styles.linkText}>Salir</Text>
        </Pressable>
      </View>

      {!!error && <Text style={styles.errorBanner}>{error}</Text>}

      {biometricAvailable && !biometricAccount ? (
        <View style={styles.biometricBox}>
          <Text style={styles.cardTitle}>Acceso rápido y protegido</Text>
          <Text style={styles.mutedText}>
            Guarda solo esta cuenta ({email}) en el dispositivo para entrar después con tu huella o rostro.
          </Text>
          <ActionButton
            title={working ? 'Activando...' : 'Activar huella o rostro'}
            disabled={working}
            onPress={onEnableBiometrics}
          />
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>
              {panel.seguridad ? 'Casa asegurada' : 'Casa sin asegurar'}
            </Text>
            <Text style={styles.mutedText}>
              {panel.seguridad ? 'Movimiento vigilado' : 'Movimiento no vigilado'}
            </Text>
          </View>
          <Switch
            accessibilityLabel="Seguridad de la casa"
            disabled={working}
            onValueChange={onToggleSecurity}
            trackColor={{ false: colors.border, true: colors.green }}
            value={panel.seguridad}
          />
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.card, styles.summaryCard]}>
          <Text style={styles.mutedText}>Luz ambiente</Text>
          <Text style={styles.metric}>
            {panel.lux} <Text style={styles.metricUnit}>lx</Text>
          </Text>
        </View>
        <View style={[styles.card, styles.summaryCard]}>
          <Text style={styles.mutedText}>Puerta principal</Text>
          <Text style={[styles.metric, { color: panel.puerta ? colors.amber : colors.green }]}>
            {panel.puerta ? 'Abierta' : 'Cerrada'}
          </Text>
        </View>
      </View>
      <ActionButton
        title={panel.puerta ? 'Puerta abierta' : 'Abrir puerta'}
        disabled={working || panel.puerta}
        secondary
        onPress={onOpenDoor}
      />

      <SectionTitle>Iluminación · {enabledLights} de {lights.length} encendidas</SectionTitle>
      <View style={styles.card}>
        {lights.map(([name, enabled], index) => (
          <View key={name} style={[styles.row, index > 0 && styles.listItem]}>
            <Text style={styles.bodyText}>{name}</Text>
            <Switch
              accessibilityLabel={`Luz de ${name}`}
              disabled={working}
              onValueChange={(encendida) => onToggleLight(name, encendida)}
              trackColor={{ false: colors.border, true: colors.green }}
              value={enabled}
            />
          </View>
        ))}
      </View>

      <SectionTitle>Personas con acceso</SectionTitle>
      <View style={styles.card}>
        {people.length ? people.map((name, index) => (
          <View key={`${name}-${index}`} style={[styles.row, index > 0 && styles.listItem]}>
            <Text style={styles.bodyText}>{name}</Text>
            <Pressable
              accessibilityRole="button"
              disabled={working}
              onPress={() => onRemovePerson(name)}
            >
              <Text style={styles.removeText}>Quitar</Text>
            </Pressable>
          </View>
        )) : <Text style={styles.mutedText}>No hay personas agregadas.</Text>}
      </View>
      <View style={styles.addPerson}>
        <TextInput
          editable={!working}
          onChangeText={onChangeNewPerson}
          onSubmitEditing={onAddPerson}
          placeholder="Nombre de la persona"
          placeholderTextColor={colors.muted}
          returnKeyType="done"
          style={[styles.input, styles.personInput]}
          value={newPerson}
        />
        <ActionButton
          title="Agregar"
          disabled={working || !newPerson.trim()}
          onPress={onAddPerson}
        />
      </View>
      <Text style={styles.footer}>Actualizado automáticamente cada 5 segundos</Text>
    </ScrollView>
  );
}
