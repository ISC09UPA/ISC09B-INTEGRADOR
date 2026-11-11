import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { colors, radius } from "../theme";

const ROLES = [
  { id: "usuario", label: "Usuario" },
  { id: "administrador", label: "Administrador" },
];

export default function LoginScreen({ onLogin }) {
  const [role, setRole] = useState("usuario");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = () => {
    // TODO: conectar con la API de autenticación
    onLogin({ role, email });
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View style={styles.hero}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>P</Text>
          </View>
          <Text style={styles.title}>Estacionamiento{"\n"}Inteligente</Text>
          <Text style={styles.subtitle}>
            Consulta lugares libres en tiempo real y revisa tus entradas y
            salidas.
          </Text>
          <View style={styles.slots}>
            <View style={[styles.slot, styles.slotFilled]} />
            <View style={styles.slot} />
            <View style={[styles.slot, styles.slotFilled]} />
            <View style={styles.slot} />
          </View>
        </View>

        <View style={styles.sheet}>
          <Text style={styles.heading}>Iniciar sesión</Text>

          <View style={styles.toggle}>
            {ROLES.map((r) => {
              const active = role === r.id;
              return (
                <Pressable
                  key={r.id}
                  onPress={() => setRole(r.id)}
                  style={[styles.toggleBtn, active && styles.toggleBtnActive]}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      active && styles.toggleTextActive,
                    ]}
                  >
                    {r.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Correo</Text>
            <TextInput
              style={styles.input}
              placeholder="tu@correo.com"
              placeholderTextColor="#8a9b92"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#8a9b92"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <Pressable
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.btnPrimary,
              pressed && styles.btnPressed,
            ]}
          >
            <Text style={styles.btnPrimaryText}>Entrar</Text>
          </Pressable>

          <Pressable style={styles.linkBtn}>
            <Text style={styles.linkText}>¿Olvidaste tu contraseña?</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.green900 },
  scroll: { flexGrow: 1 },

  hero: { paddingTop: 72, paddingHorizontal: 28, paddingBottom: 40 },
  logo: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.green100,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { fontSize: 28, fontWeight: "800", color: colors.green900 },
  title: {
    marginTop: 28,
    marginBottom: 10,
    fontSize: 30,
    lineHeight: 35,
    fontWeight: "800",
    color: "#fff",
  },
  subtitle: { fontSize: 15, lineHeight: 22, color: colors.green100 },
  slots: { flexDirection: "row", gap: 10, marginTop: 28 },
  slot: {
    flex: 1,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.green100,
  },
  slotFilled: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "transparent",
  },

  sheet: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 28,
    paddingBottom: 36,
    gap: 16,
  },
  heading: { fontSize: 22, fontWeight: "700", color: colors.ink },

  toggle: {
    flexDirection: "row",
    padding: 4,
    gap: 4,
    borderRadius: radius.md,
    backgroundColor: colors.green50,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  toggleBtnActive: { backgroundColor: "#fff" },
  toggleText: { fontSize: 14, fontWeight: "600", color: colors.inkSoft },
  toggleTextActive: { color: colors.green900, fontWeight: "700" },

  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600", color: colors.inkSoft },
  input: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    fontSize: 15,
    color: colors.ink,
  },

  btnPrimary: {
    marginTop: 4,
    paddingVertical: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.green700,
    alignItems: "center",
  },
  btnPressed: { opacity: 0.85 },
  btnPrimaryText: { color: colors.green900, fontSize: 16, fontWeight: "700" },

  linkBtn: { alignSelf: "center", paddingVertical: 4 },
  linkText: { fontSize: 14, fontWeight: '600', color: colors.red },
});
