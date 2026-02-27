import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  useColorScheme,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import {
  ChevronLeft,
  Heart,
  MessageCircle,
  X,
  Pencil,
  Trash2,
  AlertTriangle,
  Camera,
} from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import AchievementsHighlights from "./components/AchievementsHighlights";

export default function PlayerProfileScreen({ route, navigation }: any) {
  const { userId } = route.params;
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const insets = useSafeAreaInsets();
  const [clickOpenAchievements, setClickOpenAchievements] = useState(0);

  const { data: achievementsData = [] } = useQuery({
    queryKey: ["achievements", userId],
    queryFn: async () => (await api.get(`/achievements?userId=${userId}`)).data,
    enabled: !!userId,
  });

  const obtainedAchCount = achievementsData.filter(
    (a: any) => a.isObtained,
  ).length;

  const theme = {
    bg: isDark ? "#000000" : "#faf6f1",
    surface: isDark ? "#121212" : "#ffffff",
    text: isDark ? "#ffffff" : "#1c1917",
    textMuted: isDark ? "#a1a1aa" : "#78716c",
    border: isDark ? "#27272a" : "#e7e5e4",
    primary: "#c73636",
    danger: "#ef4444",
  };

  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [commentText, setCommentText] = useState("");
  const [editingComment, setEditingComment] = useState<any>(null);

  // Estados de Denúncia
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [postToReport, setPostToReport] = useState<any>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportImage, setReportImage] = useState<string | null>(null);
  const [isReporting, setIsReporting] = useState(false);

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

  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ["user", userId],
    queryFn: async () => (await api.get(`/users/${userId}`)).data,
  });

  const { data: postsData, isLoading: isLoadingPosts } = useQuery({
    queryKey: ["posts", "user", userId],
    queryFn: async () =>
      (
        await api.get(`/posts/user/${userId}`, {
          params: { skip: 0, take: 20 },
        })
      ).data,
  });

  const { data: statusData } = useQuery({
    queryKey: ["friendship", userId],
    queryFn: async () => (await api.get(`/friends/${userId}/status`)).data,
  });

  const { data: commentsData, refetch: refetchComments } = useQuery({
    queryKey: ["comments", selectedPost?.id],
    queryFn: async () =>
      (await api.get(`/posts/${selectedPost?.id}/comments`)).data,
    enabled: !!selectedPost?.id,
  });

  const isFriend = statusData?.status === "ACCEPTED";
  const isPending = statusData?.status === "PENDING";

  const toggleFriendshipMutation = useMutation({
    mutationFn: async () => {
      // Se já são amigos, o clique serve para desfazer a amizade
      if (isFriend) {
        const relationshipId = statusData?.id;
        return api.delete(`/friends/${relationshipId || userId}`);
      }

      try {
        // Envia o pedido. O Backend aceita sozinho se o outro utilizador já tiver enviado!
        return await api.post("/friends/request", { friendId: userId });
      } catch (error: any) {
        // Se der Conflito (409), significa que a solicitação pendente fomos NÓS que enviamos.
        // Logo, clicar no botão de novo deve CANCELAR a nossa solicitação.
        if (error.response?.status === 409 && statusData?.id) {
          return api.delete(`/friends/${statusData.id}`);
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friendship", userId] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["friends", "available"] });
    },
    onError: (error: any) => {
      Alert.alert(
        "Aviso",
        error.response?.data?.message ||
          "Não foi possível alterar a amizade no momento.",
      );
    },
  });

  const toggleLikeMutation = useMutation({
    mutationFn: (post: any) =>
      post.likedByUser
        ? api.delete(`/posts/${post.id}/like`)
        : api.post(`/posts/${post.id}/like`),
    onMutate: async (post) => {
      await queryClient.cancelQueries({ queryKey: ["posts", "user", userId] });
      const previousPosts = queryClient.getQueryData(["posts", "user", userId]);
      queryClient.setQueryData(["posts", "user", userId], (old: any) => {
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
      return { previousPosts };
    },
    onError: (err, post, context) => {
      queryClient.setQueryData(
        ["posts", "user", userId],
        context?.previousPosts,
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", "user", userId] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) =>
      api.post(`/posts/${selectedPost?.id}/comments`, { content }),
    onSuccess: () => {
      setCommentText("");
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ["posts", "user", userId] });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) =>
      api.delete(`/posts/comments/${commentId}`),
    onSuccess: () => {
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ["posts", "user", userId] });
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

  const handleSendMessage = async () => {
    try {
      const res = await api.post(`/chats/private/${userId}`);
      navigation.navigate("ChatDetail", {
        chatId: res.data.id,
        name: userData?.nickname || userData?.name,
      });
    } catch {
      Alert.alert("Erro", "Erro ao abrir chat");
    }
  };

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

  const ProfileSkeleton = () => (
    <View style={{ padding: 16 }}>
      <Animated.View
        style={{
          opacity: fadeAnim,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: 90,
            height: 90,
            borderRadius: 45,
            backgroundColor: theme.surface,
          }}
        />
        <View
          style={{
            flex: 1,
            marginLeft: 20,
            flexDirection: "row",
            justifyContent: "space-around",
          }}
        >
          <View
            style={{
              width: 50,
              height: 40,
              backgroundColor: theme.surface,
              borderRadius: 8,
            }}
          />
          <View
            style={{
              width: 50,
              height: 40,
              backgroundColor: theme.surface,
              borderRadius: 8,
            }}
          />
        </View>
      </Animated.View>
      <Animated.View
        style={{
          opacity: fadeAnim,
          width: 150,
          height: 20,
          backgroundColor: theme.surface,
          borderRadius: 4,
          marginTop: 16,
        }}
      />
      <Animated.View
        style={{
          opacity: fadeAnim,
          width: 100,
          height: 16,
          backgroundColor: theme.surface,
          borderRadius: 4,
          marginTop: 8,
        }}
      />
      <Animated.View
        style={{
          opacity: fadeAnim,
          width: "100%",
          height: 40,
          backgroundColor: theme.surface,
          borderRadius: 8,
          marginTop: 20,
        }}
      />
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.bg, paddingTop: insets.top },
      ]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { backgroundColor: theme.bg }]}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <ChevronLeft color={theme.text} size={28} />
            </TouchableOpacity>
            {!userLoading && (
              <Text style={[styles.headerNickname, { color: theme.text }]}>
                @{userData?.nickname || userData?.name}
              </Text>
            )}
            <View style={{ width: 28 }} />
          </View>

          {userLoading ? (
            <ProfileSkeleton />
          ) : (
            <>
              <View style={styles.profileMain}>
                <LinearGradient
                  colors={["#c73636", "#e6683c", "#f09433"]}
                  style={styles.gradientBorder}
                >
                  <Image
                    source={{
                      uri:
                        userData?.avatarUrl ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${userData?.name}`,
                    }}
                    style={[styles.avatar, { borderColor: theme.bg }]}
                  />
                </LinearGradient>

                <View style={styles.statsContainer}>
                  <View style={styles.statBox}>
                    <Text style={[styles.statNumber, { color: theme.text }]}>
                      {postsData?.data?.length || 0}
                    </Text>
                    <Text
                      style={[styles.statLabel, { color: theme.textMuted }]}
                    >
                      Posts
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.statBox}
                    onPress={() => setClickOpenAchievements(Date.now())}
                  >
                    <Text style={[styles.statNumber, { color: theme.text }]}>
                      {obtainedAchCount}
                    </Text>
                    <Text
                      style={[styles.statLabel, { color: theme.textMuted }]}
                    >
                      Conquistas
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.bioContainer}>
                <Text style={[styles.bioName, { color: theme.text }]}>
                  {userData?.name}
                </Text>
                <Text style={[styles.bioCity, { color: theme.textMuted }]}>
                  {userData?.city}
                </Text>
                {userData?.bio && (
                  <Text style={{ color: theme.text, marginTop: 8 }}>
                    {userData.bio}
                  </Text>
                )}
              </View>

              {currentUser?.id !== userId && (
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    style={[
                      styles.editBtn,
                      {
                        backgroundColor: isFriend
                          ? theme.surface
                          : theme.primary,
                        borderColor: isFriend ? theme.border : theme.primary,
                      },
                    ]}
                    onPress={() => toggleFriendshipMutation.mutate()}
                    disabled={toggleFriendshipMutation.isPending}
                  >
                    {toggleFriendshipMutation.isPending ? (
                      <ActivityIndicator
                        color={isFriend ? theme.text : "#fff"}
                        size="small"
                      />
                    ) : (
                      <Text
                        style={[
                          styles.editBtnText,
                          { color: isFriend ? theme.text : "#fff" },
                        ]}
                      >
                        {isFriend
                          ? "Deixar de seguir"
                          : isPending
                            ? "Pendente"
                            : "Seguir"}
                      </Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.editBtn,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                      },
                    ]}
                    onPress={handleSendMessage}
                  >
                    <Text style={[styles.editBtnText, { color: theme.text }]}>
                      Mensagem
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {userData?.id && (
                <AchievementsHighlights
                  userId={userData.id}
                  isOwnProfile={false}
                  triggerOpenAll={clickOpenAchievements} // <-- PASSE O GATILHO AQUI
                />
              )}
            </>
          )}
        </View>

        {isLoadingPosts ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Animated.View
                key={i}
                style={{
                  opacity: fadeAnim,
                  width: "33.33%",
                  aspectRatio: 1,
                  borderWidth: 0.5,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                }}
              />
            ))}
          </View>
        ) : (
          <View style={styles.postsGrid}>
            {postsData?.data?.map((item: any) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.gridItem, { borderColor: theme.border }]}
                onPress={() => setSelectedPost(item)}
              >
                {item.imageUrl ? (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.gridImage}
                  />
                ) : (
                  <View
                    style={[
                      styles.gridTextOnly,
                      { backgroundColor: theme.surface },
                    ]}
                  >
                    <Text
                      style={{ color: theme.text, fontSize: 10 }}
                      numberOfLines={4}
                    >
                      {item.content}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* MODAL POST TELA CHEIA E COMENTÁRIOS */}
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
              <TouchableOpacity
                onPress={() => {
                  setPostToReport(selectedPost);
                  setReportModalVisible(true);
                }}
              >
                <AlertTriangle size={20} color={theme.textMuted} />
              </TouchableOpacity>
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
                  <Image
                    source={{
                      uri:
                        userData?.avatarUrl ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${userData?.name}`,
                    }}
                    style={styles.postAvatar}
                  />
                  <Text style={[styles.postName, { color: theme.text }]}>
                    {userData?.nickname || userData?.name}
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
                      {userData?.nickname}{" "}
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
                {item.user.id === currentUser?.id && (
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
                    currentUser?.avatarUrl ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser?.name}`,
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

      {/* MODAL DE DENÚNCIA */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16 },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerNickname: { fontSize: 20, fontWeight: "bold" },
  profileMain: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  gradientBorder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: { width: 84, height: 84, borderRadius: 42, borderWidth: 3 },
  statsContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    marginLeft: 20,
  },
  statBox: { alignItems: "center" },
  statNumber: { fontSize: 18, fontWeight: "bold" },
  statLabel: { fontSize: 13 },
  bioContainer: { marginBottom: 16 },
  bioName: { fontSize: 15, fontWeight: "600" },
  bioCity: { fontSize: 14, marginTop: 2 },
  actionButtonsRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  editBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  editBtnText: { fontSize: 14, fontWeight: "600" },
  postsGrid: { flexDirection: "row", flexWrap: "wrap" },
  gridItem: { width: "33.33%", aspectRatio: 1, borderWidth: 0.5 },
  gridImage: { width: "100%", height: "100%" },
  gridTextOnly: {
    width: "100%",
    height: "100%",
    padding: 8,
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
});
