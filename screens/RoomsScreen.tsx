import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Image,
  ScrollView,
} from "react-native";
import {
  DoorOpen,
  Users,
  Clock,
  Plus,
  X,
  CheckCircle2,
} from "lucide-react-native";

const mockRooms = [
  {
    id: "1",
    organizer: "Carlos M.",
    game: "Dixit",
    date: "Hoje",
    time: "20:00",
    participants: 3,
    maxParticipants: 6,
    isPublic: true,
    description:
      "Uma partida leve para relaxar e usar a imaginação. Aceitamos novatos!",
  },
  {
    id: "2",
    organizer: "Ana S.",
    game: "Azul",
    date: "Amanhã",
    time: "15:00",
    participants: 2,
    maxParticipants: 4,
    isPublic: true,
    description: "Busco jogadores que já conheçam as regras básicas de Azul.",
  },
  {
    id: "3",
    organizer: "Pedro L.",
    game: "Pandemic",
    date: "Amanhã",
    time: "19:00",
    participants: 4,
    maxParticipants: 4,
    isPublic: false,
    description: "Grupo fechado para campanha.",
  },
];

export default function RoomsScreen({ navigation }: any) {
  const [selectedRoom, setSelectedRoom] = useState<any>(null);

  const renderRoom = ({ item }: { item: (typeof mockRooms)[0] }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.gameTitle}>{item.game}</Text>
          <Text style={styles.organizer}>Organizado por {item.organizer}</Text>
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
            {item.participants}/{item.maxParticipants}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.joinButton,
          item.participants === item.maxParticipants && styles.disabledButton,
        ]}
        disabled={item.participants === item.maxParticipants}
        onPress={() => setSelectedRoom(item)}
      >
        <Text style={styles.joinButtonText}>
          {item.participants === item.maxParticipants
            ? "Sala Cheia"
            : "Ver Detalhes"}
        </Text>
      </TouchableOpacity>
    </View>
  );

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
        data={mockRooms}
        renderItem={renderRoom}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />

      {/* Modal de Detalhes da Sala */}
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
                Organizado por {selectedRoom?.organizer}
              </Text>

              <Text style={styles.sectionTitle}>Descrição</Text>
              <Text style={styles.modalDescription}>
                {selectedRoom?.description}
              </Text>

              <Text style={styles.sectionTitle}>Jogadores Atuais</Text>
              <View style={styles.playerList}>
                <View style={styles.playerItem}>
                  <CheckCircle2 size={16} color="#6366f1" />
                  <Text style={styles.playerName}>
                    {selectedRoom?.organizer} (Mestre)
                  </Text>
                </View>
                <View style={styles.playerItem}>
                  <CheckCircle2 size={16} color="#6366f1" />
                  <Text style={styles.playerName}>Jogador 2</Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={() => {
                  const roomName = selectedRoom.game;
                  setSelectedRoom(null);
                  navigation.navigate("ChatDetail", { name: roomName });
                }}
              >
                <Text style={styles.confirmBtnText}>
                  Confirmar e Entrar no Chat
                </Text>
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
    backgroundColor: "#6366f1",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  createButtonText: { color: "#fff", fontWeight: "bold", marginLeft: 4 },
  listContent: { padding: 16 },
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
    backgroundColor: "#6366f1",
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  joinButtonText: { color: "#fff", fontWeight: "600" },
  disabledButton: { backgroundColor: "#cbd5e1" },

  // Estilos do Modal
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
  modalOrganizer: { fontSize: 16, color: "#6366f1", marginBottom: 20 },
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
    backgroundColor: "#6366f1",
    height: 54,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
