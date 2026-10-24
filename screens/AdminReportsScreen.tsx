import React from "react";
import { View, FlatList, Image, Alert } from "react-native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { AlertTriangle, Trash2, Ban } from "lucide-react-native";
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
}

interface AdminReportsScreenProps {
  navigation: Pick<NavigationProp<ParamListBase>, "goBack">;
}

export default function AdminReportsScreen({ navigation }: AdminReportsScreenProps) {
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const bottomReserve = useBottomReserve(false);

  const { data: reports, isLoading } = useQuery<Denuncia[]>({
    queryKey: ["admin_reports"],
    queryFn: async () => (await api.get("/reports")).data,
  });

  const dismissReportMutation = useMutation({
    mutationFn: (reportId: string) => api.patch(`/reports/${reportId}/dismiss`),
    onSuccess: () => {
      Alert.alert("Sucesso", "A denúncia foi ignorada.");
      queryClient.invalidateQueries({ queryKey: ["admin_reports"] });
    },
  });

  const banUserMutation = useMutation({
    mutationFn: (userId: string) => api.patch(`/users/${userId}/ban`),
    onSuccess: () => {
      Alert.alert("Sucesso", "Usuário banido com sucesso.");
      queryClient.invalidateQueries({ queryKey: ["admin_reports"] });
    },
  });

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
          <Chip tone="red" icon={AlertTriangle} label="Denúncia de post" />
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

        <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
          <Button
            label="Ignorar"
            icon={Trash2}
            variant="ghost"
            size="sm"
            block
            accessibilityLabel="Ignorar denúncia"
            style={{ flex: 1 }}
            onPress={() => dismissReportMutation.mutate(item.id)}
          />
          <Button
            label="Banir acusado"
            icon={Ban}
            variant="red"
            size="sm"
            block
            style={{ flex: 1 }}
            onPress={() => {
              Alert.alert(
                "Atenção",
                "Tem certeza que deseja BANIR este usuário?",
                [
                  { text: "Cancelar", style: "cancel" },
                  {
                    text: "Banir",
                    style: "destructive",
                    onPress: () => banUserMutation.mutate(item.reportedUser.id),
                  },
                ],
              );
            }}
          />
        </View>
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
          ListEmptyComponent={<EmptyState character="peao2" title="Nenhuma denúncia" message="Tudo tranquilo por aqui." />}
        />
      )}
    </Screen>
  );
}
