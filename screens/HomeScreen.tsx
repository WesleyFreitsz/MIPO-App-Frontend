import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import {
  Users,
  Calendar,
  TrendingUp,
  X,
  MapPin,
  CheckCircle,
  MessageCircle,
  Camera,
  Gamepad2,
} from "lucide-react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

const { width } = Dimensions.get("window");
const COLORS = {
  primary: "#c73636",
  background: "#faf6f1",
  card: "#ffffff",
  text: "#1c1917",
};

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [nextEvents, setNextEvents] = useState<any[]>([]);
  const [featuredGames, setFeaturedGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permissão Necessária",
          "Precisamos de acesso à câmera para o check-in.",
        );
      }
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [modalVisible]),
  );

  async function fetchDashboardData() {
    try {
      // Busca Eventos
      const resEvents = await api.get("/events");
      const now = new Date();
      const activeEvents = resEvents.data
        .filter(
          (e: any) =>
            new Date(e.dateTime) >= new Date(now.setHours(0, 0, 0, 0)) &&
            e.status === "APPROVED",
        )
        .sort(
          (a: any, b: any) =>
            new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime(),
        )
        .slice(0, 3);
      setNextEvents(activeEvents);

      // Busca Jogos em Destaque
      const resGames = await api.get("/games?isFeatured=true");
      setFeaturedGames(resGames.data);

      if (modalVisible && selectedEvent) {
        const updated = resEvents.data.find(
          (e: any) => e.id === selectedEvent.id,
        );
        if (updated) setSelectedEvent(updated);
      }
    } catch (error) {
      console.log("Erro ao buscar dados", error);
    } finally {
      setLoading(false);
    }
  }

  const handleToggleParticipation = async () => {
    try {
      await api.post(`/events/${selectedEvent.id}/toggle`);
      fetchDashboardData();
    } catch (e) {
      Alert.alert("Erro", "Não foi possível atualizar sua presença.");
    }
  };

  const handleCheckIn = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      try {
        await api.post(`/events/${selectedEvent.id}/checkin`);
        Alert.alert(
          "Sucesso!",
          "Check-in realizado! Você ganhou pontos de participação.",
        );
        setModalVisible(false);
        fetchDashboardData();
      } catch (e: any) {
        Alert.alert(
          "Erro",
          e.response?.data?.message || "Falha ao realizar check-in.",
        );
      }
    }
  };

  const now = new Date();
  const eventStartTime = selectedEvent
    ? new Date(selectedEvent.dateTime)
    : null;
  const getDay = (dateIso: string) => new Date(dateIso).getDate();
  const getMonth = (dateIso: string) =>
    new Date(dateIso)
      .toLocaleDateString("pt-BR", { month: "short" })
      .toUpperCase()
      .replace(".", "");
  const getTime = (dateIso: string) =>
    new Date(dateIso).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const isConfirmed = selectedEvent?.participants?.some(
    (p: any) => p.id === user?.id,
  );
  const isEventDay =
    selectedEvent &&
    new Date().toDateString() ===
      new Date(selectedEvent.dateTime).toDateString();
  const hasCheckedIn = selectedEvent?.checkedInUserIds?.includes(user?.id);
  const canShowCheckIn =
    isConfirmed && eventStartTime && now >= eventStartTime && !hasCheckedIn;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
        style={styles.container}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.bannerContainer}>
          <Image
            source={require("../assets/Captura de tela 2026-02-16 223704.png")}
            style={styles.bannerImage}
            resizeMode="cover"
          />
          <View style={styles.bannerOverlay} />
        </View>

        {/* NOSSOS JOGOS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🎯 Nossos Jogos</Text>
            <TouchableOpacity onPress={() => navigation.navigate("GamesList")}>
              <Text style={styles.seeMore}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : featuredGames.length === 0 ? (
            <Text style={styles.emptyText}>
              Nenhum jogo em destaque no momento.
            </Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 20 }}
            >
              {featuredGames.map((game) => (
                <TouchableOpacity
                  key={game.id}
                  style={styles.gameCard}
                  onPress={() =>
                    navigation.navigate("GameDetail", { gameId: game.id })
                  }
                >
                  {game.imageUrl ? (
                    <Image
                      source={{ uri: game.imageUrl }}
                      style={styles.gameImage}
                    />
                  ) : (
                    <View
                      style={[
                        styles.gameImage,
                        {
                          backgroundColor: "#e2e8f0",
                          justifyContent: "center",
                          alignItems: "center",
                        },
                      ]}
                    >
                      <Gamepad2 color="#94a3b8" size={32} />
                    </View>
                  )}
                  <View style={styles.gameContent}>
                    <Text style={styles.gameTitle} numberOfLines={1}>
                      {game.name}
                    </Text>
                    <Text style={styles.gameCategory}>{game.category}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* EVENTOS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🎲 Próximos Eventos</Text>
            <TouchableOpacity onPress={() => navigation.navigate("EventsList")}>
              <Text style={styles.seeMore}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : nextEvents.length === 0 ? (
            <Text style={styles.emptyText}>
              Nenhum evento agendado em breve.
            </Text>
          ) : (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              snapToAlignment="center"
              contentContainerStyle={styles.swiperContainer}
            >
              {nextEvents.map((event) => (
                <TouchableOpacity
                  key={event.id}
                  style={styles.swiperCard}
                  onPress={() => {
                    setSelectedEvent(event);
                    setModalVisible(true);
                  }}
                >
                  <View style={styles.eventDateBadge}>
                    <Text style={styles.dateDay}>{getDay(event.dateTime)}</Text>
                    <Text style={styles.dateMonth}>
                      {getMonth(event.dateTime)}
                    </Text>
                  </View>
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle} numberOfLines={1}>
                      {event.title}
                    </Text>
                    <Text style={styles.eventDetails} numberOfLines={1}>
                      {event.space === "PERSONALIZADO"
                        ? event.customLocation
                        : event.space}{" "}
                      • {getTime(event.dateTime)}
                    </Text>
                  </View>
                  <View style={styles.eventAction}>
                    <Text style={styles.actionText}>Ver</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>

      {/* MODAL DE DETALHES DO EVENTO */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalhes do Evento</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X color="#64748b" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedEvent?.bannerUrl ? (
                <Image
                  source={{ uri: selectedEvent.bannerUrl }}
                  style={styles.modalBanner}
                />
              ) : (
                <View
                  style={[
                    styles.modalBanner,
                    {
                      backgroundColor: "#c73636",
                      justifyContent: "center",
                      alignItems: "center",
                    },
                  ]}
                >
                  <Calendar size={48} color="#fff" />
                </View>
              )}

              <View style={styles.modalBody}>
                <Text style={styles.eventTitleLarge}>
                  {selectedEvent?.title}
                </Text>

                <View style={styles.detailRow}>
                  <Calendar size={18} color="#c73636" />
                  <Text style={styles.detailText}>
                    {selectedEvent &&
                      new Date(
                        selectedEvent.dateTime,
                      ).toLocaleDateString()}{" "}
                    às {selectedEvent && getTime(selectedEvent.dateTime)}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <MapPin size={18} color="#c73636" />
                  <Text style={styles.detailText}>
                    {selectedEvent?.space === "PERSONALIZADO"
                      ? selectedEvent.customLocation
                      : selectedEvent?.space}
                  </Text>
                </View>

                <Text style={styles.sectionSubtitle}>Descrição</Text>
                <Text style={styles.descriptionText}>
                  {selectedEvent?.description}
                </Text>

                <Text style={styles.sectionSubtitle}>
                  Participantes Confirmados
                </Text>

                <View style={styles.participantRow}>
                  {selectedEvent?.participants?.length > 0 ? (
                    selectedEvent.participants.map((p: any) => (
                      <View key={p.id} style={styles.miniAvatarContainer}>
                        <Image
                          source={{
                            uri:
                              p.avatarUrl ||
                              `https://api.dicebear.com/7.x/initials/svg?seed=${p.name}`,
                          }}
                          style={styles.miniAvatar}
                        />
                        <Text style={styles.miniName} numberOfLines={1}>
                          {p.nickname || p.name.split(" ")[0]}
                        </Text>
                        <View style={styles.confirmedBadge}>
                          <CheckCircle size={10} color="#fff" />
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyText}>
                      Ninguém confirmado ainda.
                    </Text>
                  )}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              {isConfirmed ? (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleToggleParticipation}
                  >
                    <Text style={styles.cancelButtonText}>
                      Cancelar Presença
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.chatButton}
                    onPress={() => {
                      setModalVisible(false);
                      navigation.navigate("ChatDetail", {
                        chatId: selectedEvent.chatId, // ESSENCIAL: ID do chat do banco de dados
                        name: selectedEvent.title,
                        type: "EVENT", // ESSENCIAL: Define que é um evento
                        avatar: selectedEvent.bannerUrl,
                        targetId: selectedEvent.id, // ESSENCIAL: ID do Evento para buscar os detalhes
                      });
                    }}
                  >
                    <MessageCircle color="#fff" size={20} />
                    <Text style={styles.confirmButtonText}>Chat</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleToggleParticipation}
                >
                  <Text style={styles.confirmButtonText}>
                    Confirmar Presença
                  </Text>
                </TouchableOpacity>
              )}

              {isConfirmed && isEventDay && canShowCheckIn && (
                <TouchableOpacity
                  style={styles.checkInButton}
                  onPress={handleCheckIn}
                >
                  <Camera color="#fff" size={20} />
                  <Text style={styles.confirmButtonText}>
                    Fazer Check-in (Ganhar Pontos)
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#faf6f1" },
  bannerContainer: {
    marginTop: 40,
    height: 180,
    width: width,
    overflow: "hidden",
  },
  bannerImage: { width: width, height: 180 },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: -40,
    zIndex: 10,
  },
  statCard: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 20,
    width: "30%",
    alignItems: "center",
    elevation: 6,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#fef2f2",
    justifyContent: "center",
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginTop: 5,
  },
  statLabel: { fontSize: 11, color: "#64748b", fontWeight: "500" },
  section: { paddingHorizontal: 20, marginTop: 30 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: { fontSize: 20, fontWeight: "bold", color: "#1e293b" },
  seeMore: { color: "#c73636", fontWeight: "600", fontSize: 14 },
  emptyText: {
    color: "#94a3b8",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 10,
  },

  // Games
  gameCard: {
    width: 140,
    backgroundColor: "#fff",
    borderRadius: 16,
    marginRight: 15,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  gameImage: { width: "100%", height: 140 },
  gameContent: { padding: 12 },
  gameTitle: { fontSize: 14, fontWeight: "bold", color: "#1e293b" },
  gameCategory: { fontSize: 12, color: "#64748b", marginTop: 2 },

  // Events
  swiperContainer: { paddingRight: 40 },
  swiperCard: {
    width: width - 40,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginRight: 10,
  },
  eventDateBadge: {
    backgroundColor: "#f1f5f9",
    padding: 10,
    borderRadius: 12,
    alignItems: "center",
    width: 60,
  },
  dateDay: { fontSize: 18, fontWeight: "bold", color: "#c73636" },
  dateMonth: { fontSize: 10, fontWeight: "bold", color: "#64748b" },
  eventInfo: { flex: 1, marginLeft: 15 },
  eventTitle: { fontSize: 16, fontWeight: "bold", color: "#1e293b" },
  eventDetails: { fontSize: 13, color: "#64748b", marginTop: 2 },
  eventAction: {
    backgroundColor: "#c73636",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionText: { color: "#fff", fontWeight: "bold", fontSize: 12 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    height: "85%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#1e293b" },
  modalBanner: { width: "100%", height: 200 },
  modalBody: { padding: 20 },
  eventTitleLarge: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 15,
  },
  detailRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  detailText: { marginLeft: 10, color: "#475569", fontSize: 16 },
  sectionSubtitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginTop: 20,
    marginBottom: 10,
  },
  descriptionText: { color: "#64748b", fontSize: 15, lineHeight: 22 },
  participantRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 15,
    marginTop: 10,
    marginBottom: 20,
  },
  miniAvatarContainer: {
    alignItems: "center",
    width: 60,
    position: "relative",
  },
  miniAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    borderWidth: 2,
    borderColor: "#c73636",
  },
  miniName: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 4,
    textAlign: "center",
  },
  confirmedBadge: {
    position: "absolute",
    right: 5,
    top: 0,
    backgroundColor: "#10b981",
    borderRadius: 10,
    padding: 2,
  },
  modalFooter: { paddingHorizontal: 20, gap: 10 },
  actionRow: { flexDirection: "row", gap: 10, width: "100%" },
  confirmButton: {
    backgroundColor: "#c73636",
    padding: 16,
    borderRadius: 15,
    alignItems: "center",
    width: "100%",
    marginBottom: 10,
  },
  confirmButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    padding: 16,
    borderRadius: 15,
    alignItems: "center",
    marginBottom: 10,
  },
  cancelButtonText: { color: "#64748b", fontWeight: "bold", fontSize: 15 },
  chatButton: {
    flex: 1,
    backgroundColor: "#0d9488",
    padding: 16,
    borderRadius: 15,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 10,
  },
  checkInButton: {
    backgroundColor: "#10b981",
    padding: 16,
    borderRadius: 15,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 10,
  },
});
