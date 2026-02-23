import React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Coins, UserMinus } from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";

interface AdminUser {
  id: string;
  name: string;
  coins: number;
  banned?: boolean;
}

export default function AdminUsersScreen() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["users", "admin"],
    queryFn: async () => {
      const res = await api.get("/users/admin/list", {
        params: { skip: 0, take: 50 },
      });
      return res.data;
    },
  });

  const addCoinsMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      api.patch(`/users/${id}/coins`, { amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "admin"] });
    },
  });

  const banMutation = useMutation({
    mutationFn: ({ id, banned }: { id: string; banned: boolean }) =>
      api.patch(`/users/${id}/ban`, { banned }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "admin"] });
    },
  });

  const users: AdminUser[] = data?.data || data || [];

  const handleAddCoins = (user: AdminUser) => {
    addCoinsMutation.mutate({ id: user.id, amount: 1 });
    Alert.alert("Sucesso", `+1 moeda adicionada para ${user.name}`);
  };

  const handleBan = (user: AdminUser) => {
    Alert.alert(
      "Banir usuário",
      `Deseja banir ${user.name}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Banir",
          onPress: () => {
            banMutation.mutate({ id: user.id, banned: true });
            Alert.alert("Sucesso", `${user.name} foi banido.`);
          },
          style: "destructive",
        },
      ],
    );
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
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.userCard, item.banned && styles.userCardBanned]}>
            <View>
              <Text style={styles.userName}>{item.name}</Text>
              <Text style={styles.userCoins}>
                💰 {item.coins ?? 0} moedas
                {item.banned ? " • Banido" : ""}
              </Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => handleAddCoins(item)}>
                <Coins color="#f59e0b" size={24} />
              </TouchableOpacity>
              {!item.banned && (
                <TouchableOpacity
                  onPress={() => handleBan(item)}
                  style={styles.banButton}
                >
                  <UserMinus color="#ef4444" size={24} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Nenhum usuário encontrado.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 15 },
  centered: { justifyContent: "center", alignItems: "center" },
  userCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  userCardBanned: { opacity: 0.6 },
  userName: { fontSize: 16, fontWeight: "bold", color: "#1e293b" },
  userCoins: { fontSize: 14, color: "#64748b" },
  actions: { flexDirection: "row", gap: 15 },
  banButton: { marginLeft: 0 },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { color: "#64748b" },
});
