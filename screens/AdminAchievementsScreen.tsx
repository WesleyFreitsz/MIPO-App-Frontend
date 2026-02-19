import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
} from "react-native";
import { Trophy, Plus, Trash2 } from "lucide-react-native";

export default function AdminAchievementsScreen() {
  const [achievements, setAchievements] = useState([
    { id: "1", title: "Mestre de Catan", icon: "🎲" },
    { id: "2", title: "Fiel à MIPO", icon: "🗓️" },
  ]);
  const [newTitle, setNewTitle] = useState("");

  const addAchievement = () => {
    if (!newTitle) return;
    setAchievements([
      ...achievements,
      { id: Date.now().toString(), title: newTitle, icon: "🏆" },
    ]);
    setNewTitle("");
    Alert.alert("Sucesso", "Conquista criada!");
  };

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Nome da Conquista"
          value={newTitle}
          onChangeText={setNewTitle}
        />
        <TouchableOpacity style={styles.addBtn} onPress={addAchievement}>
          <Plus color="#fff" size={24} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={achievements}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.icon}>{item.icon}</Text>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <TouchableOpacity
              onPress={() =>
                setAchievements(achievements.filter((a) => a.id !== item.id))
              }
            >
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
