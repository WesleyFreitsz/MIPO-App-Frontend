import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
  ActivityIndicator,
  SafeAreaView,
  useColorScheme,
} from "react-native";
import {
  Bell,
  Calendar,
  Info,
  Check,
  ShieldAlert,
  UserPlus,
  X,
} from "lucide-react-native";
import { api } from "../services/api";
import { useFocusEffect } from "@react-navigation/native";
import { usePushNotifications } from "../services/usePushNotifications";
import {
  useQueryClient,
  useMutation,
  useInfiniteQuery,
} from "@tanstack/react-query";

const FriendRequestCard = ({
  request,
  onAccept,
  onReject,
  isLoading,
  theme,
}: any) => {
  return (
    <View
      style={[
        styles.friendRequestCard,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      <Image
        source={{
          uri:
            request.fromUser?.avatarUrl ||
            `https://api.dicebear.com/7.x/initials/svg?seed=${request.fromUser?.name}`,
        }}
        style={styles.friendAvatar}
      />
      <View style={styles.friendInfo}>
        <Text style={[styles.friendName, { color: theme.text }]}>
          {request.fromUser?.nickname || request.fromUser?.name}
        </Text>
        <Text style={[styles.friendCity, { color: theme.textLighter }]}>
          {request.fromUser?.city}
        </Text>
        <Text style={[styles.requestTime, { color: theme.textLighter }]}>
          há{" "}
          {Math.floor(
            (Date.now() - new Date(request.createdAt).getTime()) / (1000 * 60),
          )}{" "}
          min
        </Text>
      </View>
      <View style={styles.friendActions}>
        <TouchableOpacity
          style={[styles.acceptBtn, { backgroundColor: theme.success }]}
          onPress={() => onAccept(request.id)}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Check color="#fff" size={18} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.rejectBtn, { backgroundColor: theme.border }]}
          onPress={() => onReject(request.id)}
          disabled={isLoading}
        >
          <X color={theme.textLighter} size={18} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const NotificationCard = ({ notification, theme }: any) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "calendar":
        return <Calendar size={20} color="#10b981" />;
      case "shield":
        return <ShieldAlert size={20} color="#f59e0b" />;
      case "check":
        return <Check size={20} color="#6366f1" />;
      case "x-circle":
        return <Info size={20} color="#ef4444" />;
      default:
        return <Bell size={20} color="#94a3b8" />;
    }
  };

  return (
    <View
      style={[
        styles.notifCard,
        { backgroundColor: theme.surface, borderColor: theme.border },
        !notification.isRead && {
          borderLeftWidth: 4,
          borderLeftColor: theme.primary,
          backgroundColor: theme.unreadBg,
        },
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: theme.bg }]}>
        {getIcon(notification.icon)}
      </View>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={[styles.notifTitle, { color: theme.text }]}>
            {notification.title}
          </Text>
          <Text style={[styles.notifTime, { color: theme.textLighter }]}>
            {new Date(notification.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <Text style={[styles.notifMessage, { color: theme.textLighter }]}>
          {notification.message}
        </Text>
      </View>
    </View>
  );
};

export default function NotificationsScreen() {
  const [activeTab, setActiveTab] = useState("requests");
  const queryClient = useQueryClient();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const theme = {
    bg: isDark ? "#000000" : "#faf6f1",
    surface: isDark ? "#121212" : "#ffffff",
    text: isDark ? "#ffffff" : "#1c1917",
    textLighter: isDark ? "#a1a1aa" : "#78716c",
    border: isDark ? "#27272a" : "#e7e5e4",
    primary: "#c73636",
    success: "#10b981",
    unreadBg: isDark ? "#2a1215" : "#fff5f5",
  };

  const { requestPermission } = usePushNotifications();

  useEffect(() => {
    requestPermission();
    // Marcar lidas ao abrir a aba
    if (activeTab === "notifications") {
      api.patch("/notifications/read-all").catch(() => {});
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  }, [activeTab]);

  // INFINITE QUERIES
  const {
    data: reqsData,
    fetchNextPage: fetchNextReqs,
    hasNextPage: hasNextReqs,
    refetch: refetchReqs,
    isFetching: isFetchingReqs,
  } = useInfiniteQuery({
    queryKey: ["friendRequests"],
    queryFn: async ({ pageParam = 0 }) =>
      (
        await api.get("/friends/requests/pending", {
          params: { skip: pageParam, take: 20 },
        })
      ).data,
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.skip + lastPage.take : undefined,
  });

  const {
    data: notifsData,
    fetchNextPage: fetchNextNotifs,
    hasNextPage: hasNextNotifs,
    refetch: refetchNotifs,
    isFetching: isFetchingNotifs,
  } = useInfiniteQuery({
    queryKey: ["notifications", "infinite"],
    queryFn: async ({ pageParam = 0 }) =>
      (
        await api.get("/notifications", {
          params: { skip: pageParam, take: 20 },
        })
      ).data,
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.skip + lastPage.take : undefined,
  });

  const friendRequests = reqsData?.pages.flatMap((p) => p.data) || [];
  const notifications = notifsData?.pages.flatMap((p) => p.data) || [];

  const acceptFriendRequestMutation = useMutation({
    mutationFn: (friendshipId: string) =>
      api.post(`/friends/${friendshipId}/accept`),
    onSuccess: () => {
      refetchReqs();
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      Alert.alert("Sucesso", "Solicitação aceita!");
    },
  });

  const rejectFriendRequestMutation = useMutation({
    mutationFn: (friendshipId: string) =>
      api.delete(`/friends/${friendshipId}/reject`),
    onSuccess: () => {
      refetchReqs();
    },
  });

  const onRefresh = () => {
    refetchReqs();
    refetchNotifs();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: theme.surface, borderBottomColor: theme.border },
        ]}
      >
        <Text style={[styles.title, { color: theme.text }]}>Notificações</Text>
      </View>

      <View
        style={[
          styles.tabContainer,
          { backgroundColor: theme.surface, borderBottomColor: theme.border },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "requests" && { borderBottomColor: theme.primary },
          ]}
          onPress={() => setActiveTab("requests")}
        >
          <UserPlus
            color={activeTab === "requests" ? theme.primary : theme.textLighter}
            size={18}
          />
          <Text
            style={[
              styles.tabText,
              { color: theme.textLighter },
              activeTab === "requests" && {
                color: theme.primary,
                fontWeight: "600",
              },
            ]}
          >
            Solicitações ({friendRequests.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "notifications" && {
              borderBottomColor: theme.primary,
            },
          ]}
          onPress={() => setActiveTab("notifications")}
        >
          <Bell
            color={
              activeTab === "notifications" ? theme.primary : theme.textLighter
            }
            size={18}
          />
          <Text
            style={[
              styles.tabText,
              { color: theme.textLighter },
              activeTab === "notifications" && {
                color: theme.primary,
                fontWeight: "600",
              },
            ]}
          >
            Avisos
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "requests" && (
        <FlatList
          data={friendRequests}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={isFetchingReqs && !hasNextReqs}
              onRefresh={onRefresh}
            />
          }
          onEndReached={() => hasNextReqs && fetchNextReqs()}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.empty}>
              <UserPlus size={40} color={theme.border} />
              <Text style={[styles.emptyText, { color: theme.textLighter }]}>
                Nenhuma solicitação.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <FriendRequestCard
              request={item}
              theme={theme}
              onAccept={(id: string) => acceptFriendRequestMutation.mutate(id)}
              onReject={(id: string) => rejectFriendRequestMutation.mutate(id)}
              isLoading={
                acceptFriendRequestMutation.isPending ||
                rejectFriendRequestMutation.isPending
              }
            />
          )}
          contentContainerStyle={styles.list}
        />
      )}

      {activeTab === "notifications" && (
        <FlatList
          data={notifications}
          keyExtractor={(item: any) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={isFetchingNotifs && !hasNextNotifs}
              onRefresh={onRefresh}
            />
          }
          onEndReached={() => hasNextNotifs && fetchNextNotifs()}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Bell size={40} color={theme.border} />
              <Text style={[styles.emptyText, { color: theme.textLighter }]}>
                Você não tem notificações.
              </Text>
            </View>
          }
          renderItem={({ item }: any) => (
            <NotificationCard notification={item} theme={theme} />
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, borderBottomWidth: 1 },
  title: { fontSize: 22, fontWeight: "bold" },
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: { fontSize: 13, fontWeight: "500" },
  list: { padding: 16 },
  empty: { alignItems: "center", marginTop: 100 },
  emptyText: { marginTop: 10 },
  friendRequestCard: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  friendAvatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  friendInfo: { flex: 1 },
  friendName: { fontSize: 14, fontWeight: "600" },
  friendCity: { fontSize: 12, marginTop: 2 },
  requestTime: { fontSize: 11, marginTop: 2 },
  friendActions: { flexDirection: "row", gap: 8 },
  acceptBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  rejectBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  notifCard: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  content: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  notifTitle: { fontSize: 14, fontWeight: "600" },
  notifTime: { fontSize: 10 },
  notifMessage: { fontSize: 13, lineHeight: 18 },
});
