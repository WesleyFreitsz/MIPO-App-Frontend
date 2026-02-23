import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  Dimensions,
  Alert,
  SafeAreaView,
} from "react-native";
import {
  Plus,
  Calendar,
  MapPin,
  Clock,
  X,
  CheckCircle,
  MessageCircle,
  Camera,
} from "lucide-react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

const { width } = Dimensions.get("window");

export default function EventsListScreen({ navigation }: any) {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para o Modal de Detalhes (Igual à Home)
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchEvents = async () => {
    try {
      const response = await api.get("/events");
      // Ordena por data (mais próximos primeiro)
      const sortedEvents = response.data.sort(
        (a: any, b: any) =>
          new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime(),
      );
      setEvents(sortedEvents);

      // Atualiza o evento selecionado se o modal estiver aberto
      if (modalVisible && selectedEvent) {
        const updated = response.data.find(
          (e: any) => e.id === selectedEvent.id,
        );
        if (updated) setSelectedEvent(updated);
      }
    } catch (error) {
      console.log("Erro ao carregar eventos:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, [modalVisible]),
  );

  // --- LÓGICA DE PARTICIPAÇÃO E CHECK-IN (IGUAL À HOME) ---
  const handleToggleParticipation = async () => {
    try {
      await api.post(`/events/${selectedEvent.id}/toggle`);
      fetchEvents();
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
        Alert.alert("Sucesso!", "Check-in realizado! Você ganhou pontos.");
        setModalVisible(false);
        fetchEvents();
      } catch (e: any) {
        const msg = e.response?.data?.message || "Falha ao realizar check-in.";
        Alert.alert("Erro", msg);
      }
    }
  };

  // --- HELPERS DE FORMATAÇÃO ---
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
    isConfirmed &&
    new Date() >= new Date(selectedEvent?.dateTime) &&
    !hasCheckedIn;

  // --- RENDERIZAÇÃO DO CARD ESTILIZADO ---
  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={() => {
        setSelectedEvent(item);
        setModalVisible(true);
      }}
    >
      {item.bannerUrl ? (
        <Image source={{ uri: item.bannerUrl }} style={styles.banner} />
      ) : (
        <View style={styles.placeholder}>
          <Calendar color="#fff" size={40} />
        </View>
      )}

      <View style={styles.cardContent}>
        <View style={styles.dateBadge}>
          <Text style={styles.dateDay}>
            {new Date(item.dateTime).getDate()}
          </Text>
          <Text style={styles.dateMonth}>
            {new Date(item.dateTime)
              .toLocaleDateString("pt-BR", { month: "short" })
              .toUpperCase()}
          </Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.metaRow}>
            <Clock size={14} color="#64748b" />
            <Text style={styles.metaText}>{getTime(item.dateTime)}</Text>
            <View style={styles.dot} />
            <MapPin size={14} color="#64748b" />
            <Text style={styles.metaText} numberOfLines={1}>
              {item.space === "PERSONALIZADO"
                ? item.customLocation
                : item.space}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#E11D48" />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item: any) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("AdminCreateEvent")}
      >
        <Plus color="#fff" size={28} />
      </TouchableOpacity>

      {/* MODAL DE DETALHES (Sincronizado com a Home) */}
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
                <View style={[styles.modalBanner, styles.modalPlaceholder]}>
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
                        chatId: selectedEvent.chatId, // OBRIGATÓRIO: ID do chat do banco de dados
                        name: selectedEvent.title, // Nome do Evento
                        type: "EVENT", // OBRIGATÓRIO: Muda o cabeçalho para evento
                        avatar: selectedEvent.bannerUrl, // Foto do chat será o banner
                        targetId: selectedEvent.id, // Para poder clicar na foto e voltar pro evento
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerTitleContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 5,
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#1e293b" },

  // Cards de Evento Estilizados
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 20,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  banner: { height: 160, width: "100%" },
  placeholder: {
    height: 160,
    backgroundColor: "#E11D48",
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: {
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
  },
  dateBadge: {
    backgroundColor: "#f1f5f9",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: "center",
    marginRight: 15,
    minWidth: 55,
  },
  dateDay: { fontSize: 20, fontWeight: "bold", color: "#E11D48" },
  dateMonth: { fontSize: 10, fontWeight: "bold", color: "#64748b" },
  info: { flex: 1 },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 4,
  },
  metaRow: { flexDirection: "row", alignItems: "center" },
  metaText: { fontSize: 13, color: "#64748b", marginLeft: 4 },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#cbd5e1",
    marginHorizontal: 8,
  },

  // FAB
  fab: {
    position: "absolute",
    bottom: 25,
    right: 25,
    backgroundColor: "#E11D48",
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#E11D48",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },

  // Modal Styles (Copiados da Home)
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
  modalPlaceholder: {
    backgroundColor: "#E11D48",
    justifyContent: "center",
    alignItems: "center",
  },
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
  miniAvatarContainer: { alignItems: "center", width: 60 },
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
  emptyText: {
    color: "#94a3b8",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 10,
  },
});
