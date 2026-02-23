import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Trophy, Plus, Trash2 } from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";

interface Achievement {
  id: string;
  title: string;
  icon: string;
}

export default function AdminAchievementsScreen() {
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState("");

  const { data: achievements = [], isLoading } = useQuery({
    queryKey: ["achievements"],
    queryFn: async () => {
      const res = await api.get("/achievements");
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (title: string) => api.post("/achievements", { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
      setNewTitle("");
      Alert.alert("Sucesso", "Conquista criada!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/achievements/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
    },
  });

  const addAchievement = () => {
    if (!newTitle.trim()) return;
    createMutation.mutate(newTitle.trim());
  };

  const removeAchievement = (id: string) => {
    Alert.alert("Excluir", "Deseja remover esta conquista?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        onPress: () => deleteMutation.mutate(id),
        style: "destructive",
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#E11D48" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Nome da Conquista"
          value={newTitle}
          onChangeText={setNewTitle}
        />
        <TouchableOpacity
          style={styles.addBtn}
          onPress={addAchievement}
          disabled={createMutation.isPending || !newTitle.trim()}
        >
          <Plus color="#fff" size={24} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={achievements}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.icon}>{item.icon || "🏆"}</Text>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <TouchableOpacity onPress={() => removeAchievement(item.id)}>
              <Trash2 color="#ef4444" size={20} />
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 20 },
  centered: { justifyContent: "center", alignItems: "center" },
  form: { flexDirection: "row", gap: 10, marginBottom: 20 },
  input: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  addBtn: {
    backgroundColor: "#E11D48",
    padding: 12,
    borderRadius: 12,
    justifyContent: "center",
  },
  item: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  icon: { fontSize: 24, marginRight: 15 },
  itemTitle: { flex: 1, fontSize: 16, fontWeight: "bold" },
});
