import React, { useState } from "react";
import { View } from "react-native";
import { BookOpen, ChevronRight, Download, FileText, KeyRound, LogOut, Mail, ShieldCheck, ShieldOff, Trash2, Users, LucideIcon } from "lucide-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { notificationPreferenceLabel } from "../services/notificationPreferences";
import { exportMyData } from "../services/exportMyData";
import { LEGAL_URLS, contactPrivacy, openLegalPage } from "../services/legal";
import {
  BottomSheet,
  Button,
  Card,
  Checkbox,
  FieldLabel,
  Input,
  MipoText,
  Screen,
  ScreenHeader,
  SectionHeader,
  Skeleton,
  showAlert,
} from "../components/ui";
import { useTheme } from "../theme/ThemeProvider";

interface SettingsScreenProps {
  navigation: { navigate: (screen: string, params?: object) => void };
}

interface NotificationPreference {
  type: string;
  enabled: boolean;
}

const PREFERENCES_KEY = ["notifications", "preferences"];

function SettingsRow({ icon: Icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Card onPress={onPress} accessibilityLabel={label} contentStyle={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Icon size={20} color={colors.text} strokeWidth={2.4} />
      <MipoText variant="bodyBold" style={{ flex: 1 }}>
        {label}
      </MipoText>
      <ChevronRight size={18} color={colors.muted} strokeWidth={2.4} />
    </Card>
  );
}

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const { signOut, user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  const { data: preferences, isLoading } = useQuery<NotificationPreference[]>({
    queryKey: PREFERENCES_KEY,
    queryFn: async () => (await api.get("/notifications/preferences")).data,
  });

  const preferenceMutation = useMutation({
    mutationFn: async (preference: NotificationPreference) =>
      (await api.patch<NotificationPreference[]>("/notifications/preferences", preference)).data,
    onMutate: async (preference) => {
      await queryClient.cancelQueries({ queryKey: PREFERENCES_KEY });
      const previous = queryClient.getQueryData<NotificationPreference[]>(PREFERENCES_KEY);
      queryClient.setQueryData<NotificationPreference[]>(PREFERENCES_KEY, (current) =>
        current?.map((item) => (item.type === preference.type ? preference : item)),
      );
      return { previous };
    },
    onError: (_error, _preference, context) => {
      queryClient.setQueryData(PREFERENCES_KEY, context?.previous);
      showAlert("Erro", "Não foi possível salvar a preferência.");
    },
    onSuccess: (updated) => queryClient.setQueryData(PREFERENCES_KEY, updated),
  });

  const presenceMutation = useMutation({
    mutationFn: (showInStorePresence: boolean) => api.patch("/users/profile", { showInStorePresence }),
    onSuccess: () => {
      refreshUser();
      queryClient.invalidateQueries({ queryKey: ["store", "present"] });
    },
    onError: () => showAlert("Erro", "Não foi possível salvar a preferência."),
  });
  const showInStorePresence = presenceMutation.isPending ? presenceMutation.variables : (user?.showInStorePresence ?? true);

  const lastSeenMutation = useMutation({
    mutationFn: (showLastSeen: boolean) => api.patch("/users/profile", { showLastSeen }),
    onSuccess: () => refreshUser(),
    onError: () => showAlert("Erro", "Não foi possível salvar a preferência."),
  });
  const showLastSeen = lastSeenMutation.isPending ? lastSeenMutation.variables : (user?.showLastSeen ?? true);

  const exportMutation = useMutation({
    mutationFn: exportMyData,
    onError: () => showAlert("Erro", "Não foi possível exportar seus dados agora."),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (password: string) => api.delete("/auth/account", { data: { password } }),
    onSuccess: () => {
      setDeleteVisible(false);
      signOut();
    },
    onError: () => showAlert("Erro", "Senha incorreta ou falha ao excluir a conta."),
  });

  const confirmSignOut = () =>
    showAlert("Sair", "Deseja sair da sua conta?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => signOut() },
    ]);

  return (
    <>
      <Screen scroll>
        <ScreenHeader title="Configurações" />

        <SectionHeader title="Conta" />
        <View style={{ gap: 10 }}>
          <SettingsRow icon={KeyRound} label="Trocar senha" onPress={() => navigation.navigate("ChangePassword")} />
          <SettingsRow icon={ShieldOff} label="Usuários bloqueados" onPress={() => navigation.navigate("BlockedUsers")} />
        </View>

        <SectionHeader title="Na loja" />
        <Card contentStyle={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <MipoText variant="body">Aparecer como presente na loja</MipoText>
            <MipoText variant="caption">Quando desligado, você faz check-in e pede normalmente, mas não aparece na lista de quem está na Mipo.</MipoText>
          </View>
          <Checkbox
            checked={showInStorePresence}
            accessibilityLabel="Aparecer como presente na loja"
            onChange={(enabled) => presenceMutation.mutate(enabled)}
          />
        </Card>

        <SectionHeader title="Privacidade" />
        <Card contentStyle={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <MipoText variant="body">Mostrar online e "visto por último"</MipoText>
            <MipoText variant="caption">Quando desligado, ninguém vê se você está online no chat.</MipoText>
          </View>
          <Checkbox checked={showLastSeen} accessibilityLabel={'Mostrar online e "visto por último"'} onChange={(enabled) => lastSeenMutation.mutate(enabled)} />
        </Card>
        <View style={{ gap: 10, marginTop: 10 }}>
          <SettingsRow icon={Download} label={exportMutation.isPending ? "Preparando seus dados…" : "Baixar meus dados"} onPress={() => exportMutation.mutate()} />
          <SettingsRow icon={ShieldCheck} label="Política de privacidade" onPress={() => openLegalPage(LEGAL_URLS.privacy)} />
          <SettingsRow icon={FileText} label="Termos de uso" onPress={() => openLegalPage(LEGAL_URLS.terms)} />
          <SettingsRow icon={Users} label="Diretrizes da comunidade" onPress={() => openLegalPage(LEGAL_URLS.community)} />
          <SettingsRow icon={BookOpen} label="Como excluir minha conta" onPress={() => openLegalPage(LEGAL_URLS.accountDeletion)} />
          <SettingsRow icon={Mail} label="Falar com a Mipo sobre privacidade" onPress={contactPrivacy} />
        </View>

        <SectionHeader title="Notificações" />
        <Card contentStyle={{ gap: 14 }}>
          {isLoading || !preferences
            ? [0, 1, 2].map((index) => <Skeleton key={index} height={22} />)
            : preferences.map((preference) => {
                const label = notificationPreferenceLabel(preference.type);
                return (
                  <View key={preference.type} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <MipoText variant="body" style={{ flex: 1 }}>
                      {label}
                    </MipoText>
                    <Checkbox
                      checked={preference.enabled}
                      accessibilityLabel={`Notificações de ${label}`}
                      onChange={(enabled) => preferenceMutation.mutate({ type: preference.type, enabled })}
                    />
                  </View>
                );
              })}
        </Card>

        <View style={{ gap: 10, marginTop: 24 }}>
          <Button label="Sair da conta" icon={LogOut} variant="ghost" block onPress={confirmSignOut} />
          <Button label="Excluir conta" icon={Trash2} variant="red" block onPress={() => setDeleteVisible(true)} />
        </View>
      </Screen>

      <BottomSheet
        visible={deleteVisible}
        onClose={() => {
          setDeleteVisible(false);
          setDeletePassword("");
        }}
      >
        <MipoText variant="screenTitle" style={{ fontSize: 22 }}>
          Excluir conta
        </MipoText>
        <MipoText variant="body" color="muted" style={{ marginTop: 8 }}>
          Seus dados pessoais, publicações, imagens, histórico de visitas e de jogos serão apagados, e suas mensagens de chat aparecerão como apagadas.
          Você não poderá mais entrar com esta conta. Essa ação não pode ser desfeita.
        </MipoText>
        <FieldLabel>Confirme sua senha</FieldLabel>
        <Input placeholder="Senha" secureTextEntry value={deletePassword} onChangeText={setDeletePassword} accessibilityLabel="Senha" />
        <Button
          label="Excluir definitivamente"
          icon={Trash2}
          variant="red"
          block
          disabled={!deletePassword}
          loading={deleteAccountMutation.isPending}
          onPress={() => deleteAccountMutation.mutate(deletePassword)}
          style={{ marginTop: 16 }}
        />
      </BottomSheet>
    </>
  );
}
