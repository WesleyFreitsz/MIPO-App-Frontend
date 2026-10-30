import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { BirthDateField } from "../components/BirthDateField";
import { LEGAL_URLS, MIN_AGE, ageOn, legalVersionQuery, openLegalPage, toIsoDate } from "../services/legal";
import { BackButton, Button, Character, CharacterName, Checkbox, CodeInput, FieldLabel, Input, MipoText, showAlert } from "../components/ui";
import { StaggerIn } from "../motion/StaggerIn";
import { useTheme } from "../theme/ThemeProvider";
import { fontFamily } from "../theme/tokens";

type AuthMode = "login" | "register" | "forgot" | "reset";

const characterByMode: Record<AuthMode, CharacterName> = {
  login: "monstro2",
  register: "monstro2",
  forgot: "peao9",
  reset: "peao4",
};

const submitLabel: Record<AuthMode, string> = {
  login: "Entrar",
  register: "Criar conta",
  forgot: "Enviar código",
  reset: "Alterar senha",
};

function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={10} style={{ paddingVertical: 6 }}>
      <MipoText variant="cardTitle">{label}</MipoText>
    </Pressable>
  );
}

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<AuthMode>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const legalVersion = useQuery({ ...legalVersionQuery, enabled: mode === "register" });
  const [recoveryCode, setRecoveryCode] = useState("");

  const handleAuth = async () => {
    if (mode === "register" && email !== confirmEmail) {
      return showAlert("Erro", "Os e-mails digitados não são iguais.");
    }
    if (mode === "register" && (!birthDate || ageOn(birthDate) < MIN_AGE)) {
      return showAlert("Atenção", `O Mipo é permitido apenas para maiores de ${MIN_AGE} anos.`);
    }
    if (mode === "register" && !acceptedTerms) {
      return showAlert("Atenção", "Para criar a conta, aceite os termos de uso e a política de privacidade.");
    }
    if (mode === "register" && !legalVersion.data) {
      return showAlert("Erro", "Não foi possível carregar os termos. Verifique sua conexão.");
    }
    setIsLoading(true);
    try {
      if (mode === "login") {
        await signIn({ login: email, password });
      } else if (mode === "register") {
        await signUp({
          name,
          login: email,
          password,
          birthDate: toIsoDate(birthDate as Date),
          termsVersion: (legalVersion.data as { version: string }).version,
        });
      } else if (mode === "forgot") {
        await api.post("/auth/forgot-password", { email });
        showAlert("Sucesso", "Verifique seu e-mail para obter o código.");
        setMode("reset");
      } else if (mode === "reset") {
        await api.post("/auth/reset-password", {
          email,
          code: recoveryCode,
          newPassword: password,
        });
        showAlert("Sucesso", "Senha alterada! Agora faça login.");
        setMode("login");
      }
    } catch (error: unknown) {
      const response = (error as { response?: { data?: { message?: string } } }).response;
      showAlert("Erro", response?.data?.message || "Erro na operação.");
    } finally {
      setIsLoading(false);
    }
  };

  const recovering = mode === "forgot" || mode === "reset";

  const passwordToggle = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={showPassword ? "Esconder senha" : "Mostrar senha"}
      onPress={() => setShowPassword(!showPassword)}
      hitSlop={12}
    >
      {showPassword ? <EyeOff size={20} color={colors.muted} /> : <Eye size={20} color={colors.muted} />}
    </Pressable>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: colors.hero }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }}
      >
        {recovering ? (
          <View style={{ flexDirection: "row" }}>
            <BackButton onPress={() => setMode("login")} />
          </View>
        ) : (
          <StaggerIn index={0} style={{ alignItems: "center", marginTop: 18 }}>
            <MipoText
              style={{
                fontFamily: fontFamily.display,
                fontSize: 64,
                lineHeight: 70,
                letterSpacing: -2,
                color: colors.red,
                textShadowColor: colors.line,
                textShadowOffset: { width: 3, height: 3 },
                textShadowRadius: 0.1,
              }}
            >
              mipo
            </MipoText>
            <MipoText variant="caption" color="text" style={{ marginTop: 6 }}>
              a sua mesa tá te esperando
            </MipoText>
          </StaggerIn>
        )}

        <View style={{ alignItems: "center", marginVertical: 10 }}>
          <Character name={characterByMode[mode]} size={mode === "register" ? 110 : 150} />
        </View>

        {mode === "forgot" ? (
          <StaggerIn index={1} style={{ alignItems: "center", marginBottom: 8 }}>
            <MipoText variant="screenTitle" style={{ textAlign: "center" }}>
              Esqueceu a senha?
            </MipoText>
            <MipoText variant="caption" style={{ textAlign: "center", marginTop: 4 }}>
              Te ajudamos a voltar ao jogo
            </MipoText>
          </StaggerIn>
        ) : null}

        {mode === "reset" ? (
          <StaggerIn index={1} style={{ alignItems: "center", marginBottom: 14 }}>
            <MipoText variant="screenTitle" style={{ textAlign: "center" }}>
              Confere seu e-mail!
            </MipoText>
            <MipoText variant="caption" style={{ textAlign: "center", marginTop: 4 }}>
              {`Mandamos um código de 6 dígitos pra ${email}`}
            </MipoText>
          </StaggerIn>
        ) : null}

        <View style={{ gap: 2 }}>
          {mode === "register" ? (
            <>
              <FieldLabel>Nome completo</FieldLabel>
              <Input icon={User} placeholder="Seu nome" value={name} onChangeText={setName} autoComplete="name" />
              <FieldLabel>Data de nascimento</FieldLabel>
              <BirthDateField value={birthDate} onChange={setBirthDate} />
              <MipoText variant="caption" style={{ marginTop: 4 }}>
                {`Uso permitido apenas para maiores de ${MIN_AGE} anos.`}
              </MipoText>
            </>
          ) : null}

          {mode === "register" ? <FieldLabel>E-mail</FieldLabel> : null}
          <Input
            icon={Mail}
            placeholder="seu@email.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          {mode === "register" ? (
            <>
              <FieldLabel>Confirme seu e-mail</FieldLabel>
              <Input icon={Mail} placeholder="Repita seu e-mail" value={confirmEmail} onChangeText={setConfirmEmail} autoCapitalize="none" />
            </>
          ) : null}

          {mode === "reset" ? (
            <View style={{ marginTop: 12 }}>
              <CodeInput length={6} value={recoveryCode} onChange={setRecoveryCode} />
            </View>
          ) : null}

          {mode !== "forgot" ? (
            <View style={{ marginTop: mode === "register" ? 0 : 10 }}>
              {mode === "register" ? <FieldLabel>Senha</FieldLabel> : null}
              <View>
                <Input
                  icon={Lock}
                  placeholder={mode === "reset" ? "Nova senha" : "Senha"}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  containerStyle={{ paddingRight: 44 }}
                />
                <View style={{ position: "absolute", right: 12, top: 0, bottom: 0, justifyContent: "center" }}>{passwordToggle}</View>
              </View>
            </View>
          ) : null}

          {mode === "register" ? (
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 14 }}>
              <Checkbox checked={acceptedTerms} onChange={setAcceptedTerms} accessibilityLabel="Aceito os termos de uso e a política de privacidade" />
              <MipoText variant="caption" style={{ flex: 1 }}>
                {"Li e aceito os "}
                <MipoText variant="caption" style={{ textDecorationLine: "underline" }} onPress={() => openLegalPage(LEGAL_URLS.terms)}>
                  Termos de uso
                </MipoText>
                {", as "}
                <MipoText variant="caption" style={{ textDecorationLine: "underline" }} onPress={() => openLegalPage(LEGAL_URLS.community)}>
                  Diretrizes da comunidade
                </MipoText>
                {" e a "}
                <MipoText variant="caption" style={{ textDecorationLine: "underline" }} onPress={() => openLegalPage(LEGAL_URLS.privacy)}>
                  Política de privacidade
                </MipoText>
                .
              </MipoText>
            </View>
          ) : null}

          <Button label={submitLabel[mode]} variant="red" block loading={isLoading} onPress={handleAuth} style={{ marginTop: 16 }} />

          {!recovering ? (
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingHorizontal: 4 }}>
              <TextLink label={mode === "login" ? "Criar conta" : "Já tenho conta"} onPress={() => setMode(mode === "login" ? "register" : "login")} />
              {mode === "login" ? <TextLink label="Esqueci a senha" onPress={() => setMode("forgot")} /> : null}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
