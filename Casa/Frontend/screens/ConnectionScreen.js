import { ActivityIndicator, Text, View } from 'react-native';
import { ActionButton } from './components';
import { colors, styles } from './styles';

export default function ConnectionScreen({
  loading,
  error,
  apiUrl,
  onRetry,
  onSignOut,
}) {
  return (
    <View style={styles.centered}>
      {loading ? <ActivityIndicator color={colors.green} size="large" /> : null}
      <Text style={styles.mutedText}>
        {loading ? 'Conectando con CasaLink...' : 'No se pudo cargar tu casa.'}
      </Text>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
      <Text style={styles.mutedText}>API: {apiUrl}</Text>
      {!loading ? (
        <>
          <ActionButton title="Reintentar" onPress={onRetry} />
          <ActionButton title="Volver al inicio de sesión" secondary onPress={onSignOut} />
        </>
      ) : null}
    </View>
  );
}
