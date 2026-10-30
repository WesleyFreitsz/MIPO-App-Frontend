import React, { useState } from "react";
import { Modal, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { LEGAL_URLS, MIN_AGE, ageOn, legalVersionQuery, openLegalPage, toIsoDate } from "../services/legal";
import { BirthDateField } from "./BirthDateField";
import { Button, Character, Checkbox, MipoText, showAlert } from "./ui";
import { useTheme } from "../theme/ThemeProvider";

function errorMessage(error: unknown, fallback: string) {
  return (error as { response?: { data?: { message?: string } } }).response?.data?.message || fallback;
}

function GateModal({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Modal visible animationType="fade" onRequestClose={() => undefined}>
      <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 14, backgroundColor: colors.bg }}>{children}</View>
    </Modal>
  );
}

export function BirthDateGate() {
  const { user, refreshUser, signOut } = useAuth();
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);

  if (!user?.needsBirthDate) return null;

  const confirm = async () => {
    if (!birthDate) return showAlert("Atenção", "Escolha sua data de nascimento.");
    if (ageOn(birthDate) < MIN_AGE) {
      return showAlert("Atenção", `O Mipo é permitido apenas para maiores de ${MIN_AGE} anos.`);
    }
    setSaving(true);
    try {
      await api.patch("/users/me/birth-date", { birthDate: toIsoDate(birthDate) });
      await refreshUser();
    } catch (error) {
      showAlert("Não foi possível continuar", errorMessage(error, "Tente novamente."));
      if ((error as { response?: { status?: number } }).response?.status === 400) await signOut();
    } finally {
      setSaving(false);
    }
  };

  return (
    <GateModal>
      <View style={{ alignItems: "center" }}>
        <Character name="peao2" size={110} />
      </View>
      <MipoText variant="screenTitle" style={{ textAlign: "center" }}>
        Confirme sua idade
      </MipoText>
      <MipoText variant="body" style={{ textAlign: "center" }}>
        {`O Mipo agora é exclusivo para maiores de ${MIN_AGE} anos. Informe sua data de nascimento para continuar.`}
      </MipoText>
      <BirthDateField value={birthDate} onChange={setBirthDate} />
      <Button label="Confirmar" variant="red" block loading={saving} onPress={confirm} />
      <Button label="Sair" variant="ghost" block onPress={signOut} />
    </GateModal>
  );
}

export function TermsGate() {
  const { user, refreshUser, signOut } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const legalVersion = useQuery({ ...legalVersionQuery, enabled: !!user });

  const currentVersion = legalVersion.data?.version;
  if (!user || user.needsBirthDate || !currentVersion || user.termsVersion === currentVersion) return null;

  const confirm = async () => {
    if (!accepted) return showAlert("Atenção", "Marque a caixa para aceitar.");
    setSaving(true);
    try {
      await api.patch("/users/me/accept-terms", { accept: true, version: currentVersion });
      await refreshUser();
    } catch (error) {
      showAlert("Erro", errorMessage(error, "Não foi possível registrar o aceite."));
    } finally {
      setSaving(false);
    }
  };

  const link = (label: string, url: string) => (
    <Button label={label} variant="ghost" size="sm" block onPress={() => openLegalPage(url)} />
  );

  return (
    <GateModal>
      <MipoText variant="screenTitle" style={{ textAlign: "center" }}>
        Atualizamos nossos termos
      </MipoText>
      <MipoText variant="body" style={{ textAlign: "center" }}>
        Para continuar usando o Mipo, leia e aceite os documentos abaixo.
      </MipoText>
      {link("Termos de uso", LEGAL_URLS.terms)}
      {link("Diretrizes da comunidade", LEGAL_URLS.community)}
      {link("Política de privacidade", LEGAL_URLS.privacy)}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Checkbox checked={accepted} onChange={setAccepted} accessibilityLabel="Li e aceito os termos, as diretrizes e a política de privacidade" />
        <MipoText variant="caption" style={{ flex: 1 }}>
          Li e aceito os termos de uso, as diretrizes da comunidade e a política de privacidade.
        </MipoText>
      </View>
      <Button label="Aceitar e continuar" variant="red" block loading={saving} onPress={confirm} />
      <Button label="Sair" variant="ghost" block onPress={signOut} />
    </GateModal>
  );
}
