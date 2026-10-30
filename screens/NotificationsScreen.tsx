import React, { useEffect, useState } from "react";
import { Pressable, RefreshControl, SectionList, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Calendar, Check, Info, LucideIcon, Settings2, ShieldAlert, Trophy } from "lucide-react-native";
import { api } from "../services/api";
import { notificationPreferenceLabel } from "../services/notificationPreferences";
import { openNotificationTarget, parseNotificationData } from "../navigation/navigationRef";
import {
  Avatar,
  BottomSheet,
  Button,
  Card,
  Character,
  Checkbox,
  EmptyState,
  IconBox,
  IconButton,
  MipoText,
  Screen,
  SegmentedControl,
  useBottomReserve,
  showAlert,
} from "../components/ui";
import { StaggerIn } from "../motion/StaggerIn";
import { useTheme } from "../theme/ThemeProvider";
import { AccentName } from "../theme/tokens";
import { relativeTime } from "./social/socialFormat";

interface Page<T> {
  data: T[];
  hasMore: boolean;
  skip: number | string;
  take: number | string;
}

interface FriendRequestItem {
  id: string;
  createdAt: string;
  fromUser?: { id: string; name: string; nickname?: string | null; city?: string | null; avatarUrl?: string | null };
}

interface NotificationItem {
  id: string;
  title?: string;
  message?: string;
  icon?: string;
  isRead: boolean;
  createdAt: string;
  data?: unknown;
}

interface NotificationPreference {
  type: string;
  enabled: boolean;
}

type AvisosTab = "requests" | "notifications";

type AvisoRow = { kind: "request"; request: FriendRequestItem } | { kind: "notification"; notification: NotificationItem };

const iconByName: Record<string, { icon: LucideIcon; tone: AccentName }> = {
  calendar: { icon: Calendar, tone: "teal" },
  shield: { icon: ShieldAlert, tone: "orange" },
  check: { icon: Check, tone: "lime" },
  "x-circle": { icon: Info, tone: "red" },
  trophy: { icon: Trophy, tone: "yellow" },
};

function groupByPeriod(items: NotificationItem[], now: Date = new Date()) {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekAgo = startOfToday - 6 * 86_400_000;
  const groups: { title: string; data: NotificationItem[] }[] = [
    { title: "Hoje", data: [] },
    { title: "Esta semana", data: [] },
    { title: "Antes", data: [] },
  ];
  for (const item of items) {
    const time = new Date(item.createdAt).getTime();
    groups[time >= startOfToday ? 0 : time >= weekAgo ? 1 : 2].data.push(item);
  }
  return groups.filter((group) => group.data.length > 0);
}

export default function NotificationsScreen() {
  const [activeTab, setActiveTab] = useState<AvisosTab>("requests");
  const queryClient = useQueryClient();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { colors } = useTheme();
  const bottomReserve = useBottomReserve(true);
  const [preferencesVisible, setPreferencesVisible] = useState(false);

  useEffect(() => {
    if (activeTab === "notifications") {
      api.patch("/notifications/read-all").catch(() => {});
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  }, [activeTab]);

  const {
    data: reqsData,
    fetchNextPage: fetchNextReqs,
    hasNextPage: hasNextReqs,
    refetch: refetchReqs,
    isFetching: isFetchingReqs,
  } = useInfiniteQuery({
    queryKey: ["friendRequests"],
    queryFn: async ({ pageParam = 0 }): Promise<Page<FriendRequestItem>> =>
      (await api.get("/friends/requests/pending", { params: { skip: pageParam, take: 20 } })).data,
    initialPageParam: 0,
    getNextPageParam: (lastPage: Page<FriendRequestItem>) => (lastPage.hasMore ? Number(lastPage.skip) + Number(lastPage.take) : undefined),
  });

  const {
    data: notifsData,
    fetchNextPage: fetchNextNotifs,
    hasNextPage: hasNextNotifs,
    refetch: refetchNotifs,
    isFetching: isFetchingNotifs,
  } = useInfiniteQuery({
    queryKey: ["notifications", "infinite"],
    queryFn: async ({ pageParam = 0 }): Promise<Page<NotificationItem>> =>
      (await api.get("/notifications", { params: { skip: pageParam, take: 20 } })).data,
    initialPageParam: 0,
    getNextPageParam: (lastPage: Page<NotificationItem>) => (lastPage.hasMore ? Number(lastPage.skip) + Number(lastPage.take) : undefined),
  });

  const friendRequests = reqsData?.pages.flatMap((p) => p.data) || [];
  const notifications = notifsData?.pages.flatMap((p) => p.data) || [];
  const unreadNotifsCount = notifications.filter((n) => !n.isRead).length;

  const acceptFriendRequestMutation = useMutation({
    mutationFn: (friendshipId: string) => api.post(`/friends/${friendshipId}/accept`),
    onSuccess: () => {
      refetchReqs();
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      showAlert("Sucesso", "Solicitação aceita!");
    },
  });

  const rejectFriendRequestMutation = useMutation({
    mutationFn: (friendshipId: string) => api.delete(`/friends/${friendshipId}/reject`),
    onSuccess: () => {
      refetchReqs();
    },
  });

  const { data: preferences = [] } = useQuery<NotificationPreference[]>({
    queryKey: ["notifications", "preferences"],
    queryFn: async () => (await api.get("/notifications/preferences")).data,
    enabled: preferencesVisible,
  });

  const updatePreferenceMutation = useMutation({
    mutationFn: (preference: NotificationPreference) => api.patch("/notifications/preferences", preference),
    onSuccess: (response) => queryClient.setQueryData(["notifications", "preferences"], response.data),
    onError: () => showAlert("Erro", "Não foi possível salvar a preferência."),
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const clearNotificationsMutation = useMutation({
    mutationFn: () => api.delete("/notifications"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const confirmDelete = (notification: NotificationItem) =>
    showAlert("Apagar aviso", "Quer apagar este aviso?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Apagar", style: "destructive", onPress: () => deleteNotificationMutation.mutate(notification.id) },
    ]);

  const confirmClearAll = () =>
    showAlert("Limpar avisos", "Apagar todos os seus avisos?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Limpar", style: "destructive", onPress: () => clearNotificationsMutation.mutate() },
    ]);

  const onRefresh = () => {
    refetchReqs();
    refetchNotifs();
  };

  const openNotification = (notification: NotificationItem) => {
    const navigate = (name: string, params?: object) => navigation.navigate(name, params);
    if (openNotificationTarget(parseNotificationData(notification.data), navigate)) return;
    if (notification.icon === "trophy" || notification.title?.toLowerCase().includes("conquista"))
      navigation.navigate("Perfil", { openAchievements: Date.now() });
  };

  const busy = acceptFriendRequestMutation.isPending || rejectFriendRequestMutation.isPending;
  const refreshControl = (refreshing: boolean) => <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.pink} />;

  const sections: { title: string; data: AvisoRow[] }[] =
    activeTab === "requests"
      ? [{ title: "", data: friendRequests.map((request): AvisoRow => ({ kind: "request", request })) }]
      : groupByPeriod(notifications).map((group) => ({
          title: group.title,
          data: group.data.map((notification): AvisoRow => ({ kind: "notification", notification })),
        }));

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6, marginBottom: 8 }}>
        <MipoText variant="screenTitle" accessibilityRole="header">
          Avisos
        </MipoText>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <IconButton icon={Settings2} accessibilityLabel="Preferências de notificação" onPress={() => setPreferencesVisible(true)} />
          <Character name="carta2" size={64} motion="wiggle" />
        </View>
      </View>

      <SegmentedControl
        options={[
          { value: "requests", label: friendRequests.length > 0 ? `Pedidos (${friendRequests.length})` : "Pedidos" },
          { value: "notifications", label: unreadNotifsCount > 0 ? `Avisos (${unreadNotifsCount})` : "Avisos" },
        ]}
        value={activeTab}
        onChange={setActiveTab}
      />

      <SectionList
        sections={sections}
        keyExtractor={(item, index) => `${item.kind === "request" ? item.request.id : item.notification.id}-${index}`}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: bottomReserve, gap: 10 }}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl(activeTab === "requests" ? isFetchingReqs && !hasNextReqs : isFetchingNotifs && !hasNextNotifs)}
        onEndReached={() => {
          if (activeTab === "requests" && hasNextReqs && !isFetchingReqs) fetchNextReqs();
          if (activeTab === "notifications" && hasNextNotifs && !isFetchingNotifs) fetchNextNotifs();
        }}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          activeTab === "notifications" && notifications.length > 0 ? (
            <Button label="Limpar tudo" size="sm" variant="ghost" onPress={confirmClearAll} style={{ alignSelf: "flex-end" }} />
          ) : undefined
        }
        renderSectionHeader={({ section }) =>
          section.title ? (
            <MipoText variant="label" style={{ marginTop: 6 }}>
              {section.title}
            </MipoText>
          ) : null
        }
        ListEmptyComponent={
          activeTab === "requests" ? (
            <EmptyState character="quebraCabeca3" title="Nenhum pedido por aqui" message="Quando alguém quiser ser seu amigo, aparece aqui." />
          ) : (
            <EmptyState
              character="carta5"
              title="Tudo em dia por aqui"
              message="Quando alguém te chamar pra jogar, aparece aqui."
              action={{ label: "Ver eventos", onPress: () => navigation.navigate("EventsList") }}
            />
          )
        }
        renderItem={({ item, index }) => {
          if (item.kind === "request") {
            const { request } = item;
            const from = request.fromUser;
            const label = from?.nickname || from?.name || "Alguém";
            return (
              <StaggerIn index={index}>
                <Card onPress={() => from && navigation.navigate("PlayerProfile", { userId: from.id })} accessibilityLabel={`Ver perfil de ${label}`}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Avatar id={from?.id ?? request.id} name={from?.name ?? label} uri={from?.avatarUrl} />
                    <View style={{ flex: 1 }}>
                      <MipoText variant="cardTitle">{`${label} quer ser seu amigo`}</MipoText>
                      <MipoText variant="micro">{[from?.city, relativeTime(request.createdAt)].filter(Boolean).join(" · ")}</MipoText>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                    <Button label="Aceitar" size="sm" block disabled={busy} onPress={() => acceptFriendRequestMutation.mutate(request.id)} style={{ flex: 1 }} />
                    <Button label="Recusar" size="sm" variant="ghost" block disabled={busy} onPress={() => rejectFriendRequestMutation.mutate(request.id)} style={{ flex: 1 }} />
                  </View>
                </Card>
              </StaggerIn>
            );
          }
          const { notification } = item;
          const visual = iconByName[notification.icon ?? ""] ?? { icon: Bell, tone: "yellow" as AccentName };
          return (
            <StaggerIn index={index}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={[notification.title, notification.message].filter(Boolean).join(". ")}
                accessibilityHint="Toque e segure para apagar"
                onPress={() => openNotification(notification)}
                onLongPress={() => confirmDelete(notification)}
              >
                <Card contentStyle={{ flexDirection: "row", alignItems: "center", gap: 10, opacity: notification.isRead ? 0.85 : 1 }}>
                  <IconBox icon={visual.icon} tone={visual.tone} />
                  <View style={{ flex: 1 }}>
                    <MipoText variant="cardTitle">{notification.title}</MipoText>
                    {notification.message ? <MipoText variant="caption">{notification.message}</MipoText> : null}
                    <MipoText variant="micro">{relativeTime(notification.createdAt)}</MipoText>
                  </View>
                  {!notification.isRead ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.red }} /> : null}
                </Card>
              </Pressable>
            </StaggerIn>
          );
        }}
      />

      <BottomSheet visible={preferencesVisible} onClose={() => setPreferencesVisible(false)}>
        <MipoText variant="section">Quais avisos chegam no celular?</MipoText>
        <MipoText variant="caption" style={{ marginTop: 4, marginBottom: 12 }}>
          Os desligados continuam aparecendo aqui na aba Avisos.
        </MipoText>
        <View style={{ gap: 12 }}>
          {preferences.map((preference) => (
            <View key={preference.type} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Checkbox
                accessibilityLabel={notificationPreferenceLabel(preference.type)}
                checked={preference.enabled}
                onChange={(enabled) => updatePreferenceMutation.mutate({ type: preference.type, enabled })}
              />
              <MipoText variant="body">{notificationPreferenceLabel(preference.type)}</MipoText>
            </View>
          ))}
        </View>
      </BottomSheet>
    </Screen>
  );
}
