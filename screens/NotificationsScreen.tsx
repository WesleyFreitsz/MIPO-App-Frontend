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
} from "react-native";
import {
  Bell,
  Calendar,
  DoorOpen,
  Info,
  Check,
  ShieldAlert,
  UserPlus,
  X,
} from "lucide-react-native";
import { api } from "../services/api";
import { useFocusEffect } from "@react-navigation/native";
import { usePushNotifications } from "../services/usePushNotifications";
import { useQueryClient, useMutation } from "@tanstack/react-query";

const MIPO_COLORS = {
  primary: "#E11D48",
  background: "#f8fafc",
  text: "#1e293b",
  textLighter: "#64748b",
  border: "#e2e8f0",
  white: "#ffffff",
  success: "#10b981",
};

interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUser?: {
    id: string;
    name: string;
    nickname: string;
    avatarUrl: string;
    city: string;
  };
  status: string;
  createdAt: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  icon: string;
  isRead: boolean;
  createdAt: string;
}

const FriendRequestCard = ({ request, onAccept, onReject, isLoading }: any) => {
  return (
    <View style={styles.friendRequestCard}>
      <Image
        source={{
          uri:
            request.fromUser?.avatarUrl ||
            `https://api.dicebear.com/7.x/initials/svg?seed=${request.fromUser?.name}`,
        }}
        style={styles.friendAvatar}
      />
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>
          {request.fromUser?.nickname || request.fromUser?.name}
        </Text>
        <Text style={styles.friendCity}>{request.fromUser?.city}</Text>
        <Text style={styles.requestTime}>
          há{" "}
          {Math.floor(
            (Date.now() - new Date(request.createdAt).getTime()) / (1000 * 60),
          )}{" "}
          min
        </Text>
      </View>
      <View style={styles.friendActions}>
        <TouchableOpacity
          style={styles.acceptBtn}
          onPress={() => onAccept(request.id)}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={MIPO_COLORS.white} size="small" />
          ) : (
            <Check color={MIPO_COLORS.white} size={18} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.rejectBtn}
          onPress={() => onReject(request.id)}
          disabled={isLoading}
        >
          <X color={MIPO_COLORS.textLighter} size={18} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const NotificationCard = ({ notification }: any) => {
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
    <View style={[styles.notifCard, !notification.isRead && styles.unreadCard]}>
      <View style={styles.iconContainer}>{getIcon(notification.icon)}</View>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.notifTitle}>{notification.title}</Text>
          <Text style={styles.notifTime}>
            {new Date(notification.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <Text style={styles.notifMessage}>{notification.message}</Text>
      </View>
    </View>
  );
};

export default function NotificationsScreen() {
  const [friendRequests, setFriendRequests] = React.useState<FriendRequest[]>(
    [],
  );
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [refreshing, setRefreshing] = React.useState(false);
  const [activeTab, setActiveTab] = useState("requests");
  const queryClient = useQueryClient();

  const { requestPermission } = usePushNotifications();

  useEffect(() => {
    const checkPermission = async () => {
      await requestPermission();
    };
    checkPermission();
  }, []);

  const acceptFriendRequestMutation = useMutation({
    mutationFn: (friendshipId: string) =>
      api.post(`/friends/${friendshipId}/accept`),
    onSuccess: () => {
      fetchFriendRequests();
      Alert.alert("Sucesso", "Solicitação aceita!");
    },
    onError: () => {
      Alert.alert("Erro", "Erro ao aceitar solicitação");
    },
  });

  const rejectFriendRequestMutation = useMutation({
    mutationFn: (friendshipId: string) =>
      api.delete(`/friends/${friendshipId}/reject`),
    onSuccess: () => {
      fetchFriendRequests();
      Alert.alert("Sucesso", "Solicitação rejeitada");
    },
    onError: () => {
      Alert.alert("Erro", "Erro ao rejeitar solicitação");
    },
  });

  const fetchFriendRequests = async () => {
    try {
      const response = await api.get("/friends/requests/pending", {
        params: { skip: 0, take: 50 },
      });
      setFriendRequests(response.data.data);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await api.get("/notifications");
      setNotifications(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchFriendRequests();
      fetchNotifications();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchFriendRequests(), fetchNotifications()]);
    setRefreshing(false);
  };

  const handleAcceptRequest = (friendshipId: string) => {
    acceptFriendRequestMutation.mutate(friendshipId);
  };

  const handleRejectRequest = (friendshipId: string) => {
    Alert.alert("Confirmar", "Deseja rejeitar essa solicitação?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Rejeitar",
        onPress: () => rejectFriendRequestMutation.mutate(friendshipId),
        style: "destructive",
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notificações</Text>
      </View>

      {/* ABAS */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "requests" && styles.tabActive]}
          onPress={() => setActiveTab("requests")}
        >
          <UserPlus
            color={
              activeTab === "requests"
                ? MIPO_COLORS.primary
                : MIPO_COLORS.textLighter
            }
            size={18}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "requests" && styles.tabTextActive,
            ]}
          >
            Solicitações ({friendRequests.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "notifications" && styles.tabActive,
          ]}
          onPress={() => setActiveTab("notifications")}
        >
          <Bell
            color={
              activeTab === "notifications"
                ? MIPO_COLORS.primary
                : MIPO_COLORS.textLighter
            }
            size={18}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "notifications" && styles.tabTextActive,
            ]}
          >
            Notificações
          </Text>
        </TouchableOpacity>
      </View>

      {/* CONTEÚDO */}
      {activeTab === "requests" && (
        <FlatList
          data={friendRequests}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <UserPlus size={40} color={MIPO_COLORS.border} />
              <Text style={styles.emptyText}>
                Você não tem solicitações de amizade.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <FriendRequestCard
              request={item}
              onAccept={handleAcceptRequest}
              onReject={handleRejectRequest}
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Bell size={40} color={MIPO_COLORS.border} />
              <Text style={styles.emptyText}>Você não tem notificações.</Text>
            </View>
          }
          renderItem={({ item }: any) => (
            <NotificationCard notification={item} />
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MIPO_COLORS.background },
  header: {
    padding: 20,
    backgroundColor: MIPO_COLORS.white,
    borderBottomWidth: 1,
    borderColor: MIPO_COLORS.border,
  },
  title: { fontSize: 22, fontWeight: "bold", color: MIPO_COLORS.text },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: MIPO_COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: MIPO_COLORS.border,
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
  tabActive: {
    borderBottomColor: MIPO_COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    color: MIPO_COLORS.textLighter,
    fontWeight: "500",
  },
  tabTextActive: {
    color: MIPO_COLORS.primary,
    fontWeight: "600",
  },
  list: { padding: 16 },
  empty: { alignItems: "center", marginTop: 100 },
  emptyText: { color: MIPO_COLORS.textLighter, marginTop: 10 },
  friendRequestCard: {
    flexDirection: "row",
    backgroundColor: MIPO_COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: MIPO_COLORS.border,
    alignItems: "center",
  },
  friendAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 14,
    fontWeight: "600",
    color: MIPO_COLORS.text,
  },
  friendCity: {
    fontSize: 12,
    color: MIPO_COLORS.textLighter,
    marginTop: 2,
  },
  requestTime: {
    fontSize: 11,
    color: MIPO_COLORS.textLighter,
    marginTop: 2,
  },
  friendActions: {
    flexDirection: "row",
    gap: 8,
  },
  acceptBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: MIPO_COLORS.success,
    justifyContent: "center",
    alignItems: "center",
  },
  rejectBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: MIPO_COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  notifCard: {
    flexDirection: "row",
    backgroundColor: MIPO_COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: MIPO_COLORS.border,
  },
  unreadCard: {
    backgroundColor: "#f0f4ff",
    borderColor: "#c7d2fe",
    borderLeftWidth: 4,
    borderLeftColor: MIPO_COLORS.primary,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: MIPO_COLORS.background,
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
  notifTitle: { fontSize: 14, fontWeight: "600", color: MIPO_COLORS.text },
  notifTime: { fontSize: 10, color: MIPO_COLORS.textLighter },
  notifMessage: {
    fontSize: 13,
    color: MIPO_COLORS.textLighter,
    lineHeight: 18,
  },
});
