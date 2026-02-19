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
} from "react-native";
import { Check, X, Clock, User, Calendar } from "lucide-react-native";
import { api } from "../services/api";
import { useFocusEffect } from "@react-navigation/native";

export default function AdminApprovalsScreen() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal de Rejeição
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Carrega sempre que a tela ganha foco
  useFocusEffect(
    React.useCallback(() => {
      loadPendingEvents();
    }, []),
  );

  async function loadPendingEvents() {
    try {
      const response = await api.get("/events/pending");
      setApprovals(response.data);
    } catch (error) {
      console.log("Erro ao carregar pendências", error);
    } finally {
      setLoading(false);
    }
  }

  const handleApprove = async (id: string) => {
    try {
      await api.patch(`/events/${id}/approve`);
      Alert.alert("Sucesso", "Evento aprovado e notificado!");
      loadPendingEvents();
    } catch (error) {
      Alert.alert("Erro", "Não foi possível aprovar.");
    }
  };

  const openRejectModal = (id: string) => {
    setSelectedId(id);
    setRejectReason("");
    setRejectModalVisible(true);
  };

  const confirmReject = async () => {
    if (!rejectReason) return Alert.alert("Atenção", "Informe o motivo.");

    try {
      await api.patch(`/events/${selectedId}/reject`, { reason: rejectReason });
      setRejectModalVisible(false);
      Alert.alert("Sucesso", "Evento reprovado.");
      loadPendingEvents();
    } catch (error) {
      Alert.alert("Erro", "Falha ao reprovar.");
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return `${date.getDate()}/${date.getMonth() + 1} às ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#E11D48" />
      </View>
    );

  return (
    <View style={styles.container}>
      <FlatList
        data={approvals}
        keyExtractor={(item: any) => item.id}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhum pedido pendente.</Text>
        }
        renderItem={({ item }) => (
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
                <Text style={styles.metaText}>
                  Criado por: {item.creator?.name}
                </Text>
              </View>

              <View style={styles.metaRow}>
                <Calendar size={14} color="#64748b" />
                <Text style={styles.metaText}>{formatDate(item.dateTime)}</Text>
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.btnApprove}
                onPress={() => handleApprove(item.id)}
              >
                <Check color="#fff" size={20} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnReject}
                onPress={() => openRejectModal(item.id)}
              >
                <X color="#fff" size={20} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Modal para Motivo da Reprovação */}
      <Modal visible={rejectModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Motivo da Reprovação</Text>
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
                <Text style={styles.btnTextConfirm}>Confirmar Reprovação</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 15 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { textAlign: "center", color: "#94a3b8", marginTop: 50 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
  },
  info: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  titleText: { fontSize: 16, fontWeight: "bold", color: "#1e293b" },
  badge: {
    backgroundColor: "#e0e7ff",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: { fontSize: 10, color: "#4338ca", fontWeight: "bold" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  metaText: { fontSize: 12, color: "#64748b" },
  actions: { flexDirection: "row", gap: 10, paddingLeft: 10 },
  btnApprove: { backgroundColor: "#10b981", padding: 10, borderRadius: 12 },
  btnReject: { backgroundColor: "#ef4444", padding: 10, borderRadius: 12 },

  // Modal Styles
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
