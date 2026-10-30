import React from "react";
import { View, FlatList, Image, RefreshControl } from "react-native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { AlertTriangle, Trash2, Ban, FileX } from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import {
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  LoadingState,
  MipoText,
  Screen,
  ScreenHeader,
  useBottomReserve,
  showAlert,
} from "../components/ui";
import { useTheme } from "../theme/ThemeProvider";
import { radius, stroke } from "../theme/tokens";
import { relativeTime } from "./social/socialFormat";

interface ReportUser {
  id: string;
  name?: string;
  nickname?: string;
  avatarUrl?: string | null;
}

interface Denuncia {
  id: string;
  reason: string;
  imageUrl?: string | null;
  createdAt?: string;
  reporterUser?: ReportUser | null;
  reportedUser: ReportUser;
  post?: { content: string } | null;
  type?: ReportType;
  chatMessage?: { content: string; isDeleted: boolean } | null;
}

type ReportType = "POST" | "USER" | "CHAT_MESSAGE";
type ModerationAction = "dismiss" | "remove-post" | "remove-chat-message" | "ban-user";

const REPORT_TYPE_LABEL: Record<ReportType, string> = {
  POST: "Denúncia de post",
  USER: "Denúncia de perfil",
  CHAT_MESSAGE: "Denúncia de mensagem",
};

interface AdminReportsScreenProps {
  navigation: Pick<NavigationProp<ParamListBase>, "goBack">;
}

export default function AdminReportsScreen({ navigation }: AdminReportsScreenProps) {
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const bottomReserve = useBottomReserve(false);

  const { data: reports, isLoading, isRefetching, refetch } = useQuery<Denuncia[]>({
    queryKey: ["admin_reports"],
    queryFn: async () => (await api.get("/reports")).data,
  });

  const moderationMutation = useMutation({
    mutationFn: ({ reportId, action }: { reportId: string; action: ModerationAction; done: string }) =>
      api.patch(`/reports/${reportId}/${action}`),
    onSuccess: (_response, { done }) => {
      showAlert("Sucesso", `${done} O denunciante e a pessoa denunciada foram avisados.`);
      queryClient.invalidateQueries({ queryKey: ["admin_reports"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: () => showAlert("Erro", "Não foi possível concluir a ação."),
  });

  const confirmAction = (reportId: string, action: Exclude<ModerationAction, "dismiss">, question: string, confirmLabel: string, done: string) =>
    showAlert("Atenção", question, [
      { text: "Cancelar", style: "cancel" },
      { text: confirmLabel, style: "destructive", onPress: () => moderationMutation.mutate({ reportId, action, done }) },
    ]);

  const blockStyle = {
    backgroundColor: colors.sunken,
    borderRadius: radius.input,
    padding: 10,
    marginTop: 10,
  };

  const renderReport = ({ item }: { item: Denuncia }) => {
    const reportedName = item.reportedUser?.nickname || item.reportedUser?.name || "";
    const reporterName = item.reporterUser?.nickname || item.reporterUser?.name || "";
    return (
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Chip tone="red" icon={AlertTriangle} label={REPORT_TYPE_LABEL[item.type ?? "POST"]} />
          {item.createdAt ? <MipoText variant="micro">{relativeTime(item.createdAt)}</MipoText> : null}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 }}>
          <Avatar id={item.reportedUser?.id ?? item.id} name={reportedName || "?"} uri={item.reportedUser?.avatarUrl} />
          <View style={{ flex: 1 }}>
            <MipoText variant="cardTitle" color="red" numberOfLines={1}>
              @{reportedName}
            </MipoText>
            <MipoText variant="micro" numberOfLines={1}>
              Denunciado por @{reporterName}
            </MipoText>
          </View>
        </View>

        <MipoText variant="label" style={{ marginTop: 12 }}>
          Motivo
        </MipoText>
        <MipoText variant="bodyBold">{item.reason}</MipoText>

        {item.imageUrl && (
          <View style={{ marginTop: 10 }}>
            <MipoText variant="label">Print anexado</MipoText>
            <Image
              source={{ uri: item.imageUrl }}
              resizeMode="cover"
              style={{
                width: "100%",
                height: 200,
                marginTop: 6,
                borderRadius: radius.input,
                borderWidth: stroke.regular,
                borderColor: colors.line,
              }}
            />
          </View>
        )}

        {item.post && (
          <View style={blockStyle}>
            <MipoText variant="label">Post original</MipoText>
            <MipoText variant="body" numberOfLines={4} style={{ fontStyle: "italic", marginTop: 2 }}>
              {item.post.content}
            </MipoText>
          </View>
        )}

        {item.chatMessage && (
          <View style={blockStyle}>
            <MipoText variant="label">Mensagem denunciada</MipoText>
            <MipoText variant="body" numberOfLines={4} style={{ fontStyle: "italic", marginTop: 2 }}>
              {item.chatMessage.isDeleted ? "(mensagem já apagada)" : item.chatMessage.content || "(imagem)"}
            </MipoText>
          </View>
        )}

        <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
          <Button
            label="Ignorar"
            icon={Trash2}
            variant="ghost"
            size="sm"
            block
            accessibilityLabel="Ignorar denúncia"
            style={{ flex: 1 }}
            onPress={() => moderationMutation.mutate({ reportId: item.id, action: "dismiss", done: "Denúncia ignorada." })}
          />
          <Button
            label="Banir acusado"
            icon={Ban}
            variant="red"
            size="sm"
            block
            style={{ flex: 1 }}
            onPress={() => confirmAction(item.id, "ban-user", "Tem certeza que deseja BANIR este usuário?", "Banir", "Usuário banido.")}
          />
        </View>
        {item.post ? (
          <Button
            label="Remover post"
            icon={FileX}
            variant="ghost"
            size="sm"
            block
            style={{ marginTop: 10 }}
            onPress={() => confirmAction(item.id, "remove-post", "Remover este post do feed?", "Remover", "Post removido.")}
          />
        ) : null}
        {item.chatMessage && !item.chatMessage.isDeleted ? (
          <Button
            label="Apagar mensagem"
            icon={FileX}
            variant="ghost"
            size="sm"
            block
            style={{ marginTop: 10 }}
            onPress={() => confirmAction(item.id, "remove-chat-message", "Apagar esta mensagem do chat?", "Apagar", "Mensagem apagada.")}
          />
        ) : null}
      </Card>
    );
  };

  return (
    <Screen>
      <ScreenHeader
        title="Denúncias"
        subtitle={reports && reports.length > 0 ? `${reports.length} pendentes` : undefined}
        onBack={() => navigation.goBack()}
      />
      {isLoading ? (
        <LoadingState />
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(i) => i.id}
          style={{ marginHorizontal: -14 }}
          contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 4, paddingBottom: bottomReserve, gap: 14 }}
          showsVerticalScrollIndicator={false}
          renderItem={renderReport}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => {
            refetch();
          }} tintColor={colors.pink} />}
          ListEmptyComponent={<EmptyState character="peao2" title="Nenhuma denúncia" message="Tudo tranquilo por aqui." />}
        />
      )}
    </Screen>
  );
}
