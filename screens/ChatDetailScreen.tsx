import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  useColorScheme,
  Image,
  Modal,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import {
  Send,
  X,
  UserPlus,
  LogOut,
  Check,
  Calendar,
  MapPin,
  CheckCircle,
  Trash2,
  Edit2,
  Camera,
  CheckCheck,
  Palette,
  Shield,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  useQuery,
} from "@tanstack/react-query";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useWebSocketChat } from "../hooks/useWebSocketChat";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ColorPicker from "react-native-wheel-color-picker";

const WA_BG_LIGHT =
  "https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png";
const WA_BG_DARK =
  "https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png";

const PRETTY_COLORS = [
  "#FF5733",
  "#33A1FF",
  "#9B59B6",
  "#2ECC71",
  "#E67E22",
  "#E74C3C",
  "#1ABC9C",
  "#F1C40F",
  "#34495E",
  "#FF1493",
  "#00CED1",
  "#FF8C00",
];

const getColorForName = (name: string) => {
  if (!name) return PRETTY_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PRETTY_COLORS.length;
  return PRETTY_COLORS[index];
};

// --- FUNÇÃO DE CONTRASTE AUTOMÁTICO ---
const getContrastColor = (hexColor: string) => {
  if (!hexColor) return "#000000";
  let hex = hexColor.replace("#", "");
  if (hex.length === 3)
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");

  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;

  // Fórmula de luminância (YIQ)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;

  // Se for claro, retorna Preto. Se for escuro, retorna Branco.
  return yiq >= 128 ? "#000000" : "#ffffff";
};

const MessageBubble = ({ message, isOwn, theme, onLongPress }: any) => {
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const senderNameColor =
    message.member?.customColor ||
    getColorForName(message.user?.nickname || message.user?.name);
  const bubbleBgColor = isOwn ? theme.bubbleOwn : theme.bubbleOther;

  return (
    <View
      style={[
        styles.bubbleWrapper,
        isOwn ? styles.wrapperOwn : styles.wrapperOther,
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onLongPress={() => onLongPress(message)}
        style={[styles.bubble, { backgroundColor: bubbleBgColor }]}
      >
        {!isOwn && (
          <Text style={[styles.senderName, { color: senderNameColor }]}>
            {message.user?.nickname || message.user?.name}
          </Text>
        )}

        {message.isDeleted ? (
          <Text
            style={[
              styles.msgText,
              {
                color: isOwn ? theme.textMutedOwn : theme.textMutedOther,
                fontStyle: "italic",
              },
            ]}
          >
            🚫 Esta mensagem foi apagada.
          </Text>
        ) : (
          <Text
            style={[
              styles.msgText,
              { color: isOwn ? theme.textOwn : theme.textOther },
            ]}
          >
            {message.content}
          </Text>
        )}

        <View style={styles.msgFooter}>
          {message.isEdited && !message.isDeleted && (
            <Text
              style={[
                styles.msgTime,
                {
                  color: isOwn ? theme.textMutedOwn : theme.textMutedOther,
                  marginRight: 5,
                  fontStyle: "italic",
                },
              ]}
            >
              (editado)
            </Text>
          )}
          <Text
            style={[
              styles.msgTime,
              { color: isOwn ? theme.textMutedOwn : theme.textMutedOther },
            ]}
          >
            {time}
          </Text>
          {isOwn && (
            <CheckCheck
              size={14}
              color={message.isRead ? "#34B7F1" : theme.textMutedOwn}
              style={{ marginLeft: 4 }}
            />
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default function ChatDetailScreen({ route, navigation }: any) {
  const { chatId, name, type, avatar, targetId } = route.params;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState("");
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const insets = useSafeAreaInsets();

  const [groupInfoModal, setGroupInfoModal] = useState(false);
  const [addMemberModal, setAddMemberModal] = useState(false);
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);

  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editImage, setEditImage] = useState<string | null>(null);
  const [eventData, setEventData] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState<any>(null);

  const [activeThemeTab, setActiveThemeTab] = useState<"BUBBLE" | "NAME">(
    "BUBBLE",
  );

  const [wheelColor, setWheelColor] = useState<string>("#ffffff");
  const [previewNameColor, setPreviewNameColor] = useState<string>("");

  const theme = {
    bg: isDark ? "#0b141a" : "#faf6f1",
    primary: isDark ? "#40da61" : "#40da61", // Botão e Destaques em verde
    bubbleOwn: isDark ? "#202c33" : "#ffffff",
    bubbleOther: isDark ? "#202c33" : "#ffffff",
    textOwn: isDark ? "#e9edef" : "#111b21",
    textOther: isDark ? "#e9edef" : "#111b21",
    textMutedOwn: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.45)",
    textMutedOther: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.45)",
    senderColor: isDark ? "#ef4444" : "#c73636",
    inputBg: isDark ? "#202c33" : "#ffffff",
  };

  const { joinChat, leaveChat, sendMessage, messages, isConnected } =
    useWebSocketChat();

  useEffect(() => {
    if (chatId) {
      api
        .post(`/chats/${chatId}/mark-as-read`)
        .then(() => queryClient.invalidateQueries({ queryKey: ["chats"] }))
        .catch(() => {});
    }
  }, [chatId, queryClient]);

  const {
    data: messagesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["chat", chatId, "messages"],
    queryFn: async ({ pageParam = 0 }) =>
      (
        await api.get(`/chats/${chatId}/messages`, {
          params: { skip: pageParam, take: 15 },
        })
      ).data,
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.skip + lastPage.take : undefined,
  });

  const { data: chatDetails, refetch: refetchChatDetails } = useQuery({
    queryKey: ["chatDetails", chatId],
    queryFn: async () => (await api.get(`/chats/${chatId}`)).data,
    enabled: !!chatId,
  });

  const { data: friendsData } = useQuery({
    queryKey: ["friends", "list"],
    queryFn: async () =>
      (await api.get("/friends", { params: { skip: 0, take: 100 } })).data,
    enabled: addMemberModal,
  });

  const allMessages = [
    ...messages.filter((m) => m.chatId === chatId),
    ...(messagesData?.pages.flatMap((p) => p.data) || []),
  ]
    .filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  useEffect(() => {
    if (isConnected && chatId) joinChat(chatId);
    return () => {
      if (chatId) leaveChat(chatId);
    };
  }, [chatId, isConnected]);

  const isPrivate = type === "PRIVATE" || chatDetails?.type === "PRIVATE";
  const otherMember = chatDetails?.members?.find(
    (m: any) => m.userId !== user?.id,
  )?.user;
  const displayAvatar = isPrivate
    ? otherMember?.avatarUrl || avatar
    : chatDetails?.imageUrl || avatar;
  const displayName = isPrivate
    ? otherMember?.nickname || otherMember?.name || name
    : chatDetails?.name || name;
  const displayTargetId = isPrivate ? otherMember?.id || targetId : targetId;
  const amIAdmin = chatDetails?.members?.some(
    (m: any) => m.userId === user?.id && m.role === "ADMIN",
  );

  const myMemberData = chatDetails?.members?.find(
    (m: any) => m.userId === user?.id,
  );

  const personalBgColor = myMemberData?.backgroundTheme || theme.bg;
  const activeBgColor = themeModalVisible ? wheelColor : personalBgColor;

  // Calcula dinamicamente se o Header fica branco ou preto com base no fundo atual
  const contrastColor = getContrastColor(activeBgColor);

  const handleOpenThemeModal = () => {
    setWheelColor(myMemberData?.backgroundTheme || theme.bg);
    setPreviewNameColor(myMemberData?.customColor || "");
    setThemeModalVisible(true);
  };

  React.useLayoutEffect(() => {
    let headerSubtitle =
      type === "GROUP"
        ? "Toque para dados do grupo"
        : type === "EVENT"
          ? "Toque para detalhes do evento"
          : "Ver perfil";

    navigation.setOptions({
      headerTitle: () => (
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center" }}
          onPress={() => {
            if (isPrivate && displayTargetId)
              navigation.navigate("PlayerProfile", { userId: displayTargetId });
            else if (type === "EVENT" && chatId) {
              api
                .get("/events")
                .then((res) => {
                  const eventoEncontrado = res.data.find(
                    (e: any) => e.chatId === chatId,
                  );
                  if (eventoEncontrado) {
                    setEventData(eventoEncontrado);
                    setEventModalVisible(true);
                  } else Alert.alert("Aviso", "Evento não encontrado.");
                })
                .catch(() =>
                  Alert.alert("Erro", "Não foi possível carregar o evento."),
                );
            } else if (type === "GROUP") setGroupInfoModal(true);
          }}
        >
          <Image
            source={{
              uri:
                displayAvatar ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${displayName}`,
            }}
            style={styles.headerAvatar}
          />
          <View>
            <Text
              style={[styles.headerName, { color: contrastColor }]}
              numberOfLines={1}
            >
              {displayName || "Conversa"}
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                { color: contrastColor, opacity: 0.8 },
              ]}
            >
              {headerSubtitle}
            </Text>
          </View>
        </TouchableOpacity>
      ),
      headerStyle: { backgroundColor: activeBgColor },
      headerTintColor: contrastColor, // Cor da Seta de Voltar
      title: "",
      headerRight: () => (
        <TouchableOpacity
          style={{ marginRight: 15 }}
          onPress={handleOpenThemeModal}
        >
          <Palette color={contrastColor} size={24} />
        </TouchableOpacity>
      ),
    });
  }, [
    navigation,
    displayName,
    displayAvatar,
    type,
    displayTargetId,
    chatDetails,
    myMemberData,
    contrastColor,
    activeBgColor,
  ]);

  const editMessageMutation = useMutation({
    mutationFn: (data: { id: string; content: string }) =>
      api.patch(`/chats/messages/${data.id}`, { content: data.content }),
    onSuccess: () => {
      setEditingMessage(null);
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["chat", chatId, "messages"] });
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/chats/messages/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["chat", chatId, "messages"] }),
  });

  const updateThemeMutation = useMutation({
    mutationFn: (color: string) =>
      api.patch(`/chats/${chatId}/my-background`, { theme: color }),
    onSuccess: () => {
      Alert.alert("Sucesso", "Sua cor de fundo foi atualizada!");
      setThemeModalVisible(false);
      refetchChatDetails();
    },
  });

  const updateNameColorMutation = useMutation({
    mutationFn: (color: string) =>
      api.patch(`/chats/${chatId}/my-color`, { color }),
    onSuccess: () => {
      Alert.alert("Sucesso", "Cor do seu nome atualizada!");
      setThemeModalVisible(false);
      refetchChatDetails();
    },
  });

  const promoteToAdminMutation = useMutation({
    mutationFn: (targetUserId: string) =>
      api.patch(`/chats/${chatId}/members/${targetUserId}/promote`),
    onSuccess: () => {
      Alert.alert("Sucesso", "Membro promovido a admin!");
      refetchChatDetails();
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) =>
      api.delete(`/chats/${chatId}/members/${memberId}`),
    onSuccess: () => refetchChatDetails(),
  });

  const addMembersMutation = useMutation({
    mutationFn: (memberIds: string[]) =>
      api.post(`/chats/${chatId}/members`, { memberIds }),
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
      if (editImage && editImage !== chatDetails?.imageUrl)
        finalImageUrl = (await uploadImageAsync(editImage)) || finalImageUrl;
      return api.patch(`/chats/${chatId}`, {
        name: editName,
        description: editDesc,
        imageUrl: finalImageUrl,
      });
    },
    onSuccess: () => {
      setIsEditingGroup(false);
      refetchChatDetails();
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });

  const handleSend = () => {
    if (!messageText.trim() || !chatId) return;
    if (editingMessage)
      editMessageMutation.mutate({
        id: editingMessage.id,
        content: messageText.trim(),
      });
    else {
      sendMessage(chatId, messageText.trim());
      setMessageText("");
    }
  };

  const handleMessageLongPress = (message: any) => {
    if (message.userId !== user?.id || message.isDeleted) return;
    Alert.alert("Opções da Mensagem", "O que deseja fazer?", [
      {
        text: "Editar",
        onPress: () => {
          setEditingMessage(message);
          setMessageText(message.content);
        },
      },
      {
        text: "Apagar",
        style: "destructive",
        onPress: () => deleteMessageMutation.mutate(message.id),
      },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const confirmRemoveMember = (memberId: string, memberName: string) => {
    Alert.alert("Confirmação", `Remover ${memberName} do grupo?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: () => removeMemberMutation.mutate(memberId),
      },
    ]);
  };

  const confirmPromoteAdmin = (memberId: string, memberName: string) => {
    Alert.alert("Promover", `Tornar ${memberName} administrador?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Promover",
        onPress: () => promoteToAdminMutation.mutate(memberId),
      },
    ]);
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
      const res = await api.post("/uploads/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data.url;
    } catch {
      return null;
    }
  };

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!res.canceled) setEditImage(res.assets[0].uri);
  };

  const friendsNotInGroup =
    friendsData?.data?.filter(
      (friend: any) =>
        !chatDetails?.members?.some(
          (member: any) => member.userId === friend.id,
        ),
    ) || [];
  const getTime = (dateIso: string) =>
    new Date(dateIso).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: activeBgColor,
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 80}
      >
        <ImageBackground
          source={{ uri: isDark ? WA_BG_DARK : WA_BG_LIGHT }}
          style={[styles.bgImage, { backgroundColor: activeBgColor }]}
          imageStyle={{ opacity: isDark ? 0.2 : 0.6 }}
        >
          <FlatList
            inverted
            data={allMessages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <MessageBubble
                message={item}
                isOwn={item.userId === user?.id}
                theme={theme}
                onLongPress={handleMessageLongPress}
              />
            )}
            onEndReached={() => {
              if (hasNextPage) fetchNextPage();
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              isFetchingNextPage ? (
                <ActivityIndicator style={{ margin: 20 }} />
              ) : null
            }
          />
        </ImageBackground>

        {editingMessage && (
          <View style={styles.editingBanner}>
            <Text style={styles.editingText}>Editando mensagem...</Text>
            <TouchableOpacity
              onPress={() => {
                setEditingMessage(null);
                setMessageText("");
              }}
            >
              <X size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}

        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: activeBgColor,
              paddingBottom: Platform.OS === "ios" ? insets.bottom + 8 : 15,
            },
          ]}
        >
          <View
            style={[
              styles.textInputWrapper,
              { backgroundColor: theme.inputBg },
            ]}
          >
            <TextInput
              style={[styles.input, { color: theme.textOther }]}
              placeholder={
                editingMessage ? "Edite sua mensagem..." : "Mensagem"
              }
              placeholderTextColor={theme.textMutedOther}
              value={messageText}
              onChangeText={setMessageText}
              multiline
            />
          </View>
          <TouchableOpacity
            style={[styles.sendCircle, { backgroundColor: theme.primary }]}
            onPress={handleSend}
          >
            {editingMessage ? (
              <Check color="#000" size={20} />
            ) : (
              <Send color="#000" size={25} style={{ marginRight: 2 }} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* --- MODAL DE TEMAS / CORES COM PREVIEW --- */}
      <Modal visible={themeModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.eventModalContent}>
            <View style={styles.eventModalHeader}>
              <Text
                style={{ fontSize: 18, fontWeight: "bold", color: "#1e293b" }}
              >
                Personalizar Chat
              </Text>
              <TouchableOpacity onPress={() => setThemeModalVisible(false)}>
                <X color="#64748b" size={24} />
              </TouchableOpacity>
            </View>

            {/* Abas de Navegação */}
            {!isPrivate && (
              <View style={styles.tabsContainer}>
                <TouchableOpacity
                  style={[
                    styles.tab,
                    activeThemeTab === "BUBBLE" && styles.activeTab,
                  ]}
                  onPress={() => setActiveThemeTab("BUBBLE")}
                >
                  <Text
                    style={[
                      styles.tabText,
                      activeThemeTab === "BUBBLE" && styles.activeTabText,
                    ]}
                  >
                    Fundo
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.tab,
                    activeThemeTab === "NAME" && styles.activeTab,
                  ]}
                  onPress={() => setActiveThemeTab("NAME")}
                >
                  <Text
                    style={[
                      styles.tabText,
                      activeThemeTab === "NAME" && styles.activeTabText,
                    ]}
                  >
                    Cor do Nome
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <ScrollView contentContainerStyle={{ padding: 20 }}>
              {/* ABA DE FUNDO */}
              {activeThemeTab === "BUBBLE" ? (
                <View style={{ alignItems: "center" }}>
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#64748b",
                      marginBottom: 20,
                      textAlign: "center",
                    }}
                  >
                    Mova a roda para ver o resultado em tempo real no fundo.
                  </Text>
                  <View
                    style={{ width: "100%", height: 300, marginBottom: 25 }}
                  >
                    <ColorPicker
                      color={wheelColor}
                      /* FIX do Infinite Loop: onColorChangeComplete ao invés de onColorChange */
                      onColorChangeComplete={(color) => setWheelColor(color)}
                      thumbSize={30}
                      sliderSize={30}
                      noSnap={true}
                      row={false}
                    />
                  </View>
                  <View
                    style={{ flexDirection: "row", gap: 15, width: "100%" }}
                  >
                    <TouchableOpacity
                      style={{
                        backgroundColor: "#e2e8f0",
                        padding: 12,
                        borderRadius: 8,
                        flex: 1,
                        alignItems: "center",
                      }}
                      onPress={() => updateThemeMutation.mutate("")}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          color: "#64748b",
                          fontWeight: "bold",
                        }}
                      >
                        Remover Fundo
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        backgroundColor: "#c73636", // Cor de salvar
                        padding: 12,
                        borderRadius: 8,
                        flex: 1,
                        alignItems: "center",
                      }}
                      onPress={() => updateThemeMutation.mutate(wheelColor)}
                    >
                      {updateThemeMutation.isPending ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text
                          style={{
                            fontSize: 14,
                            color: "#fff",
                            fontWeight: "bold",
                          }}
                        >
                          Salvar Cor
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* ABA DE NOME COM BALÃO DE TESTE (PREVIEW) */
                <View>
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#64748b",
                      marginBottom: 15,
                      textAlign: "center",
                    }}
                  >
                    Como os outros verão seu nome:
                  </Text>

                  {/* Balão de Teste */}
                  <View
                    style={{
                      backgroundColor: theme.bubbleOther,
                      padding: 10,
                      borderRadius: 12,
                      elevation: 1,
                      alignSelf: "center",
                      marginBottom: 25,
                      maxWidth: "80%",
                    }}
                  >
                    <Text
                      style={{
                        color:
                          previewNameColor ||
                          getColorForName(
                            user?.nickname || user?.name || "Visitante",
                          ),
                        fontWeight: "bold",
                        marginBottom: 5,
                      }}
                    >
                      {user?.nickname || user?.name || "Seu Nome"}
                    </Text>
                    <Text style={{ color: theme.textOther }}>
                      Essa é uma mensagem de teste do seu nome.
                    </Text>
                  </View>

                  <View style={styles.colorsGrid}>
                    {PRETTY_COLORS.map((color) => (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorOption,
                          { backgroundColor: color },
                          previewNameColor === color && {
                            borderWidth: 3,
                            borderColor: "#c73636",
                          }, // Destaca o selecionado
                        ]}
                        onPress={() => setPreviewNameColor(color)}
                      />
                    ))}
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      gap: 15,
                      width: "100%",
                      marginTop: 30,
                    }}
                  >
                    <TouchableOpacity
                      style={{
                        backgroundColor: "#e2e8f0",
                        padding: 12,
                        borderRadius: 8,
                        flex: 1,
                        alignItems: "center",
                      }}
                      onPress={() => {
                        setPreviewNameColor("");
                        updateNameColorMutation.mutate("");
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          color: "#64748b",
                          fontWeight: "bold",
                        }}
                      >
                        Cor Padrão
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        backgroundColor: "#c73636", // Botão de Salvar
                        padding: 12,
                        borderRadius: 8,
                        flex: 1,
                        alignItems: "center",
                      }}
                      onPress={() =>
                        updateNameColorMutation.mutate(previewNameColor)
                      }
                    >
                      {updateNameColorMutation.isPending ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text
                          style={{
                            fontSize: 14,
                            color: "#fff",
                            fontWeight: "bold",
                          }}
                        >
                          Salvar Cor
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* --- MODAL DO GRUPO (Mantido) --- */}
      <Modal visible={groupInfoModal} animationType="slide">
        <View
          style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setGroupInfoModal(false);
                setIsEditingGroup(false);
              }}
            >
              <X color={theme.textOther} size={24} />
            </TouchableOpacity>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: theme.textOther,
              }}
            >
              Dados do Grupo
            </Text>
            {amIAdmin && !isEditingGroup ? (
              <TouchableOpacity onPress={() => setIsEditingGroup(true)}>
                <Edit2 color={theme.textOther} size={20} />
              </TouchableOpacity>
            ) : isEditingGroup ? (
              <TouchableOpacity onPress={() => updateGroupMutation.mutate()}>
                {updateGroupMutation.isPending ? (
                  <ActivityIndicator color={theme.senderColor} />
                ) : (
                  <Check color={theme.senderColor} size={24} />
                )}
              </TouchableOpacity>
            ) : (
              <View style={{ width: 24 }} />
            )}
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <View style={{ alignItems: "center", padding: 20 }}>
              <TouchableOpacity
                onPress={isEditingGroup ? pickImage : undefined}
                disabled={!isEditingGroup}
              >
                <Image
                  source={{
                    uri:
                      editImage ||
                      chatDetails?.imageUrl ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${name}`,
                  }}
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 60,
                    marginBottom: 15,
                  }}
                />
                {isEditingGroup && (
                  <View style={styles.editImageBadge}>
                    <Camera color="#fff" size={16} />
                  </View>
                )}
              </TouchableOpacity>

              {isEditingGroup ? (
                <View style={{ width: "100%", paddingHorizontal: 20 }}>
                  <Text style={styles.inputLabel}>Nome do Grupo</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editName}
                    onChangeText={setEditName}
                  />
                  <Text style={styles.inputLabel}>Descrição</Text>
                  <TextInput
                    style={[styles.editInput, { height: 80 }]}
                    value={editDesc}
                    onChangeText={setEditDesc}
                    multiline
                  />
                </View>
              ) : (
                <>
                  <Text
                    style={{
                      fontSize: 24,
                      fontWeight: "bold",
                      color: theme.textOther,
                    }}
                  >
                    {chatDetails?.name || name}
                  </Text>
                  {chatDetails?.description && (
                    <Text
                      style={{
                        color: theme.textOther,
                        marginTop: 10,
                        textAlign: "center",
                        paddingHorizontal: 20,
                      }}
                    >
                      {chatDetails.description}
                    </Text>
                  )}
                  <Text style={{ color: theme.textMutedOther, marginTop: 5 }}>
                    Criado em{" "}
                    {chatDetails?.createdAt
                      ? new Date(chatDetails.createdAt).toLocaleDateString()
                      : ""}
                  </Text>
                </>
              )}
            </View>

            <View style={{ padding: 15 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "bold",
                  color: theme.textOther,
                  marginBottom: 10,
                }}
              >
                Integrantes ({chatDetails?.members?.length || 0})
              </Text>

              {amIAdmin && (
                <TouchableOpacity
                  style={styles.addMemberRow}
                  onPress={() => {
                    setGroupInfoModal(false);
                    setTimeout(() => {
                      setAddMemberModal(true);
                    }, 400);
                  }}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: theme.primary },
                    ]}
                  >
                    <UserPlus color="#fff" size={20} />
                  </View>
                  <Text
                    style={{
                      fontSize: 16,
                      color: theme.textOther, 
                      fontWeight: "bold",
                    }}
                  >
                    Adicionar membros
                  </Text>
                </TouchableOpacity>
              )}

              {chatDetails?.members?.map((item: any) => (
                <View key={item.id} style={styles.memberRow}>
                  <Image
                    source={{
                      uri:
                        item.user?.avatarUrl ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${item.user?.name}`,
                    }}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      marginRight: 15,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        color: theme.textOther,
                        fontWeight: "bold",
                      }}
                    >
                      {item.userId === user?.id
                        ? "Você"
                        : item.user?.nickname || item.user?.name}
                    </Text>
                    {item.role === "ADMIN" && (
                      <Text style={{ fontSize: 12, color: "#10b981" }}>
                        Administrador
                      </Text>
                    )}
                  </View>

                  {amIAdmin && item.userId !== user?.id && (
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      {item.role !== "ADMIN" && (
                        <TouchableOpacity
                          onPress={() =>
                            confirmPromoteAdmin(
                              item.userId,
                              item.user?.nickname || item.user?.name,
                            )
                          }
                          style={{ padding: 8, marginRight: 5 }}
                        >
                          <Shield color="#3b82f6" size={20} />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() =>
                          confirmRemoveMember(
                            item.userId,
                            item.user?.nickname || item.user?.name,
                          )
                        }
                        style={{ padding: 8 }}
                      >
                        <Trash2 color="#ef4444" size={20} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}

              <TouchableOpacity
                style={styles.leaveGroupBtn}
                onPress={() => leaveChatMutation.mutate()}
              >
                <LogOut color="#ef4444" size={20} style={{ marginRight: 10 }} />
                <Text
                  style={{ color: "#ef4444", fontSize: 16, fontWeight: "bold" }}
                >
                  Sair do Grupo
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* --- MODAL ADICIONAR AMIGOS (Mantido) --- */}
      <Modal visible={addMemberModal} animationType="slide">
        <View
          style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setAddMemberModal(false)}>
              <X color={theme.textOther} size={24} />
            </TouchableOpacity>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: theme.textOther,
              }}
            >
              Adicionar Amigos
            </Text>
            <TouchableOpacity
              onPress={() => addMembersMutation.mutate(selectedFriends)}
              disabled={
                selectedFriends.length === 0 || addMembersMutation.isPending
              }
            >
              {addMembersMutation.isPending ? (
                <ActivityIndicator color={theme.senderColor} size="small" />
              ) : (
                <Text
                  style={{
                    color:
                      selectedFriends.length > 0
                        ? theme.senderColor
                        : theme.textMutedOther,
                    fontWeight: "bold",
                  }}
                >
                  Adicionar
                </Text>
              )}
            </TouchableOpacity>
          </View>
          <FlatList
            data={friendsNotInGroup}
            keyExtractor={(i) => i.id}
            ListEmptyComponent={
              <Text
                style={{
                  textAlign: "center",
                  marginTop: 20,
                  color: theme.textMutedOther,
                }}
              >
                Todos os seus amigos já estão no grupo!
              </Text>
            }
            renderItem={({ item }: any) => {
              const isSelected = selectedFriends.includes(item.id);
              return (
                <TouchableOpacity
                  style={styles.memberRow}
                  onPress={() =>
                    setSelectedFriends((prev) =>
                      isSelected
                        ? prev.filter((id) => id !== item.id)
                        : [...prev, item.id],
                    )
                  }
                >
                  <Image
                    source={{
                      uri:
                        item.avatarUrl ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${item.name}`,
                    }}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      marginRight: 15,
                    }}
                  />
                  <Text
                    style={{ flex: 1, color: theme.textOther, fontSize: 16 }}
                  >
                    {item.nickname || item.name}
                  </Text>
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: theme.senderColor,
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor: isSelected
                        ? theme.senderColor
                        : "transparent",
                    }}
                  >
                    {isSelected && <Check color="#fff" size={14} />}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>

      {/* --- MODAL EVENTO (Mantido) --- */}
      <Modal visible={eventModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.eventModalContent}>
            <View style={styles.eventModalHeader}>
              <Text
                style={{ fontSize: 18, fontWeight: "bold", color: "#1e293b" }}
              >
                Detalhes do Evento
              </Text>
              <TouchableOpacity onPress={() => setEventModalVisible(false)}>
                <X color="#64748b" size={24} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {eventData?.bannerUrl ? (
                <Image
                  source={{ uri: eventData.bannerUrl }}
                  style={{ width: "100%", height: 200 }}
                />
              ) : (
                <View
                  style={{
                    width: "100%",
                    height: 200,
                    backgroundColor: "#c73636",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Calendar size={48} color="#fff" />
                </View>
              )}
              <View style={{ padding: 20 }}>
                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: "bold",
                    color: "#1e293b",
                    marginBottom: 15,
                  }}
                >
                  {eventData?.title}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <Calendar size={18} color="#c73636" />
                  <Text
                    style={{ marginLeft: 10, color: "#475569", fontSize: 16 }}
                  >
                    {eventData &&
                      new Date(eventData.dateTime).toLocaleDateString()}{" "}
                    às {eventData && getTime(eventData.dateTime)}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <MapPin size={18} color="#c73636" />
                  <Text
                    style={{ marginLeft: 10, color: "#475569", fontSize: 16 }}
                  >
                    {eventData?.space === "PERSONALIZADO"
                      ? eventData.customLocation
                      : eventData?.space}
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "bold",
                    color: "#1e293b",
                    marginTop: 20,
                    marginBottom: 10,
                  }}
                >
                  Descrição
                </Text>
                <Text
                  style={{ color: "#64748b", fontSize: 15, lineHeight: 22 }}
                >
                  {eventData?.description}
                </Text>

                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "bold",
                    color: "#1e293b",
                    marginTop: 20,
                    marginBottom: 10,
                  }}
                >
                  Participantes Confirmados
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 15,
                    marginTop: 10,
                    marginBottom: 20,
                  }}
                >
                  {eventData?.participants?.length > 0 ? (
                    eventData.participants.map((p: any) => (
                      <View
                        key={p.id}
                        style={{ alignItems: "center", width: 60 }}
                      >
                        <TouchableOpacity
                          key={p.id}
                          style={{ alignItems: "center", width: 60 }}
                          onPress={() => {
                            setEventModalVisible(false);
                            navigation.navigate("PlayerProfile", {
                              userId: p.id,
                            });
                          }}
                        >
                          <Image
                            source={{
                              uri:
                                p.avatarUrl ||
                                `https://api.dicebear.com/7.x/initials/svg?seed=${p.name}`,
                            }}
                            style={{
                              width: 45,
                              height: 45,
                              borderRadius: 22.5,
                              borderWidth: 2,
                              borderColor: "#c73636",
                            }}
                          />
                          <Text
                            style={{
                              fontSize: 10,
                              color: "#64748b",
                              marginTop: 4,
                              textAlign: "center",
                            }}
                            numberOfLines={1}
                          >
                            {p.nickname || p.name.split(" ")[0]}
                          </Text>
                        </TouchableOpacity>
                        <View
                          style={{
                            position: "absolute",
                            right: 5,
                            top: 0,
                            backgroundColor: "#10b981",
                            borderRadius: 10,
                            padding: 2,
                          }}
                        >
                          <CheckCircle size={10} color="#fff" />
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={{ color: "#94a3b8", fontStyle: "italic" }}>
                      Ninguém confirmado ainda.
                    </Text>
                  )}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bgImage: { flex: 1 },
  listContent: { padding: 10, paddingTop: 20 },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: "#fff",
  },
  headerName: { fontWeight: "bold", fontSize: 16 },
  headerSubtitle: { fontSize: 12 },
  bubbleWrapper: { width: "100%", flexDirection: "row", marginBottom: 4 },
  wrapperOwn: { justifyContent: "flex-end" },
  wrapperOther: { justifyContent: "flex-start" },
  bubble: { maxWidth: "80%", padding: 8, borderRadius: 12, elevation: 1 },
  senderName: { fontSize: 13, fontWeight: "bold", marginBottom: 2 },
  msgText: { fontSize: 15, lineHeight: 20 },
  msgFooter: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    marginTop: 2,
  },
  msgTime: { fontSize: 11 },
  inputContainer: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingTop: 10,
    alignItems: "flex-end",
    gap: 8,
  },
  textInputWrapper: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 15,
    paddingVertical: 8,
    minHeight: 48,
    maxHeight: 120,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  input: { fontSize: 16, maxHeight: 100 },
  sendCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
    alignItems: "center",
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  addMemberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  leaveGroupBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    marginTop: 20,
    justifyContent: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: 12,
  },
  inputLabel: {
    alignSelf: "flex-start",
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 5,
    marginTop: 15,
  },
  editInput: {
    width: "100%",
    backgroundColor: "#f1f5f9",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  editImageBadge: {
    position: "absolute",
    bottom: 15,
    right: 0,
    backgroundColor: "#c73636",
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#fff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  eventModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: "90%",
    paddingBottom: 20,
  },
  eventModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  editingBanner: {
    backgroundColor: "#fee2e2",
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 10,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  editingText: { color: "#ef4444", fontWeight: "bold", fontSize: 13 },
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  tab: { flex: 1, paddingVertical: 15, alignItems: "center" },
  activeTab: { borderBottomWidth: 2, borderBottomColor: "#c73636" },
  tabText: { fontSize: 14, color: "#64748b", fontWeight: "600" },
  activeTabText: { color: "#c73636" },
  colorsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 15,
    justifyContent: "center",
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
});
