import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";

interface ChatsResponse {
  data?: { unreadCount?: number }[];
}

interface NotificationsResponse {
  data?: { isRead?: boolean }[];
}

type FriendRequestsResponse = { data?: unknown[] } | unknown[];

export interface TabBadges {
  social: boolean;
  avisos: number;
}

export function deriveTabBadges(
  chats: ChatsResponse | undefined,
  notifications: NotificationsResponse | undefined,
  requests: FriendRequestsResponse | undefined,
): TabBadges {
  const social = Boolean(chats?.data?.some((chat) => (chat.unreadCount ?? 0) > 0));
  const unreadNotifications = notifications?.data?.filter((notification) => !notification.isRead).length ?? 0;
  const pendingRequests = Array.isArray(requests) ? requests.length : (requests?.data?.length ?? 0);
  return { social, avisos: unreadNotifications + pendingRequests };
}

export function useTabBadges(): TabBadges {
  const { data: chats } = useQuery<ChatsResponse>({
    queryKey: ["chats"],
    queryFn: async () => (await api.get("/chats")).data,
    refetchInterval: 5000,
  });

  const { data: notifications } = useQuery<NotificationsResponse>({
    queryKey: ["notifications"],
    queryFn: async () => (await api.get("/notifications", { params: { skip: 0, take: 50 } })).data,
    refetchInterval: 5000,
  });

  const { data: requests } = useQuery<FriendRequestsResponse>({
    queryKey: ["friendRequests", "pending_global"],
    queryFn: async () => (await api.get("/friends/requests/pending")).data,
    refetchInterval: 5000,
  });

  return deriveTabBadges(chats, notifications, requests);
}
