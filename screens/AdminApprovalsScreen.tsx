import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import {
  Check,
  X,
  Clock,
  User,
  Calendar,
  DollarSign,
} from "lucide-react-native";
import { api } from "../services/api";
import { useFocusEffect } from "@react-navigation/native";

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

export default function AdminApprovalsScreen() {
  const [approvals, setApprovals] = useState<Event[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"events" | "reservations">(
    "events",
  );

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
        api.get("/salinha/reservations/pending").catch(() => ({ data: [] })),
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
      await api.patch(`/salinha/reservations/${id}/approve`);
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
        await api.patch(`/salinha/reservations/${selectedId}/reject`, {
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

  const renderEventItem = (item: Event) => (
    <View style={styles.card}>
      <View style={styles.info}>
        <View style={styles.headerRow}>
          <Text style={styles.titleText}>{item.title}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.space}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <User size={14} color="#64748b" />
          <Text style={styles.metaText}>Criado por: {item.creator?.name}</Text>
        </View>

        <View style={styles.metaRow}>
          <Calendar size={14} color="#64748b" />
          <Text style={styles.metaText}>{formatDate(item.dateTime)}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.btnApprove}
          onPress={() => handleApproveEvent(item.id)}
        >
          <Check color="#fff" size={20} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnReject}
          onPress={() => openRejectModal(item.id, "event")}
        >
          <X color="#fff" size={20} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderReservationItem = (item: Reservation) => (
    <View style={styles.card}>
      <View style={styles.info}>
        <View style={styles.headerRow}>
          <Text style={styles.titleText}>Reserva da Salinha</Text>
          <View style={[styles.badge, { backgroundColor: "#fecaca" }]}>
            <Text style={styles.badgeText}>
              R$ {item.totalPrice.toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <User size={14} color="#64748b" />
          <Text style={styles.metaText}>{item.user?.name}</Text>
        </View>

        <View style={styles.metaRow}>
          <Calendar size={14} color="#64748b" />
          <Text style={styles.metaText}>{item.date}</Text>
        </View>

        <View style={styles.metaRow}>
          <Clock size={14} color="#64748b" />
          <Text style={styles.metaText}>
            {item.startTime} - {item.endTime}
          </Text>
        </View>

        <View style={styles.paymentInfo}>
          <DollarSign size={14} color="#10b981" />
          <Text style={styles.paymentText}>
            Aguardando comprovante no Instagram @mipojogos
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.btnApprove}
          onPress={() => handleApproveReservation(item.id)}
        >
          <Check color="#fff" size={20} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnReject}
          onPress={() => openRejectModal(item.id, "reservation")}
        >
          <X color="#fff" size={20} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#E11D48" />
      </View>
    );

  const isEmpty =
    activeTab === "events" ? approvals.length === 0 : reservations.length === 0;

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "events" && styles.tabActive]}
          onPress={() => setActiveTab("events")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "events" && styles.tabTextActive,
            ]}
          >
            Eventos ({approvals.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "reservations" && styles.tabActive]}
          onPress={() => setActiveTab("reservations")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "reservations" && styles.tabTextActive,
            ]}
          >
            Salinhas ({reservations.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <FlatList
        data={activeTab === "events" ? approvals : reservations}
        keyExtractor={(item: any) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>Nada pendente. ✨</Text>}
        renderItem={({ item }) =>
          activeTab === "events"
            ? renderEventItem(item)
            : renderReservationItem(item)
        }
        contentContainerStyle={isEmpty ? styles.emptyContainer : null}
      />

      {/* Modal para Motivo da Reprovação */}
      <Modal visible={rejectModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {selectedType === "event"
                ? "Motivo da Reprovação"
                : "Motivo da Rejeição"}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Data indisponível..."
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setRejectModalVisible(false)}
                style={styles.modalBtnCancel}
              >
                <Text style={styles.btnTextCancel}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmReject}
                style={styles.modalBtnConfirm}
              >
                <Text style={styles.btnTextConfirm}>Confirmar Rejeição</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { textAlign: "center", color: "#94a3b8", marginTop: 50 },
  emptyContainer: { flexGrow: 1, justifyContent: "center" },

  // Tabs
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#c73636",
  },
  tabText: { fontSize: 14, color: "#64748b", fontWeight: "500" },
  tabTextActive: { color: "#c73636", fontWeight: "bold" },

  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    marginHorizontal: 15,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
  },
  info: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  titleText: { fontSize: 16, fontWeight: "bold", color: "#1e293b" },
  badge: {
    backgroundColor: "#e0e7ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: { fontSize: 11, color: "#4338ca", fontWeight: "bold" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  metaText: { fontSize: 12, color: "#64748b" },
  paymentInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  paymentText: { fontSize: 11, color: "#047857", fontWeight: "500" },
  actions: { flexDirection: "row", gap: 10, paddingLeft: 10 },
  btnApprove: { backgroundColor: "#10b981", padding: 10, borderRadius: 12 },
  btnReject: { backgroundColor: "#ef4444", padding: 10, borderRadius: 12 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalBox: { backgroundColor: "#fff", borderRadius: 16, padding: 20 },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#1e293b",
  },
  modalInput: {
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    padding: 12,
    height: 80,
    textAlignVertical: "top",
    marginBottom: 15,
  },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  modalBtnCancel: { padding: 10 },
  modalBtnConfirm: { backgroundColor: "#ef4444", padding: 10, borderRadius: 8 },
  btnTextCancel: { color: "#64748b" },
  btnTextConfirm: { color: "#fff", fontWeight: "bold" },
});
