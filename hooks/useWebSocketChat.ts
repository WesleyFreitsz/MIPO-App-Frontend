import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../context/AuthContext";

interface WebSocketMessage {
  id: string;
  chatId: string;
  userId: string;
  content: string;
  imageUrl?: string;
  isRead: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
    nickname: string;
    avatarUrl: string;
  };
}

interface UseWebSocketChatReturn {
  socket: Socket | null;
  messages: WebSocketMessage[];
  isConnected: boolean;
  sendMessage: (chatId: string, content: string, imageUrl?: string) => void;
  markMessagesAsRead: (chatId: string) => void;
  joinChat: (chatId: string) => void;
  leaveChat: (chatId: string) => void;
}

import { api } from "../services/api";

const WS_URL = api.defaults.baseURL || "http://localhost:3000";

export const useWebSocketChat = (): UseWebSocketChatReturn => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Conectar ao WebSocket quando o componente monta
  useEffect(() => {
    if (!user?.id || !token) return;

    const newSocket = io(`${WS_URL}/chats`, {
      // Isso conectará ao namespace /chats
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ["websocket"], // Adicione isso para maior estabilidade
      auth: {
        token,
      },
    });
    // Eventos de conexão
    newSocket.on("connect", () => {
      console.log("[WS] Conectado ao servidor");
      setIsConnected(true);
      // Autenticar após conectar
      newSocket.emit("auth", { userId: user.id });
    });

    newSocket.on("auth:success", () => {
      console.log("[WS] Autenticação bem-sucedida");
    });

    newSocket.on("disconnect", () => {
      console.log("[WS] Desconectado do servidor");
      setIsConnected(false);
    });

    newSocket.on("error", (error: any) => {
      console.error("[WS] Erro:", error);
    });

    // Eventos de mensagens
    newSocket.on("message:new", (message: WebSocketMessage) => {
      console.log("[WS] Nova mensagem recebida:", message);
      setMessages((prev) => [...prev, message]);
    });

    newSocket.on("message:marked-read", (data: any) => {
      console.log("[WS] Mensagens marcadas como lidas");
    });

    // Eventos de usuários
    newSocket.on("chat:user-joined", (data: any) => {
      console.log("[WS] Usuário entrou no chat:", data.userId);
    });

    newSocket.on("chat:user-left", (data: any) => {
      console.log("[WS] Usuário saiu do chat:", data.userId);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user?.id, token]);

  const sendMessage = useCallback(
    (chatId: string, content: string, imageUrl?: string) => {
      if (!socketRef.current?.connected) {
        console.warn("[WS] Socket não está conectado");
        return;
      }

      socketRef.current.emit("message:send", {
        chatId,
        content,
        imageUrl,
      });
    },
    [],
  );

  const markMessagesAsRead = useCallback((chatId: string) => {
    if (!socketRef.current?.connected) {
      console.warn("[WS] Socket não está conectado");
      return;
    }

    socketRef.current.emit("message:mark-read", { chatId });
  }, []);

  const joinChat = useCallback((chatId: string) => {
    if (!socketRef.current?.connected) {
      console.warn("[WS] Socket não está conectado");
      return;
    }

    socketRef.current.emit("chat:join", { chatId });
  }, []);

  const leaveChat = useCallback((chatId: string) => {
    if (!socketRef.current?.connected) {
      console.warn("[WS] Socket não está conectado");
      return;
    }

    socketRef.current.emit("chat:leave", { chatId });
  }, []);

  return {
    socket: socketRef.current,
    messages,
    isConnected,
    sendMessage,
    markMessagesAsRead,
    joinChat,
    leaveChat,
  };
};
