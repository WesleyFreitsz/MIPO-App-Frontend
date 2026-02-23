import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
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
  Newspaper,
  Users,
  MessagesSquare,
  User,
  Gift,
  X,
} from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";

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

interface SocialUser {
  id: string;
  name: string;
  nickname: string;
  city: string;
  avatarUrl: string;
}

const MIPO_COLORS = {
  primary: "#c73636",
  background: "#faf6f1",
  text: "#1c1917",
  textLighter: "#78716c",
  border: "#e7e5e4",
  white: "#ffffff",
};

const formatDate = (date: string) => {
  const d = new Date(date);
  return d.toLocaleDateString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const TabButton = ({
  active,
  label,
  onPress,
  icon,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  icon: React.ReactNode;
}) => (
  <TouchableOpacity
    style={[styles.tabButton, active && styles.tabButtonActive]}
    onPress={onPress}
  >
    {icon}
    <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const PostCard = ({ post, onLike, onComment, onUserProfile }: any) => {
  return (
    <View style={styles.postCard}>
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

      <Text style={styles.postContent}>{post.content}</Text>

      {post.imageUrl && (
        <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
      )}

      <View style={styles.postActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => onLike(post.id)}>
          <Heart
            color={post.likedByUser ? MIPO_COLORS.primary : MIPO_COLORS.textLighter}
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
        <Text style={styles.userCardCity}>{user.city || "Sem cidade"}</Text>
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
        <Text style={styles.friendCardName}>{friend.nickname || friend.name}</Text>
        <Text style={styles.friendCardCity}>{friend.city || "Sem cidade"}</Text>
      </View>
      <View style={styles.friendCardActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => onMessage(friend.id)}>
          <MessageSquare color={MIPO_COLORS.primary} size={18} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => onProfile(friend.id)}>
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

export default function SocialScreen({ navigation }: any) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("feed");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [addFriendsModalVisible, setAddFriendsModalVisible] = useState(false);
  const [pendingFriendRequests, setPendingFriendRequests] = useState<string[]>([]);

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

  const likePostMutation = useMutation({
    mutationFn: (postId: string) => api.post(`/posts/${postId}/like`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", "feed"] });
    },
    onError: (error: any) => {
      if (error.response?.status === 400) {
        return;
      }
    },
  });

  const sendFriendRequestMutation = useMutation({
    mutationFn: (friendId: string) => api.post("/friends/request", { friendId }),
    onSuccess: (_, friendId) => {
      queryClient.invalidateQueries({ queryKey: ["friends", "available"] });
      setPendingFriendRequests((prev) => [...prev, friendId]);
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
    mutationFn: (targetUserId: string) => api.post(`/chats/private/${targetUserId}`),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      navigation.navigate("ChatDetail", { chatId: response.data.id });
    },
    onError: (error: any) => {
      Alert.alert("Erro", error.response?.data?.message || "Erro ao criar chat");
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchFeed(), refetchChats(), refetchFriends(), refetchUsers()]);
    setRefreshing(false);
  };

  const feedPosts = useMemo(
    () => ((feedData?.data || []) as Post[]),
    [feedData?.data],
  );
  const friends = useMemo(
    () => ((friendsData?.data || []) as SocialUser[]),
    [friendsData?.data],
  );
  const chats = useMemo(() => ((chatsData?.data || []) as Chat[]), [chatsData?.data]);
  const suggestedUsers = useMemo(
    () => ((usersData?.data || []) as SocialUser[]),
    [usersData?.data],
  );

  const filteredFeed = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return feedPosts;
    return feedPosts.filter((post) => {
      const userName = `${post.user.nickname || ""} ${post.user.name || ""}`.toLowerCase();
      return post.content.toLowerCase().includes(q) || userName.includes(q);
    });
  }, [feedPosts, searchQuery]);

  const filteredFriends = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((friend) => {
      const fullName = `${friend.nickname || ""} ${friend.name || ""} ${friend.city || ""}`.toLowerCase();
      return fullName.includes(q);
    });
  }, [friends, searchQuery]);

  const filteredChats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter((chat) => {
      const haystack = `${chat.name || ""} ${chat.lastMessage?.content || ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [chats, searchQuery]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return suggestedUsers;
    return suggestedUsers.filter((u) => {
      const haystack = `${u.nickname || ""} ${u.name || ""} ${u.city || ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [searchQuery, suggestedUsers]);

  const totalUnreadMessages = useMemo(
    () => chats.reduce((sum, chat) => sum + chat.unreadCount, 0),
    [chats],
  );

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
    if (pendingFriendRequests.includes(userId)) {
      return;
    }
    sendFriendRequestMutation.mutate(userId);
  };

  const handleFriendMessage = (friendId: string) => {
    createPrivateChatMutation.mutate(friendId);
  };

  const handleFriendProfile = (friendId: string) => {
    navigation.navigate("PlayerProfile", { userId: friendId });
  };

  const handleInviteToEvent = (friendId: string) => {
    Alert.alert("Em desenvolvimento", "Convite para evento (em breve)", [{ text: "OK" }]);
  };

  const handleChatPress = (chat: Chat) => {
    navigation.navigate("ChatDetail", { chatId: chat.id, name: chat.name });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.topTitleRow}>
          <View>
            <Text style={styles.screenTitle}>Mipo Social</Text>
            <Text style={styles.screenSubtitle}>Conecte-se com amigos e comunidades</Text>
          </View>
          <View style={styles.profileBubble}>
            <Text style={styles.profileBubbleText}>
              {(user?.name || "M").slice(0, 1).toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Search color={MIPO_COLORS.textLighter} size={18} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar post, amigo ou chat"
            placeholderTextColor={MIPO_COLORS.textLighter}
          />
          {!!searchQuery && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X color={MIPO_COLORS.textLighter} size={18} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.quickStatsRow}>
          <View style={styles.statPill}>
            <Users color={MIPO_COLORS.primary} size={14} />
            <Text style={styles.statPillText}>{friends.length} amigos</Text>
          </View>
          <View style={styles.statPill}>
            <MessagesSquare color={MIPO_COLORS.primary} size={14} />
            <Text style={styles.statPillText}>{totalUnreadMessages} não lidas</Text>
          </View>
        </View>

        <View style={styles.tabButtons}>
          <TabButton
            active={activeTab === "feed"}
            label="Feed"
            onPress={() => setActiveTab("feed")}
            icon={<Newspaper color={activeTab === "feed" ? MIPO_COLORS.white : MIPO_COLORS.textLighter} size={16} />}
          />
          <TabButton
            active={activeTab === "friends"}
            label="Amigos"
            onPress={() => setActiveTab("friends")}
            icon={<Users color={activeTab === "friends" ? MIPO_COLORS.white : MIPO_COLORS.textLighter} size={16} />}
          />
          <TabButton
            active={activeTab === "chats"}
            label="Chats"
            onPress={() => setActiveTab("chats")}
            icon={<MessagesSquare color={activeTab === "chats" ? MIPO_COLORS.white : MIPO_COLORS.textLighter} size={16} />}
          />
        </View>
      </View>

      {activeTab === "feed" && (
        <FlatList
          data={filteredFeed}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onLike={handleLikePost}
              onComment={handleCommentPost}
              onUserProfile={handleUserProfile}
            />
          )}
          ListHeaderComponent={
            <Text style={styles.feedInfoText}>
              Timeline personalizada para você · {filteredFeed.length} posts
            </Text>
          }
          ListEmptyComponent={
            feedLoading ? (
              <ActivityIndicator size="large" color={MIPO_COLORS.primary} />
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Nenhum post no feed para essa busca</Text>
              </View>
            )
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.feedContent}
        />
      )}

      {activeTab === "friends" && (
        <View style={styles.friendsContainer}>
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

          <FlatList
            data={filteredFriends}
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
                  <Text style={styles.emptyText}>Nenhum amigo encontrado</Text>
                  <TouchableOpacity
                    style={styles.ctaButton}
                    onPress={() => setAddFriendsModalVisible(true)}
                  >
                    <Text style={styles.ctaButtonText}>Adicionar novo amigo</Text>
                  </TouchableOpacity>
                </View>
              )
            }
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          />

          <Modal visible={addFriendsModalVisible} animationType="slide" transparent>
            <SafeAreaView style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Adicionar novos amigos</Text>
                <TouchableOpacity onPress={() => setAddFriendsModalVisible(false)}>
                  <X color={MIPO_COLORS.text} size={24} />
                </TouchableOpacity>
              </View>

              <FlatList
                data={filteredUsers}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <UserCard
                    user={item}
                    onAdd={handleAddFriend}
                    isFriendRequested={pendingFriendRequests.includes(item.id)}
                  />
                )}
                ListEmptyComponent={
                  usersLoading ? (
                    <ActivityIndicator size="large" color={MIPO_COLORS.primary} />
                  ) : (
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>Todos são seus amigos!</Text>
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
          <TouchableOpacity
            style={styles.createGroupButton}
            onPress={() => navigation.navigate("CreateChatGroup")}
          >
            <Plus color={MIPO_COLORS.white} size={20} />
            <Text style={styles.createGroupButtonText}>Criar Grupo de Chat</Text>
          </TouchableOpacity>

          <FlatList
            data={filteredChats}
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
                    Nenhum chat encontrado. Crie um grupo ou converse com amigos!
                  </Text>
                </View>
              )
            }
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
    paddingTop: 6,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: MIPO_COLORS.border,
    backgroundColor: MIPO_COLORS.white,
    gap: 10,
  },
  topTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: MIPO_COLORS.text,
  },
  screenSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: MIPO_COLORS.textLighter,
  },
  profileBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: MIPO_COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  profileBubbleText: {
    color: MIPO_COLORS.white,
    fontWeight: "700",
  },
  tabButtons: {
    flexDirection: "row",
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: MIPO_COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: MIPO_COLORS.primary,
  },
  tabButtonText: {
    color: MIPO_COLORS.textLighter,
    fontSize: 13,
    fontWeight: "700",
  },
  tabButtonTextActive: {
    color: MIPO_COLORS.white,
  },
  feedContent: {
    paddingBottom: 12,
  },
  feedInfoText: {
    fontSize: 12,
    color: MIPO_COLORS.textLighter,
    marginHorizontal: 16,
    marginTop: 12,
  },
  postCard: {
    backgroundColor: MIPO_COLORS.white,
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: MIPO_COLORS.border,
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
    height: 220,
    borderRadius: 12,
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
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  actionText: {
    fontSize: 12,
    color: MIPO_COLORS.textLighter,
  },
  chatItem: {
    backgroundColor: MIPO_COLORS.white,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: MIPO_COLORS.border,
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
    paddingTop: 12,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: MIPO_COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: MIPO_COLORS.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: MIPO_COLORS.text,
  },
  quickStatsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#fff2f2",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statPillText: {
    fontSize: 12,
    color: MIPO_COLORS.primary,
    fontWeight: "600",
  },
  createGroupButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 12,
    backgroundColor: MIPO_COLORS.primary,
    borderRadius: 10,
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
    borderRadius: 10,
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
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 14,
    color: MIPO_COLORS.textLighter,
    textAlign: "center",
  },
  friendsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    borderRadius: 20,
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
    borderRadius: 10,
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
    paddingTop: 12,
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
