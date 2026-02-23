import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function ChatsListScreen({ navigation }: any) {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["chats"],
    queryFn: async () => {
      const res = await api.get("/chats", { params: { skip: 0, take: 50 } });
      return res.data;
    },
  });

  const chats = data?.data || [];

  const renderItem = ({ item }: any) => {
    // For private chats, find the other user
    const otherMember = item.members?.find((m: any) => m.userId !== user?.id);
    const title =
      item.type === "PRIVATE"
        ? otherMember?.user?.nickname || otherMember?.user?.name
        : item.name;
    const avatar =
      item.type === "PRIVATE"
        ? otherMember?.user?.avatarUrl ||
          `https://api.dicebear.com/7.x/initials/svg?seed=${title}`
        : item.imageUrl ||
          `https://api.dicebear.com/7.x/initials/svg?seed=${item.name}`;
    const lastMsgText = item.lastMessage
      ? `${item.lastMessage.user?.nickname || item.lastMessage.user?.name}: ${item.lastMessage.content}`
      : item.lastMessage?.content || "";

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() =>
          navigation.navigate("ChatDetail", { chatId: item.id, name: title })
        }
      >
        <Image source={{ uri: avatar }} style={styles.avatar} />
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.name}>{title}</Text>
            <Text style={styles.time}>
              {item.lastMessage?.createdAt
                ? new Date(item.lastMessage.createdAt).toLocaleDateString()
                : ""}
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={styles.lastMsg} numberOfLines={1}>
              {lastMsgText}
            </Text>
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Nenhuma conversa ainda.</Text>
          </View>
        )}
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
  lastMsg: { fontSize: 14, color: "#64748b", flex: 1 },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 100,
  },
  emptyText: { color: "#94a3b8", marginTop: 12 },
  unreadBadge: {
    backgroundColor: "#ef4444",
    minWidth: 20,
    paddingHorizontal: 6,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  unreadText: { color: "#fff", fontSize: 12, fontWeight: "600" },
});
