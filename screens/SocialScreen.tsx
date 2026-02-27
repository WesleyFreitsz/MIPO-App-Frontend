import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  useColorScheme,
  Modal,
  TextInput,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
  Pencil,
  Trash2,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWebSocketChat } from "../hooks/useWebSocketChat";
import { useFocusEffect } from "@react-navigation/native";

export default function SocialScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const insets = useSafeAreaInsets();
  const { socket } = useWebSocketChat();

  const theme = {
    bg: isDark ? "#000000" : "#faf6f1",
    surface: isDark ? "#050000" : "#ffffff",
    text: isDark ? "#ffffff" : "#1c1917",
    textMuted: isDark ? "#a1a1aa" : "#78716c",
    border: isDark ? "#27272a" : "#e7e5e4",
    primary: "#c73636",
    danger: "#ef4444",
  };

  useEffect(() => {
    if (!socket) return;
    const handleListUpdate = () =>
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    socket.on("chat:list-update", handleListUpdate);
    return () => {
      socket.off("chat:list-update", handleListUpdate);
    };
  }, [socket, queryClient]);

  const [activeTab, setActiveTab] = useState("feed");

  // NOVO: Estado para o filtro de chats
  const [chatFilter, setChatFilter] = useState<"ALL" | "PRIVATE" | "GROUPS">(
    "ALL",
  );

  const [createPostModal, setCreatePostModal] = useState(false);
  const [newChatModal, setNewChatModal] = useState(false);
  const [addFriendsModal, setAddFriendsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [commentText, setCommentText] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postImage, setPostImage] = useState<string | null>(null);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [postToReport, setPostToReport] = useState<any>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportImage, setReportImage] = useState<string | null>(null);
  const [isReporting, setIsReporting] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [editingComment, setEditingComment] = useState<any>(null); // <--- NOVO

  useEffect(() => {
    if (route?.params?.postId) {
      setActiveTab("feed"); // Garante que a aba certa está ativa

      api
        .get(`/posts/${route.params.postId}`)
        .then((res) => {
          if (res.data) setSelectedPost(res.data); // Abre o modal
        })
        .catch((error) => {
          console.error(error);
          Alert.alert(
            "Aviso",
            "Este post não está mais disponível ou foi apagado.",
          );
        })
        .finally(() => {
          // ATRASO NECESSÁRIO: Dá tempo do Modal abrir antes de limpar os parâmetros da rota
          setTimeout(() => {
            navigation.setParams({ postId: undefined, t: undefined });
          }, 500);
        });
    }
  }, [route.params, navigation]);

  const fadeAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [fadeAnim]);

  const {
    data: feedData,
    refetch: refetchFeed,
    isLoading: isLoadingFeed,
  } = useQuery({
    queryKey: ["posts", "feed"],
    queryFn: async () => (await api.get("/posts/feed")).data,
  });

  const {
    data: chatsData,
    refetch: refetchChats,
    isLoading: isLoadingChats,
  } = useQuery({
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

  const unreadChatsTotal =
    chatsData?.data?.reduce(
      (acc: number, c: any) => acc + (c.unreadCount > 0 ? 1 : 0),
      0,
    ) || 0;

  const deletePostMutation = useMutation({
    mutationFn: (postId: string) => api.delete(`/posts/${postId}`),
    onSuccess: () => {
      Alert.alert("Sucesso", "Post removido.");
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setSelectedPost(null);
    },
    onError: () => Alert.alert("Erro", "Não foi possível excluir o post."),
  });

  const toggleLikeMutation = useMutation({
    mutationFn: (post: any) =>
      post.likedByUser
        ? api.delete(`/posts/${post.id}/like`)
        : api.post(`/posts/${post.id}/like`),
    onMutate: async (post) => {
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      const previousFeed = queryClient.getQueryData(["posts", "feed"]);
      queryClient.setQueryData(["posts", "feed"], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((p: any) =>
            p.id === post.id
              ? {
                  ...p,
                  likedByUser: !p.likedByUser,
                  likeCount: p.likedByUser ? p.likeCount - 1 : p.likeCount + 1,
                }
              : p,
          ),
        };
      });
      if (selectedPost?.id === post.id) {
        setSelectedPost((prev: any) => ({
          ...prev,
          likedByUser: !prev.likedByUser,
          likeCount: prev.likedByUser ? prev.likeCount - 1 : prev.likeCount + 1,
        }));
      }
      return { previousFeed };
    },
    onError: (err, post, context) => {
      queryClient.setQueryData(["posts", "feed"], context?.previousFeed);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) =>
      api.post(`/posts/${selectedPost?.id}/comments`, { content }),
    onSuccess: () => {
      setCommentText("");
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) =>
      api.delete(`/posts/comments/${commentId}`),
    onSuccess: () => {
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const editCommentMutation = useMutation({
    mutationFn: (data: { id: string; content: string }) =>
      api.patch(`/posts/comments/${data.id}`, { content: data.content }),
    onSuccess: () => {
      setCommentText("");
      setEditingComment(null);
      refetchComments();
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
      const res = await api.post("/uploads/chat-content", formData, {
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
      if (editingPost) {
        await api.patch(`/posts/${editingPost.id}`, {
          content: postContent,
          imageUrl: finalImage,
        });
        Alert.alert("Sucesso", "Post atualizado!");
      } else {
        await api.post("/posts", {
          content: postContent,
          imageUrl: finalImage,
        });
        Alert.alert("Sucesso", "Post criado!");
      }
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setPostContent("");
      setPostImage(null);
      setEditingPost(null);
      setCreatePostModal(false);
    } catch {
      Alert.alert("Erro", "Falha ao salvar post");
    } finally {
      setIsCreatingPost(false);
    }
  };

  const handleEditInit = (post: any) => {
    setEditingPost(post);
    setPostContent(post.content);
    setPostImage(post.imageUrl);
    setCreatePostModal(true);
  };

  const confirmDelete = (postId: string) => {
    Alert.alert("Excluir", "Deseja remover este post permanentemente?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: () => deletePostMutation.mutate(postId),
      },
    ]);
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

  // Lógica de Filtro dos Chats
  const filteredChatsList =
    chatsData?.data?.filter((chat: any) => {
      if (chatFilter === "ALL") return true;
      if (chatFilter === "PRIVATE") return chat.type === "PRIVATE";
      if (chatFilter === "GROUPS")
        return chat.type === "GROUP" || chat.type === "EVENT";
      return true;
    }) || [];

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
              {" "}
              @{item.user.nickname}
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 15, alignItems: "center" }}>
            {item.user.id === user?.id ? (
              <>
                <TouchableOpacity onPress={() => handleEditInit(item)}>
                  <Pencil size={18} color={theme.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmDelete(item.id)}>
                  <Trash2 size={18} color={theme.danger} />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setPostToReport(item);
                  setReportModalVisible(true);
                }}
              >
                <AlertTriangle size={18} color={theme.textMuted} />
              </TouchableOpacity>
            )}
          </View>
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

  const FeedSkeleton = () => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        padding: 15,
        borderBottomWidth: 1,
        borderColor: theme.border,
      }}
    >
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: theme.border,
            marginRight: 10,
          }}
        />
        <View>
          <View
            style={{
              width: 120,
              height: 16,
              backgroundColor: theme.border,
              borderRadius: 4,
              marginBottom: 6,
            }}
          />
          <View
            style={{
              width: 80,
              height: 12,
              backgroundColor: theme.border,
              borderRadius: 4,
            }}
          />
        </View>
      </View>
      <View
        style={{
          width: "100%",
          height: 150,
          backgroundColor: theme.border,
          borderRadius: 16,
        }}
      />
    </Animated.View>
  );

  const ChatSkeleton = () => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        flexDirection: "row",
        padding: 15,
        borderBottomWidth: 1,
        borderColor: theme.border,
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: theme.border,
          marginRight: 15,
        }}
      />
      <View style={{ flex: 1 }}>
        <View
          style={{
            width: 150,
            height: 16,
            backgroundColor: theme.border,
            borderRadius: 4,
            marginBottom: 8,
          }}
        />
        <View
          style={{
            width: 100,
            height: 12,
            backgroundColor: theme.border,
            borderRadius: 4,
          }}
        />
      </View>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
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
            {unreadChatsTotal > 0 && (
              <View
                style={{
                  backgroundColor: theme.primary,
                  borderRadius: 10,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                }}
              >
                <Text
                  style={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}
                >
                  {unreadChatsTotal}
                </Text>
              </View>
            )}
          </View>
          {activeTab === "chats" && (
            <View
              style={[styles.activeLine, { backgroundColor: theme.primary }]}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* ABA DE FILTROS DE CHAT (Só aparece na aba de conversas) */}
      {activeTab === "chats" && (
        <View
          style={[
            styles.chatFilterContainer,
            { borderBottomColor: theme.border },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 15,
              paddingVertical: 10,
              gap: 10,
            }}
          >
            <TouchableOpacity
              style={[
                styles.filterPill,
                { borderColor: theme.border },
                chatFilter === "ALL" && {
                  backgroundColor: theme.primary,
                  borderColor: theme.primary,
                },
              ]}
              onPress={() => setChatFilter("ALL")}
            >
              <Text
                style={[
                  styles.filterPillText,
                  { color: theme.text },
                  chatFilter === "ALL" && { color: "#fff", fontWeight: "bold" },
                ]}
              >
                Todas
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                { borderColor: theme.border },
                chatFilter === "PRIVATE" && {
                  backgroundColor: theme.primary,
                  borderColor: theme.primary,
                },
              ]}
              onPress={() => setChatFilter("PRIVATE")}
            >
              <Text
                style={[
                  styles.filterPillText,
                  { color: theme.text },
                  chatFilter === "PRIVATE" && {
                    color: "#fff",
                    fontWeight: "bold",
                  },
                ]}
              >
                Privadas
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                { borderColor: theme.border },
                chatFilter === "GROUPS" && {
                  backgroundColor: theme.primary,
                  borderColor: theme.primary,
                },
              ]}
              onPress={() => setChatFilter("GROUPS")}
            >
              <Text
                style={[
                  styles.filterPillText,
                  { color: theme.text },
                  chatFilter === "GROUPS" && {
                    color: "#fff",
                    fontWeight: "bold",
                  },
                ]}
              >
                Grupos e Eventos
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {activeTab === "feed" ? (
        isLoadingFeed ? (
          <View>
            <FeedSkeleton />
            <FeedSkeleton />
            <FeedSkeleton />
          </View>
        ) : (
          <FlatList
            data={feedData?.data}
            keyExtractor={(i) => i.id}
            renderItem={renderPost}
            refreshControl={
              <RefreshControl refreshing={false} onRefresh={refetchFeed} />
            }
          />
        )
      ) : isLoadingChats ? (
        <View>
          <ChatSkeleton />
          <ChatSkeleton />
          <ChatSkeleton />
        </View>
      ) : (
        <FlatList
          data={filteredChatsList} // Usa a lista filtrada
          keyExtractor={(i) => i.id}
          renderItem={({ item }: any) => {
            const isPrivate = item.type === "PRIVATE";

            // Busca os dados do OUTRO usuário (garantindo que não é você mesmo)
            const otherMember = item.members?.find(
              (m: any) => m.userId !== user?.id,
            )?.user;

            // Define o nome e a foto com base no tipo do chat
            const title = isPrivate
              ? otherMember?.nickname || otherMember?.name || "Usuário"
              : item.name;

            const avatar = isPrivate ? otherMember?.avatarUrl : item.imageUrl;

            const targetId = isPrivate ? otherMember?.id : item.id;

            return (
              <TouchableOpacity
                style={[styles.chatItem, { backgroundColor: theme.surface }]}
                onPress={() =>
                  navigation.navigate("ChatDetail", {
                    chatId: item.id,
                    name: title,
                    type: item.type,
                    avatar: avatar,
                    targetId: targetId,
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
                      {title}
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
                      style={[
                        styles.chatLastMsg,
                        {
                          color:
                            item.unreadCount > 0 ? theme.text : theme.textMuted,
                          fontWeight: item.unreadCount > 0 ? "bold" : "normal",
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {item.lastMessage?.content || "Nenhuma mensagem"}
                    </Text>

                    {item.unreadCount > 0 && (
                      <View
                        style={{
                          backgroundColor: theme.primary,
                          borderRadius: 12,
                          minWidth: 24,
                          height: 24,
                          justifyContent: "center",
                          alignItems: "center",
                          paddingHorizontal: 6,
                          marginLeft: 10,
                        }}
                      >
                        <Text
                          style={{
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: "bold",
                          }}
                        >
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

      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor: theme.primary,
            bottom: activeTab === "chats" ? 90 : 20,
          },
        ]}
        onPress={() => {
          setEditingPost(null);
          setPostContent("");
          setPostImage(null);
          activeTab === "feed"
            ? setCreatePostModal(true)
            : setAddFriendsModal(true);
        }}
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

      {/* MODAIS: CREATE/EDIT POST, ADD FRIENDS, NEW CHAT, POST FULL VIEW */}
      <Modal visible={createPostModal} animationType="slide">
        <View
          style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}
        >
          <View
            style={[
              styles.modalHeader,
              {
                borderBottomColor: theme.border,
                backgroundColor: theme.surface,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => {
                setCreatePostModal(false);
                setEditingPost(null);
              }}
            >
              <X color={theme.text} size={24} />
            </TouchableOpacity>
            <Text
              style={{ fontSize: 16, fontWeight: "bold", color: theme.text }}
            >
              {editingPost ? "Editar Post" : "Novo Post"}
            </Text>
            <TouchableOpacity
              onPress={handleCreatePost}
              disabled={isCreatingPost}
            >
              {isCreatingPost ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <Text style={{ color: theme.primary, fontWeight: "bold" }}>
                  {editingPost ? "Salvar" : "Postar"}
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
                Mudar Foto
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DO POST COM KEYBOARD AVOIDING VIEW */}
      <Modal visible={!!selectedPost} animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}
        >
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
            <View style={{ flexDirection: "row", gap: 15 }}>
              {selectedPost?.user?.id === user?.id && (
                <>
                  <TouchableOpacity
                    onPress={() => {
                      const p = selectedPost;
                      setSelectedPost(null);
                      handleEditInit(p);
                    }}
                  >
                    <Pencil size={20} color={theme.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => confirmDelete(selectedPost.id)}
                  >
                    <Trash2 size={20} color={theme.danger} />
                  </TouchableOpacity>
                </>
              )}
            </View>
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
                <TouchableOpacity
                  onPress={() => {
                    setSelectedPost(null);
                    navigation.navigate("PlayerProfile", {
                      userId: item.user.id,
                    });
                  }}
                >
                  <Image
                    source={{
                      uri:
                        item.user.avatarUrl ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${item.user.name}`,
                    }}
                    style={styles.commentAvatar}
                  />
                </TouchableOpacity>

                <View style={{ flex: 1, justifyContent: "center" }}>
                  <Text style={{ color: theme.text }}>
                    <Text
                      style={{ fontWeight: "bold" }}
                      onPress={() => {
                        setSelectedPost(null);
                        navigation.navigate("PlayerProfile", {
                          userId: item.user.id,
                        });
                      }}
                    >
                      {item.user.nickname || item.user.name}{" "}
                    </Text>
                    {item.content}
                  </Text>
                </View>

                {/* Ícones de Editar e Apagar aparecem apenas para o dono do comentário */}
                {item.user.id === user?.id && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      marginLeft: 10,
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        setEditingComment(item);
                        setCommentText(item.content);
                      }}
                    >
                      <Pencil size={16} color={theme.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        Alert.alert(
                          "Apagar",
                          "Deseja apagar este comentário?",
                          [
                            { text: "Cancelar", style: "cancel" },
                            {
                              text: "Apagar",
                              style: "destructive",
                              onPress: () =>
                                deleteCommentMutation.mutate(item.id),
                            },
                          ],
                        );
                      }}
                    >
                      <Trash2 size={16} color={theme.danger} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          />
          <View>
            {/* BANNER DE EDIÇÃO DE COMENTÁRIO */}
            {editingComment && (
              <View
                style={{
                  backgroundColor: "rgba(199,54,54,0.1)",
                  padding: 10,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: theme.primary,
                    fontWeight: "bold",
                    fontSize: 12,
                  }}
                >
                  Editando comentário...
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setEditingComment(null);
                    setCommentText("");
                  }}
                >
                  <X size={16} color={theme.primary} />
                </TouchableOpacity>
              </View>
            )}

            <View
              style={[
                styles.commentInputContainer,
                {
                  backgroundColor: theme.surface,
                  borderTopColor: theme.border,
                  paddingBottom: Platform.OS === "ios" ? insets.bottom + 8 : 15,
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
              {/* TRATAMENTO DE DUPLO CLIQUE E EDIÇÃO */}
              <TouchableOpacity
                disabled={
                  !commentText.trim() ||
                  commentMutation.isPending ||
                  editCommentMutation.isPending
                }
                onPress={() => {
                  if (editingComment) {
                    editCommentMutation.mutate({
                      id: editingComment.id,
                      content: commentText.trim(),
                    });
                  } else {
                    commentMutation.mutate(commentText.trim());
                  }
                }}
              >
                {commentMutation.isPending || editCommentMutation.isPending ? (
                  <ActivityIndicator color={theme.primary} size="small" />
                ) : (
                  <Text
                    style={{
                      color: commentText.trim()
                        ? theme.primary
                        : theme.textMuted,
                      fontWeight: "bold",
                    }}
                  >
                    {editingComment ? "Salvar" : "Publicar"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL DE DENÚNCIA RESTAURADO */}
      <Modal visible={reportModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[styles.reportContainer, { backgroundColor: theme.surface }]}
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
            <TextInput
              style={[
                styles.reportInput,
                { color: theme.text, borderColor: theme.border },
              ]}
              placeholder="Qual o motivo da denúncia?"
              placeholderTextColor={theme.textMuted}
              value={reportReason}
              onChangeText={setReportReason}
              multiline
            />
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
                Anexar Prova (Opcional)
              </Text>
            </TouchableOpacity>

            {reportImage && (
              <Image
                source={{ uri: reportImage }}
                style={{
                  width: 100,
                  height: 100,
                  marginTop: 10,
                  borderRadius: 8,
                }}
              />
            )}

            <TouchableOpacity
              style={[
                styles.submitReportBtn,
                { backgroundColor: theme.primary },
              ]}
              onPress={handleReportPost}
              disabled={isReporting}
            >
              {isReporting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}
                >
                  Enviar Denúncia
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={newChatModal} animationType="slide">
        <View
          style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}
        >
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
            style={styles.newGroupBtn}
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
          <FlatList
            data={friendsData?.data}
            keyExtractor={(i) => i.id}
            renderItem={({ item }: any) => (
              <TouchableOpacity
                style={styles.friendCard}
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
                <Text style={{ color: theme.text, fontWeight: "bold" }}>
                  {item.nickname || item.name}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      <Modal visible={addFriendsModal} animationType="slide">
        <View
          style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}
        >
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
              placeholder="Buscar @nickname"
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
          />
        </View>
      </Modal>
    </View>
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
  chatFilterContainer: {
    borderBottomWidth: 1,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  filterPillText: {
    fontSize: 14,
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
