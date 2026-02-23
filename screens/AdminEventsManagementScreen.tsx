import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import {
  Edit3,
  Trash2,
  CheckCircle,
  XCircle,
  Calendar,
  Clock,
  ChevronRight,
  AlertCircle,
} from "lucide-react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AdminEventsManagementScreen({ navigation }: any) {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await api.get("/events/admin/all");
      setEvents(response.data);
    } catch (error: any) {
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

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "APPROVED":
        return { bg: "#dcfce7", text: "#166534", label: "Aprovado" };
      case "PENDING":
        return { bg: "#fef3c7", text: "#92400e", label: "Pendente" };
      case "CONCLUDED":
        return { bg: "#f1f5f9", text: "#475569", label: "Encerrado" };
      case "REPROVED":
        return { bg: "#fee2e2", text: "#991b1b", label: "Recusado" };
      default:
        return { bg: "#e2e8f0", text: "#64748b", label: status };
    }
  };

  const renderEvent = ({ item }: any) => {
    const statusInfo = getStatusStyle(item.status);
    const isAdmin = user?.role === "ADMIN";
    const isOwner = item.creator?.id === user?.id;
    const canManage = isAdmin || isOwner;

    return (
      <View
        style={[styles.card, item.status === "PENDING" && styles.pendingCard]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            <View
              style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}
            >
              <Text style={[styles.statusText, { color: statusInfo.text }]}>
                {statusInfo.label}
              </Text>
            </View>
          </View>
          <View style={styles.dateInfo}>
            <Calendar size={14} color="#64748b" />
            <Text style={styles.dateText}>
              {new Date(item.dateTime).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.creatorText}>
            Por: {item.creator?.name || "Usuário"}
          </Text>

          <View style={styles.actions}>
            {isAdmin && item.status === "PENDING" && (
              <>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleApprove(item.id)}
                >
                  <CheckCircle color="#10b981" size={22} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => {
                    setSelectedId(item.id);
                    setRejectModalVisible(true);
                  }}
                >
                  <XCircle color="#ef4444" size={22} />
                </TouchableOpacity>
              </>
            )}
            {canManage && (
              <>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() =>
                    navigation.navigate("AdminCreateEvent", {
                      eventId: item.id,
                    })
                  }
                >
                  <Edit3 color="#6366f1" size={20} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleDelete(item.id)}
                >
                  <Trash2 color="#ef4444" size={20} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gestão de Eventos</Text>
        <Text style={styles.headerSubtitle}>
          {events.length} eventos registrados
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#E11D48" />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={renderEvent}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <AlertCircle size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>Nenhum evento encontrado.</Text>
            </View>
          }
        />
      )}

      {/* Modal de Rejeição Estilizado */}
      <Modal visible={rejectModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Recusar Evento</Text>
            <Text style={styles.modalLabel}>Motivo da Recusa:</Text>
            <TextInput
              style={styles.modalInput}
              value={reason}
              onChangeText={setReason}
              placeholder="Ex: Local indisponível nesta data..."
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => {
                  setRejectModalVisible(false);
                  setReason("");
                }}
              >
                <Text style={styles.btnTextCancel}>Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnConfirm}
                onPress={handleReject}
              >
                <Text style={styles.btnTextConfirm}>Confirmar Recusa</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#1e293b" },
  headerSubtitle: { fontSize: 14, color: "#64748b", marginTop: 2 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16 },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
  },
  pendingCard: { borderColor: "#fbbf24", backgroundColor: "#fffbeb" },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  info: { flex: 1 },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 6,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: { fontSize: 10, fontWeight: "bold" },
  dateInfo: { flexDirection: "row", alignItems: "center", gap: 4 },
  dateText: { fontSize: 12, color: "#64748b" },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 10,
  },
  creatorText: { fontSize: 12, color: "#94a3b8", fontStyle: "italic" },
  actions: { flexDirection: "row", gap: 8 },
  actionBtn: {
    padding: 6,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },

  // Empty State
  emptyContainer: { alignItems: "center", marginTop: 100 },
  emptyText: { marginTop: 12, color: "#94a3b8", fontSize: 16 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 15,
  },
  modalLabel: { fontSize: 14, color: "#64748b", marginBottom: 8 },
  modalInput: {
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    padding: 12,
    textAlignVertical: "top",
    height: 100,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 20,
  },
  modalFooter: { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
  modalBtnCancel: { paddingVertical: 10, paddingHorizontal: 16 },
  modalBtnConfirm: {
    backgroundColor: "#ef4444",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  btnTextCancel: { color: "#64748b", fontWeight: "600" },
  btnTextConfirm: { color: "#fff", fontWeight: "bold" },
});
