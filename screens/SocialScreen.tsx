import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  useColorScheme,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import {
  Heart,
  MessageCircle,
  Plus,
  MessageSquare,
  X,
  Camera,
  Users,
  UserPlus,
  AlertTriangle,
  Search,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWebSocketChat } from "../hooks/useWebSocketChat";

export default function SocialScreen({ navigation }: any) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const insets = useSafeAreaInsets();

  const { socket } = useWebSocketChat();

  const theme = {
    bg: isDark ? "#000000" : "#faf6f1",
    surface: isDark ? "#121212" : "#ffffff",
    text: isDark ? "#ffffff" : "#1c1917",
    textMuted: isDark ? "#a1a1aa" : "#78716c",
    border: isDark ? "#27272a" : "#e7e5e4",
    primary: "#c73636",
    danger: "#ef4444",
  };

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

  const [activeTab, setActiveTab] = useState("feed");
  const [createPostModal, setCreatePostModal] = useState(false);
  const [newChatModal, setNewChatModal] = useState(false);

  // Buscar Amigos
  const [addFriendsModal, setAddFriendsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Post Tela Cheia
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [commentText, setCommentText] = useState("");

  // Criação de Post
  const [postContent, setPostContent] = useState("");
  const [postImage, setPostImage] = useState<string | null>(null);
  const [isCreatingPost, setIsCreatingPost] = useState(false);

  // Denúncia
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [postToReport, setPostToReport] = useState<any>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportImage, setReportImage] = useState<string | null>(null);
  const [isReporting, setIsReporting] = useState(false);

  const { data: feedData, refetch: refetchFeed } = useQuery({
    queryKey: ["posts", "feed"],
    queryFn: async () => (await api.get("/posts/feed")).data,
  });
  const { data: chatsData, refetch: refetchChats } = useQuery({
    queryKey: ["chats"],
    queryFn: async () => (await api.get("/chats")).data,
  });
  const { data: friendsData } = useQuery({
    queryKey: ["friends"],
    queryFn: async () => (await api.get("/friends")).data,
  });
  const { data: availableUsers } = useQuery({
    queryKey: ["friends", "available"],
    queryFn: async () => (await api.get("/friends/available/users")).data,
  });
  const { data: commentsData, refetch: refetchComments } = useQuery({
    queryKey: ["comments", selectedPost?.id],
    queryFn: async () =>
      (await api.get(`/posts/${selectedPost?.id}/comments`)).data,
    enabled: !!selectedPost?.id,
  });

  // MUTATIONS (Incluindo Delete Like correto)
  const toggleLikeMutation = useMutation({
    mutationFn: (post: any) =>
      post.likedByUser
        ? api.delete(`/posts/${post.id}/like`)
        : api.post(`/posts/${post.id}/like`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", "feed"] });
      if (selectedPost) {
        setSelectedPost({
          ...selectedPost,
          likedByUser: !selectedPost.likedByUser,
          likeCount: selectedPost.likedByUser
            ? selectedPost.likeCount - 1
            : selectedPost.likeCount + 1,
        });
      }
    },
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) =>
      api.post(`/posts/${selectedPost?.id}/comments`, { content }),
    onSuccess: () => {
      setCommentText("");
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ["posts", "feed"] });
    },
  });

  const createPrivateChatMutation = useMutation({
    mutationFn: (friendId: string) => api.post(`/chats/private/${friendId}`),
    onSuccess: (res) => {
      setNewChatModal(false);
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      navigation.navigate("ChatDetail", {
        chatId: res.data.id,
        name: "Conversa",
      });
    },
  });

  const sendFriendReqMutation = useMutation({
    mutationFn: (friendId: string) =>
      api.post("/friends/request", { friendId }),
    onSuccess: () => {
      Alert.alert("Sucesso", "Solicitação enviada!");
      queryClient.invalidateQueries({ queryKey: ["friends", "available"] });
    },
  });

  const uploadImageAsync = async (uri: string) => {
    try {
      const formData = new FormData();
      const filename = uri.split("/").pop() || `photo-${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      // @ts-ignore
      formData.append("file", {
        uri,
        name: filename,
        type: match ? `image/${match[1]}` : "image/jpeg",
      });
      const res = await api.post("/uploads/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data.url;
    } catch {
      return null;
    }
  };

  const handleCreatePost = async () => {
    if (!postContent.trim() && !postImage)
      return Alert.alert("Atenção", "Digite algo ou adicione foto.");
    setIsCreatingPost(true);
    let finalImage = postImage;
    if (postImage && postImage.startsWith("file://"))
      finalImage = await uploadImageAsync(postImage);
    try {
      await api.post("/posts", { content: postContent, imageUrl: finalImage });
      queryClient.invalidateQueries({ queryKey: ["posts", "feed"] });
      setPostContent("");
      setPostImage(null);
      setCreatePostModal(false);
    } catch {
      Alert.alert("Erro", "Falha ao postar");
    } finally {
      setIsCreatingPost(false);
    }
  };

  const handleReportPost = async () => {
    if (!reportReason.trim())
      return Alert.alert("Atenção", "Preencha o motivo da denúncia.");
    setIsReporting(true);
    let finalImage = reportImage;
    if (reportImage && reportImage.startsWith("file://"))
      finalImage = await uploadImageAsync(reportImage);
    try {
      await api.post("/reports", {
        postId: postToReport.id,
        reportedUserId: postToReport.user.id,
        reason: reportReason,
        imageUrl: finalImage,
      });
      Alert.alert("Sucesso", "A denúncia foi enviada para análise.");
      setReportModalVisible(false);
      setReportReason("");
      setReportImage(null);
      setPostToReport(null);
    } catch {
      Alert.alert("Erro", "Erro ao denunciar.");
    } finally {
      setIsReporting(false);
    }
  };

  const filteredUsers =
    availableUsers?.data?.filter(
      (u: any) =>
        u.nickname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()),
    ) || [];

  const renderPost = ({ item }: any) => (
    <View
      style={[
        styles.tweetCard,
        { borderBottomColor: theme.border, backgroundColor: theme.surface },
      ]}
    >
      <TouchableOpacity
        onPress={() =>
          navigation.navigate("PlayerProfile", { userId: item.user.id })
        }
      >
        <Image
          source={{
            uri:
              item.user.avatarUrl ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${item.user.name}`,
          }}
          style={styles.tweetAvatar}
        />
      </TouchableOpacity>

      <View style={styles.tweetContentBox}>
        <View style={styles.tweetHeader}>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
            <Text
              style={[styles.tweetName, { color: theme.text }]}
              numberOfLines={1}
            >
              {item.user.name}
            </Text>
            <Text style={[styles.tweetHandle, { color: theme.textMuted }]}>
              @{item.user.nickname}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setPostToReport(item);
              setReportModalVisible(true);
            }}
          >
            <AlertTriangle size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.tweetText, { color: theme.text }]}>
          {item.content}
        </Text>

        {item.imageUrl && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSelectedPost(item)}
          >
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.tweetImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}

        <View style={styles.tweetActions}>
          <TouchableOpacity
            style={styles.tweetActionBtn}
            onPress={() => toggleLikeMutation.mutate(item)}
          >
            <Heart
              size={18}
              color={item.likedByUser ? theme.primary : theme.textMuted}
              fill={item.likedByUser ? theme.primary : "transparent"}
            />
            <Text
              style={[
                styles.tweetActionText,
                { color: item.likedByUser ? theme.primary : theme.textMuted },
              ]}
            >
              {item.likeCount}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tweetActionBtn}
            onPress={() => setSelectedPost(item)}
          >
            <MessageCircle size={18} color={theme.textMuted} />
            <Text style={[styles.tweetActionText, { color: theme.textMuted }]}>
              {item.commentCount}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* TABS */}
      <View
        style={[
          styles.topTabs,
          { backgroundColor: theme.surface, borderBottomColor: theme.border },
        ]}
      >
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab("feed")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "feed" && {
                color: theme.primary,
                fontWeight: "bold",
              },
            ]}
          >
            Para você
          </Text>
          {activeTab === "feed" && (
            <View
              style={[styles.activeLine, { backgroundColor: theme.primary }]}
            />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab("chats")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "chats" && {
                color: theme.primary,
                fontWeight: "bold",
              },
            ]}
          >
            Conversas
          </Text>
          {activeTab === "chats" && (
            <View
              style={[styles.activeLine, { backgroundColor: theme.primary }]}
            />
          )}
        </TouchableOpacity>
      </View>

      {activeTab === "feed" ? (
        <FlatList
          data={feedData?.data}
          keyExtractor={(i) => i.id}
          renderItem={renderPost}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refetchFeed} />
          }
        />
      ) : (
        <FlatList
          data={chatsData?.data}
          keyExtractor={(i) => i.id}
          renderItem={({ item }: any) => {
            // 1. Identificar o tipo do chat
            const isPrivate = item.type === "PRIVATE";
            const isEvent = item.type === "EVENT";
            const isGroup = item.type === "GROUP";

            // 2. Achar o outro usuário se for chat privado
            const otherMember = item.members?.find(
              (m: any) => m.userId !== user?.id,
            );

            // 3. Definir Título e Avatar dinâmicos
            const title = isPrivate
              ? otherMember?.user?.nickname || otherMember?.user?.name
              : item.name;

            const avatar = isPrivate
              ? otherMember?.user?.avatarUrl
              : item.imageUrl;

            // 4. Definir o ID alvo para navegação (Perfil, Evento ou Grupo)
            const targetId = isPrivate
              ? otherMember?.userId
              : item.eventId || item.id;

            return (
              <TouchableOpacity
                style={[styles.chatItem, { backgroundColor: theme.surface }]}
                onPress={() =>
                  navigation.navigate("ChatDetail", {
                    chatId: item.id,
                    name: title,
                    type: item.type, // Passando o tipo
                    avatar: avatar, // Passando o avatar
                    targetId: targetId, // Passando o ID alvo
                  })
                }
              >
                <Image
                  source={{
                    uri:
                      avatar ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${title}`,
                  }}
                  style={styles.chatAvatar}
                />
                <View
                  style={[styles.chatInfo, { borderBottomColor: theme.border }]}
                >
                  <View style={styles.chatHeaderRow}>
                    <Text
                      style={[styles.chatName, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {title} {isEvent && "📅"} {isGroup && "👥"}
                    </Text>
                    <Text
                      style={[
                        styles.chatTime,
                        {
                          color:
                            item.unreadCount > 0
                              ? theme.primary
                              : theme.textMuted,
                        },
                      ]}
                    >
                      {item.lastMessage
                        ? new Date(
                            item.lastMessage.createdAt,
                          ).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </Text>
                  </View>
                  <View style={styles.chatMessageRow}>
                    <Text
                      style={[styles.chatLastMsg, { color: theme.textMuted }]}
                      numberOfLines={1}
                    >
                      {item.lastMessage?.content || "Nenhuma mensagem"}
                    </Text>
                    {item.unreadCount > 0 && (
                      <View
                        style={[
                          styles.unreadBadge,
                          { backgroundColor: theme.primary },
                        ]}
                      >
                        <Text style={styles.unreadText}>
                          {item.unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refetchChats} />
          }
        />
      )}

      {/* FABs */}
      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor: theme.primary,
            bottom: activeTab === "chats" ? 90 : 20,
          },
        ]}
        onPress={() =>
          activeTab === "feed"
            ? setCreatePostModal(true)
            : setAddFriendsModal(true)
        }
      >
        {activeTab === "feed" ? (
          <Plus color="#fff" size={24} />
        ) : (
          <UserPlus color="#fff" size={24} />
        )}
      </TouchableOpacity>

      {activeTab === "chats" && (
        <TouchableOpacity
          style={[
            styles.fab,
            {
              backgroundColor: theme.surface,
              borderWidth: 1,
              borderColor: theme.border,
              bottom: 20,
            },
          ]}
          onPress={() => setNewChatModal(true)}
        >
          <MessageSquare color={theme.text} size={24} />
        </TouchableOpacity>
      )}

      {/* MODAL ADD AMIGOS */}
      <Modal visible={addFriendsModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
          <View
            style={[
              styles.modalHeader,
              {
                borderBottomColor: theme.border,
                backgroundColor: theme.surface,
              },
            ]}
          >
            <TouchableOpacity onPress={() => setAddFriendsModal(false)}>
              <X color={theme.text} size={24} />
            </TouchableOpacity>
            <Text
              style={{ fontSize: 16, fontWeight: "bold", color: theme.text }}
            >
              Adicionar Amigos
            </Text>
            <View style={{ width: 24 }} />
          </View>
          <View
            style={[
              styles.searchContainer,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Search color={theme.textMuted} size={20} />
            <TextInput
              style={{ flex: 1, marginLeft: 10, color: theme.text }}
              placeholder="Buscar @nickname ou nome"
              placeholderTextColor={theme.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <FlatList
            data={filteredUsers}
            keyExtractor={(i) => i.id}
            renderItem={({ item }: any) => (
              <View
                style={[styles.friendCard, { borderBottomColor: theme.border }]}
              >
                <Image
                  source={{
                    uri:
                      item.avatarUrl ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${item.name}`,
                  }}
                  style={styles.chatAvatar}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: theme.text,
                      fontWeight: "bold",
                      fontSize: 16,
                    }}
                  >
                    {item.name}
                  </Text>
                  <Text style={{ color: theme.textMuted }}>
                    @{item.nickname}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.addBtnCircle,
                    { backgroundColor: theme.primary },
                  ]}
                  onPress={() => sendFriendReqMutation.mutate(item.id)}
                >
                  <UserPlus color="#fff" size={18} />
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={
              <Text
                style={{
                  textAlign: "center",
                  marginTop: 20,
                  color: theme.textMuted,
                }}
              >
                Nenhum usuário encontrado.
              </Text>
            }
          />
        </SafeAreaView>
      </Modal>

      {/* MODAL DE DENÚNCIA */}
      <Modal visible={reportModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.reportContainer,
              {
                backgroundColor: theme.surface,
                paddingBottom: insets.bottom + 20,
              },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 15,
              }}
            >
              <Text
                style={{ fontSize: 18, fontWeight: "bold", color: theme.text }}
              >
                Denunciar Post
              </Text>
              <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                <X color={theme.text} size={24} />
              </TouchableOpacity>
            </View>
            <Text style={{ color: theme.textMuted, marginBottom: 10 }}>
              Descreva o motivo da denúncia para os administradores.
            </Text>
            <TextInput
              style={[
                styles.reportInput,
                { color: theme.text, borderColor: theme.border },
              ]}
              placeholder="Assédio, spam, ofensa..."
              placeholderTextColor={theme.textMuted}
              value={reportReason}
              onChangeText={setReportReason}
              multiline
            />
            {reportImage && (
              <Image
                source={{ uri: reportImage }}
                style={{
                  width: "100%",
                  height: 150,
                  borderRadius: 8,
                  marginTop: 10,
                }}
              />
            )}
            <TouchableOpacity
              style={styles.addPhotoBtn}
              onPress={async () => {
                const res = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ["images"],
                  quality: 0.5,
                });
                if (!res.canceled) setReportImage(res.assets[0].uri);
              }}
            >
              <Camera color={theme.primary} size={20} />
              <Text
                style={{
                  color: theme.primary,
                  marginLeft: 8,
                  fontWeight: "bold",
                }}
              >
                Anexar Print (Opcional)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitReportBtn,
                { backgroundColor: theme.danger },
              ]}
              onPress={handleReportPost}
              disabled={isReporting}
            >
              {isReporting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontWeight: "bold" }}>
                  Enviar Denúncia
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL CRIAR POST */}
      <Modal visible={createPostModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
          <View
            style={[
              styles.modalHeader,
              {
                borderBottomColor: theme.border,
                backgroundColor: theme.surface,
              },
            ]}
          >
            <TouchableOpacity onPress={() => setCreatePostModal(false)}>
              <X color={theme.text} size={24} />
            </TouchableOpacity>
            <Text
              style={{ fontSize: 16, fontWeight: "bold", color: theme.text }}
            >
              Novo Post
            </Text>
            <TouchableOpacity
              onPress={handleCreatePost}
              disabled={isCreatingPost}
            >
              {isCreatingPost ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <Text style={{ color: theme.primary, fontWeight: "bold" }}>
                  Postar
                </Text>
              )}
            </TouchableOpacity>
          </View>
          <View style={{ padding: 16 }}>
            <TextInput
              style={{ fontSize: 16, color: theme.text, minHeight: 100 }}
              placeholder="O que está acontecendo?"
              placeholderTextColor={theme.textMuted}
              value={postContent}
              onChangeText={setPostContent}
              multiline
              autoFocus
            />
            {postImage && (
              <Image
                source={{ uri: postImage }}
                style={{
                  width: "100%",
                  height: 200,
                  borderRadius: 12,
                  marginTop: 10,
                }}
              />
            )}
            <TouchableOpacity
              style={styles.addPhotoBtn}
              onPress={async () => {
                const res = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ["images"],
                  quality: 0.5,
                });
                if (!res.canceled) setPostImage(res.assets[0].uri);
              }}
            >
              <Camera color={theme.primary} size={20} />
              <Text
                style={{
                  color: theme.primary,
                  marginLeft: 8,
                  fontWeight: "bold",
                }}
              >
                Adicionar Foto
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* MODAL POST TELA CHEIA E COMENTÁRIOS */}
      <Modal visible={!!selectedPost} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
          <View
            style={[styles.modalHeader, { borderBottomColor: theme.border }]}
          >
            <TouchableOpacity onPress={() => setSelectedPost(null)}>
              <X color={theme.text} size={24} />
            </TouchableOpacity>
            <Text
              style={{ fontSize: 16, fontWeight: "bold", color: theme.text }}
            >
              Post
            </Text>
            <View style={{ width: 24 }} />
          </View>
          <FlatList
            data={commentsData?.data || []}
            keyExtractor={(i) => i.id}
            ListHeaderComponent={() => (
              <View
                style={{
                  paddingBottom: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                }}
              >
                <View style={styles.postFullHeader}>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedPost(null);
                      navigation.navigate("PlayerProfile", {
                        userId: selectedPost?.user?.id,
                      });
                    }}
                  >
                    <Image
                      source={{
                        uri:
                          selectedPost?.user?.avatarUrl ||
                          `https://api.dicebear.com/7.x/initials/svg?seed=${selectedPost?.user?.name}`,
                      }}
                      style={styles.postAvatar}
                    />
                  </TouchableOpacity>
                  <Text style={[styles.postName, { color: theme.text }]}>
                    {selectedPost?.user?.nickname || selectedPost?.user?.name}
                  </Text>
                </View>
                {selectedPost?.imageUrl && (
                  <Image
                    source={{ uri: selectedPost.imageUrl }}
                    style={styles.postFullImage}
                    resizeMode="contain"
                  />
                )}
                <View style={styles.postActions}>
                  <TouchableOpacity
                    onPress={() => toggleLikeMutation.mutate(selectedPost)}
                  >
                    <Heart
                      size={26}
                      color={
                        selectedPost?.likedByUser ? theme.primary : theme.text
                      }
                      fill={
                        selectedPost?.likedByUser
                          ? theme.primary
                          : "transparent"
                      }
                    />
                  </TouchableOpacity>
                  <MessageCircle
                    size={26}
                    color={theme.text}
                    style={{ marginLeft: 16 }}
                  />
                </View>
                <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
                  <Text style={{ color: theme.text, fontWeight: "bold" }}>
                    {selectedPost?.likeCount} curtidas
                  </Text>
                  <Text style={{ color: theme.text, marginTop: 4 }}>
                    <Text style={{ fontWeight: "bold" }}>
                      {selectedPost?.user?.nickname}{" "}
                    </Text>
                    {selectedPost?.content}
                  </Text>
                </View>
              </View>
            )}
            renderItem={({ item }: any) => (
              <View style={styles.commentItem}>
                <Image
                  source={{
                    uri:
                      item.user.avatarUrl ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${item.user.name}`,
                  }}
                  style={styles.commentAvatar}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text }}>
                    <Text style={{ fontWeight: "bold" }}>
                      {item.user.nickname || item.user.name}{" "}
                    </Text>
                    {item.content}
                  </Text>
                </View>
              </View>
            )}
          />
          <View
            style={[
              styles.commentInputContainer,
              {
                backgroundColor: theme.surface,
                borderTopColor: theme.border,
                paddingBottom: insets.bottom + 8,
              },
            ]}
          >
            <Image
              source={{
                uri:
                  user?.avatarUrl ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name}`,
              }}
              style={styles.commentInputAvatar}
            />
            <TextInput
              style={[styles.commentInput, { color: theme.text }]}
              placeholder="Adicione um comentário..."
              placeholderTextColor={theme.textMuted}
              value={commentText}
              onChangeText={setCommentText}
            />
            <TouchableOpacity
              onPress={() =>
                commentText.trim() && commentMutation.mutate(commentText)
              }
            >
              <Text style={{ color: theme.primary, fontWeight: "bold" }}>
                Publicar
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* MODAL NOVO CHAT */}
      <Modal visible={newChatModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
          <View
            style={[
              styles.modalHeader,
              {
                borderBottomColor: theme.border,
                backgroundColor: theme.surface,
              },
            ]}
          >
            <TouchableOpacity onPress={() => setNewChatModal(false)}>
              <X color={theme.text} size={24} />
            </TouchableOpacity>
            <Text
              style={{ fontSize: 16, fontWeight: "bold", color: theme.text }}
            >
              Nova Conversa
            </Text>
            <View style={{ width: 24 }} />
          </View>
          <TouchableOpacity
            style={[styles.newGroupBtn, { backgroundColor: theme.surface }]}
            onPress={() => {
              setNewChatModal(false);
              navigation.navigate("CreateChatGroup");
            }}
          >
            <View
              style={[styles.iconCircle, { backgroundColor: theme.primary }]}
            >
              <Users color="#fff" size={20} />
            </View>
            <Text
              style={{ color: theme.text, fontSize: 16, fontWeight: "bold" }}
            >
              Novo Grupo
            </Text>
          </TouchableOpacity>
          <Text
            style={{
              margin: 16,
              fontSize: 14,
              fontWeight: "bold",
              color: theme.textMuted,
            }}
          >
            Contatos no Mipo
          </Text>
          <FlatList
            data={friendsData?.data}
            keyExtractor={(i) => i.id}
            renderItem={({ item }: any) => (
              <TouchableOpacity
                style={[
                  styles.friendCard,
                  {
                    borderBottomColor: theme.border,
                    backgroundColor: theme.surface,
                  },
                ]}
                onPress={() => createPrivateChatMutation.mutate(item.id)}
              >
                <Image
                  source={{
                    uri:
                      item.avatarUrl ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${item.name}`,
                  }}
                  style={styles.chatAvatar}
                />
                <Text style={[styles.chatName, { color: theme.text }]}>
                  {item.nickname || item.name}
                </Text>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topTabs: { flexDirection: "row", borderBottomWidth: 1 },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 15,
    position: "relative",
  },
  tabText: { fontSize: 15, color: "#78716c" },
  activeLine: {
    position: "absolute",
    bottom: 0,
    height: 4,
    width: 60,
    borderRadius: 2,
  },

  tweetCard: {
    flexDirection: "row",
    padding: 15,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  tweetAvatar: { width: 48, height: 48, borderRadius: 24, marginRight: 10 },
  tweetContentBox: { flex: 1 },
  tweetHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    justifyContent: "space-between",
  },
  tweetName: { fontSize: 15, fontWeight: "bold", marginRight: 5 },
  tweetHandle: { fontSize: 14 },
  tweetText: { fontSize: 15, lineHeight: 20, marginBottom: 10 },
  tweetImage: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    marginBottom: 10,
  },
  tweetActions: { flexDirection: "row", justifyContent: "flex-start", gap: 40 },
  tweetActionBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  tweetActionText: { fontSize: 13 },

  chatAvatar: { width: 52, height: 52, borderRadius: 26, marginRight: 15 },
  chatInfo: {
    flex: 1,
    borderBottomWidth: 1,
    paddingVertical: 15,
    paddingRight: 15,
  },
  chatHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  chatName: { fontSize: 16, fontWeight: "600" },
  chatTime: { fontSize: 12 },
  chatMessageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chatLastMsg: { flex: 1, fontSize: 14 },
  unreadBadge: {
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: "center",
  },
  unreadText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  chatItem: { flexDirection: "row", paddingLeft: 15, alignItems: "center" },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  friendCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  addBtnCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  newGroupBtn: { flexDirection: "row", alignItems: "center", padding: 16 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  reportContainer: {
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  reportInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
    textAlignVertical: "top",
  },
  addPhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "rgba(199,54,54,0.1)",
    borderRadius: 12,
    marginTop: 15,
    alignSelf: "flex-start",
  },
  submitReportBtn: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "center",
  },

  postFullHeader: { flexDirection: "row", alignItems: "center", padding: 12 },
  postAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  postName: { fontWeight: "bold", fontSize: 14 },
  postFullImage: { width: "100%", height: 350, backgroundColor: "#000" },
  postActions: { flexDirection: "row", paddingHorizontal: 16, marginTop: 12 },
  commentItem: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 10 },
  commentInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderTopWidth: 1,
  },
  commentInputAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  commentInput: { flex: 1, height: 40 },

  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});
