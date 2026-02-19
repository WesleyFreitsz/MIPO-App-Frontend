import React, { useState } from "react";
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
} from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

type AuthMode = "login" | "register" | "forgot" | "reset";

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");

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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Dice5 color="#fff" size={32} />
          </View>
          <Text style={styles.title}>
            {mode === "login"
              ? "Entrar no MIPO"
              : mode === "register"
                ? "Criar Conta"
                : "Recuperar Senha"}
          </Text>
        </View>

        <View style={styles.card}>
          {/* CAMPOS DE REGISTRO */}
          {mode === "register" && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nome completo</Text>
                <View style={styles.inputWrapper}>
                  <User size={20} color="#94a3b8" />
                  <TextInput
                    placeholder="Seu nome"
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                  />
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Idade</Text>
                <View style={styles.inputWrapper}>
                  <Calendar size={20} color="#94a3b8" />
                  <TextInput
                    placeholder="Sua idade"
                    style={styles.input}
                    value={age}
                    onChangeText={setAge}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </>
          )}

          {/* CAMPOS DE E-MAIL (COM CONFIRMAÇÃO NO REGISTRO) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-mail</Text>
            <View style={styles.inputWrapper}>
              <Mail size={20} color="#94a3b8" />
              <TextInput
                placeholder="seu@email.com"
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
                <Mail size={20} color="#94a3b8" />
                <TextInput
                  placeholder="Repita seu e-mail"
                  style={styles.input}
                  value={confirmEmail}
                  onChangeText={setConfirmEmail}
                  autoCapitalize="none"
                />
              </View>
            </View>
          )}

          {/* CÓDIGO DE RECUPERAÇÃO */}
          {mode === "reset" && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Código de 6 dígitos</Text>
              <View style={styles.inputWrapper}>
                <Lock size={20} color="#94a3b8" />
                <TextInput
                  placeholder="000000"
                  style={styles.input}
                  value={recoveryCode}
                  onChangeText={setRecoveryCode}
                  keyboardType="numeric"
                />
              </View>
            </View>
          )}

          {/* CAMPO DE SENHA COM OLHINHO */}
          {mode !== "forgot" && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {mode === "reset" ? "Nova Senha" : "Senha"}
              </Text>
              <View style={styles.inputWrapper}>
                <Lock size={20} color="#94a3b8" />
                <TextInput
                  placeholder="••••••••"
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#94a3b8" />
                  ) : (
                    <Eye size={20} color="#94a3b8" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* BOTÃO PRINCIPAL */}
          <TouchableOpacity
            style={styles.mainButton}
            onPress={handleAuth}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {mode === "login"
                  ? "Entrar"
                  : mode === "register"
                    ? "Criar Conta"
                    : mode === "forgot"
                      ? "Enviar Código"
                      : "Alterar Senha"}
              </Text>
            )}
          </TouchableOpacity>

          {/* LINKS DE NAVEGAÇÃO ENTRE MODOS */}
          <View style={styles.footer}>
            {mode === "login" && (
              <TouchableOpacity onPress={() => setMode("forgot")}>
                <Text style={styles.linkText}>Esqueci minha senha</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => setMode(mode === "login" ? "register" : "login")}
              style={styles.footerLink}
            >
              <Text style={styles.footerText}>
                {mode === "login"
                  ? "Não tem conta? Cadastre-se"
                  : "Já tem conta? Faça login"}
              </Text>
            </TouchableOpacity>

            {(mode === "forgot" || mode === "reset") && (
              <TouchableOpacity
                onPress={() => setMode("login")}
                style={styles.backBtn}
              >
                <ArrowLeft size={16} color="#64748b" />
                <Text style={styles.backText}>Voltar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: 20 },
  header: { alignItems: "center", marginBottom: 30 },
  logoContainer: {
    backgroundColor: "#E11D48",
    padding: 15,
    borderRadius: 20,
    marginBottom: 15,
  },
  title: { fontSize: 24, fontWeight: "bold", color: "#1e293b" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    elevation: 2,
  },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#1e293b", marginBottom: 6 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  input: { flex: 1, height: 48, fontSize: 16, marginLeft: 10 },
  mainButton: {
    backgroundColor: "#E11D48",
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  footer: { marginTop: 20, alignItems: "center", gap: 15 },
  footerText: { color: "#64748b" },
  footerLink: { paddingVertical: 5 }, // PROPRIEDADE QUE ESTAVA FALTANDO
  linkText: { color: "#E11aD48", fontWeight: "bold" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  backText: { color: "#64748b", fontWeight: "600" },
});
