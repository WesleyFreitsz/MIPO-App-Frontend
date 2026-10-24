import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { Check, Palette, Send, X } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useWebSocketChat } from "../hooks/useWebSocketChat";
import { Avatar, BackButton, IconButton, Input, MipoText } from "../components/ui";
import { StaggerIn } from "../motion/StaggerIn";
import { useTheme } from "../theme/ThemeProvider";
import { EventoDetail } from "../types";
import { AddMembersSheet } from "./chat/AddMembersSheet";
import { ChatThemeSheet, ChatThemeTab } from "./chat/ChatThemeSheet";
import { ChatDetails, ChatMessageItem, ChatUser, colorForName, readableOn } from "./chat/chatTypes";
import { DottedBackground } from "./chat/DottedBackground";
import { EventoInfoSheet } from "./chat/EventoInfoSheet";
import { GroupInfoModal } from "./chat/GroupInfoModal";
import { MessageBubble } from "./chat/MessageBubble";

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

interface MessagesPage {
  data: ChatMessageItem[];
  hasMore: boolean;
  skip: number | string;
  take: number | string;
}

async function uploadImageAsync(uri: string): Promise<string | null> {
  try {
    const formData = new FormData();
    const filename = uri.split("/").pop() || `photo-${Date.now()}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    formData.append("file", { uri, name: filename, type: match ? `image/${match[1]}` : "image/jpeg" } as unknown as Blob);
    const res = await api.post("/uploads/avatar", formData, { headers: { "Content-Type": "multipart/form-data" } });
    return res.data.url;
  } catch {
    return null;
  }
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

  const { joinChat, leaveChat, sendMessage, messages, isConnected } = useWebSocketChat();

  useEffect(() => {
    if (chatId) {
      api
        .post(`/chats/${chatId}/mark-as-read`)
        .then(() => queryClient.invalidateQueries({ queryKey: ["chats"] }))
        .catch(() => {});
    }
  }, [chatId, queryClient]);

  const { data: messagesData, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["chat", chatId, "messages"],
    queryFn: async ({ pageParam = 0 }): Promise<MessagesPage> =>
      (await api.get(`/chats/${chatId}/messages`, { params: { skip: pageParam, take: 15 } })).data,
    initialPageParam: 0,
    getNextPageParam: (lastPage: MessagesPage) => (lastPage.hasMore ? Number(lastPage.skip) + Number(lastPage.take) : undefined),
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

  const allMessages: ChatMessageItem[] = [
    ...(messages.filter((m) => m.chatId === chatId) as ChatMessageItem[]),
    ...(messagesData?.pages.flatMap((page) => page.data) || []),
  ]
    .filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  useEffect(() => {
    if (isConnected && chatId) joinChat(chatId);
    return () => {
      if (chatId) leaveChat(chatId);
    };
  }, [chatId, isConnected]);

  const isPrivate = type === "PRIVATE" || chatDetails?.type === "PRIVATE";
  const otherMember = chatDetails?.members?.find((m) => m.userId !== user?.id)?.user;
  const displayAvatar = isPrivate ? otherMember?.avatarUrl || avatar : chatDetails?.imageUrl || avatar;
  const displayName = isPrivate ? otherMember?.nickname || otherMember?.name || name : chatDetails?.name || name;
  const displayTargetId = isPrivate ? otherMember?.id || targetId : targetId;
  const amIAdmin = Boolean(chatDetails?.members?.some((m) => m.userId === user?.id && m.role === "ADMIN"));
  const myMemberData = chatDetails?.members?.find((m) => m.userId === user?.id);

  const personalBgColor = myMemberData?.backgroundTheme || null;
  const activeBgColor = themeModalVisible ? wheelColor : personalBgColor;
  const headerForeground = activeBgColor ? readableOn(activeBgColor) : colors.text;
  const headerSubtitle = type === "GROUP" ? "Toque para dados do grupo" : type === "EVENT" ? "Toque para detalhes do evento" : "Ver perfil";

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
          } else Alert.alert("Aviso", "Evento não encontrado.");
        })
        .catch(() => Alert.alert("Erro", "Não foi possível carregar o evento."));
    } else if (type === "GROUP") {
      setEditName(chatDetails?.name || name);
      setEditDesc(chatDetails?.description || "");
      setGroupInfoModal(true);
    }
  };

  const editMessageMutation = useMutation({
    mutationFn: (data: { id: string; content: string }) => api.patch(`/chats/messages/${data.id}`, { content: data.content }),
    onSuccess: () => {
      setEditingMessage(null);
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["chat", chatId, "messages"] });
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/chats/messages/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chat", chatId, "messages"] }),
  });

  const updateThemeMutation = useMutation({
    mutationFn: (color: string) => api.patch(`/chats/${chatId}/my-background`, { theme: color }),
    onSuccess: () => {
      Alert.alert("Sucesso", "Sua cor de fundo foi atualizada!");
      setThemeModalVisible(false);
      refetchChatDetails();
    },
  });

  const updateNameColorMutation = useMutation({
    mutationFn: (color: string) => api.patch(`/chats/${chatId}/my-color`, { color }),
    onSuccess: () => {
      Alert.alert("Sucesso", "Cor do seu nome atualizada!");
      setThemeModalVisible(false);
      refetchChatDetails();
    },
  });

  const promoteToAdminMutation = useMutation({
    mutationFn: (targetUserId: string) => api.patch(`/chats/${chatId}/members/${targetUserId}/promote`),
    onSuccess: () => {
      Alert.alert("Sucesso", "Membro promovido a admin!");
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
      Alert.alert("Sucesso", "Adicionados!");
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
      if (editImage && editImage !== chatDetails?.imageUrl) finalImageUrl = (await uploadImageAsync(editImage)) || finalImageUrl;
      return api.patch(`/chats/${chatId}`, { name: editName, description: editDesc, imageUrl: finalImageUrl });
    },
    onSuccess: () => {
      setIsEditingGroup(false);
      refetchChatDetails();
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });

  const handleSend = () => {
    if (!messageText.trim() || !chatId) return;
    if (editingMessage) editMessageMutation.mutate({ id: editingMessage.id, content: messageText.trim() });
    else {
      sendMessage(chatId, messageText.trim());
      setMessageText("");
    }
  };

  const handleMessageLongPress = (message: ChatMessageItem) => {
    if (message.userId !== user?.id || message.isDeleted) return;
    Alert.alert("Opções da Mensagem", "O que deseja fazer?", [
      {
        text: "Editar",
        onPress: () => {
          setEditingMessage(message);
          setMessageText(message.content);
        },
      },
      { text: "Apagar", style: "destructive", onPress: () => deleteMessageMutation.mutate(message.id) },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const confirmRemoveMember = (memberId: string, memberName: string) => {
    Alert.alert("Confirmação", `Remover ${memberName} do grupo?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: () => removeMemberMutation.mutate(memberId) },
    ]);
  };

  const confirmPromoteAdmin = (memberId: string, memberName: string) => {
    Alert.alert("Promover", `Tornar ${memberName} administrador?`, [
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

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <FlatList
          inverted
          data={allMessages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 10 }}
          renderItem={({ item, index }) =>
            index === 0 ? (
              <StaggerIn index={0}>
                <MessageBubble message={item} isOwn={item.userId === user?.id} onLongPress={handleMessageLongPress} />
              </StaggerIn>
            ) : (
              <MessageBubble message={item} isOwn={item.userId === user?.id} onLongPress={handleMessageLongPress} />
            )
          }
          onEndReached={() => {
            if (hasNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={colors.pink} style={{ margin: 20 }} /> : null}
        />

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
          <Input
            placeholder={editingMessage ? "Edite sua mensagem..." : "Mensagem"}
            value={messageText}
            onChangeText={setMessageText}
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
