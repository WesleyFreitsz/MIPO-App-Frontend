import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { io, Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { api, getAccessToken, isAccessTokenExpired, refreshAccessToken } from "../services/api";
import { isLocalFile, uploadMedia } from "../services/uploads";
import { useAuth } from "./AuthContext";
import { ChatMessageItem, ChatReplyPreview, MessagesCache, messagesQueryKey } from "../screens/chat/chatTypes";
import { markOwnMessagesRead, replaceMessage, upsertMessage } from "../screens/chat/messageCache";

export type SocketStatus = "connected" | "connecting" | "disconnected";

export interface SendMessageInput {
  chatId: string;
  content: string;
  imageUri?: string | null;
  replyTo?: ChatReplyPreview | null;
}

interface SendAck {
  success: boolean;
  message?: ChatMessageItem;
  error?: string;
}

interface SocketContextData {
  socket: Socket | null;
  status: SocketStatus;
  pendingByChat: Record<string, ChatMessageItem[]>;
  joinChat: (chatId: string) => void;
  leaveChat: (chatId: string) => void;
  sendMessage: (input: SendMessageInput) => void;
  retryMessage: (message: ChatMessageItem) => void;
  discardMessage: (message: ChatMessageItem) => void;
  markRead: (chatId: string) => void;
  setTyping: (chatId: string, isTyping: boolean) => void;
}

const ACK_TIMEOUT_MS = 10_000;
const AUTH_RETRY_DELAY_MS = 5_000;
const WS_URL = api.defaults.baseURL || "http://localhost:3000";

const SocketContext = createContext<SocketContextData>({} as SocketContextData);

function newClientId() {
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<SocketStatus>("disconnected");
  const [pendingByChat, setPendingByChat] = useState<Record<string, ChatMessageItem[]>>({});
  const userIdRef = useRef(user?.id);
  const joinedChats = useRef(new Set<string>());

  userIdRef.current = user?.id;

  const updatePending = useCallback((chatId: string, clientId: string | undefined, change: Partial<ChatMessageItem> | null) => {
    setPendingByChat((prev) => {
      const list = prev[chatId] ?? [];
      const next = change === null ? list.filter((m) => m.clientId !== clientId) : list.map((m) => (m.clientId === clientId ? { ...m, ...change } : m));
      return { ...prev, [chatId]: next };
    });
  }, []);

  const confirmMessage = useCallback(
    (message: ChatMessageItem) => {
      queryClient.setQueryData<MessagesCache>(messagesQueryKey(message.chatId), (old) => upsertMessage(old, { ...message, clientId: undefined }));
      if (message.clientId) updatePending(message.chatId, message.clientId, null);
    },
    [queryClient, updatePending],
  );

  useEffect(() => {
    if (!user?.id) return;

    const instance = io(`${WS_URL}/chats`, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      auth: (cb) => cb({ token: getAccessToken() }),
    });
    let hasConnected = false;
    let authRetry: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;

    instance.on("connect", () => {
      setStatus("connected");
      joinedChats.current.forEach((chatId) => instance.emit("chat:join", { chatId }));
      if (hasConnected) {
        queryClient.invalidateQueries({ queryKey: ["chats"] });
        joinedChats.current.forEach((chatId) => queryClient.invalidateQueries({ queryKey: messagesQueryKey(chatId) }));
      }
      hasConnected = true;
    });

    instance.on("disconnect", () => setStatus(instance.active ? "connecting" : "disconnected"));

    instance.on("connect_error", () => {
      setStatus("connecting");
      // Rejeição do middleware de auth desliga a reconexão automática; renova o token vencido e tenta de novo.
      if (!instance.active) {
        clearTimeout(authRetry);
        authRetry = setTimeout(() => {
          const renewal = isAccessTokenExpired() ? refreshAccessToken().catch(() => null) : Promise.resolve(getAccessToken());
          renewal.then((accessToken) => {
            if (accessToken && !disposed) instance.connect();
          });
        }, AUTH_RETRY_DELAY_MS);
      }
    });

    instance.on("message:new", confirmMessage);

    instance.on("message:updated", (message: ChatMessageItem) => {
      queryClient.setQueryData<MessagesCache>(messagesQueryKey(message.chatId), (old) => replaceMessage(old, message));
    });

    instance.on("message:marked-read", (data: { chatId: string; userId: string }) => {
      const ownId = userIdRef.current;
      if (!ownId || data.userId === ownId) return;
      queryClient.setQueryData<MessagesCache>(messagesQueryKey(data.chatId), (old) => markOwnMessagesRead(old, ownId));
    });

    instance.on("chat:list-update", () => queryClient.invalidateQueries({ queryKey: ["chats"] }));

    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && !instance.connected) instance.connect();
    });

    setStatus("connecting");
    setSocket(instance);

    return () => {
      disposed = true;
      clearTimeout(authRetry);
      appStateSubscription.remove();
      instance.removeAllListeners();
      instance.disconnect();
      setSocket(null);
      setStatus("disconnected");
    };
  }, [user?.id, queryClient, confirmMessage]);

  const deliver = useCallback(
    async (pending: ChatMessageItem) => {
      const { chatId, clientId } = pending;
      updatePending(chatId, clientId, { status: "sending" });
      try {
        let imageUrl = pending.imageUrl ?? undefined;
        if (isLocalFile(imageUrl)) {
          imageUrl = await uploadMedia({ uri: imageUrl }, "/uploads/chat-content");
          updatePending(chatId, clientId, { imageUrl });
        }
        const payload = { content: pending.content, imageUrl, replyToId: pending.replyToId ?? undefined, clientId };

        let confirmed: ChatMessageItem;
        if (socket?.connected) {
          const ack: SendAck = await socket.timeout(ACK_TIMEOUT_MS).emitWithAck("message:send", { ...payload, chatId });
          if (!ack.success || !ack.message) throw new Error(ack.error);
          confirmed = ack.message;
        } else {
          confirmed = (await api.post<ChatMessageItem>(`/chats/${chatId}/messages`, payload)).data;
        }
        confirmMessage({ ...confirmed, clientId });
      } catch {
        updatePending(chatId, clientId, { status: "failed" });
      }
    },
    [socket, confirmMessage, updatePending],
  );

  const sendMessage = useCallback(
    ({ chatId, content, imageUri, replyTo }: SendMessageInput) => {
      const ownUser = user;
      if (!ownUser) return;
      const clientId = newClientId();
      const pending: ChatMessageItem = {
        id: clientId,
        clientId,
        chatId,
        userId: ownUser.id,
        content,
        imageUrl: imageUri ?? null,
        createdAt: new Date().toISOString(),
        replyToId: replyTo?.id ?? null,
        replyTo: replyTo ?? null,
        user: { id: ownUser.id, name: ownUser.name, nickname: ownUser.nickname, avatarUrl: ownUser.avatarUrl },
        status: "sending",
      };
      setPendingByChat((prev) => ({ ...prev, [chatId]: [pending, ...(prev[chatId] ?? [])] }));
      deliver(pending);
    },
    [user, deliver],
  );

  const retryMessage = useCallback((message: ChatMessageItem) => deliver(message), [deliver]);

  const discardMessage = useCallback((message: ChatMessageItem) => updatePending(message.chatId, message.clientId, null), [updatePending]);

  const joinChat = useCallback(
    (chatId: string) => {
      joinedChats.current.add(chatId);
      if (socket?.connected) socket.emit("chat:join", { chatId });
    },
    [socket],
  );

  const leaveChat = useCallback(
    (chatId: string) => {
      joinedChats.current.delete(chatId);
      if (socket?.connected) socket.emit("chat:leave", { chatId });
    },
    [socket],
  );

  const markRead = useCallback(
    (chatId: string) => {
      if (socket?.connected) socket.emit("message:mark-read", { chatId });
      else
        api
          .post(`/chats/${chatId}/mark-as-read`)
          .then(() => queryClient.invalidateQueries({ queryKey: ["chats"] }))
          .catch(() => undefined);
    },
    [socket, queryClient],
  );

  const setTyping = useCallback(
    (chatId: string, isTyping: boolean) => {
      if (socket?.connected) socket.volatile.emit("typing", { chatId, isTyping });
    },
    [socket],
  );

  const value = useMemo(
    () => ({ socket, status, pendingByChat, joinChat, leaveChat, sendMessage, retryMessage, discardMessage, markRead, setTyping }),
    [socket, status, pendingByChat, joinChat, leaveChat, sendMessage, retryMessage, discardMessage, markRead, setTyping],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}
