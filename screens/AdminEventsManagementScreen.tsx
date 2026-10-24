import React, { useState, useCallback } from "react";
import { Alert, FlatList, ScrollView, View } from "react-native";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  BottomSheet,
  Button,
  Chip,
  type ChipTone,
  EmptyState,
  Fab,
  FieldLabel,
  IconButton,
  Input,
  LoadingState,
  MipoText,
  Screen,
  ScreenHeader,
  useBottomReserve,
} from "../components/ui";
import { EventoDetail } from "../types";
import { EventoCard } from "./evento/EventoCard";

interface AdminEventsManagementScreenProps {
  navigation: Pick<NavigationProp<ParamListBase>, "navigate" | "goBack">;
}

interface AdminEvento extends EventoDetail {
  creator?: { id: string; name: string } | null;
}

interface ApiError {
  response?: { data?: { message?: string } };
  message?: string;
}

type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REPROVED" | "CONCLUDED";

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "PENDING", label: "Pendente" },
  { value: "APPROVED", label: "Aprovado" },
  { value: "REPROVED", label: "Recusado" },
  { value: "CONCLUDED", label: "Encerrado" },
];

function statusChip(status: string | undefined): { label: string; tone: ChipTone } {
  switch (status) {
    case "APPROVED":
      return { label: "Aprovado", tone: "lime" };
    case "PENDING":
      return { label: "Pendente", tone: "yellow" };
    case "CONCLUDED":
      return { label: "Encerrado", tone: "neutral" };
    case "REPROVED":
      return { label: "Recusado", tone: "red" };
    default:
      return { label: status ?? "", tone: "neutral" };
  }
}

export default function AdminEventsManagementScreen({ navigation }: AdminEventsManagementScreenProps) {
  const { user } = useAuth();
  const bottomReserve = useBottomReserve(false);
  const [events, setEvents] = useState<AdminEvento[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await api.get<AdminEvento[]>("/events/admin/all");
      setEvents(response.data);
    } catch (caught) {
      const error = caught as ApiError;
      console.log("Detalhes do erro:", error.response?.data || error.message);
      Alert.alert(
        "Erro",
        error.response?.data?.message || "Não foi possível carregar a lista.",
      );
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, []),
  );

  const handleApprove = async (id: string) => {
    Alert.alert("Aprovar", "Deseja confirmar a aprovação deste evento?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Aprovar",
        onPress: async () => {
          try {
            await api.patch(`/events/${id}/approve`);
            Alert.alert("Sucesso", "Evento aprovado e visível para todos!");
            fetchEvents();
          } catch (e) {
            Alert.alert("Erro", "Falha ao aprovar evento.");
          }
        },
      },
    ]);
  };

  const handleReject = async () => {
    if (!reason.trim())
      return Alert.alert("Atenção", "Informe o motivo da recusa.");
    try {
      await api.patch(`/events/${selectedId}/reject`, { reason });
      setRejectModalVisible(false);
      setReason("");
      fetchEvents();
      Alert.alert("Sucesso", "Evento reprovado.");
    } catch (e) {
      Alert.alert("Erro", "Falha ao recusar evento.");
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert("Excluir", "Deseja remover permanentemente este evento?", [
      { text: "Voltar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/events/${id}`);
            fetchEvents();
          } catch (e) {
            Alert.alert("Erro", "Falha ao excluir.");
          }
        },
      },
    ]);
  };

  const closeRejectSheet = () => {
    setRejectModalVisible(false);
    setReason("");
  };

  const editEvent = (id: string) => navigation.navigate("AdminCreateEvent", { eventId: id });

  const visibleEvents = statusFilter === "ALL" ? events : events.filter((item) => item.status === statusFilter);

  const renderEvent = ({ item }: { item: AdminEvento }) => {
    const status = statusChip(item.status);
    const isAdmin = user?.role === "ADMIN";
    const isOwner = item.creator?.id === user?.id;
    const canManage = isAdmin || isOwner;
    const isPending = item.status === "PENDING";

    return (
      <View style={{ gap: 8 }}>
        <EventoCard
          evento={item}
          variant="lista"
          onPress={() => {
            if (canManage) editEvent(item.id);
          }}
          trailing={<Chip label={status.label} tone={status.tone} />}
        />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4 }}>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            {isPending ? <Chip label="PEDIDO DE JOGADOR" tone="lilac" /> : null}
            <MipoText variant="caption" numberOfLines={1}>
              {`Por: ${item.creator?.name || "Usuário"}`}
            </MipoText>
          </View>
          {canManage ? (
            <>
              <IconButton icon={Pencil} accessibilityLabel={`Editar ${item.title}`} onPress={() => editEvent(item.id)} size={36} />
              <IconButton icon={Trash2} accessibilityLabel={`Excluir ${item.title}`} onPress={() => handleDelete(item.id)} size={36} />
            </>
          ) : null}
        </View>
        {isAdmin && isPending ? (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button label="Aprovar" icon={Check} variant="lime" size="sm" onPress={() => handleApprove(item.id)} style={{ flex: 1 }} />
            <Button
              label="Recusar"
              icon={X}
              variant="ghost"
              size="sm"
              onPress={() => {
                setSelectedId(item.id);
                setRejectModalVisible(true);
              }}
              style={{ flex: 1 }}
            />
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <Screen>
      <ScreenHeader title="Eventos" subtitle={`${events.length} eventos registrados`} />

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -14, flexGrow: 0 }}
          contentContainerStyle={{ paddingHorizontal: 14, gap: 8, paddingVertical: 4 }}
        >
          {statusFilters.map((filter) => (
            <Chip
              key={filter.value}
              label={filter.label}
              tone={statusFilter === filter.value ? "active" : "neutral"}
              selected={statusFilter === filter.value}
              onPress={() => setStatusFilter(filter.value)}
            />
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <LoadingState />
      ) : (
        <FlatList
          data={visibleEvents}
          keyExtractor={(item) => item.id}
          renderItem={renderEvent}
          style={{ marginHorizontal: -14 }}
          contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: bottomReserve + 80, gap: 18 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState character="peao2" title="Nenhum evento encontrado." />}
        />
      )}

      <View pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
        <Fab icon={Plus} accessibilityLabel="Criar evento" onPress={() => navigation.navigate("AdminCreateEvent")} />
      </View>

      <BottomSheet visible={rejectModalVisible} onClose={closeRejectSheet}>
        <MipoText variant="section">Recusar Evento</MipoText>
        <FieldLabel>Motivo da recusa</FieldLabel>
        <Input
          value={reason}
          onChangeText={setReason}
          placeholder="Ex: Local indisponível nesta data..."
          multiline
          numberOfLines={4}
          containerStyle={{ minHeight: 100 }}
        />
        <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
          <Button label="Voltar" variant="ghost" onPress={closeRejectSheet} style={{ flex: 1 }} />
          <Button label="Confirmar Recusa" variant="red" onPress={handleReject} style={{ flex: 1 }} />
        </View>
      </BottomSheet>
    </Screen>
  );
}
