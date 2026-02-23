import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Gift, Plus, Trash2, Edit3, Coins, Package } from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";

interface Reward {
  id: string;
  title: string;
  price: number;
  stock: number;
}

export default function AdminRewardsScreen() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");

  const { data: rewards = [], isLoading } = useQuery({
    queryKey: ["rewards"],
    queryFn: async () => {
      const res = await api.get("/rewards");
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (dto: { title: string; price: number; stock: number }) =>
      api.post("/rewards", dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rewards"] });
      setTitle("");
      setPrice("");
      setStock("");
      Alert.alert("Sucesso", "Recompensa cadastrada!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/rewards/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rewards"] });
    },
  });

  const handleAddReward = () => {
    if (!title.trim() || !price.trim() || !stock.trim()) {
      Alert.alert("Erro", "Preencha todos os campos da recompensa.");
      return;
    }
    createMutation.mutate({
      title: title.trim(),
      price: parseInt(price, 10),
      stock: parseInt(stock, 10),
    });
  };

  const handleDelete = (id: string) => {
    Alert.alert("Excluir", "Deseja remover esta recompensa?", [
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
      <ScrollView
        style={styles.formContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionTitle}>Nova Recompensa 🎁</Text>

        <TextInput
          style={styles.input}
          placeholder="Nome do Prêmio (Ex: Jogo Catan)"
          value={title}
          onChangeText={setTitle}
        />

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
            <TextInput
              style={styles.input}
              placeholder="Preço (Moedas)"
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <TextInput
              style={styles.input}
              placeholder="Estoque Inicial"
              keyboardType="numeric"
              value={stock}
              onChangeText={setStock}
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddReward}
          disabled={
            createMutation.isPending ||
            !title.trim() ||
            !price.trim() ||
            !stock.trim()
          }
        >
          <Plus color="#fff" size={20} />
          <Text style={styles.addButtonText}>Cadastrar Recompensa</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.listSection}>
        <Text style={styles.sectionTitle}>Recompensas Ativas</Text>
        <FlatList
          data={rewards}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.rewardCard}>
              <View style={styles.rewardInfo}>
                <Text style={styles.rewardTitle}>{item.title}</Text>
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Coins size={14} color="#f59e0b" />
                    <Text style={styles.metaText}>{item.price} moedas</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Package size={14} color="#64748b" />
                    <Text style={styles.metaText}>{item.stock} em estoque</Text>
                  </View>
                </View>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.actionIcon} onPress={() => {}}>
                  <Edit3 color="#6366f1" size={20} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionIcon}
                  onPress={() => handleDelete(item.id)}
                >
                  <Trash2 color="#ef4444" size={20} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  centered: { justifyContent: "center", alignItems: "center" },
  formContainer: {
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 15,
  },
  row: { flexDirection: "row", marginBottom: 10 },
  inputGroup: { marginBottom: 10 },
  input: {
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 10,
  },
  addButton: {
    backgroundColor: "#E11D48",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 15,
    borderRadius: 12,
    marginTop: 5,
  },
  addButtonText: { color: "#fff", fontWeight: "bold", marginLeft: 8 },
  listSection: { flex: 1, padding: 20 },
  rewardCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    elevation: 2,
  },
  rewardInfo: { flex: 1 },
  rewardTitle: { fontSize: 16, fontWeight: "bold", color: "#1e293b" },
  metaRow: { flexDirection: "row", marginTop: 5, gap: 15 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, color: "#64748b" },
  actions: { flexDirection: "row", gap: 10 },
  actionIcon: { padding: 5 },
});
