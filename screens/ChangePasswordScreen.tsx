import React, { useState } from "react";
import { Lock } from "lucide-react-native";
import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { api, saveAuthResponse } from "../services/api";
import { Button, FieldLabel, Input, MipoText, Screen, ScreenHeader, showAlert } from "../components/ui";

interface ChangePasswordScreenProps {
  navigation: { goBack: () => void };
}

const MIN_PASSWORD_LENGTH = 6;

export default function ChangePasswordScreen({ navigation }: ChangePasswordScreenProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const changePasswordMutation = useMutation({
    mutationFn: async () => (await api.patch("/auth/password", { currentPassword, newPassword })).data,
    // A troca revoga as outras sessões e devolve tokens novos para este aparelho.
    onSuccess: async (data) => {
      await saveAuthResponse(data);
      showAlert("Sucesso", "Senha alterada.");
      navigation.goBack();
    },
    onError: (error: AxiosError<{ message?: string | string[] }>) => {
      const message = error.response?.data?.message;
      showAlert("Erro", (Array.isArray(message) ? message[0] : message) ?? "Não foi possível alterar a senha.");
    },
  });

  const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;
  const tooShort = newPassword.length > 0 && newPassword.length < MIN_PASSWORD_LENGTH;
  const canSubmit = Boolean(currentPassword) && newPassword.length >= MIN_PASSWORD_LENGTH && newPassword === confirmPassword;

  return (
    <Screen scroll keyboardShouldPersistTaps="handled">
      <ScreenHeader title="Trocar senha" />
      <FieldLabel>Senha atual</FieldLabel>
      <Input icon={Lock} secureTextEntry value={currentPassword} onChangeText={setCurrentPassword} accessibilityLabel="Senha atual" />
      <FieldLabel>Nova senha</FieldLabel>
      <Input icon={Lock} secureTextEntry value={newPassword} onChangeText={setNewPassword} accessibilityLabel="Nova senha" />
      {tooShort ? (
        <MipoText variant="caption" color="red">
          {`A senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.`}
        </MipoText>
      ) : null}
      <FieldLabel>Confirmar nova senha</FieldLabel>
      <Input icon={Lock} secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} accessibilityLabel="Confirmar nova senha" />
      {mismatch ? (
        <MipoText variant="caption" color="red">
          As senhas não coincidem.
        </MipoText>
      ) : null}
      <Button
        label="Salvar nova senha"
        variant="red"
        block
        disabled={!canSubmit}
        loading={changePasswordMutation.isPending}
        onPress={() => changePasswordMutation.mutate()}
        style={{ marginTop: 20 }}
      />
    </Screen>
  );
}
