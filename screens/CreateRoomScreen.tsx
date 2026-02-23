import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function CreateRoomScreen({ navigation }: any) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [game, setGame] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("4");
  const [isPublic, setIsPublic] = useState(true);
  const [description, setDescription] = useState("");

  const createRoomMutation = useMutation({
    mutationFn: async (dto: {
      game: string;
      date: string;
      time: string;
      maxParticipants: number;
      isPublic: boolean;
      description?: string;
    }) => {
      const response = await api.post("/rooms", dto);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      Alert.alert("Sucesso", "Sala criada!");
      navigation.goBack();
    },
    onError: (error: any) => {
      Alert.alert(
        "Erro",
        error.response?.data?.message || "Erro ao criar sala",
      );
    },
  });

  const handleCreate = () => {
    if (!game.trim()) {
      Alert.alert("Erro", "Informe o nome do jogo.");
      return;
    }
    if (!date.trim()) {
      Alert.alert("Erro", "Informe a data.");
      return;
    }
    if (!time.trim()) {
      Alert.alert("Erro", "Informe o horário.");
      return;
    }
    createRoomMutation.mutate({
      game: game.trim(),
      date: date.trim(),
      time: time.trim(),
      maxParticipants: parseInt(maxParticipants, 10) || 4,
      isPublic,
      description: description.trim() || undefined,
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Criar Sala</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Jogo</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Catan, Dixit, Azul..."
          value={game}
          onChangeText={setGame}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>Data</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Hoje, Amanhã, 25/02"
            value={date}
            onChangeText={setDate}
          />
        </View>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.label}>Horário</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 20:00"
            value={time}
            onChangeText={setTime}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Máx. participantes</Text>
        <TextInput
          style={styles.input}
          placeholder="4"
          keyboardType="numeric"
          value={maxParticipants}
          onChangeText={setMaxParticipants}
        />
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.label}>Sala pública</Text>
        <Switch
          value={isPublic}
          onValueChange={setIsPublic}
          trackColor={{ false: "#cbd5e1", true: "#c73636" }}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Descrição (opcional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Descreva a partida..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, createRoomMutation.isPending && styles.buttonDisabled]}
        onPress={handleCreate}
        disabled={createRoomMutation.isPending}
      >
        {createRoomMutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Criar Sala</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 20 },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 20,
  },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#64748b", marginBottom: 6 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  row: { flexDirection: "row" },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#c73636",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
