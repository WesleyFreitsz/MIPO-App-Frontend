import React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Coins, ShieldAlert, UserMinus } from "lucide-react-native";

const mockUsers = [
  { id: "1", name: "João Silva", coins: 15, status: "Ativo" },
  { id: "2", name: "Maria Souza", coins: 120, status: "Ativo" },
];

export default function AdminUsersScreen() {
  const handleAction = (user: string, action: string) => {
    Alert.alert("Sucesso", `${action} realizado para ${user}`);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={mockUsers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.userCard}>
            <View>
              <Text style={styles.userName}>{item.name}</Text>
              <Text style={styles.userCoins}>💰 {item.coins} moedas</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={() => handleAction(item.name, "+1 Moeda")}
              >
                <Coins color="#f59e0b" size={24} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleAction(item.name, "Banimento")}
              >
                <UserMinus
                  color="#ef4444"
                  size={24}
                  style={{ marginLeft: 15 }}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 15 },
  userCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  userName: { fontSize: 16, fontWeight: "bold", color: "#1e293b" },
  userCoins: { fontSize: 14, color: "#64748b" },
  actions: { flexDirection: "row" },
});
