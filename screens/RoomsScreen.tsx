import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Image,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import {
  DoorOpen,
  Users,
  Clock,
  Plus,
  X,
  CheckCircle2,
} from "lucide-react-native";
import { FadeInView } from "../components/FadeInView";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { SafeAreaView } from "react-native-safe-area-context";

interface Room {
  id: string;
  game: string;
  organizer: { id: string; name: string } | null;
  date: string;
  time: string;
  participants: number;
  maxParticipants: number;
  isPublic: boolean;
  description: string | null;
  chatId?: string | null;
}

export default function RoomsScreen({ navigation }: any) {
  const queryClient = useQueryClient();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: rooms = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const res = await api.get("/rooms", { params: { skip: 0, take: 30 } });
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    },
  });

  const joinMutation = useMutation({
    mutationFn: (roomId: string) => api.post(`/rooms/${roomId}/join`),
    onSuccess: (response: any) => {
      const data = response.data;
      const chatId = data?.chatId || data?.room?.chatId;
      const roomName = data?.room?.game || selectedRoom?.game;
      setSelectedRoom(null);
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      if (chatId) {
        navigation.navigate("ChatDetail", { chatId, name: roomName });
      } else {
        Alert.alert("Sucesso", "Você entrou na sala!");
      }
    },
    onError: (error: any) => {
      Alert.alert(
        "Erro",
        error.response?.data?.message || "Erro ao entrar na sala",
      );
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleJoinRoom = (room: Room) => {
    setSelectedRoom(room);
  };

  const handleConfirmJoin = () => {
    if (!selectedRoom) return;
    if (selectedRoom.participants >= selectedRoom.maxParticipants) {
      Alert.alert("Sala cheia", "Esta sala já está lotada.");
      setSelectedRoom(null);
      return;
    }
    joinMutation.mutate(selectedRoom.id);
  };

  const organizerName = selectedRoom?.organizer?.name ?? "Organizador";

  const renderRoom = ({ item, index }: { item: Room; index: number }) => {
    const organizerName = item.organizer?.name ?? "Organizador";
    const participants = item.participants ?? 0;
    const maxParticipants = item.maxParticipants ?? 4;
    const isFull = participants >= maxParticipants;

    return (
      <FadeInView delay={index * 80} style={styles.cardWrapper}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.gameTitle}>{item.game}</Text>
              <Text style={styles.organizer}>
                Organizado por {organizerName}
              </Text>
            </View>
            <View
              style={[
                styles.badge,
                { backgroundColor: item.isPublic ? "#dcfce7" : "#fee2e2" },
              ]}
            >
              <Text
                style={{
                  color: item.isPublic ? "#166534" : "#991b1b",
                  fontSize: 10,
                  fontWeight: "bold",
                }}
              >
                {item.isPublic ? "PÚBLICA" : "PRIVADA"}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Clock size={16} color="#64748b" />
              <Text style={styles.infoText}>
                {item.date} às {item.time}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Users size={16} color="#64748b" />
              <Text style={styles.infoText}>
                {participants}/{maxParticipants}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.joinButton, isFull && styles.disabledButton]}
            disabled={isFull}
            onPress={() => handleJoinRoom(item)}
          >
            <Text style={styles.joinButtonText}>
              {isFull ? "Sala Cheia" : "Ver Detalhes"}
            </Text>
          </TouchableOpacity>
        </View>
      </FadeInView>
    );
  };

  if (isLoading && rooms.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#c73636" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Salas Disponíveis</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate("CriarSala")}
        >
          <Plus color="#fff" size={20} />
          <Text style={styles.createButtonText}>Criar</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={rooms}
        renderItem={renderRoom}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#c73636"]}
          />
        }
      />

      <Modal
        visible={!!selectedRoom}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedRoom(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeModal}
              onPress={() => setSelectedRoom(null)}
            >
              <X color="#94a3b8" size={24} />
            </TouchableOpacity>

            <Image
              source={{
                uri: "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?q=80&w=500",
              }}
              style={styles.roomImage}
            />

            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalTitle}>{selectedRoom?.game}</Text>
              <Text style={styles.modalOrganizer}>
                Organizado por {organizerName}
              </Text>

              <Text style={styles.sectionTitle}>Descrição</Text>
              <Text style={styles.modalDescription}>
                {selectedRoom?.description || "Sem descrição."}
              </Text>

              <Text style={styles.sectionTitle}>Participantes</Text>
              <View style={styles.playerList}>
                <View style={styles.playerItem}>
                  <CheckCircle2 size={16} color="#c73636" />
                  <Text style={styles.playerName}>
                    {organizerName} (Mestre)
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleConfirmJoin}
                disabled={
                  joinMutation.isPending ||
                  (selectedRoom?.participants ?? 0) >=
                    (selectedRoom?.maxParticipants ?? 4)
                }
              >
                {joinMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmBtnText}>
                    Confirmar e Entrar no Chat
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#faf6f1" },
  centered: { justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  title: { fontSize: 22, fontWeight: "bold", color: "#1e293b" },
  createButton: {
    flexDirection: "row",
    backgroundColor: "#c73636",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  createButtonText: { color: "#fff", fontWeight: "bold", marginLeft: 4 },
  listContent: { padding: 16 },
  cardWrapper: { marginBottom: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  gameTitle: { fontSize: 18, fontWeight: "bold", color: "#1e293b" },
  organizer: { fontSize: 14, color: "#64748b" },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  infoRow: { flexDirection: "row", gap: 16, marginBottom: 16 },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoText: { fontSize: 14, color: "#475569" },
  joinButton: {
    backgroundColor: "#c73636",
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  joinButtonText: { color: "#fff", fontWeight: "600" },
  disabledButton: { backgroundColor: "#cbd5e1" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "80%",
    paddingBottom: 20,
  },
  closeModal: { alignSelf: "flex-end", padding: 16, zIndex: 10 },
  roomImage: { width: "100%", height: 180, marginTop: -40 },
  modalBody: { padding: 20 },
  modalTitle: { fontSize: 24, fontWeight: "bold", color: "#1e293b" },
  modalOrganizer: { fontSize: 16, color: "#c73636", marginBottom: 20 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginTop: 20,
    marginBottom: 10,
  },
  modalDescription: { fontSize: 15, color: "#475569", lineHeight: 22 },
  playerList: { marginTop: 5 },
  playerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  playerName: { fontSize: 15, color: "#334155" },
  modalFooter: { padding: 20, borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  confirmBtn: {
    backgroundColor: "#c73636",
    height: 54,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
