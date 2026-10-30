import React, { useState } from "react";
import { FlatList, Image, RefreshControl, View } from "react-native";
import { Check, X } from "lucide-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import {
  Avatar,
  Button,
  BottomSheet,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  MipoText,
  Screen,
  ScreenHeader,
  SegmentedControl,
  useBottomReserve,
  showAlert,
} from "../components/ui";
import { useTheme } from "../theme/ThemeProvider";
import { radius, stroke } from "../theme/tokens";
import { MonthlyGameScore, Page, displayName } from "./jogo/monthlyGameTypes";

interface Event {
  id: string;
  title: string;
  space: string;
  dateTime: string;
  creator?: { name: string };
}

type ApprovalTab = "events" | "scores";

const PENDING_EVENTS_KEY = ["approvals", "events"];
const PENDING_SCORES_KEY = ["approvals", "scores"];

export default function AdminApprovalsScreen() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const bottomReserve = useBottomReserve(false);
  const [activeTab, setActiveTab] = useState<ApprovalTab>("events");

  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<ApprovalTab>("events");
  const [rejectReason, setRejectReason] = useState("");

  const eventsQuery = useQuery<Event[]>({
    queryKey: PENDING_EVENTS_KEY,
    queryFn: async () => (await api.get("/events/pending")).data,
  });

  const scoresQuery = useQuery<Page<MonthlyGameScore>>({
    queryKey: PENDING_SCORES_KEY,
    queryFn: async () => (await api.get("/monthly-games/scores/pending", { params: { skip: 0, take: 100 } })).data,
  });

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["approvals"] });
    queryClient.invalidateQueries({ queryKey: ["monthlyGames"] });
  };

  const approveMutation = useMutation({
    mutationFn: ({ id, type }: { id: string; type: ApprovalTab }) =>
      api.patch(type === "events" ? `/events/${id}/approve` : `/monthly-games/scores/${id}/approve`),
    onSuccess: (_, { type }) => {
      showAlert("Sucesso", type === "events" ? "Evento aprovado e notificado!" : "Partida aprovada!");
      refreshAll();
    },
    onError: () => showAlert("Erro", "Não foi possível aprovar."),
  });

  const rejectMutation = useMutation({
    mutationFn: () =>
      api.patch(selectedType === "events" ? `/events/${selectedId}/reject` : `/monthly-games/scores/${selectedId}/reject`, {
        reason: rejectReason,
      }),
    onSuccess: () => {
      setRejectModalVisible(false);
      showAlert("Sucesso", "Rejeitado.");
      refreshAll();
    },
    onError: () => showAlert("Erro", "Falha ao rejeitar."),
  });

  const openRejectModal = (id: string, type: ApprovalTab) => {
    setSelectedId(id);
    setSelectedType(type);
    setRejectReason("");
    setRejectModalVisible(true);
  };

  const confirmReject = () => {
    if (!rejectReason.trim()) return showAlert("Atenção", "Informe o motivo.");
    rejectMutation.mutate();
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return `${date.getDate()}/${date.getMonth() + 1} às ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
  };

  const renderActions = (id: string, type: ApprovalTab) => (
    <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
      <Button
        label="Aprovar"
        icon={Check}
        variant="lime"
        size="sm"
        disabled={approveMutation.isPending}
        onPress={() => approveMutation.mutate({ id, type })}
        style={{ flex: 1 }}
      />
      <Button label="Recusar" icon={X} variant="ghost" size="sm" onPress={() => openRejectModal(id, type)} style={{ flex: 1 }} />
    </View>
  );

  const renderEventItem = (item: Event) => {
    const creatorName = item.creator?.name ?? "Usuário";
    return (
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Avatar name={creatorName} id={item.id} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <MipoText variant="bodyBold" numberOfLines={1}>
              {creatorName}
            </MipoText>
            <MipoText variant="caption" numberOfLines={1}>
              {formatDate(item.dateTime)}
            </MipoText>
          </View>
          <Chip label={item.space} tone="lilac" />
        </View>
        <MipoText variant="cardTitle" numberOfLines={2} style={{ marginTop: 10 }}>
          {item.title}
        </MipoText>
        {renderActions(item.id, "events")}
      </Card>
    );
  };

  const renderScoreItem = (item: MonthlyGameScore) => {
    const player = item.user;
    return (
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {player ? <Avatar name={player.name} id={player.id} uri={player.avatarUrl} /> : null}
          <View style={{ flex: 1, minWidth: 0 }}>
            <MipoText variant="bodyBold" numberOfLines={1}>
              {player ? displayName(player) : "Usuário"}
            </MipoText>
            <MipoText variant="caption" numberOfLines={1}>
              {`${item.monthlyGame.game.name} · ${formatDate(item.createdAt)}`}
            </MipoText>
          </View>
          <Chip label={`${item.score} pts`} tone="yellow" />
        </View>
        {item.note ? (
          <MipoText variant="body" color="muted" style={{ marginTop: 10 }}>
            {item.note}
          </MipoText>
        ) : null}
        {item.proofImageUrl ? (
          <Image
            source={{ uri: item.proofImageUrl }}
            accessibilityLabel="Foto da partida"
            style={{ width: "100%", aspectRatio: 4 / 3, marginTop: 10, borderRadius: radius.icon, borderWidth: stroke.thin, borderColor: colors.line }}
            resizeMode="cover"
          />
        ) : null}
        {renderActions(item.id, "scores")}
      </Card>
    );
  };

  const events = eventsQuery.data ?? [];
  const scores = scoresQuery.data?.data ?? [];
  const activeQuery = activeTab === "events" ? eventsQuery : scoresQuery;

  const listProps = {
    style: { marginHorizontal: -14 },
    contentContainerStyle: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: bottomReserve, gap: 12 },
    showsVerticalScrollIndicator: false,
    refreshControl: <RefreshControl refreshing={activeQuery.isRefetching} onRefresh={() => {
          activeQuery.refetch();
        }} tintColor={colors.pink} />,
    ListEmptyComponent: <EmptyState character="peao2" title="Nada esperando aprovação" />,
  };

  return (
    <Screen>
      <ScreenHeader title="Aprovações" />
      <SegmentedControl<ApprovalTab>
        options={[
          { value: "events", label: `Eventos (${events.length})` },
          { value: "scores", label: `Partidas (${scoresQuery.data?.total ?? 0})` },
        ]}
        value={activeTab}
        onChange={setActiveTab}
      />

      {activeQuery.isLoading ? (
        <LoadingState />
      ) : activeQuery.isError ? (
        <ErrorState onRetry={() => activeQuery.refetch()} />
      ) : activeTab === "events" ? (
        <FlatList {...listProps} data={events} keyExtractor={(item) => item.id} renderItem={({ item }) => renderEventItem(item)} />
      ) : (
        <FlatList {...listProps} data={scores} keyExtractor={(item) => item.id} renderItem={({ item }) => renderScoreItem(item)} />
      )}

      <BottomSheet visible={rejectModalVisible} onClose={() => setRejectModalVisible(false)}>
        <MipoText variant="section">{selectedType === "events" ? "Motivo da Reprovação" : "Motivo da Recusa"}</MipoText>
        <Input
          placeholder={selectedType === "events" ? "Ex: Data indisponível..." : "Ex: Foto não mostra o placar"}
          value={rejectReason}
          onChangeText={setRejectReason}
          multiline
          maxLength={300}
          containerStyle={{ marginTop: 12, minHeight: 90 }}
        />
        <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
          <Button label="Cancelar" variant="ghost" onPress={() => setRejectModalVisible(false)} style={{ flex: 1 }} />
          <Button label="Confirmar Rejeição" variant="red" loading={rejectMutation.isPending} onPress={confirmReject} style={{ flex: 1 }} />
        </View>
      </BottomSheet>
    </Screen>
  );
}
