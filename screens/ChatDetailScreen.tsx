import React, { useState, useRef, useEffect } from "react";
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
  SafeAreaView,
  Image,
  Modal,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import {
  Send,
  ChevronLeft,
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
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useWebSocketChat } from "../hooks/useWebSocketChat";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const WA_BG_LIGHT =
  "https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png";
const WA_BG_DARK =
  "https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png";

const MessageBubble = ({ message, isOwn, theme }: any) => {
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <View
      style={[
        styles.bubbleWrapper,
        isOwn ? styles.wrapperOwn : styles.wrapperOther,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isOwn
            ? { backgroundColor: theme.bubbleOwn }
            : { backgroundColor: theme.bubbleOther },
        ]}
      >
        {!isOwn && (
          <Text style={[styles.senderName, { color: theme.senderColor }]}>
            {message.user?.nickname || message.user?.name}
          </Text>
        )}
        <Text
          style={[
            styles.msgText,
            { color: isOwn ? theme.textOwn : theme.textOther },
          ]}
        >
          {message.content}
        </Text>
        <Text
          style={[
            styles.msgTime,
            { color: isOwn ? theme.textMutedOwn : theme.textMutedOther },
          ]}
        >
          {time}
        </Text>
      </View>
    </View>
  );
};

export default function ChatDetailScreen({ route, navigation }: any) {
  const { chatId, name, type, avatar, targetId } = route.params;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);
  const [messageText, setMessageText] = useState("");
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const insets = useSafeAreaInsets();

  // ESTADOS DO MODAL DE GRUPO & EDIÇÃO
  const [groupInfoModal, setGroupInfoModal] = useState(false);
  const [addMemberModal, setAddMemberModal] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editImage, setEditImage] = useState<string | null>(null);

  // ESTADOS DO MODAL DE EVENTO
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [eventData, setEventData] = useState<any>(null);

  const theme = {
    bg: isDark ? "#0b141a" : "#faf6f1",
    bubbleOwn: isDark ? "#9f1d1d" : "#c73636",
    bubbleOther: isDark ? "#202c33" : "#ffffff",
    textOwn: "#ffffff",
    textOther: isDark ? "#e9edef" : "#111b21",
    textMutedOwn: "rgba(255,255,255,0.7)",
    textMutedOther: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.45)",
    senderColor: isDark ? "#ef4444" : "#c73636",
    inputBg: isDark ? "#202c33" : "#ffffff",
  };

  const { joinChat, leaveChat, sendMessage, messages, isConnected } =
    useWebSocketChat();

  const { data: messagesData } = useQuery({
    queryKey: ["chat", chatId, "messages"],
    queryFn: async () =>
      (
        await api.get(`/chats/${chatId}/messages`, {
          params: { skip: 0, take: 50 },
        })
      ).data,
  });

  const { data: chatDetails, refetch: refetchChatDetails } = useQuery({
    queryKey: ["chatDetails", chatId],
    queryFn: async () => (await api.get(`/chats/${chatId}`)).data,
    enabled: !!chatId && (type === "GROUP" || type === "EVENT"),
  });

  const { data: friendsData } = useQuery({
    queryKey: ["friends", "list"],
    queryFn: async () =>
      (await api.get("/friends", { params: { skip: 0, take: 100 } })).data,
    enabled: addMemberModal,
  });

  const allMessages = [
    ...(messagesData?.data || []),
    ...messages.filter((m) => m.chatId === chatId),
  ].filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i);

  useEffect(() => {
    if (isConnected && chatId) joinChat(chatId);
    return () => {
      if (chatId) leaveChat(chatId);
    };
  }, [chatId, isConnected]);

  // Sincronizar dados de edição quando abrir o modal de detalhes do grupo
  useEffect(() => {
    if (groupInfoModal && chatDetails) {
      setEditName(chatDetails.name || name);
      setEditDesc(chatDetails.description || "");
      setEditImage(chatDetails.imageUrl || avatar);
      setIsEditingGroup(false);
    }
  }, [groupInfoModal, chatDetails]);

  // HEADER ESTILO WHATSAPP COM NAVEGAÇÃO INTEGRADA
  React.useLayoutEffect(() => {
    let headerSubtitle = "Ver perfil";
    if (type === "GROUP") headerSubtitle = "Toque para dados do grupo";
    if (type === "EVENT") headerSubtitle = "Toque para detalhes do evento";

    navigation.setOptions({
      headerTitle: () => (
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center" }}
          onPress={() => {
            if (type === "PRIVATE" && targetId) {
              navigation.navigate("PlayerProfile", { userId: targetId });
            } else if (type === "EVENT") {
              if (chatId) {
                // Busca os dados do evento pelo ID do chat
                api
                  .get("/events")
                  .then((res) => {
                    const eventoEncontrado = res.data.find(
                      (e: any) => e.chatId === chatId,
                    );
                    if (eventoEncontrado) {
                      setEventData(eventoEncontrado);
                      setEventModalVisible(true);
                    } else {
                      Alert.alert(
                        "Aviso",
                        "Este evento não foi encontrado ou já foi encerrado.",
                      );
                    }
                  })
                  .catch(() =>
                    Alert.alert("Erro", "Não foi possível carregar o evento."),
                  );
              }
            } else if (type === "GROUP") {
              setGroupInfoModal(true);
            }
          }}
        >
          <Image
            source={{
              uri:
                chatDetails?.imageUrl ||
                avatar ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${name}`,
            }}
            style={styles.headerAvatar}
          />
          <View>
            <Text style={styles.headerName} numberOfLines={1}>
              {chatDetails?.name || name || "Conversa"}
            </Text>
            <Text style={styles.headerSubtitle}>{headerSubtitle}</Text>
          </View>
        </TouchableOpacity>
      ),
      headerStyle: { backgroundColor: theme.bubbleOwn },
      headerTintColor: "#fff",
      title: "",
    });
  }, [navigation, name, avatar, type, targetId, chatDetails]);

  const handleSend = () => {
    if (!messageText.trim() || !chatId) return;
    sendMessage(chatId, messageText.trim());
    setMessageText("");
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  // Funções de Gerenciamento de Membros
  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) =>
      api.delete(`/chats/${chatId}/members/${memberId}`),
    onSuccess: () => refetchChatDetails(),
  });

  const confirmRemoveMember = (memberId: string, memberName: string) => {
    Alert.alert(
      "Confirmação",
      `Tem certeza que deseja remover ${memberName} do grupo?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: () => removeMemberMutation.mutate(memberId),
        },
      ],
    );
  };

  const addMembersMutation = useMutation({
    mutationFn: (memberIds: string[]) =>
      api.post(`/chats/${chatId}/members`, { memberIds }),
    onSuccess: () => {
      Alert.alert("Sucesso", "Membros adicionados!");
      setAddMemberModal(false);
      setSelectedFriends([]);
      refetchChatDetails();
    },
    onError: () =>
      Alert.alert("Erro", "Não foi possível adicionar os membros."),
  });

  const leaveChatMutation = useMutation({
    mutationFn: () => api.post(`/chats/${chatId}/leave`),
    onSuccess: () => {
      setGroupInfoModal(false);
      navigation.goBack();
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });

  // Funções de Atualização de Grupo
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

  const updateGroupMutation = useMutation({
    mutationFn: async () => {
      let finalImageUrl = chatDetails?.imageUrl;
      if (editImage && editImage !== chatDetails?.imageUrl) {
        finalImageUrl = (await uploadImageAsync(editImage)) || finalImageUrl;
      }
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
    onError: () =>
      Alert.alert("Erro", "Não foi possível salvar as alterações."),
  });

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!res.canceled) setEditImage(res.assets[0].uri);
  };

  const amIAdmin = chatDetails?.members?.some(
    (m: any) => m.userId === user?.id && m.role === "ADMIN",
  );

  const friendsNotInGroup =
    friendsData?.data?.filter(
      (friend: any) =>
        !chatDetails?.members?.some(
          (member: any) => member.userId === friend.id,
        ),
    ) || [];

  // CORREÇÃO AQUI: React Query v5 usa apenas isPending
  const isLoadingAdd = addMembersMutation.isPending;

  const getTime = (dateIso: string) =>
    new Date(dateIso).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={90}
      >
        <ImageBackground
          source={{ uri: isDark ? WA_BG_DARK : WA_BG_LIGHT }}
          style={styles.bgImage}
          imageStyle={{ opacity: isDark ? 0.2 : 0.6 }}
        >
          <FlatList
            ref={flatListRef}
            data={allMessages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <MessageBubble
                message={item}
                isOwn={item.userId === user?.id}
                theme={theme}
              />
            )}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
          />
        </ImageBackground>

        <View
          style={[
            styles.inputContainer,
            { backgroundColor: theme.bg, paddingBottom: insets.bottom + 8 },
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
              placeholder="Mensagem"
              placeholderTextColor={theme.textMutedOther}
              value={messageText}
              onChangeText={setMessageText}
              multiline
            />
          </View>
          <TouchableOpacity
            style={[styles.sendCircle, { backgroundColor: theme.bubbleOwn }]}
            onPress={handleSend}
          >
            <Send color="#fff" size={20} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* =========================================================
          MODAL DETALHES DO GRUPO (Com opções de edição e lixeira)
      ========================================================= */}
      <Modal visible={groupInfoModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
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
                {/* CORREÇÃO AQUI: Apenas isPending para React Query v5 */}
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
                    placeholder="Nome do grupo"
                  />
                  <Text style={styles.inputLabel}>Descrição</Text>
                  <TextInput
                    style={[styles.editInput, { height: 80 }]}
                    value={editDesc}
                    onChangeText={setEditDesc}
                    placeholder="Descrição"
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
                  onPress={() => setAddMemberModal(true)}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: theme.bubbleOwn },
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
                  </View>
                  {amIAdmin && item.userId !== user?.id && (
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
        </SafeAreaView>
      </Modal>

      {/* =========================================================
          MODAL ADICIONAR MEMBROS AO GRUPO
      ========================================================= */}
      <Modal visible={addMemberModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
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
              disabled={selectedFriends.length === 0 || isLoadingAdd}
            >
              {isLoadingAdd ? (
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
                  onPress={() => {
                    setSelectedFriends((prev) =>
                      isSelected
                        ? prev.filter((id) => id !== item.id)
                        : [...prev, item.id],
                    );
                  }}
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
        </SafeAreaView>
      </Modal>

      {/* =========================================================
          MODAL DETALHES DO EVENTO
      ========================================================= */}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bgImage: { flex: 1 },
  listContent: { padding: 10, paddingBottom: 20 },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: "#fff",
  },
  headerName: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  headerSubtitle: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  bubbleWrapper: { width: "100%", flexDirection: "row", marginBottom: 4 },
  wrapperOwn: { justifyContent: "flex-end" },
  wrapperOther: { justifyContent: "flex-start" },
  bubble: { maxWidth: "80%", padding: 8, borderRadius: 12, elevation: 1 },
  senderName: { fontSize: 13, fontWeight: "bold", marginBottom: 2 },
  msgText: { fontSize: 15, lineHeight: 20 },
  msgTime: {
    fontSize: 11,
    alignSelf: "flex-end",
    marginTop: 4,
    marginLeft: 15,
  },
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

  // Edição
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

  // Estilos do Modal de Evento Embutido
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  eventModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    height: "85%",
    paddingBottom: 20,
  },
  eventModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
});
