import React, { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { InfiniteData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, SquarePen, UserPlus } from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { IconButton, Screen, ScreenHeader, SegmentedControl, useBottomReserve, showAlert } from "../components/ui";
import { AmigosTab } from "./social/AmigosTab";
import { ConversasTab } from "./social/ConversasTab";
import { FeedTab } from "./social/FeedTab";
import { SocialPost } from "./social/PostCard";
import { PostDetailModal, SocialComment } from "./social/PostDetailModal";
import { PostEditorModal } from "./social/PostEditorModal";
import { AddFriendsSheet, NewChatSheet, ReportSheet } from "./social/SocialSheets";
import { ChatFilter, SocialChat, SocialUser, filterChats, toggleLike, toggleLikeInFeed } from "./social/socialFormat";
import { resolveImageForUpload } from "./social/uploadImage";
import { pickImage, usePostEditor } from "./social/usePostEditor";

type SocialTab = "feed" | "amigos" | "conversas";

interface Paginated<T> {
  data: T[];
}

interface FeedPage extends Paginated<SocialPost> {
  total: number;
  skip: number;
  take: number;
}

type FeedCache = InfiniteData<FeedPage, number>;

const FEED_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

interface SocialScreenProps {
  navigation: {
    navigate: (screen: string, params?: object) => void;
    setParams: (params: object) => void;
  };
  route?: { params?: { postId?: string; t?: unknown } };
}


export default function SocialScreen({ navigation, route }: SocialScreenProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const bottomReserve = useBottomReserve(true);

  const [activeTab, setActiveTab] = useState<SocialTab>("feed");
  const [chatFilter, setChatFilter] = useState<ChatFilter>("ALL");
  const [newChatModal, setNewChatModal] = useState(false);
  const [addFriendsModal, setAddFriendsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedPost, setSelectedPost] = useState<SocialPost | null>(null);
  const [commentText, setCommentText] = useState("");
  const [postToReport, setPostToReport] = useState<SocialPost | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportImage, setReportImage] = useState<string | null>(null);
  const [isReporting, setIsReporting] = useState(false);
  const [editingComment, setEditingComment] = useState<SocialComment | null>(null);
  const postEditor = usePostEditor({ onDeleted: () => setSelectedPost(null) });
  const canModerate = user?.role === "ADMIN" || user?.role === "MODERATOR";

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
        showAlert("Aviso", "Este post não está mais disponível ou foi apagado.");
      })
      .finally(() => {
        setTimeout(() => {
          navigation.setParams({ postId: undefined, t: undefined });
        }, 500);
      });
  }, [route?.params, navigation]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim().replace(/^@/, "")), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const {
    data: feedData,
    refetch: refetchFeed,
    isLoading: isLoadingFeed,
    fetchNextPage: fetchNextFeedPage,
    hasNextPage: hasMoreFeed,
    isFetchingNextPage: isFetchingMoreFeed,
  } = useInfiniteQuery({
    queryKey: ["posts", "feed"],
    queryFn: async ({ pageParam }): Promise<FeedPage> =>
      (await api.get("/posts/feed", { params: { skip: pageParam, take: FEED_PAGE_SIZE } })).data,
    initialPageParam: 0,
    getNextPageParam: (lastPage: FeedPage) =>
      Number(lastPage.skip) + Number(lastPage.take) < lastPage.total ? Number(lastPage.skip) + Number(lastPage.take) : undefined,
  });

  const feedPosts = useMemo(() => {
    const seen = new Set<string>();
    return (feedData?.pages.flatMap((page) => page.data) ?? []).filter((post) => !seen.has(post.id) && seen.add(post.id));
  }, [feedData]);

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
    enabled: addFriendsModal && !debouncedSearch,
  });

  const { data: searchResults, isFetching: isSearching } = useQuery<Paginated<SocialUser>>({
    queryKey: ["friends", "search", debouncedSearch],
    queryFn: async () => (await api.get("/friends/search", { params: { q: debouncedSearch } })).data,
    enabled: addFriendsModal && debouncedSearch.length > 0,
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

  const toggleLikeMutation = useMutation({
    mutationFn: (post: SocialPost) => (post.likedByUser ? api.delete(`/posts/${post.id}/like`) : api.post(`/posts/${post.id}/like`)),
    onMutate: async (post) => {
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      const previousFeed = queryClient.getQueryData<FeedCache>(["posts", "feed"]);
      queryClient.setQueryData<FeedCache>(["posts", "feed"], (old) =>
        old ? { ...old, pages: old.pages.map((page) => ({ ...page, ...toggleLikeInFeed(page, post.id) })) } : old,
      );
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
      showAlert("Sucesso", "Solicitação enviada!");
      queryClient.invalidateQueries({ queryKey: ["friends", "available"] });
      queryClient.invalidateQueries({ queryKey: ["friends", "search"] });
    },
  });

  const confirmDeleteComment = (comment: SocialComment) => {
    showAlert("Apagar", "Deseja apagar este comentário?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Apagar", style: "destructive", onPress: () => deleteCommentMutation.mutate(comment.id) },
    ]);
  };

  const handleReportPost = async () => {
    if (!reportReason.trim()) return showAlert("Atenção", "Preencha o motivo da denúncia.");
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
      showAlert("Sucesso", "A denúncia foi enviada para análise.");
      setReportReason("");
      setReportImage(null);
      setPostToReport(null);
    } catch {
      showAlert("Erro", "Erro ao denunciar.");
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
      <IconButton icon={Plus} tone="yellow" accessibilityLabel="Novo post" onPress={postEditor.startNew} />
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
            posts={feedPosts}
            loading={isLoadingFeed}
            currentUser={currentUser}
            bottomReserve={bottomReserve}
            onRefresh={refetchFeed}
            onEndReached={() => {
              if (hasMoreFeed && !isFetchingMoreFeed) fetchNextFeedPage();
            }}
            loadingMore={isFetchingMoreFeed}
            onCompose={postEditor.startNew}
            onOpenPost={setSelectedPost}
            onLike={(post) => toggleLikeMutation.mutate(post)}
            canModerate={canModerate}
            onEdit={postEditor.startEdit}
            onDelete={(post) => postEditor.confirmDelete(post.id)}
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

      <PostEditorModal {...postEditor.editorProps} />

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
          if (post) postEditor.startEdit(post);
        }}
        onDeletePost={() => selectedPost && postEditor.confirmDelete(selectedPost.id)}
        canModerate={canModerate}
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
        users={(debouncedSearch ? searchResults?.data : availableUsers?.data) ?? []}
        searching={isSearching}
        onChangeQuery={setSearchQuery}
        onAdd={(candidate) => sendFriendReqMutation.mutate(candidate.id)}
        onOpenProfile={(candidate) => {
          setAddFriendsModal(false);
          navigation.navigate("PlayerProfile", { userId: candidate.id });
        }}
        onClose={() => setAddFriendsModal(false)}
      />
    </Screen>
  );
}
