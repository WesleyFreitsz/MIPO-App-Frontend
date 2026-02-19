import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
  Switch,
  Alert,
} from "react-native";
import { Gamepad2, Plus, Trash2, Search, Filter } from "lucide-react-native";

const mockGames = [
  {
    id: "1",
    name: "Catan",
    category: "Tabuleiro",
    players: "3-4",
    active: true,
  },
  {
    id: "2",
    name: "Exploding Kittens",
    category: "Cartas",
    players: "2-5",
    active: false,
  },
];

export default function AdminGamesScreen() {
  const [games, setGames] = useState(mockGames);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const handleAddGame = () => {
    if (!newName || !newCategory) {
      Alert.alert("Erro", "Preencha o nome e a categoria do jogo.");
      return;
    }
    const newGame = {
      id: Math.random().toString(),
      name: newName,
      category: newCategory,
      players: "2-4", // Mock
      active: true,
    };
    setGames([newGame, ...games]);
    setNewName("");
    setNewCategory("");
    Alert.alert("Sucesso", "Jogo registado com sucesso!");
  };

  const toggleGameStatus = (id: string) => {
    setGames((prev) =>
      prev.map((g) => (g.id === id ? { ...g, active: !g.active } : g)),
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.formContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionTitle}>Novo Registo 🎲</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nome do Jogo</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Terraforming Mars"
            value={newName}
            onChangeText={setNewName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Categoria</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Tabuleiro, Cartas..."
            value={newCategory}
            onChangeText={setNewCategory}
          />
        </View>

        <TouchableOpacity style={styles.addButton} onPress={handleAddGame}>
          <Plus color="#fff" size={20} />
          <Text style={styles.addButtonText}>Adicionar ao Catálogo</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.listSection}>
        <Text style={styles.sectionTitle}>Gestão de Inventário</Text>
        <FlatList
          data={games}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.gameCard}>
              <View style={styles.gameInfo}>
                <Text style={styles.gameName}>{item.name}</Text>
                <Text style={styles.gameMeta}>
                  {item.category} • {item.players} Jogadores
                </Text>
              </View>
              <View style={styles.actions}>
                <Text
                  style={[
                    styles.statusLabel,
                    { color: item.active ? "#166534" : "#94a3b8" },
                  ]}
                >
                  {item.active ? "Ativo" : "Inativo"}
                </Text>
                <Switch
                  value={item.active}
                  onValueChange={() => toggleGameStatus(item.id)}
                  trackColor={{ false: "#cbd5e1", true: "#E11D48" }}
                />
              </View>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
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
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 14, fontWeight: "600", color: "#64748b", marginBottom: 5 },
  input: {
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  addButton: {
    backgroundColor: "#E11D48",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
  },
  addButtonText: { color: "#fff", fontWeight: "bold", marginLeft: 8 },
  listSection: { flex: 1, padding: 20 },
  gameCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  gameInfo: { flex: 1 },
  gameName: { fontSize: 16, fontWeight: "bold", color: "#1e293b" },
  gameMeta: { fontSize: 12, color: "#64748b", marginTop: 2 },
  actions: { alignItems: "center" },
  statusLabel: { fontSize: 10, fontWeight: "bold", marginBottom: 2 },
});
