import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { Check, Image as ImageIcon, Palette, Send, WifiOff, X } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { useIsFocused } from "@react-navigation/native";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { AlertButton, Avatar, BackButton, IconButton, Input, MipoText, showAlert } from "../components/ui";
import { StaggerIn } from "../motion/StaggerIn";
import { useTheme } from "../theme/ThemeProvider";
import { EventoDetail } from "../types";
import { AddMembersSheet } from "./chat/AddMembersSheet";
import { ChatThemeSheet, ChatThemeTab } from "./chat/ChatThemeSheet";
import {
  ChatDetails,
  ChatMessageItem,
  ChatReplyPreview,
  ChatUser,
  MessagesCache,
  MessagesPage,
  colorForName,
  displayLabel,
  formatLastSeen,
  messagesQueryKey,
  readableOn,
} from "./chat/chatTypes";
import { replaceMessage } from "./chat/messageCache";
import { DottedBackground } from "./chat/DottedBackground";
import { EventoInfoSheet } from "./chat/EventoInfoSheet";
import { GroupInfoModal } from "./chat/GroupInfoModal";
import { MessageBubble } from "./chat/MessageBubble";
import { resolveImageForUpload, uploadImageAsync } from "./social/uploadImage";
import { ReportSheet } from "./social/SocialSheets";

const PAGE_SIZE = 30;
const TYPING_IDLE_MS = 3000;
const TYPING_TIMEOUT_MS = 6000;
const OFFLINE_BANNER_DELAY_MS = 1500;
const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "🎲", "🎉"];

interface TypingEvent {
  chatId: string;
  userId: string;
  isTyping: boolean;
}

interface PresenceState {
  userId: string;
  online: boolean;
  lastSeenAt: string | null;
}

function toReplyPreview(message: ChatMessageItem | null): ChatReplyPreview | null {
  if (!message) return null;
  return { id: message.id, userId: message.userId, content: message.content, imageUrl: message.imageUrl, user: message.user };
}

interface ChatRouteParams {
  chatId: string;
  name?: string;
  type?: string;
  avatar?: string | null;
  targetId?: string;
}

interface ChatDetailScreenProps {
  route: { params?: object };
  navigation: { navigate: (screen: string, params?: object) => void; goBack: () => void };
}

export default function ChatDetailScreen({ route, navigation }: ChatDetailScreenProps) {
  const { chatId, name = "", type, avatar, targetId } = route.params as ChatRouteParams;
  const { user } = useAuth();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [messageText, setMessageText] = useState("");

  const [groupInfoModal, setGroupInfoModal] = useState(false);
  const [addMemberModal, setAddMemberModal] = useState(false);
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);

  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editImage, setEditImage] = useState<string | null>(null);
  const [eventData, setEventData] = useState<EventoDetail | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessageItem | null>(null);
  const [activeThemeTab, setActiveThemeTab] = useState<ChatThemeTab>("BUBBLE");
  const [wheelColor, setWheelColor] = useState<string>(colors.bg);
  const [previewNameColor, setPreviewNameColor] = useState<string>("");

  const [replyingTo, setReplyingTo] = useState<ChatMessageItem | null>(null);
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const [presence, setPresence] = useState<PresenceState | null>(null);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const typingRef = useRef<{ active: boolean; timer?: ReturnType<typeof setTimeout> }>({ active: false });
  const isFocused = useIsFocused();

  const { socket, status, pendingByChat, joinChat, leaveChat, sendMessage, retryMessage, discardMessage, markRead, setTyping } = useSocket();

  const { data: messagesData, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: messagesQueryKey(chatId),
    queryFn: async ({ pageParam }): Promise<MessagesPage> =>
      (await api.get(`/chats/${chatId}/messages`, { params: { before: pageParam ?? undefined, take: PAGE_SIZE } })).data,
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: MessagesPage) => lastPage.nextCursor ?? undefined,
    staleTime: 0,
  });

  const { data: chatDetails, refetch: refetchChatDetails } = useQuery<ChatDetails>({
    queryKey: ["chatDetails", chatId],
    queryFn: async () => (await api.get(`/chats/${chatId}`)).data,
    enabled: !!chatId,
  });

  const { data: friendsData } = useQuery<{ data: ChatUser[] }>({
    queryKey: ["friends", "list"],
    queryFn: async () => (await api.get("/friends", { params: { skip: 0, take: 100 } })).data,
    enabled: addMemberModal,
  });

  const pendingMessages = pendingByChat[chatId];
  const allMessages = useMemo<ChatMessageItem[]>(
    () => [...(pendingMessages ?? []), ...(messagesData?.pages.flatMap((page) => page.data) ?? [])],
    [pendingMessages, messagesData],
  );
  const newestIncomingId = allMessages.find((m) => m.userId !== user?.id && !m.status)?.id;

  useEffect(() => {
    joinChat(chatId);
    return () => leaveChat(chatId);
  }, [chatId, joinChat, leaveChat]);

  useEffect(() => {
    if (isFocused) markRead(chatId);
  }, [chatId, isFocused, newestIncomingId, markRead]);

  useEffect(() => {
    if (status === "connected") {
      setShowOfflineBanner(false);
      return;
    }
    const timer = setTimeout(() => setShowOfflineBanner(true), OFFLINE_BANNER_DELAY_MS);
    return () => clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (!socket) return;
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const removeTyping = (userId: string) => setTypingUserIds((prev) => prev.filter((id) => id !== userId));
    const onTyping = (data: TypingEvent) => {
      if (data.chatId !== chatId || data.userId === user?.id) return;
      clearTimeout(timers.get(data.userId));
      if (!data.isTyping) return removeTyping(data.userId);
      setTypingUserIds((prev) => (prev.includes(data.userId) ? prev : [...prev, data.userId]));
      timers.set(data.userId, setTimeout(() => removeTyping(data.userId), TYPING_TIMEOUT_MS));
    };
    socket.on("typing", onTyping);
    return () => {
      socket.off("typing", onTyping);
      timers.forEach(clearTimeout);
    };
  }, [socket, chatId, user?.id]);

  const stopTyping = useCallback(() => {
    clearTimeout(typingRef.current.timer);
    if (!typingRef.current.active) return;
    typingRef.current.active = false;
    setTyping(chatId, false);
  }, [chatId, setTyping]);

  useEffect(() => stopTyping, [stopTyping]);

  const handleChangeText = (text: string) => {
    setMessageText(text);
    if (editingMessage) return;
    if (!typingRef.current.active && text.trim()) {
      typingRef.current.active = true;
      setTyping(chatId, true);
    }
    clearTimeout(typingRef.current.timer);
    typingRef.current.timer = setTimeout(stopTyping, TYPING_IDLE_MS);
  };

  const isPrivate = type === "PRIVATE" || chatDetails?.type === "PRIVATE";
  const otherMemberData = chatDetails?.members?.find((m) => m.userId !== user?.id);
  const otherMember = otherMemberData?.user;
  const presenceUserId = isPrivate ? otherMember?.id : undefined;

  useEffect(() => {
    if (!socket || !presenceUserId || status !== "connected") return;
    socket
      .emitWithAck("presence:watch", { userId: presenceUserId })
      .then((data: PresenceState) => setPresence(data))
      .catch(() => undefined);
    const onPresence = (data: PresenceState) => {
      if (data.userId === presenceUserId) setPresence(data);
    };
    socket.on("presence:update", onPresence);
    return () => {
      socket.off("presence:update", onPresence);
      socket.emit("presence:unwatch", { userId: presenceUserId });
    };
  }, [socket, presenceUserId, status]);

  const displayAvatar = isPrivate ? otherMember?.avatarUrl || avatar : chatDetails?.imageUrl || avatar;
  const displayName = isPrivate ? otherMember?.nickname || otherMember?.name || name : chatDetails?.name || name;
  const displayTargetId = isPrivate ? otherMember?.id || targetId : targetId;
  const amIAdmin = Boolean(chatDetails?.members?.some((m) => m.userId === user?.id && m.role === "ADMIN"));
  const myMemberData = chatDetails?.members?.find((m) => m.userId === user?.id);

  const personalBgColor = myMemberData?.backgroundTheme || null;
  const wheelColorChanged = wheelColor !== (personalBgColor || colors.bg);
  const activeBgColor = themeModalVisible && wheelColorChanged ? wheelColor : personalBgColor;
  const headerForeground = activeBgColor ? readableOn(activeBgColor) : colors.text;
  const typingNames = typingUserIds.map((id) => displayLabel(chatDetails?.members?.find((m) => m.userId === id)?.user)).filter(Boolean);
  const lastSeenAt = presence?.lastSeenAt ?? otherMemberData?.lastSeenAt ?? null;
  const privateSubtitle = presence?.online ? "online" : lastSeenAt ? formatLastSeen(lastSeenAt) : "Ver perfil";
  const headerSubtitle =
    typingNames.length > 0
      ? isPrivate
        ? "digitando…"
        : `${typingNames.join(", ")} digitando…`
      : type === "GROUP"
        ? "Toque para dados do grupo"
        : type === "EVENT"
          ? "Toque para detalhes do evento"
          : privateSubtitle;

  const handleOpenThemeModal = () => {
    setWheelColor(myMemberData?.backgroundTheme || colors.bg);
    setPreviewNameColor(myMemberData?.customColor || "");
    setThemeModalVisible(true);
  };

  const handleHeaderPress = () => {
    if (isPrivate && displayTargetId) navigation.navigate("PlayerProfile", { userId: displayTargetId });
    else if (type === "EVENT" && chatId) {
      api
        .get<EventoDetail[]>("/events")
        .then((res) => {
          const eventoEncontrado = res.data.find((e) => e.chatId === chatId);
          if (eventoEncontrado) {
            setEventData(eventoEncontrado);
            setEventModalVisible(true);
          } else showAlert("Aviso", "Evento não encontrado.");
        })
        .catch(() => showAlert("Erro", "Não foi possível carregar o evento."));
    } else if (type === "GROUP") {
      setEditName(chatDetails?.name || name);
      setEditDesc(chatDetails?.description || "");
      setGroupInfoModal(true);
    }
  };

  const applyServerMessage = (message: ChatMessageItem) =>
    queryClient.setQueryData<MessagesCache>(messagesQueryKey(chatId), (old) => replaceMessage(old, message));

  const editMessageMutation = useMutation({
    mutationFn: async (data: { id: string; content: string }) =>
      (await api.patch<ChatMessageItem>(`/chats/messages/${data.id}`, { content: data.content })).data,
    onSuccess: (message) => {
      setEditingMessage(null);
      setMessageText("");
      applyServerMessage(message);
    },
    onError: () => showAlert("Erro", "Não foi possível editar a mensagem."),
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (id: string) => (await api.delete<ChatMessageItem>(`/chats/messages/${id}`)).data,
    onSuccess: applyServerMessage,
    onError: () => showAlert("Erro", "Não foi possível apagar a mensagem."),
  });

  const reactionMutation = useMutation({
    mutationFn: async (data: { id: string; emoji: string }) =>
      (await api.post<ChatMessageItem>(`/chats/messages/${data.id}/reactions`, { emoji: data.emoji })).data,
    onSuccess: applyServerMessage,
    onError: () => showAlert("Erro", "Não foi possível reagir."),
  });

  const updateThemeMutation = useMutation({
    mutationFn: (color: string) => api.patch(`/chats/${chatId}/my-background`, { theme: color }),
    onSuccess: () => {
      showAlert("Sucesso", "Sua cor de fundo foi atualizada!");
      setThemeModalVisible(false);
      refetchChatDetails();
    },
  });

  const updateNameColorMutation = useMutation({
    mutationFn: (color: string) => api.patch(`/chats/${chatId}/my-color`, { color }),
    onSuccess: () => {
      showAlert("Sucesso", "Cor do seu nome atualizada!");
      setThemeModalVisible(false);
      refetchChatDetails();
    },
  });

  const promoteToAdminMutation = useMutation({
    mutationFn: (targetUserId: string) => api.patch(`/chats/${chatId}/members/${targetUserId}/promote`),
    onSuccess: () => {
      showAlert("Sucesso", "Membro promovido a admin!");
      refetchChatDetails();
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => api.delete(`/chats/${chatId}/members/${memberId}`),
    onSuccess: () => refetchChatDetails(),
  });

  const addMembersMutation = useMutation({
    mutationFn: (memberIds: string[]) => api.post(`/chats/${chatId}/members`, { memberIds }),
    onSuccess: () => {
      showAlert("Sucesso", "Adicionados!");
      setAddMemberModal(false);
      setSelectedFriends([]);
      refetchChatDetails();
    },
  });

  const leaveChatMutation = useMutation({
    mutationFn: () => api.post(`/chats/${chatId}/leave`),
    onSuccess: () => {
      setGroupInfoModal(false);
      navigation.goBack();
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: async () => {
      let finalImageUrl = chatDetails?.imageUrl;
      if (editImage && editImage !== chatDetails?.imageUrl) finalImageUrl = (await uploadImageAsync(editImage, "/uploads/avatar")) || finalImageUrl;
      return api.patch(`/chats/${chatId}`, { name: editName, description: editDesc, imageUrl: finalImageUrl });
    },
    onSuccess: () => {
      setIsEditingGroup(false);
      refetchChatDetails();
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });

  const handleSend = () => {
    const content = messageText.trim();
    if (!content) return;
    if (editingMessage) return editMessageMutation.mutate({ id: editingMessage.id, content });
    sendMessage({ chatId, content, replyTo: toReplyPreview(replyingTo) });
    setMessageText("");
    setReplyingTo(null);
    stopTyping();
  };

  const handleSendImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6 });
    if (res.canceled) return;
    sendMessage({ chatId, content: messageText.trim(), imageUri: res.assets[0].uri, replyTo: toReplyPreview(replyingTo) });
    setMessageText("");
    setReplyingTo(null);
    stopTyping();
  };

  const openReactionPicker = (message: ChatMessageItem) => {
    showAlert("Reagir", undefined, [
      ...REACTION_EMOJIS.map((emoji) => ({ text: emoji, onPress: () => reactionMutation.mutate({ id: message.id, emoji }) })),
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const [messageToReport, setMessageToReport] = useState<ChatMessageItem | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportImage, setReportImage] = useState<string | null>(null);

  const closeReport = () => {
    setMessageToReport(null);
    setReportReason("");
    setReportImage(null);
  };

  const reportMessageMutation = useMutation({
    mutationFn: async (message: ChatMessageItem) =>
      api.post("/reports", {
        chatMessageId: message.id,
        reportedUserId: message.userId,
        reason: reportReason.trim(),
        imageUrl: await resolveImageForUpload(reportImage),
      }),
    onSuccess: () => {
      closeReport();
      showAlert("Sucesso", "A denúncia foi enviada para análise.");
    },
    onError: () => showAlert("Erro", "Não foi possível enviar a denúncia."),
  });

  const handleMessageLongPress = (message: ChatMessageItem) => {
    if (message.status === "failed") {
      return showAlert("Mensagem não enviada", undefined, [
        { text: "Tentar de novo", onPress: () => retryMessage(message) },
        { text: "Descartar", style: "destructive", onPress: () => discardMessage(message) },
        { text: "Cancelar", style: "cancel" },
      ]);
    }
    if (message.status || message.isDeleted) return;
    const buttons: AlertButton[] = [
      {
        text: "Responder",
        onPress: () => {
          setEditingMessage(null);
          setReplyingTo(message);
        },
      },
      { text: "Reagir", onPress: () => openReactionPicker(message) },
    ];
    if (message.userId === user?.id) {
      buttons.push(
        {
          text: "Editar",
          onPress: () => {
            setReplyingTo(null);
            setEditingMessage(message);
            setMessageText(message.content);
          },
        },
        { text: "Apagar", style: "destructive", onPress: () => deleteMessageMutation.mutate(message.id) },
      );
    } else {
      buttons.push({ text: "Denunciar", style: "destructive", onPress: () => setMessageToReport(message) });
    }
    buttons.push({ text: "Cancelar", style: "cancel" });
    showAlert("Opções da Mensagem", undefined, buttons);
  };

  const confirmRemoveMember = (memberId: string, memberName: string) => {
    showAlert("Confirmação", `Remover ${memberName} do grupo?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: () => removeMemberMutation.mutate(memberId) },
    ]);
  };

  const confirmPromoteAdmin = (memberId: string, memberName: string) => {
    showAlert("Promover", `Tornar ${memberName} administrador?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Promover", onPress: () => promoteToAdminMutation.mutate(memberId) },
    ]);
  };

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.5 });
    if (!res.canceled) setEditImage(res.assets[0].uri);
  };

  const friendsNotInGroup = friendsData?.data?.filter((friend) => !chatDetails?.members?.some((member) => member.userId === friend.id)) || [];
  const myName = user?.nickname || user?.name || "Seu nome";

  return (
    <View style={{ flex: 1, backgroundColor: activeBgColor ?? colors.bg }}>
      <DottedBackground color={activeBgColor ?? colors.bg} dotColor={activeBgColor ? headerForeground : colors.muted} />

      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 14, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <BackButton onPress={() => navigation.goBack()} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${displayName || "Conversa"}, ${headerSubtitle}`}
          onPress={handleHeaderPress}
          style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}
        >
          <Avatar id={displayTargetId ?? chatId} name={displayName || "Conversa"} uri={displayAvatar} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <MipoText variant="cardTitle" numberOfLines={1} style={{ color: headerForeground }}>
              {displayName || "Conversa"}
            </MipoText>
            <MipoText variant="micro" numberOfLines={1} style={{ color: headerForeground, opacity: 0.75 }}>
              {headerSubtitle}
            </MipoText>
          </View>
        </Pressable>
        <IconButton icon={Palette} accessibilityLabel="Personalizar chat" onPress={handleOpenThemeModal} />
      </View>

      {showOfflineBanner ? (
        <View
          accessibilityLiveRegion="polite"
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 6, backgroundColor: colors.surface2 }}
        >
          <WifiOff size={14} color={colors.muted} />
          <MipoText variant="micro" color="muted">
            Sem conexão. Reconectando…
          </MipoText>
        </View>
      ) : null}

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <FlatList
          inverted
          data={allMessages}
          keyExtractor={(item) => item.clientId ?? item.id}
          contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 10 }}
          renderItem={({ item, index }) => {
            const bubble = (
              <MessageBubble
                message={item}
                isOwn={item.userId === user?.id}
                currentUserId={user?.id}
                onLongPress={handleMessageLongPress}
                onRetry={retryMessage}
                onToggleReaction={(message, emoji) => reactionMutation.mutate({ id: message.id, emoji })}
              />
            );
            return index === 0 ? <StaggerIn index={0}>{bubble}</StaggerIn> : bubble;
          }}
          onEndReached={() => {
            if (hasNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={colors.pink} style={{ margin: 20 }} /> : undefined}
        />

        {replyingTo ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.surface2 }}>
            <View style={{ flex: 1, minWidth: 0, borderLeftWidth: 3, borderLeftColor: colors.pink, paddingLeft: 8 }}>
              <MipoText variant="micro" color="pink">
                Respondendo {displayLabel(replyingTo.user)}
              </MipoText>
              <MipoText variant="caption" numberOfLines={1}>
                {replyingTo.content || "📷 Imagem"}
              </MipoText>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Cancelar resposta" hitSlop={10} onPress={() => setReplyingTo(null)}>
              <X size={18} color={colors.pink} />
            </Pressable>
          </View>
        ) : null}

        {editingMessage ? (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.surface2 }}>
            <MipoText variant="micro" color="pink">
              Editando mensagem...
            </MipoText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancelar edição"
              hitSlop={10}
              onPress={() => {
                setEditingMessage(null);
                setMessageText("");
              }}
            >
              <X size={18} color={colors.pink} />
            </Pressable>
          </View>
        ) : null}

        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 14, paddingTop: 8, paddingBottom: insets.bottom + 10 }}>
          {editingMessage ? null : <IconButton icon={ImageIcon} size={44} accessibilityLabel="Enviar imagem" onPress={handleSendImage} />}
          <Input
            placeholder={editingMessage ? "Edite sua mensagem..." : "Mensagem"}
            value={messageText}
            onChangeText={handleChangeText}
            multiline
            containerStyle={{ flex: 1, maxHeight: 120 }}
          />
          <IconButton icon={editingMessage ? Check : Send} tone="yellow" size={44} accessibilityLabel={editingMessage ? "Salvar mensagem" : "Enviar"} onPress={handleSend} />
        </View>
      </KeyboardAvoidingView>

      <ChatThemeSheet
        visible={themeModalVisible}
        isPrivate={isPrivate}
        tab={activeThemeTab}
        wheelColor={wheelColor}
        previewNameColor={previewNameColor}
        myName={myName}
        defaultNameColor={colorForName(myName)}
        savingBackground={updateThemeMutation.isPending}
        savingName={updateNameColorMutation.isPending}
        onTabChange={setActiveThemeTab}
        onWheelChange={setWheelColor}
        onPreviewNameColor={setPreviewNameColor}
        onSaveBackground={(color) => updateThemeMutation.mutate(color)}
        onSaveNameColor={(color) => updateNameColorMutation.mutate(color)}
        onClose={() => setThemeModalVisible(false)}
      />

      <GroupInfoModal
        visible={groupInfoModal}
        details={chatDetails}
        fallbackName={name}
        currentUserId={user?.id}
        isAdmin={amIAdmin}
        isEditing={isEditingGroup}
        editName={editName}
        editDesc={editDesc}
        editImage={editImage}
        saving={updateGroupMutation.isPending}
        onStartEdit={() => setIsEditingGroup(true)}
        onSave={() => updateGroupMutation.mutate()}
        onChangeName={setEditName}
        onChangeDesc={setEditDesc}
        onPickImage={pickImage}
        onAddMembers={() => {
          setGroupInfoModal(false);
          setTimeout(() => setAddMemberModal(true), 400);
        }}
        onPromote={confirmPromoteAdmin}
        onRemove={confirmRemoveMember}
        onLeave={() => leaveChatMutation.mutate()}
        onClose={() => {
          setGroupInfoModal(false);
          setIsEditingGroup(false);
        }}
      />

      <AddMembersSheet
        visible={addMemberModal}
        friends={friendsNotInGroup}
        selected={selectedFriends}
        saving={addMembersMutation.isPending}
        onToggle={(friendId) =>
          setSelectedFriends((prev) => (prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]))
        }
        onSubmit={() => addMembersMutation.mutate(selectedFriends)}
        onClose={() => setAddMemberModal(false)}
      />

      <ReportSheet
        visible={!!messageToReport}
        title="Denunciar mensagem"
        reason={reportReason}
        image={reportImage}
        sending={reportMessageMutation.isPending}
        onChangeReason={setReportReason}
        onPickImage={async () => {
          const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.5 });
          if (!res.canceled) setReportImage(res.assets[0].uri);
        }}
        onSubmit={() => {
          if (!reportReason.trim()) return showAlert("Atenção", "Preencha o motivo da denúncia.");
          if (messageToReport) reportMessageMutation.mutate(messageToReport);
        }}
        onClose={closeReport}
      />

      <EventoInfoSheet
        evento={eventData}
        visible={eventModalVisible}
        onOpenProfile={(userId) => {
          setEventModalVisible(false);
          navigation.navigate("PlayerProfile", { userId });
        }}
        onClose={() => setEventModalVisible(false)}
      />
    </View>
  );
}
