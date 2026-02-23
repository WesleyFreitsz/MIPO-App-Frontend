import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Switch,
  TextInput,
  Image,
  Platform,
} from "react-native";
import {
  Users,
  Clock,
  X,
  CheckCircle2,
  DollarSign,
  Search,
  Gamepad2,
} from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { FadeInView } from "../components/FadeInView";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { SafeAreaView } from "react-native-safe-area-context";

interface RoomParticipant {
  userId: string;
  name: string;
  avatarUrl?: string;
  activity?: string | null;
  activityType?: "game" | "custom" | null;
  isActivityPublic?: boolean;
  startTime: string;
  endTime: string;
  joinedAt: Date;
}

interface Room {
  id: string;
  type: "salinha" | "salao_interno" | "salao_externo";
  organizer: { id: string; name: string } | null;
  date: string;
  startTime: string;
  endTime: string;
  participantCount: number;
  participants: RoomParticipant[];
  activity?: string;
  activityType?: "game" | "custom";
  reservationStatus: "pending" | "approved" | "cancelled";
  chatId?: string | null;
}

interface Game {
  id: string;
  name: string;
  imageUrl?: string;
}

const FIXED_ROOMS = {
  salinha: "a1234567-b890-c123-d456-e78901234567",
  salao_interno: "b1234567-c890-d123-e456-f78901234567",
  salao_externo: "c1234567-d890-e123-f456-a78901234567",
};

const roomTypeLabels: Record<
  "salinha" | "salao_interno" | "salao_externo",
  string
> = {
  salinha: "Salinha",
  salao_interno: "Salão Interno",
  salao_externo: "Salão Externo",
};

const roomTypeColors: Record<
  "salinha" | "salao_interno" | "salao_externo",
  string
> = {
  salinha: "#fecaca",
  salao_interno: "#bfdbfe",
  salao_externo: "#bbf7d0",
};

const HOURLY_RATE = 10;

const getTodayLocalString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function RoomsScreen({ navigation }: any) {
  const queryClient = useQueryClient();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showViewRoom, setShowViewRoom] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // DatePicker State
  const [pickerConfig, setPickerConfig] = useState({
    visible: false,
    mode: "date" as "date" | "time",
    targetField: "", // 'date', 'startTime', 'endTime'
    isFilter: false, // true = View Room, false = Join Form
  });

  // View Room filters
  const [viewFilters, setViewFilters] = useState({
    date: getTodayLocalString(),
    startTime: "14:00",
    endTime: "16:00",
    searchQuery: "",
    selectedGameId: "",
  });

  // Join Form
  const [formData, setFormData] = useState({
    date: getTodayLocalString(),
    startTime: "14:00",
    endTime: "16:00",
    activity: "",
    gameId: "",
    activityType: "game" as "game" | "custom",
    isActivityPublic: true,
  });

  const [reservationPrice, setReservationPrice] = useState(0);

  const {
    data: allRooms = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["rooms-fixed"],
    queryFn: async () => {
      try {
        const saltinhaRes = await api.get(`/rooms/${FIXED_ROOMS.salinha}`);
        const salaoInternoRes = await api.get(
          `/rooms/${FIXED_ROOMS.salao_interno}`,
        );
        const salaoExternoRes = await api.get(
          `/rooms/${FIXED_ROOMS.salao_externo}`,
        );
        return [
          saltinhaRes.data,
          salaoInternoRes.data,
          salaoExternoRes.data,
        ].filter(Boolean);
      } catch (error: any) {
        console.error("❌ Erro ao buscar salas:", error?.response?.status);
        throw error;
      }
    },
    retry: 3,
    refetchInterval: 30000,
  });

  const { data: games = [] } = useQuery({
    queryKey: ["games"],
    queryFn: async () => {
      try {
        const res = await api.get("/games");
        return res.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const { data: fetchedParticipants = [] } = useQuery({
    queryKey: [
      "room-participants",
      selectedRoom?.id,
      viewFilters.date,
      viewFilters.startTime,
      viewFilters.endTime,
    ],
    queryFn: async () => {
      if (!selectedRoom || !showViewRoom) return [];
      try {
        const res = await api.get(`/rooms/${selectedRoom.id}/participants`, {
          params: {
            date: viewFilters.date,
            startTime: viewFilters.startTime,
            endTime: viewFilters.endTime,
          },
        });
        return res.data?.participants || [];
      } catch (error) {
        return [];
      }
    },
    enabled: !!selectedRoom && showViewRoom,
  });

  const filteredParticipants = fetchedParticipants.filter(
    (p: RoomParticipant) => {
      let matchSearch = true;
      let matchGame = true;

      if (viewFilters.searchQuery) {
        const query = viewFilters.searchQuery.toLowerCase();
        matchSearch =
          p.name.toLowerCase().includes(query) ||
          (p.activity?.toLowerCase().includes(query) ?? false);
      }

      if (viewFilters.selectedGameId) {
        const selectedGame = games.find(
          (g: Game) => g.id === viewFilters.selectedGameId,
        );
        if (selectedGame) {
          matchGame =
            p.activity?.trim().toLowerCase() ===
            selectedGame.name.trim().toLowerCase();
        }
      }

      return matchSearch && matchGame;
    },
  );

  const joinMutation = useMutation({
    mutationFn: (data: any) => api.post(`/rooms/${data.roomId}/join`, data),
    onSuccess: () => {
      resetForm();
      setShowJoinForm(false);
      queryClient.invalidateQueries({ queryKey: ["rooms-fixed"] });
      Alert.alert("Sucesso", "Você se inscreveu na sala!");
    },
    onError: (error: any) => {
      Alert.alert(
        "Erro",
        error.response?.data?.message || "Erro ao marcar presença",
      );
    },
  });

  const reserveSalinhaMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post("/rooms/salinha/reserve", {
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        totalPrice: data.totalPrice,
      });
    },
    onSuccess: () => {
      setShowPaymentModal(true);
    },
    onError: (error: any) => {
      Alert.alert("Erro", error.response?.data?.message || "Erro ao reservar");
    },
  });

  const resetForm = () => {
    setFormData({
      date: getTodayLocalString(),
      startTime: "14:00",
      endTime: "16:00",
      activity: "",
      gameId: "",
      activityType: "game",
      isActivityPublic: true,
    });
    setReservationPrice(0);
  };

  const calculateSalinhaPrice = (start: string, end: string) => {
    const [startH] = start.split(":").map(Number);
    const [endH] = end.split(":").map(Number);
    const hours = Math.max(1, endH - startH);
    return hours * HOURLY_RATE;
  };

  const openPicker = (
    mode: "date" | "time",
    targetField: string,
    isFilter: boolean,
  ) => {
    setPickerConfig({ visible: true, mode, targetField, isFilter });
  };

  const handlePickerChange = (event: any, selectedDate?: Date) => {
    // No Android fechamos logo após clicar em OK ou Cancelar
    if (Platform.OS === "android" || event.type === "dismissed") {
      setPickerConfig((prev) => ({ ...prev, visible: false }));
    }

    if (selectedDate && event.type !== "dismissed") {
      const { mode, targetField, isFilter } = pickerConfig;
      let formattedValue = "";

      if (mode === "date") {
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
        const day = String(selectedDate.getDate()).padStart(2, "0");
        formattedValue = `${year}-${month}-${day}`;
      } else {
        const hours = selectedDate.getHours().toString().padStart(2, "0");
        const mins = selectedDate.getMinutes().toString().padStart(2, "0");
        formattedValue = `${hours}:${mins}`;
      }

      if (isFilter) {
        setViewFilters((prev) => ({ ...prev, [targetField]: formattedValue }));
      } else {
        setFormData((prev) => {
          const newData = { ...prev, [targetField]: formattedValue };
          if (
            selectedRoom?.type === "salinha" &&
            (targetField === "startTime" || targetField === "endTime")
          ) {
            const start =
              targetField === "startTime" ? formattedValue : prev.startTime;
            const end =
              targetField === "endTime" ? formattedValue : prev.endTime;
            setReservationPrice(calculateSalinhaPrice(start, end));
          }
          return newData;
        });
      }
    }
  };

  const getPickerValue = () => {
    const { mode, targetField, isFilter } = pickerConfig;
    const dataSource = isFilter ? viewFilters : formData;
    const value = dataSource[targetField as keyof typeof dataSource];

    if (!value) return new Date();

    if (mode === "time") {
      const [hours, minutes] = value.split(":").map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return date;
    } else {
      const [year, month, day] = value.split("-").map(Number);
      return new Date(year, month - 1, day);
    }
  };

  const handleOpenViewRoom = (room: Room) => {
    setSelectedRoom(room);
    setShowViewRoom(true);
  };

  const handleOpenJoinForm = (room: Room) => {
    setSelectedRoom(room);
    if (room.type === "salinha") {
      const price = calculateSalinhaPrice(formData.startTime, formData.endTime);
      setReservationPrice(price);
    }
    setShowJoinForm(true);
  };

  const handleConfirmJoin = () => {
    if (!selectedRoom) return;

    const now = new Date();
    const todayStr = getTodayLocalString();

    const [startH, startM] = formData.startTime.split(":").map(Number);
    const [endH, endM] = formData.endTime.split(":").map(Number);

    if (formData.date === todayStr) {
      const currentH = now.getHours();
      const currentM = now.getMinutes();
      if (startH < currentH || (startH === currentH && startM < currentM)) {
        Alert.alert(
          "Erro",
          "Não é possível marcar presença em um horário que já passou hoje.",
        );
        return;
      }
    }

    if (startH > endH || (startH === endH && startM >= endM)) {
      Alert.alert(
        "Erro",
        "O horário de término deve ser posterior ao horário de início.",
      );
      return;
    }

    if (selectedRoom.type === "salinha") {
      reserveSalinhaMutation.mutate({
        roomId: selectedRoom.id,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        totalPrice: reservationPrice,
      });
    } else {
      joinMutation.mutate({
        roomId: selectedRoom.id,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        activity: formData.activity || formData.gameId,
        activityType: formData.activityType,
        isActivityPublic: formData.isActivityPublic,
      });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Componente inline do DateTimePicker para evitar ficar por trás do Modal
  const renderDateTimePicker = (isFilterMode: boolean) => {
    if (!pickerConfig.visible || pickerConfig.isFilter !== isFilterMode)
      return null;

    return (
      <View style={styles.pickerWrapper}>
        <DateTimePicker
          value={getPickerValue()}
          mode={pickerConfig.mode}
          is24Hour={true}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handlePickerChange}
          textColor="#000"
        />
        {Platform.OS === "ios" && (
          <TouchableOpacity
            style={styles.iosCloseBtn}
            onPress={() =>
              setPickerConfig((prev) => ({ ...prev, visible: false }))
            }
          >
            <Text style={styles.iosCloseBtnText}>Confirmar</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderRoom = (room: Room) => {
    const isSalinha = room.type === "salinha";
    const isApproved = room.reservationStatus === "approved";

    return (
      <FadeInView key={room.id} style={styles.cardWrapper}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.gameTitle}>{roomTypeLabels[room.type]}</Text>
              <Text style={styles.organizer}>Sala {room.type}</Text>
            </View>
            <View
              style={[
                styles.badge,
                { backgroundColor: roomTypeColors[room.type] },
              ]}
            >
              <Text style={styles.badgeText}>
                {isSalinha && !isApproved ? "AGUARDANDO" : "ATIVA"}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Clock size={16} color="#64748b" />
            <Text style={styles.infoText}>{room.date}</Text>
          </View>

          <View style={styles.participantsSection}>
            <Users size={16} color="#64748b" />
            <Text style={styles.infoText}>
              {room.participantCount} participante
              {room.participantCount !== 1 ? "s" : ""}
            </Text>
          </View>

          <View style={styles.buttonsRow}>
            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => handleOpenViewRoom(room)}
            >
              <Text style={styles.viewButtonText}>Ver Sala</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.joinButton}
              onPress={() => handleOpenJoinForm(room)}
            >
              <Text style={styles.joinButtonText}>
                {isSalinha ? "Reservar" : "Marcar Presença"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </FadeInView>
    );
  };

  if (isLoading && allRooms.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#c73636" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nossas Salas</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#c73636"]}
          />
        }
      >
        {allRooms.map((room) => renderRoom(room))}
      </ScrollView>

      {/* ===== MODAL: VER SALA ===== */}
      <Modal
        visible={showViewRoom}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowViewRoom(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedRoom && roomTypeLabels[selectedRoom.type]}
              </Text>
              <TouchableOpacity onPress={() => setShowViewRoom(false)}>
                <X color="#94a3b8" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.filterSection}>
                <View style={styles.dateTimeFiltersRow}>
                  <View style={styles.filterBlock}>
                    <Text style={styles.formLabel}>Data</Text>
                    <TouchableOpacity
                      style={styles.pickerButton}
                      onPress={() => openPicker("date", "date", true)}
                    >
                      <Text style={styles.pickerButtonText}>
                        {viewFilters.date}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.filterBlock}>
                    <Text style={styles.formLabel}>De</Text>
                    <TouchableOpacity
                      style={styles.pickerButton}
                      onPress={() => openPicker("time", "startTime", true)}
                    >
                      <Text style={styles.pickerButtonText}>
                        {viewFilters.startTime}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.filterBlock}>
                    <Text style={styles.formLabel}>Até</Text>
                    <TouchableOpacity
                      style={styles.pickerButton}
                      onPress={() => openPicker("time", "endTime", true)}
                    >
                      <Text style={styles.pickerButtonText}>
                        {viewFilters.endTime}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Renderiza o Picker dentro deste Modal se for para Filtros */}
                {renderDateTimePicker(true)}

                <View style={styles.searchContainer}>
                  <Search size={20} color="#94a3b8" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar pessoa..."
                    value={viewFilters.searchQuery}
                    onChangeText={(text) =>
                      setViewFilters({ ...viewFilters, searchQuery: text })
                    }
                  />
                </View>

                <Text style={styles.formLabel}>Filtrar por jogo:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{
                    paddingRight: 10,
                    paddingBottom: 10,
                  }}
                >
                  {games.map((item: Game) => {
                    const isActive = viewFilters.selectedGameId === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.quickFilterGame,
                          isActive && styles.quickFilterGameActive,
                        ]}
                        onPress={() =>
                          setViewFilters((prev) => ({
                            ...prev,
                            selectedGameId:
                              prev.selectedGameId === item.id ? "" : item.id,
                          }))
                        }
                      >
                        {item.imageUrl ? (
                          <Image
                            source={{ uri: item.imageUrl }}
                            style={styles.quickFilterImage}
                          />
                        ) : (
                          <View
                            style={[
                              styles.quickFilterImage,
                              {
                                backgroundColor: "#e2e8f0",
                                justifyContent: "center",
                                alignItems: "center",
                              },
                            ]}
                          >
                            <Gamepad2 color="#94a3b8" size={16} />
                          </View>
                        )}
                        <Text
                          style={[
                            styles.quickFilterText,
                            isActive && styles.quickFilterTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <View>
                <Text style={styles.sectionTitle}>
                  Pessoas Disponíveis ({filteredParticipants.length})
                </Text>
                {filteredParticipants.length === 0 ? (
                  <Text style={styles.emptyText}>
                    Ninguém encontrado com esses filtros.
                  </Text>
                ) : (
                  <View style={styles.participantRow}>
                    {filteredParticipants.map(
                      (p: RoomParticipant, idx: number) => {
                        const userAvatar =
                          p.avatarUrl && p.avatarUrl !== ""
                            ? p.avatarUrl
                            : `https://api.dicebear.com/7.x/initials/svg?seed=${p.name}`;
                        return (
                          <TouchableOpacity
                            key={idx}
                            style={styles.miniAvatarContainer}
                            onPress={() => {
                              setShowViewRoom(false);
                              navigation.navigate("PlayerProfile", {
                                userId: p.userId,
                              });
                            }}
                          >
                            <Image
                              source={{ uri: userAvatar }}
                              style={styles.miniAvatar}
                            />
                            <Text style={styles.miniName} numberOfLines={1}>
                              {p.name.split(" ")[0]}
                            </Text>
                            <Text style={styles.miniTime} numberOfLines={1}>
                              {p.startTime}
                            </Text>
                            {p.activity && (
                              <Text
                                style={styles.miniActivity}
                                numberOfLines={1}
                              >
                                {p.activity}
                              </Text>
                            )}
                            <View style={styles.confirmedBadge}>
                              <CheckCircle2 size={10} color="#fff" />
                            </View>
                          </TouchableOpacity>
                        );
                      },
                    )}
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={() => setShowViewRoom(false)}
              >
                <Text style={styles.confirmBtnText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===== MODAL: FORMULÁRIO DE INSCRIÇÃO/RESERVA ===== */}
      <Modal
        visible={showJoinForm}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowJoinForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedRoom && roomTypeLabels[selectedRoom.type]}
              </Text>
              <TouchableOpacity onPress={() => setShowJoinForm(false)}>
                <X color="#94a3b8" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.dateTimeFiltersRow}>
                <View style={[styles.filterBlock, { flex: 1.5 }]}>
                  <Text style={styles.formLabel}>Data</Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => openPicker("date", "date", false)}
                  >
                    <Text style={styles.pickerButtonText}>{formData.date}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.filterBlock}>
                  <Text style={styles.formLabel}>Início</Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => openPicker("time", "startTime", false)}
                  >
                    <Text style={styles.pickerButtonText}>
                      {formData.startTime}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.filterBlock}>
                  <Text style={styles.formLabel}>Término</Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => openPicker("time", "endTime", false)}
                  >
                    <Text style={styles.pickerButtonText}>
                      {formData.endTime}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Renderiza o Picker dentro deste Modal se for para Inscrição */}
              {renderDateTimePicker(false)}

              {selectedRoom?.type === "salinha" && (
                <View style={styles.priceBox}>
                  <DollarSign size={20} color="#10b981" />
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.priceLabel}>Valor da Reserva</Text>
                    <Text style={styles.priceValue}>
                      R$ {reservationPrice.toFixed(2)}
                    </Text>
                  </View>
                </View>
              )}

              {selectedRoom?.type !== "salinha" && (
                <>
                  <View style={styles.formSection}>
                    <Text style={styles.formLabel}>Tipo de Atividade</Text>
                    <View style={styles.typeSelector}>
                      <TouchableOpacity
                        style={[
                          styles.typeButton,
                          formData.activityType === "game" &&
                            styles.typeButtonActive,
                        ]}
                        onPress={() =>
                          setFormData({ ...formData, activityType: "game" })
                        }
                      >
                        <Text
                          style={[
                            styles.typeButtonText,
                            formData.activityType === "game" &&
                              styles.typeButtonTextActive,
                          ]}
                        >
                          Jogo
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.typeButton,
                          formData.activityType === "custom" &&
                            styles.typeButtonActive,
                        ]}
                        onPress={() =>
                          setFormData({ ...formData, activityType: "custom" })
                        }
                      >
                        <Text
                          style={[
                            styles.typeButtonText,
                            formData.activityType === "custom" &&
                              styles.typeButtonTextActive,
                          ]}
                        >
                          Customizado
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {formData.activityType === "game" && (
                    <View style={styles.formSection}>
                      <Text style={styles.formLabel}>Selecione o Jogo</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.gamesScrollContainer}
                      >
                        {games.map((item: Game) => (
                          <TouchableOpacity
                            key={item.id}
                            style={[
                              styles.gameCardOption,
                              formData.gameId === item.id &&
                                styles.gameCardOptionActive,
                            ]}
                            onPress={() =>
                              setFormData({
                                ...formData,
                                gameId: item.id,
                                activity: item.name,
                              })
                            }
                          >
                            {item.imageUrl ? (
                              <Image
                                source={{ uri: item.imageUrl }}
                                style={styles.gameCardImage}
                              />
                            ) : (
                              <View
                                style={[
                                  styles.gameCardImage,
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
                            <View style={styles.gameCardContent}>
                              <Text
                                style={[
                                  styles.gameCardTitle,
                                  formData.gameId === item.id &&
                                    styles.gameCardTitleActive,
                                ]}
                                numberOfLines={1}
                              >
                                {item.name}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {formData.activityType === "custom" && (
                    <View style={styles.formSection}>
                      <Text style={styles.formLabel}>
                        Descrição da Atividade
                      </Text>
                      <TextInput
                        style={styles.textInputLarge}
                        value={formData.activity}
                        onChangeText={(text) =>
                          setFormData({ ...formData, activity: text })
                        }
                        placeholder="Ex: Conversa, Confraternização, etc"
                        multiline
                      />
                    </View>
                  )}

                  <View style={styles.visibilityBox}>
                    <View style={styles.visibilityHeader}>
                      <Text style={styles.visibilityTitle}>
                        Atividade Pública
                      </Text>
                      <Switch
                        value={formData.isActivityPublic}
                        onValueChange={(value) =>
                          setFormData({ ...formData, isActivityPublic: value })
                        }
                        trackColor={{ false: "#cbd5e1", true: "#86efac" }}
                        thumbColor={
                          formData.isActivityPublic ? "#c73636" : "#94a3b8"
                        }
                      />
                    </View>
                    <Text style={styles.visibilityDescription}>
                      {formData.isActivityPublic
                        ? "🟢 Pública: Outros podem se juntar"
                        : "🔒 Privada: Apenas admins veem"}
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowJoinForm(false);
                  resetForm();
                }}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleConfirmJoin}
                disabled={
                  joinMutation.isPending || reserveSalinhaMutation.isPending
                }
              >
                {joinMutation.isPending || reserveSalinhaMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmBtnText}>
                    {selectedRoom?.type === "salinha"
                      ? "Prosseguir Pagamento"
                      : "Confirmar"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===== MODAL: PAGAMENTO PIX ===== */}
      <Modal visible={showPaymentModal} animationType="fade" transparent={true}>
        <View style={styles.paymentOverlay}>
          <View style={styles.paymentBox}>
            <Text style={styles.paymentTitle}>Confirmação de Reserva</Text>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentLabel}>Valor Total</Text>
              <Text style={styles.paymentAmount}>
                R$ {reservationPrice.toFixed(2)}
              </Text>
            </View>
            <View style={styles.paymentDetails}>
              <Text style={styles.paymentDetailTitle}>
                Dados para Pagamento
              </Text>
              <View style={styles.pixBox}>
                <Text style={styles.pixLabel}>Chave PIX:</Text>
                <Text style={styles.pixKey}>123</Text>
              </View>
              <Text style={styles.paymentDetailText}>
                1. Realize o pagamento via PIX com a chave acima
              </Text>
              <Text style={styles.paymentDetailText}>
                2. Tire uma screenshot do comprovante
              </Text>
              <Text style={styles.paymentDetailText}>
                3. Envie a foto para o Instagram: @mipojogos
              </Text>
              <Text style={styles.paymentDetailText}>
                4. Sua reserva será liberada após aprovação
              </Text>
            </View>
            <View style={styles.paymentActions}>
              <TouchableOpacity
                style={styles.paymentCancelBtn}
                onPress={() => setShowPaymentModal(false)}
              >
                <Text style={styles.paymentCancelBtnText}>Fechar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.paymentConfirmBtn}
                onPress={() => {
                  Alert.alert(
                    "Sucesso",
                    "Solicitação de reserva enviada! Aguarde aprovação.",
                  );
                  setShowPaymentModal(false);
                  setShowJoinForm(false);
                  resetForm();
                  queryClient.invalidateQueries({ queryKey: ["rooms-fixed"] });
                }}
              >
                <Text style={styles.paymentConfirmBtnText}>Entendi</Text>
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
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  title: { fontSize: 22, fontWeight: "bold", color: "#1e293b" },
  listContent: { padding: 16, paddingBottom: 20 },
  cardWrapper: { marginBottom: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
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
  organizer: { fontSize: 14, color: "#64748b", marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: "bold", color: "#991b1b" },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  participantsSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  infoText: { fontSize: 13, color: "#475569" },
  buttonsRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  viewButton: {
    flex: 1,
    backgroundColor: "#e0e7ff",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  viewButtonText: { color: "#4338ca", fontWeight: "bold", fontSize: 13 },
  joinButton: {
    flex: 1,
    backgroundColor: "#c73636",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  joinButtonText: { color: "#fff", fontWeight: "bold", fontSize: 13 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#1e293b" },
  modalBody: { padding: 16, paddingBottom: 100 },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    flexDirection: "row",
    gap: 12,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
  },

  formSection: { marginBottom: 16 },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 6,
  },

  dateTimeFiltersRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  filterBlock: { flex: 1 },
  pickerButton: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 12,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
  },
  pickerButtonText: { fontSize: 14, color: "#1e293b", textAlign: "center" },

  // Estilos da "caixinha" inteligente do Picker adicionados
  pickerWrapper: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  iosCloseBtn: {
    marginTop: 10,
    backgroundColor: "#10b981",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  iosCloseBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 14,
    color: "#1e293b",
  },

  textInputLarge: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#f8fafc",
    minHeight: 80,
    fontSize: 14,
    color: "#1e293b",
  },

  typeSelector: { flexDirection: "row", gap: 8 },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  typeButtonActive: { backgroundColor: "#c73636", borderColor: "#c73636" },
  typeButtonText: { fontSize: 13, color: "#64748b", fontWeight: "500" },
  typeButtonTextActive: { color: "#fff" },

  quickFilterGame: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    paddingRight: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  quickFilterGameActive: { backgroundColor: "#fef2f2", borderColor: "#c73636" },
  quickFilterImage: { width: 30, height: 30, borderRadius: 15, marginRight: 8 },
  quickFilterText: { fontSize: 12, color: "#475569", fontWeight: "600" },
  quickFilterTextActive: { color: "#c73636" },

  gamesScrollContainer: { paddingRight: 10 },
  gameCardOption: {
    width: 120,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    marginRight: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  gameCardOptionActive: { borderColor: "#c73636", backgroundColor: "#fef2f2" },
  gameCardImage: { width: "100%", height: 100 },
  gameCardContent: { padding: 8, alignItems: "center" },
  gameCardTitle: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
    textAlign: "center",
  },
  gameCardTitleActive: { color: "#c73636" },

  visibilityBox: {
    backgroundColor: "#f0fdf4",
    borderLeftWidth: 4,
    borderLeftColor: "#22c55e",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  visibilityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  visibilityTitle: { fontSize: 14, fontWeight: "bold", color: "#1e293b" },
  visibilityDescription: { fontSize: 12, color: "#475569", lineHeight: 18 },

  priceBox: {
    flexDirection: "row",
    backgroundColor: "#ecfdf5",
    borderLeftWidth: 4,
    borderLeftColor: "#10b981",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: "center",
  },
  priceLabel: { fontSize: 12, color: "#047857" },
  priceValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#10b981",
    marginTop: 4,
  },

  filterSection: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 12,
  },

  participantRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 15,
    marginTop: 10,
    marginBottom: 20,
  },
  miniAvatarContainer: {
    alignItems: "center",
    width: 65,
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
    fontSize: 11,
    color: "#334155",
    fontWeight: "600",
    marginTop: 4,
    textAlign: "center",
  },
  miniTime: { fontSize: 10, color: "#64748b", textAlign: "center" },
  miniActivity: {
    fontSize: 9,
    color: "#c73636",
    textAlign: "center",
    marginTop: 2,
    fontWeight: "500",
  },
  confirmedBadge: {
    position: "absolute",
    right: 8,
    top: 0,
    backgroundColor: "#10b981",
    borderRadius: 10,
    padding: 2,
  },
  emptyText: {
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 16,
  },

  confirmBtn: {
    flex: 1,
    backgroundColor: "#c73636",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnText: { color: "#fff", fontSize: 15, fontWeight: "bold" },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  cancelBtnText: { color: "#1e293b", fontSize: 15, fontWeight: "bold" },

  paymentOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  paymentBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "100%",
  },
  paymentTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 20,
  },
  paymentInfo: {
    backgroundColor: "#ecfdf5",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  paymentLabel: { fontSize: 12, color: "#047857" },
  paymentAmount: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#10b981",
    marginTop: 4,
  },
  paymentDetails: {
    backgroundColor: "#f1f5f9",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  paymentDetailTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 10,
  },
  pixBox: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  pixLabel: { fontSize: 12, color: "#64748b" },
  pixKey: { fontSize: 16, fontWeight: "bold", color: "#c73636", marginTop: 4 },
  paymentDetailText: {
    fontSize: 12,
    color: "#475569",
    marginBottom: 8,
    lineHeight: 18,
  },

  paymentActions: { flexDirection: "row", gap: 10 },
  paymentCancelBtn: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  paymentCancelBtnText: { color: "#1e293b", fontWeight: "bold" },
  paymentConfirmBtn: {
    flex: 1,
    backgroundColor: "#10b981",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  paymentConfirmBtnText: { color: "#fff", fontWeight: "bold" },
});
