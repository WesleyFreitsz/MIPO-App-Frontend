import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from "react-native";
import {
  Heart,
  MessageCircle,
  Share2,
  UserPlus,
  Search,
  Plus,
  MessageSquare,
  User,
  Gift,
  X,
} from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Post {
  id: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    nickname: string;
    avatarUrl: string;
  };
  likeCount: number;
  commentCount: number;
  likedByUser: boolean;
}

interface Chat {
  id: string;
  name: string;
  type: string;
  imageUrl: string | null;
  lastMessage?: {
    content: string;
    createdAt: string;
  };
  unreadCount: number;
}

const MIPO_COLORS = {
  primary: "#E11D48",
  background: "#f8fafc",
  text: "#1e293b",
  textLighter: "#64748b",
  border: "#e2e8f0",
  white: "#ffffff",
};

// ===== COMPONENTE DO POST =====
const PostCard = ({ post, onLike, onComment, onUserProfile }: any) => {
  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <View style={styles.postCard}>
      {/* Header do Post */}
      <TouchableOpacity
        style={styles.postHeader}
        onPress={() => onUserProfile(post.user.id)}
      >
        <Image
          source={{
            uri:
              post.user.avatarUrl ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${post.user.name}`,
          }}
          style={styles.postAvatar}
        />
        <View style={styles.postUserInfo}>
          <Text style={styles.postUserName}>
            {post.user.nickname || post.user.name}
          </Text>
          <Text style={styles.postTime}>{formatDate(post.createdAt)}</Text>
        </View>
      </TouchableOpacity>

      {/* Conteúdo */}
      <Text style={styles.postContent}>{post.content}</Text>

      {/* Imagem */}
      {post.imageUrl && (
        <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
      )}

      {/* Ações */}
      <View style={styles.postActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onLike(post.id)}
        >
          <Heart
            color={
              post.likedByUser ? MIPO_COLORS.primary : MIPO_COLORS.textLighter
            }
            size={18}
            fill={post.likedByUser ? MIPO_COLORS.primary : "transparent"}
          />
          <Text style={styles.actionText}>{post.likeCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onComment(post.id)}
        >
          <MessageCircle color={MIPO_COLORS.textLighter} size={18} />
          <Text style={styles.actionText}>{post.commentCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Share2 color={MIPO_COLORS.textLighter} size={18} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ===== COMPONENTE DO CHAT =====
const ChatItem = ({ chat, onPress }: any) => {
  return (
    <TouchableOpacity style={styles.chatItem} onPress={onPress}>
      <View style={styles.chatAvatarContainer}>
        <Image
          source={{
            uri:
              chat.imageUrl ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${chat.name}`,
          }}
          style={styles.chatAvatar}
        />
        {chat.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{chat.unreadCount}</Text>
          </View>
        )}
      </View>

      <View style={styles.chatContent}>
        <Text style={styles.chatName}>{chat.name}</Text>
        {chat.lastMessage && (
          <Text numberOfLines={1} style={styles.chatLastMessage}>
            {chat.lastMessage.content}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

// ===== COMPONENTE DO USUÁRIO PARA ADICIONAR =====
const UserCard = ({ user, onAdd, isFriendRequested }: any) => {
  return (
    <View style={styles.userCard}>
      <Image
        source={{
          uri:
            user.avatarUrl ||
            `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`,
        }}
        style={styles.userCardAvatar}
      />
      <View style={styles.userCardInfo}>
        <Text style={styles.userCardName}>{user.nickname || user.name}</Text>
        <Text style={styles.userCardCity}>{user.city}</Text>
      </View>
      <TouchableOpacity
        style={[styles.addButton, isFriendRequested && styles.addButtonPending]}
        onPress={() => onAdd(user.id)}
        disabled={isFriendRequested}
      >
        <UserPlus color={MIPO_COLORS.white} size={18} />
      </TouchableOpacity>
    </View>
  );
};

// ===== COMPONENTE DO AMIGO =====
const FriendCard = ({ friend, onMessage, onProfile, onInviteToEvent }: any) => {
  return (
    <View style={styles.friendCard}>
      <Image
        source={{
          uri:
            friend.avatarUrl ||
            `https://api.dicebear.com/7.x/initials/svg?seed=${friend.name}`,
        }}
        style={styles.friendCardAvatar}
      />
      <View style={styles.friendCardInfo}>
        <Text style={styles.friendCardName}>
          {friend.nickname || friend.name}
        </Text>
        <Text style={styles.friendCardCity}>{friend.city}</Text>
      </View>
      <View style={styles.friendCardActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onMessage(friend.id)}
        >
          <MessageSquare color={MIPO_COLORS.primary} size={18} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onProfile(friend.id)}
        >
          <User color={MIPO_COLORS.primary} size={18} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onInviteToEvent(friend.id)}
        >
          <Gift color={MIPO_COLORS.primary} size={18} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ===== SCREEN PRINCIPAL =====
export default function SocialScreen({ navigation }: any) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("feed");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [addFriendsModalVisible, setAddFriendsModalVisible] = useState(false);

  // ===== QUERIES =====
  const {
    data: feedData,
    isLoading: feedLoading,
    refetch: refetchFeed,
  } = useQuery({
    queryKey: ["posts", "feed"],
    queryFn: async () => {
      const response = await api.get("/posts/feed", {
        params: { skip: 0, take: 20 },
      });
      return response.data;
    },
  });

  const {
    data: friendsData,
    isLoading: friendsLoading,
    refetch: refetchFriends,
  } = useQuery({
    queryKey: ["friends"],
    queryFn: async () => {
      const response = await api.get("/friends", {
        params: { skip: 0, take: 50 },
      });
      return response.data;
    },
  });

  const {
    data: chatsData,
    isLoading: chatsLoading,
    refetch: refetchChats,
  } = useQuery({
    queryKey: ["chats"],
    queryFn: async () => {
      const response = await api.get("/chats", {
        params: { skip: 0, take: 20 },
      });
      return response.data;
    },
  });

  const {
    data: usersData,
    isLoading: usersLoading,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ["friends", "available"],
    queryFn: async () => {
      const response = await api.get("/friends/available/users", {
        params: { skip: 0, take: 20 },
      });
      return response.data;
    },
  });

  // ===== MUTATIONS =====
  const likePostMutation = useMutation({
    mutationFn: (postId: string) => api.post(`/posts/${postId}/like`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", "feed"] });
    },
    onError: (error: any) => {
      if (error.response?.status === 400) {
        // Já deu like, remover
        return;
      }
    },
  });

  const sendFriendRequestMutation = useMutation({
    mutationFn: (friendId: string) =>
      api.post("/friends/request", { friendId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends", "available"] });
      Alert.alert("Sucesso", "Solicitação de amizade enviada!");
    },
    onError: (error: any) => {
      Alert.alert(
        "Erro",
        error.response?.data?.message || "Erro ao enviar solicitação",
      );
    },
  });

  const createPrivateChatMutation = useMutation({
    mutationFn: (targetUserId: string) =>
      api.post(`/chats/private/${targetUserId}`),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      navigation.navigate("ChatDetail", { chatId: response.data.id });
    },
    onError: (error: any) => {
      Alert.alert(
        "Erro",
        error.response?.data?.message || "Erro ao criar chat",
      );
    },
  });

  // ===== CALLBACKS =====
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchFeed(),
      refetchChats(),
      refetchFriends(),
      refetchUsers(),
    ]);
    setRefreshing(false);
  };

  const handleLikePost = (postId: string) => {
    likePostMutation.mutate(postId);
  };

  const handleCommentPost = (postId: string) => {
    navigation.navigate("ChatDetail", { postId, type: "post" });
  };

  const handleUserProfile = (userId: string) => {
    navigation.navigate("PlayerProfile", { userId });
  };

  const handleAddFriend = (userId: string) => {
    sendFriendRequestMutation.mutate(userId);
  };

  const handleFriendMessage = (friendId: string) => {
    createPrivateChatMutation.mutate(friendId);
  };

  const handleFriendProfile = (friendId: string) => {
    navigation.navigate("PlayerProfile", { userId: friendId });
  };

  const handleInviteToEvent = (friendId: string) => {
    Alert.alert("Em desenvolvimento", "Convite para evento (em breve)", [
      { text: "OK" },
    ]);
  };

  const handleChatPress = (chat: Chat) => {
    navigation.navigate("ChatDetail", { chatId: chat.id, name: chat.name });
  };

  // ===== RENDER =====
  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER COM ABAS */}
      <View style={styles.header}>
        <View style={styles.tabButtons}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "feed" && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab("feed")}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "feed" && styles.tabButtonTextActive,
              ]}
            >
              Feed
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "friends" && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab("friends")}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "friends" && styles.tabButtonTextActive,
              ]}
            >
              Amigos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "chats" && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab("chats")}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "chats" && styles.tabButtonTextActive,
              ]}
            >
              Chats
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* CONTEÚDO DAS ABAS */}
      {activeTab === "feed" && (
        <FlatList
          data={feedData?.data || []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onLike={handleLikePost}
              onComment={handleCommentPost}
              onUserProfile={handleUserProfile}
            />
          )}
          ListEmptyComponent={
            feedLoading ? (
              <ActivityIndicator size="large" color={MIPO_COLORS.primary} />
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Nenhum post no feed</Text>
              </View>
            )
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.feedContent}
        />
      )}

      {activeTab === "friends" && (
        <View style={styles.friendsContainer}>
          {/* HEADER COM BOTÃO DE ADICIONAR */}
          <View style={styles.friendsHeader}>
            <Text style={styles.friendsTitle}>Meus Amigos</Text>
            <TouchableOpacity
              style={styles.addNewFriendButton}
              onPress={() => setAddFriendsModalVisible(true)}
            >
              <UserPlus color={MIPO_COLORS.white} size={18} />
              <Text style={styles.addNewFriendButtonText}>Adicionar</Text>
            </TouchableOpacity>
          </View>

          {/* LISTA DE AMIGOS */}
          <FlatList
            data={friendsData?.data || []}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <FriendCard
                friend={item}
                onMessage={handleFriendMessage}
                onProfile={handleFriendProfile}
                onInviteToEvent={handleInviteToEvent}
              />
            )}
            ListEmptyComponent={
              friendsLoading ? (
                <ActivityIndicator size="large" color={MIPO_COLORS.primary} />
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    Você não tem amigos ainda
                  </Text>
                  <TouchableOpacity
                    style={styles.ctaButton}
                    onPress={() => setAddFriendsModalVisible(true)}
                  >
                    <Text style={styles.ctaButtonText}>
                      Adicionar novo amigo
                    </Text>
                  </TouchableOpacity>
                </View>
              )
            }
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />

          {/* MODAL PARA ADICIONAR NOVOS AMIGOS */}
          <Modal
            visible={addFriendsModalVisible}
            animationType="slide"
            transparent={true}
          >
            <SafeAreaView style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Adicionar novos amigos</Text>
                <TouchableOpacity
                  onPress={() => setAddFriendsModalVisible(false)}
                >
                  <X color={MIPO_COLORS.text} size={24} />
                </TouchableOpacity>
              </View>

              <FlatList
                data={usersData?.data || []}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <UserCard
                    user={item}
                    onAdd={handleAddFriend}
                    isFriendRequested={false}
                  />
                )}
                ListEmptyComponent={
                  usersLoading ? (
                    <ActivityIndicator
                      size="large"
                      color={MIPO_COLORS.primary}
                    />
                  ) : (
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>
                        Todos são seus amigos!
                      </Text>
                    </View>
                  )
                }
              />
            </SafeAreaView>
          </Modal>
        </View>
      )}

      {activeTab === "chats" && (
        <View style={styles.chatsContainer}>
          {/* CRIAR GRUPO BUTTON */}
          <TouchableOpacity
            style={styles.createGroupButton}
            onPress={() => navigation.navigate("CreateChatGroup")}
          >
            <Plus color={MIPO_COLORS.white} size={20} />
            <Text style={styles.createGroupButtonText}>
              Criar Grupo de Chat
            </Text>
          </TouchableOpacity>

          {/* LISTA DE CHATS */}
          <FlatList
            data={chatsData?.data || []}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ChatItem chat={item} onPress={() => handleChatPress(item)} />
            )}
            ListEmptyComponent={
              chatsLoading ? (
                <ActivityIndicator size="large" color={MIPO_COLORS.primary} />
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    Nenhum chat ainda. Crie um grupo ou converse com seus
                    amigos!
                  </Text>
                </View>
              )
            }
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MIPO_COLORS.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: MIPO_COLORS.border,
    backgroundColor: MIPO_COLORS.white,
  },
  tabButtons: {
    flexDirection: "row",
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: MIPO_COLORS.background,
    alignItems: "center",
  },
  tabButtonActive: {
    backgroundColor: MIPO_COLORS.primary,
  },
  tabButtonText: {
    color: MIPO_COLORS.textLighter,
    fontSize: 14,
    fontWeight: "600",
  },
  tabButtonTextActive: {
    color: MIPO_COLORS.white,
  },
  feedContent: {
    paddingVertical: 12,
  },
  postCard: {
    backgroundColor: MIPO_COLORS.white,
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  postUserInfo: {
    flex: 1,
  },
  postUserName: {
    fontSize: 14,
    fontWeight: "600",
    color: MIPO_COLORS.text,
  },
  postTime: {
    fontSize: 12,
    color: MIPO_COLORS.textLighter,
    marginTop: 2,
  },
  postContent: {
    fontSize: 14,
    color: MIPO_COLORS.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  postImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  postActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: MIPO_COLORS.border,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionText: {
    fontSize: 12,
    color: MIPO_COLORS.textLighter,
  },
  chatItem: {
    backgroundColor: MIPO_COLORS.white,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: MIPO_COLORS.border,
    flexDirection: "row",
    alignItems: "center",
  },
  chatAvatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  chatAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  unreadBadge: {
    position: "absolute",
    right: -4,
    bottom: -4,
    backgroundColor: MIPO_COLORS.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  unreadText: {
    color: MIPO_COLORS.white,
    fontSize: 11,
    fontWeight: "600",
  },
  chatContent: {
    flex: 1,
  },
  chatName: {
    fontSize: 14,
    fontWeight: "600",
    color: MIPO_COLORS.text,
  },
  chatLastMessage: {
    fontSize: 12,
    color: MIPO_COLORS.textLighter,
    marginTop: 4,
  },
  friendsContainer: {
    flex: 1,
    paddingVertical: 12,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: MIPO_COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: MIPO_COLORS.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: MIPO_COLORS.text,
  },
  createGroupButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: MIPO_COLORS.primary,
    borderRadius: 8,
    gap: 8,
  },
  createGroupButtonText: {
    color: MIPO_COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: MIPO_COLORS.white,
    marginHorizontal: 16,
    marginVertical: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: MIPO_COLORS.border,
  },
  userCardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  userCardInfo: {
    flex: 1,
  },
  userCardName: {
    fontSize: 14,
    fontWeight: "600",
    color: MIPO_COLORS.text,
  },
  userCardCity: {
    fontSize: 12,
    color: MIPO_COLORS.textLighter,
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: MIPO_COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonPending: {
    backgroundColor: MIPO_COLORS.textLighter,
    opacity: 0.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: MIPO_COLORS.textLighter,
  },
  friendsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: MIPO_COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: MIPO_COLORS.border,
  },
  friendsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: MIPO_COLORS.text,
  },
  addNewFriendButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: MIPO_COLORS.primary,
    borderRadius: 6,
    gap: 6,
  },
  addNewFriendButtonText: {
    color: MIPO_COLORS.white,
    fontSize: 12,
    fontWeight: "600",
  },
  friendCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: MIPO_COLORS.white,
    marginHorizontal: 16,
    marginVertical: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: MIPO_COLORS.border,
  },
  friendCardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  friendCardInfo: {
    flex: 1,
  },
  friendCardName: {
    fontSize: 14,
    fontWeight: "600",
    color: MIPO_COLORS.text,
  },
  friendCardCity: {
    fontSize: 12,
    color: MIPO_COLORS.textLighter,
    marginTop: 2,
  },
  friendCardActions: {
    flexDirection: "row",
    gap: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: MIPO_COLORS.background,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: MIPO_COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: MIPO_COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: MIPO_COLORS.text,
  },
  chatsContainer: {
    flex: 1,
    paddingVertical: 12,
  },
  ctaButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: MIPO_COLORS.primary,
    borderRadius: 6,
  },
  ctaButtonText: {
    color: MIPO_COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },
});
