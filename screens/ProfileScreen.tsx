import React, { useEffect, useState } from "react";
import { View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { AtSign, FileText, MapPin, Pencil, Settings, User as UserIcon } from "lucide-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { uploadMedia, UploadError } from "../services/uploads";
import { Button, FieldLabel, IconButton, Input, MipoText, Screen, SectionHeader, showAlert } from "../components/ui";
import AchievementsHighlights from "./components/AchievementsHighlights";
import { FriendsSheet, PerfilHero, PerfilPerson, PerfilStats, PostsGrid } from "./perfil/PerfilParts";
import { PlayHistorySection } from "./perfil/PlayHistorySection";
import { ThemePreferenceSheet } from "./perfil/ThemePreferenceSheet";
import { SocialPost } from "./social/PostCard";
import { PostDetailModal, SocialComment } from "./social/PostDetailModal";
import { PostEditorModal } from "./social/PostEditorModal";
import { usePostEditor } from "./social/usePostEditor";
import { toggleLike, toggleLikeInFeed } from "./social/socialFormat";

interface ProfileScreenProps {
  route?: { params?: { openAchievements?: number; editMode?: boolean } };
  navigation: { navigate: (screen: string, params?: object) => void; setParams: (params: object) => void };
}

type UserPost = Omit<SocialPost, "user"> & { user?: SocialPost["user"] };

export default function ProfileScreen({ route, navigation }: ProfileScreenProps) {
  const { user, signOut, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const triggerOpenAchievements = route?.params?.openAchievements;
  const [clickOpenAchievements, setClickOpenAchievements] = useState(0);

  useEffect(() => {
    if (triggerOpenAchievements) {
      setTimeout(() => {
        navigation.setParams({ openAchievements: undefined });
      }, 500);
    }
  }, [triggerOpenAchievements, navigation]);

  const [editMode, setEditMode] = useState<boolean>(route?.params?.editMode || false);
  const [name, setName] = useState(user?.name || "");
  const [nickname, setNickname] = useState(user?.nickname || "");
  const [city, setCity] = useState(user?.city || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [image, setImage] = useState<string | null>(user?.avatarUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedPost, setSelectedPost] = useState<UserPost | null>(null);
  const postEditor = usePostEditor({ onDeleted: () => setSelectedPost(null) });
  const [commentText, setCommentText] = useState("");
  const [editingComment, setEditingComment] = useState<SocialComment | null>(null);

  const postsKey = ["posts", "user", user?.id];

  const { data: postsData, isLoading: isLoadingPosts } = useQuery<{ data: UserPost[] }>({
    queryKey: postsKey,
    queryFn: async () => (await api.get(`/posts/user/${user?.id}`, { params: { skip: 0, take: 20 } })).data,
  });

  const { data: friendsData } = useQuery<{ data: PerfilPerson[] }>({
    queryKey: ["friends", user?.id],
    queryFn: async () => (await api.get("/friends", { params: { skip: 0, take: 50 } })).data,
  });

  const { data: commentsData, refetch: refetchComments } = useQuery<{ data: SocialComment[] }>({
    queryKey: ["comments", selectedPost?.id],
    queryFn: async () => (await api.get(`/posts/${selectedPost?.id}/comments`)).data,
    enabled: !!selectedPost?.id,
  });

  const { data: achievementsData = [] } = useQuery<{ isObtained?: boolean }[]>({
    queryKey: ["achievements", user?.id],
    queryFn: async () => (await api.get(`/achievements?userId=${user?.id}`)).data,
    enabled: !!user?.id,
  });

  const obtainedAchCount = achievementsData.filter((a) => a.isObtained).length;

  const toggleLikeMutation = useMutation({
    mutationFn: (post: UserPost) => (post.likedByUser ? api.delete(`/posts/${post.id}/like`) : api.post(`/posts/${post.id}/like`)),
    onMutate: async (post) => {
      await queryClient.cancelQueries({ queryKey: postsKey });
      const previousPosts = queryClient.getQueryData<{ data: UserPost[] }>(postsKey);
      queryClient.setQueryData<{ data: UserPost[] } | undefined>(postsKey, (old) => toggleLikeInFeed(old, post.id));
      if (selectedPost?.id === post.id) setSelectedPost((prev) => (prev ? toggleLike(prev) : prev));
      return { previousPosts };
    },
    onError: (_error, _post, context) => {
      queryClient.setQueryData(postsKey, context?.previousPosts);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: postsKey });
    },
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) => api.post(`/posts/${selectedPost?.id}/comments`, { content }),
    onSuccess: () => {
      setCommentText("");
      refetchComments();
      queryClient.invalidateQueries({ queryKey: postsKey });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => api.delete(`/posts/comments/${commentId}`),
    onSuccess: () => {
      refetchComments();
      queryClient.invalidateQueries({ queryKey: postsKey });
    },
  });

  const editCommentMutation = useMutation({
    mutationFn: (data: { id: string; content: string }) => api.patch(`/posts/comments/${data.id}`, { content: data.content }),
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
      navigation.navigate("ChatDetail", { chatId: res.data.id, name: "Conversa" });
    },
  });

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.5 });
    if (result.canceled) return;

    setIsUploading(true);
    try {
      const uploadedUrl = await uploadMedia(result.assets[0], "/uploads/avatar");
      if (editMode) {
        setImage(uploadedUrl);
        return;
      }
      await api.patch("/users/profile", { avatarUrl: uploadedUrl });
      await refreshUser();
      setImage(uploadedUrl);
      showAlert("Foto atualizada!");
    } catch (error) {
      const message = error instanceof UploadError ? error.message : "Não foi possível salvar a nova foto.";
      showAlert("Não foi possível trocar a foto", message);
    } finally {
      setIsUploading(false);
    }
  };

  const startEditing = () => {
    setName(user?.name || "");
    setNickname(user?.nickname || "");
    setCity(user?.city || "");
    setBio(user?.bio || "");
    setImage(user?.avatarUrl || null);
    setEditMode(true);
  };

  const handleSaveProfile = async () => {
    if (!name || !nickname || !city) return showAlert("Atenção", "Nome, Nickname e Cidade são obrigatórios.");
    try {
      await api.patch("/users/profile", { name, nickname, city, bio, avatarUrl: image });
      await refreshUser();
      setEditMode(false);
    } catch {
      showAlert("Erro", "Erro ao salvar o perfil.");
    }
  };

  const sendComment = () => {
    const content = commentText.trim();
    if (!content) return;
    if (editingComment) editCommentMutation.mutate({ id: editingComment.id, content });
    else commentMutation.mutate(content);
  };

  const openProfile = (userId: string) => {
    setSelectedPost(null);
    setShowFriendsModal(false);
    navigation.navigate("PlayerProfile", { userId });
  };

  if (!user) return null;

  const me = { id: user.id, name: user.name, nickname: user.nickname, avatarUrl: user.avatarUrl };
  const person: PerfilPerson = { ...me, city: user.city, bio: user.bio, avatarUrl: editMode ? image : user.avatarUrl };
  const posts = postsData?.data ?? [];

  return (
    <>
      <Screen scroll withTabBar safeTop={false}>
        <PerfilHero
          person={person}
          tone="pink"
          coins={user.coins ?? 0}
          onCoinsPress={() => navigation.navigate("RewardsStore")}
          onAvatarPress={pickAvatar}
          avatarUploading={isUploading}
          topRight={<IconButton icon={Settings} accessibilityLabel="Configurações" onPress={() => setShowSettings(true)} />}
        >
          {editMode ? null : <Button label="Editar perfil" icon={Pencil} size="sm" onPress={startEditing} />}
        </PerfilHero>
        {editMode ? (
          <MipoText variant="caption" style={{ textAlign: "center", marginTop: 10 }}>
            Toque na foto para trocar a imagem
          </MipoText>
        ) : null}

        {editMode ? (
          <View style={{ marginTop: 6 }}>
            <FieldLabel>Nome completo</FieldLabel>
            <Input icon={UserIcon} placeholder="Nome completo" value={name} onChangeText={setName} />
            <FieldLabel>Apelido</FieldLabel>
            <Input icon={AtSign} placeholder="Nickname" value={nickname} onChangeText={setNickname} autoCapitalize="none" />
            <FieldLabel>Cidade</FieldLabel>
            <Input icon={MapPin} placeholder="Cidade" value={city} onChangeText={setCity} />
            <FieldLabel>Bio</FieldLabel>
            <Input icon={FileText} placeholder="Biografia" value={bio} onChangeText={setBio} multiline containerStyle={{ minHeight: 80 }} />
            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <Button label="Cancelar" variant="ghost" block onPress={() => setEditMode(false)} style={{ flex: 1 }} />
              <Button label="Salvar" variant="red" block loading={isUploading} onPress={handleSaveProfile} style={{ flex: 1 }} />
            </View>
          </View>
        ) : (
          <>
            <PerfilStats
              stats={[
                { value: posts.length, label: "posts" },
                { value: friendsData?.data?.length ?? 0, label: "amigos", onPress: () => setShowFriendsModal(true) },
                { value: obtainedAchCount, label: "conquistas", onPress: () => setClickOpenAchievements(Date.now()) },
              ]}
            />
            <AchievementsHighlights triggerOpenAll={triggerOpenAchievements || clickOpenAchievements} userId={user.id} isOwnProfile />
            <PlayHistorySection userId={user.id} isOwnProfile />
            <SectionHeader title="Meus posts" />
            <PostsGrid posts={posts} loading={isLoadingPosts} onOpen={(post) => setSelectedPost(posts.find((p) => p.id === post.id) ?? null)} />
          </>
        )}
      </Screen>

      <ThemePreferenceSheet
        visible={showSettings}
        onEditProfile={() => {
          setShowSettings(false);
          startEditing();
        }}
        onOpenAccountSettings={() => {
          setShowSettings(false);
          navigation.navigate("Settings");
        }}
        onSignOut={() => {
          setShowSettings(false);
          signOut();
        }}
        onClose={() => setShowSettings(false)}
      />

      <FriendsSheet
        visible={showFriendsModal}
        friends={friendsData?.data ?? []}
        onOpenProfile={openProfile}
        onMessage={(friend) => createPrivateChatMutation.mutate(friend.id)}
        onClose={() => setShowFriendsModal(false)}
      />

      <PostDetailModal
        post={selectedPost ? { ...selectedPost, user: selectedPost.user ?? me } : null}
        comments={commentsData?.data ?? []}
        currentUser={me}
        commentText={commentText}
        editingComment={editingComment}
        sending={commentMutation.isPending || editCommentMutation.isPending}
        onChangeComment={setCommentText}
        onSendComment={sendComment}
        onStartEditComment={(comment) => {
          setEditingComment(comment);
          setCommentText(comment.content);
        }}
        onCancelEditComment={() => {
          setEditingComment(null);
          setCommentText("");
        }}
        onDeleteComment={(comment) =>
          showAlert("Apagar", "Deseja apagar este comentário?", [
            { text: "Cancelar", style: "cancel" },
            { text: "Apagar", style: "destructive", onPress: () => deleteCommentMutation.mutate(comment.id) },
          ])
        }
        onLike={() => selectedPost && toggleLikeMutation.mutate(selectedPost)}
        onEditPost={() => {
          const post = selectedPost;
          setSelectedPost(null);
          if (post) postEditor.startEdit(post);
        }}
        onDeletePost={() => selectedPost && postEditor.confirmDelete(selectedPost.id)}
        onOpenProfile={openProfile}
        onClose={() => setSelectedPost(null)}
      />

      <PostEditorModal {...postEditor.editorProps} />
    </>
  );
}
