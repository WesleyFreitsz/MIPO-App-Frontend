import React, { useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWebSocketChat } from "../hooks/useWebSocketChat";

export default function ChatsListScreen({ navigation }: any) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { socket } = useWebSocketChat();

  useEffect(() => {
    if (!socket) return;
    const handleListUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    };
    socket.on("chat:list-update", handleListUpdate);
    return () => {
      socket.off("chat:list-update", handleListUpdate);
    };
  }, [socket, queryClient]);

  // 👇 USO DE PAGINAÇÃO INFINITA (10 chats por vez) 👇
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["chats"],
      queryFn: async ({ pageParam = 0 }) => {
        const res = await api.get("/chats", {
          params: { skip: pageParam, take: 10 },
        });
        return res.data;
      },
      initialPageParam: 0,
      getNextPageParam: (lastPage) =>
        lastPage.hasMore ? lastPage.skip + lastPage.take : undefined,
    });

  // Junta todas as páginas carregadas em um único array
  const chats = data?.pages.flatMap((page) => page.data) || [];

  const renderItem = ({ item }: any) => {
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
          <View style={styles.msgRow}>
            <Text style={styles.lastMsg} numberOfLines={1}>
              {lastMsgText}
            </Text>
            {/* 👇 BOLINHA VERMELHA ATIVA 👇 */}
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
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onEndReached={() => {
          if (hasNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator style={{ margin: 20 }} />
          ) : null
        }
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
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
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
  msgRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
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
