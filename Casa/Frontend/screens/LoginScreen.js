import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { ActionButton, Field } from './components';
import { styles } from './styles';

export default function LoginScreen({
  email,
  onChangeEmail,
  password,
  onChangePassword,
  onSignIn,
  onUnlockBiometrics,
  onRemoveSavedAccount,
  savedAccount,
  error,
  working,
}) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.loginContainer}
    >
      <View style={styles.brand}>
        <Text style={styles.brandMark}>⌂</Text>
        <Text style={styles.brandName}>CasaLink</Text>
      </View>
      <Text style={styles.title}>Bienvenido a casa</Text>
      <Text style={styles.mutedText}>Inicia sesión para controlar tu hogar.</Text>
      {savedAccount ? (
        <View style={styles.biometricBox}>
          <Text style={styles.mutedText}>Cuenta guardada en este dispositivo:</Text>
          <Text style={styles.biometricAccount}>{savedAccount}</Text>
          <ActionButton
            title={working ? 'Validando...' : 'Entrar con huella o rostro'}
            disabled={working}
            onPress={onUnlockBiometrics}
          />
          <Pressable
            accessibilityRole="button"
            disabled={working}
            onPress={onRemoveSavedAccount}
            style={styles.removeSavedAccount}
          >
            <Text style={styles.removeText}>Eliminar cuenta guardada</Text>
          </Pressable>
        </View>
      ) : null}
      <Field
        label="Correo"
        autoCapitalize="none"
        autoComplete="email"
        editable={!working}
        keyboardType="email-address"
        onChangeText={onChangeEmail}
        placeholder="correo@ejemplo.com"
        value={email}
      />
      <Field
        label="Contraseña"
        autoCapitalize="none"
        autoComplete="current-password"
        editable={!working}
        onChangeText={onChangePassword}
        onSubmitEditing={onSignIn}
        placeholder="Tu contraseña"
        secureTextEntry
        value={password}
      />
      {!!error && <Text style={styles.errorText}>{error}</Text>}
      <ActionButton
        title={working ? 'Validando acceso...' : 'Iniciar sesión'}
        disabled={working || !email.trim() || !password}
        onPress={onSignIn}
      />
    </KeyboardAvoidingView>
  );
}
