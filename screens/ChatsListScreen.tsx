import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
} from "react-native";
import { MessageSquare } from "lucide-react-native";

const mockChats = [
  {
    id: "1",
    name: "Sala de Dixit",
    lastMsg: "Carlos: Bora começar?",
    time: "10:30",
    image: "https://api.dicebear.com/7.x/initials/svg?seed=DX",
  },
  {
    id: "2",
    name: "Torneio de War",
    lastMsg: "Você: Estou chegando!",
    time: "Ontem",
    image: "https://api.dicebear.com/7.x/initials/svg?seed=WR",
  },
];

export default function ChatsListScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <FlatList
        data={mockChats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.chatItem}
            onPress={() =>
              navigation.navigate("ChatDetail", { name: item.name })
            }
          >
            <Image source={{ uri: item.image }} style={styles.avatar} />
            <View style={styles.content}>
              <View style={styles.header}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.time}>{item.time}</Text>
              </View>
              <Text style={styles.lastMsg} numberOfLines={1}>
                {item.lastMsg}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MessageSquare size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>Nenhuma conversa ainda.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  chatItem: {
    flexDirection: "row",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    alignItems: "center",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#e2e8f0",
  },
  content: { flex: 1, marginLeft: 12 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  name: { fontWeight: "bold", fontSize: 16, color: "#1e293b" },
  time: { fontSize: 12, color: "#94a3b8" },
  lastMsg: { fontSize: 14, color: "#64748b" },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 100,
  },
  emptyText: { color: "#94a3b8", marginTop: 12 },
});
