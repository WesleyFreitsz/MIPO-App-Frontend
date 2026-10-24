import React, { useState } from "react";
import { Alert, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Clock, MessageCircle, UserMinus, UserPlus } from "lucide-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { BackButton, Button, Hero, Screen, SectionHeader, Skeleton } from "../components/ui";
import AchievementsHighlights from "./components/AchievementsHighlights";
import { PerfilHero, PerfilPerson, PerfilStats, PostsGrid } from "./perfil/PerfilParts";
import { SocialPost } from "./social/PostCard";
import { PostDetailModal, SocialComment } from "./social/PostDetailModal";
import { ReportSheet } from "./social/SocialSheets";
import { toggleLike, toggleLikeInFeed } from "./social/socialFormat";
import { resolveImageForUpload } from "./social/uploadImage";

interface PlayerProfileScreenProps {
  route: { params?: object };
  navigation: { navigate: (screen: string, params?: object) => void; goBack: () => void };
}

type UserPost = Omit<SocialPost, "user"> & { user?: SocialPost["user"] };

interface FriendshipStatus {
  id?: string;
  status?: string;
}

interface ApiErrorShape {
  response?: { status?: number; data?: { message?: string } };
}

function apiError(error: unknown): ApiErrorShape["response"] {
  return (error as ApiErrorShape | null)?.response;
}

export default function PlayerProfileScreen({ route, navigation }: PlayerProfileScreenProps) {
  const { userId } = route.params as { userId: string };
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [clickOpenAchievements, setClickOpenAchievements] = useState(0);

  const [selectedPost, setSelectedPost] = useState<UserPost | null>(null);
  const [commentText, setCommentText] = useState("");
  const [editingComment, setEditingComment] = useState<SocialComment | null>(null);

  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [postToReport, setPostToReport] = useState<SocialPost | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportImage, setReportImage] = useState<string | null>(null);
  const [isReporting, setIsReporting] = useState(false);

  const postsKey = ["posts", "user", userId];

  const { data: achievementsData = [] } = useQuery<{ isObtained?: boolean }[]>({
    queryKey: ["achievements", userId],
    queryFn: async () => (await api.get(`/achievements?userId=${userId}`)).data,
    enabled: !!userId,
  });

  const obtainedAchCount = achievementsData.filter((a) => a.isObtained).length;

  const { data: userData, isLoading: userLoading } = useQuery<PerfilPerson>({
    queryKey: ["user", userId],
    queryFn: async () => (await api.get(`/users/${userId}`)).data,
  });

  const { data: postsData, isLoading: isLoadingPosts } = useQuery<{ data: UserPost[] }>({
    queryKey: postsKey,
    queryFn: async () => (await api.get(`/posts/user/${userId}`, { params: { skip: 0, take: 20 } })).data,
  });

  const { data: statusData } = useQuery<FriendshipStatus>({
    queryKey: ["friendship", userId],
    queryFn: async () => (await api.get(`/friends/${userId}/status`)).data,
  });

  const { data: commentsData, refetch: refetchComments } = useQuery<{ data: SocialComment[] }>({
    queryKey: ["comments", selectedPost?.id],
    queryFn: async () => (await api.get(`/posts/${selectedPost?.id}/comments`)).data,
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
      } catch (error: unknown) {
        // Se der Conflito (409), significa que a solicitação pendente fomos NÓS que enviamos.
        // Logo, clicar no botão de novo deve CANCELAR a nossa solicitação.
        if (apiError(error)?.status === 409 && statusData?.id) {
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
    onError: (error: unknown) => {
      Alert.alert("Aviso", apiError(error)?.data?.message || "Não foi possível alterar a amizade no momento.");
    },
  });

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

  const handleReportPost = async () => {
    if (!reportReason.trim()) return Alert.alert("Atenção", "Preencha o motivo da denúncia.");
    if (!postToReport) return;
    setIsReporting(true);
    const finalImage = await resolveImageForUpload(reportImage);
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

  const pickReportImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.5 });
    if (!res.canceled) setReportImage(res.assets[0].uri);
  };

  const sendComment = () => {
    const content = commentText.trim();
    if (!content) return;
    if (editingComment) editCommentMutation.mutate({ id: editingComment.id, content });
    else commentMutation.mutate(content);
  };

  const openProfile = (profileUserId: string) => {
    setSelectedPost(null);
    navigation.navigate("PlayerProfile", { userId: profileUserId });
  };

  const backButton = <BackButton onPress={() => navigation.goBack()} />;

  if (userLoading || !userData) {
    return (
      <Screen scroll safeTop={false}>
        <Hero tone="teal" paddingTop={insets.top + 6} style={{ alignItems: "center", gap: 10 }}>
          <View style={{ alignSelf: "stretch", minHeight: 38 }}>{backButton}</View>
          <Skeleton height={84} style={{ width: 84, borderRadius: 42 }} />
          <Skeleton height={22} style={{ width: 160 }} />
          <Skeleton height={14} style={{ width: 110 }} />
        </Hero>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
          <Skeleton height={56} style={{ flex: 1 }} />
          <Skeleton height={56} style={{ flex: 1 }} />
        </View>
      </Screen>
    );
  }

  const me = currentUser
    ? { id: currentUser.id, name: currentUser.name, nickname: currentUser.nickname, avatarUrl: currentUser.avatarUrl }
    : null;
  const owner = { id: userData.id, name: userData.name, nickname: userData.nickname, avatarUrl: userData.avatarUrl };
  const posts = postsData?.data ?? [];
  const reportSelectedPost = () => {
    if (!selectedPost) return;
    setPostToReport({ ...selectedPost, user: selectedPost.user ?? owner });
    setSelectedPost(null);
    setReportModalVisible(true);
  };
  const friendshipLabel = isFriend ? "Deixar de seguir" : isPending ? "Pendente" : "Seguir";
  const friendshipIcon = isFriend ? UserMinus : isPending ? Clock : UserPlus;

  return (
    <>
      <Screen scroll safeTop={false}>
        <PerfilHero person={userData} tone="teal" topLeft={backButton}>
          {currentUser?.id !== userId ? (
            <>
              <Button
                label={friendshipLabel}
                icon={friendshipIcon}
                variant={isFriend || isPending ? "ghost" : "red"}
                size="sm"
                loading={toggleFriendshipMutation.isPending}
                onPress={() => toggleFriendshipMutation.mutate()}
              />
              <Button label="Mensagem" icon={MessageCircle} variant="ghost" size="sm" onPress={handleSendMessage} />
            </>
          ) : null}
        </PerfilHero>

        <PerfilStats
          stats={[
            { value: posts.length, label: "posts" },
            { value: obtainedAchCount, label: "conquistas", onPress: () => setClickOpenAchievements(Date.now()) },
          ]}
        />

        <AchievementsHighlights userId={userData.id} isOwnProfile={false} triggerOpenAll={clickOpenAchievements} />

        <SectionHeader title="Posts" />
        <PostsGrid posts={posts} loading={isLoadingPosts} onOpen={(post) => setSelectedPost(posts.find((p) => p.id === post.id) ?? null)} />
      </Screen>

      <PostDetailModal
        post={selectedPost ? { ...selectedPost, user: selectedPost.user ?? owner } : null}
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
          Alert.alert("Apagar", "Deseja apagar este comentário?", [
            { text: "Cancelar", style: "cancel" },
            { text: "Apagar", style: "destructive", onPress: () => deleteCommentMutation.mutate(comment.id) },
          ])
        }
        onLike={() => selectedPost && toggleLikeMutation.mutate(selectedPost)}
        onEditPost={() => undefined}
        onDeletePost={() => undefined}
        hidePostActions
        onReportPost={reportSelectedPost}
        onOpenProfile={openProfile}
        onClose={() => setSelectedPost(null)}
      />

      <ReportSheet
        visible={reportModalVisible}
        reason={reportReason}
        image={reportImage}
        sending={isReporting}
        onChangeReason={setReportReason}
        onPickImage={pickReportImage}
        onSubmit={handleReportPost}
        onClose={() => setReportModalVisible(false)}
      />
    </>
  );
}
