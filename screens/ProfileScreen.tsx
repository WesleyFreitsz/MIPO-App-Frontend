import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  useColorScheme,
  Modal,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import {
  LogOut,
  Wallet,
  Camera,
  AtSign,
  MapPin,
  X,
  Heart,
  MessageCircle,
  FileText,
  User as UserIcon,
  MessageSquare,
  Pencil,
  Trash2,
} from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AchievementsHighlights from "./components/AchievementsHighlights";

export default function ProfileScreen({ route, navigation }: any) {
  const { user, signOut, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const insets = useSafeAreaInsets();
  const triggerOpenAchievements = route?.params?.openAchievements;
  const [clickOpenAchievements, setClickOpenAchievements] = useState(0);

  useEffect(() => {
    if (triggerOpenAchievements) {
      setTimeout(() => {
        navigation.setParams({ openAchievements: undefined });
      }, 500);
    }
  }, [triggerOpenAchievements, navigation]);

  const theme = {
    bg: isDark ? "#000000" : "#faf6f1",
    surface: isDark ? "#121212" : "#ffffff",
    text: isDark ? "#ffffff" : "#1c1917",
    textMuted: isDark ? "#a1a1aa" : "#78716c",
    border: isDark ? "#27272a" : "#e7e5e4",
    primary: "#c73636",
    danger: "#ef4444",
  };

  const [editMode, setEditMode] = useState(route?.params?.editMode || false);
  const [name, setName] = useState(user?.name || "");
  const [nickname, setNickname] = useState(user?.nickname || "");
  const [city, setCity] = useState(user?.city || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [image, setImage] = useState(user?.avatarUrl || null);
  const [isUploading, setIsUploading] = useState(false);

  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [commentText, setCommentText] = useState("");
  const [editingComment, setEditingComment] = useState<any>(null);

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

  const { data: postsData, isLoading: isLoadingPosts } = useQuery({
    queryKey: ["posts", "user", user?.id],
    queryFn: async () =>
      (
        await api.get(`/posts/user/${user?.id}`, {
          params: { skip: 0, take: 20 },
        })
      ).data,
  });

  const { data: friendsData } = useQuery({
    queryKey: ["friends", user?.id],
    queryFn: async () =>
      (await api.get("/friends", { params: { skip: 0, take: 50 } })).data,
  });

  const { data: commentsData, refetch: refetchComments } = useQuery({
    queryKey: ["comments", selectedPost?.id],
    queryFn: async () =>
      (await api.get(`/posts/${selectedPost?.id}/comments`)).data,
    enabled: !!selectedPost?.id,
  });

  const toggleLikeMutation = useMutation({
    mutationFn: (post: any) =>
      post.likedByUser
        ? api.delete(`/posts/${post.id}/like`)
        : api.post(`/posts/${post.id}/like`),
    onMutate: async (post) => {
      await queryClient.cancelQueries({
        queryKey: ["posts", "user", user?.id],
      });
      const previousPosts = queryClient.getQueryData([
        "posts",
        "user",
        user?.id,
      ]);
      queryClient.setQueryData(["posts", "user", user?.id], (old: any) => {
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
        ["posts", "user", user?.id],
        context?.previousPosts,
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", "user", user?.id] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) =>
      api.post(`/posts/${selectedPost?.id}/comments`, { content }),
    onSuccess: () => {
      setCommentText("");
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ["posts", "user", user?.id] });
    },
  });

  const { data: achievementsData = [] } = useQuery({
    queryKey: ["achievements", user?.id],
    queryFn: async () =>
      (await api.get(`/achievements?userId=${user?.id}`)).data,
    enabled: !!user?.id,
  });

  // Filtra apenas as que foram obtidas
  const obtainedAchCount = achievementsData.filter(
    (a: any) => a.isObtained,
  ).length;

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) =>
      api.delete(`/posts/comments/${commentId}`),
    onSuccess: () => {
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ["posts", "user", user?.id] });
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
      setShowFriendsModal(false);
      navigation.navigate("ChatDetail", {
        chatId: res.data.id,
        name: "Conversa",
      });
    },
  });

  const uploadImageAsync = async (uri: string) => {
    if (uri.startsWith("http") || uri.startsWith("data:")) return uri;
    try {
      setIsUploading(true);
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
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!name || !nickname || !city)
      return Alert.alert(
        "Atenção",
        "Nome, Nickname e Cidade são obrigatórios.",
      );
    try {
      await api.patch("/users/profile", {
        name,
        nickname,
        city,
        bio,
        avatarUrl: image,
      });
      await refreshUser();
      setEditMode(false);
    } catch {
      Alert.alert("Erro", "Erro ao salvar o perfil.");
    }
  };

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
            <Text style={[styles.headerNickname, { color: theme.text }]}>
              @{user?.nickname || "usuario"}
            </Text>
            <View style={{ flexDirection: "row", gap: 16 }}>
              <TouchableOpacity
                onPress={() =>
                  Alert.alert(
                    "Sua Carteira 💰",
                    `Você possui ${user?.coins || 0} moedas disponíveis.`,
                  )
                }
              >
                <Wallet size={24} color={theme.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={signOut}>
                <LogOut size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.profileMain}>
            <View>
              <LinearGradient
                colors={["#c73636", "#e6683c", "#f09433"]}
                style={styles.gradientBorder}
              >
                <Image
                  source={{
                    uri:
                      image ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name}`,
                  }}
                  style={[styles.avatar, { borderColor: theme.bg }]}
                />
              </LinearGradient>
              {editMode && (
                <TouchableOpacity
                  style={styles.editPhotoBtn}
                  onPress={async () => {
                    const result = await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ["images"],
                      allowsEditing: true,
                      aspect: [1, 1],
                      quality: 0.5,
                    });
                    if (!result.canceled) {
                      const uploaded = await uploadImageAsync(
                        result.assets[0].uri,
                      );
                      if (uploaded) setImage(uploaded);
                    }
                  }}
                >
                  <Camera size={14} color="#fff" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: theme.text }]}>
                  {postsData?.data?.length || 0}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                  Posts
                </Text>
              </View>
              <TouchableOpacity
                style={styles.statBox}
                onPress={() => setShowFriendsModal(true)}
              >
                <Text style={[styles.statNumber, { color: theme.text }]}>
                  {friendsData?.data?.length || 0}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                  Amigos
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.statBox}
                onPress={() => setClickOpenAchievements(Date.now())}
              >
                <Text style={[styles.statNumber, { color: theme.text }]}>
                  {obtainedAchCount}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                  Conquistas
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {editMode ? (
            <View style={styles.editForm}>
              <View
                style={[styles.inputGroup, { backgroundColor: theme.surface }]}
              >
                <UserIcon size={18} color={theme.textMuted} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Nome Completo"
                  value={name}
                  onChangeText={setName}
                  placeholderTextColor={theme.textMuted}
                />
              </View>
              <View
                style={[styles.inputGroup, { backgroundColor: theme.surface }]}
              >
                <AtSign size={18} color={theme.textMuted} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Nickname"
                  value={nickname}
                  onChangeText={setNickname}
                  placeholderTextColor={theme.textMuted}
                />
              </View>
              <View
                style={[styles.inputGroup, { backgroundColor: theme.surface }]}
              >
                <MapPin size={18} color={theme.textMuted} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Cidade"
                  value={city}
                  onChangeText={setCity}
                  placeholderTextColor={theme.textMuted}
                />
              </View>
              <View
                style={[
                  styles.inputGroup,
                  {
                    backgroundColor: theme.surface,
                    height: 80,
                    alignItems: "flex-start",
                    paddingTop: 10,
                  },
                ]}
              >
                <FileText
                  size={18}
                  color={theme.textMuted}
                  style={{ marginTop: 2 }}
                />
                <TextInput
                  style={[
                    styles.input,
                    { color: theme.text, textAlignVertical: "top" },
                  ]}
                  placeholder="Biografia"
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  placeholderTextColor={theme.textMuted}
                />
              </View>

              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  style={[
                    styles.editBtn,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={() => setEditMode(false)}
                >
                  <Text style={[styles.editBtnText, { color: theme.text }]}>
                    Cancelar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.editBtn,
                    {
                      backgroundColor: theme.primary,
                      borderColor: theme.primary,
                    },
                  ]}
                  onPress={handleSaveProfile}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={[styles.editBtnText, { color: "#fff" }]}>
                      Salvar
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.bioContainer}>
                <Text style={[styles.bioName, { color: theme.text }]}>
                  {user?.name}
                </Text>
                <Text style={[styles.bioCity, { color: theme.textMuted }]}>
                  {user?.city || "Adicione sua cidade"}
                </Text>
                {user?.bio && (
                  <Text style={{ color: theme.text, marginTop: 8 }}>
                    {user.bio}
                  </Text>
                )}
              </View>
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  style={[
                    styles.editBtn,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={() => setEditMode(true)}
                >
                  <Text style={[styles.editBtnText, { color: theme.text }]}>
                    Editar Perfil
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {user?.id && (
          <AchievementsHighlights
            triggerOpenAll={triggerOpenAchievements || clickOpenAchievements}
            userId={user.id}
            isOwnProfile={true}
          />
        )}

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

      {/* MODAL LISTA DE AMIGOS */}
      <Modal visible={showFriendsModal} animationType="slide">
        <View
          style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}
        >
          <View
            style={[styles.modalHeader, { borderBottomColor: theme.border }]}
          >
            <TouchableOpacity onPress={() => setShowFriendsModal(false)}>
              <X color={theme.text} size={24} />
            </TouchableOpacity>
            <Text
              style={{ fontSize: 16, fontWeight: "bold", color: theme.text }}
            >
              Amigos
            </Text>
            <View style={{ width: 24 }} />
          </View>
          <FlatList
            data={friendsData?.data}
            keyExtractor={(i) => i.id}
            renderItem={({ item }: any) => (
              <TouchableOpacity
                style={[styles.friendCard, { borderBottomColor: theme.border }]}
                onPress={() => {
                  setShowFriendsModal(false);
                  navigation.navigate("PlayerProfile", { userId: item.id });
                }}
              >
                <Image
                  source={{
                    uri:
                      item.avatarUrl ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${item.name}`,
                  }}
                  style={styles.friendAvatar}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.friendName, { color: theme.text }]}>
                    {item.nickname || item.name}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => createPrivateChatMutation.mutate(item.id)}
                >
                  <MessageSquare color={theme.primary} size={20} />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* MODAL POST TELA CHEIA E COMENTÁRIOS COM KEYBOARD AVOIDING VIEW */}
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
                  <Image
                    source={{
                      uri:
                        user?.avatarUrl ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name}`,
                    }}
                    style={styles.postAvatar}
                  />
                  <Text style={[styles.postName, { color: theme.text }]}>
                    {user?.nickname || user?.name}
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
                      {user?.nickname}{" "}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16 },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerNickname: { fontSize: 22, fontWeight: "bold" },
  profileMain: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  gradientBorder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: { width: 84, height: 84, borderRadius: 42, borderWidth: 3 },
  editPhotoBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#c73636",
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
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
  },
  editBtnText: { fontSize: 14, fontWeight: "600" },
  achievementsSection: { marginTop: 10, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "bold" },
  achievementBadge: {
    padding: 10,
    borderRadius: 12,
    alignItems: "center",
    marginRight: 10,
    width: 80,
    elevation: 2,
  },
  achievementIcon: { fontSize: 24, marginBottom: 4 },
  achievementTitle: { fontSize: 10, fontWeight: "600", textAlign: "center" },
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
  editForm: { marginBottom: 16 },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
    height: 44,
  },
  input: { flex: 1, marginLeft: 8 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  friendCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
  },
  friendAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  friendName: { fontSize: 16, fontWeight: "bold" },
  iconBtn: {
    padding: 8,
    backgroundColor: "rgba(199, 54, 54, 0.1)",
    borderRadius: 8,
    marginLeft: 8,
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
});
