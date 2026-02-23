import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
} from "react-native";
import {
  Dice5,
  Mail,
  Lock,
  User,
  Calendar,
  Eye,
  EyeOff,
  ArrowLeft,
  Sparkles,
} from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

type AuthMode = "login" | "register" | "forgot" | "reset";

const COLORS = {
  primary: "#c73636",
  primaryDark: "#9f1d1d",
  background: "#faf6f1",
  card: "#ffffff",
  text: "#1c1917",
  textMuted: "#78716c",
  border: "#e7e5e4",
  accent: "#f59e0b",
};

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleAuth = async () => {
    if (mode === "register" && email !== confirmEmail) {
      return Alert.alert("Erro", "Os e-mails digitados não são iguais.");
    }
    setIsLoading(true);
    try {
      if (mode === "login") {
        await signIn({ login: email, password });
      } else if (mode === "register") {
        await signUp({ name, login: email, password, age });
      } else if (mode === "forgot") {
        await api.post("/auth/forgot-password", { email });
        Alert.alert("Sucesso", "Verifique seu e-mail para obter o código.");
        setMode("reset");
      } else if (mode === "reset") {
        await api.post("/auth/reset-password", {
          email,
          code: recoveryCode,
          newPassword: password,
        });
        Alert.alert("Sucesso", "Senha alterada! Agora faça login.");
        setMode("login");
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || "Erro na operação.";
      Alert.alert("Erro", msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.logoWrapper}>
            <View style={styles.logoContainer}>
              <Dice5 color="#fff" size={36} strokeWidth={2.5} />
            </View>
            <View style={styles.sparkle}>
              <Sparkles size={14} color={COLORS.accent} fill={COLORS.accent} />
            </View>
          </View>
          <Text style={styles.title}>
            {mode === "login"
              ? "Bem-vindo de volta!"
              : mode === "register"
                ? "Criar Conta"
                : "Recuperar Senha"}
          </Text>
          <Text style={styles.subtitle}>
            {mode === "login"
              ? "Entre e encontre sua próxima partida"
              : mode === "register"
                ? "Junte-se à comunidade de board gamers"
                : "Te ajudamos a voltar ao jogo"}
          </Text>
        </Animated.View>

        <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
          {mode === "register" && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nome completo</Text>
                <View style={styles.inputWrapper}>
                  <User size={20} color={COLORS.textMuted} />
                  <TextInput
                    placeholder="Seu nome"
                    placeholderTextColor={COLORS.textMuted}
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                  />
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Idade</Text>
                <View style={styles.inputWrapper}>
                  <Calendar size={20} color={COLORS.textMuted} />
                  <TextInput
                    placeholder="Sua idade"
                    placeholderTextColor={COLORS.textMuted}
                    style={styles.input}
                    value={age}
                    onChangeText={setAge}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-mail</Text>
            <View style={styles.inputWrapper}>
              <Mail size={20} color={COLORS.textMuted} />
              <TextInput
                placeholder="seu@email.com"
                placeholderTextColor={COLORS.textMuted}
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
              />
            </View>
          </View>

          {mode === "register" && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirme seu E-mail</Text>
              <View style={styles.inputWrapper}>
                <Mail size={20} color={COLORS.textMuted} />
                <TextInput
                  placeholder="Repita seu e-mail"
                  placeholderTextColor={COLORS.textMuted}
                  style={styles.input}
                  value={confirmEmail}
                  onChangeText={setConfirmEmail}
                  autoCapitalize="none"
                />
              </View>
            </View>
          )}

          {mode === "reset" && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Código de 6 dígitos</Text>
              <View style={styles.inputWrapper}>
                <Lock size={20} color={COLORS.textMuted} />
                <TextInput
                  placeholder="000000"
                  placeholderTextColor={COLORS.textMuted}
                  style={styles.input}
                  value={recoveryCode}
                  onChangeText={setRecoveryCode}
                  keyboardType="numeric"
                />
              </View>
            </View>
          )}

          {mode !== "forgot" && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{mode === "reset" ? "Nova Senha" : "Senha"}</Text>
              <View style={styles.inputWrapper}>
                <Lock size={20} color={COLORS.textMuted} />
                <TextInput
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textMuted}
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={12}>
                  {showPassword ? (
                    <EyeOff size={20} color={COLORS.textMuted} />
                  ) : (
                    <Eye size={20} color={COLORS.textMuted} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.mainButton, isLoading && styles.mainButtonDisabled]}
            onPress={handleAuth}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {mode === "login" ? "Entrar" : mode === "register" ? "Criar Conta" : mode === "forgot" ? "Enviar Código" : "Alterar Senha"}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            {mode === "login" && (
              <TouchableOpacity onPress={() => setMode("forgot")}>
                <Text style={styles.linkText}>Esqueci minha senha</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => setMode(mode === "login" ? "register" : "login")} style={styles.footerLink}>
              <Text style={styles.footerText}>
                {mode === "login" ? "Não tem conta? Cadastre-se" : "Já tem conta? Faça login"}
              </Text>
            </TouchableOpacity>
            {(mode === "forgot" || mode === "reset") && (
              <TouchableOpacity onPress={() => setMode("login")} style={styles.backBtn}>
                <ArrowLeft size={16} color={COLORS.textMuted} />
                <Text style={styles.backText}>Voltar</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: 24, paddingVertical: 40 },
  header: { alignItems: "center", marginBottom: 28 },
  logoWrapper: { position: "relative", marginBottom: 16 },
  logoContainer: {
    backgroundColor: COLORS.primary,
    padding: 18,
    borderRadius: 24,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  sparkle: {
    position: "absolute",
    top: -4,
    right: -4,
  },
  title: { fontSize: 26, fontWeight: "bold", color: COLORS.text, textAlign: "center" },
  subtitle: { fontSize: 15, color: COLORS.textMuted, marginTop: 6, textAlign: "center", maxWidth: 280 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: "600", color: COLORS.text, marginBottom: 8 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  input: { flex: 1, height: 50, fontSize: 16, marginLeft: 10, color: COLORS.text },
  mainButton: {
    backgroundColor: COLORS.primary,
    height: 54,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  mainButtonDisabled: { opacity: 0.8 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  footer: { marginTop: 24, alignItems: "center", gap: 14 },
  footerText: { color: COLORS.textMuted, fontSize: 15 },
  footerLink: { paddingVertical: 4 },
  linkText: { color: COLORS.primary, fontWeight: "bold", fontSize: 14 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  backText: { color: COLORS.textMuted, fontWeight: "600" },
});
