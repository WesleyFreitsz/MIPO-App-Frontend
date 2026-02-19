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
  Image,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Send, ChevronLeft, Info } from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useWebSocketChat } from "../hooks/useWebSocketChat";

interface Message {
  id: string;
  content: string;
  userId: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    nickname: string;
    avatarUrl: string;
  };
}

const MIPO_COLORS = {
  primary: "#E11D48",
  background: "#f8fafc",
  text: "#1e293b",
  textLighter: "#64748b",
  border: "#e2e8f0",
  white: "#ffffff",
};

const MessageBubble = ({ message, isOwn }: any) => {
  const formatTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <View
      style={[styles.messageBubbleContainer, isOwn && styles.messageBubbleOwn]}
    >
      {!isOwn && (
        <Image
          source={{
            uri:
              message.user?.avatarUrl ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${message.user?.name}`,
          }}
          style={styles.messageAvatar}
        />
      )}
      <View style={[styles.messageBubble, isOwn && styles.messageBubbleOwnBg]}>
        {!isOwn && (
          <Text style={styles.messageSender}>
            {message.user?.nickname || message.user?.name}
          </Text>
        )}
        <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>
          {message.content}
        </Text>
        <Text style={[styles.messageTime, isOwn && styles.messageTimeOwn]}>
          {formatTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
};

export default function ChatDetailScreen({ route, navigation }: any) {
  const { chatId, name } = route.params;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [allMessages, setAllMessages] = useState<Message[]>([]);

  // WebSocket hook
  const { joinChat, leaveChat, sendMessage, messages, isConnected } =
    useWebSocketChat();

  // Fetch initial messages
  const {
    data: messagesData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["chat", chatId, "messages"],
    queryFn: async () => {
      const response = await api.get(`/chats/${chatId}/messages`, {
        params: { skip: 0, take: 50 },
      });
      return response.data;
    },
    enabled: !!chatId,
  });

  // Combinar mensagens do histórico com WebSocket
  useEffect(() => {
    const historyMessages = messagesData?.data || [];
    const wsMessages = messages.filter((m) => m.chatId === chatId);
    
    // Remover duplicatas e combinar
    const messageIds = new Set(historyMessages.map((m: Message) => m.id));
    const newMessages = wsMessages.filter((m) => !messageIds.has(m.id));
    
    setAllMessages([...historyMessages, ...newMessages]);
  }, [messagesData?.data, messages, chatId]);

  // Entrar no chat quando carregar
  useEffect(() => {
    if (isConnected) {
      joinChat(chatId);
      return () => {
        leaveChat(chatId);
      };
    }
  }, [chatId, isConnected, joinChat, leaveChat]);

  // Auto-scroll quando novas mensagens chegam
  useEffect(() => {
    if (allMessages.length) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [allMessages.length]);

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    setIsSending(true);
    sendMessage(chatId, messageText.trim());
    setMessageText("");
    
    setTimeout(() => {
      setIsSending(false);
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 300);
  };

  // Configure header
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          style={{ marginLeft: 15 }}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft color={MIPO_COLORS.text} size={24} />
        </TouchableOpacity>
      ),
      title: name,
      headerRight: () => (
        <View style={{ marginRight: 15, flexDirection: "row", gap: 12 }}>
          {isConnected && (
            <View style={styles.connectionStatus}>
              <View style={styles.statusDot} />
            </View>
          )}
          <TouchableOpacity
            onPress={() => {
              // Pode abrir detalhes do chat aqui
            }}
          >
            <Info color={MIPO_COLORS.primary} size={24} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, name, isConnected]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
        keyboardVerticalOffset={90}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={MIPO_COLORS.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={allMessages}
            renderItem={({ item }) => (
              <MessageBubble message={item} isOwn={item.userId === user?.id} />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
          />
        )}

        {/* Input de mensagem */}
        <View style={styles.inputArea}>
          <TextInput
            placeholder="Digite sua mensagem..."
            style={styles.input}
            value={messageText}
            onChangeText={setMessageText}
            editable={!isSending && isConnected}
            placeholderTextColor={MIPO_COLORS.textLighter}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (isSending || !messageText.trim() || !isConnected) && styles.sendBtnDisabled]}
            onPress={handleSendMessage}
            disabled={isSending || !messageText.trim() || !isConnected}
          >
            {isSending ? (
              <ActivityIndicator color={MIPO_COLORS.white} size="small" />
            ) : (
              <Send color={MIPO_COLORS.white} size={20} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MIPO_COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messagesList: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  messageBubbleContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: 4,
    paddingHorizontal: 8,
  },
  messageBubbleOwn: {
    justifyContent: "flex-end",
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  messageBubble: {
    backgroundColor: MIPO_COLORS.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    maxWidth: "80%",
  },
  messageBubbleOwnBg: {
    backgroundColor: MIPO_COLORS.primary,
  },
  messageSender: {
    fontSize: 12,
    fontWeight: "600",
    color: MIPO_COLORS.textLighter,
    marginBottom: 2,
  },
  messageText: {
    fontSize: 14,
    color: MIPO_COLORS.text,
    lineHeight: 20,
  },
  messageTextOwn: {
    color: MIPO_COLORS.white,
  },
  messageTime: {
    fontSize: 11,
    color: MIPO_COLORS.textLighter,
    marginTop: 4,
  },
  messageTimeOwn: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  inputArea: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: MIPO_COLORS.white,
    borderTopWidth: 1,
    borderTopColor: MIPO_COLORS.border,
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: MIPO_COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 15,
    fontSize: 14,
    color: MIPO_COLORS.text,
  },
  sendBtn: {
    backgroundColor: MIPO_COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  connectionStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10b981",
  },
});
