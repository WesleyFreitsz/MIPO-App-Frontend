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
  Clock,
  CheckCircle,
  MessageCircle,
  Camera,
} from "lucide-react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker"; // Certifique-se de ter instalado
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

const { width } = Dimensions.get("window");

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [nextEvents, setNextEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
  // Estados para o Modal de Detalhes
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, [modalVisible]), // Atualiza quando fecha o modal também
  );

  async function fetchEvents() {
    try {
      const response = await api.get("/events");
      const now = new Date();

      // Filtra apenas eventos APROVADOS e que não passaram do dia de hoje
      const active = response.data
        .filter((e: any) => {
          const eventDate = new Date(e.dateTime);
          return (
            eventDate >= new Date(now.setHours(0, 0, 0, 0)) &&
            e.status === "APPROVED"
          );
        })
        .sort(
          (a: any, b: any) =>
            new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime(),
        )
        .slice(0, 3);

      setNextEvents(active);

      // Se o modal estiver aberto, atualiza o objeto do evento selecionado (para ver participantes em tempo real)
      if (modalVisible && selectedEvent) {
        const updated = response.data.find(
          (e: any) => e.id === selectedEvent.id,
        );
        if (updated) setSelectedEvent(updated);
      }
    } catch (error) {
      console.log("Erro ao buscar eventos", error);
    } finally {
      setLoading(false);
    }
  }

  const handleToggleParticipation = async () => {
    try {
      await api.post(`/events/${selectedEvent.id}/toggle`);
      fetchEvents(); // Recarrega dados para atualizar lista de participantes
    } catch (e) {
      Alert.alert("Erro", "Não foi possível atualizar sua presença.");
    }
  };

  const handleCheckIn = async () => {
    // Configurações da câmera: permite edição (crop) e define a qualidade
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1], // Opcional: força a foto a ser quadrada
      quality: 0.5,
    });

    // Verifica se o usuário não cancelou a foto
    if (!result.canceled) {
      try {
        // Envia a requisição para a rota de check-in que você criou no backend
        await api.post(`/events/${selectedEvent.id}/checkin`);

        Alert.alert(
          "Sucesso!",
          "Check-in realizado! Você ganhou pontos de participação.",
        );

        setModalVisible(false);
        fetchEvents(); // Atualiza a lista para mostrar que você já fez o check-in
      } catch (e: any) {
        const msg = e.response?.data?.message || "Falha ao realizar check-in.";
        Alert.alert("Erro", msg);
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

  // Verificações de estado para o usuário logado
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
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} bounces={false}>
        {/* Banner Principal */}
        <View style={styles.bannerContainer}>
          <Image
            source={require("../assets/Captura de tela 2026-02-16 223704.png")}
            style={styles.bannerImage}
            resizeMode="cover"
          />
          <View style={styles.bannerOverlay} />
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          {[
            { icon: Users, label: "Jogadores", value: "248" },
            { icon: Calendar, label: "Eventos", value: "12" },
            { icon: TrendingUp, label: "Partidas", value: "1.2k" },
          ].map((stat, i) => (
            <View key={i} style={styles.statCard}>
              <stat.icon size={22} color="#E11D48" />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Swiper de Eventos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🎲 Próximos Eventos</Text>
            <TouchableOpacity onPress={() => navigation.navigate("EventsList")}>
              <Text style={styles.seeMore}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color="#E11D48" />
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

        {/* Salas */}
        <View style={[styles.section, { marginBottom: 30 }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🏠 Salas Recentes</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Salas")}>
              <Text style={styles.seeMore}>Ir para Salas</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.emptyText}>
            Explora a aba de Salas para encontrar parceiros!
          </Text>
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
                      backgroundColor: "#E11D48",
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
                  <Calendar size={18} color="#E11D48" />
                  <Text style={styles.detailText}>
                    {selectedEvent &&
                      new Date(
                        selectedEvent.dateTime,
                      ).toLocaleDateString()}{" "}
                    às {selectedEvent && getTime(selectedEvent.dateTime)}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <MapPin size={18} color="#E11D48" />
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
                        name: selectedEvent.title,
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
                  onPress={handleCheckIn} // Chama a função que abre a câmera
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
  container: { flex: 1, backgroundColor: "#f8fafc" },
  bannerContainer: { height: 230, width: width, overflow: "hidden" },
  bannerImage: { width: width, height: 230 },
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
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
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
  seeMore: { color: "#E11D48", fontWeight: "600" },
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
  dateDay: { fontSize: 18, fontWeight: "bold", color: "#E11D48" },
  dateMonth: { fontSize: 10, fontWeight: "bold", color: "#64748b" },
  eventInfo: { flex: 1, marginLeft: 15 },
  eventTitle: { fontSize: 16, fontWeight: "bold", color: "#1e293b" },
  eventDetails: { fontSize: 13, color: "#64748b", marginTop: 2 },
  eventAction: {
    backgroundColor: "#E11D48",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  emptyText: {
    color: "#94a3b8",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 10,
  },

  // Modal Styles
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

  // Participantes Reais (Bolinhas)
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
    borderColor: "#E11D48",
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

  // Botões de Ação
  modalFooter: { paddingHorizontal: 20, gap: 10 },
  actionRow: { flexDirection: "row", gap: 10, width: "100%" },
  confirmButton: {
    backgroundColor: "#E11D48",
    padding: 16,
    borderRadius: 15,
    alignItems: "center",
    width: "100%",
  },
  confirmButtonText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    padding: 16,
    borderRadius: 15,
    alignItems: "center",
  },
  cancelButtonText: { color: "#64748b", fontWeight: "bold", fontSize: 15 },
  chatButton: {
    flex: 1,
    backgroundColor: "#6366f1",
    padding: 16,
    borderRadius: 15,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  checkInButton: {
    backgroundColor: "#10b981",
    padding: 16,
    borderRadius: 15,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
});
