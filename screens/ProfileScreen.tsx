import React, { useState } from "react";
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
  SafeAreaView,
  FlatList,
  Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  Camera,
  MapPin,
  AtSign,
  LogOut,
  Plus,
  Heart,
  MessageCircle,
  X,
} from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const MIPO_COLORS = {
  primary: "#E11D48",
  background: "#f8fafc",
  text: "#1e293b",
  textLighter: "#64748b",
  border: "#e2e8f0",
  white: "#ffffff",
};

interface Post {
  id: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  likedByUser: boolean;
}

const PostCard = ({ post, onLike, onDelete }: any) => {
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
        <TouchableOpacity style={styles.actionButton}>
          <MessageCircle color={MIPO_COLORS.textLighter} size={16} />
          <Text style={styles.actionText}>{post.commentCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(post.id)}>
          <X color={MIPO_COLORS.textLighter} size={16} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function ProfileScreen({ route }: any) {
  const { user, signOut, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(route?.params?.editMode || false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postImage, setPostImage] = useState<string | null>(null);
  const [isCreatingPost, setIsCreatingPost] = useState(false);

  // Estados do perfil
  const [nickname, setNickname] = useState(user?.nickname || "");
  const [city, setCity] = useState(user?.city || "");
  const [image, setImage] = useState(user?.avatarUrl || null);

  // Fetch posts do usuário
  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ["posts", "user", user?.id],
    queryFn: async () => {
      const response = await api.get(`/posts/user/${user?.id}`, {
        params: { skip: 0, take: 20 },
      });
      return response.data;
    },
    enabled: !!user?.id,
  });

  // Mutations
  const createPostMutation = useMutation({
    mutationFn: (data: any) => api.post("/posts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", "user", user?.id] });
      setPostContent("");
      setPostImage(null);
      setShowCreatePostModal(false);
      Alert.alert("Sucesso", "Post criado com sucesso!");
    },
    onError: () => {
      Alert.alert("Erro", "Erro ao criar post");
    },
  });

  const likePostMutation = useMutation({
    mutationFn: (postId: string) => api.post(`/posts/${postId}/like`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", "user", user?.id] });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: (postId: string) => api.delete(`/posts/${postId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", "user", user?.id] });
      Alert.alert("Sucesso", "Post deletado!");
    },
  });

  const handleSaveProfile = async () => {
    if (!nickname || !city) {
      return Alert.alert("Atenção", "Nickname e Cidade são obrigatórios.");
    }

    setLoading(true);
    try {
      await api.patch("/users/profile", {
        nickname,
        city,
        avatarUrl: image,
      });

      await refreshUser();
      setEditMode(false);
      Alert.alert("Sucesso", "Perfil atualizado!");
    } catch (error: any) {
      const msg = error.response?.data?.message || "Erro ao salvar perfil";
      Alert.alert("Erro", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!postContent.trim()) {
      Alert.alert("Erro", "O post não pode estar vazio");
      return;
    }

    setIsCreatingPost(true);
    createPostMutation.mutate(
      {
        content: postContent,
        imageUrl: postImage,
      },
      {
        onSettled: () => setIsCreatingPost(false),
      },
    );
  };

  const handleDeletePost = (postId: string) => {
    Alert.alert("Confirmar", "Tem certeza que deseja deletar este post?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Deletar",
        onPress: () => deletePostMutation.mutate(postId),
        style: "destructive",
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* MODAL DE CRIAR POST */}
      <Modal
        visible={showCreatePostModal}
        animationType="slide"
        onRequestClose={() => setShowCreatePostModal(false)}
      >
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreatePostModal(false)}>
              <X color={MIPO_COLORS.text} size={24} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Criar Post</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.postInputContainer}>
              <Image
                source={{
                  uri:
                    image ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name}`,
                }}
                style={styles.modalAvatar}
              />
              <TextInput
                style={styles.postTextInput}
                placeholder="O que você está pensando?"
                value={postContent}
                onChangeText={setPostContent}
                multiline
                numberOfLines={4}
                placeholderTextColor={MIPO_COLORS.textLighter}
              />
            </View>

            {postImage && (
              <View style={styles.postImagePreview}>
                <Image
                  source={{ uri: postImage }}
                  style={styles.previewImage}
                />
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => setPostImage(null)}
                >
                  <X color={MIPO_COLORS.white} size={16} />
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.selectImageBtn}
              onPress={async () => {
                const result = await ImagePicker.launchImageLibraryAsync({
                  allowsEditing: true,
                  quality: 0.5,
                });
                if (!result.canceled) {
                  setPostImage(result.assets[0].uri);
                }
              }}
            >
              <Camera color={MIPO_COLORS.primary} size={18} />
              <Text style={styles.selectImageBtnText}>Adicionar Imagem</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.publishBtn}
              onPress={handleCreatePost}
              disabled={isCreatingPost}
            >
              {isCreatingPost ? (
                <ActivityIndicator color={MIPO_COLORS.white} size="small" />
              ) : (
                <Text style={styles.publishBtnText}>Publicar</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* CONTEÚDO PRINCIPAL */}
      <ScrollView>
        {/* HEADER DO PERFIL */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Image
              source={{
                uri:
                  image ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name}`,
              }}
              style={styles.avatar}
            />
            {editMode && (
              <TouchableOpacity
                style={styles.cameraBtn}
                onPress={async () => {
                  const result = await ImagePicker.launchImageLibraryAsync({
                    allowsEditing: true,
                    aspect: [1, 1],
                    quality: 0.5,
                  });
                  if (!result.canceled) setImage(result.assets[0].uri);
                }}
              >
                <Camera color={MIPO_COLORS.white} size={20} />
              </TouchableOpacity>
            )}
          </View>

          {editMode ? (
            <View style={styles.editForm}>
              <View style={styles.inputGroup}>
                <AtSign size={18} color={MIPO_COLORS.textLighter} />
                <TextInput
                  placeholder="Nickname exclusivo"
                  style={styles.input}
                  value={nickname}
                  onChangeText={setNickname}
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.inputGroup}>
                <MapPin size={18} color={MIPO_COLORS.textLighter} />
                <TextInput
                  placeholder="Cidade"
                  style={styles.input}
                  value={city}
                  onChangeText={setCity}
                />
              </View>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveProfile}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={MIPO_COLORS.white} />
                ) : (
                  <Text style={styles.saveBtnText}>Finalizar Configuração</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.infoContainer}>
              <Text style={styles.userName}>{user?.name}</Text>
              <Text style={styles.userHandle}>@{user?.nickname}</Text>
              <Text style={styles.userCity}>{user?.city}</Text>
              <View style={styles.profileActions}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => setEditMode(true)}
                >
                  <Text style={styles.editBtnText}>Editar Perfil</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.createPostBtn}
                  onPress={() => setShowCreatePostModal(true)}
                >
                  <Plus color={MIPO_COLORS.white} size={18} />
                  <Text style={styles.createPostBtnText}>Post</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* POSTS */}
        <View style={styles.postsSection}>
          <Text style={styles.sectionTitle}>
            Meus Posts ({postsData?.data?.length || 0})
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
                  onDelete={handleDeletePost}
                />
              )}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Você ainda não tem posts</Text>
              <TouchableOpacity
                style={styles.createFirstPostBtn}
                onPress={() => setShowCreatePostModal(true)}
              >
                <Plus color={MIPO_COLORS.white} size={16} />
                <Text style={styles.createFirstPostBtnText}>
                  Criar Primeiro Post
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* MENU */}
        {!editMode && (
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={signOut}>
              <View style={styles.menuLeft}>
                <LogOut size={20} color={MIPO_COLORS.primary} />
                <Text style={[styles.menuText, { color: MIPO_COLORS.primary }]}>
                  Sair da Conta
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MIPO_COLORS.background },
  modal: {
    flex: 1,
    backgroundColor: MIPO_COLORS.background,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: MIPO_COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: MIPO_COLORS.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: MIPO_COLORS.text,
  },
  modalContent: {
    flex: 1,
    paddingVertical: 16,
  },
  postInputContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  modalAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  postTextInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: MIPO_COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: MIPO_COLORS.border,
    fontSize: 14,
    color: MIPO_COLORS.text,
    textAlignVertical: "top",
  },
  postImagePreview: {
    position: "relative",
    marginHorizontal: 16,
    marginBottom: 16,
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
  },
  removeImageBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 16,
    padding: 8,
  },
  selectImageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: MIPO_COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: MIPO_COLORS.border,
    gap: 8,
  },
  selectImageBtnText: {
    fontSize: 14,
    color: MIPO_COLORS.primary,
    fontWeight: "600",
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: MIPO_COLORS.white,
    borderTopWidth: 1,
    borderTopColor: MIPO_COLORS.border,
  },
  publishBtn: {
    paddingVertical: 12,
    backgroundColor: MIPO_COLORS.primary,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  publishBtnText: {
    color: MIPO_COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },
  header: {
    alignItems: "center",
    padding: 20,
    backgroundColor: MIPO_COLORS.white,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: MIPO_COLORS.border,
    overflow: "visible",
    borderWidth: 3,
    borderColor: MIPO_COLORS.primary,
  },
  avatar: { width: "100%", height: "100%", borderRadius: 50 },
  cameraBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: MIPO_COLORS.primary,
    padding: 8,
    borderRadius: 20,
    zIndex: 3,
    elevation: 6,
  },
  editForm: { width: "100%", marginTop: 16 },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: MIPO_COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  input: { flex: 1, height: 44, marginLeft: 8 },
  saveBtn: {
    backgroundColor: "#10b981",
    height: 44,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnText: { color: MIPO_COLORS.white, fontWeight: "bold", fontSize: 14 },
  infoContainer: { alignItems: "center", marginTop: 12 },
  userName: { fontSize: 20, fontWeight: "bold", color: MIPO_COLORS.text },
  userHandle: { fontSize: 14, color: MIPO_COLORS.primary, fontWeight: "600" },
  userCity: { fontSize: 13, color: MIPO_COLORS.textLighter, marginBottom: 12 },
  profileActions: {
    flexDirection: "row",
    gap: 8,
  },
  editBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  editBtnText: { color: MIPO_COLORS.primary, fontWeight: "600", fontSize: 13 },
  createPostBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: MIPO_COLORS.primary,
    borderRadius: 6,
    gap: 4,
  },
  createPostBtnText: {
    color: MIPO_COLORS.white,
    fontWeight: "600",
    fontSize: 13,
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
    height: 160,
    borderRadius: 6,
    marginBottom: 8,
  },
  postActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
    paddingVertical: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: MIPO_COLORS.textLighter,
    marginBottom: 16,
  },
  createFirstPostBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: MIPO_COLORS.primary,
    borderRadius: 8,
    gap: 6,
  },
  createFirstPostBtnText: {
    color: MIPO_COLORS.white,
    fontSize: 13,
    fontWeight: "600",
  },
  menuContainer: {
    backgroundColor: MIPO_COLORS.white,
    marginHorizontal: 16,
    borderRadius: 12,
    marginVertical: 16,
  },
  menuItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: MIPO_COLORS.border,
  },
  menuLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  menuText: { fontSize: 16, fontWeight: "500" },
});
