import React, { useEffect, useState } from "react";
import { Alert, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { Plus, SquarePen, UserPlus } from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { useWebSocketChat } from "../hooks/useWebSocketChat";
import { IconButton, Screen, ScreenHeader, SegmentedControl, useBottomReserve } from "../components/ui";
import { AmigosTab } from "./social/AmigosTab";
import { ConversasTab } from "./social/ConversasTab";
import { FeedTab } from "./social/FeedTab";
import { SocialPost } from "./social/PostCard";
import { PostDetailModal, SocialComment } from "./social/PostDetailModal";
import { PostEditorModal } from "./social/PostEditorModal";
import { AddFriendsSheet, NewChatSheet, ReportSheet } from "./social/SocialSheets";
import { ChatFilter, SocialChat, SocialUser, filterAvailableUsers, filterChats, toggleLike, toggleLikeInFeed } from "./social/socialFormat";
import { resolveImageForUpload } from "./social/uploadImage";

type SocialTab = "feed" | "amigos" | "conversas";

interface Paginated<T> {
  data: T[];
}

interface SocialScreenProps {
  navigation: {
    navigate: (screen: string, params?: object) => void;
    setParams: (params: object) => void;
  };
  route?: { params?: { postId?: string; t?: unknown } };
}


async function pickImage(): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.5 });
  return res.canceled ? null : res.assets[0].uri;
}

export default function SocialScreen({ navigation, route }: SocialScreenProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { socket } = useWebSocketChat();
  const bottomReserve = useBottomReserve(true);

  const [activeTab, setActiveTab] = useState<SocialTab>("feed");
  const [chatFilter, setChatFilter] = useState<ChatFilter>("ALL");
  const [createPostModal, setCreatePostModal] = useState(false);
  const [newChatModal, setNewChatModal] = useState(false);
  const [addFriendsModal, setAddFriendsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPost, setSelectedPost] = useState<SocialPost | null>(null);
  const [commentText, setCommentText] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postImage, setPostImage] = useState<string | null>(null);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [postToReport, setPostToReport] = useState<SocialPost | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportImage, setReportImage] = useState<string | null>(null);
  const [isReporting, setIsReporting] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [editingComment, setEditingComment] = useState<SocialComment | null>(null);

  useEffect(() => {
    if (!socket) return;
    const handleListUpdate = () => queryClient.invalidateQueries({ queryKey: ["chats"] });
    socket.on("chat:list-update", handleListUpdate);
    return () => {
      socket.off("chat:list-update", handleListUpdate);
    };
  }, [socket, queryClient]);

  useEffect(() => {
    const postId = route?.params?.postId;
    if (!postId) return;
    setActiveTab("feed");
    api
      .get(`/posts/${postId}`)
      .then((res) => {
        if (res.data) setSelectedPost(res.data);
      })
      .catch((error) => {
        console.error(error);
        Alert.alert("Aviso", "Este post não está mais disponível ou foi apagado.");
      })
      .finally(() => {
        setTimeout(() => {
          navigation.setParams({ postId: undefined, t: undefined });
        }, 500);
      });
  }, [route?.params, navigation]);

  const { data: feedData, refetch: refetchFeed, isLoading: isLoadingFeed } = useQuery<Paginated<SocialPost>>({
    queryKey: ["posts", "feed"],
    queryFn: async () => (await api.get("/posts/feed")).data,
  });

  const { data: chatsData, refetch: refetchChats, isLoading: isLoadingChats } = useQuery<Paginated<SocialChat>>({
    queryKey: ["chats"],
    queryFn: async () => (await api.get("/chats")).data,
  });

  const { data: friendsData } = useQuery<Paginated<SocialUser>>({
    queryKey: ["friends"],
    queryFn: async () => (await api.get("/friends")).data,
  });

  const { data: availableUsers } = useQuery<Paginated<SocialUser>>({
    queryKey: ["friends", "available"],
    queryFn: async () => (await api.get("/friends/available/users")).data,
  });

  const { data: pendingRequests } = useQuery<Paginated<unknown> | unknown[]>({
    queryKey: ["friendRequests", "pending_global"],
    queryFn: async () => (await api.get("/friends/requests/pending")).data,
  });

  const { data: commentsData, refetch: refetchComments } = useQuery<Paginated<SocialComment>>({
    queryKey: ["comments", selectedPost?.id],
    queryFn: async () => (await api.get(`/posts/${selectedPost?.id}/comments`)).data,
    enabled: !!selectedPost?.id,
  });

  const unreadChats = chatsData?.data?.filter((chat) => (chat.unreadCount ?? 0) > 0).length ?? 0;
  const tabs: { value: SocialTab; label: string }[] = [
    { value: "feed", label: "Feed" },
    { value: "amigos", label: "Amigos" },
    { value: "conversas", label: unreadChats > 0 ? `Conversas (${unreadChats})` : "Conversas" },
  ];

  const pendingCount = Array.isArray(pendingRequests) ? pendingRequests.length : (pendingRequests?.data?.length ?? 0);

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
    mutationFn: (post: SocialPost) => (post.likedByUser ? api.delete(`/posts/${post.id}/like`) : api.post(`/posts/${post.id}/like`)),
    onMutate: async (post) => {
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      const previousFeed = queryClient.getQueryData<Paginated<SocialPost>>(["posts", "feed"]);
      queryClient.setQueryData<Paginated<SocialPost> | undefined>(["posts", "feed"], (old) => toggleLikeInFeed(old, post.id));
      if (selectedPost?.id === post.id) setSelectedPost((prev) => (prev ? toggleLike(prev) : prev));
      return { previousFeed };
    },
    onError: (_error, _post, context) => {
      queryClient.setQueryData(["posts", "feed"], context?.previousFeed);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) => api.post(`/posts/${selectedPost?.id}/comments`, { content }),
    onSuccess: () => {
      setCommentText("");
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => api.delete(`/posts/comments/${commentId}`),
    onSuccess: () => {
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ["posts"] });
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
      setNewChatModal(false);
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      navigation.navigate("ChatDetail", { chatId: res.data.id, name: "Conversa" });
    },
  });

  const sendFriendReqMutation = useMutation({
    mutationFn: (friendId: string) => api.post("/friends/request", { friendId }),
    onSuccess: () => {
      Alert.alert("Sucesso", "Solicitação enviada!");
      queryClient.invalidateQueries({ queryKey: ["friends", "available"] });
    },
  });

  const handleCreatePost = async () => {
    if (!postContent.trim() && !postImage) return Alert.alert("Atenção", "Digite algo ou adicione foto.");
    setIsCreatingPost(true);
    const finalImage = await resolveImageForUpload(postImage);
    try {
      if (editingPost) {
        await api.patch(`/posts/${editingPost.id}`, { content: postContent, imageUrl: finalImage });
        Alert.alert("Sucesso", "Post atualizado!");
      } else {
        await api.post("/posts", { content: postContent, imageUrl: finalImage });
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

  const openNewPost = () => {
    setEditingPost(null);
    setPostContent("");
    setPostImage(null);
    setCreatePostModal(true);
  };

  const handleEditInit = (post: SocialPost) => {
    setEditingPost(post);
    setPostContent(post.content);
    setPostImage(post.imageUrl ?? null);
    setCreatePostModal(true);
  };

  const confirmDelete = (postId: string) => {
    Alert.alert("Excluir", "Deseja remover este post permanentemente?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => deletePostMutation.mutate(postId) },
    ]);
  };

  const confirmDeleteComment = (comment: SocialComment) => {
    Alert.alert("Apagar", "Deseja apagar este comentário?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Apagar", style: "destructive", onPress: () => deleteCommentMutation.mutate(comment.id) },
    ]);
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
      setReportReason("");
      setReportImage(null);
      setPostToReport(null);
    } catch {
      Alert.alert("Erro", "Erro ao denunciar.");
    } finally {
      setIsReporting(false);
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
    navigation.navigate("PlayerProfile", { userId });
  };

  const headerAction =
    activeTab === "feed" ? (
      <IconButton icon={Plus} tone="yellow" accessibilityLabel="Novo post" onPress={openNewPost} />
    ) : activeTab === "amigos" ? (
      <IconButton icon={UserPlus} tone="yellow" accessibilityLabel="Adicionar amigos" onPress={() => setAddFriendsModal(true)} />
    ) : (
      <IconButton icon={SquarePen} tone="yellow" accessibilityLabel="Nova conversa" onPress={() => setNewChatModal(true)} />
    );

  const currentUser: SocialUser | null = user ? { id: user.id, name: user.name, nickname: user.nickname, avatarUrl: user.avatarUrl } : null;

  return (
    <Screen>
      <ScreenHeader title="Social" right={headerAction} />
      <SegmentedControl options={tabs} value={activeTab} onChange={setActiveTab} />

      <View style={{ flex: 1 }}>
        {activeTab === "feed" ? (
          <FeedTab
            posts={feedData?.data}
            loading={isLoadingFeed}
            currentUser={currentUser}
            bottomReserve={bottomReserve}
            onRefresh={refetchFeed}
            onCompose={openNewPost}
            onOpenPost={setSelectedPost}
            onLike={(post) => toggleLikeMutation.mutate(post)}
            onEdit={handleEditInit}
            onDelete={(post) => confirmDelete(post.id)}
            onReport={setPostToReport}
            onOpenProfile={openProfile}
          />
        ) : activeTab === "amigos" ? (
          <AmigosTab
            friends={friendsData?.data ?? []}
            pendingCount={pendingCount}
            bottomReserve={bottomReserve}
            onSeeRequests={() => navigation.navigate("Notificações")}
            onOpenProfile={openProfile}
            onMessage={(friend) => createPrivateChatMutation.mutate(friend.id)}
            onAddFriends={() => setAddFriendsModal(true)}
          />
        ) : (
          <ConversasTab
            chats={filterChats(chatsData?.data, chatFilter)}
            loading={isLoadingChats}
            filter={chatFilter}
            userId={user?.id}
            bottomReserve={bottomReserve}
            onFilterChange={setChatFilter}
            onRefresh={refetchChats}
            onOpenChat={(chat, display) =>
              navigation.navigate("ChatDetail", {
                chatId: chat.id,
                name: display.title,
                type: chat.type,
                avatar: display.avatar,
                targetId: display.targetId,
              })
            }
          />
        )}
      </View>

      <PostEditorModal
        visible={createPostModal}
        editing={editingPost !== null}
        content={postContent}
        image={postImage}
        saving={isCreatingPost}
        onChangeContent={setPostContent}
        onPickImage={async () => {
          const uri = await pickImage();
          if (uri) setPostImage(uri);
        }}
        onSubmit={handleCreatePost}
        onClose={() => {
          setCreatePostModal(false);
          setEditingPost(null);
        }}
      />

      <PostDetailModal
        post={selectedPost}
        comments={commentsData?.data ?? []}
        currentUser={currentUser}
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
        onDeleteComment={confirmDeleteComment}
        onLike={() => selectedPost && toggleLikeMutation.mutate(selectedPost)}
        onEditPost={() => {
          const post = selectedPost;
          setSelectedPost(null);
          if (post) handleEditInit(post);
        }}
        onDeletePost={() => selectedPost && confirmDelete(selectedPost.id)}
        onOpenProfile={openProfile}
        onClose={() => setSelectedPost(null)}
      />

      <ReportSheet
        visible={postToReport !== null}
        reason={reportReason}
        image={reportImage}
        sending={isReporting}
        onChangeReason={setReportReason}
        onPickImage={async () => {
          const uri = await pickImage();
          if (uri) setReportImage(uri);
        }}
        onSubmit={handleReportPost}
        onClose={() => setPostToReport(null)}
      />

      <NewChatSheet
        visible={newChatModal}
        friends={friendsData?.data ?? []}
        onNewGroup={() => {
          setNewChatModal(false);
          navigation.navigate("CreateChatGroup");
        }}
        onPickFriend={(friend) => createPrivateChatMutation.mutate(friend.id)}
        onClose={() => setNewChatModal(false)}
      />

      <AddFriendsSheet
        visible={addFriendsModal}
        query={searchQuery}
        users={filterAvailableUsers(availableUsers?.data, searchQuery)}
        onChangeQuery={setSearchQuery}
        onAdd={(candidate) => sendFriendReqMutation.mutate(candidate.id)}
        onClose={() => setAddFriendsModal(false)}
      />
    </Screen>
  );
}
