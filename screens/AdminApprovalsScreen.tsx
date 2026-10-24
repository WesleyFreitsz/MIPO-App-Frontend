import React, { useState } from "react";
import { Alert, FlatList, View } from "react-native";
import { Check, Clock, DollarSign, X } from "lucide-react-native";
import { api } from "../services/api";
import { useFocusEffect } from "@react-navigation/native";
import {
  Avatar,
  Button,
  BottomSheet,
  Card,
  Chip,
  EmptyState,
  Input,
  LoadingState,
  MipoText,
  Screen,
  ScreenHeader,
  SegmentedControl,
  useBottomReserve,
} from "../components/ui";
import { useTheme } from "../theme/ThemeProvider";

interface Event {
  id: string;
  title: string;
  space: string;
  dateTime: string;
  creator?: { name: string };
}

interface Reservation {
  id: string;
  userId: string;
  user?: { name: string };
  date: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

type ApprovalTab = "events" | "reservations";

export default function AdminApprovalsScreen() {
  const { colors } = useTheme();
  const bottomReserve = useBottomReserve(false);
  const [approvals, setApprovals] = useState<Event[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ApprovalTab>("events");

  // Modal de Rejeição
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<"event" | "reservation">(
    "event",
  );
  const [rejectReason, setRejectReason] = useState("");

  // Carrega sempre que a tela ganha foco
  useFocusEffect(
    React.useCallback(() => {
      loadPendingData();
    }, []),
  );

  async function loadPendingData() {
    setLoading(true);
    try {
      const [eventsRes, reservationsRes] = await Promise.all([
        api.get("/events/pending").catch(() => ({ data: [] })),
        api.get("/rooms/salinha/reservations/pending").catch(() => ({ data: [] })),
      ]);

      setApprovals(eventsRes.data || []);
      setReservations(reservationsRes.data || []);
    } catch (error) {
      console.log("Erro ao carregar pendências", error);
    } finally {
      setLoading(false);
    }
  }

  const handleApproveEvent = async (id: string) => {
    try {
      await api.patch(`/events/${id}/approve`);
      Alert.alert("Sucesso", "Evento aprovado e notificado!");
      loadPendingData();
    } catch (error) {
      Alert.alert("Erro", "Não foi possível aprovar.");
    }
  };

  const handleApproveReservation = async (id: string) => {
    try {
      await api.patch(`/rooms/salinha/reservations/${id}/approve`);
      Alert.alert("Sucesso", "Reserva aprovada!");
      loadPendingData();
    } catch (error) {
      Alert.alert("Erro", "Não foi possível aprovar a reserva.");
    }
  };

  const openRejectModal = (id: string, type: "event" | "reservation") => {
    setSelectedId(id);
    setSelectedType(type);
    setRejectReason("");
    setRejectModalVisible(true);
  };

  const confirmReject = async () => {
    if (!rejectReason) return Alert.alert("Atenção", "Informe o motivo.");

    try {
      if (selectedType === "event") {
        await api.patch(`/events/${selectedId}/reject`, {
          reason: rejectReason,
        });
      } else {
        await api.patch(`/rooms/salinha/reservations/${selectedId}/reject`, {
          reason: rejectReason,
        });
      }
      setRejectModalVisible(false);
      Alert.alert("Sucesso", "Rejeitado.");
      loadPendingData();
    } catch (error) {
      Alert.alert("Erro", "Falha ao rejeitar.");
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return `${date.getDate()}/${date.getMonth() + 1} às ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
  };

  const renderActions = (onApprove: () => void, onReject: () => void) => (
    <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
      <Button label="Aprovar" icon={Check} variant="lime" size="sm" onPress={onApprove} style={{ flex: 1 }} />
      <Button label="Recusar" icon={X} variant="ghost" size="sm" onPress={onReject} style={{ flex: 1 }} />
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
        {renderActions(
          () => handleApproveEvent(item.id),
          () => openRejectModal(item.id, "event"),
        )}
      </Card>
    );
  };

  const renderReservationItem = (item: Reservation) => {
    const userName = item.user?.name ?? "Usuário";
    return (
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Avatar name={userName} id={item.userId} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <MipoText variant="bodyBold" numberOfLines={1}>
              {userName}
            </MipoText>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Clock size={12} color={colors.muted} strokeWidth={2.4} />
              <MipoText variant="caption" numberOfLines={1}>
                {`${item.date} · ${item.startTime} - ${item.endTime}`}
              </MipoText>
            </View>
          </View>
          <Chip label={`R$ ${item.totalPrice.toFixed(2)}`} tone="yellow" />
        </View>
        <MipoText variant="cardTitle" numberOfLines={2} style={{ marginTop: 10 }}>
          Reserva da Salinha
        </MipoText>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
          <DollarSign size={14} color={colors.muted} strokeWidth={2.4} />
          <MipoText variant="caption" style={{ flex: 1 }}>
            Aguardando comprovante no Instagram @mipojogos
          </MipoText>
        </View>
        {renderActions(
          () => handleApproveReservation(item.id),
          () => openRejectModal(item.id, "reservation"),
        )}
      </Card>
    );
  };

  return (
    <Screen>
      <ScreenHeader title="Aprovações" />
      <SegmentedControl<ApprovalTab>
        options={[
          { value: "events", label: `Eventos (${approvals.length})` },
          { value: "reservations", label: `Salinhas (${reservations.length})` },
        ]}
        value={activeTab}
        onChange={setActiveTab}
      />

      {loading ? (
        <LoadingState />
      ) : activeTab === "events" ? (
        <FlatList
          data={approvals}
          keyExtractor={(item) => item.id}
          style={{ marginHorizontal: -14 }}
          contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: bottomReserve, gap: 12 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState character="peao2" title="Nada esperando aprovação" />}
          renderItem={({ item }) => renderEventItem(item)}
        />
      ) : (
        <FlatList
          data={reservations}
          keyExtractor={(item) => item.id}
          style={{ marginHorizontal: -14 }}
          contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: bottomReserve, gap: 12 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState character="peao2" title="Nada esperando aprovação" />}
          renderItem={({ item }) => renderReservationItem(item)}
        />
      )}

      {/* Modal para Motivo da Reprovação */}
      <BottomSheet visible={rejectModalVisible} onClose={() => setRejectModalVisible(false)}>
        <MipoText variant="section">
          {selectedType === "event"
            ? "Motivo da Reprovação"
            : "Motivo da Rejeição"}
        </MipoText>
        <Input
          placeholder="Ex: Data indisponível..."
          value={rejectReason}
          onChangeText={setRejectReason}
          multiline
          containerStyle={{ marginTop: 12, minHeight: 90 }}
        />
        <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
          <Button label="Cancelar" variant="ghost" onPress={() => setRejectModalVisible(false)} style={{ flex: 1 }} />
          <Button label="Confirmar Rejeição" variant="red" onPress={confirmReject} style={{ flex: 1 }} />
        </View>
      </BottomSheet>
    </Screen>
  );
}
