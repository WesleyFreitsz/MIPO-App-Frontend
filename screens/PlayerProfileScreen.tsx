import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  FlatList,
} from "react-native";
import {
  ChevronLeft,
  MessageCircle,
  UserPlus,
  UserCheck,
  Heart,
} from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

interface User {
  id: string;
  name: string;
  nickname: string;
  city: string;
  avatarUrl: string;
}

interface Post {
  id: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  user: User;
  likeCount: number;
  commentCount: number;
  likedByUser: boolean;
}

const MIPO_COLORS = {
  primary: "#E11D48",
  background: "#f8fafc",
  text: "#1e293b",
  textLighter: "#64748b",
  border: "#e2e8f0",
  white: "#ffffff",
};

const PostCard = ({ post, onLike }: any) => {
  return (
    <View style={styles.postCard}>
      <Text style={styles.postContent}>{post.content}</Text>
      {post.imageUrl && (
        <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
      )}
      <View style={styles.postActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onLike(post.id)}
        >
          <Heart
            color={
              post.likedByUser ? MIPO_COLORS.primary : MIPO_COLORS.textLighter
            }
            size={16}
            fill={post.likedByUser ? MIPO_COLORS.primary : "transparent"}
          />
          <Text style={styles.actionText}>{post.likeCount}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function PlayerProfileScreen({ route, navigation }: any) {
  const { userId } = route.params;
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [friendshipStatus, setFriendshipStatus] = useState<string | null>(null);

  // Fetch usuário
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ["user", userId],
    queryFn: async () => {
      const response = await api.get(`/users/${userId}`);
      return response.data;
    },
  });

  // Fetch posts do usuário
  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ["posts", "user", userId],
    queryFn: async () => {
      const response = await api.get(`/posts/user/${userId}`, {
        params: { skip: 0, take: 20 },
      });
      return response.data;
    },
  });

  // Fetch status de amizade
  const { data: statusData } = useQuery({
    queryKey: ["friendship", userId],
    queryFn: async () => {
      const response = await api.get(`/friends/${userId}/status`);
      return response.data;
    },
  });

  // Mutations
  const sendFriendRequestMutation = useMutation({
    mutationFn: () => api.post("/friends/request", { friendId: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friendship", userId] });
      Alert.alert("Sucesso", "Solicitação de amizade enviada!");
    },
    onError: (error: any) => {
      Alert.alert(
        "Erro",
        error.response?.data?.message || "Erro ao enviar solicitação",
      );
    },
  });

  const likePostMutation = useMutation({
    mutationFn: (postId: string) => api.post(`/posts/${postId}/like`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", "user", userId] });
    },
  });

  const handleSendMessage = async () => {
    try {
      const chatResponse = await api.post(`/chats/private/${userId}`);
      navigation.navigate("ChatDetail", {
        chatId: chatResponse.data.id,
        name: userData?.nickname || userData?.name,
      });
    } catch (error: any) {
      Alert.alert("Erro", "Erro ao abrir chat");
    }
  };

  const handleAddFriend = () => {
    sendFriendRequestMutation.mutate();
  };

  if (userLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={MIPO_COLORS.primary} />
      </SafeAreaView>
    );
  }

  const isFriend = statusData?.status === "ACCEPTED";
  const isPending = statusData?.status === "PENDING";

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft color={MIPO_COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perfil</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView>
        {/* PERFIL */}
        <View style={styles.profileSection}>
          <Image
            source={{
              uri:
                userData?.avatarUrl ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${userData?.name}`,
            }}
            style={styles.avatar}
          />
          <Text style={styles.name}>
            {userData?.nickname || userData?.name}
          </Text>
          <Text style={styles.city}>{userData?.city}</Text>

          {/* BOTÕES DE AÇÃO */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.messageButton}
              onPress={handleSendMessage}
            >
              <MessageCircle color={MIPO_COLORS.white} size={18} />
              <Text style={styles.messageButtonText}>Enviar Mensagem</Text>
            </TouchableOpacity>

            {!isFriend && !isPending && currentUser?.id !== userId && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddFriend}
                disabled={sendFriendRequestMutation.isPending}
              >
                <UserPlus color={MIPO_COLORS.white} size={18} />
                <Text style={styles.addButtonText}>Adicionar Amigo</Text>
              </TouchableOpacity>
            )}

            {isPending && (
              <View style={[styles.addButton, styles.pendingButton]}>
                <UserCheck color={MIPO_COLORS.white} size={18} />
                <Text style={styles.addButtonText}>Solicitação Enviada</Text>
              </View>
            )}

            {isFriend && (
              <View style={[styles.addButton, styles.friendButton]}>
                <UserCheck color={MIPO_COLORS.white} size={18} />
                <Text style={styles.addButtonText}>Amigo</Text>
              </View>
            )}
          </View>
        </View>

        {/* POSTS */}
        <View style={styles.postsSection}>
          <Text style={styles.sectionTitle}>
            Posts ({postsData?.data?.length || 0})
          </Text>

          {postsLoading ? (
            <ActivityIndicator size="large" color={MIPO_COLORS.primary} />
          ) : postsData?.data && postsData.data.length > 0 ? (
            <FlatList
              data={postsData.data}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <PostCard
                  post={item}
                  onLike={() => likePostMutation.mutate(item.id)}
                />
              )}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Nenhum post</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MIPO_COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: MIPO_COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: MIPO_COLORS.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: MIPO_COLORS.text,
  },
  profileSection: {
    backgroundColor: MIPO_COLORS.white,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: MIPO_COLORS.text,
  },
  city: {
    fontSize: 14,
    color: MIPO_COLORS.textLighter,
    marginTop: 4,
    marginBottom: 16,
  },
  actionButtons: {
    width: "100%",
    gap: 8,
  },
  messageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    backgroundColor: MIPO_COLORS.primary,
    borderRadius: 8,
    gap: 8,
  },
  messageButtonText: {
    color: MIPO_COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    backgroundColor: MIPO_COLORS.primary,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: MIPO_COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },
  pendingButton: {
    backgroundColor: MIPO_COLORS.textLighter,
  },
  friendButton: {
    backgroundColor: "#10b981",
  },
  postsSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: MIPO_COLORS.text,
    marginBottom: 12,
  },
  postCard: {
    backgroundColor: MIPO_COLORS.white,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: MIPO_COLORS.border,
  },
  postContent: {
    fontSize: 14,
    color: MIPO_COLORS.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  postImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  postActions: {
    flexDirection: "row",
    gap: 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    color: MIPO_COLORS.textLighter,
  },
  emptyContainer: {
    paddingVertical: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: MIPO_COLORS.textLighter,
  },
});
