import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { ChevronDown, X, Calendar, Clock } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";

interface Game {
  id: string;
  name: string;
}

interface RoomData {
  type: "salinha" | "salao_interno" | "salao_externo";
  date: string;
  startTime: string;
  endTime: string;
  activity?: string | null;
  activityType?: "game" | "custom" | null;
}

export default function CreateRoomScreen({ navigation }: any) {
  const queryClient = useQueryClient();
  const [roomType, setRoomType] = useState<
    "salinha" | "salao_interno" | "salao_externo"
  >("salinha");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("12:00");
  const [activity, setActivity] = useState("");
  const [activityType, setActivityType] = useState<"game" | "custom" | null>(
    null,
  );
  const [useCustomActivity, setUseCustomActivity] = useState(false);

  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [gameModalVisible, setGameModalVisible] = useState(false);

  const { data: games = [], isLoading: gamesLoading } = useQuery({
    queryKey: ["games"],
    queryFn: async () => {
      const res = await api.get("/games");
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    },
  });

  const createMutation = useMutation<any, any, RoomData>({
    mutationFn: (data: RoomData) => api.post("/rooms", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      Alert.alert("Sucesso", "Sala criada com sucesso!");
      navigation.goBack();
    },
    onError: (error: any) => {
      Alert.alert(
        "Erro",
        error.response?.data?.message || "Erro ao criar sala",
      );
    },
  });

  const roomTypeLabels: Record<
    "salinha" | "salao_interno" | "salao_externo",
    string
  > = {
    salinha: "Salinha (com aprovação)",
    salao_interno: "Salão Interno",
    salao_externo: "Salão Externo",
  };

  const handleCreateRoom = () => {
    if (!date) {
      Alert.alert("Erro", "Selecione uma data");
      return;
    }

    if (startTime >= endTime) {
      Alert.alert(
        "Erro",
        "O horário de início deve ser anterior ao de término",
      );
      return;
    }

    const roomData: RoomData = {
      type: roomType,
      date,
      startTime,
      endTime,
      activity: activity || null,
      activityType: activity ? activityType : null,
    };

    createMutation.mutate(roomData);
  };

  const handleSelectGame = (game: Game) => {
    setActivity(game.name);
    setActivityType("game");
    setGameModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerBack}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Criar Sala</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Room Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipo de Sala *</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setTypeModalVisible(true)}
          >
            <Text style={styles.selectButtonText}>
              {roomTypeLabels[roomType]}
            </Text>
            <ChevronDown size={20} color="#c73636" />
          </TouchableOpacity>

          {roomType === "salinha" && (
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxTitle}>
                📋 Salinha requer aprovação
              </Text>
              <Text style={styles.infoBoxText}>
                Você será colocado em lista de espera e um admin precisará
                aprovar sua reserva.
              </Text>
            </View>
          )}
        </View>

        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data *</Text>
          <View style={styles.dateTimeRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>DD/MM/YYYY</Text>
              <TextInput
                style={styles.input}
                placeholder="01/02/2026"
                value={date}
                onChangeText={setDate}
                placeholderTextColor="#cbd5e1"
              />
            </View>
            <Calendar size={24} color="#c73636" style={styles.icon} />
          </View>
        </View>

        {/* Time Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Horários *</Text>
          <View style={styles.timeRow}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Início</Text>
              <TextInput
                style={styles.input}
                placeholder="10:00"
                value={startTime}
                onChangeText={setStartTime}
                placeholderTextColor="#cbd5e1"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Fim</Text>
              <TextInput
                style={styles.input}
                placeholder="12:00"
                value={endTime}
                onChangeText={setEndTime}
                placeholderTextColor="#cbd5e1"
              />
            </View>
          </View>
        </View>

        {/* Activity Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Atividade (opcional)</Text>

          <View style={styles.activityTypeToggle}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                !useCustomActivity && styles.toggleButtonActive,
              ]}
              onPress={() => {
                setUseCustomActivity(false);
                setActivity(""); // Reset activity when switching
              }}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  !useCustomActivity && styles.toggleButtonTextActive,
                ]}
              >
                Selecionar Jogo
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                useCustomActivity && styles.toggleButtonActive,
              ]}
              onPress={() => {
                setUseCustomActivity(true);
                setActivityType("custom");
              }}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  useCustomActivity && styles.toggleButtonTextActive,
                ]}
              >
                Atividade Personalizada
              </Text>
            </TouchableOpacity>
          </View>

          {useCustomActivity ? (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Descreva a atividade</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Ex: Conversas, treino, estudo..."
                value={activity}
                onChangeText={setActivity}
                placeholderTextColor="#cbd5e1"
                multiline
                numberOfLines={4}
              />
            </View>
          ) : (
            <>
              {activity ? (
                <View style={styles.selectedActivity}>
                  <Text style={styles.selectedActivityText}>{activity}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setActivity("");
                      setActivityType(null);
                    }}
                  >
                    <X size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setGameModalVisible(true)}
                >
                  <Text style={styles.selectButtonText}>
                    Selecionar jogo...
                  </Text>
                  <ChevronDown size={20} color="#c73636" />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateRoom}
          disabled={createMutation.isPending || !date}
        >
          {createMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>Criar Sala</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Room Type Modal */}
      <Modal
        visible={typeModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setTypeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Tipo de Sala</Text>
              <TouchableOpacity onPress={() => setTypeModalVisible(false)}>
                <X size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {Object.entries(roomTypeLabels).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.modalOption,
                    roomType === key && styles.modalOptionActive,
                  ]}
                  onPress={() => {
                    setRoomType(key as any);
                    setTypeModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      roomType === key && styles.modalOptionTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Game Selection Modal */}
      <Modal
        visible={gameModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setGameModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Jogo</Text>
              <TouchableOpacity onPress={() => setGameModalVisible(false)}>
                <X size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {gamesLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#c73636" />
              </View>
            ) : (
              <FlatList
                data={games}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.gameItem}
                    onPress={() => handleSelectGame(item)}
                  >
                    <Text style={styles.gameItemText}>{item.name}</Text>
                  </TouchableOpacity>
                )}
                style={styles.gamesList}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#faf6f1" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerBack: { fontSize: 14, color: "#c73636", fontWeight: "500" },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#1e293b" },

  content: { flex: 1, padding: 16 },
  bottomPadding: { height: 24 },

  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 10,
  },

  selectButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectButtonText: { fontSize: 15, color: "#475569", flex: 1 },

  infoBox: {
    backgroundColor: "#fef3c7",
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
  },
  infoBoxTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#b45309",
    marginBottom: 4,
  },
  infoBoxText: { fontSize: 12, color: "#78350f", lineHeight: 16 },

  dateTimeRow: {
    position: "relative",
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  icon: { marginBottom: 12, marginRight: 8 },

  timeRow: {
    flexDirection: "row",
    gap: 12,
  },

  inputGroup: { flex: 1 },
  inputLabel: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 6,
    fontWeight: "500",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1e293b",
  },
  textArea: { minHeight: 100, paddingTop: 10, textAlignVertical: "top" },

  activityTypeToggle: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
    alignItems: "center",
  },
  toggleButtonActive: {
    backgroundColor: "#c73636",
    borderColor: "#c73636",
  },
  toggleButtonText: { fontSize: 13, color: "#64748b", fontWeight: "500" },
  toggleButtonTextActive: { color: "#fff" },

  selectedActivity: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#dbeafe",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectedActivityText: { fontSize: 15, color: "#0369a1", fontWeight: "500" },

  footer: {
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  createButton: {
    backgroundColor: "#c73636",
    height: 54,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  createButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#1e293b" },
  modalBody: { flex: 1, padding: 16 },

  modalOption: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalOptionActive: { backgroundColor: "#fce7f3" },
  modalOptionText: { fontSize: 15, color: "#64748b" },
  modalOptionTextActive: { color: "#c73636", fontWeight: "600" },

  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  gamesList: { flex: 1 },
  gameItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  gameItemText: { fontSize: 15, color: "#334155" },
});
